<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class ReconciliationRun extends Model { protected $guarded=[]; protected function casts():array{return['as_of_date'=>'date','summary'=>'array','completed_at'=>'datetime'];} public function exceptions(){return $this->hasMany(ReconciliationException::class);} }
