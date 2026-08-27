<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Educational Tour Package Manifest</title>
    <style>
        @page { size: A4; margin: 12mm 14mm 22mm; }
        * { box-sizing: border-box; }
        body { font-family: DejaVu Sans, sans-serif; color: #142033; font-size: 9px; margin: 0; }
        .header, .meta, .fleet, .signatures { width: 100%; border-collapse: collapse; }
        .header { border-bottom: 3px solid #123c69; padding-bottom: 8px; }
        .brand { font-size: 15px; font-weight: bold; color: #123c69; }
        .title { text-align: right; font-size: 15px; font-weight: bold; letter-spacing: 1px; }
        .meta { margin: 12px 0; background: #f1f6fb; }
        .meta td { padding: 7px 8px; border: 1px solid #dbe5ef; vertical-align: top; }
        .label { display: block; font-size: 7px; font-weight: bold; text-transform: uppercase; letter-spacing: .5px; color: #607087; margin-bottom: 2px; }
        .fleet th { background: #174a8b; color: #fff; padding: 7px 5px; text-align: left; font-size: 8px; text-transform: uppercase; }
        .fleet td { padding: 7px 5px; border: 1px solid #dbe5ef; }
        .section { font-size: 9px; font-weight: bold; color: #174a8b; text-transform: uppercase; letter-spacing: .6px; border-bottom: 1px solid #b9c8d8; padding-bottom: 4px; margin: 14px 0 6px; }
        .signatures { margin-top: 30px; }
        .signatures td { width: 33%; padding: 0 12px; text-align: center; }
        .line { border-top: 1px solid #39495d; padding-top: 4px; }
        .footer { display: none; }
        body > .header { display: none; }
        @include('pdf.partials.brand-styles')
    </style>
</head>
<body>
@include('pdf.partials.brand-header', ['documentTitle' => 'Educational Tour Package Manifest', 'documentReference' => $package->tour_code, 'documentDate' => $package->starts_at])
@include('pdf.partials.brand-footer', ['footerNote' => 'Confidential student manifest. Use only for the stated educational tour and protect personal information.'])

<table class="header">
    <tr>
        <td>
            <div class="brand">{{ $company['name'] ?? 'JVD Events and Travels Management Co.' }}</div>
            <div>{{ $company['address'] ?? '' }}</div>
        </td>
        <td class="title">
            EDUCATIONAL TOUR<br>
            MASTER MANIFEST<br>
            <span style="font-size:8px;color:#607087">{{ $package->tour_code }}</span>
        </td>
    </tr>
</table>

<table class="meta">
    <tr>
        <td>
            <span class="label">School / Organization</span>
            <strong>{{ $package->school_name }}</strong><br>
            {{ $package->grade_level ?: 'All Year Levels' }}
        </td>
        <td>
            <span class="label">Tour Package</span>
            <strong>{{ $package->name }}</strong><br>
            Code: {{ $package->tour_code }}
        </td>
        <td>
            <span class="label">Capacity & Rates</span>
            {{ $package->maximum_capacity }} Max Pax | Student: ₱{{ number_format($package->rate_per_head, 2) }} | Adult: ₱{{ number_format($package->adult_rate_per_head ?? $package->rate_per_head, 2) }}
        </td>
    </tr>
    <tr>
        <td>
            <span class="label">Departure Schedule</span>
            {{ $package->starts_at ? $package->starts_at->format('D, M d, Y h:i A') : '-' }}
        </td>
        <td>
            <span class="label">Return Schedule</span>
            {{ $package->ends_at ? $package->ends_at->format('D, M d, Y h:i A') : '-' }}
        </td>
        <td>
            <span class="label">Confirmed Registrations</span>
            <strong>{{ $package->participantBookings->count() }} Participants</strong> ({{ $package->participantBookings->whereIn('participant_type', ['student', 'child', null])->count() }} Students, {{ $package->participantBookings->whereIn('participant_type', ['adult', 'companion', 'guardian', 'teacher'])->count() }} Adults)
        </td>
    </tr>
    <tr>
        <td colspan="3">
            <span class="label">Assembly & Pickup Location</span>
            {{ $package->pickup_location }}
        </td>
    </tr>
</table>

<div class="section">Fleet and Vehicle Allocation</div>
<table class="fleet">
    <thead>
        <tr>
            <th>#</th>
            <th>Bus Number</th>
            <th>Plate Number</th>
            <th>Model</th>
            <th>Assigned Driver</th>
            <th>Seating Capacity</th>
            <th>Occupied Seats</th>
        </tr>
    </thead>
    <tbody>
        @forelse($package->busAssignments as $index => $assignment)
            @php
                $occupied = $package->participantBookings->where('bus_assignment_id', $assignment->id)->count();
            @endphp
            <tr>
                <td>{{ $index + 1 }}</td>
                <td><strong>Bus #{{ $assignment->sequence_number }}</strong></td>
                <td>{{ $assignment->bus?->plate_number ?? 'TBD' }}</td>
                <td>{{ $assignment->bus?->model ?? 'Standard Coach' }}</td>
                <td>{{ $assignment->driver ? trim($assignment->driver->first_name . ' ' . $assignment->driver->last_name) : 'Unassigned' }}</td>
                <td>{{ $assignment->capacity_snapshot }} seats</td>
                <td>{{ $occupied }} / {{ $assignment->capacity_snapshot }}</td>
            </tr>
        @empty
            <tr>
                <td colspan="7" style="text-align: center; color: #607087;">No buses currently assigned to this package.</td>
            </tr>
        @endforelse
    </tbody>
</table>

<div class="section">Participant Roster</div>
<table class="fleet">
    <thead>
        <tr>
            <th>#</th>
            <th>Booking Ref</th>
            <th>Type</th>
            <th>Participant Name</th>
            <th>Student ID</th>
            <th>Section</th>
            <th>Assigned Bus & Seat</th>
            <th>Rate</th>
            <th>Status</th>
            <th>Emergency / Contact</th>
        </tr>
    </thead>
    <tbody>
        @forelse($package->participantBookings as $index => $booking)
            <tr>
                <td>{{ $index + 1 }}</td>
                <td>{{ $booking->reference }}</td>
                <td><strong style="color: {{ in_array($booking->participant_type, ['adult', 'companion', 'guardian', 'teacher']) ? '#059669' : '#2563eb' }};">{{ in_array($booking->participant_type, ['adult', 'companion', 'guardian', 'teacher']) ? 'Adult / Companion' : 'Student' }}</strong></td>
                <td><strong>{{ $booking->full_name }}</strong></td>
                <td>{{ $booking->student_number ?: '-' }}</td>
                <td>{{ $booking->section ?: '-' }}</td>
                <td>
                    @if($booking->busAssignment)
                        Bus #{{ $booking->busAssignment->sequence_number }} ({{ $booking->seat_number ?: 'General' }})
                    @else
                        <span style="color:#d97706;">Unassigned</span>
                    @endif
                </td>
                <td>₱{{ number_format($booking->rate_snapshot ?: $booking->amount_due, 2) }}</td>
                <td>
                    <span style="text-transform: capitalize;">{{ $booking->payment_status }}</span>
                </td>
                <td>{{ $booking->emergency_contact_name ?: $booking->guardian_name ?: $booking->participant_phone }} ({{ $booking->emergency_contact_phone ?: $booking->guardian_phone ?: $booking->participant_phone }})</td>
            </tr>
        @empty
            <tr>
                <td colspan="10" style="text-align: center; color: #607087;">No registered participants for this tour package yet.</td>
            </tr>
        @endforelse
    </tbody>
</table>

@if($package->operations_notes)
<div class="section">Operations Notes</div>
<div>{{ $package->operations_notes }}</div>
@endif

<table class="signatures">
    <tr>
        <td><div class="line">Prepared by (Sales Coordinator)</div></td>
        <td><div class="line">School Coordinator / Lead Teacher</div></td>
        <td><div class="line">Operations & Dispatch Approval</div></td>
    </tr>
</table>

<div class="footer">Confidential operational document | Generated {{ now()->format('M d, Y h:i A') }} | Student information must be handled confidentially.</div>
</body>
</html>
