<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class AuthApiTest extends TestCase
{
    public function test_customer_can_register_and_receive_sanctum_token(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Wanjiku Mwangi',
            'email' => 'wanjiku@test.kesales.ke',
            'phone' => '+254712345678',
            'password' => 'SecurePass123!',
            'password_confirmation' => 'SecurePass123!',
        ]);

        $response->assertStatus(201);
        $response->assertJsonStructure([
            'success',
            'user' => ['id', 'email', 'name', 'roles'],
            'token',
        ]);

        $this->assertDatabaseHas('users', [
            'email' => 'wanjiku@test.kesales.ke',
        ]);
    }

    public function test_user_can_login_with_valid_credentials(): void
    {
        $user = User::factory()->create([
            'email' => 'john.doe@test.kesales.ke',
            'password' => Hash::make('MyPassword123!'),
            'status' => 'active',
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'john.doe@test.kesales.ke',
            'password' => 'MyPassword123!',
        ]);

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'success',
            'token',
            'user',
        ]);

        $token = $response->json('token');
        $this->withToken($token)
            ->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('user.email', 'john.doe@test.kesales.ke');

        $this->withToken($token)
            ->postJson('/api/v1/auth/logout')
            ->assertOk();

        $this->assertDatabaseMissing('personal_access_tokens', [
            'token' => hash('sha256', $token),
        ]);
    }

    public function test_protected_routes_reject_unauthenticated_requests(): void
    {
        $response = $this->getJson('/api/v1/me/orders');
        $response->assertStatus(401);
    }
}
