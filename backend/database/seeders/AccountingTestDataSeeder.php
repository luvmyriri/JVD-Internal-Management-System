<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\TripTicket;
use App\Models\CashBudgetRequest;
use App\Models\Liquidation;
use App\Models\Commission;
use App\Models\Collection;
use App\Models\Account;
use App\Services\LedgerService;
use App\Services\LiquidationService;
use Illuminate\Support\Facades\DB;

class AccountingTestDataSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Ensure Chart of Accounts is seeded
        $ledgerService = app(LedgerService::class);
        $ledgerService->seedDefaultAccounts();

        $admin = User::where('role', 'super_admin')->first();
        if (!$admin) {
            $admin = User::create([
                'employee_id' => 'JVD-SA-TEMP',
                'first_name' => 'Admin',
                'last_name' => 'User',
                'email' => 'admin_temp@jvd.com',
                'password' => \Hash::make('password123'),
                'role' => 'super_admin',
                'department' => 'Administration',
                'is_active' => true,
            ]);
        }

        // Get drivers
        $eduardo = User::where('email', 'eduardo@jvd.com')->first();
        $ken = User::where('email', 'ken@jvd.com')->first();
        $franklin = User::where('email', 'franklin@jvd.com')->first();

        // Fallbacks if not found
        if (!$eduardo) {
            $eduardo = User::create([
                'employee_id' => 'JVD-DRV-101', 'first_name' => 'Eduardo', 'last_name' => 'Deblios',
                'email' => 'eduardo@jvd.com', 'password' => \Hash::make('password123'),
                'role' => 'driver', 'department' => 'Logistics', 'is_active' => true,
            ]);
        }
        if (!$ken) {
            $ken = User::create([
                'employee_id' => 'JVD-DRV-102', 'first_name' => 'Ken', 'last_name' => 'Baynosa',
                'email' => 'ken@jvd.com', 'password' => \Hash::make('password123'),
                'role' => 'driver', 'department' => 'Logistics', 'is_active' => true,
            ]);
        }
        if (!$franklin) {
            $franklin = User::create([
                'employee_id' => 'JVD-DRV-103', 'first_name' => 'Franklin', 'last_name' => 'Sarmiento',
                'email' => 'franklin@jvd.com', 'password' => \Hash::make('password123'),
                'role' => 'driver', 'department' => 'Logistics', 'is_active' => true,
            ]);
        }

        DB::transaction(function () use ($admin, $eduardo, $ken, $franklin) {
            // Delete old test data from these tables in dependency order to avoid duplicate and foreign key constraint errors
            DB::table('collection_payments')->delete();
            DB::table('collections')->delete();
            DB::table('liquidation_items')->delete();

            // Clear cash budget requests linked to our test liquidations, commissions, or trip tickets
            $testTripTicketIds = DB::table('trip_tickets')
                ->whereIn('control_no', ['TT-2026-1010', 'TT-2026-1011', 'TT-2026-1012', 'TT-2026-1013'])
                ->pluck('id');

            DB::table('cash_budget_requests')
                ->whereIn('trip_ticket_id', $testTripTicketIds)
                ->orWhereNotNull('liquidation_id')
                ->orWhereNotNull('commission_id')
                ->delete();

            DB::table('liquidations')->delete();
            DB::table('commission_items')->delete();
            DB::table('commissions')->delete();

            // Now delete our test trip tickets to ensure we can recreate them clean
            DB::table('trip_tickets')
                ->whereIn('control_no', ['TT-2026-1010', 'TT-2026-1011', 'TT-2026-1012', 'TT-2026-1013'])
                ->delete();

            // -------------------------------------------------------------
            // CASE 1: Eduardo has a Dispute with a large shortage (>= ₱5,000)
            // This will trigger the "Blocked" flag on the Employee SOA
            // -------------------------------------------------------------
            $tt1 = TripTicket::create([
                'control_no' => 'TT-2026-1010',
                'driver_id' => $eduardo->id,
                'status' => 'approved',
                'pick_up' => 'Manila',
                'drop_off' => 'Vigan, Ilocos Sur',
                'issue_date' => date('Y-m-d', strtotime('-5 days')),
                'date_of_travel' => date('Y-m-d', strtotime('-5 days')),
            ]);

            $cbr1 = CashBudgetRequest::create([
                'date' => date('Y-m-d', strtotime('-5 days')),
                'travel_date' => date('Y-m-d', strtotime('-5 days')),
                'plate_number' => 'NQR-4521',
                'destination' => 'Vigan, Ilocos Sur',
                'diesel' => 6000.00,
                'meal_allowance' => 1500.00,
                'sop' => 500.00,
                'autosweep' => 1000.00,
                'easytrip' => 1000.00,
                'total_amount' => 10000.00,
                'status' => 'disbursed',
                'prepared_by' => $admin->id,
                'approved_by' => $admin->id,
                'disbursed_by' => $admin->id,
                'disbursed_amount' => 10000.00,
                'trip_ticket_id' => $tt1->id,
            ]);

            $liq1 = Liquidation::create([
                'trip_ticket_id' => $tt1->id,
                'employee_id' => $eduardo->id,
                'status' => 'disputed',
                'total_advanced' => 10000.00,
                'total_spent' => 4000.00,
                'total_returned' => 0.00,
                'shortage_amount' => 6000.00,
                'notes' => 'Driver did not return change. Gas receipt of ₱2,000 was disputed/rejected due to missing details.',
            ]);

            // Itemized receipts
            $liq1->items()->create([
                'expense_category' => 'Fuel',
                'amount' => 3000.00,
                'receipt_number' => 'FUEL-88451',
                'status' => 'approved',
            ]);
            $liq1->items()->create([
                'expense_category' => 'Toll',
                'amount' => 1000.00,
                'receipt_number' => 'TOLL-99854',
                'status' => 'approved',
            ]);
            $liq1->items()->create([
                'expense_category' => 'Fuel',
                'amount' => 2000.00,
                'receipt_number' => 'REJECTED-001',
                'status' => 'disputed',
                'notes' => 'No receipt scan attached',
            ]);

            // Create collection shortage
            Collection::create([
                'liquidation_id' => $liq1->id,
                'employee_id' => $eduardo->id,
                'client_name' => 'Driver Shortage - Eduardo Deblios',
                'date' => date('Y-m-d', strtotime('-4 days')),
                'travel_date' => date('Y-m-d', strtotime('-4 days')),
                'rate' => 6000.00,
                'billing_amount' => 6000.00,
                'remaining_balance' => 6000.00,
                'collection_status' => 'pending',
                'service_type' => 'Other',
                'other_service_type' => 'Driver Shortage',
                'auto_generated' => true,
            ]);

            // -------------------------------------------------------------
            // CASE 2: Ken Baynosa has a fully settled, clean liquidation
            // -------------------------------------------------------------
            $tt2 = TripTicket::create([
                'control_no' => 'TT-2026-1011',
                'driver_id' => $ken->id,
                'status' => 'approved',
                'pick_up' => 'Manila',
                'drop_off' => 'Tagaytay City',
                'issue_date' => date('Y-m-d', strtotime('-3 days')),
                'date_of_travel' => date('Y-m-d', strtotime('-3 days')),
            ]);

            $cbr2 = CashBudgetRequest::create([
                'date' => date('Y-m-d', strtotime('-3 days')),
                'travel_date' => date('Y-m-d', strtotime('-3 days')),
                'plate_number' => 'ABC-9988',
                'destination' => 'Tagaytay City',
                'diesel' => 4000.00,
                'meal_allowance' => 1000.00,
                'sop' => 500.00,
                'autosweep' => 500.00,
                'easytrip' => 500.00,
                'total_amount' => 6500.00,
                'status' => 'disbursed',
                'prepared_by' => $admin->id,
                'approved_by' => $admin->id,
                'disbursed_by' => $admin->id,
                'disbursed_amount' => 6500.00,
                'trip_ticket_id' => $tt2->id,
            ]);

            $liq2 = Liquidation::create([
                'trip_ticket_id' => $tt2->id,
                'employee_id' => $ken->id,
                'status' => 'settled',
                'total_advanced' => 6500.00,
                'total_spent' => 6000.00,
                'total_returned' => 500.00,
                'shortage_amount' => 0.00,
                'notes' => 'Settled with zero discrepancies. Driver returned ₱500 change.',
            ]);

            $liq2->items()->create([
                'expense_category' => 'Fuel',
                'amount' => 4200.00,
                'receipt_number' => 'FUEL-7751',
                'status' => 'approved',
            ]);
            $liq2->items()->create([
                'expense_category' => 'Toll',
                'amount' => 1000.00,
                'receipt_number' => 'TOLL-3321',
                'status' => 'approved',
            ]);
            $liq2->items()->create([
                'expense_category' => 'Meals',
                'amount' => 800.00,
                'receipt_number' => 'MEAL-4451',
                'status' => 'approved',
            ]);


            // -------------------------------------------------------------
            // CASE 3: Franklin has a pending trip ticket liquidation under review
            // -------------------------------------------------------------
            $tt3 = TripTicket::create([
                'control_no' => 'TT-2026-1012',
                'driver_id' => $franklin->id,
                'status' => 'approved',
                'pick_up' => 'Manila',
                'drop_off' => 'Subic, Zambales',
                'issue_date' => date('Y-m-d', strtotime('-2 days')),
                'date_of_travel' => date('Y-m-d', strtotime('-2 days')),
            ]);

            $cbr3 = CashBudgetRequest::create([
                'date' => date('Y-m-d', strtotime('-2 days')),
                'travel_date' => date('Y-m-d', strtotime('-2 days')),
                'plate_number' => 'XYZ-5512',
                'destination' => 'Subic, Zambales',
                'diesel' => 5000.00,
                'meal_allowance' => 1000.00,
                'sop' => 500.00,
                'autosweep' => 700.00,
                'easytrip' => 800.00,
                'total_amount' => 8000.00,
                'status' => 'disbursed',
                'prepared_by' => $admin->id,
                'approved_by' => $admin->id,
                'disbursed_by' => $admin->id,
                'disbursed_amount' => 8000.00,
                'trip_ticket_id' => $tt3->id,
            ]);

            $liq3 = Liquidation::create([
                'trip_ticket_id' => $tt3->id,
                'employee_id' => $franklin->id,
                'status' => 'pending',
                'total_advanced' => 8000.00,
                'total_spent' => 0.00,
                'total_returned' => 0.00,
                'shortage_amount' => 0.00,
            ]);


            // -------------------------------------------------------------
            // CASE 4: Ken Baynosa has an overspent liquidation (generating reimbursement)
            // -------------------------------------------------------------
            $tt4 = TripTicket::create([
                'control_no' => 'TT-2026-1013',
                'driver_id' => $ken->id,
                'status' => 'approved',
                'pick_up' => 'Manila',
                'drop_off' => 'Pagsanjan Falls, Laguna',
                'issue_date' => date('Y-m-d', strtotime('-1 days')),
                'date_of_travel' => date('Y-m-d', strtotime('-1 days')),
            ]);

            $cbr4 = CashBudgetRequest::create([
                'date' => date('Y-m-d', strtotime('-1 days')),
                'travel_date' => date('Y-m-d', strtotime('-1 days')),
                'plate_number' => 'DEF-3344',
                'destination' => 'Pagsanjan Falls, Laguna',
                'diesel' => 3000.00,
                'meal_allowance' => 1000.00,
                'total_amount' => 4000.00,
                'status' => 'disbursed',
                'prepared_by' => $admin->id,
                'approved_by' => $admin->id,
                'disbursed_by' => $admin->id,
                'disbursed_amount' => 4000.00,
                'trip_ticket_id' => $tt4->id,
            ]);

            $liq4 = Liquidation::create([
                'trip_ticket_id' => $tt4->id,
                'employee_id' => $ken->id,
                'status' => 'settled',
                'total_advanced' => 4000.00,
                'total_spent' => 5500.00,
                'total_returned' => 0.00,
                'shortage_amount' => -1500.00,
                'notes' => 'Driver had out-of-pocket expenses because of heavy traffic fuel usage. Reimbursable Cash Budget Request of ₱1,500 queued.',
            ]);

            $liq4->items()->create([
                'expense_category' => 'Fuel',
                'amount' => 4500.00,
                'receipt_number' => 'OOP-FUEL-884',
                'status' => 'approved',
            ]);
            $liq4->items()->create([
                'expense_category' => 'Meals',
                'amount' => 1000.00,
                'receipt_number' => 'OOP-MEAL-445',
                'status' => 'approved',
            ]);

            // Create corresponding reimbursement request
            CashBudgetRequest::create([
                'date' => date('Y-m-d'),
                'travel_date' => date('Y-m-d'),
                'destination' => 'Liquidation Reimbursement - TT-2026-1013',
                'meal_allowance' => 1500.00,
                'total_amount' => 1500.00,
                'status' => 'pending_accounting',
                'prepared_by' => $ken->id,
                'liquidation_id' => $liq4->id,
            ]);


            // -------------------------------------------------------------
            // Seed Commissions in multiple states
            // -------------------------------------------------------------
            $com1 = Commission::create([
                'commissioner_name' => 'Eduardo Deblios',
                'employee_id' => $eduardo->id,
                'serial_no' => 'CMS-2026-00001',
                'date' => date('Y-m-d', strtotime('-5 days')),
                'status' => 'draft',
            ]);
            $com1->items()->create([
                'travel_date' => date('Y-m-d', strtotime('-6 days')),
                'destination' => 'Bataan Tour Package Booking',
                'quantity' => 1,
                'amount' => 1200.00,
            ]);

            $com2 = Commission::create([
                'commissioner_name' => 'Ken Baynosa',
                'employee_id' => $ken->id,
                'serial_no' => 'CMS-2026-00002',
                'date' => date('Y-m-d', strtotime('-2 days')),
                'status' => 'approved',
                'approved_by' => $admin->id,
            ]);
            $com2->items()->create([
                'travel_date' => date('Y-m-d', strtotime('-3 days')),
                'destination' => 'Vigan Heritage Tour Passenger Booking',
                'quantity' => 1,
                'amount' => 2000.00,
            ]);

            // Auto-create budget request for approved commission
            CashBudgetRequest::create([
                'date' => date('Y-m-d'),
                'travel_date' => date('Y-m-d'),
                'destination' => 'Commission Payout - CMS-2026-00002',
                'coach_captain_salary' => 2000.00,
                'total_amount' => 2000.00,
                'status' => 'pending_accounting',
                'prepared_by' => $admin->id,
                'commission_id' => $com2->id,
            ]);

            $com3 = Commission::create([
                'commissioner_name' => 'Franklin Sarmiento',
                'employee_id' => $franklin->id,
                'serial_no' => 'CMS-2026-00003',
                'date' => date('Y-m-d', strtotime('-8 days')),
                'status' => 'released',
                'approved_by' => $admin->id,
                'released_by' => $admin->id,
            ]);
            $com3->items()->create([
                'travel_date' => date('Y-m-d', strtotime('-9 days')),
                'destination' => 'Subic Bay Yacht Club Booking',
                'quantity' => 1,
                'amount' => 3500.00,
            ]);
        });
    }
}
