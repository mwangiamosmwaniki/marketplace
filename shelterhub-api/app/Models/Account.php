<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Account extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'id',
        'code',
        'name',
        'type',
        'currency',
        'is_active',
        'created_at',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function transactionLines()
    {
        return $this->hasMany(FinancialTransactionLine::class, 'account_id');
    }
}
