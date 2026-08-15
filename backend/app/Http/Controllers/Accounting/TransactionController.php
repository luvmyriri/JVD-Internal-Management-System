<?php

namespace App\Http\Controllers\Accounting;

use App\Http\Controllers\Controller;
use App\Http\Requests\Accounting\TransactionIndexRequest;
use App\Http\Resources\TransactionDetailResource;
use App\Http\Resources\TransactionSummaryResource;
use App\Models\Invoice;
use App\Services\TransactionQueryService;
use Illuminate\Http\JsonResponse;

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
}
