<?php

namespace App\Http\Controllers;

use App\Services\InvoiceFinalizationService;
use App\Services\NotificationService;
use App\Services\PortalDocumentService;
use App\Services\SalesOrderService;
use App\Mail\DocumentsCompleteMail;
use App\Models\Contract;
use App\Models\ContractAmendment;
use App\Models\CustomerPortalToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

/**
 * Public (unauthenticated), token-driven portal serving both document-upload requests
 * (travel/visa cases + supplier KYC) and contract review/e-signature — consolidates what
 * used to be two separate public flows behind one token validation mechanism.
 */
class CustomerPortalController extends Controller
{
    public function verify(Request $request, string $token): JsonResponse
    {
        $portalToken = CustomerPortalToken::where('token', $token)->first();

        if (!$portalToken || $portalToken->isExpired()) {
            return response()->json(['success' => false, 'message' => 'Invalid or expired link.'], 403);
        }

        if ($portalToken->purpose === 'document_upload') {
            $related = $portalToken->related();
            if (!$related) {
                return response()->json(['success' => false, 'message' => 'Invalid or expired link.'], 403);
            }

            $progress = app(PortalDocumentService::class)->checklistProgress($portalToken);

            $entitySummary = $portalToken->related_type === 'PassportCase'
                ? [
                    'case_type' => $related->case_type,
                    'customer_name' => trim(($related->customer->first_name ?? '') . ' ' . ($related->customer->last_name ?? '')),
                    'destination_country' => $related->destination_country,
                    'visa_type' => $related->visa_type,
                ]
                : [
                    'entity_name' => $related->entity_name,
                    'entity_type' => $related->entity_type,
                ];

            return response()->json([
                'success' => true,
                'data' => [
                    'purpose' => 'document_upload',
                    'related_type' => $portalToken->related_type,
                    'entity_summary' => $entitySummary,
                    'requested_docs' => $progress['requested'],
                    'uploaded_docs' => $progress['uploaded'],
                    'percent_complete' => $progress['percent_complete'],
                ],
            ]);
        }

        if ($portalToken->purpose === 'contract_signature') {
            $related = $portalToken->related();
            if (!$related) {
                return response()->json(['success' => false, 'message' => 'Invalid or expired link.'], 403);
            }

            /** @var Contract $contract */
            $contract = $related instanceof ContractAmendment ? $related->contract : $related;
            $contract->loadMissing([
                'invoice.items.service',
                'invoice.itineraries',
                'invoice.passengers',
                'invoice.paymentSchedules',
                'invoice.joinerReservation.departure.bus',
                'invoice.joinerReservation.departure.driver',
                'invoice.joinerReservation.passengers.seat',
            ]);

            $invoice = $contract->invoice;
            $joiner = $invoice->joinerReservation;
            $joinerDeparture = $joiner?->departure;

            return response()->json([
                'success' => true,
                'data' => [
                    'purpose' => 'contract_signature',
                    'contract_number' => $contract->contract_number,
                    'terms_snapshot' => $related instanceof ContractAmendment ? $related->terms_snapshot : $contract->terms_snapshot,
                    'invoice_summary' => [
                        'invoice_number' => $invoice->invoice_number,
                        'subtotal' => (float) $invoice->subtotal,
                        'tax_amount' => (float) $invoice->tax_amount,
                        'total_amount' => (float) $invoice->total_amount,
                        'amount_received' => (float) ($invoice->amount_received ?? 0),
                        'balance' => (float) ($invoice->balance ?? 0),
                        'customer_name' => $invoice->customer_name,
                        'items' => $invoice->items->map(fn ($item) => [
                            'id' => $item->id,
                            'name' => $item->item_name ?? $item->service?->name ?? 'Travel service',
                            'service_type' => $item->service_type ?? $item->service?->service_type,
                            'description' => $item->item_description ?? $item->service?->description,
                            'quantity' => (int) $item->quantity,
                            'unit_price' => (float) $item->unit_price,
                            'total_price' => (float) $item->total_price,
                            'adults' => $item->adults !== null ? (int) $item->adults : null,
                            'children' => $item->children !== null ? (int) $item->children : null,
                            'adult_price' => $item->adult_price !== null ? (float) $item->adult_price : null,
                            'child_price' => $item->child_price !== null ? (float) $item->child_price : null,
                        ])->values(),
                        'joiner_booking' => $joiner && $joinerDeparture ? [
                            'reference' => $joiner->reference,
                            'departure_code' => $joinerDeparture->code,
                            'starts_at' => $joinerDeparture->starts_at?->toISOString(),
                            'ends_at' => $joinerDeparture->ends_at?->toISOString(),
                            'pickup_instructions' => $joinerDeparture->pickup_instructions,
                            'vehicle' => $joinerDeparture->bus ? [
                                'plate_number' => $joinerDeparture->bus->plate_number,
                                'model' => $joinerDeparture->bus->model,
                            ] : null,
                            'driver' => $joinerDeparture->driver ? [
                                'name' => trim($joinerDeparture->driver->first_name.' '.$joinerDeparture->driver->last_name),
                                'phone' => $joinerDeparture->driver->phone,
                                'email' => $joinerDeparture->driver->email,
                            ] : null,
                            'passengers' => $joiner->passengers->map(fn ($passenger) => [
                                'name' => trim($passenger->first_name.' '.$passenger->last_name),
                                'passenger_type' => $passenger->passenger_type,
                                'seat_code' => $passenger->seat?->seat_code,
                            ])->values(),
                        ] : null,
                    ],
                    'itinerary' => $invoice->itineraries,
                    'passengers' => $invoice->passengers,
                    'payment_schedule' => $invoice->paymentSchedules,
                    'already_signed' => $portalToken->isConsumed(),
                ],
            ]);
        }

        return response()->json(['success' => false, 'message' => 'Unsupported portal link.'], 422);
    }

