<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use PragmaRX\Google2FA\Google2FA;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private string $password = 'Password123!';

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create([
            'email' => 'test@jvd.com',
            'password' => Hash::make($this->password),
            'is_active' => true,
        ]);
    }

    public function test_login_without_2fa_returns_token_and_setup_flag()
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'test@jvd.com',
            'password' => $this->password,
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'requires_2fa' => false,
                    'requires_2fa_setup' => true,
                ]
            ])
            ->assertJsonStructure(['data' => ['setup_data' => ['qr_code_url', 'secret']]]);
    }

    public function test_login_with_2fa_returns_requires_2fa_flag_no_token()
    {
        // Setup user with 2FA
        $this->user->update([
            'totp_secret' => (new Google2FA())->generateSecretKey()
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'test@jvd.com',
            'password' => $this->password,
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'requires_2fa' => true,
                ],
                'message' => 'Credentials verified. Please enter your 2FA code.'
            ])
            ->assertJsonMissing(['data' => ['token']]);
    }

    public function test_verify_2fa_returns_token()
    {
        $google2fa = new Google2FA();
        $secret = $google2fa->generateSecretKey();
        
        $this->user->update(['totp_secret' => $secret]);

        $code = $google2fa->getCurrentOtp($secret);

        $response = $this->postJson('/api/v1/auth/2fa/verify', [
            'user_id' => $this->user->id,
            'code' => $code,
        ]);

        $response->assertStatus(200)
                 ->assertJsonStructure([
                     'success',
                     'data' => [
                         'user',
                         'permissions',
                         'requires_2fa',
                     ],
                     'message',
                 ]);

        $this->assertAuthenticatedAs($this->user);
    }

    public function test_setup_2fa()
    {
        $user = User::factory()->create([
            'totp_secret' => null,
            'password' => Hash::make('password'),
        ]);

        $google2fa = new Google2FA();
        $secret = $google2fa->generateSecretKey();
        $code = $google2fa->getCurrentOtp($secret);

        $response = $this->postJson('/api/v1/auth/2fa/setup', [
            'user_id' => $user->id,
            'secret' => $secret,
            'code' => $code,
        ]);

        $response->assertStatus(200)
                 ->assertJsonStructure([
                     'success',
                     'data' => [
                         'user',
                         'permissions',
                     ],
                 ]);
    }
}
