<?php
namespace App\Models;
class TransferBooking extends SalesFulfillment
{
    protected function casts(): array { return ['pickup_at'=>'datetime','dropoff_at'=>'datetime','passenger_names'=>'array']; }
    public function bus(){ return $this->belongsTo(Bus::class); }
    public function driver(){ return $this->belongsTo(User::class, 'driver_id'); }
}
