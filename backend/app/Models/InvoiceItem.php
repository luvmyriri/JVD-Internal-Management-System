<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InvoiceItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'invoice_id',
        'service_id',
        'passport_case_id',
        'item_name',
        'service_type',
        'item_description',
        'item_metadata',
        'quantity',
        'unit_price',
        'total_price',
        'adults',
        'children',
        'adult_price',
        'child_price',
    ];

    protected function casts(): array
    {
        return [
            'item_metadata' => 'array',
            'adult_price' => 'decimal:2',
            'child_price' => 'decimal:2',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (InvoiceItem $item): void {
            if (!$item->service_id) {
                return;
            }

            $service = Service::find($item->service_id);
            if ($service) {
                $item->item_name ??= $service->name;
                $item->service_type ??= $service->service_type;
                $item->item_description ??= $service->description;
                if ($item->adults !== null) {
                    $item->adult_price ??= $service->adult_price ?? $item->unit_price;
                }
                if ($item->children !== null) {
                    $item->child_price ??= $service->child_price ?? $item->unit_price;
                }
            }
        });
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    public function passportCase(): BelongsTo
    {
        return $this->belongsTo(PassportCase::class);
    }
}
