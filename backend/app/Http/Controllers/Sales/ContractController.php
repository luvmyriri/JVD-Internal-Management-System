<?php

namespace App\Http\Controllers\Sales;

use App\Exceptions\MaxPaxExceededException;
use App\Http\Controllers\Controller;
use App\Http\Services\ContractPdfService;
use App\Http\Services\InvoiceFinalizationService;
use App\Mail\ContractSentForSignatureMail;
use App\Models\Contract;
use App\Models\ContractAmendment;
use App\Models\CustomerPortalToken;
use App\Models\CustomTransactionDetail;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\InvoicePassenger;
use App\Models\Itinerary;
use App\Models\PaymentSchedule;
use App\Models\SystemSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class ContractController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Contract::with(['invoice', 'creator']);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('invoice_id')) {
            $query->where('invoice_id', $request->invoice_id);
        }

        $contracts = $query->latest()->paginate($request->per_page ?? 20);

        return response()->json([
            'success' => true,
            'data' => $contracts->items(),
            'meta' => [
                'current_page' => $contracts->currentPage(),
                'last_page' => $contracts->lastPage(),
                'total' => $contracts->total(),
            ],
        ]);
    }

    public function show(Contract $contract): JsonResponse
    {
        $contract->load(['invoice.items.service', 'invoice.itineraries', 'invoice.passengers', 'invoice.paymentSchedules', 'invoice.customTransactionDetail', 'amendments', 'creator']);

        return response()->json(['success' => true, 'data' => $contract]);
    }

    /**
     * Creates a draft Invoice + Items + CustomTransactionDetail + optional Itinerary/Passenger
     * rows + a draft Contract, all in one transaction. Does NOT run collection-sync, mail, or
     * auto-JobOrder-creation — those only happen once the contract is signed (see
     * CustomerPortalController::signContract / signAtCounter below).
     */
    public function draft(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'customer_id' => 'nullable|exists:customers,id',
            'customer_name' => 'nullable|string|max:255',
            'customer_address' => 'nullable|string|max:255',
            'customer_email' => 'nullable|string|email|max:255',
            'customer_contact' => 'nullable|string',
            'payment_method' => 'required|string',
            'payment_type' => 'nullable|string|in:full,downpayment',
            'amount_received' => 'nullable|numeric',
            'tax_rate' => 'nullable|numeric|min:0|max:1',
            'due_date' => 'nullable|date',
            'travel_date' => 'nullable|date',
            'arrival_datetime' => 'nullable|date',
            'departure_datetime' => 'nullable|date',
            'pickup_location' => 'nullable|string|max:255',
            'tour_code' => 'nullable|string|max:255',
            'pax_count' => 'nullable|integer|min:1',
            'bus_id' => 'nullable|integer|exists:buses,id',
            'driver_id' => 'nullable|integer|exists:users,id',
            'seat_map' => 'nullable|array',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.service_id' => 'required|exists:services,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'nullable|numeric',
            'items.*.adults' => 'nullable|integer',
            'items.*.children' => 'nullable|integer',
            'items.*.service_date' => 'nullable|date',
            'items.*.destination' => 'nullable|string',
            // C-NOTE: Laravel's validate() strips any nested key not explicitly listed here —
            // every custom_transaction_detail/itinerary/passenger field must be named below or
            // it silently drops from $validated even though it was present in the raw request.
            'custom_transaction_detail' => 'required|array',
            'custom_transaction_detail.category' => 'required|string',
            'custom_transaction_detail.vehicle_type' => 'nullable|string|max:100',
            'custom_transaction_detail.route' => 'nullable|string|max:255',
            'custom_transaction_detail.rental_days' => 'nullable|integer|min:1',
            'custom_transaction_detail.plate_number' => 'nullable|string|max:50',
            'custom_transaction_detail.inclusion_driver' => 'nullable|boolean',
            'custom_transaction_detail.inclusion_fuel' => 'nullable|boolean',
            'custom_transaction_detail.inclusion_toll' => 'nullable|boolean',
            'custom_transaction_detail.inclusion_insurance' => 'nullable|boolean',
            'custom_transaction_detail.school_name' => 'nullable|string|max:255',
            'custom_transaction_detail.grade_level' => 'nullable|string|max:100',
            'custom_transaction_detail.expected_pax' => 'nullable|integer|min:0',
            'custom_transaction_detail.itinerary_stops' => 'nullable|string',
            'custom_transaction_detail.edu_inclusion_meals' => 'nullable|boolean',
            'custom_transaction_detail.edu_inclusion_coordinator' => 'nullable|boolean',
            'custom_transaction_detail.edu_inclusion_insurance' => 'nullable|boolean',
            'custom_transaction_detail.edu_inclusion_tshirt' => 'nullable|boolean',
            'custom_transaction_detail.destination' => 'nullable|string|max:255',
            'custom_transaction_detail.accommodation_type' => 'nullable|string|max:100',
            'custom_transaction_detail.visa_country' => 'nullable|string|max:100',
            'custom_transaction_detail.visa_type' => 'nullable|string|max:100',
            'custom_transaction_detail.visa_req_passport' => 'nullable|boolean',
            'custom_transaction_detail.visa_req_photo' => 'nullable|boolean',
            'custom_transaction_detail.visa_req_bank_cert' => 'nullable|boolean',
            'custom_transaction_detail.visa_req_itr' => 'nullable|boolean',
            'custom_transaction_detail.visa_req_birth_cert' => 'nullable|boolean',
            'custom_transaction_detail.joiner_tour_code' => 'nullable|string|max:255',
            'custom_transaction_detail.booking_type' => 'nullable|string|max:100',
            'custom_transaction_detail.booking_reference_code' => 'nullable|string|max:255',
            'custom_transaction_detail.booking_details' => 'nullable|string',
            'custom_transaction_detail.category_meta' => 'nullable|array',
            'custom_transaction_detail.additional_remarks' => 'nullable|string',
            'itinerary' => 'nullable|array',
            'itinerary.*.day_number' => 'required_with:itinerary|integer|min:1',
            'itinerary.*.date' => 'nullable|date',
            'itinerary.*.location' => 'nullable|string|max:255',
            'itinerary.*.activity_description' => 'nullable|string',
            'itinerary.*.meal_plan' => 'nullable|string|max:255',
            'itinerary.*.accommodation_name' => 'nullable|string|max:255',
            'itinerary.*.check_in_time' => 'nullable|string',
            'itinerary.*.check_out_time' => 'nullable|string',
            'passengers' => 'nullable|array',
            'passengers.*.first_name' => 'required_with:passengers|string|max:255',
            'passengers.*.date_of_birth' => 'nullable|date',
            'passengers.*.passport_number' => 'nullable|string|max:100',
            'passengers.*.dietary_restrictions' => 'nullable|string|max:255',
            'passengers.*.emergency_contact' => 'nullable|string|max:255',
            'passengers.*.special_needs' => 'nullable|string',
            'passengers.*.last_name' => 'required_with:passengers|string|max:255',
        ]);

        $finalizer = app(InvoiceFinalizationService::class);

        DB::beginTransaction();
        try {
            try {
                $calc = $finalizer->calculateItems($validated['items'], $validated['travel_date'] ?? null, $validated['pax_count'] ?? null, $validated['tax_rate'] ?? null);
            } catch (MaxPaxExceededException $e) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => $e->getMessage(),
                    'errors' => ['max_pax' => ["Exceeds maximum passenger capacity. {$e->remainingSlots} slots remaining out of {$e->maxPax}."]],
                ], 422);
            }

            $customerId = $finalizer->resolveCustomerId(
                $validated['customer_id'] ?? null,
                $validated['customer_name'] ?? null,
                $validated['customer_email'] ?? null,
                $validated['customer_contact'] ?? null,
                $validated['customer_address'] ?? null
            );

            $paymentType = $validated['payment_type'] ?? 'full';
            $amountReceived = (float) ($validated['amount_received'] ?? 0);

            $invoice = Invoice::create([
                'invoice_number' => 'INV-' . strtoupper(Str::random(8)),
                'customer_id' => $customerId,
                'customer_name' => $validated['customer_name'] ?? null,
                'customer_address' => $validated['customer_address'] ?? null,
                'customer_email' => $validated['customer_email'] ?? null,
                'customer_contact' => $validated['customer_contact'] ?? null,
                'subtotal' => $calc['subtotal'],
                'tax_amount' => $calc['taxAmount'],
                'total_amount' => $calc['totalAmount'],
                'amount_received' => $amountReceived,
                'change' => 0,
                'payment_method' => $validated['payment_method'],
                'payment_type' => $paymentType,
                'balance' => $calc['totalAmount'],
                'due_date' => $validated['due_date'] ?? $validated['travel_date'] ?? null,
                'status' => 'draft_pending_contract',
                'requires_contract' => true,
                'contract_gate_status' => 'pending_signature',
                'created_by' => auth()->id() ?? 1,
                'notes' => $validated['notes'] ?? null,
                'bus_id' => $validated['bus_id'] ?? null,
                'driver_id' => $validated['driver_id'] ?? null,
                'seat_map' => $validated['seat_map'] ?? null,
                'travel_date' => $validated['travel_date'] ?? null,
                'arrival_datetime' => $validated['arrival_datetime'] ?? null,
                'departure_datetime' => $validated['departure_datetime'] ?? null,
                'pickup_location' => $validated['pickup_location'] ?? null,
                'tour_code' => $validated['tour_code'] ?? null,
                'pax_count' => $validated['pax_count'] ?? null,
            ]);

            foreach ($calc['processedItems'] as $pItem) {
                InvoiceItem::create([
                    'invoice_id' => $invoice->id,
                    'service_id' => $pItem['service_id'],
                    'quantity' => $pItem['quantity'],
                    'unit_price' => $pItem['unit_price'],
                    'total_price' => $pItem['total_price'],
                    'adults' => $pItem['adults'],
                    'children' => $pItem['children'],
                ]);
            }

            CustomTransactionDetail::create(array_merge(
                ['invoice_id' => $invoice->id],
                $validated['custom_transaction_detail']
            ));

            foreach ($validated['itinerary'] ?? [] as $day) {
                Itinerary::create(array_merge(['invoice_id' => $invoice->id], $day));
            }

            foreach ($validated['passengers'] ?? [] as $passenger) {
                InvoicePassenger::create(array_merge(['invoice_id' => $invoice->id], $passenger));
            }

            $depositPercent = (float) SystemSetting::getValue('sales.default_deposit_percent', 30);

            $contract = Contract::create([
                'invoice_id' => $invoice->id,
                'contract_number' => $this->generateContractNumber(),
                'status' => 'draft',
                'terms_snapshot' => $this->renderTermsSnapshot($invoice, $depositPercent),
                'deposit_required_percent' => $depositPercent,
                'deposit_required_amount' => round($calc['totalAmount'] * ($depositPercent / 100), 2),
                'created_by' => auth()->id(),
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Contract draft created.',
                'data' => $contract->load(['invoice.items.service', 'invoice.itineraries', 'invoice.passengers']),
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => 'Failed to create contract draft.', 'error' => $e->getMessage()], 500);
        }
    }

    public function updateDraft(Request $request, Contract $contract): JsonResponse
    {
        if ($contract->status !== 'draft') {
            return response()->json(['success' => false, 'message' => 'Only draft contracts can be edited.'], 422);
        }

        $validated = $request->validate([
            'terms_snapshot' => 'sometimes|string',
            'deposit_required_percent' => 'sometimes|nullable|numeric',
            'deposit_required_amount' => 'sometimes|nullable|numeric',
            'cancellation_policy_key' => 'sometimes|nullable|string',
        ]);

        $contract->update($validated);

        return response()->json(['success' => true, 'data' => $contract->fresh()]);
    }

    public function attachPaymentSchedule(Request $request, Contract $contract): JsonResponse
    {
        if ($contract->status !== 'draft') {
            return response()->json(['success' => false, 'message' => 'Only draft contracts can have a payment schedule attached.'], 422);
        }

        $validated = $request->validate([
            'mode' => 'required|in:auto,manual',
            'count' => 'required_if:mode,auto|integer|min:1',
            'first_due_date' => 'required_if:mode,auto|date',
            'interval_days' => 'nullable|integer|min:1',
            'rows' => 'required_if:mode,manual|array|min:1',
            'rows.*.due_date' => 'required_with:rows|date',
            'rows.*.amount_due' => 'required_with:rows|numeric|min:0',
        ]);

        PaymentSchedule::where('invoice_id', $contract->invoice_id)->delete();

        if ($validated['mode'] === 'auto') {
            $intervalDays = $validated['interval_days'] ?? (int) SystemSetting::getValue('sales.default_installment_interval_days', 30);
            $rows = PaymentSchedule::generateInstallments(
                $contract->invoice,
                $validated['count'],
                new \DateTimeImmutable($validated['first_due_date']),
                $intervalDays
            );
        } else {
            $rows = [];
            foreach ($validated['rows'] as $i => $row) {
                $rows[] = [
                    'invoice_id' => $contract->invoice_id,
                    'installment_number' => $i + 1,
                    'due_date' => $row['due_date'],
                    'amount_due' => $row['amount_due'],
                    'status' => 'pending',
                ];
            }
        }

        PaymentSchedule::insert(array_map(fn ($r) => array_merge($r, ['created_at' => now(), 'updated_at' => now()]), $rows));

        return response()->json(['success' => true, 'data' => $contract->invoice->paymentSchedules()->get()]);
    }

    public function sendForSignature(Request $request, Contract $contract): JsonResponse
    {
        if (!in_array($contract->status, ['draft', 'sent_for_signature'])) {
            return response()->json(['success' => false, 'message' => 'This contract cannot be sent for signature in its current state.'], 422);
        }

        $expiresInDays = 14;
        $token = CustomerPortalToken::generateFor('Contract', $contract->id, 'contract_signature', null, $expiresInDays);

        $contract->update([
            'status' => 'sent_for_signature',
            'sent_at' => now(),
            'expires_at' => now()->addDays($expiresInDays),
        ]);

        $signingLink = \App\Http\Services\PortalLinkResolver::buildPortalLink($token->token, $request);

        $mailError = null;
        if ($contract->invoice->customer_email) {
            try {
                Mail::to($contract->invoice->customer_email)->send(new ContractSentForSignatureMail($contract, $signingLink));
            } catch (\Exception $e) {
                $mailError = $e->getMessage();
                \Log::error("Failed to send contract signature request to {$contract->invoice->customer_email}: {$mailError}");
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Signing link generated.',
            'link' => $signingLink,
            'mail_error' => $mailError,
        ]);
    }

    /**
     * Staff-authenticated in-person signing — same capture/finalize logic as the public
     * portal path, but witnessed by a logged-in staff member at the counter.
     */
    public function signAtCounter(Request $request, Contract $contract): JsonResponse
    {
        if ($contract->status === 'signed') {
            return response()->json(['success' => false, 'message' => 'This contract has already been signed.'], 422);
        }

        $validated = $request->validate([
            'signature_image' => 'required|string',
            'signature_typed_name' => 'required|string|max:255',
        ]);

        $finalizer = app(InvoiceFinalizationService::class);
        $invoice = $contract->invoice;

        DB::beginTransaction();
        try {
            $contract->update([
                'status' => 'signed',
                'signature_image' => $validated['signature_image'],
                'signature_typed_name' => $validated['signature_typed_name'],
                'signed_at' => now(),
                'signed_ip' => $request->ip(),
                'signing_user_agent' => $request->userAgent(),
            ]);

            $processedItems = $invoice->items->map(fn ($i) => [
                'service_id' => $i->service_id, 'quantity' => $i->quantity, 'unit_price' => $i->unit_price,
                'total_price' => $i->total_price, 'adults' => $i->adults, 'children' => $i->children,
            ])->all();

            $invoice = $finalizer->finalizeWithinTransaction($invoice, $processedItems);
            $invoice->update(['contract_gate_status' => 'signed']);

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => 'Failed to record signature.', 'error' => $e->getMessage()], 500);
        }

        $finalizer->afterCommit($invoice, ['actor' => $request->user(), 'source' => 'contract', 'contract' => $contract]);

        return response()->json([
            'success' => true,
            'message' => 'Contract signed at counter.',
            'data' => (new \App\Http\Resources\InvoiceResource($invoice->load(['items.service', 'driver'])))->resolve(),
        ]);
    }

    public function void(Contract $contract): JsonResponse
    {
        if ($contract->status === 'signed') {
            return response()->json(['success' => false, 'message' => 'A signed contract cannot be voided this way.'], 422);
        }

        $contract->update(['status' => 'voided']);
        $contract->invoice->update(['status' => 'cancelled', 'contract_gate_status' => 'bypassed']);

        return response()->json(['success' => true, 'message' => 'Contract voided.']);
    }

    public function createAmendment(Request $request, Contract $contract): JsonResponse
    {
        if ($contract->status !== 'signed') {
            return response()->json(['success' => false, 'message' => 'Only a signed contract can be amended.'], 422);
        }

        $validated = $request->validate([
            'reason' => 'required|string',
            'changes_summary' => 'required|string',
            'terms_snapshot' => 'required|string',
        ]);

        $nextNumber = ($contract->latestAmendment()?->amendment_number ?? 0) + 1;

        $amendment = ContractAmendment::create([
            'contract_id' => $contract->id,
            'amendment_number' => $nextNumber,
            'reason' => $validated['reason'],
            'changes_summary' => $validated['changes_summary'],
            'terms_snapshot' => $validated['terms_snapshot'],
            'created_by' => auth()->id(),
        ]);

        return response()->json(['success' => true, 'data' => $amendment], 201);
    }

    public function sendAmendmentForSignature(ContractAmendment $amendment): JsonResponse
    {
        $token = CustomerPortalToken::generateFor('ContractAmendment', $amendment->id, 'contract_signature', null, 14);
        $signingLink = \App\Http\Services\PortalLinkResolver::buildPortalLink($token->token);

        $mailError = null;
        if ($amendment->contract->invoice->customer_email) {
            try {
                Mail::to($amendment->contract->invoice->customer_email)->send(new ContractSentForSignatureMail($amendment->contract, $signingLink));
            } catch (\Exception $e) {
                $mailError = $e->getMessage();
            }
        }

        return response()->json(['success' => true, 'link' => $signingLink, 'mail_error' => $mailError]);
    }

    public function pdf(Contract $contract)
    {
        $pdf = app(ContractPdfService::class)->generate($contract);
        return $pdf->stream("Contract_{$contract->contract_number}.pdf");
    }

    private function generateContractNumber(): string
    {
        $year = now()->year;
        $latest = Contract::where('contract_number', 'like', "CTR-{$year}-%")
            ->orderByDesc('id')
            ->lockForUpdate()
            ->first();

        $sequence = 1;
        if ($latest) {
            $parts = explode('-', $latest->contract_number);
            $sequence = (int) end($parts) + 1;
        }

        return sprintf('CTR-%d-%04d', $year, $sequence);
    }

    private function renderTermsSnapshot(Invoice $invoice, float $depositPercent): string
    {
        $tiers = SystemSetting::getValue('sales.cancellation_tiers', []);
        $tierLines = collect($tiers)->map(fn ($t) => "- {$t['days']}+ days before travel: {$t['refund']}% refund")->implode("\n");

        return <<<TERMS
        SERVICE CONTRACT — {$invoice->invoice_number}

        This contract confirms the booking of services totaling PHP {$invoice->total_amount} for {$invoice->customer_name}.

        DEPOSIT: A deposit of {$depositPercent}% of the total amount is required to confirm this booking.

        CANCELLATION POLICY:
        {$tierLines}

        By signing below, the customer acknowledges and agrees to the above terms, the itinerary, payment schedule, and passenger details attached to this contract.
        TERMS;
    }
}
