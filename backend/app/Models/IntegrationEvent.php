<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class IntegrationEvent extends Model { protected $guarded=[]; protected function casts():array{return['metadata'=>'array','received_at'=>'datetime','processed_at'=>'datetime'];} public function invoice(){return $this->belongsTo(Invoice::class);} }
