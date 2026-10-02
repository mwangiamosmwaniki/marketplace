<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Coupon extends Model
{
    use HasUuids;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'code',
        'type',
        'value',
        'min_order_amount',
        'max_discount',
        'expires_at',
        'usage_limit',
        'per_customer_limit',
        'times_used',
        'funding',
        'is_active',
    ];

    protected $casts = [
        'value' => 'decimal:2',
        'min_order_amount' => 'decimal:2',
        'max_discount' => 'decimal:2',
        'usage_limit' => 'integer',
        'per_customer_limit' => 'integer',
        'times_used' => 'integer',
        'funding' => 'string',
        'is_active' => 'boolean',
        'expires_at' => 'datetime',
    ];

    public function isPlatformFunded(): bool
    {
        return strtolower((string) ($this->funding ?? 'platform')) === 'platform';
    }

    public function isSellerFunded(): bool
    {
        return strtolower((string) ($this->funding ?? 'platform')) === 'seller';
    }
}