    public function uploadDocument(Request $request, string $token): JsonResponse
    {
        $portalToken = CustomerPortalToken::where('token', $token)->first();

        if (!$portalToken || $portalToken->isExpired() || $portalToken->purpose !== 'document_upload') {
            return response()->json(['success' => false, 'message' => 'Invalid or expired link.'], 403);
        }

        $request->validate([
            'title' => ['required', 'string'],
            'file' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'],
        ]);

        try {
            $result = app(PortalDocumentService::class)->storeUpload($portalToken, $request->file('file'), trim($request->input('title')));
        } catch (\InvalidArgumentException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }

        if ($result['checklist_complete']) {
            $owner = $portalToken->related();
            $recipientEmail = $portalToken->related_type === 'PassportCase'
                ? ($owner->customer->email ?? null)
                : ($owner->contact_email ?? null);

            if ($recipientEmail) {
                try {
                    Mail::to($recipientEmail)->send(new DocumentsCompleteMail($portalToken));
                } catch (\Exception $mailEx) {
                    \Log::error("Failed to send documents-complete email to {$recipientEmail}: " . $mailEx->getMessage());
                }
            }

            NotificationService::notifyDocumentsComplete($portalToken);
        }

        return response()->json([
            'success' => true,
            'message' => 'Document uploaded successfully.',
            'data' => $result['document'],
            'checklist_complete' => $result['checklist_complete'],
        ], 201);
    }

    public function signContract(Request $request, string $token): JsonResponse
    {
        $portalToken = CustomerPortalToken::where('token', $token)->first();

        if (!$portalToken || $portalToken->isExpired() || $portalToken->purpose !== 'contract_signature') {
            return response()->json(['success' => false, 'message' => 'Invalid or expired link.'], 403);
        }
        if ($portalToken->isConsumed()) {
            return response()->json(['success' => false, 'message' => 'This contract has already been signed.'], 422);
        }

        $validated = $request->validate([
            'signature_image' => ['required', 'string'],
            'signature_typed_name' => ['required', 'string', 'max:255'],
        ]);

        $related = $portalToken->related();
        if (!$related) {
            return response()->json(['success' => false, 'message' => 'Invalid or expired link.'], 403);
        }

        $contract = $related instanceof ContractAmendment ? $related->contract : $related;
        $invoice = $contract->invoice;
        $finalizer = app(InvoiceFinalizationService::class);

        DB::beginTransaction();
        try {
            if (!($related instanceof ContractAmendment)) {
                $finalizer->assertPassportCasesCanBeBilled(
                    $invoice->items->pluck('passport_case_id')->all(),
                    $invoice->customer_id,
                    $invoice->id,
                    $invoice->customTransactionDetail?->passport_case_id
                );
            }

            $signatureData = [
                'signature_image' => $validated['signature_image'],
                'signature_typed_name' => $validated['signature_typed_name'],
                'signed_at' => now(),
                'signed_ip' => $request->ip(),
            ];

            if ($related instanceof ContractAmendment) {
                $related->update($signatureData);
            } else {
                $related->update([...$signatureData, 'status' => 'signed', 'signing_user_agent' => $request->userAgent()]);

                // Recalculate items from the invoice's persisted items (needed by finalizeWithinTransaction).
                $processedItems = $invoice->items->map(fn ($i) => [
                    'service_id' => $i->service_id,
                    'passport_case_id' => $i->passport_case_id,
                    'quantity' => $i->quantity,
                    'unit_price' => $i->unit_price,
                    'total_price' => $i->total_price,
                    'adults' => $i->adults,
                    'children' => $i->children,
                    'adult_price' => $i->adult_price,
                    'child_price' => $i->child_price,
                    'item_name' => $i->item_name,
                    'service_type' => $i->service_type,
                    'item_description' => $i->item_description,
                    'item_metadata' => $i->item_metadata,
                ])->all();

                $invoice = $finalizer->finalizeWithinTransaction($invoice, $processedItems);
                $invoice->update(['contract_gate_status' => 'signed']);

                $salesOrders = app(SalesOrderService::class);
                if ($salesOrders->hasTypedCapturePayload($processedItems)) {
                    $salesOrders->captureInvoice($invoice, $invoice->created_by);
                }
            }

            $portalToken->update(['consumed_at' => now()]);

            DB::commit();
        } catch (ValidationException $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'The contract details could not be validated.',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => 'Failed to record signature.', 'error' => $e->getMessage()], 500);
        }

        if (!($related instanceof ContractAmendment)) {
            $finalizer->afterCommit($invoice, ['actor' => null, 'source' => 'contract', 'contract' => $contract]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Contract signed successfully.',
            'data' => ['contract_number' => $contract->contract_number, 'invoice_number' => $invoice->invoice_number],
        ]);
    }
}
