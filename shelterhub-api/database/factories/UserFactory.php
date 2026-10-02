<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UserFactory extends Factory
{
    protected $model = User::class;

    public function definition(): array
    {
        return [
            'id' => (string) Str::uuid(),
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'phone' => '+2547' . fake()->numerify('########'),
            'password' => Hash::make('password123'),
            'status' => 'active',
            'email_verified_at' => now(),
            'phone_verified_at' => now(),
            'remember_token' => Str::random(10),
        ];
    }
}
