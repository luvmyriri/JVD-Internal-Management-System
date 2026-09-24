<?php

namespace App\Http\Controllers\Accounting;

use App\Http\Controllers\Controller;
use App\Http\Requests\Accounting\StoreInvoiceRequest;
use App\Http\Requests\Accounting\StoreServiceRequest;
use App\Http\Requests\Accounting\UpdateInvoiceStatusRequest;
use App\Http\Requests\Accounting\UpdateServiceRequest;
use App\Models\Invoice;
use App\Services\BillingService;
use App\Services\InvoiceDocumentDispatchService;
use Illuminate\Http\Request;

class BillingController extends Controller
{
    private BillingService $service;

    public function __construct(BillingService $service)
    {
        $this->service = $service;
    }

    public function index(Request $request)
    {
        return $this->service->index($request);
    }

    public function getServices()
    {
        return $this->service->getServices();
    }

    public function getServiceOccupancy(Request $request, $id)
    {
        return $this->service->getServiceOccupancy($request, $id);
    }

    public function storeService(StoreServiceRequest $request)
    {
        return $this->service->storeService($request);
    }

    public function updateService(UpdateServiceRequest $request, $id)
    {
        return $this->service->updateService($request, $id);
    }

    public function uploadServiceImage(Request $request)
    {
        return $this->service->uploadServiceImage($request);
    }

    public function deleteService($id)
    {
        return $this->service->deleteService($id);
    }

    public function store(StoreInvoiceRequest $request)
    {
        return $this->service->store($request);
    }

    public function show($id)
    {
        return $this->service->show($id);
    }

    public function updateStatus(UpdateInvoiceStatusRequest $request, $id)
    {
        return $this->service->updateStatus($request, $id);
    }

    public function handleWebhook(Request $request)
    {
        return $this->service->handleWebhook($request);
    }

    public function sendEmail(Request $request, $id)
    {
        $validated = $request->validate([
            'email' => ['nullable', 'email:rfc', 'max:255'],
        ]);
        $invoice = Invoice::with(Invoice::operationalDocumentRelations())->findOrFail($id);
        $recipient = $validated['email'] ?? $invoice->notificationEmail();

        if (empty($recipient)) {
            return response()->json(['message' => 'Customer email address is required.'], 422);
        }

        try {
            $queued = app(InvoiceDocumentDispatchService::class)->queue($invoice, recipient: $recipient);
        } catch (\InvalidArgumentException $exception) {
            return response()->json(['message' => $exception->getMessage()], 409);
        }

        return response()->json([
            'success' => true,
            'message' => $queued
                ? "Invoice #{$invoice->invoice_number} and customer documents were accepted for delivery to {$recipient}."
                : "Invoice #{$invoice->invoice_number} is already being delivered to {$recipient}.",
        ], 202);
    }
}
