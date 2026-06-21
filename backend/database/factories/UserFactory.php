<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use PragmaRX\Google2FA\Google2FA;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    protected $model = User::class;

    public function definition(): array
    {
        return [
            'employee_id'          => 'EMP-' . $this->faker->unique()->numerify('####'),
            'email'                => $this->faker->unique()->safeEmail(),
            'password'             => Hash::make('password'),
            'first_name'           => $this->faker->firstName(),
            'last_name'            => $this->faker->lastName(),
            'role'                 => $this->faker->randomElement(['operations_manager', 'reservation_officer', 'office_staff', 'accounting_executive', 'corporate_secretary', 'dispatcher', 'purchasing_manager', 'driver']),
            'department'           => $this->faker->randomElement(['Operations', 'Finance', 'HR', 'Administration']),
            'is_active'            => true,
            'must_change_password' => false,
            'totp_secret'          => null,
            'two_factor_verified_at' => now(),
            'remember_token'       => Str::random(10),
        ];
    }

    /** State: super admin role. */
    public function superAdmin(): static
    {
        return $this->state(fn() => [
            'employee_id' => 'SA-' . $this->faker->unique()->numerify('####'),
            'role'        => 'super_admin',
            'department'  => 'Administration',
        ]);
    }

    /** State: forces password change on next login. */
    public function mustChangePassword(): static
    {
        return $this->state(fn() => ['must_change_password' => true]);
    }

    /** State: deactivated account. */
    public function inactive(): static
    {
        return $this->state(fn() => ['is_active' => false]);
    }

    /** State: account with 2FA already enrolled. */
    public function withTwoFactor(): static
    {
        return $this->state(fn() => [
            'totp_secret' => (new Google2FA())->generateSecretKey(),
        ]);
    }
}

