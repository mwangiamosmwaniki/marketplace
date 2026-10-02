<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SellerProfile extends Model
{
    protected $primaryKey = 'seller_id';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    protected $fillable = [
        'seller_id',
        'business_registration_number',
        'kra_pin',
        'vat_number',
        'business_type',
        'country',
        'county',
        'town',
        'physical_address',
        'postal_address',
        'updated_at',
    ];

    public function seller()
    {
        return $this->belongsTo(Seller::class, 'seller_id');
    }
}
