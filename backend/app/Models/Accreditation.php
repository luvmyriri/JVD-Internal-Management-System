<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Accreditation extends Model
{
    use HasFactory;

    protected $fillable = [
        'entity_type', 'entity_id', 'accreditation_type',
        'issuing_body', 'issue_date', 'expiry_date',
        'status', 'document_url',
        'nda_document_url', 'terms_document_url', 'kyc_document_url',
        'entity_name', 'contact_person', 'contact_email', 'kyc_token',
        'custom_documents'
    ];

    protected function casts(): array
    {
        return [
            'issue_date' => 'date',
            'expiry_date' => 'date',
            'custom_documents' => 'array',
        ];
    }

    /**
     * The "booted" method of the model.
     */
    protected static function booted(): void
    {
        static::creating(function (Accreditation $accreditation) {
            if ($accreditation->entity_type === 'supplier' && empty($accreditation->entity_id)) {
                // Find or create associated Supplier record
                $supplier = \App\Models\Supplier::where('company_name', $accreditation->entity_name)
                    ->orWhere('email', $accreditation->contact_email)
                    ->first();

                if (!$supplier) {
                    $supplier = \App\Models\Supplier::create([
                        'company_name'         => $accreditation->entity_name,
                        'contact_person'       => $accreditation->contact_person,
                        'email'                => $accreditation->contact_email,
                        'accreditation_status' => 'pending',
                        'is_verified'          => false,
                    ]);
                }
                $accreditation->entity_id = $supplier->id;
            }
        });

        static::updated(function (Accreditation $accreditation) {
            if ($accreditation->entity_type === 'supplier' && $accreditation->entity_id) {
                $supplier = \App\Models\Supplier::find($accreditation->entity_id);
                if ($supplier) {
                    if ($accreditation->status === 'active' && !$supplier->is_verified) {
                        $supplier->update([
                            'accreditation_status' => 'accredited',
                            'is_verified'          => true,
                            'verified_at'          => now(),
                            'verified_by'          => auth()->id() ?: 1,
                        ]);
                    } elseif ($accreditation->status === 'expired' && $supplier->accreditation_status !== 'blacklisted' && $supplier->is_verified) {
                        $supplier->update([
                            'accreditation_status' => 'suspended',
                            'is_verified'          => false,
                        ]);
                    } elseif ($accreditation->status === 'pending_renewal' && $supplier->accreditation_status !== 'pending') {
                        $supplier->update([
                            'accreditation_status' => 'pending',
                            'is_verified'          => false,
                        ]);
                    }
                }
            }
        });
    }

    /**
     * Get the owning entity model.
     */
    public function entity()
    {
        return $this->morphTo();
    }
}
