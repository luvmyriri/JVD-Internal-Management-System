<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class OpeningBalanceBatch extends Model { protected $guarded=[]; protected function casts():array{return['as_of_date'=>'date','total_debits'=>'decimal:2','total_credits'=>'decimal:2','approved_at'=>'datetime','posted_at'=>'datetime'];} public function lines(){return $this->hasMany(OpeningBalanceLine::class);} }
