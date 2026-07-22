<?php
namespace App\Models;
class VisaAssistanceBooking extends SalesFulfillment
{
    protected function casts(): array { return ['intended_departure'=>'date','appointment_at'=>'datetime','requirements_snapshot'=>'array']; }
}
