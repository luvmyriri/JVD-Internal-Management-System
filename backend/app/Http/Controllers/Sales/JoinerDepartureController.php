<?php

namespace App\Http\Controllers\Sales;

use App\Http\Controllers\Controller;
use App\Http\Requests\Sales\ConfirmJoinerReservationRequest;
use App\Http\Requests\Sales\HoldJoinerSeatsRequest;
use App\Http\Requests\Sales\StoreJoinerDepartureRequest;
use App\Models\JoinerDeparture;
use App\Models\JoinerDepartureSeat;
use App\Models\JoinerReservation;
use App\Models\Service;
use App\Services\JoinerReservationService;
use App\Services\SalesReferenceService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Barryvdh\DomPDF\Facade\Pdf;

class JoinerDepartureController extends Controller
{
    public function __construct(private readonly JoinerReservationService $reservations) {}

    public function index(Request $request)
    {
        $query = JoinerDeparture::with([
            'service:id,name,description,price,adult_price,child_price,images',
            'bus:id,plate_number,model,seating_capacity',
            'driver:id,first_name,last_name',
            'seats' => fn ($q) => $q->orderBy('seat_code'),
        ])->withCount(['seats as available_seats_count' => fn ($q) => $q->where('status', 'available')]);

        if ($request->filled('status')) $query->where('status', $request->string('status'));
        if ($request->boolean('upcoming')) $query->where('starts_at', '>=', now());

        return response()->json(['data' => $query->orderBy('starts_at')->get()]);
    }

    public function show(JoinerDeparture $departure)
    {
        $this->reservations->releaseExpired($departure);
        return response()->json(['data' => $departure->fresh()->load([
            'service', 'bus', 'driver',
            'seats' => fn ($q) => $q->orderBy('seat_code'),
            'reservations' => fn ($q) => $q->where('status', 'confirmed')->with(['invoice:id,invoice_number,status,balance', 'passengers.seat'])->orderBy('created_at'),
        ])]);
    }

    public function store(StoreJoinerDepartureRequest $request)
    {
        $data = $request->validated();
        $service = Service::findOrFail($data['service_id']);

        if (!empty($data['bus_id'])) {
            $bus = \App\Models\Bus::findOrFail($data['bus_id']);
            if ((int) $data['capacity'] > (int) $bus->seating_capacity) {
                throw ValidationException::withMessages(['capacity' => "Capacity exceeds the selected vehicle's {$bus->seating_capacity} seats."]);
            }
        }

        $seatCodes = $data['seat_codes'] ?? array_map(fn ($n) => (string) $n, range(1, $data['capacity']));
        if (count($seatCodes) !== (int) $data['capacity']) {
            throw ValidationException::withMessages(['seat_codes' => 'Seat layout size must equal departure capacity.']);
        }

        $this->assertResourcesAvailable($data);
        unset($data['seat_codes']);

        // Resolve the service name for the code slug (destination context)
        $serviceNameForCode = Service::find($data['service_id'])?->name;

        $departure = DB::transaction(function () use ($data, $seatCodes, $request, $serviceNameForCode) {
            $code = !empty($data['code'])
                ? $data['code']
                : SalesReferenceService::generate('JNR', $serviceNameForCode, $data['starts_at']);
            $departure = JoinerDeparture::create([...$data, 'code' => $code, 'timezone' => $data['timezone'] ?? 'Asia/Manila', 'status' => $data['status'] ?? 'draft', 'created_by' => $request->user()->id]);

            foreach ($seatCodes as $seatCode) {
                JoinerDepartureSeat::create(['departure_id' => $departure->id, 'seat_code' => $seatCode]);
            }
            return $departure;
        });

        return response()->json(['data' => $departure->load(['service', 'bus', 'driver', 'seats'])], 201);
    }

