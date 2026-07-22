<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Joiner Passenger Manifest</title>
    <style>
        @page { size: A4; margin: 12mm 14mm; }
        * { box-sizing: border-box; }
        body { font-family: DejaVu Sans, sans-serif; color: #142033; font-size: 9px; margin: 0; }
        .header { width: 100%; border-collapse: collapse; border-bottom: 3px solid #123c69; padding-bottom: 8px; }
        .header td { vertical-align: top; }
        .brand { font-size: 16px; font-weight: 900; color: #123c69; }
        .title { text-align: right; font-size: 15px; font-weight: 900; letter-spacing: 1px; }
        .meta { width: 100%; border-collapse: collapse; margin: 12px 0; background: #f1f6fb; }
        .meta td { padding: 6px 8px; border: 1px solid #dbe5ef; vertical-align: top; }
        .label { display: block; color: #607087; font-size: 7px; font-weight: 900; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 2px; }
        table.roster { width: 100%; border-collapse: collapse; }
        .roster th { background: #123c69; color: white; font-size: 8px; text-transform: uppercase; padding: 7px 5px; text-align: left; }
        .roster td { padding: 6px 5px; border-bottom: 1px solid #dbe5ef; vertical-align: top; }
        .seat { font-weight: 900; color: #123c69; }
        .footer { margin-top: 14px; border-top: 1px solid #b9c8d8; padding-top: 8px; color: #607087; font-size: 7px; }
        .signatures { width: 100%; border-collapse: collapse; margin-top: 28px; }
        .signatures td { width: 33.33%; text-align: center; padding: 0 12px; }
        .line { border-top: 1px solid #39495d; padding-top: 4px; }
    </style>
</head>
<body>
    <table class="header"><tr><td><div class="brand">{{ $company['name'] }}</div><div>{{ $company['phone'] }} | {{ $company['email'] }}</div></td><td class="title">PASSENGER MANIFEST<br><span style="font-size:9px;color:#607087;">{{ $departure->code }}</span></td></tr></table>
    <table class="meta">
        <tr>
            <td><span class="label">Tour</span>{{ $departure->service->name }}</td>
            <td><span class="label">Departure</span>{{ $departure->starts_at->format('M d, Y h:i A') }}</td>
            <td><span class="label">Return</span>{{ $departure->ends_at->format('M d, Y h:i A') }}</td>
        </tr>
        <tr>
            <td><span class="label">Vehicle</span>{{ $departure->bus ? $departure->bus->plate_number.' · '.$departure->bus->model : 'To be assigned' }}</td>
            <td><span class="label">Driver</span>{{ $departure->driver ? $departure->driver->first_name.' '.$departure->driver->last_name : 'To be assigned' }}</td>
            <td><span class="label">Confirmed / Capacity</span>{{ $departure->confirmed_count }} / {{ $departure->capacity }}</td>
        </tr>
        @if($departure->pickup_instructions)<tr><td colspan="3"><span class="label">Pickup instructions</span>{{ $departure->pickup_instructions }}</td></tr>@endif
    </table>

    <table class="roster">
        <thead><tr><th style="width:6%;">#</th><th style="width:9%;">Seat</th><th style="width:25%;">Passenger</th><th style="width:9%;">Type</th><th style="width:20%;">Lead customer</th><th style="width:18%;">Emergency contact</th><th>Notes</th></tr></thead>
        <tbody>
        @php $row = 1; @endphp
        @forelse($departure->reservations as $reservation)
            @foreach($reservation->passengers->sortBy(fn($passenger) => $passenger->seat?->seat_code) as $passenger)
            <tr>
                <td>{{ $row++ }}</td>
                <td class="seat">{{ $passenger->seat?->seat_code }}</td>
                <td><strong>{{ $passenger->first_name }} {{ $passenger->last_name }}</strong></td>
                <td>{{ ucfirst($passenger->passenger_type) }}</td>
                <td>{{ $reservation->lead_name }}<br><span style="color:#607087;">{{ $reservation->lead_contact }}</span></td>
                <td>{{ $passenger->emergency_contact ?: '—' }}</td>
                <td>{{ $passenger->special_needs ?: '' }}</td>
            </tr>
            @endforeach
        @empty
            <tr><td colspan="7" style="text-align:center;padding:20px;color:#607087;">No confirmed passengers.</td></tr>
        @endforelse
        </tbody>
    </table>

    <table class="signatures"><tr><td><div class="line">Prepared by</div></td><td><div class="line">Driver / Tour coordinator</div></td><td><div class="line">Operations approval</div></td></tr></table>
    <div class="footer">Operational document · Generated {{ now()->format('M d, Y h:i A') }} · Passenger information must be handled confidentially and used only for this departure.</div>
</body>
</html>
