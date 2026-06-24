<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\Support\Str;

class ProfileController extends Controller
{
    /**
     * Update user profile information.
     */
    public function update(Request $request): JsonResponse
    {
        $user = auth()->user();

        $request->validate([
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email,' . $user->id,
        ]);

        $user->update($request->only('first_name', 'last_name', 'email'));

        return response()->json([
            'success' => true,
            'message' => 'Profile updated successfully.',
            'data' => (new UserResource($user))->resolve(),
        ]);
    }

    /**
     * Update user avatar.
     */
    public function updateAvatar(Request $request): JsonResponse
    {
        $user = auth()->user();

        $request->validate([
            'avatar' => 'required|string', // Expecting base64 string from cropper
        ]);

        $approxSize = (strlen($request->avatar) * 3) / 4;
        if ($approxSize > 5 * 1024 * 1024) {
            return response()->json([
                'success' => false,
                'message' => 'File size exceeds 5MB limit.',
            ], 422);
        }

        try {
            $base64Image = $request->avatar;
            
            // Extract the base64 part
            if (preg_match('/^data:image\/(\w+);base64,/', $base64Image, $type)) {
                $base64Image = substr($base64Image, strpos($base64Image, ',') + 1);
                $type = strtolower($type[1]); // jpg, png, gif

                if (!in_array($type, ['jpg', 'jpeg', 'gif', 'png'])) {
                    throw new \Exception('invalid image type');
                }

                $image = base64_decode($base64Image);

                if ($image === false) {
                    throw new \Exception('base64_decode failed');
                }

                $finfo = new \finfo(FILEINFO_MIME_TYPE);
                $detectedMime = $finfo->buffer($image);
                if (!in_array($detectedMime, ['image/jpeg', 'image/png', 'image/gif'])) {
                    throw new \Exception('File content does not match a valid image type');
                }
            } else {
                throw new \Exception('did not match data URI with image data');
            }

            $fileName = 'avatars/' . $user->id . '_' . Str::random(10) . '.' . $type;
            
            // Delete old avatar if exists
            if ($user->avatar_url) {
                // Assuming avatar_url is a relative path or we can extract it
                $oldPath = str_replace(Storage::url(''), '', $user->avatar_url);
                Storage::disk('public')->delete($oldPath);
            }

            Storage::disk('public')->put($fileName, $image);
            $url = Storage::url($fileName);

            $user->update(['avatar_url' => $url]);

            return response()->json([
                'success' => true,
                'message' => 'Avatar updated successfully.',
                'data' => [
                    'avatar_url' => $url
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to upload avatar: ' . $e->getMessage(),
            ], 422);
        }
    }


}
