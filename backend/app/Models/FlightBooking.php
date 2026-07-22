<?php
namespace App\Models;
class FlightBooking extends SalesFulfillment
{
    protected function casts(): array { return ['departure_at'=>'datetime','return_at'=>'datetime','segments'=>'array','ticketing_deadline'=>'datetime','passengers'=>'array','fare_conditions'=>'array','supplier_cost'=>'decimal:2']; }
}
