<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class SellerDocument extends Model
{
    use HasUuids;

    protected $keyType = 'string';
    public $incrementing = false;
    public $timestamps = false;

    protected $fillable = [
        'id',
        'seller_id',
        'document_type',
        'document_number',
        'file_path',
        'status',
        'issued_at',
        'expires_at',
        'verified_at',
        'verified_by',
        'rejection_reason',
        'created_at',
    ];

    public function seller()
    {
        return $this->belongsTo(Seller::class, 'seller_id');
    }

    public function verifier()
    {
        return $this->belongsTo(User::class, 'verified_by');
    }
}
