<?php

namespace App\Http\Controllers\Sales;

use App\Http\Controllers\Controller;
use App\Http\Requests\Sales\BulkRegisterParticipantsRequest;
use App\Http\Requests\Sales\RecordEducationalPaymentRequest;
use App\Http\Requests\Sales\RegisterParticipantRequest;
use App\Http\Requests\Sales\StoreEducationalPackageRequest;
use App\Http\Requests\Sales\UpdateEducationalPackageRequest;
use App\Jobs\SendInvoiceDocumentsJob;
use App\Models\EducationalTourBusAssignment;
use App\Models\EducationalTourPackage;
use App\Models\EducationalTourParticipantBooking;
use App\Services\DocumentPdfService;
use App\Services\EducationalTourBusAllocator;
use App\Services\EducationalTourPackageService;
use App\Services\EducationalTourPaymentService;
use App\Services\EducationalTourRegistrationService;
use App\Services\ExcelExportService;
use App\Services\ExcelImportService;
use App\Services\InvoiceDocumentCacheService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class EducationalTourPackageController extends Controller
{
    public function __construct(
        private readonly EducationalTourPackageService $packageService,
        private readonly EducationalTourPaymentService $paymentService,
        private readonly EducationalTourBusAllocator $busAllocator,
        private readonly EducationalTourRegistrationService $registrationService
    ) {}

    public function index(Request $request)
    {
        $query = EducationalTourPackage::with(['program', 'schoolCustomer', 'busAssignments.bus', 'busAssignments.driver'])
            ->orderByDesc('starts_at');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $s = trim($request->search);
            $query->where(function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")
                    ->orWhere('tour_code', 'like', "%{$s}%")
                    ->orWhere('school_name', 'like', "%{$s}%");
            });
        }

        $packages = $query->limit(100)->get()->map(function (EducationalTourPackage $pkg) {
            return $this->packageService->getDashboardMetrics($pkg);
        });

        return response()->json(['data' => $packages]);
    }

    public function store(StoreEducationalPackageRequest $request)
    {
        $result = $this->packageService->createPackage($request->validated(), $request->user()->id);

        return response()->json([
            'message' => 'Educational tour package created successfully.',
            'data' => $this->packageService->getDashboardMetrics($result['package']),
        ], 201);
    }

    public function show(EducationalTourPackage $package)
    {
        return response()->json([
            'data' => $this->packageService->getDashboardMetrics($package),
        ]);
    }

    public function update(UpdateEducationalPackageRequest $request, EducationalTourPackage $package)
    {
        $updated = $this->packageService->updatePackage($package, $request->validated());

        return response()->json([
            'message' => 'Educational tour package updated successfully.',
            'data' => $this->packageService->getDashboardMetrics($updated),
        ]);
    }

    public function publish(EducationalTourPackage $package)
    {
        $result = $this->packageService->publishPackage($package);

        return response()->json([
            'message' => 'Educational tour package published successfully.',
            'data' => $this->packageService->getDashboardMetrics($result['package']),
        ]);
    }

    public function storeParticipantBooking(RegisterParticipantRequest $request, EducationalTourPackage $package)
    {
        $result = $this->registrationService->registerParticipantForPackage(
            $package,
            $request->validated(),
            $request->user()->id
        );

        return response()->json([
            'message' => $result['duplicate']
                ? 'Participant already has an active booking for this package.'
                : 'Participant booking and individual invoice created successfully.',
            'data' => $result,
        ], $result['duplicate'] ? 200 : 201);
    }

    public function bulkStoreParticipantBookings(BulkRegisterParticipantsRequest $request, EducationalTourPackage $package)
    {
        $validated = $request->validated();
        $result = $this->registrationService->bulkRegisterParticipants(
            $package,
            $validated['participants'],
            $request->user()->id
        );

        return response()->json([
            'message' => "Bulk registration complete: {$result['created']} registered, {$result['duplicates']} duplicate(s) skipped, {$result['failed']} failed.",
            'data' => $result,
        ], 200);
    }

    public function assignBus(Request $request, EducationalTourPackage $package)
    {
        $data = $request->validate([
            'bus_id' => ['required', 'exists:buses,id'],
            'driver_id' => ['nullable', 'exists:users,id'],
            'sequence_number' => ['nullable', 'integer', 'min:1'],
        ]);

        $assignment = $this->packageService->assignBus($package, $data, $request->user()->id);

        return response()->json([
            'message' => 'Vehicle assigned to package.',
            'data' => [
                'id' => $assignment->id,
                'bus_number' => $assignment->sequence_number,
                'bus' => [
                    'id' => $assignment->bus->id,
                    'plate_number' => $assignment->bus->plate_number,
                    'model' => $assignment->bus->model,
                ],
                'driver' => $assignment->driver ? [
                    'id' => $assignment->driver->id,
                    'name' => "{$assignment->driver->first_name} {$assignment->driver->last_name}",
                ] : null,
                'capacity' => $assignment->capacity_snapshot,
                'occupied' => 0,
                'available' => $assignment->capacity_snapshot,
                'status' => $assignment->status,
            ],
        ], 201);
    }

    public function updateBusAssignment(Request $request, EducationalTourPackage $package, EducationalTourBusAssignment $assignment)
    {
        $data = $request->validate([
            'bus_id' => ['sometimes', 'required', 'exists:buses,id'],
            'driver_id' => ['nullable', 'exists:users,id'],
            'sequence_number' => ['nullable', 'integer', 'min:1'],
        ]);

        $updated = $this->packageService->updateBusAssignment($package, $assignment, $data, $request->user()->id);

        $occupied = EducationalTourParticipantBooking::where('bus_assignment_id', $updated->id)
            ->whereNotIn('status', ['cancelled', 'expired'])
            ->count();

        return response()->json([
            'message' => 'Vehicle assignment updated successfully.',
            'data' => [
                'id' => $updated->id,
                'sequence_number' => $updated->sequence_number,
                'bus_id' => $updated->bus_id,
                'bus_plate' => $updated->bus?->plate_number,
                'bus_model' => $updated->bus?->model,
                'driver_id' => $updated->driver_id,
                'driver_name' => $updated->driver ? "{$updated->driver->first_name} {$updated->driver->last_name}" : null,
                'capacity' => $updated->capacity_snapshot,
                'occupied' => $occupied,
                'available' => max(0, $updated->capacity_snapshot - $occupied),
                'status' => $updated->status,
            ],
        ]);
    }

    public function removeBus(EducationalTourPackage $package, EducationalTourBusAssignment $assignment)
    {
        if ($assignment->package_id !== $package->id) {
            throw ValidationException::withMessages(['assignment' => 'Bus assignment does not belong to this package.']);
        }

        $this->packageService->removeBusAssignment($assignment);

        return response()->json([
            'message' => 'Vehicle removed from package fleet allocation.',
        ]);
    }

    public function allocateBuses(Request $request, EducationalTourPackage $package)
    {
        $result = $this->busAllocator->allocatePackage($package, $request->all());

        return response()->json([
            'message' => 'Bus allocation computed.',
            'data' => $result,
        ]);
    }

    public function moveSeat(Request $request, EducationalTourParticipantBooking $booking)
    {
        $data = $request->validate([
            'bus_assignment_id' => ['required', 'exists:educational_tour_bus_assignments,id'],
            'seat_number' => ['required', 'string', 'max:30'],
        ]);

        $this->busAllocator->moveParticipant($booking, (int) $data['bus_assignment_id'], $data['seat_number']);

        return response()->json([
            'message' => 'Participant seat moved successfully.',
            'data' => $booking->fresh(['busAssignment.bus']),
        ]);
    }

    public function participantBookings(Request $request)
    {
        $query = EducationalTourParticipantBooking::with(['package', 'invoice', 'busAssignment.bus', 'busAssignment.driver', 'payments'])
            ->orderByDesc('booked_at');

        if ($request->filled('package_id')) {
            $query->where('package_id', $request->package_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $s = trim($request->search);
            $query->where(function ($q) use ($s) {
                $q->where('reference', 'like', "%{$s}%")
                    ->orWhere('participant_first_name', 'like', "%{$s}%")
                    ->orWhere('participant_last_name', 'like', "%{$s}%")
                    ->orWhere('student_number', 'like', "%{$s}%");
            });
        }

        return response()->json([
            'data' => $query->limit(200)->get(),
        ]);
    }

    public function showParticipantBooking(EducationalTourParticipantBooking $booking)
    {
        $booking->load(['package', 'invoice.items', 'busAssignment.bus', 'busAssignment.driver', 'payments.receiver']);

        return response()->json(['data' => $booking]);
    }

    public function participantInvoice(EducationalTourParticipantBooking $booking, InvoiceDocumentCacheService $documents)
    {
        @set_time_limit(120);

        $invoice = $booking->invoice;
        abort_unless($invoice, 404, 'This participant booking has no linked invoice.');
        $contents = $documents->contents($invoice, InvoiceDocumentCacheService::INVOICE);

        return response($contents, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$documents->fileName($invoice, InvoiceDocumentCacheService::INVOICE).'"',
        ]);
    }

    public function participantStatement(EducationalTourParticipantBooking $booking, InvoiceDocumentCacheService $documents)
    {
        @set_time_limit(120);

        $invoice = $booking->invoice;
        abort_unless($invoice, 404, 'This participant booking has no linked invoice.');
        $contents = $documents->contents($invoice, InvoiceDocumentCacheService::STATEMENT);

        return response($contents, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="SOA_'.$invoice->invoice_number.'.pdf"',
        ]);
    }

    public function sendParticipantDocuments(Request $request, EducationalTourParticipantBooking $booking)
    {
        $validated = $request->validate([
            'email' => ['nullable', 'email:rfc', 'max:255'],
        ]);
        $invoice = $booking->invoice;
        abort_unless($invoice, 404, 'This participant booking has no linked invoice.');

        $recipient = $validated['email']
            ?? $booking->guardian_email
            ?? $booking->participant_email
            ?? $invoice->notificationEmail();

        if (! $recipient) {
            return response()->json([
                'message' => 'Enter a guardian or participant email before sending the invoice documents.',
            ], 422);
        }

        if ($invoice->customer_email !== $recipient) {
            $invoice->forceFill(['customer_email' => $recipient])->save();
        }

        $booking->forceFill([
            'document_delivery_status' => 'queued',
            'document_delivery_recipient' => $recipient,
            'document_delivery_queued_at' => now(),
            'document_delivery_sent_at' => null,
            'document_delivery_failed_at' => null,
            'document_delivery_error' => null,
        ])->save();

        // PDF rendering and SMTP delivery can take longer than a browser request,
        // especially when the mail server is temporarily unavailable. Queue the
        // same retryable job used by the rest of the billing flow so the button
        // can return immediately and delivery is retried safely in the worker.
        SendInvoiceDocumentsJob::dispatch($invoice->id, recipient: $recipient)->afterResponse();

        return response()->json([
            'message' => "Invoice {$invoice->invoice_number} and customer documents were queued for delivery to {$recipient}.",
            'data' => [
                'invoice_id' => $invoice->id,
                'invoice_number' => $invoice->invoice_number,
                'recipient' => $recipient,
                'delivery_status' => 'queued',
            ],
        ], 202);
    }

    public function recordPayment(RecordEducationalPaymentRequest $request, EducationalTourParticipantBooking $booking)
    {
        $result = $this->paymentService->recordPayment($booking, $request->validated(), $request->user()->id);

        if (! $result['duplicate'] && $result['booking']->invoice?->notificationEmail()) {
            SendInvoiceDocumentsJob::dispatch($result['booking']->invoice->id)->afterResponse();
        }

        return response()->json([
            'message' => $result['duplicate'] ? 'Payment already posted.' : 'Payment recorded successfully.',
            'data' => $this->paymentService->formatPaymentResponse($result['payment'], $result['booking']),
        ], $result['duplicate'] ? 200 : 201);
    }

    public function cancelParticipantBooking(Request $request, EducationalTourParticipantBooking $booking)
    {
        $reason = $request->input('reason', 'Participant cancelled registration');

        $booking->update([
            'status' => 'cancelled',
            'cancelled_at' => now(),
            'cancellation_reason' => $reason,
        ]);
        $this->busAllocator->release($booking);

        return response()->json([
            'message' => 'Participant booking cancelled and seat released.',
            'data' => $booking->fresh(['invoice', 'package']),
        ]);
    }

    public function manifest(EducationalTourPackage $package, DocumentPdfService $documents)
    {
        $package->load([
            'program',
            'busAssignments.bus',
            'busAssignments.driver',
            'participantBookings' => function ($q) {
                $q->whereNotIn('status', ['cancelled', 'expired'])
                    ->with(['invoice', 'busAssignment.bus'])
                    ->orderBy('participant_last_name');
            },
        ]);

        return $documents->render('pdf.educational-tour-package-manifest', ['package' => $package])
            ->stream("Educational_Tour_Package_Manifest_{$package->tour_code}.pdf");
    }

    // Delete package
    public function destroy(EducationalTourPackage $package)
    {
        $this->packageService->deletePackage($package);

        return response()->json(['message' => 'Educational tour package deleted successfully.'], 200);
    }

    // Upload image for package
    public function uploadImage(Request $request, EducationalTourPackage $package)
    {
        $request->validate([
            'image' => ['required', 'image', 'mimes:jpeg,png,webp', 'max:5120'],
        ]);

        // Store on the public disk explicitly. The default `local` disk is private
        // in current Laravel versions and produces URLs that return 403.
        $path = $request->file('image')->store('educational-tour-images', 'public');
        if (! $path) {
            throw ValidationException::withMessages([
                'image' => ['The package image could not be stored. Please try again.'],
            ]);
        }
        $relativeUrl = '/storage/'.ltrim($path, '/');

        // Append to the images JSON array (used by the frontend card hero)
        $currentImages = is_array($package->images) ? $package->images : [];
        $currentImages[] = $relativeUrl;

        $package->images = $currentImages;
        $package->save();

        return response()->json([
            'message' => 'Image uploaded successfully.',
            'image_url' => $relativeUrl,   // relative path, Vite proxy handles it
            'images' => $currentImages,
        ], 201);
    }

    // Generate quotation PDF
    public function quotation(EducationalTourPackage $package, DocumentPdfService $documents)
    {
        $pdf = $documents->renderWithTemplate('quotation-template.pdf', ['package' => $package]);

        return $pdf->download('quotation_'.$package->id.'.pdf');
    }

    // Generate contract PDF
    public function contract(EducationalTourPackage $package, DocumentPdfService $documents)
    {
        $pdf = $documents->renderWithTemplate('contract-template.pdf', ['package' => $package]);

        return $pdf->download('contract_'.$package->id.'.pdf');
    }

    // Export Excel
    public function exportExcel()
    {
        $excel = (new ExcelExportService)->exportEducationalTours();

        return response()->streamDownload(function () use ($excel) {
            echo $excel;
        }, 'educational_tours.xlsx');
    }

    // Import Excel
    public function importExcel(Request $request)
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:xlsx'],
        ]);
        $importService = new ExcelImportService;
        $importService->importEducationalTours($request->file('file'));

        return response()->json(['message' => 'Excel imported successfully.'], 200);
    }

    // Add companion participant
    public function addCompanion(RegisterParticipantRequest $request, EducationalTourPackage $package)
    {
        $data = $request->validated();
        $data['type'] = 'companion';
        $result = $this->registrationService->registerParticipantForPackage($package, $data, $request->user()->id);

        return response()->json([
            'message' => $result['duplicate'] ? 'Companion already has an active booking.' : 'Companion added successfully.',
            'data' => $result,
        ], $result['duplicate'] ? 200 : 201);
    }
}
