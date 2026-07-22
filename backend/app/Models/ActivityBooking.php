<?php
namespace App\Models;
class ActivityBooking extends SalesFulfillment
{
    protected function casts(): array { return ['session_starts_at'=>'datetime','session_ends_at'=>'datetime','participants'=>'array','requirements'=>'array','supplier_cost'=>'decimal:2']; }
}
