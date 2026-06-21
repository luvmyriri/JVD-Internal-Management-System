<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class CustomerPortalToken extends Model
{
    use HasFactory;

    protected $fillable = [
        'token', 'purpose', 'related_type', 'related_id', 'requested_docs', 'expires_at', 'consumed_at',
    ];

    protected function casts(): array
    {
        return [
            'requested_docs' => 'array',
            'expires_at' => 'datetime',
            'consumed_at' => 'datetime',
        ];
    }

    /**
     * Manual discriminator map (not a Laravel morph-map dependency) — only these 4 types
     * are ever stored in related_type, so a static lookup keeps the controller logic simple.
     */
    private const RELATED_MAP = [
        'PassportCase' => PassportCase::class,
        'Accreditation' => Accreditation::class,
        'Contract' => Contract::class,
        'ContractAmendment' => ContractAmendment::class,
    ];

    public function related(): ?Model
    {
        $class = self::RELATED_MAP[$this->related_type] ?? null;
        return $class ? $class::find($this->related_id) : null;
    }

    public function isExpired(): bool
    {
        return $this->expires_at && $this->expires_at->isPast();
    }

    public function isConsumed(): bool
    {
        return !is_null($this->consumed_at);
    }

    public static function generateFor(string $relatedType, int $relatedId, string $purpose, ?array $requestedDocs = null, int $expiresInDays = 14): self
    {
        return self::create([
            'token' => Str::random(40),
            'purpose' => $purpose,
            'related_type' => $relatedType,
            'related_id' => $relatedId,
            'requested_docs' => $requestedDocs,
            'expires_at' => now()->addDays($expiresInDays),
        ]);
    }
}
