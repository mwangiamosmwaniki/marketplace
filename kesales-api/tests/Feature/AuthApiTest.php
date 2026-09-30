<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class AuthApiTest extends TestCase
{
    public function test_customer_can_register_and_receive_sanctum_token(): void
    {
        $response = $this->withHeader('Origin', 'http://localhost:3000')
            ->postJson('/api/v1/auth/register', [
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
        ]);
        $response->assertCookie('laravel-session');

        $this->assertDatabaseHas('users', [
            'email' => 'wanjiku@test.kesales.ke',
        ]);
    }

    public function test_user_can_login_with_valid_credentials_and_secure_cookie_auth(): void
    {
        $user = User::factory()->create([
            'email' => 'john.doe@test.kesales.ke',
            'password' => Hash::make('MyPassword123!'),
            'status' => 'active',
        ]);

        $response = $this->withHeader('Origin', 'http://localhost:3000')
            ->postJson('/api/v1/auth/login', [
                'email' => 'john.doe@test.kesales.ke',
                'password' => 'MyPassword123!',
            ]);

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'success',
            'user',
        ]);
        $response->assertCookie('laravel-session');
        $this->assertArrayNotHasKey('token', $response->json());

        $session = $response->headers->getCookies()[0]->getValue();
        $this->withHeader('Origin', 'http://localhost:3000')
            ->withCookie('laravel-session', $session)
            ->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('user.email', 'john.doe@test.kesales.ke');

        $this->withHeader('Origin', 'http://localhost:3000')
            ->withCookie('laravel-session', $session)
            ->postJson('/api/v1/auth/logout')
            ->assertOk();
    }

    public function test_protected_routes_reject_unauthenticated_requests(): void
    {
        $response = $this->getJson('/api/v1/me/orders');
        $response->assertStatus(401);
    }
}
