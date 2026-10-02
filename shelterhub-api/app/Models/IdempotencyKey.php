<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class IdempotencyKey extends Model
{
    use HasUuids;

    protected $keyType = 'string';
    public $incrementing = false;
    public $timestamps = false;

    protected $fillable = [
        'id',
        'user_id',
        'idempotency_key',
        'request_path',
        'request_hash',
        'response_code',
        'response_body',
        'created_at',
        'expires_at',
    ];

    protected $casts = [
        'response_body' => 'array',
        'created_at' => 'datetime',
        'expires_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
