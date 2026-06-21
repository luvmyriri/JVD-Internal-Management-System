<?php

use Illuminate\Database\Migrations\Migration;
use App\Models\SystemSetting;

return new class extends Migration
{
    /**
     * Seed editable defaults for the Custom Transaction contract gate. All values are
     * placeholders pending business sign-off — editable via Admin > Settings without a deploy.
     */
    public function up(): void
    {
        SystemSetting::setValue('sales.contract_required_threshold', 20000);
        SystemSetting::setValue('sales.default_deposit_percent', 30);
        SystemSetting::setValue('sales.cancellation_tiers', [
            ['days' => 30, 'refund' => 100],
            ['days' => 7, 'refund' => 50],
            ['days' => 0, 'refund' => 0],
        ]);
        SystemSetting::setValue('sales.default_installment_count', 3);
        SystemSetting::setValue('sales.default_installment_interval_days', 30);
    }

    public function down(): void
    {
        SystemSetting::whereIn('key', [
            'sales.contract_required_threshold',
            'sales.default_deposit_percent',
            'sales.cancellation_tiers',
            'sales.default_installment_count',
            'sales.default_installment_interval_days',
        ])->delete();
    }
};
