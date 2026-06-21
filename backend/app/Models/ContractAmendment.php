<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContractAmendment extends Model
{
    use HasFactory;

    protected $fillable = [
        'contract_id', 'amendment_number', 'reason', 'changes_summary', 'terms_snapshot',
        'created_by', 'signature_image', 'signature_typed_name', 'signed_at', 'signed_ip',
    ];

    protected function casts(): array
    {
        return ['signed_at' => 'datetime'];
    }

    public function contract(): BelongsTo
    {
        return $this->belongsTo(Contract::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function isSigned(): bool
    {
        return !empty($this->signed_at);
    }
}
