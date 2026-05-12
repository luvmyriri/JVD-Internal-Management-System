<?php

namespace App\Http\Controllers\Accounting;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Service;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class BillingController extends Controller
{
    /**
     * Display a listing of invoices.
     */
    public function index()
    {
        $invoices = Invoice::with(['customer', 'creator', 'items.service'])
            ->orderBy('created_at', 'desc')
            ->paginate(15);

        return response()->json([
            'success' => true,
            'data' => $invoices
        ]);
    }

    /**
     * Get active services for POS.
     */
    public function getServices()
    {
        $services = Service::where('is_active', true)->get();

        return response()->json([
            'success' => true,
            'data' => $services
        ]);
    }

    /**
     * Store a newly created invoice in storage.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'customer_id' => 'nullable|exists:customers,id',
            'customer_name' => 'nullable|string|max:255',
            'payment_method' => 'required|string',
            'items' => 'required|array|min:1',
            'items.*.service_id' => 'required|exists:services,id',
            'items.*.quantity' => 'required|integer|min:1',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            $subtotal = 0;
            $taxRate = 0.12; // 12% VAT

            // Calculate totals and validate items
            $processedItems = [];
            foreach ($request->items as $item) {
                $service = Service::find($item['service_id']);
                $itemTotal = $service->price * $item['quantity'];
                $subtotal += $itemTotal;

                $processedItems[] = [
                    'service_id' => $service->id,
                    'quantity' => $item['quantity'],
                    'unit_price' => $service->price,
                    'total_price' => $itemTotal,
                ];
            }

            $taxAmount = $subtotal * $taxRate;
            $totalAmount = $subtotal + $taxAmount;

            // Create Invoice
            $invoice = Invoice::create([
                'invoice_number' => 'INV-' . strtoupper(Str::random(8)),
                'customer_id' => $request->customer_id,
                'customer_name' => $request->customer_name,
                'subtotal' => $subtotal,
                'tax_amount' => $taxAmount,
                'total_amount' => $totalAmount,
                'payment_method' => $request->payment_method,
                'status' => $request->payment_method === 'Cash' ? 'paid' : 'pending_payment',
                'created_by' => auth()->id() ?? 1,
                'notes' => $request->notes,
            ]);

            // Create Invoice Items
            foreach ($request->items as $item) {
                $service = Service::find($item['service_id']);
                InvoiceItem::create([
                    'invoice_id' => $invoice->id,
                    'service_id' => $service->id,
                    'quantity' => $item['quantity'],
                    'unit_price' => $service->price,
                    'total_price' => $service->price * $item['quantity'],
                ]);
            }

            // PayMongo Logic "Abang"
            if (in_array($request->payment_method, ['GCash', 'Card'])) {
                $paymongo = new \App\Services\PayMongoService();
                $payData = [
                    'line_items' => array_map(function($item) {
                        $service = Service::find($item['service_id']);
                        return [
                            'amount' => (int)($service->price * 100), // Convert to centavos
                            'currency' => 'PHP',
                            'name' => $service->name,
                            'quantity' => $item['quantity'],
                        ];
                    }, $request->items),
                    'description' => "JVD Order #{$invoice->invoice_number}",
                    'payment_method_types' => $request->payment_method === 'GCash' ? ['gcash'] : ['card']
                ];

                $session = $paymongo->createCheckoutSession($payData);
                if ($session['success']) {
                    $invoice->update([
                        'payment_url' => $session['checkout_url'],
                        'payment_id' => $session['id']
                    ]);
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Invoice created successfully',
                'data' => $invoice->load('items.service')
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'An error occurred during transaction processing.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified invoice.
     */
    public function show($id)
    {
        $invoice = Invoice::with(['customer', 'creator', 'items.service'])->find($id);

        if (!$invoice) {
            return response()->json([
                'success' => false,
                'message' => 'Invoice not found.'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $invoice
        ]);
    }
}
