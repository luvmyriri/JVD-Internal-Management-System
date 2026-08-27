<?php

namespace App\Http\Controllers\Accounting;

use App\Http\Controllers\Controller;
use App\Http\Requests\Accounting\StoreInvoiceRequest;
use App\Http\Requests\Accounting\StoreServiceRequest;
use App\Http\Requests\Accounting\UpdateInvoiceStatusRequest;
use App\Http\Requests\Accounting\UpdateServiceRequest;
use App\Models\Invoice;
use App\Services\BillingService;
use App\Services\InvoiceDocumentMailService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

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

    public function sendEmail(Request $request, $id, InvoiceDocumentMailService $mail)
    {
        $validated = $request->validate([
            'email' => ['nullable', 'email:rfc', 'max:255'],
        ]);
        $invoice = Invoice::with(Invoice::operationalDocumentRelations())->findOrFail($id);
        $recipient = $validated['email'] ?? $invoice->notificationEmail();

        if (empty($recipient)) {
            return response()->json(['message' => 'Customer email address is required.'], 422);
        }

        if ($invoice->customer_email !== $recipient) {
            $invoice->forceFill(['customer_email' => $recipient])->save();
        }

        try {
            $mail->send($invoice, $recipient);
        } catch (\Throwable $exception) {
            Log::error('Invoice email delivery failed.', [
                'invoice_id' => $invoice->id,
                'recipient' => $recipient,
                'exception' => $exception,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'The invoice could not be delivered. Please check the mail configuration and try again.',
            ], 502);
        }

        return response()->json([
            'success' => true,
            'message' => "Invoice #{$invoice->invoice_number} and customer documents were accepted for delivery to {$recipient}.",
        ]);
    }
}
