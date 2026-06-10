<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use App\Models\User;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->json('tags')->nullable()->after('custom_permissions');
        });

        // Seed default tags for existing users based on roles
        // To be safe, we wrap it in a try-catch and run it directly
        try {
            User::chunk(100, function ($users) {
                foreach ($users as $user) {
                    $tags = [];
                    $role = $user->role;

                    if (in_array($role, ['super_admin', 'executive_vice_president', 'accounting_executive'])) {
                        $tags = [
                            'access:general',
                            'process:approve_commission',
                            'process:approve_cash_budget',
                            'process:disburse_cash_budget',
                            'process:settle_liquidation'
                        ];
                    } elseif (in_array($role, ['operations_manager', 'logistics_in_charge', 'dispatcher'])) {
                        $tags = [
                            'access:general',
                            'process:disburse_cash_budget'
                        ];
                    } else {
                        $tags = [
                            'access:personalized'
                        ];
                    }

                    $user->update(['tags' => $tags]);
                }
            });
        } catch (\Throwable $e) {
            // Log or ignore if the User model has issues during migration loading
            logger('Failed to seed tags: ' . $e->getMessage());
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('tags');
        });
    }
};
