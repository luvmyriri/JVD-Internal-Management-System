<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class JournalEntry extends Model
{
    use HasFactory;

    protected $guarded = [];

    public function ledgerLines()
    {
        return $this->hasMany(LedgerLine::class);
    }

    public function reference()
    {
        return $this->morphTo();
    }
}
