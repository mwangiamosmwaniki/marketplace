<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class OrderAddress extends Model
{
    use HasUuids;

    protected $keyType = 'string';
    public $incrementing = false;
    public $timestamps = false;

    protected $fillable = [
        'id',
        'order_id',
        'type',
        'full_name',
        'phone',
        'county',
        'town',
        'street_address',
        'delivery_instructions',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class, 'order_id');
    }
}
