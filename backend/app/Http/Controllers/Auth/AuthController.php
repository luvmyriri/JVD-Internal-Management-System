<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\Verify2FARequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\RateLimiter;
use PragmaRX\Google2FA\Google2FA;
use chillerlan\QRCode\QRCode;

class AuthController extends Controller
{
    private Google2FA $google2fa;

    public function __construct()
    {
        $this->google2fa = new Google2FA();
    }

    /**
     * Step 1: Validate email + password.
     * Returns user info and requires_2fa flag.
     *
     * Rate limited: 5 attempts per minute (Security Architecture § 8.1)
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $key = 'login:' . $request->ip();

        if (RateLimiter::tooManyAttempts($key, 5)) {
            $seconds = RateLimiter::availableIn($key);
            return response()->json([
                'success' => false,
                'message' => "Too many login attempts. Try again in {$seconds} seconds.",
            ], 429);
        }

        $user = User::where('email', $request->email)->first();

        if (!$user || !\Hash::check($request->password, $user->password)) {
            RateLimiter::hit($key, 60);
            return response()->json([
                'success' => false,
                'message' => 'Invalid credentials.',    // Generic error per auth flow § 2.2
            ], 401);
        }

        if (!$user->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'Account suspended. Contact Admin.',
            ], 403);
        }

        RateLimiter::clear($key);

        // --- DEV BYPASS: Check if 2FA is globally disabled in .env ---
        if (!filter_var(env('REQUIRE_2FA', true), FILTER_VALIDATE_BOOLEAN)) {
            $token = $user->createToken('auth-token')->plainTextToken;
            $user->update(['last_login' => now()]);

            return response()->json([
                'success' => true,
                'data' => [
                    'user' => new UserResource($user),
                    'token' => $token,
                    'requires_2fa' => false,
                    'requires_password_change' => $user->must_change_password,
                ],
                'message' => 'Authentication successful (2FA Bypassed).',
            ]);
        }

        // If user has 2FA set up, require TOTP verification
        if ($user->totp_secret) {
            return response()->json([
                'success' => true,
                'data' => [
                    'user' => new UserResource($user),
                    'requires_2fa' => true,
                    'requires_password_change' => $user->must_change_password,
                ],
                'message' => 'Credentials verified. Please enter your 2FA code.',
            ]);
        }

        // First login — no 2FA yet, require setup immediately.
        $secret = $this->google2fa->generateSecretKey();
        $qrCodeUri = $this->google2fa->getQRCodeUrl(
            'JVD Management System',
            $user->email,
            $secret
        );

        // Generate actual QR code image as Base64 data URI
        $qrCodeBase64 = (new QRCode)->render($qrCodeUri);

        return response()->json([
            'success' => true,
            'data' => [
                'user' => new UserResource($user),
                'requires_2fa' => false,
                'requires_2fa_setup' => true,
                'setup_data' => [
                    'qr_code_url' => $qrCodeBase64,
                    'secret' => $secret,
                ]
            ],
            'message' => 'First time login. Please set up 2FA.',
        ]);
    }

    /**
     * Step 2: Verify TOTP 2FA code.
     * Issues a Sanctum token on success.
     */
    public function verify2FA(Verify2FARequest $request): JsonResponse
    {
        $user = User::findOrFail($request->user_id);

        if (!$user->totp_secret) {
            return response()->json([
                'success' => false,
                'message' => '2FA is not set up for this account.',
            ], 400);
        }

        $valid = $this->google2fa->verifyKey($user->totp_secret, $request->code);

        if (!$valid) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid verification code.',
            ], 401);
        }

        $token = $user->createToken('auth-token')->plainTextToken;
        $user->update(['last_login' => now()]);

        return response()->json([
            'success' => true,
            'data' => [
                'user' => new UserResource($user),
                'token' => $token,
                'requires_2fa' => false,
                'requires_password_change' => $user->must_change_password,
            ],
            'message' => 'Authentication successful.',
        ]);
    }

    /**
     * Confirm 2FA setup on first login.
     */
    public function confirmSetup(Verify2FARequest $request): JsonResponse
    {
        $user = User::findOrFail($request->user_id);

        if ($user->totp_secret) {
            return response()->json(['success' => false, 'message' => 'Already setup'], 400);
        }

        // The secret is passed from the frontend (which got it from login)
        $secret = $request->secret;
        
        $valid = $this->google2fa->verifyKey($secret, $request->code);

        if (!$valid) {
            return response()->json(['success' => false, 'message' => 'Invalid setup code.'], 401);
        }

        // Save the secret permanently now that we know it works
        $user->update([
            'totp_secret' => $secret,
            'last_login' => now()
        ]);

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'success' => true,
            'data' => [
                'user' => new UserResource($user),
                'token' => $token,
                'requires_password_change' => $user->must_change_password,
            ],
            'message' => '2FA Setup Complete.',
        ]);
    }

    /**
     * Get the currently authenticated user.
     */
    public function me(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => new UserResource(auth()->user()),
        ]);
    }

    /**
     * Logout — revoke current token.
     */
    public function logout(): JsonResponse
    {
        auth()->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully.',
        ]);
    }

    /**
     * Change password — clears the must_change_password gate.
     * Available to all authenticated users (bypasses EnforcePasswordChange middleware).
     */
    public function changePassword(Request $request): JsonResponse
    {
        $request->validate([
            'current_password' => ['required', 'string'],
            'password'         => ['required', 'string', 'min:8', 'confirmed',
                                   'regex:/[A-Z]/', 'regex:/[0-9]/', 'regex:/[@$!%*?&]/'],
        ], [
            'password.regex' => 'Password must contain at least one uppercase letter, one number, and one special character.',
        ]);

        $user = $request->user();

        if (!\Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Current password is incorrect.',
            ], 422);
        }

        $user->update([
            'password'             => \Hash::make($request->password),
            'must_change_password' => false,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Password changed successfully.',
        ]);
    }

    /**
     * Set password for new users (Invitation Flow).
     */
    public function setPassword(Request $request): JsonResponse
    {
        $request->validate([
            'token'    => ['required'],
            'email'    => ['required', 'email'],
            'password' => ['required', 'string', 'min:8', 'confirmed',
                           'regex:/[A-Z]/', 'regex:/[0-9]/', 'regex:/[@$!%*?&]/'],
        ], [
            'password.regex' => 'Password must contain at least one uppercase letter, one number, and one special character.',
        ]);

        $status = Password::broker()->reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function ($user, $password) {
                $user->forceFill([
                    'password' => Hash::make($password),
                    'must_change_password' => false,
                    'remember_token' => Str::random(60),
                ])->save();
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return response()->json([
                'success' => true,
                'message' => 'Password has been set successfully. You can now log in.',
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => __($status),
        ], 422);
    }
}
