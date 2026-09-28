<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class SellerOrderItem extends Model
{
    use HasUuids;

    protected $keyType = 'string';
    public $incrementing = false;
    public $timestamps = false;

    protected $fillable = [
        'id',
        'seller_order_id',
        'product_id',
        'variant_id',
        'product_name',
        'sku',
        'quantity',
        'unit_price',
        'commission_rate',
        'commission_amount',
        'seller_net_amount',
    ];

    protected $casts = [
        'unit_price' => 'float',
        'commission_rate' => 'float',
        'commission_amount' => 'float',
        'seller_net_amount' => 'float',
        'quantity' => 'integer',
    ];

    public function sellerOrder()
    {
        return $this->belongsTo(SellerOrder::class, 'seller_order_id');
    }

    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    public function variant()
    {
        return $this->belongsTo(ProductVariant::class, 'variant_id');
    }
}
