<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Contract extends Model
{
    use HasFactory;

    protected $fillable = [
        'invoice_id', 'contract_number', 'status', 'terms_snapshot',
        'deposit_required_percent', 'deposit_required_amount', 'cancellation_policy_key',
        'created_by', 'signature_image', 'signature_typed_name', 'signed_at',
        'signed_ip', 'signing_user_agent', 'sent_at', 'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'signed_at' => 'datetime',
            'sent_at' => 'datetime',
            'expires_at' => 'datetime',
            'deposit_required_percent' => 'decimal:2',
            'deposit_required_amount' => 'decimal:2',
        ];
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function amendments(): HasMany
    {
        return $this->hasMany(ContractAmendment::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function isFullySigned(): bool
    {
        return $this->status === 'signed' && !empty($this->signed_at);
    }

    public function isExpired(): bool
    {
        return $this->expires_at && $this->expires_at->isPast() && $this->status === 'sent_for_signature';
    }

    public function latestAmendment(): ?ContractAmendment
    {
        return $this->amendments()->latest('amendment_number')->first();
    }
}
