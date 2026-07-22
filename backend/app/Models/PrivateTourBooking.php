<?php
namespace App\Models;
class PrivateTourBooking extends SalesFulfillment
{
    protected function casts(): array { return ['starts_at'=>'datetime','ends_at'=>'datetime','itinerary'=>'array','inclusions'=>'array','exclusions'=>'array','adult_rate'=>'decimal:2','child_rate'=>'decimal:2','traveler_types'=>'array']; }
    public function bus(){ return $this->belongsTo(Bus::class); }
    public function driver(){ return $this->belongsTo(User::class, 'driver_id'); }
}
