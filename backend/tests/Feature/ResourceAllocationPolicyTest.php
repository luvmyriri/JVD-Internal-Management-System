<?php

namespace Tests\Feature;

use App\Models\DriverUnavailability;
use App\Models\User;
use App\Services\ResourceAllocationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class ResourceAllocationPolicyTest extends TestCase
{
    use RefreshDatabase;

    public function test_driver_leave_and_turnaround_are_enforced_by_central_allocation(): void
    {
        $actor=User::factory()->superAdmin()->create();
        $driver=User::factory()->create(['role'=>'driver','is_active'=>true]);
        $start=now()->addMonth()->startOfDay()->addHours(8);
        DB::transaction(fn()=>DriverUnavailability::create(['driver_id'=>$driver->id,'starts_at'=>$start,'ends_at'=>$start->copy()->addHours(4),'type'=>'leave','status'=>'approved','reason'=>'Approved leave','created_by'=>$actor->id,'approved_by'=>$actor->id,'approved_at'=>now()]));

        $this->expectException(ValidationException::class);
        app(ResourceAllocationService::class)->assertAvailable(null,$driver->id,$start->copy()->addHours(5),$start->copy()->addHours(8));
    }
}
