<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $role = Role::where('slug', 'super_admin')->firstOrFail();

        $email = 'admin@marketplace.test';
        $password = 'Admin@1234567890';

        $user = User::updateOrCreate(
            ['email' => $email],
            [
                'id' => (string) Str::uuid(),
                'name' => 'ShelterHub Administrator',
                'email' => $email,
                'phone' => '+254700000000',
                'password' => Hash::make($password),
                'status' => 'active',
                'email_verified_at' => now(),
            ]
        );

        $user->roles()->syncWithoutDetaching([$role->id]);

        $this->command->info("Seeded super admin: {$email} / {$password}");
    }
}
