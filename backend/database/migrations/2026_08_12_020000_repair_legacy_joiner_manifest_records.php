<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        $bookings = DB::table('bookings')
            ->join('invoices', 'invoices.id', '=', 'bookings.invoice_id')
            ->join('joiner_departures', 'joiner_departures.code', '=', 'bookings.tour_code')
            ->whereNotNull('bookings.seat_map')
            ->whereNotExists(function ($query) {
                $query->selectRaw('1')
                    ->from('joiner_reservations')
                    ->whereColumn('joiner_reservations.invoice_id', 'invoices.id');
            })
            ->select([
                'bookings.invoice_id', 'bookings.seat_map', 'joiner_departures.id as departure_id',
                'joiner_departures.created_by as departure_created_by', 'invoices.customer_id',
                'invoices.customer_name', 'invoices.customer_email', 'invoices.customer_contact',
                'invoices.created_by', 'invoices.created_at',
            ])
            ->orderBy('invoices.id')
            ->get();

        foreach ($bookings as $booking) {
            DB::transaction(function () use ($booking) {
                $seatCodes = $this->seatCodes($booking->seat_map);
                if ($seatCodes === []) {
                    return;
                }

                $seats = DB::table('joiner_departure_seats')
                    ->where('departure_id', $booking->departure_id)
                    ->whereIn('seat_code', $seatCodes)
                    ->whereNull('reservation_id')
                    ->whereIn('status', ['confirmed', 'occupied'])
                    ->lockForUpdate()
                    ->get()
                    ->keyBy('seat_code');

                if ($seats->count() !== count($seatCodes)) {
                    return;
                }

                $invoiceItem = DB::table('invoice_items')
                    ->where('invoice_id', $booking->invoice_id)
                    ->orderBy('id')
                    ->first();
                $names = $this->passengerNames($booking->invoice_id, $invoiceItem?->item_description, $booking->customer_name);
                $adultCount = max(0, (int) ($invoiceItem?->adults ?? count($seatCodes)));
                $now = now();

                $reservationId = DB::table('joiner_reservations')->insertGetId([
                    'departure_id' => $booking->departure_id,
                    'customer_id' => $booking->customer_id,
                    'invoice_id' => $booking->invoice_id,
                    'reference' => 'LEGACY-JNR-'.$booking->invoice_id.'-'.Str::lower(Str::random(8)),
                    'lead_name' => $booking->customer_name ?: 'Legacy customer',
                    'lead_email' => $booking->customer_email,
                    'lead_contact' => $booking->customer_contact,
                    'passenger_count' => count($seatCodes),
                    'status' => 'confirmed',
                    'hold_expires_at' => null,
                    'created_by' => $booking->created_by ?: $booking->departure_created_by,
                    'created_at' => $booking->created_at ?: $now,
                    'updated_at' => $now,
                ]);

                foreach ($seatCodes as $index => $seatCode) {
                    $name = $names[$index] ?? ['first_name' => 'Passenger', 'last_name' => $seatCode];
                    DB::table('joiner_passengers')->insert([
                        'reservation_id' => $reservationId,
                        'departure_seat_id' => $seats[$seatCode]->id,
                        'first_name' => $name['first_name'],
                        'last_name' => $name['last_name'],
                        'passenger_type' => $index < $adultCount ? 'adult' : 'child',
                        'date_of_birth' => $name['date_of_birth'] ?? null,
                        'emergency_contact' => $name['emergency_contact'] ?? ($index === 0 ? $booking->customer_contact : null),
                        'special_needs' => $name['special_needs'] ?? null,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                }

                DB::table('joiner_departure_seats')
                    ->whereIn('id', $seats->pluck('id'))
                    ->update(['reservation_id' => $reservationId, 'updated_at' => $now]);
            });
        }
    }

    public function down(): void
    {
        $reservationIds = DB::table('joiner_reservations')
            ->where('reference', 'like', 'LEGACY-JNR-%')
            ->pluck('id');

        DB::table('joiner_departure_seats')->whereIn('reservation_id', $reservationIds)->update(['reservation_id' => null]);
        DB::table('joiner_reservations')->whereIn('id', $reservationIds)->delete();
    }

    private function seatCodes(mixed $value): array
    {
        $seats = is_array($value) ? $value : json_decode((string) $value, true);

        return collect(is_array($seats) ? $seats : [])
            ->map(fn ($seat) => preg_replace('/^(seat|s)\s*/i', '', trim((string) $seat)))
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    private function passengerNames(int $invoiceId, ?string $description, ?string $customerName): array
    {
        $recorded = DB::table('invoice_passengers')->where('invoice_id', $invoiceId)->orderBy('id')->get();
        if ($recorded->isNotEmpty()) {
            return $recorded->map(fn ($passenger) => [
                'first_name' => $passenger->first_name,
                'last_name' => $passenger->last_name,
                'date_of_birth' => $passenger->date_of_birth,
                'emergency_contact' => $passenger->emergency_contact,
                'special_needs' => $passenger->special_needs,
            ])->all();
        }

        $names = [];
        if ($description && preg_match('/Passengers:\s*(.*?)\.\s*Tour Code:/i', $description, $match)) {
            $names = array_map('trim', explode(',', $match[1]));
        }
        if ($names === [] && $customerName) {
            $names = [$customerName];
        }

        return collect($names)->filter()->map(function (string $fullName) {
            $parts = preg_split('/\s+/', trim($fullName)) ?: [];
            $firstName = array_shift($parts) ?: 'Passenger';

            return ['first_name' => $firstName, 'last_name' => implode(' ', $parts) ?: 'Name unavailable'];
        })->values()->all();
    }
};
