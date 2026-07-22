<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class ReconciliationException extends Model { protected $guarded=[]; protected function casts():array{return['expected_amount'=>'decimal:2','actual_amount'=>'decimal:2','resolved_at'=>'datetime'];} public function reference(){return $this->morphTo();} }
