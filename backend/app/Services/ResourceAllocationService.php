<?php

namespace App\Services;

use App\Models\Bus;
use App\Models\ResourceAllocation;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * The single write path for vehicle and driver reservations. Every operational
 * workflow writes an interval here; callers may still retain their domain data,
 * but must not independently decide whether a resource is free.
 */
class ResourceAllocationService
{
    /** IDs blocked for a proposed interval, including configured turnaround buffers. */
    public function conflicts($startsAt, $endsAt): array
    {
        $start=Carbon::parse($startsAt);$end=Carbon::parse($endsAt);
        $vehicleBuffer=(int)\App\Models\SystemSetting::getValue('logistics.vehicle_turnaround_minutes',30);
        $driverBuffer=(int)\App\Models\SystemSetting::getValue('logistics.driver_turnaround_minutes',120);
        $active=fn($query)=>$query->whereNotIn('status',['cancelled','completed']);
        return [
            'bus_ids'=>$active(ResourceAllocation::whereNotNull('bus_id'))->where('starts_at','<',$end->copy()->addMinutes($vehicleBuffer))->where('ends_at','>',$start->copy()->subMinutes($vehicleBuffer))->pluck('bus_id')->unique()->values(),
            'driver_ids'=>$active(ResourceAllocation::whereNotNull('driver_id'))->where('starts_at','<',$end->copy()->addMinutes($driverBuffer))->where('ends_at','>',$start->copy()->subMinutes($driverBuffer))->pluck('driver_id')->unique()->values(),
        ];
    }

    public function reserve(Model $source, ?int $busId, ?int $driverId, $startsAt, $endsAt, ?string $reference = null, string $status = 'confirmed'): void
    {
        $start = Carbon::parse($startsAt);
        $end = Carbon::parse($endsAt);
        if (!$busId && !$driverId) return;
        if ($end->lessThanOrEqualTo($start)) {
            throw ValidationException::withMessages(['schedule' => 'Allocation end time must be after its start time.']);
        }

        if ($busId) Bus::lockForUpdate()->findOrFail($busId);
        if ($driverId) User::lockForUpdate()->findOrFail($driverId);

        $this->assertAvailable($busId, $driverId, $start, $end, $source->getMorphClass(), $source->getKey());

        ResourceAllocation::updateOrCreate(
            ['source_type' => $source->getMorphClass(), 'source_id' => $source->getKey(), 'bus_id' => $busId],
            ['driver_id' => $driverId, 'starts_at' => $start, 'ends_at' => $end, 'status' => $status, 'reference' => $reference]
        );
    }

    public function release(Model $source): void
    {
        ResourceAllocation::where('source_type', $source->getMorphClass())->where('source_id', $source->getKey())
            ->update(['status' => 'cancelled']);
    }

    public function assertAvailable(?int $busId, ?int $driverId, Carbon $start, Carbon $end, ?string $excludeType = null, ?int $excludeId = null): void
    {
        $overlap = fn ($query, Carbon $windowStart, Carbon $windowEnd) => $query->where('starts_at', '<', $windowEnd)->where('ends_at', '>', $windowStart)
            ->whereNotIn('status', ['cancelled', 'completed'])
            ->when($excludeType && $excludeId, fn ($q) => $q->where(fn ($x) => $x->where('source_type', '!=', $excludeType)->orWhere('source_id', '!=', $excludeId)));

        $vehicleBuffer = (int) \App\Models\SystemSetting::getValue('logistics.vehicle_turnaround_minutes', 30);
        $driverBuffer = (int) \App\Models\SystemSetting::getValue('logistics.driver_turnaround_minutes', 120);
        if ($busId && $overlap(ResourceAllocation::where('bus_id', $busId)->lockForUpdate(), $start->copy()->subMinutes($vehicleBuffer), $end->copy()->addMinutes($vehicleBuffer))->exists()) {
            throw ValidationException::withMessages(['bus_id' => 'Vehicle is already allocated for this time window.']);
        }
        if ($driverId && $overlap(ResourceAllocation::where('driver_id', $driverId)->lockForUpdate(), $start->copy()->subMinutes($driverBuffer), $end->copy()->addMinutes($driverBuffer))->exists()) {
            throw ValidationException::withMessages(['driver_id' => "Driver is unavailable or does not have the required {$driverBuffer}-minute turnaround."]);
        }
    }
}
