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
        'times_used',
        'is_active',
    ];

    protected $casts = [
        'value' => 'float',
        'min_order_amount' => 'float',
        'max_discount' => 'float',
        'usage_limit' => 'integer',
        'times_used' => 'integer',
        'is_active' => 'boolean',
        'expires_at' => 'datetime',
    ];
}
