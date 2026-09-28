<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class ReconciliationException extends Model
{
    use HasUuids;

    protected $keyType = 'string';
    public $incrementing = false;
    public $timestamps = false;

    protected $fillable = [
        'id',
        'reconciliation_run_id',
        'type',
        'reference_id',
        'expected_amount',
        'actual_amount',
        'status',
        'resolution_notes',
        'resolved_by',
        'created_at',
    ];

    protected $casts = [
        'expected_amount' => 'float',
        'actual_amount' => 'float',
    ];

    public function run()
    {
        return $this->belongsTo(ReconciliationRun::class, 'reconciliation_run_id');
    }

    public function resolver()
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }
}
