<?php

namespace App\Http\Controllers\Sales;

use App\Http\Controllers\Controller;
use App\Http\Requests\Sales\StoreEducationalBookingRequest;
use App\Http\Requests\Sales\StoreEducationalProgramRequest;
use App\Models\Bus;
use App\Models\CharterBooking;
use App\Models\EducationalTourBooking;
use App\Models\EducationalTourProgram;
use App\Models\EducationalTourVehicle;
use App\Models\JoinerDeparture;
use App\Models\User;
use App\Services\EducationalTourBookingService;
use App\Services\DocumentPdfService;
use Illuminate\Http\Request;

class EducationalTourController extends Controller
{
    public function __construct(private readonly EducationalTourBookingService $education) {}
    public function programs()
    {
        $programs = EducationalTourProgram::where('is_active', true)
            ->orderBy('name')
            ->get()
            ->map(fn (EducationalTourProgram $program) => $this->programData($program));

        return response()->json(['data' => $programs]);
    }

    public function bookings() { return response()->json(['data' => EducationalTourBooking::with(['program', 'vehicles.bus', 'vehicles.driver', 'invoice:id,invoice_number,status,balance'])->orderByDesc('starts_at')->limit(100)->get()]); }
    public function storeProgram(StoreEducationalProgramRequest $request)
    {
        $program = EducationalTourProgram::create([
            ...$request->validated(),
            'created_by' => $request->user()->id,
        ]);

        return response()->json(['data' => $this->programData($program)], 201);
    }
    public function quote(Request $request)
    {
        $data = $request->validate(['program_id' => ['required', 'exists:educational_tour_programs,id'], 'student_count' => ['required', 'integer', 'min:1'], 'chaperone_count' => ['required', 'integer', 'min:0']]);
        $pricing = $this->education->calculate(EducationalTourProgram::findOrFail($data['program_id']), $data['student_count'], $data['chaperone_count']);
        $taxRate = (float) \App\Models\SystemSetting::getValue('vat_rate', 0.12);
        return response()->json(['data' => [...$pricing, 'tax_rate' => $taxRate, 'tax_amount' => round($pricing['subtotal'] * $taxRate, 2), 'total' => round($pricing['subtotal'] * (1 + $taxRate), 2)]]);
    }
    public function resources(Request $request)
    {
        $data = $request->validate(['starts_at' => ['required', 'date'], 'ends_at' => ['required', 'date', 'after:starts_at']]);
        $data['starts_at'] = \Carbon\Carbon::parse($data['starts_at'])->toDateTimeString();
        $data['ends_at'] = \Carbon\Carbon::parse($data['ends_at'])->toDateTimeString();
        $overlap = fn ($query) => $query->where('starts_at', '<', $data['ends_at'])->where('ends_at', '>', $data['starts_at'])->whereNotIn('status', ['cancelled', 'completed']);
        $educationAssignments = \Illuminate\Support\Facades\DB::table('educational_tour_vehicles as vehicle')
            ->join('educational_tour_bookings as booking', 'booking.id', '=', 'vehicle.booking_id')
            ->where('booking.starts_at', '<', $data['ends_at'])->where('booking.ends_at', '>', $data['starts_at'])
            ->whereNotIn('booking.status', ['cancelled', 'completed']);
        $busIds = (clone $educationAssignments)->pluck('vehicle.bus_id')->merge($overlap(CharterBooking::whereNotNull('bus_id'))->pluck('bus_id'))->merge($overlap(JoinerDeparture::whereNotNull('bus_id'))->pluck('bus_id'))->unique();
        $driverIds = (clone $educationAssignments)->pluck('vehicle.driver_id')->merge($overlap(CharterBooking::whereNotNull('driver_id'))->pluck('driver_id'))->merge($overlap(JoinerDeparture::whereNotNull('driver_id'))->pluck('driver_id'))->unique();
        $startDate = \Carbon\Carbon::parse($data['starts_at'])->toDateString(); $endDate = \Carbon\Carbon::parse($data['ends_at'])->toDateString();
        $busIds = $busIds->merge(\App\Models\TripTicket::where('status', '!=', 'cancelled')->whereBetween('date_of_travel', [$startDate, $endDate])->pluck('bus_id'))->merge(\App\Models\PmsSchedule::where('status', '!=', 'cancelled')->whereBetween('maintenance_date', [$startDate, $endDate])->pluck('bus_id'))->filter()->unique();
        $driverIds = $driverIds->merge(\App\Models\TripTicket::where('status', '!=', 'cancelled')->whereBetween('date_of_travel', [$startDate, $endDate])->pluck('driver_id'))->filter()->unique();
        $central = app(\App\Services\ResourceAllocationService::class)->conflicts($data['starts_at'], $data['ends_at']);
        $busIds = $busIds->merge($central['bus_ids'])->filter()->unique();
        $driverIds = $driverIds->merge($central['driver_ids'])->filter()->unique();
        $buses = Bus::whereIn('vehicle_type', ['bus', 'coaster'])->orderBy('plate_number')->get(['id','plate_number','model','vehicle_type','seating_capacity','status'])->map(fn ($bus) => [...$bus->toArray(), 'available' => $bus->status === 'available' && !$busIds->contains($bus->id)]);
        $drivers = User::where('role', 'driver')->where('is_active', true)->orderBy('first_name')->get(['id','first_name','last_name'])->map(fn ($driver) => [...$driver->toArray(), 'available' => !$driverIds->contains($driver->id)]);
        return response()->json(['data' => ['buses' => $buses, 'drivers' => $drivers]]);
    }
    public function storeBooking(StoreEducationalBookingRequest $request) { return response()->json(['data' => $this->education->create($request->validated(), $request->user()->id)], 201); }
    public function manifest(EducationalTourBooking $booking, DocumentPdfService $documents)
    {
        $booking->load(['program.service', 'vehicles.bus', 'vehicles.driver', 'invoice']);
        return $documents->render('pdf.educational-tour-manifest', ['booking' => $booking])
            ->stream("Educational_Tour_Manifest_{$booking->reference}.pdf", ['Attachment' => false]);
    }

    private function programData(EducationalTourProgram $program): array
    {
        return [
            'id' => $program->id,
            'name' => $program->name,
            'learning_objectives' => $program->learning_objectives,
            'default_stops' => $program->default_stops ?? [],
            'minimum_students' => (int) $program->minimum_students,
            'students_per_chaperone' => (int) $program->students_per_chaperone,
            'students_per_free_chaperone' => (int) $program->students_per_free_chaperone,
            'student_price' => (float) $program->student_price,
            'additional_chaperone_price' => (float) $program->additional_chaperone_price,
            'includes_meals' => (bool) $program->includes_meals,
            'includes_coordinator' => (bool) $program->includes_coordinator,
            'includes_insurance' => (bool) $program->includes_insurance,
            'includes_shirt' => (bool) $program->includes_shirt,
            'created_at' => $program->created_at?->toISOString(),
            'updated_at' => $program->updated_at?->toISOString(),
        ];
    }
}
