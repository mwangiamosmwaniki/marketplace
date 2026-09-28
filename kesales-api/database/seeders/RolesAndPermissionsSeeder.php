<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Role;
use App\Models\Permission;

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
            ['name' => 'View Finance Dashboard', 'slug' => 'finance.dashboard.view', 'module' => 'finance', 'action' => 'view'],
            ['name' => 'View Financial Orders', 'slug' => 'finance.orders.view', 'module' => 'finance', 'action' => 'view'],
            ['name' => 'View Payments', 'slug' => 'finance.payments.view', 'module' => 'finance', 'action' => 'view'],
            ['name' => 'Reconcile Payments', 'slug' => 'finance.payments.reconcile', 'module' => 'finance', 'action' => 'reconcile'],
            ['name' => 'View Refunds', 'slug' => 'finance.refunds.view', 'module' => 'finance', 'action' => 'view'],
            ['name' => 'Approve Refunds', 'slug' => 'finance.refunds.approve', 'module' => 'finance', 'action' => 'approve'],
            ['name' => 'Reject Refunds', 'slug' => 'finance.refunds.reject', 'module' => 'finance', 'action' => 'reject'],
            ['name' => 'Process Refunds', 'slug' => 'finance.refunds.process', 'module' => 'finance', 'action' => 'process'],
            ['name' => 'View Payouts', 'slug' => 'finance.payouts.view', 'module' => 'finance', 'action' => 'view'],
            ['name' => 'Approve Payouts', 'slug' => 'finance.payouts.approve', 'module' => 'finance', 'action' => 'approve'],
            ['name' => 'Hold Payouts', 'slug' => 'finance.payouts.hold', 'module' => 'finance', 'action' => 'hold'],
            ['name' => 'Reject Payouts', 'slug' => 'finance.payouts.reject', 'module' => 'finance', 'action' => 'reject'],
            ['name' => 'Disburse Payouts', 'slug' => 'finance.payouts.disburse', 'module' => 'finance', 'action' => 'disburse'],
            ['name' => 'View Ledger', 'slug' => 'finance.ledger.view', 'module' => 'finance', 'action' => 'view'],
            ['name' => 'Adjust Ledger', 'slug' => 'finance.ledger.adjust', 'module' => 'finance', 'action' => 'adjust'],
            ['name' => 'View Reconciliation', 'slug' => 'finance.reconciliation.view', 'module' => 'finance', 'action' => 'view'],
            ['name' => 'Run Reconciliation', 'slug' => 'finance.reconciliation.run', 'module' => 'finance', 'action' => 'run'],
            ['name' => 'Resolve Reconciliation Exceptions', 'slug' => 'finance.reconciliation.resolve', 'module' => 'finance', 'action' => 'resolve'],
            ['name' => 'View Reports', 'slug' => 'finance.reports.view', 'module' => 'finance', 'action' => 'view'],
            ['name' => 'Export Reports', 'slug' => 'finance.reports.export', 'module' => 'finance', 'action' => 'export'],
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

    }
}
