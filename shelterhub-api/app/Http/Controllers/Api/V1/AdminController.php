<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\User;
use App\Models\Role;
use App\Models\Permission;
use App\Models\Seller;
use App\Models\SellerDocument;
use App\Models\Product;
use App\Models\AuditLog;
use App\Models\SystemSetting;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Hash;
use Illuminate\Routing\Controller as BaseController;

class AdminController extends BaseController
{
    // --- Product Catalog Moderation ---

    public function allProducts(Request $request): JsonResponse
    {
        $products = Product::with(['seller', 'category', 'variants'])
            ->orderBy('created_at', 'desc')
            ->paginate(25);

        return response()->json($products);
    }

    public function approveProduct(string $id): JsonResponse
    {
        $product = Product::with('seller')->findOrFail($id);
        abort_unless($product->seller?->status === 'approved', 409, 'Seller approval is required before publishing products.');
        $product->status = 'active';
        $product->published_at = now();
        $product->save();

        return response()->json(['message' => 'Product approved for marketplace catalog', 'product' => $product]);
    }

    public function rejectProduct(string $id): JsonResponse
    {
        $product = Product::findOrFail($id);
        $product->status = 'rejected';
        $product->save();

        return response()->json(['message' => 'Product rejected', 'product' => $product]);
    }

    // --- Seller Governance & KYC ---

    public function sellers(Request $request): JsonResponse
    {
        $sellers = Seller::with(['profile', 'documents', 'user'])
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json($sellers);
    }

    public function showSeller(string $id): JsonResponse
    {
        $seller = Seller::with(['profile', 'documents.verifier', 'user', 'payoutAccounts'])
            ->where('id', $id)
            ->firstOrFail();

        return response()->json(['seller' => $seller]);
    }

    public function approveSeller(string $id): JsonResponse
    {
        $seller = Seller::findOrFail($id);
        $seller->status = 'approved';
        $seller->save();

        return response()->json(['message' => 'Seller approved and enabled to list products', 'seller' => $seller]);
    }

    public function suspendSeller(string $id): JsonResponse
    {
        $seller = Seller::findOrFail($id);
        $seller->status = 'suspended';
        $seller->save();

        return response()->json(['message' => 'Seller suspended', 'seller' => $seller]);
    }

    public function verifyDocument(Request $request, string $docId): JsonResponse
    {
        $doc = SellerDocument::findOrFail($docId);
        $doc->status = 'verified';
        $doc->verified_at = now();
        $doc->verified_by = $request->user()->id;
        $doc->save();

        return response()->json(['message' => 'Document marked as verified', 'document' => $doc]);
    }

    // --- Super Admin Platform Controls ---

    public function users(Request $request): JsonResponse
    {
        $users = User::with('roles')->orderBy('created_at', 'desc')->paginate(25);
        return response()->json($users);
    }

    public function createUser(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'email' => 'required|email|unique:users',
            'phone' => 'required|string|unique:users',
            'password' => 'required|string|min:8',
            'role_id' => 'required|integer|exists:roles,id',
        ]);

        $user = User::create([
            'id' => (string) Str::uuid(),
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'],
            'password' => Hash::make($validated['password']),
            'status' => 'active',
        ]);

        $user->roles()->attach($validated['role_id']);

        return response()->json(['message' => 'User created', 'user' => $user->load('roles')], 201);
    }

    public function updateUser(Request $request, string $id): JsonResponse
    {
        $user = User::findOrFail($id);
        $user->update($request->only(['name', 'phone', 'status']));

        if ($request->has('role_id')) {
            $user->roles()->sync([$request->input('role_id')]);
        }

        return response()->json(['message' => 'User updated', 'user' => $user->load('roles')]);
    }

    public function suspendUser(string $id): JsonResponse
    {
        $user = User::findOrFail($id);
        $user->status = 'suspended';
        $user->save();

        return response()->json(['message' => 'User suspended', 'user' => $user]);
    }

    public function roles(): JsonResponse
    {
        return response()->json(['roles' => Role::with('permissions')->get()]);
    }

    public function permissions(): JsonResponse
    {
        return response()->json(['permissions' => Permission::all()]);
    }

    public function auditLogs(): JsonResponse
    {
        $logs = AuditLog::with('actor')->orderBy('created_at', 'desc')->paginate(50);
        return response()->json($logs);
    }

    public function systemSettings(): JsonResponse
    {
        $settings = SystemSetting::all();
        return response()->json(['settings' => $settings]);
    }

    public function updateSettings(Request $request): JsonResponse
    {
        foreach ($request->input('settings', []) as $key => $val) {
            SystemSetting::updateOrCreate(
                ['key' => $key],
                ['value' => $val]
            );
        }

        return response()->json(['message' => 'Settings saved successfully']);
    }
}
