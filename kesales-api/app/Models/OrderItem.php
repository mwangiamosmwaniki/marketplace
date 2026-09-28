<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class OrderItem extends Model
{
    use HasUuids;

    protected $table = 'order_items';
    protected $keyType = 'string';
    public $incrementing = false;
    public $timestamps = false;

    protected $fillable = [
        'id',
        'order_id',
        'product_id',
        'variant_id',
        'seller_id',
        'product_name',
        'sku',
        'quantity',
        'unit_price',
        'discount',
        'tax',
        'line_total',
    ];

    protected $casts = [
        'unit_price' => 'float',
        'discount' => 'float',
        'tax' => 'float',
        'line_total' => 'float',
        'quantity' => 'integer',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class, 'order_id');
    }

    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    public function variant()
    {
        return $this->belongsTo(ProductVariant::class, 'variant_id');
    }

    public function seller()
    {
        return $this->belongsTo(Seller::class, 'seller_id');
    }
}
