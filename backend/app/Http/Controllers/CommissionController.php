<?php

namespace App\Http\Controllers;

use App\Models\Commission;
use App\Models\CommissionItem;
use Illuminate\Http\Request;
use App\Http\Services\AuditLogService;
use Illuminate\Support\Facades\DB;

class CommissionController extends Controller
{
    public function index()
    {
        $user = auth()->user();
        $query = Commission::with(['items', 'receivedBy', 'releasedBy', 'approvedBy', 'employee']);
        
        if ($user && !$user->hasRole('super_admin', 'executive_vice_president', 'operations_manager', 'corporate_secretary')) {
            $query->where('employee_id', $user->id);
        }
        
        return $query->latest()->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'commissioner_name' => 'required|string|max:255',
            'employee_id' => 'nullable|exists:users,id',
            'serial_no' => 'nullable|string|unique:commissions,serial_no',
            'date' => 'required|date',
            'items' => 'required|array|min:1',
            'items.*.travel_date' => 'nullable|date',
            'items.*.destination' => 'nullable|string',
            'items.*.source_type' => 'nullable|string',
            'items.*.source_id' => 'nullable|integer',
            'items.*.description' => 'nullable|string',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.amount' => 'required|numeric|min:0',
        ]);

        return DB::transaction(function () use ($validated, $request) {
            $serialNo = $validated['serial_no'] ?? $request->input('serial_no');
            if (!$serialNo) {
                $year = now()->year;
                // Check both seeded prefixes (COM- & CMS-) to avoid collision
                $latest = Commission::where(function ($q) use ($year) {
                    $q->where('serial_no', 'like', "COM-{$year}-%")
                      ->orWhere('serial_no', 'like', "CMS-{$year}-%");
                })
                ->orderByDesc('id')
                ->lockForUpdate()
                ->first();
                $sequence = 1;
                if ($latest) {
                    $parts = explode('-', $latest->serial_no);
                    $sequence = (int) end($parts) + 1;
                }
                $serialNo = sprintf('COM-%d-%04d', $year, $sequence);
            }

            $commission = Commission::create([
                'commissioner_name' => $validated['commissioner_name'],
                'employee_id' => $validated['employee_id'] ?? $request->input('employee_id') ?? auth()->id(),
                'serial_no' => $serialNo,
                'date' => $validated['date'],
                'status' => 'draft',
                'received_by' => auth()->user()?->hasRole('driver') ? auth()->id() : null,
            ]);

            foreach ($validated['items'] as $item) {
                $commission->items()->create($item);
            }

            AuditLogService::log('create', 'accounting', 'Commission', $commission->id, null, $commission->toArray());

            return $commission->load('items');
        });
    }

    public function show($id)
    {
        $user = auth()->user();
        $commission = Commission::with(['items', 'receivedBy', 'releasedBy', 'approvedBy', 'employee'])->findOrFail($id);

        // C-01: non-privileged staff/drivers may only view their own commission record.
        if ($user && !$user->hasRole('super_admin', 'executive_vice_president', 'operations_manager', 'accounting_executive', 'corporate_secretary')
            && $commission->employee_id !== $user->id) {
            return response()->json(['error' => 'Unauthorized access to this commission.'], 403);
        }

        return $commission;
    }

    public function update(Request $request, $id)
    {
        $user = auth()->user();
        if ($user->hasRole('driver')) {
            return response()->json(['error' => 'Drivers cannot update commissions.'], 403);
        }

        if ($request->has('status')) {
            $newStatus = $request->status;
            if ($newStatus === 'approved') {
                if (!$user->hasRole('super_admin', 'executive_vice_president', 'corporate_secretary')) {
                    return response()->json(['error' => 'Unauthorized to approve commissions.'], 403);
                }
            }
            if ($newStatus === 'released') {
                if (!$user->hasRole('super_admin', 'executive_vice_president', 'accounting_executive', 'operations_manager')) {
                    return response()->json(['error' => 'Unauthorized to release commissions.'], 403);
                }
            }
        }

        $commission = Commission::findOrFail($id);
        
        $validated = $request->validate([
            'commissioner_name' => 'sometimes|string|max:255',
            'employee_id' => 'sometimes|nullable|exists:users,id',
            'date' => 'sometimes|date',
            'status' => 'sometimes|in:draft,approved,released',
        ]);

        $oldValues = $commission->toArray();
        $commission->update($validated);

        AuditLogService::log('update', 'accounting', 'Commission', $commission->id, $oldValues, $commission->fresh()->toArray());

        if ($request->has('status')) {
            if ($request->status === 'approved') {
                $commission->update(['approved_by' => auth()->id()]);

                $existingCbr = \App\Models\CashBudgetRequest::where('commission_id', $commission->id)->first();
                if (!$existingCbr) {
                    $totalAmt = $commission->items()->sum(DB::raw('amount * quantity'));

                    \App\Models\CashBudgetRequest::create([
                        'date' => date('Y-m-d'),
                        'travel_date' => date('Y-m-d'),
                        'destination' => "Commission Payout - " . $commission->serial_no,
                        'coach_captain_salary' => $totalAmt,
                        'total_amount' => $totalAmt,
                        'status' => 'pending_accounting',
                        'prepared_by' => auth()->id() ?? $commission->employee_id,
                        'commission_id' => $commission->id,
                    ]);
                }
            } elseif ($request->status === 'released') {
                $commission->update(['released_by' => auth()->id()]);
            }
        }

        return $commission->load(['items', 'receivedBy', 'releasedBy', 'approvedBy', 'employee']);
    }

    public function destroy($id)
    {
        // C-02: restrict deletion to privileged roles (route group still includes drivers/general staff).
        $user = auth()->user();
        if (!$user || !$user->hasRole('super_admin', 'executive_vice_president', 'operations_manager', 'accounting_executive')) {
            return response()->json(['error' => 'Unauthorized to delete commissions.'], 403);
        }

        $commission = Commission::findOrFail($id);
        AuditLogService::log('delete', 'accounting', 'Commission', $commission->id, $commission->toArray(), null);
        $commission->delete();
        return response()->json(['message' => 'Commission deleted successfully.']);
    }
}
