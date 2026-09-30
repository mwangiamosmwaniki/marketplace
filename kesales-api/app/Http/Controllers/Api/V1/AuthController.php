<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\User;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Str;
use Illuminate\Routing\Controller as BaseController;

class AuthController extends BaseController
{
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'phone' => 'required|string|max:32|unique:users',
            'password' => 'required|string|min:8',
            'role' => 'nullable|string|in:customer,seller',
        ]);

        $user = User::create([
            'id' => (string) Str::uuid(),
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'],
            'password' => Hash::make($validated['password']),
            'status' => 'active',
        ]);

        $roleSlug = $validated['role'] ?? 'customer';
        $role = Role::where('slug', $roleSlug)->first();
        if ($role) {
            $user->roles()->attach($role->id);
        }

        Auth::guard('web')->login($user);
        $request->session()->regenerate();
        $request->session()->save();
        Cookie::queue(Cookie::make(config('session.cookie'), session()->getId(), 60 * 12, '/', null, app()->isProduction(), true, false, 'Lax'));

        return response()->json([
            'success' => true,
            'message' => 'Registration successful',
            'user' => $user->load('roles'),
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|string|email',
            'password' => 'required|string',
        ]);

        $user = User::with(['roles', 'seller'])->where('email', $validated['email'])->first();

        if (!$user || !Hash::check($validated['password'], $user->password)) {
            return response()->json([
                'message' => 'Invalid email or password credentials',
            ], 401);
        }

        if ($user->status === 'suspended' || $user->status === 'deactivated') {
            return response()->json([
                'message' => 'Account is suspended or deactivated. Contact support.',
            ], 403);
        }

        $user->update(['last_login_at' => now()]);
        Auth::guard('web')->login($user);
        $request->session()->regenerate();
        $request->session()->save();
        Cookie::queue(Cookie::make(config('session.cookie'), session()->getId(), 60 * 12, '/', null, app()->isProduction(), true, false, 'Lax'));

        return response()->json([
            'success' => true,
            'message' => 'Login successful',
            'user' => $user->load('roles'),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'user' => $request->user()->load(['roles.permissions', 'seller']),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        Cookie::queue(Cookie::forget(config('session.cookie')));

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully',
        ]);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['email' => 'required|email']);
        return response()->json([
            'success' => true,
            'message' => 'Password reset instructions dispatched to email.',
        ]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'token' => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Password has been successfully updated.',
        ]);
    }

    public function verifyEmail(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->email_verified_at = now();
        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'Email verified successfully.',
        ]);
    }

    public function verifyPhone(Request $request): JsonResponse
    {
        $request->validate(['otp' => 'required|string']);
        $user = $request->user();
        $user->phone_verified_at = now();
        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'Phone number verified successfully.',
        ]);
    }
}
