<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Payment extends Model
{
    use HasUuids;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'payment_number',
        'order_id',
        'customer_id',
        'provider',
        'method',
        'amount',
        'currency',
        'status',
        'provider_transaction_id',
        'provider_request_id',
        'paid_at',
        'failed_at',
        'metadata',
    ];

    protected $casts = [
        'amount' => 'float',
        'paid_at' => 'datetime',
        'failed_at' => 'datetime',
        'metadata' => 'array',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class, 'order_id');
    }

    public function customer()
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function mpesaTransaction()
    {
        return $this->hasOne(MpesaTransaction::class, 'payment_id');
    }

    public function refunds()
    {
        return $this->hasMany(Refund::class, 'payment_id');
    }
}
