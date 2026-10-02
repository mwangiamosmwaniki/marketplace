<?php

namespace Tests\Feature;

use App\Models\Category;
use Tests\TestCase;

class AdminCatalogApiTest extends TestCase
{
    public function test_category_resource_uses_validated_fields_only(): void
    {
        $this->authenticateSuperAdmin();

        $response = $this->postJson('/api/v1/admin/categories', [
            'name' => 'Kitchen',
            'slug' => 'kitchen-admin-test',
            'status' => 'active',
            'id' => 999,
            'created_at' => '2000-01-01T00:00:00Z',
        ]);

        $response->assertCreated();
        $this->assertNotSame(999, $response->json('id'));
        $this->assertDatabaseHas('categories', [
            'slug' => 'kitchen-admin-test',
            'name' => 'Kitchen',
        ]);
        $this->assertSame(0, Category::where('slug', 'kitchen-admin-test')->value('sort_order'));
    }
}