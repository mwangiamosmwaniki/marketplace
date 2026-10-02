<?php

use App\Models\Role;
use App\Models\User;
use App\Jobs\ProcessMpesaCallbackJob;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schedule;
use Illuminate\Support\Str;

Schedule::call(function (): void {
    DB::table('mpesa_callbacks')
        ->where(function ($query): void {
            $query->whereIn('processing_status', ['queued', 'unprocessed'])
                ->orWhere(function ($stale): void {
                    $stale->where('processing_status', 'processing')
                        ->where('processing_started_at', '<=', now()->subMinutes(5));
                });
        })
        ->orderBy('received_at')
        ->limit(100)
        ->pluck('id')
        ->each(fn (string $callbackId) => ProcessMpesaCallbackJob::dispatch($callbackId));
})->everyMinute()->name('dispatch-pending-mpesa-callbacks');

Schedule::call(function (): void {
    DB::table('idempotency_keys')
        ->whereNotNull('expires_at')
        ->where('expires_at', '<=', now())
        ->delete();
})->hourly()->name('cleanup-expired-idempotency-keys');

Artisan::command('shelterhub:admin:create {email} {--name=} {--phone=}', function (): int {
    $email = strtolower(trim((string) $this->argument('email')));
    $name = trim((string) ($this->option('name') ?: $this->ask('Administrator name')));
    $phone = trim((string) ($this->option('phone') ?: $this->ask('Administrator phone')));

    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $name === '' || !preg_match('/^\+?[0-9]{8,15}$/', $phone)) {
        $this->error('Enter a valid email, name, and phone number.');
        return 1;
    }

    if (User::where('email', $email)->orWhere('phone', $phone)->exists()) {
        $this->error('A user already exists with that email or phone.');
        return 1;
    }

    $role = Role::where('slug', 'super_admin')->first();
    if (!$role) {
        $this->error('Super-admin role is missing. Run the RolesAndPermissionsSeeder first.');
        return 1;
    }

    $password = $this->secret('Administrator password (minimum 16 characters)');
    $confirmation = $this->secret('Confirm password');
    if (strlen((string) $password) < 16 || !hash_equals((string) $password, (string) $confirmation)) {
        $this->error('Passwords must match and contain at least 16 characters.');
        return self::FAILURE;
    }

    DB::transaction(function () use ($email, $name, $phone, $password, $role): void {
        $user = User::create([
            'id' => (string) Str::uuid(),
            'name' => $name,
            'email' => $email,
            'phone' => $phone,
            'password' => Hash::make($password),
            'status' => 'active',
            'email_verified_at' => now(),
        ]);
        $user->roles()->attach($role->id);
    });

    $this->info("Super-admin account created for {$email}.");
    return 0;
})->purpose('Create a super-admin account without storing a default password');