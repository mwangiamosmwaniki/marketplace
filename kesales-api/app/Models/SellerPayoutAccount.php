<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class SellerPayoutAccount extends Model
{
    use HasUuids;

    protected $keyType = 'string';
    public $incrementing = false;
    public $timestamps = false;

    protected $fillable = [
        'id',
        'seller_id',
        'type',
        'account_name',
        'account_number',
        'bank_name',
        'bank_code',
        'mpesa_number',
        'verification_status',
        'is_primary',
        'created_at',
    ];

    public function seller()
    {
        return $this->belongsTo(Seller::class, 'seller_id');
    }
}
