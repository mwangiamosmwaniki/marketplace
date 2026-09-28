<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Role;
use App\Models\Permission;
use App\Models\User;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Hash;

class RolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        $roles = [
            ['name' => 'Super Administrator', 'slug' => 'super_admin', 'description' => 'Full platform control'],
            ['name' => 'Finance Controller', 'slug' => 'finance_admin', 'description' => 'Ledger, payouts, refunds, reconciliation'],
            ['name' => 'Product Catalog Admin', 'slug' => 'product_admin', 'description' => 'Catalog moderation and review'],
            ['name' => 'Seller Governance Admin', 'slug' => 'seller_admin', 'description' => 'Merchant verification and KYC review'],
            ['name' => 'Verified Merchant', 'slug' => 'seller', 'description' => 'Seller center portal access'],
            ['name' => 'Shopper Customer', 'slug' => 'customer', 'description' => 'Marketplace buyer storefront access'],
        ];

        foreach ($roles as $r) {
            Role::updateOrCreate(['slug' => $r['slug']], $r);
        }

        $permissions = [
            // Finance capabilities
            ['name' => 'View Financial Orders', 'slug' => 'orders.view_financial', 'module' => 'finance', 'action' => 'view'],
            ['name' => 'View Payments', 'slug' => 'payments.view', 'module' => 'finance', 'action' => 'view'],
            ['name' => 'Reconcile Payments', 'slug' => 'payments.reconcile', 'module' => 'finance', 'action' => 'reconcile'],
            ['name' => 'View Refunds', 'slug' => 'refunds.view', 'module' => 'finance', 'action' => 'view'],
            ['name' => 'Approve Refunds', 'slug' => 'refunds.approve', 'module' => 'finance', 'action' => 'approve'],
            ['name' => 'Process Refunds', 'slug' => 'refunds.process', 'module' => 'finance', 'action' => 'process'],
            ['name' => 'View Payouts', 'slug' => 'payouts.view', 'module' => 'finance', 'action' => 'view'],
            ['name' => 'Approve Payouts', 'slug' => 'payouts.approve', 'module' => 'finance', 'action' => 'approve'],
            ['name' => 'Hold Payouts', 'slug' => 'payouts.hold', 'module' => 'finance', 'action' => 'hold'],
            ['name' => 'Process Payouts', 'slug' => 'payouts.process', 'module' => 'finance', 'action' => 'process'],
            ['name' => 'View Ledger Journal', 'slug' => 'ledger.view', 'module' => 'finance', 'action' => 'view'],
            ['name' => 'Adjust Ledger Journal', 'slug' => 'ledger.adjust', 'module' => 'finance', 'action' => 'adjust'],
            ['name' => 'View Reconciliation', 'slug' => 'reconciliation.view', 'module' => 'finance', 'action' => 'view'],
            ['name' => 'Resolve Exceptions', 'slug' => 'reconciliation.resolve', 'module' => 'finance', 'action' => 'resolve'],
            ['name' => 'View Reports', 'slug' => 'reports.view', 'module' => 'finance', 'action' => 'view'],
            ['name' => 'Export Reports', 'slug' => 'reports.export', 'module' => 'finance', 'action' => 'export'],
            // Product capabilities
            ['name' => 'Manage Products', 'slug' => 'products.manage', 'module' => 'catalog', 'action' => 'manage'],
            ['name' => 'Manage Sellers', 'slug' => 'sellers.manage', 'module' => 'sellers', 'action' => 'manage'],
        ];

        foreach ($permissions as $p) {
            Permission::updateOrCreate(['slug' => $p['slug']], $p);
        }

        // Attach permissions to finance_admin
        $financeRole = Role::where('slug', 'finance_admin')->first();
        if ($financeRole) {
            $financePerms = Permission::where('module', 'finance')->pluck('id');
            $financeRole->permissions()->sync($financePerms);
        }

        // Create initial default admin if not exists
        $admin = User::firstOrCreate(
            ['email' => 'admin@kesales.ke'],
            [
                'id' => (string) Str::uuid(),
                'name' => 'KESALES Super Administrator',
                'phone' => '+254700000001',
                'password' => Hash::make('Admin@Kesales2026!'),
                'status' => 'active',
                'email_verified_at' => now(),
            ]
        );

        $superRole = Role::where('slug', 'super_admin')->first();
        if ($superRole) {
            $admin->roles()->syncWithoutDetaching([$superRole->id]);
        }
    }
}
