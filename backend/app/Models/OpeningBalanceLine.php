<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class OpeningBalanceLine extends Model { protected $guarded=[]; protected function casts():array{return['debit'=>'decimal:2','credit'=>'decimal:2'];} public function account(){return $this->belongsTo(Account::class);} }
