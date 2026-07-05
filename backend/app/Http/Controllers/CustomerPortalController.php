<?php

namespace App\Http\Controllers;

use App\Services\InvoiceFinalizationService;
use App\Services\NotificationService;
use App\Services\PortalDocumentService;
use App\Mail\DocumentsCompleteMail;
use App\Models\Contract;
use App\Models\ContractAmendment;
use App\Models\CustomerPortalToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

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
            $contract->loadMissing(['invoice.itineraries', 'invoice.passengers', 'invoice.paymentSchedules']);

            return response()->json([
                'success' => true,
                'data' => [
                    'purpose' => 'contract_signature',
                    'contract_number' => $contract->contract_number,
                    'terms_snapshot' => $related instanceof ContractAmendment ? $related->terms_snapshot : $contract->terms_snapshot,
                    'invoice_summary' => [
                        'invoice_number' => $contract->invoice->invoice_number,
                        'total_amount' => $contract->invoice->total_amount,
                        'customer_name' => $contract->invoice->customer_name,
                    ],
                    'itinerary' => $contract->invoice->itineraries,
                    'passengers' => $contract->invoice->passengers,
                    'payment_schedule' => $contract->invoice->paymentSchedules,
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
                    'quantity' => $i->quantity,
                    'unit_price' => $i->unit_price,
                    'total_price' => $i->total_price,
                    'adults' => $i->adults,
                    'children' => $i->children,
                ])->all();

                $invoice = $finalizer->finalizeWithinTransaction($invoice, $processedItems);
                $invoice->update(['contract_gate_status' => 'signed']);
            }

            $portalToken->update(['consumed_at' => now()]);

            DB::commit();
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
