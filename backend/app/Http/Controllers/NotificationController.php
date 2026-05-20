<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Notifications\SystemAlert;

class NotificationController extends Controller
{
    /**
     * Get all notifications for the authenticated user.
     */
    public function index(Request $request): JsonResponse
    {
        $notifications = $request->user()
            ->notifications()
            ->orderBy('created_at', 'desc')
            ->get();

        $formatted = $notifications->map(function ($n) {
            $data = $n->data;
            return [
                'id'      => $n->id,
                'title'   => $data['title'] ?? 'System Update',
                'message' => $data['message'] ?? '',
                'type'    => $data['type'] ?? 'info',
                'link'    => $data['link'] ?? null,
                'read'    => !is_null($n->read_at),
                'time'    => $n->created_at->diffForHumans(),
            ];
        });

        return response()->json([
            'success' => true,
            'data'    => $formatted,
        ]);
    }

    /**
     * Mark a single notification as read.
     */
    public function markAsRead(Request $request, string $id): JsonResponse
    {
        $notification = $request->user()
            ->notifications()
            ->findOrFail($id);

        $notification->markAsRead();

        return response()->json([
            'success' => true,
            'message' => 'Notification marked as read.',
        ]);
    }

    /**
     * Mark all unread notifications as read.
     */
    public function markAllAsRead(Request $request): JsonResponse
    {
        $request->user()->unreadNotifications->markAsRead();

        return response()->json([
            'success' => true,
            'message' => 'All notifications marked as read.',
        ]);
    }

    /**
     * Dismiss/Delete a single notification.
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $notification = $request->user()
            ->notifications()
            ->findOrFail($id);

        $notification->delete();

        return response()->json([
            'success' => true,
            'message' => 'Notification dismissed.',
        ]);
    }

    /**
     * Clear all notifications for the user.
     */
    public function clearAll(Request $request): JsonResponse
    {
        $request->user()->notifications()->delete();

        return response()->json([
            'success' => true,
            'message' => 'All notifications cleared.',
        ]);
    }

    /**
     * Simulate a random database notification for testing.
     */
    public function simulate(Request $request): JsonResponse
    {
        $user = $request->user();

        $titles = [
            'New Supplier Registered', 
            'PMS Alarm Triggered', 
            'Accreditation Renewal Request', 
            'POS Transaction Completed'
        ];
        
        $messages = [
            'A new supplier "Global Logistics" has completed self-registration.',
            'Bus JVD-808 engine temperature warning alert triggered.',
            'Supplier Star Travels has uploaded renewal document for review.',
            'Invoice #INV-2026-990 was successfully created and dispatched.'
        ];
        
        $types = ['info', 'error', 'warning', 'success'];
        $links = [
            '/procurement/accreditations',
            '/fleet/maintenance',
            '/procurement/accreditations',
            '/accounting/billing'
        ];

        $index = rand(0, count($titles) - 1);

        $user->notify(new SystemAlert(
            $titles[$index],
            $messages[$index],
            $types[$index],
            $links[$index]
        ));

        // Retrieve the newly created notification to return it
        $latest = $user->notifications()->first();
        $formatted = null;
        if ($latest) {
            $data = $latest->data;
            $formatted = [
                'id'      => $latest->id,
                'title'   => $data['title'],
                'message' => $data['message'],
                'type'    => $data['type'],
                'link'    => $data['link'],
                'read'    => false,
                'time'    => 'Just now',
            ];
        }

        return response()->json([
            'success' => true,
            'data'    => $formatted,
            'message' => 'Notification simulated successfully.',
        ]);
    }
}
