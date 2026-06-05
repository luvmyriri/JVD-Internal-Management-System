<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AccreditationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $expiryDate = $this->expiry_date;
        $daysUntilExpiry = $expiryDate ? now()->startOfDay()->diffInDays($expiryDate, false) : null;

        return [
            'id'                  => $this->id,
            'entity_type'         => $this->entity_type,
            'entity_id'           => $this->entity_id,
            'accreditation_type'  => $this->accreditation_type,
            'issuing_body'        => $this->issuing_body,
            'issue_date'          => $this->issue_date ? $this->issue_date->toDateString() : null,
            'expiry_date'         => $expiryDate ? $expiryDate->toDateString() : null,
            'status'              => $this->status,
            'document_url'        => $this->document_url,
            'days_until_expiry'   => $daysUntilExpiry,
            'is_expiring_soon'    => $daysUntilExpiry !== null && $daysUntilExpiry >= 0 && $daysUntilExpiry <= 30,
            'is_expired'          => $daysUntilExpiry !== null && $daysUntilExpiry < 0,
            'entity_name'         => $this->entity_name,
            'contact_person'      => $this->contact_person,
            'contact_email'       => $this->contact_email,
            'kyc_document_url'    => $this->kyc_document_url,
            'nda_document_url'    => $this->nda_document_url,
            'terms_document_url'  => $this->terms_document_url,
            'custom_documents'    => $this->custom_documents,
            'created_at'          => $this->created_at->toISOString(),
            'updated_at'          => $this->updated_at->toISOString(),
        ];
    }
}
