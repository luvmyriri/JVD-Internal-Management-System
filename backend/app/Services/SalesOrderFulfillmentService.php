<?php

namespace App\Services;

use App\Models\AccommodationBooking;
use App\Models\ActivityBooking;
use App\Models\CustomArrangementItem;
use App\Models\FlightBooking;
use App\Models\PassportAssistanceBooking;
use App\Models\PrivateTourBooking;
use App\Models\SalesOrderItem;
use App\Models\ScheduledTicketBooking;
use App\Models\Service;
use App\Models\TransferBooking;
use App\Models\VisaAssistanceBooking;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class SalesOrderFulfillmentService
{
    /** @return array<string, mixed> */
    public function validate(string $type, array $details, ?int $catalogServiceId = null, array $lineSnapshot = []): array
    {
        $rules = match ($type) {
            'private_tour' => [
                'package_name'=>'required|string|max:160','destination'=>'required|string|max:160',
                'starts_at'=>'required|date','ends_at'=>'required|date|after:starts_at','passenger_count'=>'required|integer|min:1|max:500',
                'originating_catalog_service_id'=>'nullable|integer|exists:services,id',
                'adult_count'=>'nullable|integer|min:0|max:500','child_count'=>'nullable|integer|min:0|max:500',
                'adult_rate'=>'nullable|numeric|min:0','child_rate'=>'nullable|numeric|min:0',
                'traveler_types'=>'nullable|array','traveler_types.*.name'=>'required|string|max:160',
                'traveler_types.*.type'=>['required', Rule::in(['adult','child'])],
                'pickup_location'=>'nullable|string|max:255','bus_id'=>'nullable|integer|exists:buses,id','driver_id'=>'nullable|integer|exists:users,id',
                'itinerary'=>'required|array|min:1','itinerary.*.day'=>'required|integer|min:1','itinerary.*.title'=>'required|string|max:160',
                'itinerary.*.description'=>'nullable|string|max:2000','inclusions'=>'nullable|array','inclusions.*'=>'string|max:255',
                'exclusions'=>'nullable|array','exclusions.*'=>'string|max:255','special_requests'=>'nullable|string|max:3000',
            ],
            'visa_assistance' => [
                'customer_id'=>'nullable|integer|exists:customers,id','passport_case_id'=>'nullable|integer|exists:passport_cases,id',
                'applicant_name'=>'required|string|max:160','destination_country'=>'required|string|max:100','visa_type'=>'required|string|max:100',
                'travel_purpose'=>'nullable|string|max:255','intended_departure'=>'nullable|date','appointment_at'=>'nullable|date',
                'passport_number'=>'nullable|string|max:80','requirements_snapshot'=>'nullable|array',
                'requirements_snapshot.*.name'=>'required|string|max:255','requirements_snapshot.*.required'=>'nullable|boolean',
            ],
            'passport_assistance' => [
                'customer_id'=>'nullable|integer|exists:customers,id','passport_case_id'=>'nullable|integer|exists:passport_cases,id',
                'applicant_name'=>'required|string|max:160','application_type'=>['required', Rule::in(['new','renewal','lost','damaged','correction'])],
                'appointment_at'=>'nullable|date','site'=>'nullable|string|max:160','target_release_date'=>'nullable|date',
                'requirements_snapshot'=>'nullable|array','requirements_snapshot.*.name'=>'required|string|max:255',
                'requirements_snapshot.*.required'=>'nullable|boolean',
            ],
            'flight_booking' => [
                'supplier_id'=>'nullable|integer|exists:suppliers,id','trip_type'=>['required',Rule::in(['one_way','round_trip','multi_city'])],
                'origin'=>'required|string|max:10','destination'=>'required|string|max:10','departure_at'=>'required|date','return_at'=>'nullable|date|after:departure_at',
                'segments'=>'required_if:trip_type,multi_city|nullable|array|min:2',
                'segments.*.origin'=>'required|string|max:10','segments.*.destination'=>'required|string|max:10',
                'segments.*.departure_at'=>'required|date','segments.*.airline'=>'nullable|string|max:100',
                'segments.*.flight_number'=>'nullable|string|max:40',
                'airline'=>'nullable|string|max:100','flight_number'=>'nullable|string|max:40','pnr'=>'nullable|string|max:80','fare_class'=>'nullable|string|max:80',
                'baggage_allowance'=>'nullable|string|max:100','ticketing_deadline'=>'nullable|date','passenger_count'=>'required|integer|min:1|max:200',
                'passengers'=>'required|array|min:1','passengers.*.name'=>'required|string|max:160','passengers.*.type'=>'nullable|string|max:30',
                'fare_conditions'=>'nullable|array','supplier_cost'=>'nullable|numeric|min:0',
            ],
            'accommodation_booking' => [
                'supplier_id'=>'nullable|integer|exists:suppliers,id','property_name'=>'required|string|max:160','city'=>'required|string|max:120',
                'check_in'=>'required|date','check_out'=>'required|date|after:check_in','room_type'=>'required|string|max:120','room_count'=>'required|integer|min:1|max:100',
                'adult_count'=>'required|integer|min:1|max:500','child_count'=>'nullable|integer|min:0|max:500','confirmation_number'=>'nullable|string|max:100',
                'free_cancellation_until'=>'nullable|date','guest_names'=>'required|array|min:1','guest_names.*'=>'string|max:160','meal_plan'=>'nullable|array',
                'meal_plan.*'=>'string|max:100','supplier_cost'=>'nullable|numeric|min:0',
            ],
            'ticket_booking' => [
                'supplier_id'=>'nullable|integer|exists:suppliers,id','transport_mode'=>['required',Rule::in(['ferry','bus','rail'])],
                'operator_name'=>'required|string|max:160','origin'=>'required|string|max:160','destination'=>'required|string|max:160',
                'departure_at'=>'required|date','arrival_at'=>'nullable|date|after:departure_at','booking_reference'=>'nullable|string|max:100',
                'passenger_count'=>'required|integer|min:1|max:200','passengers'=>'required|array|min:1','passengers.*.name'=>'required|string|max:160',
                'seat_assignments'=>'nullable|array','seat_assignments.*.seat'=>'required|string|max:20','seat_assignments.*.name'=>'required|string|max:160',
                'supplier_cost'=>'nullable|numeric|min:0',
            ],
            'activity_booking' => [
                'supplier_id'=>'nullable|integer|exists:suppliers,id','activity_name'=>'required|string|max:160','location'=>'required|string|max:160',
                'session_starts_at'=>'required|date','session_ends_at'=>'nullable|date|after:session_starts_at','capacity'=>'required|integer|min:1|max:10000',
                'participant_count'=>'required|integer|min:1|max:10000','supplier_reference'=>'nullable|string|max:100','participants'=>'nullable|array',
                'participants.*.name'=>'required|string|max:160','requirements'=>'nullable|array','requirements.*'=>'string|max:255','supplier_cost'=>'nullable|numeric|min:0',
            ],
            'transfer_service' => [
                'pickup_at'=>'required|date','dropoff_at'=>'nullable|date|after:pickup_at','pickup_location'=>'required|string|max:255',
                'dropoff_location'=>'required|string|max:255','passenger_count'=>'required|integer|min:1|max:500','luggage_count'=>'nullable|integer|min:0|max:1000',
                'bus_id'=>'nullable|integer|exists:buses,id','driver_id'=>'nullable|integer|exists:users,id','flight_or_trip_reference'=>'nullable|string|max:100',
                'passenger_names'=>'nullable|array','passenger_names.*'=>'string|max:160','dispatch_notes'=>'nullable|string|max:3000',
            ],
            'custom_arrangement' => [
                'arrangement_name'=>'required|string|max:160','requirements'=>'required|string|max:5000','target_starts_at'=>'nullable|date',
                'target_ends_at'=>'nullable|date|after:target_starts_at','supplier_id'=>'nullable|integer|exists:suppliers,id',
                'supplier_reference'=>'nullable|string|max:100','deliverables'=>'required|array|min:1','deliverables.*'=>'string|max:500',
                'supplier_cost'=>'nullable|numeric|min:0',
            ],
            default => throw ValidationException::withMessages(['service_type' => 'Use the dedicated sales engine for this service type.']),
        };

        $validator = Validator::make($details, $rules);

        $validator->after(function ($validator) use ($type, $details) {
            if ($type === 'private_tour') {
                $adultCount = $details['adult_count'] ?? null;
                $childCount = $details['child_count'] ?? null;
                if (($adultCount !== null || $childCount !== null)
                    && (int) $adultCount + (int) $childCount !== (int) ($details['passenger_count'] ?? 0)) {
                    $validator->errors()->add('passenger_count', 'Adult and child counts must equal the private-tour passenger count.');
                }
                $travelerTypes = $details['traveler_types'] ?? [];
                if ($travelerTypes !== [] && count($travelerTypes) !== (int) ($details['passenger_count'] ?? 0)) {
                    $validator->errors()->add('traveler_types', 'The traveler pricing roster must match the private-tour passenger count.');
                }
            }

            if ($type === 'flight_booking') {
                $passengers = $details['passengers'] ?? [];
                if (isset($details['passenger_count']) && count($passengers) !== (int) $details['passenger_count']) {
                    $validator->errors()->add('passengers', 'The named passenger roster must match the flight passenger count.');
                }

                $segments = $details['segments'] ?? [];
                if (($details['trip_type'] ?? null) === 'multi_city' && is_array($segments)) {
                    foreach ($segments as $index => $segment) {
                        if ($index === 0) continue;
                        $previous = $segments[$index - 1];
                        if (isset($previous['destination'], $segment['origin'])
                            && strtoupper($previous['destination']) !== strtoupper($segment['origin'])) {
                            $validator->errors()->add("segments.{$index}.origin", 'Each multi-city segment must continue from the previous destination.');
                        }
                        if (isset($previous['departure_at'], $segment['departure_at'])
                            && strtotime($segment['departure_at']) <= strtotime($previous['departure_at'])) {
                            $validator->errors()->add("segments.{$index}.departure_at", 'Flight segments must be in chronological order.');
                        }
                    }
                }
            }

            if ($type === 'accommodation_booking') {
                $occupancy = (int) ($details['adult_count'] ?? 0) + (int) ($details['child_count'] ?? 0);
                if (isset($details['guest_names']) && count($details['guest_names']) !== $occupancy) {
                    $validator->errors()->add('guest_names', 'Record one guest name for every adult and child in the stay.');
                }
            }

            if ($type === 'ticket_booking') {
                $passengers = $details['passengers'] ?? [];
                if (isset($details['passenger_count']) && count($passengers) !== (int) $details['passenger_count']) {
                    $validator->errors()->add('passengers', 'The named passenger roster must match the ticket passenger count.');
                }
                $seats = collect($details['seat_assignments'] ?? [])->pluck('seat')->filter()->map(fn ($seat) => strtoupper(trim($seat)));
                if ($seats->duplicates()->isNotEmpty()) {
                    $validator->errors()->add('seat_assignments', 'A seat can only be assigned to one passenger in this booking.');
                }
            }

            if ($type === 'activity_booking') {
                if ((int) ($details['participant_count'] ?? 0) > (int) ($details['capacity'] ?? 0)) {
                    $validator->errors()->add('participant_count', 'Participant count cannot exceed the activity session capacity.');
                }
                $participants = $details['participants'] ?? [];
                if ($participants !== [] && count($participants) !== (int) ($details['participant_count'] ?? 0)) {
                    $validator->errors()->add('participants', 'The named participant list must match the participant count.');
                }
            }

            if ($type === 'transfer_service') {
                $names = $details['passenger_names'] ?? [];
                if ($names !== [] && count($names) !== (int) ($details['passenger_count'] ?? 0)) {
                    $validator->errors()->add('passenger_names', 'The named passenger list must match the transfer passenger count.');
                }
            }
        });

        $validated = $validator->validate();

        return $type === 'private_tour'
            && $this->isCatalogBackedPrivateTour($validated, $catalogServiceId)
            ? $this->validatePrivateTourPackage($validated, $catalogServiceId, $lineSnapshot)
            : $validated;
    }

    /** @param array<string, mixed> $details */
    private function isCatalogBackedPrivateTour(array $details, ?int $catalogServiceId): bool
    {
        return $catalogServiceId !== null || !empty($details['originating_catalog_service_id']);
    }

    /**
     * A fixed private package is a catalog-owned product, not a free-form payload.
     * Re-check its rules at the final server boundary so direct API calls cannot
     * bypass the package dates, duration, party or itinerary constraints.
     *
     * @param  array<string, mixed>  $details
     * @param  array<string, mixed>  $lineSnapshot
     * @return array<string, mixed>
     */
    private function validatePrivateTourPackage(array $details, ?int $catalogServiceId, array $lineSnapshot): array
    {
        $errors = [];
        $originatingId = isset($details['originating_catalog_service_id'])
            ? (int) $details['originating_catalog_service_id']
            : null;
        $service = $originatingId ? Service::find($originatingId) : null;

        if ($catalogServiceId !== null && $originatingId === null) {
            $errors['originating_catalog_service_id'][] = 'A catalog-backed private tour must identify its originating package.';
        }

        if ($catalogServiceId !== null && $originatingId !== null && $originatingId !== $catalogServiceId) {
            $errors['originating_catalog_service_id'][] = 'The originating package must match the catalog service on this invoice line.';
        }

        if (!$service
            || !$service->is_active
            || !$service->is_sales_catalog
            || $service->service_type !== 'private_tour') {
            $errors['originating_catalog_service_id'][] = 'Select an active private-tour package from the sales catalog.';
        }

        if ($service) {
            $config = is_array($service->package_config) ? $service->package_config : [];
            $destination = trim((string) ($config['destination'] ?? ''));
            $durationDays = filter_var($config['duration_days'] ?? null, FILTER_VALIDATE_INT);
            $minimumPax = filter_var($config['minimum_pax'] ?? null, FILTER_VALIDATE_INT);
            $maximumPax = filter_var($config['maximum_pax'] ?? null, FILTER_VALIDATE_INT);
            $defaultItinerary = $config['default_itinerary'] ?? null;

            if ($destination === ''
                || $durationDays === false || $durationDays < 1
                || $minimumPax === false || $minimumPax < 1
                || $maximumPax === false || $maximumPax < $minimumPax
                || !is_array($defaultItinerary) || count($defaultItinerary) !== $durationDays) {
                $errors['originating_catalog_service_id'][] = 'This private-tour package is incomplete and cannot be sold until its destination, duration, traveler limits, and daily itinerary are configured.';
            } else {
                if ($this->normalizedText($details['package_name']) !== $this->normalizedText($service->name)) {
                    $errors['package_name'][] = 'The package name must match the selected catalog package.';
                }
                if ($this->normalizedText($details['destination']) !== $this->normalizedText($destination)) {
                    $errors['destination'][] = 'The destination must match the selected catalog package.';
                }

                $startsAt = Carbon::parse($details['starts_at']);
                $endsAt = Carbon::parse($details['ends_at']);
                $actualDuration = $startsAt->copy()->startOfDay()->diffInDays($endsAt->copy()->startOfDay()) + 1;
                if ((int) $actualDuration !== $durationDays) {
                    $errors['ends_at'][] = "This package has a fixed duration of {$durationDays} days.";
                }

                $passengerCount = (int) $details['passenger_count'];
                if ($passengerCount < $minimumPax || $passengerCount > $maximumPax) {
                    $errors['passenger_count'][] = "This package requires {$minimumPax} to {$maximumPax} named travelers.";
                }

                $itinerary = $details['itinerary'];
                if (count($itinerary) !== $durationDays) {
                    $errors['itinerary'][] = "Record exactly one itinerary entry for each of the package's {$durationDays} days.";
                } else {
                    $days = collect($itinerary)->pluck('day')->map(fn ($day) => (int) $day)->sort()->values()->all();
                    if ($days !== range(1, $durationDays)) {
                        $errors['itinerary'][] = "Itinerary days must be numbered once each from 1 through {$durationDays}.";
                    }
                }

                $leadDays = max(0, (int) ($config['booking_lead_days'] ?? 0));
                $earliestDeparture = Carbon::today()->addDays($leadDays);
                if ($startsAt->copy()->startOfDay()->lt($earliestDeparture)) {
                    $errors['starts_at'][] = "This package requires at least {$leadDays} days of advance booking.";
                }

                if (!empty($config['valid_from']) && $startsAt->copy()->startOfDay()->lt(Carbon::parse($config['valid_from'])->startOfDay())) {
                    $errors['starts_at'][] = 'The departure is before this package\'s validity window.';
                }
                if (!empty($config['valid_until']) && $startsAt->copy()->startOfDay()->gt(Carbon::parse($config['valid_until'])->startOfDay())) {
                    $errors['starts_at'][] = 'The departure is after this package\'s validity window.';
                }
            }
        }

        if (!array_key_exists('adult_count', $details)) {
            $errors['adult_count'][] = 'Adult count is required for a catalog package.';
        }
        if (!array_key_exists('child_count', $details)) {
            $errors['child_count'][] = 'Child count is required for a catalog package.';
        }
        if (empty($details['traveler_types'])) {
            $errors['traveler_types'][] = 'A named traveler roster is required for a catalog package.';
        }

        $adultCount = (int) ($details['adult_count'] ?? 0);
        $childCount = (int) ($details['child_count'] ?? 0);
        $travelerTypes = collect($details['traveler_types'] ?? []);
        if ($travelerTypes->where('type', 'adult')->count() !== $adultCount) {
            $errors['adult_count'][] = 'Adult count must match the named adult travelers.';
        }
        if ($travelerTypes->where('type', 'child')->count() !== $childCount) {
            $errors['child_count'][] = 'Child count must match the named child travelers.';
        }

        if (array_key_exists('adults', $lineSnapshot)) {
            if ($lineSnapshot['adults'] === null) {
                $errors['adult_count'][] = 'The invoice line must record its adult count.';
            } elseif ((int) $lineSnapshot['adults'] !== $adultCount) {
                $errors['adult_count'][] = 'Adult count must match the invoice line.';
            }
        }
        if (array_key_exists('children', $lineSnapshot)) {
            if ($lineSnapshot['children'] === null) {
                $errors['child_count'][] = 'The invoice line must record its child count.';
            } elseif ((int) $lineSnapshot['children'] !== $childCount) {
                $errors['child_count'][] = 'Child count must match the invoice line.';
            }
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }

        // Preserve an authoritative identity snapshot even when harmless casing or
        // whitespace differs in the submitted payload.
        $details['originating_catalog_service_id'] = $service->id;
        $details['package_name'] = $service->name;
        $details['destination'] = trim((string) $service->package_config['destination']);

        return $details;
    }

    private function normalizedText(mixed $value): string
    {
        return mb_strtolower(preg_replace('/\s+/', ' ', trim((string) $value)) ?? '');
    }

    public function create(SalesOrderItem $item, array $details): Model
    {
        $attributes = ['sales_order_item_id' => $item->id, 'status' => 'draft', ...$details];
        return match ($item->service_type) {
            'private_tour' => PrivateTourBooking::create($attributes),
            'visa_assistance' => VisaAssistanceBooking::create($attributes),
            'passport_assistance' => PassportAssistanceBooking::create($attributes),
            'flight_booking' => FlightBooking::create($attributes),
            'accommodation_booking' => AccommodationBooking::create($attributes),
            'ticket_booking' => ScheduledTicketBooking::create($attributes),
            'activity_booking' => ActivityBooking::create($attributes),
            'transfer_service' => TransferBooking::create($attributes),
            'custom_arrangement' => CustomArrangementItem::create($attributes),
            default => throw ValidationException::withMessages(['service_type' => 'Unsupported order fulfillment type.']),
        };
    }
}
