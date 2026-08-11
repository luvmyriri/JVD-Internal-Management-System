<?php

namespace App\Http\Controllers\Sales;

use App\Http\Controllers\Controller;
use App\Http\Requests\Sales\StoreCharterBookingRequest;
use App\Http\Requests\Sales\StoreCharterRatePlanRequest;
use App\Http\Requests\Sales\UpdateCharterBookingRequest;
use App\Models\Bus;
use App\Models\CharterBooking;
use App\Models\CharterRatePlan;
use App\Models\JoinerDeparture;
use App\Models\PmsSchedule;
use App\Models\Service;
use App\Models\SystemSetting;
use App\Models\TripTicket;
use App\Models\User;
use App\Services\CharterBookingService;
use App\Services\CharterRateCalculator;
use App\Services\DocumentPdfService;
use App\Services\PsgcService;
use App\Services\ResourceAllocationService;
use App\Services\RouteEstimateService;
use App\Services\SalesLifecycleService;
use App\Services\SalesOrderService;
use App\Services\TollMatrixService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class CharterController extends Controller
{
    public function __construct(
        private readonly CharterBookingService $charters,
        private readonly CharterRateCalculator $rateCalculator,
        private readonly RouteEstimateService $routes,
        private readonly PsgcService $psgc,
        private readonly TollMatrixService $tollMatrix,
    ) {}

    public function ratePlans()
    {
        return response()->json(['data' => CharterRatePlan::with('service:id,name,description,images')->where('is_active', true)->orderBy('vehicle_class')->orderBy('name')->get()]);
    }

    public function storeRatePlan(StoreCharterRatePlanRequest $request)
    {
        $data = $request->validated();
        $service = Service::findOrFail($data['service_id']);
        if ($service->is_sales_catalog === false) {
            throw ValidationException::withMessages(['service_id' => 'Select an active sales catalog service.']);
        }
        $pricing = $this->rateCalculator->calculate($data);
        unset($pricing['recommended_base_price']);
        $plan = CharterRatePlan::create([...$data, ...$pricing, 'created_by' => $request->user()->id]);

        return response()->json(['data' => $plan->load('service:id,name,description,images')], 201);
    }

    public function updateRatePlan(StoreCharterRatePlanRequest $request, CharterRatePlan $ratePlan)
    {
        $data = $request->validated();
        $pricing = $this->rateCalculator->calculate($data);
        unset($pricing['recommended_base_price']);
        $ratePlan->update([...$data, ...$pricing]);

        return response()->json(['data' => $ratePlan->fresh()->load('service:id,name,description,images')]);
    }

    public function destroyRatePlan(CharterRatePlan $ratePlan)
    {
        $ratePlan->update(['is_active' => false]);

        return response()->json([
            'message' => 'Charter rate plan deactivated. Existing bookings and the catalog service were preserved.',
        ]);
    }

    public function locationSearch(Request $request)
    {
        $data = $request->validate(['q' => ['required', 'string', 'min:3', 'max:255']]);

        return response()->json(['data' => $this->routes->search($data['q'])]);
    }

    public function officialLocationSearch(Request $request)
    {
        $data = $request->validate(['q' => ['required', 'string', 'min:3', 'max:255']]);

        return response()->json(['data' => $this->psgc->search($data['q'])]);
    }

    public function reverseLocation(Request $request)
    {
        $data = $request->validate([
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
        ]);

        return response()->json(['data' => $this->routes->reverse((float) $data['latitude'], (float) $data['longitude'])]);
    }

    public function routeEstimate(Request $request)
    {
        $data = $request->validate([
            'pickup_location' => ['required', 'string', 'max:255'],
            'destination' => ['required', 'string', 'max:255'],
            'garage_location' => ['nullable', 'string', 'max:255'],
            'include_garage' => ['nullable', 'boolean'],
            'trip_type' => ['nullable', 'in:one_way,round_trip'],
            'vehicle_class' => ['nullable', 'in:bus,coaster,van'],
            'pickup_coordinates' => ['nullable', 'array'],
            'pickup_coordinates.latitude' => ['required_with:pickup_coordinates', 'numeric', 'between:-90,90'],
            'pickup_coordinates.longitude' => ['required_with:pickup_coordinates', 'numeric', 'between:-180,180'],
            'destination_coordinates' => ['nullable', 'array'],
            'destination_coordinates.latitude' => ['required_with:destination_coordinates', 'numeric', 'between:-90,90'],
            'destination_coordinates.longitude' => ['required_with:destination_coordinates', 'numeric', 'between:-180,180'],
            'garage_coordinates' => ['nullable', 'array'],
            'garage_coordinates.latitude' => ['required_with:garage_coordinates', 'numeric', 'between:-90,90'],
            'garage_coordinates.longitude' => ['required_with:garage_coordinates', 'numeric', 'between:-180,180'],
            'outbound_stops' => ['nullable', 'array', 'max:10'],
            'outbound_stops.*.label' => ['required', 'string', 'max:255'],
            'outbound_stops.*.latitude' => ['nullable', 'required_with:outbound_stops.*.longitude', 'numeric', 'between:-90,90'],
            'outbound_stops.*.longitude' => ['nullable', 'required_with:outbound_stops.*.latitude', 'numeric', 'between:-180,180'],
            'return_stops' => ['nullable', 'array', 'max:10'],
            'return_stops.*.label' => ['required', 'string', 'max:255'],
            'return_stops.*.latitude' => ['nullable', 'required_with:return_stops.*.longitude', 'numeric', 'between:-90,90'],
            'return_stops.*.longitude' => ['nullable', 'required_with:return_stops.*.latitude', 'numeric', 'between:-180,180'],
        ]);

        return response()->json(['data' => $this->routes->estimate($data)]);
    }

    public function tollMatrix()
    {
        return response()->json(['data' => $this->tollMatrix->catalog()]);
    }

    public function calculateTolls(Request $request)
    {
        $data = $request->validate([
            'segments' => ['required', 'array', 'min:1', 'max:10'],
            'segments.*.network_id' => ['required', 'string', 'max:50'],
            'segments.*.entry_point_id' => ['required', 'integer'],
            'segments.*.exit_point_id' => ['required', 'integer'],
        ]);

        return response()->json(['data' => $this->tollMatrix->calculate($data['segments'])]);
    }

    public function bookings()
    {
        return response()->json(['data' => CharterBooking::with(['ratePlan.service', 'bus', 'driver', 'invoice:id,invoice_number,status,balance'])->orderByDesc('starts_at')->limit(100)->get()]);
    }

    public function quote(Request $request)
    {
        $data = $request->validate([
            'rate_plan_id' => ['required', 'integer', 'exists:charter_rate_plans,id'],
            'starts_at' => ['required', 'date'], 'ends_at' => ['required', 'date', 'after:starts_at'],
            'estimated_kilometers' => ['required', 'numeric', 'min:0', 'max:10000'],
        ]);
        $plan = CharterRatePlan::where('is_active', true)->findOrFail($data['rate_plan_id']);
        $pricing = $this->charters->calculate($plan, $data['starts_at'], $data['ends_at'], (float) $data['estimated_kilometers']);
        $taxRate = (float) SystemSetting::getValue('vat_rate', 0.12);

        return response()->json(['data' => [...$pricing, 'tax_rate' => $taxRate, 'tax_amount' => round($pricing['subtotal'] * $taxRate, 2), 'total' => round($pricing['subtotal'] * (1 + $taxRate), 2)]]);
    }

    public function resources(Request $request)
    {
        $data = $request->validate(['starts_at' => ['required', 'date'], 'ends_at' => ['required', 'date', 'after:starts_at']]);
        $data['starts_at'] = Carbon::parse($data['starts_at'])->toDateTimeString();
        $data['ends_at'] = Carbon::parse($data['ends_at'])->toDateTimeString();
        $charterOverlap = fn ($query) => $query->where('starts_at', '<', $data['ends_at'])->where('ends_at', '>', $data['starts_at'])->whereNotIn('status', ['cancelled', 'completed']);
        $joinerOverlap = fn ($query) => $query->where('starts_at', '<', $data['ends_at'])->where('ends_at', '>', $data['starts_at'])->whereNotIn('status', ['cancelled', 'completed']);
        $busIds = $charterOverlap(CharterBooking::whereNotNull('bus_id'))->pluck('bus_id')->merge($joinerOverlap(JoinerDeparture::whereNotNull('bus_id'))->pluck('bus_id'))->unique();
        $driverIds = $charterOverlap(CharterBooking::whereNotNull('driver_id'))->pluck('driver_id')->merge($joinerOverlap(JoinerDeparture::whereNotNull('driver_id'))->pluck('driver_id'))->unique();
        $startDate = Carbon::parse($data['starts_at'])->toDateString();
        $endDate = Carbon::parse($data['ends_at'])->toDateString();
        $busIds = $busIds
            ->merge(TripTicket::where('status', '!=', 'cancelled')->whereBetween('date_of_travel', [$startDate, $endDate])->pluck('bus_id'))
            ->merge(PmsSchedule::where('status', '!=', 'cancelled')->whereBetween('maintenance_date', [$startDate, $endDate])->pluck('bus_id'))->filter()->unique();
        $driverIds = $driverIds
            ->merge(TripTicket::where('status', '!=', 'cancelled')->whereBetween('date_of_travel', [$startDate, $endDate])->pluck('driver_id'))->filter()->unique();
        $central = app(ResourceAllocationService::class)->conflicts($data['starts_at'], $data['ends_at']);
        $busIds = $busIds->merge($central['bus_ids'])->filter()->unique();
        $driverIds = $driverIds->merge($central['driver_ids'])->filter()->unique();
        $buses = Bus::orderBy('plate_number')->get(['id', 'plate_number', 'model', 'vehicle_type', 'bus_category', 'seating_capacity', 'status'])->map(fn (Bus $bus) => [...$bus->toArray(), 'available' => $bus->status === 'available' && ! $busIds->contains($bus->id)]);
        $drivers = User::where('role', 'driver')->where('is_active', true)->orderBy('first_name')->get(['id', 'first_name', 'last_name'])->map(fn (User $driver) => [...$driver->toArray(), 'available' => ! $driverIds->contains($driver->id)]);

        return response()->json(['data' => ['buses' => $buses, 'drivers' => $drivers]]);
    }

    public function storeBooking(StoreCharterBookingRequest $request)
    {
        return response()->json(['data' => $this->charters->create($request->validated(), $request->user()->id)], 201);
    }

    public function updateBooking(UpdateCharterBookingRequest $request, CharterBooking $booking)
    {
        return response()->json(['data' => $this->charters->update($booking, $request->validated())]);
    }

    public function requestCancellation(CharterBooking $booking)
    {
        if (! $booking->invoice) {
            throw ValidationException::withMessages([
                'booking' => 'This booking has no invoice and cannot enter the financial cancellation workflow.',
            ]);
        }
        $order = $booking->invoice->salesOrder
            ?? app(SalesOrderService::class)->captureInvoice($booking->invoice, auth()->id());
        $adjustment = app(SalesLifecycleService::class)->request(
            $order,
            'cancellation',
            request('reason', 'Charter booking cancellation requested'),
            [],
            auth()->id()
        );

        return response()->json([
            'message' => 'Cancellation submitted for approval.',
            'data' => $adjustment,
        ], 202);
    }

    public function confirmation(CharterBooking $booking, DocumentPdfService $documents)
    {
        $booking->load(['ratePlan.service', 'bus', 'driver', 'invoice.items']);

        return $documents->render('pdf.charter-confirmation', ['booking' => $booking])
            ->stream("Charter_Confirmation_{$booking->reference}.pdf");
    }

    public function dispatchSheet(CharterBooking $booking, DocumentPdfService $documents)
    {
        $booking->load(['ratePlan.service', 'bus', 'driver', 'invoice']);

        return $documents->render('pdf.charter-dispatch-sheet', ['booking' => $booking])
            ->stream("Charter_Dispatch_{$booking->reference}.pdf");
    }
}
