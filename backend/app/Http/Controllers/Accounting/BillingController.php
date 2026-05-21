<?php

namespace App\Http\Controllers\Accounting;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Service;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

use App\Http\Resources\InvoiceResource;

class BillingController extends Controller
{
    /**
     * Display a listing of invoices.
     */
    public function index(Request $request)
    {
        $query = Invoice::with(['customer', 'creator', 'items.service']);

        // Search
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('invoice_number', 'like', "%$search%")
                  ->orWhere('customer_name', 'like', "%$search%");
            });
        }

        // Filter by Status
        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        $invoices = $query->orderBy('created_at', 'desc')
            ->paginate($request->per_page ?? 15);

        // Calculate Stats for Dashboard
        $stats = [
            'total_revenue' => Invoice::where('status', 'paid')->sum('total_amount'),
            'pending_amount' => Invoice::where('status', 'pending_payment')->sum('total_amount'),
            'invoice_count' => Invoice::count(),
        ];

        return response()->json([
            'success' => true,
            'data' => InvoiceResource::collection($invoices)->resolve(),
            'meta' => [
                'current_page' => $invoices->currentPage(),
                'last_page'    => $invoices->lastPage(),
                'per_page'     => $invoices->perPage(),
                'total'        => $invoices->total(),
                'from'         => $invoices->firstItem(),
                'to'           => $invoices->lastItem(),
            ],
            'stats' => $stats
        ]);
    }

    public function getServices()
    {
        $services = Service::with('creator:id,first_name,last_name,email')
            ->where('is_active', true)
            ->get();

        return response()->json([
            'success' => true,
            'data' => $services
        ]);
    }

    public function storeService(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'category' => 'required|string',
            'price' => 'required|numeric|min:0',
            'description' => 'nullable|string',
            'images' => 'nullable|array',
            'images.*' => 'nullable|string', // Base64 strings
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $imageUrls = [];
        if ($request->has('images')) {
            foreach ($request->images as $base64Image) {
                if (preg_match('/^data:image\/(\w+);base64,/', $base64Image, $type)) {
                    $image = substr($base64Image, strpos($base64Image, ',') + 1);
                    $type = strtolower($type[1]); // jpg, png, gif

                    if (!in_array($type, ['jpg', 'jpeg', 'gif', 'png'])) {
                        continue;
                    }

                    $image = str_replace(' ', '+', $image);
                    $imageName = 'services/' . Str::random(10) . '.' . $type;
                    Storage::disk('public')->put($imageName, base64_decode($image));
                    $imageUrls[] = $imageName;
                }
            }
        }

        $service = Service::create([
            'name' => $request->name,
            'category' => $request->category,
            'price' => $request->price,
            'description' => $request->description,
            'images' => $imageUrls,
            'is_active' => true,
            'created_by' => auth()->id(),
        ]);
        $service->load('creator:id,first_name,last_name,email');

        return response()->json([
            'success' => true,
            'message' => 'Service created successfully',
            'data' => $service
        ], 201);
    }

    /**
     * Update an existing service.
     */
    public function updateService(Request $request, $id)
    {
        $service = Service::findOrFail($id);
        
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'category' => 'required|string',
            'price' => 'required|numeric|min:0',
            'description' => 'nullable|string',
            'images' => 'nullable|array',
            'is_active' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $imageUrls = $service->images ?? [];
        if ($request->has('images')) {
            // This logic assumes we send the full array of images we want to keep
            // New images are base64, existing ones are strings (paths)
            $newImageUrls = [];
            foreach ($request->images as $img) {
                if (preg_match('/^data:image\/(\w+);base64,/', $img, $type)) {
                    $image = substr($img, strpos($img, ',') + 1);
                    $type = strtolower($type[1]);
                    $image = str_replace(' ', '+', $image);
                    $imageName = 'services/' . Str::random(10) . '.' . $type;
                    Storage::disk('public')->put($imageName, base64_decode($image));
                    $newImageUrls[] = $imageName;
                } else {
                    // Keep existing path if it's already a URL/path
                    $newImageUrls[] = $img;
                }
            }
            $imageUrls = $newImageUrls;
        }

        $service->update([
            'name' => $request->name,
            'category' => $request->category,
            'price' => $request->price,
            'description' => $request->description,
            'images' => $imageUrls,
            'is_active' => $request->is_active ?? $service->is_active
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Service updated successfully',
            'data' => $service
        ]);
    }

    /**
     * Delete a service.
     */
    public function deleteService($id)
    {
        $service = Service::findOrFail($id);
        
        // Delete associated images
        if ($service->images) {
            foreach ($service->images as $path) {
                Storage::disk('public')->delete($path);
            }
        }
        
        $service->delete();

        return response()->json([
            'success' => true,
            'message' => 'Service deleted successfully'
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
            'customer_address' => 'nullable|string|max:255',
            'customer_email' => 'nullable|string|email|max:255',
            'customer_contact' => ['nullable', 'string', 'regex:/^(09|\+639|639)\d{9}$/'],
            'payment_method' => 'required|string',
            'items' => 'required|array|min:1',
            'items.*.service_id' => 'required|exists:services,id',
            'items.*.quantity' => 'required|integer|min:1',
            'notes' => 'nullable|string',
        ], [
            'customer_contact.regex' => 'The contact number must be a valid Philippine mobile number.',
            'customer_email.email' => 'The email address must be a valid email format.',
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
                'customer_address' => $request->customer_address,
                'customer_email' => $request->customer_email,
                'customer_contact' => $request->customer_contact,
                'subtotal' => $subtotal,
                'tax_amount' => $taxAmount,
                'total_amount' => $totalAmount,
                'amount_received' => $request->amount_received,
                'change' => $request->change,
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
                'data' => (new InvoiceResource($invoice->load('items.service')))->resolve()
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
            'data' => (new InvoiceResource($invoice))->resolve()
        ]);
    }

    /**
     * Update invoice status (e.g., mark as paid).
     */
    public function updateStatus(Request $request, $id)
    {
        $invoice = Invoice::findOrFail($id);
        $invoice->update([
            'status' => $request->status,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Invoice status updated successfully',
            'data' => $invoice
        ]);
    }
}
