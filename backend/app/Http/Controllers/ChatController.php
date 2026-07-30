<?php

namespace App\Http\Controllers;

use App\Models\ChatGroup;
use App\Models\ChatGroupMember;
use App\Models\ChatMessage;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;

class ChatController extends Controller
{
    /**
     * Broadcast a message to the local WS relay server (non-blocking).
     */
    private function broadcastToWs(array $payload): void
    {
        try {
            Http::timeout(0.2)
                ->connectTimeout(0.1)
                ->post('http://localhost:6001/broadcast', $payload);
        } catch (\Throwable $e) {
            // WS server may not be running — fail silently
        }
    }

    /**
     * Get all chats (threads and group messages) for the current user.
     */
    public function index()
    {
        $userId = Auth::id();

        // 1. Get all one-to-one messages sent or received by the user
        $directMessages = ChatMessage::where(function ($query) use ($userId) {
            $query->where('sender_id', $userId)
                  ->orWhere('receiver_id', $userId);
        })
        ->whereNull('group_id')
        ->with(['sender', 'receiver'])
        ->get();

        // 2. Get all groups the user is a member of
        $myGroupIds = ChatGroupMember::where('user_id', $userId)->pluck('group_id');

        // 3. Get all messages for these groups
        $groupMessages = ChatMessage::whereIn('group_id', $myGroupIds)
            ->with(['sender', 'group'])
            ->get();

        // Combine messages
        $messages = $directMessages->concat($groupMessages)->sortBy('created_at')->values();

        // Get groups list for this user
        $groups = ChatGroup::whereIn('group_id', $myGroupIds)
            ->with('members.user')
            ->get();

        return response()->json([
            'status' => 'success',
            'messages' => $messages,
            'groups' => $groups,
        ]);
    }

    /**
     * Send a message.
     */
    public function sendMessage(\App\Http\Requests\SendChatMessageRequest $request)
    {
        $userId = Auth::id();

        if (!$request->receiver_id && !$request->group_id) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Either receiver_id or group_id is required.'
            ], 400);
        }

        if (!$request->text && !$request->hasFile('attachment')) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Message text or attachment is required.'
            ], 400);
        }

        $attachmentPath = null;
        $attachmentName = null;
        $attachmentType = null;

        if ($request->hasFile('attachment')) {
            $file = $request->file('attachment');
            $attachmentName = $file->getClientOriginalName();
            $attachmentType = $file->getClientMimeType();
            $path = $file->store('chat_attachments', 'public');
            $attachmentPath = '/storage/' . $path;
        }

        $message = ChatMessage::create([
            'sender_id'       => $userId,
            'receiver_id'     => $request->receiver_id,
            'group_id'        => $request->group_id,
            'text'            => $request->text ?? '',
            'attachment_path' => $attachmentPath,
            'attachment_name' => $attachmentName,
            'attachment_type' => $attachmentType,
        ]);

        // Load relations
        $message->load(['sender', 'receiver', 'group']);

        // Broadcast to WS relay server so connected clients get it instantly
        $this->broadcastToWs([
            'message'     => $message->toArray(),
            'sender_id'   => $userId,
            'receiver_id' => $request->receiver_id,
            'group_id'    => $request->group_id,
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => $message,
        ]);
    }


    /**
     * Create a group chat.
     */
    public function createGroup(\App\Http\Requests\CreateChatGroupRequest $request)
    {
        $userId = Auth::id();
        $groupId = 'group-' . round(microtime(true) * 1000);

        // 1. Create the ChatGroup
        $group = ChatGroup::create([
            'group_id' => $groupId,
            'name' => $request->name,
            'creator_id' => $userId,
        ]);

        // 2. Add members (including creator if not in list)
        $memberIds = array_unique(array_merge([$userId], $request->members));
        foreach ($memberIds as $mId) {
            ChatGroupMember::create([
                'group_id' => $groupId,
                'user_id' => $mId,
            ]);
        }

        // 3. Create initial system/intro message
        $creator = User::find($userId);
        $creatorName = $creator ? ($creator->first_name . ' ' . $creator->last_name) : 'User';
        
        $systemMessage = ChatMessage::create([
            'sender_id' => $userId,
            'group_id' => $groupId,
            'text' => "{$creatorName} created the group \"{$request->name}\".",
        ]);

        $group->load('members.user');

        return response()->json([
            'status' => 'success',
            'group' => $group,
            'system_message' => $systemMessage->load('sender'),
        ]);
    }

    /**
     * Mark messages in a thread as read.
     */
    public function markAsRead(\App\Http\Requests\MarkChatAsReadRequest $request)
    {
        $userId = Auth::id();

        if ($request->group_id) {
            // Group chat: mark read by updating group messages
            ChatMessage::where('group_id', $request->group_id)
                ->where('sender_id', '!=', $userId)
                ->whereNull('read_at')
                ->update(['read_at' => now()]);
        } elseif ($request->sender_id) {
            // One-to-one chat: mark messages from sender to current user as read
            ChatMessage::where('sender_id', $request->sender_id)
                ->where('receiver_id', $userId)
                ->whereNull('read_at')
                ->update(['read_at' => now()]);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Thread marked as read.'
        ]);
    }

    /**
     * Delete a conversation.
     */
    public function deleteConversation(\App\Http\Requests\DeleteChatConversationRequest $request)
    {
        $userId = Auth::id();

        if ($request->group_id) {
            // Group chat: remove user's membership
            ChatGroupMember::where('group_id', $request->group_id)
                ->where('user_id', $userId)
                ->delete();

            // If no members are left, delete group and its messages
            $memberCount = ChatGroupMember::where('group_id', $request->group_id)->count();
            if ($memberCount === 0) {
                ChatMessage::where('group_id', $request->group_id)->delete();
                ChatGroup::where('group_id', $request->group_id)->delete();
            }
        } elseif ($request->sender_id) {
            // One-to-one chat: delete all messages between these two users
            ChatMessage::where(function ($query) use ($userId, $request) {
                $query->where('sender_id', $userId)
                      ->where('receiver_id', $request->sender_id);
            })->orWhere(function ($query) use ($userId, $request) {
                $query->where('sender_id', $request->sender_id)
                      ->where('receiver_id', $userId);
            })
            ->whereNull('group_id')
            ->delete();
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Conversation deleted successfully.'
        ]);
    }
}

