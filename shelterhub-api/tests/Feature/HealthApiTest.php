<?php

namespace Tests\Feature;

use Tests\TestCase;

class HealthApiTest extends TestCase
{
    public function test_health_endpoint_reports_actual_dependency_checks(): void
    {
        $response = $this->getJson('/api/v1/health');

        $response->assertJsonStructure([
            'success',
            'status',
            'service',
            'timestamp',
            'checks' => ['app', 'database', 'redis', 'queue', 'storage'],
        ]);

        $this->assertSame('ok', $response->json('checks.database'));
        $this->assertSame('ok', $response->json('checks.storage'));
    }
}