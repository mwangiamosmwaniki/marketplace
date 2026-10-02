<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Support\Str;

class AuditService
{
    /**
     * Records a secure immutable audit log entry.
     */
    public static function log(
        string $action,
        string $module,
        ?string $entityType = null,
        ?string $entityId = null,
        ?array $oldValues = null,
        ?array $newValues = null,
        ?string $actorId = null
    ): AuditLog {
        return AuditLog::create([
            'id' => (string) Str::uuid(),
            'actor_id' => $actorId ?? auth()->id(),
            'action' => $action,
            'module' => $module,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'ip_address' => request()->ip(),
            'user_agent' => substr(request()->userAgent() ?? '', 0, 255),
            'request_id' => request()->header('X-Request-ID') ?? (string) Str::uuid(),
            'created_at' => now(),
        ]);
    }
}
