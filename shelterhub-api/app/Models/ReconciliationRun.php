<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class ReconciliationRun extends Model
{
    use HasUuids;

    protected $keyType = 'string';
    public $incrementing = false;
    public $timestamps = false;

    protected $fillable = [
        'id',
        'run_date',
        'total_processed',
        'total_exceptions',
        'status',
        'created_at',
    ];

    protected $casts = [
        'run_date' => 'date',
        'total_processed' => 'integer',
        'total_exceptions' => 'integer',
    ];

    public function exceptions()
    {
        return $this->hasMany(ReconciliationException::class, 'reconciliation_run_id');
    }
}
