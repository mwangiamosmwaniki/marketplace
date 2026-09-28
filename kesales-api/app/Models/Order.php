<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Order extends Model
{
    use HasUuids;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'order_number',
        'customer_id',
        'currency',
        'subtotal',
        'discount_total',
        'delivery_fee',
        'tax_total',
        'grand_total',
        'status',
        'payment_status',
        'placed_at',
    ];

    protected $casts = [
        'subtotal' => 'float',
        'discount_total' => 'float',
        'delivery_fee' => 'float',
        'tax_total' => 'float',
        'grand_total' => 'float',
        'placed_at' => 'datetime',
    ];

    public function customer()
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function address()
    {
        return $this->hasOne(OrderAddress::class, 'order_id');
    }

    public function items()
    {
        return $this->hasMany(OrderItem::class, 'order_id');
    }

    public function sellerOrders()
    {
        return $this->hasMany(SellerOrder::class, 'order_id');
    }

    public function payments()
    {
        return $this->hasMany(Payment::class, 'order_id');
    }

    public function taxInvoices()
    {
        return $this->hasMany(TaxInvoice::class, 'order_id');
    }

    public function returnRequests()
    {
        return $this->hasMany(ReturnRequest::class, 'order_id');
    }

    public function refunds()
    {
        return $this->hasMany(Refund::class, 'order_id');
    }
}
