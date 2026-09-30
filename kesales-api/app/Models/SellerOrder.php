<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class SellerOrder extends Model
{
    use HasUuids;

    protected $keyType = 'string';
    public $incrementing = false;
    public $timestamps = false;

    protected $fillable = [
        'id',
        'order_id',
        'sub_order_number',
        'seller_id',
        'subtotal',
        'delivery_share',
        'commission_total',
        'seller_net_payout',
        'fulfillment_status',
        'carrier',
        'tracking_number',
        'delivered_at',
        'is_settled',
        'settlement_eligible_at',
        'created_at',
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'delivery_share' => 'decimal:2',
        'commission_total' => 'decimal:2',
        'seller_net_payout' => 'decimal:2',
        'is_settled' => 'boolean',
        'settlement_eligible_at' => 'datetime',
        'delivered_at' => 'datetime',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class, 'order_id');
    }

    public function seller()
    {
        return $this->belongsTo(Seller::class, 'seller_id');
    }

    public function items()
    {
        return $this->hasMany(SellerOrderItem::class, 'seller_order_id');
    }

    public function payoutItems()
    {
        return $this->hasMany(PayoutItem::class, 'seller_order_id');
    }
}
