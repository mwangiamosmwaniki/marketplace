<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class FinancialTransaction extends Model
{
    use HasUuids;

    protected $keyType = 'string';
    public $incrementing = false;
    public $timestamps = false;

    protected $fillable = [
        'id',
        'transaction_number',
        'type',
        'reference_type',
        'reference_id',
        'description',
        'status',
        'posted_at',
        'created_by',
    ];

    protected $casts = [
        'posted_at' => 'datetime',
    ];

    public function lines()
    {
        return $this->hasMany(FinancialTransactionLine::class, 'financial_transaction_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
