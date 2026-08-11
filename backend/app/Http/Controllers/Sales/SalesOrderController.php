<?php

namespace App\Http\Controllers\Sales;

use App\Http\Controllers\Controller;
use App\Models\CreditNote;
use App\Models\Invoice;
use App\Models\SalesOrder;
use App\Models\SalesOrderAdjustment;
use App\Models\SalesOrderItem;
use App\Models\SalesRefund;
use App\Models\Service;
use App\Services\ContractPdfService;
use App\Services\DocumentPdfService;
use App\Services\SalesLifecycleService;
use App\Services\SalesOrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SalesOrderController extends Controller
{
    public function index(Request $request, SalesOrderService $service): JsonResponse
    {
        $orders = SalesOrder::with(['customer', 'agent:id,first_name,last_name', 'invoice'])
            ->withCount('items')
            ->when($request->status, fn ($q, $status) => $q->where('status', $status))
            ->when($request->customer_id, fn ($q, $id) => $q->where('customer_id', $id))
            ->when($request->search, fn ($q, $search) => $q->where(function ($x) use ($search) {
                $x->where('order_number', 'like', "%{$search}%")->orWhereHas('customer', fn ($c) => $c->where('first_name', 'like', "%{$search}%")->orWhere('last_name', 'like', "%{$search}%"));
            }))
            ->latest()->paginate(min((int) $request->input('per_page', 20), 100));

        return response()->json(['success' => true, 'data' => $orders]);
    }

    public function show(SalesOrder $order, SalesOrderService $service): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $order->load($service->relations())]);
    }

    public function showByInvoice(Invoice $invoice, SalesOrderService $service): JsonResponse
    {
        $order = $invoice->salesOrder ?? $service->captureInvoice($invoice, auth()->id());

        return response()->json(['success' => true, 'data' => $order->load($service->relations())]);
    }

    public function serviceDetails(Service $service): JsonResponse
    {
        $items = SalesOrderItem::query()
            ->where('service_id', $service->id)
            ->with(['order.customer', 'order.invoice', 'fulfillment'])
            ->latest('id')
            ->limit(100)
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'service' => $service,
                'transactions' => $items->map(fn (SalesOrderItem $item) => [
                    'id' => $item->id,
                    'service_type' => $item->service_type,
                    'title' => $item->title,
                    'status' => $item->status,
                    'traveler_count' => $item->traveler_count,
                    'scheduled_start' => $item->scheduled_start,
                    'scheduled_end' => $item->scheduled_end,
                    'total_amount' => $item->total_amount,
                    'order' => $item->order,
                    'fulfillment' => $item->fulfillment,
                ])->values(),
            ],
        ]);
    }

    public function document(
        SalesOrder $order,
        string $document,
        SalesOrderService $orders,
        DocumentPdfService $documents,
        ContractPdfService $contracts
    ) {
        abort_unless(in_array($document, [
            'invoice', 'manifest', 'quotation', 'contract',
            'joiner-manifest', 'charter-confirmation', 'charter-dispatch', 'educational-manifest',
        ], true), 404);
        $order->load($orders->relations());
        $invoice = $order->invoice;
        abort_unless($invoice, 404, 'This transaction has no linked invoice yet.');
        $invoice->load(Invoice::operationalDocumentRelations());

        if ($document === 'invoice') {
            return $documents->render('pdf.invoice', ['invoice' => $invoice, 'taxRate' => 0.12])
                ->stream("Invoice_{$invoice->invoice_number}.pdf");
        }

        if ($document === 'contract') {
            abort_unless($invoice->contract, 404, 'This transaction has no linked contract.');

            return $contracts->generate($invoice->contract)
                ->stream("Contract_{$invoice->contract->contract_number}.pdf");
        }

        if ($document === 'joiner-manifest') {
            $departure = $invoice->joinerReservation?->departure;
            abort_unless($departure, 404, 'This transaction is not linked to a joiner departure.');
            $departure->load([
                'service', 'bus', 'driver',
                'reservations' => fn ($query) => $query->where('status', 'confirmed')
                    ->with(['passengers.seat'])->orderBy('created_at'),
            ]);

            return $documents->render('pdf.joiner-manifest', ['departure' => $departure])
                ->stream("Joiner_Manifest_{$departure->code}.pdf");
        }

        if (in_array($document, ['charter-confirmation', 'charter-dispatch'], true)) {
            $booking = $invoice->charterBooking;
            abort_unless($booking, 404, 'This transaction is not linked to a charter booking.');
            $booking->load(['ratePlan.service', 'bus', 'driver', 'invoice.items']);
            $view = $document === 'charter-confirmation' ? 'pdf.charter-confirmation' : 'pdf.charter-dispatch-sheet';
            $label = $document === 'charter-confirmation' ? 'Confirmation' : 'Dispatch';

            return $documents->render($view, ['booking' => $booking])
                ->stream("Charter_{$label}_{$booking->reference}.pdf");
        }

        if ($document === 'educational-manifest') {
            $booking = $invoice->educationalTourBooking;
            abort_unless($booking, 404, 'This transaction is not linked to an educational tour booking.');
            $booking->load(['program.service', 'vehicles.bus', 'vehicles.driver', 'invoice']);

            return $documents->render('pdf.educational-tour-manifest', ['booking' => $booking])
                ->stream("Educational_Tour_Manifest_{$booking->reference}.pdf");
        }

        $view = $document === 'manifest' ? 'pdf.sales-order-manifest' : 'pdf.sales-order-quotation';
        $filename = $document === 'manifest'
            ? "Passenger_Manifest_{$order->order_number}.pdf"
            : "Quotation_{$order->order_number}.pdf";

        return $documents->render($view, ['order' => $order])->stream($filename);
    }

    public function store(Request $request, SalesOrderService $service): JsonResponse
    {
        $data = $request->validate([
            'customer_id' => 'nullable|integer|exists:customers,id', 'customer_name' => 'nullable|required_without:customer_id|string|max:160',
            'customer_email' => 'nullable|email|max:255', 'customer_contact' => 'nullable|string|max:50', 'customer_address' => 'nullable|string|max:500',
            'notes' => 'nullable|string|max:5000',
        ]);
        $order = $service->createDraft($data, $request->user()->id);

        return response()->json(['success' => true, 'message' => 'Sales order draft created.', 'data' => $order], 201);
    }

    public function addItem(Request $request, SalesOrder $order, SalesOrderService $service): JsonResponse
    {
        $data = $request->validate([
            'service_type' => ['required', 'string', Rule::in(array_keys(config('service_types')))],
            'service_id' => 'required|integer|exists:services,id', 'title' => 'nullable|string|max:255', 'description' => 'nullable|string|max:3000',
            'quantity' => 'nullable|numeric|min:0.01|max:10000', 'unit_price' => 'nullable|numeric|min:0|max:999999999', 'details' => 'required|array',
        ]);
        // Each engine performs explicit nested validation; this avoids Laravel dropping unlisted detail keys.
        $data['details'] = $request->input('details', []);
        $item = $service->addItem($order, $data, $request->user()->id);

        return response()->json(['success' => true, 'message' => 'Service added to order.', 'data' => $item], 201);
    }

    public function removeItem(Request $request, SalesOrder $order, SalesOrderItem $item, SalesOrderService $service): JsonResponse
    {
        $service->removeItem($order, $item, $request->user()->id);

        return response()->json(['success' => true, 'message' => 'Service removed from order.']);
    }

    public function quote(Request $request, SalesOrder $order, SalesOrderService $service): JsonResponse
    {
        return response()->json(['success' => true, 'message' => 'Order marked as quoted.', 'data' => $service->markQuoted($order, $request->user()->id)]);
    }

    public function confirm(Request $request, SalesOrder $order, SalesOrderService $service): JsonResponse
    {
        $data = $request->validate([
            'payment_method' => ['required', Rule::in(['Cash', 'GCash', 'Card'])],
            'payment_type' => ['required', Rule::in(['full', 'downpayment'])],
            'amount_received' => 'required|numeric|min:0', 'due_date' => 'nullable|date',
        ]);

        return response()->json(['success' => true, 'message' => 'Order confirmed and invoiced.', 'data' => $service->confirm($order, $data, $request->user()->id)]);
    }

    public function requestAdjustment(Request $request, SalesOrder $order, SalesLifecycleService $service): JsonResponse
    {
        $data = $request->validate([
            'type' => ['required', Rule::in(['cancellation', 'amendment', 'rebooking'])], 'reason' => 'required|string|max:3000', 'change_set' => 'nullable|array',
        ]);
        $adjustment = $service->request($order, $data['type'], $data['reason'], $request->input('change_set', []), $request->user()->id);

        return response()->json(['success' => true, 'message' => 'Lifecycle request submitted for approval.', 'data' => $adjustment], 201);
    }

    public function requestInvoiceCancellation(
        Request $request,
        Invoice $invoice,
        SalesLifecycleService $lifecycleService,
        SalesOrderService $orderService
    ): JsonResponse {
        $data = $request->validate(['reason' => 'required|string|max:3000']);
        $order = $invoice->salesOrder ?? $orderService->captureInvoice($invoice, $request->user()->id);
        $adjustment = $lifecycleService->request(
            $order,
            'cancellation',
            $data['reason'],
            [],
            $request->user()->id
        );

        return response()->json([
            'success' => true,
            'message' => 'Cancellation submitted for approval. Any refundable payment requires a posted credit note.',
            'data' => $adjustment,
        ], 201);
    }

    public function approveAdjustment(Request $request, SalesOrderAdjustment $adjustment, SalesLifecycleService $service): JsonResponse
    {
        return response()->json(['success' => true, 'message' => 'Lifecycle request approved.', 'data' => $service->approve($adjustment, $request->user()->id)]);
    }

    public function rejectAdjustment(Request $request, SalesOrderAdjustment $adjustment, SalesLifecycleService $service): JsonResponse
    {
        return response()->json(['success' => true, 'message' => 'Lifecycle request rejected.', 'data' => $service->reject($adjustment, $request->user()->id)]);
    }

    public function requestRefund(Request $request, CreditNote $creditNote, SalesLifecycleService $service): JsonResponse
    {
        $data = $request->validate(['amount' => 'required|numeric|min:0.01', 'refund_method' => 'required|string|max:80', 'reason' => 'required|string|max:3000']);

        return response()->json(['success' => true, 'message' => 'Refund submitted for approval.', 'data' => $service->requestRefund($creditNote, (float) $data['amount'], $data['refund_method'], $data['reason'], $request->user()->id)], 201);
    }

    public function approveRefund(Request $request, SalesRefund $refund, SalesLifecycleService $service): JsonResponse
    {
        return response()->json(['success' => true, 'message' => 'Refund approved.', 'data' => $service->approveRefund($refund, $request->user()->id)]);
    }

    public function processRefund(Request $request, SalesRefund $refund, SalesLifecycleService $service): JsonResponse
    {
        $data = $request->validate(['destination_reference' => 'nullable|string|max:255']);
        $processed = $service->processRefund($refund, $data['destination_reference'] ?? null, $request->user()->id);
        $message = $processed->status === 'processed'
            ? 'Refund processed and posted to the ledger.'
            : 'Refund submitted to PayMongo and is awaiting provider confirmation.';

        return response()->json(['success' => true, 'message' => $message, 'data' => $processed]);
    }
}
