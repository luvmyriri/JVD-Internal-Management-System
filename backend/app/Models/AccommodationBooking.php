<?php
namespace App\Models;
class AccommodationBooking extends SalesFulfillment
{
    protected function casts(): array { return ['check_in'=>'date','check_out'=>'date','free_cancellation_until'=>'datetime','guest_names'=>'array','meal_plan'=>'array','supplier_cost'=>'decimal:2']; }
}
