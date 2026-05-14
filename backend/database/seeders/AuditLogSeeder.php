<?php

namespace Database\Seeders;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Database\Seeder;

class AuditLogSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::where('role', 'super_admin')->first();
        if (!$admin) return;

        $logs = [
            [
                'user_id' => $admin->id,
                'action' => 'LOGIN',
                'module' => 'authentication',
                'entity_type' => 'User',
                'entity_id' => $admin->id,
                'ip_address' => '127.0.0.1',
                'created_at' => now()->subHours(2),
            ],
            [
                'user_id' => $admin->id,
                'action' => 'CREATE',
                'module' => 'procurement',
                'entity_type' => 'PurchaseOrder',
                'entity_id' => 1,
                'new_values' => json_encode(['po_number' => 'PO-2024-001', 'total' => 50000]),
                'ip_address' => '127.0.0.1',
                'created_at' => now()->subHour(),
            ],
            [
                'user_id' => $admin->id,
                'action' => 'UPDATE',
                'module' => 'fleet',
                'entity_type' => 'Bus',
                'entity_id' => 2,
                'old_values' => json_encode(['status' => 'available']),
                'new_values' => json_encode(['status' => 'under_maintenance']),
                'ip_address' => '127.0.0.1',
                'created_at' => now()->subMinutes(30),
            ],
        ];

        foreach ($logs as $log) {
            AuditLog::create($log);
        }
    }
}
