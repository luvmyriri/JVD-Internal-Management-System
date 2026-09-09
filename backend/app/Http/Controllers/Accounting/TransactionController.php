<?php

namespace App\Http\Controllers\Accounting;

use App\Http\Controllers\Controller;
use App\Http\Requests\Accounting\TransactionIndexRequest;
use App\Http\Resources\TransactionDetailResource;
use App\Http\Resources\TransactionSummaryResource;
use App\Models\Invoice;
use App\Services\InvoiceDocumentCacheService;
use App\Services\TransactionQueryService;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

class TransactionController extends Controller
{
    public function index(TransactionIndexRequest $request, TransactionQueryService $transactions): JsonResponse
    {
        $result = $transactions->paginate($request->validated());
        $paginator = $result['paginator'];

        return response()->json([
            'success' => true,
            'data' => TransactionSummaryResource::collection($paginator->getCollection())->resolve($request),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'from' => $paginator->firstItem(),
                'to' => $paginator->lastItem(),
            ],
            'stats' => $result['stats'],
        ]);
    }

    public function show(
        TransactionIndexRequest $request,
        Invoice $invoice,
        TransactionQueryService $transactions
    ): JsonResponse {
        $transaction = $transactions->find($invoice, $request->validated());

        return response()->json([
            'success' => true,
            'data' => (new TransactionDetailResource($transaction))->resolve($request),
        ]);
    }

    public function document(
        Invoice $invoice,
        string $document,
        InvoiceDocumentCacheService $documents
    ): Response {
        abort_unless(in_array($document, [
            InvoiceDocumentCacheService::INVOICE,
            InvoiceDocumentCacheService::PAYMENT_RECEIPT,
            InvoiceDocumentCacheService::STATEMENT,
        ], true), 404);

        if ($document === InvoiceDocumentCacheService::PAYMENT_RECEIPT) {
            abort_unless(in_array($invoice->status, ['paid', 'partial'], true), 404, 'No payment receipt is available yet.');
        }

        $contents = $documents->contents($invoice, $document);

        return response($contents, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="'.$documents->fileName($invoice, $document).'"',
            'Cache-Control' => 'private, no-store, max-age=0',
        ]);
    }
}
