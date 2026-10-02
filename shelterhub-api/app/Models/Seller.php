<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Seller extends Model
{
    use HasUuids;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'user_id',
        'store_name',
        'slug',
        'legal_name',
        'seller_type',
        'status',
        'commission_rate',
        'description',
        'logo_path',
        'banner_path',
        'rating',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function profile()
    {
        return $this->hasOne(SellerProfile::class, 'seller_id');
    }

    public function documents()
    {
        return $this->hasMany(SellerDocument::class, 'seller_id');
    }

    public function payoutAccounts()
    {
        return $this->hasMany(SellerPayoutAccount::class, 'seller_id');
    }

    public function products()
    {
        return $this->hasMany(Product::class, 'seller_id');
    }

    public function sellerOrders()
    {
        return $this->hasMany(SellerOrder::class, 'seller_id');
    }

    public function payouts()
    {
        return $this->hasMany(Payout::class, 'seller_id');
    }
}
