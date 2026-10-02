<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use App\Models\User;
use App\Models\Role;
use App\Models\Permission;

abstract class TestCase extends BaseTestCase
{
    use CreatesApplication;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Seed default roles and permissions for tests
        Artisan::call('db:seed', ['--class' => 'RolesAndPermissionsSeeder']);
        Artisan::call('db:seed', ['--class' => 'ChartOfAccountsSeeder']);
    }

    /**
     * Helper to create and authenticate a customer
     */
    protected function authenticateCustomer(array $attributes = []): User
    {
        $user = User::factory()->create(array_merge([
            'email' => 'customer@test.shelterhub.ke',
            'status' => 'active',
        ], $attributes));

        $customerRole = Role::where('slug', 'customer')->first();
        if ($customerRole) {
            $user->roles()->attach($customerRole->id);
        }

        $this->actingAs($user, 'sanctum');

        return $user;
    }

    /**
     * Helper to create and authenticate a seller
     */
    protected function authenticateSeller(array $attributes = []): User
    {
        $user = User::factory()->create(array_merge([
            'email' => 'seller@test.shelterhub.ke',
            'status' => 'active',
        ], $attributes));

        $sellerRole = Role::where('slug', 'seller')->first();
        if ($sellerRole) {
            $user->roles()->attach($sellerRole->id);
        }

        $this->actingAs($user, 'sanctum');

        return $user;
    }

    /**
     * Helper to create and authenticate a finance administrator
     */
    protected function authenticateFinanceAdmin(array $attributes = []): User
    {
        $user = User::factory()->create(array_merge([
            'email' => 'finance@test.shelterhub.ke',
            'status' => 'active',
        ], $attributes));

        $financeRole = Role::where('slug', 'finance_admin')->first();
        if ($financeRole) {
            $user->roles()->attach($financeRole->id);
        }

        $this->actingAs($user, 'sanctum');

        return $user;
    }

    /**
     * Helper to create and authenticate a super administrator
     */
    protected function authenticateSuperAdmin(array $attributes = []): User
    {
        $user = User::factory()->create(array_merge([
            'email' => 'admin@test.shelterhub.ke',
            'status' => 'active',
        ], $attributes));

        $adminRole = Role::where('slug', 'super_admin')->first();
        if ($adminRole) {
            $user->roles()->attach($adminRole->id);
        }

        $this->actingAs($user, 'sanctum');

        return $user;
    }
}
