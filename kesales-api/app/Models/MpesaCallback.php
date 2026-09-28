<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class MpesaCallback extends Model
{
    use HasUuids;

    protected $keyType = 'string';
    public $incrementing = false;
    public $timestamps = false;

    protected $fillable = [
        'id',
        'event_type',
        'provider_event_id',
        'payload_hash',
        'checkout_request_id',
        'payload',
        'processing_status',
        'attempts',
        'received_at',
        'processed_at',
        'failed_at',
        'error_message',
        'created_at',
    ];

    protected $casts = [
        'payload' => 'array',
        'processed_at' => 'datetime',
    ];
}
