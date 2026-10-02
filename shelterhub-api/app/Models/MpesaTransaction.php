<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class MpesaTransaction extends Model
{
    use HasUuids;

    protected $keyType = 'string';
    public $incrementing = false;
    public $timestamps = false;

    protected $fillable = [
        'id',
        'payment_id',
        'merchant_request_id',
        'checkout_request_id',
        'mpesa_receipt_number',
        'result_code',
        'result_description',
        'phone_number',
        'amount',
        'transaction_date',
        'raw_request',
        'raw_response',
        'processed_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'result_code' => 'integer',
        'transaction_date' => 'datetime',
        'processed_at' => 'datetime',
        'raw_request' => 'array',
        'raw_response' => 'array',
    ];

    public function payment()
    {
        return $this->belongsTo(Payment::class, 'payment_id');
    }
}
