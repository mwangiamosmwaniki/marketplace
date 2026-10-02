<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class PayoutItem extends Model
{
    use HasUuids;

    protected $keyType = 'string';
    public $incrementing = false;
    public $timestamps = false;

    protected $fillable = [
        'id',
        'payout_id',
        'seller_order_id',
        'amount',
        'commission_deduction',
        'net_amount',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'commission_deduction' => 'decimal:2',
        'net_amount' => 'decimal:2',
    ];

    public function payout()
    {
        return $this->belongsTo(Payout::class, 'payout_id');
    }

    public function sellerOrder()
    {
        return $this->belongsTo(SellerOrder::class, 'seller_order_id');
    }
}
