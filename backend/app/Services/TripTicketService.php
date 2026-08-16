<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Bus;
use App\Models\CashBudgetRequest;
use App\Models\CharterBooking;
use App\Models\EducationalTourBooking;
use App\Models\JobOrder;
use App\Models\JoinerReservation;
use App\Models\PrivateTourBooking;
use App\Models\ResourceAllocation;
use App\Models\SalesOrderItem;
use App\Models\SystemSetting;
use App\Models\TransferBooking;
use App\Models\TripTicket;
use App\Models\User;
use App\Models\WorkOrder;
use App\Notifications\SystemAlert;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class TripTicketService
{
    public function index()
    {
        $query = TripTicket::with($this->relations());

        if (auth()->user()->role === 'driver') {
            $query->where('driver_id', auth()->id());
        }

        return $query->latest()->get();
    }

    /** Materialize the primary dispatch document for callers that expect one ticket. */
    public function ensureDraftForSalesItem(SalesOrderItem $item, ?int $actorId = null): ?TripTicket
    {
        return $this->synchronizeForSalesItem($item, $actorId)->first();
    }

    /**
     * Synchronize Sales into Logistics. One physical vehicle receives one DTT, and
     * repeated checkout/capture calls update the same rows instead of duplicating them.
     * Non-dispatch products (hotel, visa, flight-only, activities) intentionally do
     * not create a driver's document because JVD is not operating a road vehicle.
     *
     * @return Collection<int, TripTicket>
     */
    public function synchronizeForSalesItem(SalesOrderItem $item, ?int $actorId = null): Collection
    {
        $item->load(['order.invoice', 'fulfillment', 'service']);
        if (! $item->order?->invoice_id) {
            return collect();
        }

        if ($item->status === 'cancelled') {
            TripTicket::where('sales_order_item_id', $item->id)
                ->where('status', '!=', 'completed')
                ->update(['status' => 'cancelled']);

            return collect();
        }

        $plan = $this->dispatchPlan($item);
        if (! $plan || ! $plan['starts_at']) {
            return collect();
        }

        return DB::transaction(function () use ($item, $actorId, $plan) {
            $start = Carbon::parse($plan['starts_at']);
            $end = Carbon::parse($plan['ends_at'] ?? $plan['starts_at']);
            if ($end->lessThanOrEqualTo($start)) {
                $end = $start->copy()->addDay();
            }
            $days = max(1, $start->copy()->startOfDay()->diffInDays($end->copy()->startOfDay()) + 1);
            $assignments = $this->passengerAssignments($plan['assignments'], (int) $plan['passengers']);
            $tickets = collect();

            foreach ($assignments as $index => $assignment) {
                $bus = ! empty($assignment['bus_id']) ? Bus::find($assignment['bus_id']) : null;
                $attributes = [
                    'issue_date' => now()->toDateString(),
                    'date_of_travel' => $start->toDateString(),
                    'duration' => "{$days} ".($days === 1 ? 'day' : 'days'),
                    'pick_up' => $plan['pickup'],
                    'destination' => $plan['destination'],
                    'drop_off' => $plan['destination'],
                    'bus_id' => $assignment['bus_id'] ?? null,
                    'plate_no' => $bus?->plate_number ?? $assignment['plate_number'] ?? null,
                    'no_of_passengers' => $assignment['planned_passengers'],
                    'driver_id' => $assignment['driver_id'] ?? null,
                    'passenger_name' => $item->order->invoice?->customer_name ?? 'Valued Customer',
                    'trip_type' => 'domestic',
                    'requested_by' => $actorId ?? $item->order->agent_id,
                    'invoice_id' => $item->order->invoice_id,
                    'sales_order_item_id' => $item->id,
                    'assignment_index' => $index,
                ];

                $ticket = TripTicket::where('sales_order_item_id', $item->id)
                    ->where('assignment_index', $index)
                    ->lockForUpdate()
                    ->first();

                if ($ticket) {
                    if ($ticket->status !== 'completed') {
                        foreach ($plan['allowances'] ?? [] as $field => $value) {
                            if ((float) $ticket->{$field} === 0.0) {
                                $attributes[$field] = $value;
                            }
                        }
                        $operationalChanged = collect($attributes)
                            ->except(['issue_date', 'requested_by', 'invoice_id', 'sales_order_item_id', 'assignment_index', 'meal_allowance', 'diesel', 'sop', 'easy_trip', 'autosweep'])
                            ->contains(fn ($value, $field) => (string) $ticket->{$field} !== (string) $value);
                        if ($operationalChanged && $ticket->status === 'approved') {
                            $attributes['status'] = 'draft';
                        }
                        $ticket->update($attributes);
                    }
                } else {
                    $ticket = TripTicket::create([
                        'control_no' => $this->nextControlNumber(),
                        'status' => 'draft',
                        ...($plan['allowances'] ?? []),
                        ...$attributes,
                    ]);
                }

                $this->synchronizePreTripWorkOrder($ticket);
                $tickets->push($ticket->load($this->relations()));
            }

            TripTicket::where('sales_order_item_id', $item->id)
                ->where('assignment_index', '>=', $assignments->count())
                ->where('status', '!=', 'completed')
                ->update(['status' => 'cancelled']);

            return $tickets;
        });
    }

    /** @return array{starts_at:mixed,ends_at:mixed,pickup:string,destination:string,passengers:int,assignments:array<int,array<string,mixed>>,allowances?:array<string,float>}|null */
    private function dispatchPlan(SalesOrderItem $item): ?array
    {
        if (! $item->relationLoaded('fulfillment')) {
            $item->load('fulfillment');
        }
        $fulfillment = $item->fulfillment;
        $snapshot = $item->details_snapshot ?? [];

        if ($fulfillment instanceof CharterBooking) {
            $fulfillment->loadMissing(['bus', 'driver', 'ratePlan']);
            $assignments = $fulfillment->fleet_assignments ?: [[
                'bus_id' => $fulfillment->bus_id,
                'driver_id' => $fulfillment->driver_id,
                'plate_number' => $fulfillment->bus?->plate_number,
            ]];

            return [
                'starts_at' => $fulfillment->starts_at,
                'ends_at' => $fulfillment->ends_at,
                'pickup' => $fulfillment->pickup_location,
                'destination' => $fulfillment->destination,
                'passengers' => (int) $fulfillment->passenger_count,
                'assignments' => $assignments,
                'allowances' => $this->charterAllowances($fulfillment),
            ];
        }

        if ($fulfillment instanceof EducationalTourBooking) {
            $fulfillment->loadMissing(['vehicles.bus', 'vehicles.driver', 'program']);

            return [
                'starts_at' => $fulfillment->starts_at,
                'ends_at' => $fulfillment->ends_at,
                'pickup' => $fulfillment->pickup_location,
                'destination' => collect($fulfillment->stops_snapshot)->filter()->last()
                    ?? $snapshot['destination']
                    ?? $fulfillment->program?->name
                    ?? 'Educational tour',
                'passengers' => (int) $fulfillment->student_count + (int) $fulfillment->chaperone_count,
                'assignments' => $fulfillment->vehicles->map(fn ($vehicle) => [
                    'bus_id' => $vehicle->bus_id,
                    'driver_id' => $vehicle->driver_id,
                    'plate_number' => $vehicle->bus?->plate_number,
                    'planned_passengers' => (int) $vehicle->planned_passengers,
                ])->all(),
            ];
        }

        if ($fulfillment instanceof JoinerReservation) {
            $fulfillment->loadMissing(['departure.bus', 'departure.driver', 'departure.service']);
            $departure = $fulfillment->departure;
            if (! $departure) {
                return null;
            }

            return [
                'starts_at' => $departure->starts_at,
                'ends_at' => $departure->ends_at,
                'pickup' => $departure->pickup_instructions ?: 'To be confirmed by Logistics',
                'destination' => $departure->service?->name ?? $departure->code,
                'passengers' => (int) $fulfillment->passenger_count,
                'assignments' => [[
                    'bus_id' => $departure->bus_id,
                    'driver_id' => $departure->driver_id,
                    'plate_number' => $departure->bus?->plate_number,
                ]],
            ];
        }

        if ($fulfillment instanceof Booking) {
            $fulfillment->loadMissing(['bus', 'driver']);
            $travelDate = $fulfillment->travel_date;

            return [
                'starts_at' => $fulfillment->departure_datetime ?? $fulfillment->travel_date,
                'ends_at' => $fulfillment->arrival_datetime ?? ($travelDate ? Carbon::parse((string) $travelDate)->addDay() : null),
                'pickup' => $fulfillment->pickup_location ?: 'To be confirmed by Logistics',
                'destination' => $fulfillment->tour_code ?: 'To be confirmed by Logistics',
                'passengers' => (int) ($fulfillment->pax_count ?: 1),
                'assignments' => [[
                    'bus_id' => $fulfillment->bus_id,
                    'driver_id' => $fulfillment->driver_id,
                    'plate_number' => $fulfillment->bus?->plate_number,
                ]],
            ];
        }

        if ($fulfillment instanceof PrivateTourBooking) {
            return [
                'starts_at' => $fulfillment->starts_at,
                'ends_at' => $fulfillment->ends_at,
                'pickup' => $fulfillment->pickup_location ?: 'To be confirmed by Logistics',
                'destination' => $fulfillment->destination,
                'passengers' => (int) $fulfillment->passenger_count,
                'assignments' => [['bus_id' => $fulfillment->bus_id, 'driver_id' => $fulfillment->driver_id]],
            ];
        }

        if ($fulfillment instanceof TransferBooking) {
            return [
                'starts_at' => $fulfillment->pickup_at,
                'ends_at' => $fulfillment->dropoff_at,
                'pickup' => $fulfillment->pickup_location,
                'destination' => $fulfillment->dropoff_location,
                'passengers' => (int) $fulfillment->passenger_count,
                'assignments' => [['bus_id' => $fulfillment->bus_id, 'driver_id' => $fulfillment->driver_id]],
            ];
        }

        if (! in_array($item->service_type, ['bus_rental', 'educational_tour', 'joiner_tour', 'private_tour', 'transfer_service'], true)) {
            return null;
        }

        $start = $item->scheduled_start ?? $snapshot['starts_at'] ?? $snapshot['pickup_at'] ?? null;
        if (! $start) {
            return null;
        }

        return [
            'starts_at' => $start,
            'ends_at' => $item->scheduled_end ?? $snapshot['ends_at'] ?? $snapshot['dropoff_at'] ?? $start,
            'pickup' => $snapshot['pickup_location'] ?? 'To be confirmed by Logistics',
            'destination' => $snapshot['destination'] ?? $snapshot['dropoff_location'] ?? $item->title,
            'passengers' => (int) ($item->traveler_count ?? $snapshot['passenger_count'] ?? 1),
            'assignments' => [[
                'bus_id' => $snapshot['bus_id'] ?? null,
                'driver_id' => $snapshot['driver_id'] ?? null,
            ]],
        ];
    }

    /** Carry the per-unit Sales estimate into the operational document without overwriting later manual DTT edits. */
    private function charterAllowances(CharterBooking $booking): array
    {
        $snapshot = data_get($booking->pricing_snapshot, 'rate_plan', []);
        $plan = $booking->ratePlan;

        return [
            'meal_allowance' => (float) ($snapshot['driver_meals'] ?? $plan?->driver_meals ?? 0),
            'diesel' => (float) ($snapshot['diesel_cost'] ?? $plan?->diesel_cost ?? 0),
            'easy_trip' => (float) ($snapshot['easytrip'] ?? $plan?->easytrip ?? 0),
            'autosweep' => (float) ($snapshot['autosweep'] ?? $plan?->autosweep ?? 0),
        ];
    }

    /** @return Collection<int, array<string, mixed>> */
    private function passengerAssignments(array $assignments, int $passengers): Collection
    {
        $assignments = collect($assignments ?: [[]])->values();
        $remaining = max(0, $passengers);

        return $assignments->map(function (array $assignment, int $index) use (&$remaining, $assignments) {
            if (array_key_exists('planned_passengers', $assignment)) {
                $planned = max(0, (int) $assignment['planned_passengers']);
            } else {
                $unitsLeft = max(1, $assignments->count() - $index);
                $planned = (int) ceil($remaining / $unitsLeft);
                if (! empty($assignment['seating_capacity'])) {
                    $planned = min($planned, (int) $assignment['seating_capacity']);
                }
            }
            $remaining = max(0, $remaining - $planned);

            return [...$assignment, 'planned_passengers' => $planned];
        });
    }

    private function nextControlNumber(): string
    {
        $year = now()->year;
        $latest = TripTicket::where('control_no', 'like', "DTT-{$year}-%")
            ->orderByDesc('id')
            ->lockForUpdate()
            ->first();
        $sequence = 1;
        if ($latest) {
            $parts = explode('-', $latest->control_no);
            $sequence = (int) end($parts) + 1;
        }

        return sprintf('DTT-%d-%04d', $year, $sequence);
    }

    private function synchronizePreTripWorkOrder(TripTicket $ticket): void
    {
        if (! $ticket->bus_id) {
            return;
        }
        $workOrder = $ticket->workOrders()->where('auto_generated', true)->first();
        if (! $workOrder) {
            $this->autoGeneratePreTripWorkOrder($ticket);

            return;
        }
        if (! in_array($workOrder->status, ['completed', 'cancelled'], true)) {
            $workOrder->update([
                'bus_id' => $ticket->bus_id,
                'invoice_id' => $ticket->invoice_id,
                'assigned_to' => $ticket->driver_id,
                'description' => 'Auto-generated Pre-trip Safety Inspection for Trip Ticket #'.$ticket->control_no.'. Inspect brakes, tires, fluids, and steering.',
            ]);
        }
    }

    public function store(Request $request)
    {
        $user = auth()->user();
        if ($user && $user->role === 'driver') {
            return response()->json(['success' => false, 'message' => 'Drivers are not authorized to create trip tickets.'], 403);
        }

        $validated = $request->validate([
            'control_no' => 'nullable|string|unique:trip_tickets,control_no',
            'issue_date' => 'required|date',
            'date_of_travel' => 'required|date',
            'duration' => 'nullable|string',
            'pick_up' => 'required|string',
            'drop_off' => 'required|string',
            'bus_id' => 'nullable|exists:buses,id',
            'plate_no' => 'nullable|string',
            'no_of_passengers' => 'required|integer',
            'driver_id' => 'nullable|exists:users,id',

            'meal_allowance' => 'nullable|numeric',
            'diesel' => 'nullable|numeric',
            'sop' => 'nullable|numeric',
            'easy_trip' => 'nullable|numeric',
            'autosweep' => 'nullable|numeric',

            'fuel_consumed' => 'nullable|numeric',
            'fuel_gauge_before' => 'nullable|string',
            'fuel_gauge_after' => 'nullable|string',
            'odometer_reading' => 'nullable|numeric',

            'passenger_rating' => 'nullable|in:outstanding,satisfactory,needs_improvement,poor',
            'passenger_name' => 'nullable|string',
            'trip_type' => 'nullable|in:domestic,international',
            'override_conflict' => 'nullable|boolean',
        ]);

        // ── Conflict Check: Prevent double-booking driver or bus on overlapping date ranges ──
        $override = filter_var($request->input('override_conflict'), FILTER_VALIDATE_BOOLEAN);
        $canOverride = $user && (
            $user->hasRole('super_admin', 'executive_vice_president', 'operations_manager') ||
            $user->hasTag('process:override_schedule')
        );

        $validated['requested_by'] = auth()->id();
        $validated['trip_type'] = $validated['trip_type'] ?? 'domestic';

        $result = DB::transaction(function () use ($validated, $override, $canOverride) {
            if (! $override || ! $canOverride) {
                $conflictResponse = $this->detectScheduleConflict(
                    $validated['driver_id'] ?? null,
                    $validated['bus_id'] ?? null,
                    $validated['date_of_travel'],
                    $validated['duration'] ?? null
                );
                if ($conflictResponse) {
                    return $conflictResponse;
                }
            }

            if (empty($validated['control_no'])) {
                // Lock the latest row so concurrent requests serialize and cannot read the same
                // sequence number (mirrors PurchaseOrderService::generatePONumber()).
                $year = now()->year;
                $latest = TripTicket::where('control_no', 'like', "DTT-{$year}-%")
                    ->orderByDesc('id')
                    ->lockForUpdate()
                    ->first();
                $sequence = 1;
                if ($latest) {
                    $parts = explode('-', $latest->control_no);
                    $sequence = (int) end($parts) + 1;
                }
                $validated['control_no'] = sprintf('DTT-%d-%04d', $year, $sequence);
            }

            return TripTicket::create(array_diff_key($validated, ['override_conflict' => '']));
        });

        if ($result instanceof JsonResponse) {
            return $result;
        }

        $ticket = $result;

        if ($ticket->bus_id) {
            $this->autoGeneratePreTripWorkOrder($ticket);
        }

        return $ticket->load($this->relations());
    }

    public function show($id)
    {
        $ticket = TripTicket::with($this->relations())->findOrFail($id);

        $user = auth()->user();
        if ($user && $user->role === 'driver') {
            if ($ticket->driver_id !== $user->id) {
                return response()->json(['success' => false, 'message' => 'Unauthorized access to this trip ticket.'], 403);
            }
        }

        return $ticket;
    }

    public function update(Request $request, $id)
    {
        $ticket = TripTicket::findOrFail($id);
        $user = auth()->user();

        // 1. Enforce ownership and role checks
        if ($user && $user->role === 'driver') {
            if ($ticket->driver_id !== $user->id) {
                return response()->json(['success' => false, 'message' => 'Unauthorized access to this trip ticket.'], 403);
            }

            // Drivers can only update travel completion fields
            $allowedFields = [
                'passenger_rating', 'passenger_name',
                'fuel_consumed', 'fuel_gauge_before', 'fuel_gauge_after', 'odometer_reading',
                'status',
            ];

            // Reject if request has other fields
            $extra = array_diff(array_keys($request->except(['_method'])), $allowedFields);
            if (! empty($extra)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized field updates: Drivers are only allowed to submit completion reports.',
                ], 403);
            }

            // Drivers cannot approve a ticket
            if ($request->has('status') && $request->input('status') === 'approved') {
                return response()->json([
                    'success' => false,
                    'message' => 'Drivers cannot approve trip tickets.',
                ], 403);
            }

            // D-01: Drivers may only submit their completion report (approved -> completed).
            // They must not be able to revert to draft or mark non-approved trips as completed.
            if ($request->has('status')) {
                $requestedStatus = $request->input('status');
                if ($requestedStatus !== 'completed') {
                    return response()->json([
                        'success' => false,
                        'message' => 'Drivers can only mark an approved trip as completed.',
                    ], 403);
                }
                if ($ticket->status !== 'approved') {
                    return response()->json([
                        'success' => false,
                        'message' => 'Only an approved trip can be marked as completed.',
                    ], 422);
                }
            }
        }

        // 2. Enforce C-04: Block updates to allowance fields if CashBudgetRequest has been submitted/approved/disbursed
        $financialFields = ['meal_allowance', 'diesel', 'sop', 'easy_trip', 'autosweep'];
        $hasFinancialUpdates = false;
        foreach ($financialFields as $field) {
            if ($request->has($field)) {
                $hasFinancialUpdates = true;
                break;
            }
        }

        if ($hasFinancialUpdates) {
            $budget = CashBudgetRequest::where('trip_ticket_id', $ticket->id)->first();
            if ($budget && $budget->status !== 'draft') {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot modify allowances: The associated Cash Budget Request is already in status "'.$budget->status.'" and cannot be updated.',
                ], 422);
            }
        }

        $validated = $request->validate([
            'control_no' => 'sometimes|string|unique:trip_tickets,control_no,'.$id,
            'issue_date' => 'sometimes|date',
            'date_of_travel' => 'sometimes|date',
            'duration' => 'nullable|string',
            'pick_up' => 'sometimes|string',
            'drop_off' => 'sometimes|string',
            'bus_id' => 'nullable|exists:buses,id',
            'plate_no' => 'nullable|string',
            'no_of_passengers' => 'sometimes|integer',
            'driver_id' => 'nullable|exists:users,id',

            'meal_allowance' => 'nullable|numeric',
            'diesel' => 'nullable|numeric',
            'sop' => 'nullable|numeric',
            'easy_trip' => 'nullable|numeric',
            'autosweep' => 'nullable|numeric',

            'status' => 'sometimes|in:draft,approved,completed',
            'passenger_rating' => 'nullable|in:outstanding,satisfactory,needs_improvement,poor',
            'passenger_name' => 'nullable|string',
            'fuel_consumed' => 'nullable|numeric',
            'fuel_gauge_before' => 'nullable|string',
            'fuel_gauge_after' => 'nullable|string',
            'odometer_reading' => 'nullable|numeric',
            'trip_type' => 'sometimes|in:domestic,international',
            'override_conflict' => 'nullable|boolean',
        ]);

        if ($user && $user->role === 'driver') {
            // Keep only allowed driver fields in $validated
            $validated = array_intersect_key($validated, array_flip([
                'passenger_rating', 'passenger_name',
                'fuel_consumed', 'fuel_gauge_before', 'fuel_gauge_after', 'odometer_reading',
                'status',
            ]));
        }

        $oldBusId = $ticket->bus_id;
        $oldDriverId = $ticket->driver_id;

        // ── Conflict Check on update: when driver, bus, date, or duration changes ──
        $newDriverId = $validated['driver_id'] ?? $ticket->driver_id;
        $newBusId = $validated['bus_id'] ?? $ticket->bus_id;
        $newDate = $validated['date_of_travel'] ?? $ticket->date_of_travel;
        $newDuration = array_key_exists('duration', $validated) ? $validated['duration'] : $ticket->duration;

        $driverChanged = isset($validated['driver_id']) && $validated['driver_id'] != $ticket->driver_id;
        $busChanged = isset($validated['bus_id']) && $validated['bus_id'] != $ticket->bus_id;
        $dateChanged = isset($validated['date_of_travel']) && $validated['date_of_travel'] != $ticket->date_of_travel;
        $durationChanged = array_key_exists('duration', $validated) && $validated['duration'] != $ticket->duration;
        $salesItem = $ticket->salesOrderItem()
            ->with(['fulfillment', 'order'])
            ->first();
        $salesFactsChanged = $salesItem && collect([
            'pick_up' => 'pick_up',
            'drop_off' => 'drop_off',
            'no_of_passengers' => 'no_of_passengers',
        ])->contains(fn ($ticketField, $requestField) => array_key_exists($requestField, $validated)
            && (string) $validated[$requestField] !== (string) $ticket->{$ticketField});

        if ($salesItem && ($dateChanged || $durationChanged)) {
            return response()->json([
                'success' => false,
                'message' => 'This trip schedule came from a confirmed sale. Amend or rebook its dates in Sales so the invoice, customer itinerary, and fleet allocation remain synchronized.',
            ], 422);
        }

        if ($salesFactsChanged) {
            return response()->json([
                'success' => false,
                'message' => 'This route and passenger count came from a confirmed sale. Amend the travel booking in Sales and its linked DTT will refresh automatically.',
            ], 422);
        }

        if ($salesItem && ($driverChanged || $busChanged)
            && ! ($salesItem->fulfillment instanceof PrivateTourBooking)
            && ! ($salesItem->fulfillment instanceof TransferBooking)) {
            return response()->json([
                'success' => false,
                'message' => 'This vehicle and driver assignment came from Sales. Update the charter, educational tour, or departure in Sales; its linked DTT will refresh automatically.',
            ], 422);
        }

        $result = DB::transaction(function () use ($ticket, $validated, $driverChanged, $busChanged, $dateChanged, $durationChanged, $newDriverId, $newBusId, $newDate, $newDuration, $request, $user, $salesItem) {
            if ($driverChanged || $busChanged || $dateChanged || $durationChanged) {
                if ($salesItem) {
                    if (! $newBusId) {
                        return response()->json([
                            'success' => false,
                            'message' => 'A confirmed travel service must retain an assigned vehicle. Reassign it to another available vehicle instead.',
                        ], 422);
                    }

                    $salesItem->fulfillment->update([
                        'bus_id' => $newBusId,
                        'driver_id' => $newDriverId,
                    ]);
                    // A bus change uses a different unique allocation key. Mark the
                    // former row inactive before the shared sales allocator reserves
                    // the replacement; transaction rollback restores it on conflict.
                    app(ResourceAllocationService::class)->release($salesItem->fulfillment);
                    app(SalesOrderService::class)->resynchronizeFulfillment($salesItem);
                } else {
                    $override = filter_var($request->input('override_conflict'), FILTER_VALIDATE_BOOLEAN);
                    $canOverride = $user && (
                        $user->hasRole('super_admin', 'executive_vice_president', 'operations_manager') ||
                        $user->hasTag('process:override_schedule')
                    );

                    if (! $override || ! $canOverride) {
                        $conflictResponse = $this->detectScheduleConflict(
                            $newDriverId,
                            $newBusId,
                            $newDate,
                            $newDuration,
                            $ticket->id
                        );
                        if ($conflictResponse) {
                            return $conflictResponse;
                        }
                    }
                }
            }

            $isSuperAdmin = auth()->user() && auth()->user()->hasRole('super_admin');

            if ($request->has('status') && $request->status === 'approved' && ! $isSuperAdmin) {
                // Strict Process Guard:
                if (! $ticket->bus_id && ! isset($validated['bus_id'])) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Cannot approve Trip Ticket: A vehicle (bus) must be assigned first.',
                    ], 422);
                }

                $currentBusId = $validated['bus_id'] ?? $ticket->bus_id;

                // Retrieve the pre-trip work order for this bus and trip ticket
                $wo = WorkOrder::where('trip_ticket_id', $ticket->id)
                    ->where('bus_id', $currentBusId)
                    ->first();

                if (! $wo) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Cannot approve Trip Ticket: Pre-trip safety inspection Work Order does not exist for the assigned vehicle.',
                    ], 422);
                }

                if ($wo->status !== 'completed') {
                    return response()->json([
                        'success' => false,
                        'message' => 'Cannot approve Trip Ticket: Associated Pre-trip safety Work Order ('.$wo->wo_number.') must be fully completed.',
                    ], 422);
                }

                // Check if there is an associated Job Order and if it is completed
                $hasJobOrder = JobOrder::where('work_order_id', $wo->id)->exists();
                if (! $hasJobOrder) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Cannot approve Trip Ticket: A Job Order must be generated and completed for Pre-trip safety Work Order ('.$wo->wo_number.').',
                    ], 422);
                }

                $incompleteJo = JobOrder::where('work_order_id', $wo->id)
                    ->where('status', '!=', 'completed')
                    ->first();

                if ($incompleteJo) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Cannot approve Trip Ticket: The associated Job Order ('.$incompleteJo->jo_number.') is still incomplete.',
                    ], 422);
                }
            }

            $ticket->update(array_diff_key($validated, ['override_conflict' => '']));

            return $ticket;
        });

        if ($result instanceof JsonResponse) {
            return $result;
        }

        $ticket = $result;

        // Keep the same pending pre-trip inspection attached when Logistics
        // reassigns a sales-generated trip; manual tickets retain legacy behavior.
        if ($ticket->bus_id && ($ticket->bus_id !== $oldBusId)) {
            $pendingPreTrip = $salesItem
                ? $ticket->workOrders()->where('type', 'trip')->where('status', 'pending_approval')->first()
                : null;
            if ($pendingPreTrip) {
                $pendingPreTrip->update([
                    'bus_id' => $ticket->bus_id,
                    'assigned_to' => $ticket->driver_id,
                    'invoice_id' => $ticket->invoice_id,
                ]);
            } elseif (! $ticket->workOrders()->where('bus_id', $ticket->bus_id)->exists()) {
                $this->autoGeneratePreTripWorkOrder($ticket);
            }
        }

        // H-03: Sync driver update on trip ticket to the pre-trip safety Work Order
        if ($ticket->driver_id && ($ticket->driver_id !== $oldDriverId)) {
            WorkOrder::where('trip_ticket_id', $ticket->id)
                ->where('bus_id', $ticket->bus_id)
                ->update(['assigned_to' => $ticket->driver_id]);
        }

        if ($request->has('status') && $request->status === 'approved') {
            $ticket->update(['approved_by' => auth()->id()]);
        }

        if ($request->has('status') && $request->status === 'completed' && $ticket->bus_id) {
            $bus = Bus::find($ticket->bus_id);
            if ($bus) {
                $distanceAdded = (float) ($ticket->odometer_reading ?? 0);
                if ($distanceAdded > 0) {
                    $bus->increment('total_mileage', $distanceAdded);
                }
            }
        }

        if ($request->has('status') && $request->status === 'approved') {

            // Sync/Create Cash Budget Request for the Trip Ticket
            $budgetData = [
                'travel_date' => $ticket->date_of_travel,
                'plate_number' => $ticket->bus?->plate_number ?? $ticket->plate_no ?? 'TBA',
                'destination' => $ticket->drop_off,
                'diesel' => $ticket->diesel ?? 0,
                'meal_allowance' => $ticket->meal_allowance ?? 0,
                'sop' => $ticket->sop ?? 0,
                'autosweep' => $ticket->autosweep ?? 0,
                'easytrip' => $ticket->easy_trip ?? 0,
                'total_amount' => ($ticket->diesel ?? 0) + ($ticket->meal_allowance ?? 0) + ($ticket->sop ?? 0) + ($ticket->autosweep ?? 0) + ($ticket->easy_trip ?? 0),
            ];

            $budget = CashBudgetRequest::where('trip_ticket_id', $ticket->id)->first();
            if ($budget) {
                $budget->update($budgetData);
            } else {
                $budget = CashBudgetRequest::create(array_merge($budgetData, [
                    'date' => now(),
                    'status' => 'draft',
                    'prepared_by' => auth()->id() ?? $ticket->requested_by ?? 1,
                    'trip_ticket_id' => $ticket->id,
                ]));
            }

            // Notify Accounting & Driver!
            NotificationService::notifyCashBudgetSpawn($budget);

            if ($ticket->driver_id) {
                $driver = User::find($ticket->driver_id);
                if ($driver) {
                    $driver->notify(new SystemAlert(
                        "Trip Ticket Approved — {$ticket->control_no}",
                        "Trip Ticket #{$ticket->control_no} to ".($ticket->drop_off ?? $ticket->destination ?? 'destination')." on {$ticket->date_of_travel} has been approved.",
                        'success',
                        '/driver/trips',
                        'trip_ticket',
                        $ticket->id
                    ));
                }
            }
        }

        return $ticket->load($this->relations());
    }

    public function destroy($id)
    {
        $ticket = TripTicket::findOrFail($id);
        $user = auth()->user();

        if ($user && $user->role === 'driver') {
            return response()->json(['success' => false, 'message' => 'Drivers are not authorized to delete trip tickets.'], 403);
        }

        if ($ticket->sales_order_item_id) {
            return response()->json([
                'success' => false,
                'message' => 'This trip ticket is tied to a confirmed sale. Cancel or amend the sales order so fulfillment, accounting, and fleet allocations remain synchronized.',
            ], 422);
        }

        $ticket->delete();

        return response()->json(['message' => 'Trip ticket deleted successfully.']);
    }

    private function getTripDateRange($dateOfTravel, $duration)
    {
        $startDate = Carbon::parse($dateOfTravel)->startOfDay();

        $days = 1;
        if ($duration && preg_match('/(\d+)\s*day/i', $duration, $matches)) {
            $days = (int) $matches[1];
        }

        if ($days < 1) {
            $days = 1;
        }

        $endDate = $startDate->copy()->addDays($days - 1)->endOfDay();

        return [$startDate, $endDate];
    }

    /**
     * Proactive conflict-check endpoint for frontend use.
     * GET /api/trip-tickets/check-conflict?driver_id=&bus_id=&date_of_travel=&duration=&exclude_id=
     */
    public function checkConflict(Request $request)
    {
        $request->validate([
            'date_of_travel' => 'required|date',
            'duration' => 'nullable|string',
            'driver_id' => 'nullable|integer',
            'bus_id' => 'nullable|integer',
            'exclude_id' => 'nullable|integer',
        ]);

        $driverId = $request->query('driver_id');
        $busId = $request->query('bus_id');
        $dateOfTravel = $request->query('date_of_travel');
        $duration = $request->query('duration');
        $excludeId = $request->query('exclude_id');

        $conflicts = [];

        [$reqStart, $reqEnd] = $this->getTripDateRange($dateOfTravel, $duration);

        $excludeInvoiceId = null;
        if ($excludeId) {
            $tt = TripTicket::find($excludeId);
            if ($tt && $tt->invoice_id) {
                $excludeInvoiceId = $tt->invoice_id;
            }
        }

        if ($driverId) {
            $travel = \DB::table('travels')
                ->where('driver_id', $driverId)
                ->where('status', '!=', 'cancelled')
                ->where(function ($q) use ($excludeId, $excludeInvoiceId) {
                    if ($excludeId) {
                        $q->where(function ($sub) use ($excludeId) {
                            $sub->where('reference_type', '!=', 'trip_ticket')
                                ->orWhere('reference_id', '!=', $excludeId);
                        });
                        if ($excludeInvoiceId) {
                            $q->where(function ($sub) use ($excludeInvoiceId) {
                                $sub->where('reference_type', '!=', 'invoice')
                                    ->orWhere('reference_id', '!=', $excludeInvoiceId);
                            });
                        }
                    }
                })
                ->whereBetween('travel_date', [$reqStart->toDateString(), $reqEnd->toDateString()])
                ->first();

            if ($travel) {
                $conflicts[] = [
                    'type' => 'driver',
                    'message' => "Driver is already assigned to a travel on {$travel->travel_date}.",
                    'conflicting_travel' => $travel,
                ];
            }
        }

        if ($busId) {
            $travel = \DB::table('travels')
                ->where('bus_id', $busId)
                ->where('status', '!=', 'cancelled')
                ->where(function ($q) use ($excludeId, $excludeInvoiceId) {
                    if ($excludeId) {
                        $q->where(function ($sub) use ($excludeId) {
                            $sub->where('reference_type', '!=', 'trip_ticket')
                                ->orWhere('reference_id', '!=', $excludeId);
                        });
                        if ($excludeInvoiceId) {
                            $q->where(function ($sub) use ($excludeInvoiceId) {
                                $sub->where('reference_type', '!=', 'invoice')
                                    ->orWhere('reference_id', '!=', $excludeInvoiceId);
                            });
                        }
                    }
                })
                ->whereBetween('travel_date', [$reqStart->toDateString(), $reqEnd->toDateString()])
                ->first();

            if ($travel) {
                $conflicts[] = [
                    'type' => 'bus',
                    'message' => "Vehicle is already reserved for a travel on {$travel->travel_date}.",
                    'conflicting_travel' => $travel,
                ];
            }

            if (empty($conflicts)) {
                $excludeWoIds = [];
                if ($excludeId) {
                    $excludeWoIds = WorkOrder::where('trip_ticket_id', $excludeId)->pluck('id')->toArray();
                }

                $pmsQuery = \DB::table('pms_schedules')
                    ->where('bus_id', $busId)
                    ->whereBetween('maintenance_date', [$reqStart->toDateString(), $reqEnd->toDateString()]);

                if (! empty($excludeWoIds)) {
                    $pmsQuery->where(function ($q) use ($excludeWoIds) {
                        $q->whereNull('work_order_id')
                            ->orWhereNotIn('work_order_id', $excludeWoIds);
                    });
                }

                $pms = $pmsQuery->first();

                if ($pms) {
                    $conflicts[] = [
                        'type' => 'bus',
                        'message' => "Vehicle is under maintenance (PMS) on {$pms->maintenance_date}.",
                        'conflicting_pms' => $pms,
                    ];
                }
            }
        }

        return response()->json([
            'has_conflict' => count($conflicts) > 0,
            'conflicts' => $conflicts,
        ]);
    }

    /**
     * Detect scheduling conflicts for a driver or bus on a given date range.
     * Returns a JSON error response if conflict found, or null if clear.
     */
    private function detectScheduleConflict($driverId, $busId, $dateOfTravel, $duration = null, $excludeTicketId = null)
    {
        [$reqStart, $reqEnd] = $this->getTripDateRange($dateOfTravel, $duration);

        // The allocation ledger includes sales reservations that do not have a legacy
        // travels row (charters, educational tours, and joiner departures).
        $allocationQuery = ResourceAllocation::whereNotIn('status', ['cancelled', 'completed']);
        if ($excludeTicketId) {
            $allocationQuery->where(function ($q) use ($excludeTicketId) {
                $q->where('source_type', '!=', TripTicket::class)->orWhere('source_id', '!=', $excludeTicketId);
            });
        }
        $driverBuffer = (int) SystemSetting::getValue('logistics.driver_turnaround_minutes', 120);
        $vehicleBuffer = (int) SystemSetting::getValue('logistics.vehicle_turnaround_minutes', 30);
        $driverAllocation = $driverId ? (clone $allocationQuery)->where('driver_id', $driverId)
            ->where('starts_at', '<', $reqEnd->copy()->addMinutes($driverBuffer))->where('ends_at', '>', $reqStart->copy()->subMinutes($driverBuffer))->first() : null;
        if ($driverAllocation) {
            return response()->json([
                'success' => false,
                'message' => "Schedule conflict: The selected driver is already assigned/reserved by {$driverAllocation->reference} from {$driverAllocation->starts_at} to {$driverAllocation->ends_at}.",
            ], 422);
        }
        $busAllocation = $busId ? (clone $allocationQuery)->where('bus_id', $busId)
            ->where('starts_at', '<', $reqEnd->copy()->addMinutes($vehicleBuffer))->where('ends_at', '>', $reqStart->copy()->subMinutes($vehicleBuffer))->first() : null;
        if ($busAllocation) {
            return response()->json([
                'success' => false,
                'message' => "Schedule conflict: The selected vehicle is already assigned/reserved by {$busAllocation->reference} from {$busAllocation->starts_at} to {$busAllocation->ends_at}.",
            ], 422);
        }

        $excludeInvoiceId = null;
        if ($excludeTicketId) {
            $tt = TripTicket::find($excludeTicketId);
            if ($tt && $tt->invoice_id) {
                $excludeInvoiceId = $tt->invoice_id;
            }
        }

        if ($driverId) {
            // Check travels
            $travel = \DB::table('travels')
                ->where('driver_id', $driverId)
                ->where('status', '!=', 'cancelled')
                ->where(function ($q) use ($excludeTicketId, $excludeInvoiceId) {
                    if ($excludeTicketId) {
                        $q->where(function ($sub) use ($excludeTicketId) {
                            $sub->where('reference_type', '!=', 'trip_ticket')
                                ->orWhere('reference_id', '!=', $excludeTicketId);
                        });
                        if ($excludeInvoiceId) {
                            $q->where(function ($sub) use ($excludeInvoiceId) {
                                $sub->where('reference_type', '!=', 'invoice')
                                    ->orWhere('reference_id', '!=', $excludeInvoiceId);
                            });
                            $q->where(function ($sub) use ($excludeInvoiceId) {
                                $sub->where('reference_type', '!=', 'booking')
                                    ->orWhere('reference_id', '!=', $excludeInvoiceId);
                            });
                        }
                    }
                })
                ->whereBetween('travel_date', [$reqStart->toDateString(), $reqEnd->toDateString()])
                ->lockForUpdate()
                ->first();

            if ($travel) {
                if ($travel->reference_type === 'booking') {
                    $booking = Booking::with('invoice')->find($travel->reference_id);
                    $inv = $booking ? $booking->invoice : null;
                    $invNo = $inv ? $inv->invoice_number : '';
                    $custName = $inv ? $inv->customer_name : '';
                    $tDate = $travel->travel_date;

                    return response()->json([
                        'success' => false,
                        'message' => "Schedule conflict: The selected driver is already reserved for booking/invoice {$invNo} ({$custName}) on {$tDate}.",
                    ], 422);
                } else {
                    $tt = TripTicket::find($travel->reference_id);
                    $ctrlNo = $tt ? $tt->control_no : '';
                    $pu = $tt ? $tt->pick_up : '';
                    $do = $tt ? $tt->drop_off : '';
                    $ttDate = $tt ? $tt->date_of_travel : '';
                    $dur = $tt ? ($tt->duration ?: '1 day') : '1 day';

                    return response()->json([
                        'success' => false,
                        'message' => "Schedule conflict: The selected driver is already assigned to trip {$ctrlNo} ({$pu} → {$do}) on {$ttDate} (Duration: {$dur}).",
                    ], 422);
                }
            }
        }

        if ($busId) {
            // Check travels
            $travel = \DB::table('travels')
                ->where('bus_id', $busId)
                ->where('status', '!=', 'cancelled')
                ->where(function ($q) use ($excludeTicketId, $excludeInvoiceId) {
                    if ($excludeTicketId) {
                        $q->where(function ($sub) use ($excludeTicketId) {
                            $sub->where('reference_type', '!=', 'trip_ticket')
                                ->orWhere('reference_id', '!=', $excludeTicketId);
                        });
                        if ($excludeInvoiceId) {
                            $q->where(function ($sub) use ($excludeInvoiceId) {
                                $sub->where('reference_type', '!=', 'booking')
                                    ->orWhere('reference_id', '!=', $excludeInvoiceId);
                            });
                        }
                    }
                })
                ->whereBetween('travel_date', [$reqStart->toDateString(), $reqEnd->toDateString()])
                ->lockForUpdate()
                ->first();

            if ($travel) {
                if ($travel->reference_type === 'booking') {
                    $booking = Booking::with('invoice')->find($travel->reference_id);
                    $inv = $booking ? $booking->invoice : null;
                    $invNo = $inv ? $inv->invoice_number : '';
                    $custName = $inv ? $inv->customer_name : '';
                    $tDate = $travel->travel_date;

                    return response()->json([
                        'success' => false,
                        'message' => "Schedule conflict: The selected vehicle is already reserved for booking/invoice {$invNo} ({$custName}) on {$tDate}.",
                    ], 422);
                } else {
                    $tt = TripTicket::find($travel->reference_id);
                    $ctrlNo = $tt ? $tt->control_no : '';
                    $pu = $tt ? $tt->pick_up : '';
                    $do = $tt ? $tt->drop_off : '';
                    $ttDate = $tt ? $tt->date_of_travel : '';
                    $dur = $tt ? ($tt->duration ?: '1 day') : '1 day';

                    return response()->json([
                        'success' => false,
                        'message' => "Schedule conflict: The selected vehicle is already assigned to trip {$ctrlNo} ({$pu} → {$do}) on {$ttDate} (Duration: {$dur}).",
                    ], 422);
                }
            }

            // Check PMS schedules (excluding pre-trip safety WOs for this trip ticket)
            $excludeWoIds = [];
            if ($excludeTicketId) {
                $excludeWoIds = WorkOrder::where('trip_ticket_id', $excludeTicketId)->pluck('id')->toArray();
            }

            $pmsQuery = \DB::table('pms_schedules')
                ->where('bus_id', $busId)
                ->whereBetween('maintenance_date', [$reqStart->toDateString(), $reqEnd->toDateString()]);

            if (! empty($excludeWoIds)) {
                $pmsQuery->where(function ($q) use ($excludeWoIds) {
                    $q->whereNull('work_order_id')
                        ->orWhereNotIn('work_order_id', $excludeWoIds);
                });
            }

            $pms = $pmsQuery->lockForUpdate()->first();

            if ($pms) {
                return response()->json([
                    'success' => false,
                    'message' => "Schedule conflict: The selected vehicle is under maintenance (PMS) on {$pms->maintenance_date}.",
                ], 422);
            }
        }

        return null;
    }

    public function autoGeneratePreTripWorkOrder(TripTicket $ticket)
    {
        $year = now()->year;
        $latest = WorkOrder::where('wo_number', 'like', "WO-{$year}-%")
            ->orderByDesc('id')
            ->first();

        $sequence = 1;
        if ($latest) {
            $parts = explode('-', $latest->wo_number);
            $sequence = (int) end($parts) + 1;
        }
        $woNumber = sprintf('WO-%d-%04d', $year, $sequence);

        $wo = WorkOrder::create([
            'wo_number' => $woNumber,
            'type' => 'trip',
            'bus_id' => $ticket->bus_id,
            'invoice_id' => $ticket->invoice_id,
            'assigned_to' => $ticket->driver_id,
            'created_by' => auth()->id() ?? $ticket->requested_by ?? 1,
            'status' => 'pending_approval',
            'priority' => 'urgent',
            'description' => 'Auto-generated Pre-trip Safety Inspection for Trip Ticket #'.$ticket->control_no.'. Inspect brakes, tires, fluids, and steering.',
            'auto_generated' => true,
            'trip_ticket_id' => $ticket->id,
        ]);

        NotificationService::notifyWorkOrderRequest($wo);
    }

    private function relations(): array
    {
        return [
            'bus',
            'driver',
            'requestedBy',
            'approvedBy',
            'invoice:id,invoice_number,customer_name,status',
            'salesOrderItem:id,sales_order_id,service_type,title,fulfillment_type,fulfillment_id',
            'salesOrderItem.order:id,order_number,invoice_id',
            'workOrders.jobOrders',
            'cashBudgetRequest',
        ];
    }
}
