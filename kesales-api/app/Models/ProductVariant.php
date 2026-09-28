<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class ProductVariant extends Model
{
    use HasUuids;

    protected $keyType = 'string';
    public $incrementing = false;
    public $timestamps = false;

    protected $fillable = [
        'id',
        'product_id',
        'sku',
        'name',
        'price',
        'discount_price',
        'cost_price',
        'weight_kg',
        'status',
    ];

    protected $casts = [
        'price' => 'float',
        'discount_price' => 'float',
        'cost_price' => 'float',
        'weight_kg' => 'float',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    public function inventoryItem()
    {
        return $this->hasOne(InventoryItem::class, 'variant_id');
    }
}
