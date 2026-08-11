<?php

namespace App\Http\Controllers\Accounting;

use App\Http\Controllers\Controller;
use App\Services\BillingService;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Service;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use App\Notifications\SystemAlert;
use Illuminate\Support\Facades\Mail;
use App\Mail\TransactionNotificationMail;
use App\Http\Resources\InvoiceResource;
use App\Exceptions\MaxPaxExceededException;
use App\Services\InvoiceFinalizationService;

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

    public function storeService(\App\Http\Requests\Accounting\StoreServiceRequest $request)
    {
        return $this->service->storeService($request);
    }

    public function updateService(\App\Http\Requests\Accounting\UpdateServiceRequest $request, $id)
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

    public function store(\App\Http\Requests\Accounting\StoreInvoiceRequest $request)
    {
        return $this->service->store($request);
    }

    public function show($id)
    {
        return $this->service->show($id);
    }

    public function updateStatus(\App\Http\Requests\Accounting\UpdateInvoiceStatusRequest $request, $id)
    {
        return $this->service->updateStatus($request, $id);
    }

    public function handleWebhook(Request $request)
    {
        return $this->service->handleWebhook($request);
    }

    public function sendEmail(Request $request, $id)
    {
        $invoice = Invoice::with(['items.service', 'payments'])->findOrFail($id);
        $recipient = $request->input('email', $invoice->notificationEmail());

        if (empty($recipient)) {
            return response()->json(['message' => 'Customer email address is required.'], 422);
        }

        Mail::to($recipient)->queue(new TransactionNotificationMail($invoice));

        return response()->json([
            'success' => true,
            'message' => "Invoice #{$invoice->invoice_number} sent to {$recipient} successfully."
        ]);
    }
}
