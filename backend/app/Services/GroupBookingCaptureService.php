<?php

namespace App\Services;

use App\Models\Invoice;

class GroupBookingCaptureService
{
    public function capture(Invoice $invoice, array $line, array $context, int $actorId): void
    {
        $metadata = $line['item_metadata'] ?? [];
        $stops = $metadata['stops'] ?? [];
        if (is_string($stops)) {
            $stops = array_values(array_filter(array_map('trim', preg_split('/\r\n|\r|\n|,/', $stops) ?: [])));
        }

        if (($line['service_type'] ?? null) === 'bus_rental') {
            $assignments = $metadata['bus_assignments'] ?? [];
            $primary = $assignments[0] ?? [
                'bus_id' => $context['bus_id'] ?? null,
                'driver_id' => $context['driver_id'] ?? null,
            ];
            app(CharterBookingService::class)->createFromInvoice($invoice, [
                'rate_plan_id' => $metadata['rate_plan_id'],
                'bus_id' => $primary['bus_id'],
                'driver_id' => $primary['driver_id'] ?? null,
                'assignments' => $assignments ?: [$primary],
                'starts_at' => $metadata['starts_at'] ?? $context['departure_datetime'],
                'ends_at' => $metadata['ends_at'] ?? $context['arrival_datetime'],
                'pickup_location' => $metadata['pickup_location'] ?? $context['pickup_location'],
                'destination' => $metadata['destination'] ?? $context['tour_code'],
                'stops' => $stops,
                'passenger_count' => $metadata['passenger_count'] ?? $context['pax_count'],
                'estimated_kilometers' => $metadata['estimated_kilometers'] ?? 0,
                'requested_units' => $metadata['requested_units'] ?? $metadata['buses_required'] ?? count($assignments),
                'booking_mode' => $metadata['booking_mode'] ?? 'entire_vehicle',
                'selected_seats' => $metadata['selected_seats'] ?? [],
                'passengers' => $metadata['passengers'] ?? [],
                'operations_notes' => $metadata['operations_notes'] ?? null,
            ], $actorId);

            return;
        }

        app(EducationalTourBookingService::class)->createFromInvoice($invoice, [
            'program_id' => $metadata['program_id'],
            'school_name' => $metadata['school_name'] ?? $context['customer_name'],
            'contact_person' => $metadata['contact_person'] ?? $context['customer_name'],
            'contact_email' => $metadata['contact_email'] ?? ($context['customer_email'] ?? null),
            'contact_number' => $metadata['contact_number'] ?? ($context['customer_contact'] ?? null),
            'grade_level' => $metadata['grade_level'] ?? 'General',
            'starts_at' => $metadata['starts_at'] ?? $context['departure_datetime'],
            'ends_at' => $metadata['ends_at'] ?? $context['arrival_datetime'],
            'pickup_location' => $metadata['pickup_location'] ?? $context['pickup_location'],
            'stops' => $stops,
            'student_count' => $metadata['student_count'],
            'tour_guide_count' => $metadata['tour_guide_count'] ?? $metadata['chaperone_count'] ?? 0,
            'assignments' => $metadata['assignments'] ?? [],
            'booking_mode' => $metadata['booking_mode'] ?? 'entire_vehicle',
            'selected_seats' => $metadata['selected_seats'] ?? [],
            'passengers' => $metadata['passengers'] ?? [],
            'operations_notes' => $metadata['operations_notes'] ?? null,
        ], $actorId);
    }
}
