<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\Verify2FARequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use PragmaRX\Google2FA\Google2FA;
<<<<<<< HEAD
=======
use chillerlan\QRCode\QRCode;
>>>>>>> c49ea97b7b3363c871c1ca1ff83463005e6a7bfe

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

        if (!$user || !Hash::check($request->password, $user->password)) {
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

<<<<<<< HEAD
        // First login — no 2FA yet, issue token but flag 2FA setup required
        $token = $user->createToken('auth-token')->plainTextToken;
        $user->update(['last_login' => now()]);
=======
        // First login — no 2FA yet, require setup immediately.
        $secret = $this->google2fa->generateSecretKey();
        $qrCodeUri = $this->google2fa->getQRCodeUrl(
            'JVD Management System',
            $user->email,
            $secret
        );

        // Generate actual QR code image as Base64 data URI
        $qrCodeBase64 = (new QRCode)->render($qrCodeUri);
>>>>>>> c49ea97b7b3363c871c1ca1ff83463005e6a7bfe

        return response()->json([
            'success' => true,
            'data' => [
                'user' => new UserResource($user),
<<<<<<< HEAD
                'token' => $token,
                'requires_2fa' => false,
                'requires_password_change' => $user->must_change_password,
                'requires_2fa_setup' => !$user->totp_secret,
            ],
            'message' => 'Login successful.',
=======
                'requires_2fa' => false,
                'requires_2fa_setup' => true,
                'setup_data' => [
                    'qr_code_url' => $qrCodeBase64,
                    'secret' => $secret,
                ]
            ],
            'message' => 'First time login. Please set up 2FA.',
>>>>>>> c49ea97b7b3363c871c1ca1ff83463005e6a7bfe
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
<<<<<<< HEAD
     * Generate 2FA secret and QR code for first-time setup.
     * Must be authenticated (first login with temp password).
     */
    public function setup2FA(): JsonResponse
    {
        $user = auth()->user();

        if ($user->totp_secret) {
            return response()->json([
                'success' => false,
                'message' => '2FA is already configured.',
            ], 400);
        }

        $secret = $this->google2fa->generateSecretKey();
        $qrCodeUrl = $this->google2fa->getQRCodeUrl(
            'JVD Management System',
            $user->email,
            $secret
        );

        // Store secret (will be confirmed on first successful verification)
        $user->update(['totp_secret' => $secret]);
=======
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
>>>>>>> c49ea97b7b3363c871c1ca1ff83463005e6a7bfe

        return response()->json([
            'success' => true,
            'data' => [
<<<<<<< HEAD
                'qr_code_url' => $qrCodeUrl,
                'secret' => $secret,
            ],
            'message' => 'Scan the QR code with Google Authenticator.',
=======
                'user' => new UserResource($user),
                'token' => $token,
                'requires_password_change' => $user->must_change_password,
            ],
            'message' => '2FA Setup Complete.',
>>>>>>> c49ea97b7b3363c871c1ca1ff83463005e6a7bfe
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
}
