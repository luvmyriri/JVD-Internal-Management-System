<?php
namespace App\Models;
class ScheduledTicketBooking extends SalesFulfillment
{
    protected function casts(): array { return ['departure_at'=>'datetime','arrival_at'=>'datetime','passengers'=>'array','seat_assignments'=>'array','supplier_cost'=>'decimal:2']; }
}