    public function update(Request $request, JoinerDeparture $departure)
    {
        $data = $request->validate([
            'starts_at' => ['sometimes', 'date'],
            'ends_at' => ['sometimes', 'date', 'after:starts_at'],
            'booking_cutoff_at' => ['sometimes', 'date'],
            'capacity' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'bus_id' => ['nullable', 'integer', 'exists:buses,id'],
            'driver_id' => ['nullable', 'integer', 'exists:users,id'],
            'pickup_instructions' => ['nullable', 'string', 'max:255'],
            'status' => ['sometimes', 'in:draft,published,closed,cancelled,departed,completed'],
        ]);

        $departure->update($data);
        return response()->json(['data' => $departure->fresh()->load(['service', 'bus', 'driver', 'seats'])]);
    }


    public function hold(HoldJoinerSeatsRequest $request, JoinerDeparture $departure)
    {
        return response()->json(['data' => $this->reservations->hold($departure, $request->validated(), $request->user()->id)], 201);
    }

    public function confirm(ConfirmJoinerReservationRequest $request, JoinerReservation $reservation)
    {
        $data = $request->validated();
        return response()->json(['data' => $this->reservations->confirm($reservation, $data['passengers'], $data)]);
    }

    public function resources(Request $request)
    {
        $data = $request->validate([
            'starts_at' => ['required', 'date'],
            'ends_at' => ['required', 'date', 'after:starts_at'],
        ]);
        $data['starts_at'] = \Carbon\Carbon::parse($data['starts_at'])->toDateTimeString();
        $data['ends_at'] = \Carbon\Carbon::parse($data['ends_at'])->toDateTimeString();

        $conflictingBusIds = JoinerDeparture::whereNotIn('status', ['cancelled', 'completed'])
            ->where('starts_at', '<', $data['ends_at'])->where('ends_at', '>', $data['starts_at'])
            ->whereNotNull('bus_id')->pluck('bus_id');
        $conflictingDriverIds = JoinerDeparture::whereNotIn('status', ['cancelled', 'completed'])
            ->where('starts_at', '<', $data['ends_at'])->where('ends_at', '>', $data['starts_at'])
            ->whereNotNull('driver_id')->pluck('driver_id');
        $central = app(\App\Services\ResourceAllocationService::class)->conflicts($data['starts_at'], $data['ends_at']);
        $conflictingBusIds = $conflictingBusIds->merge($central['bus_ids'])->unique();
        $conflictingDriverIds = $conflictingDriverIds->merge($central['driver_ids'])->unique();

        $buses = \App\Models\Bus::orderBy('plate_number')->get(['id', 'plate_number', 'model', 'seating_capacity', 'status'])
            ->map(fn ($bus) => [...$bus->toArray(), 'available' => $bus->status === 'available' && !$conflictingBusIds->contains($bus->id)]);
        $drivers = \App\Models\User::where('role', 'driver')->where('is_active', true)->orderBy('first_name')->get(['id', 'first_name', 'last_name'])
            ->map(fn ($driver) => [...$driver->toArray(), 'available' => !$conflictingDriverIds->contains($driver->id)]);

        return response()->json(['data' => ['buses' => $buses, 'drivers' => $drivers]]);
    }

    public function manifest(JoinerDeparture $departure)
    {
        $departure->load([
            'service', 'bus', 'driver',
            'reservations' => fn ($q) => $q->where('status', 'confirmed')->with(['passengers.seat'])->orderBy('created_at'),
        ]);

        $pdf = app(\App\Services\DocumentPdfService::class)->render('pdf.joiner-manifest', ['departure' => $departure]);
        return $pdf->stream("Joiner_Manifest_{$departure->code}.pdf");
    }

    private function assertResourcesAvailable(array $data): void
    {
        $data['starts_at'] = \Carbon\Carbon::parse($data['starts_at'])->toDateTimeString();
        $data['ends_at'] = \Carbon\Carbon::parse($data['ends_at'])->toDateTimeString();
        foreach (['bus_id' => 'Vehicle', 'driver_id' => 'Driver'] as $column => $label) {
            if (empty($data[$column])) continue;
            $conflict = JoinerDeparture::where($column, $data[$column])
                ->whereNotIn('status', ['cancelled', 'completed'])
                ->where('starts_at', '<', $data['ends_at'])
                ->where('ends_at', '>', $data['starts_at'])
                ->exists();
            if ($conflict) throw ValidationException::withMessages([$column => "$label is already assigned during this interval."]);
        }
    }
}
