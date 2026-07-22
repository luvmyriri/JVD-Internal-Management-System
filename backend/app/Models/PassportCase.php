<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class PassportCase extends Model
{
    use HasFactory;

    protected $fillable = [
        'customer_id', 'passenger_id', 'handled_by',
        'case_type', 'status', 'checklist', 'reference_number',
        'submitted_date', 'release_date', 'destination_country', 'visa_type',
        'upload_token', 'upload_requested_docs', 'upload_email_sent_at',
    ];

    protected function casts(): array
    {
        return [
            'checklist' => 'array',
            'submitted_date' => 'date',
            'release_date' => 'date',
            'upload_requested_docs' => 'array',
            'upload_email_sent_at' => 'datetime',
        ];
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function passenger()
    {
        return $this->belongsTo(Passenger::class);
    }

    public function handler()
    {
        return $this->belongsTo(User::class, 'handled_by');
    }

    public function billedTransaction()
    {
        return $this->hasOne(CustomTransactionDetail::class);
    }

    public function billedInvoiceItem()
    {
        return $this->hasOne(InvoiceItem::class);
    }
}
