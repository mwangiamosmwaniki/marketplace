<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class InventoryItem extends Model
{
    use HasUuids;

    protected $keyType = 'string';
    public $incrementing = false;
    public $timestamps = false;

    protected $fillable = [
        'id',
        'product_id',
        'variant_id',
        'seller_id',
        'quantity_on_hand',
        'quantity_reserved',
        'reorder_level',
        'updated_at',
    ];

    protected $casts = [
        'quantity_on_hand' => 'integer',
        'quantity_reserved' => 'integer',
        'quantity_available' => 'integer',
        'reorder_level' => 'integer',
    ];

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

    public function movements()
    {
        return $this->hasMany(InventoryMovement::class, 'inventory_item_id');
    }
}
