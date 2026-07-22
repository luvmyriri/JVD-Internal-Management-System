<?php
namespace App\Models;
class PassportAssistanceBooking extends SalesFulfillment
{
    protected function casts(): array { return ['appointment_at'=>'datetime','target_release_date'=>'date','requirements_snapshot'=>'array']; }
}
