<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Payout extends Model
{
    use HasUuids;

    protected $keyType = 'string';
    public $incrementing = false;
    public $timestamps = false;

    protected $fillable = [
        'id',
        'payout_number',
        'seller_id',
        'amount',
        'currency',
        'method',
        'status',
        'requested_at',
        'approved_at',
        'processed_at',
        'completed_at',
        'approved_by',
        'processed_by',
        'provider',
        'provider_request_id',
        'provider_conversation_id',
        'provider_transaction_id',
        'provider_status',
        'provider_result_code',
        'provider_result_message',
        'provider_requested_at',
        'provider_completed_at',
        'failure_reason',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'requested_at' => 'datetime',
        'approved_at' => 'datetime',
        'processed_at' => 'datetime',
        'completed_at' => 'datetime',
        'provider_requested_at' => 'datetime',
        'provider_completed_at' => 'datetime',
    ];

    public function seller()
    {
        return $this->belongsTo(Seller::class, 'seller_id');
    }

    public function items()
    {
        return $this->hasMany(PayoutItem::class, 'payout_id');
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function processor()
    {
        return $this->belongsTo(User::class, 'processed_by');
    }
}
