<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DeliveryZone extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'county',
        'towns',
        'home_delivery_fee',
        'pickup_station_fee',
        'estimated_days',
        'is_active',
    ];

    protected $casts = [
        'towns' => 'array',
        'home_delivery_fee' => 'decimal:2',
        'pickup_station_fee' => 'decimal:2',
        'is_active' => 'boolean',
    ];
}
