<?php

namespace App\Providers;

use App\Models\User;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Gate;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * The policy mappings for the application.
     */
    protected $policies = [
        // 'App\Models\Model' => 'App\Policies\ModelPolicy',
    ];

    /**
     * Register any authentication / authorization services.
     */
    public function boot(): void
    {
        $this->registerPolicies();

        // 1. Core Persona Role Gates
        Gate::define('customer', function (User $user) {
            return $user->status === 'active' && ($user->hasRole('customer') || $user->hasRole('super_admin'));
        });

        Gate::define('seller', function (User $user) {
            return $user->status === 'active' && ($user->hasRole('seller') || $user->seller !== null);
        });

        Gate::define('super_admin', function (User $user) {
            return $user->status === 'active' && $user->hasRole('super_admin');
        });

        // 2. Finance Granular & Composite Gate
        Gate::define('finance_admin', function (User $user) {
            return $user->status === 'active' && ($user->hasRole('finance_admin') || $user->hasRole('super_admin'));
        });

        // Granular Finance Capabilities
        Gate::define('orders.view_financial', fn(User $user) => $user->hasPermission('orders.view_financial') || $user->hasRole('finance_admin') || $user->hasRole('super_admin'));
        Gate::define('payments.view', fn(User $user) => $user->hasPermission('payments.view') || $user->hasRole('finance_admin') || $user->hasRole('super_admin'));
        Gate::define('payments.reconcile', fn(User $user) => $user->hasPermission('payments.reconcile') || $user->hasRole('finance_admin') || $user->hasRole('super_admin'));
        Gate::define('refunds.view', fn(User $user) => $user->hasPermission('refunds.view') || $user->hasRole('finance_admin') || $user->hasRole('super_admin'));
        Gate::define('refunds.approve', fn(User $user) => $user->hasPermission('refunds.approve') || $user->hasRole('finance_admin') || $user->hasRole('super_admin'));
        Gate::define('refunds.process', fn(User $user) => $user->hasPermission('refunds.process') || $user->hasRole('finance_admin') || $user->hasRole('super_admin'));
        Gate::define('payouts.view', fn(User $user) => $user->hasPermission('payouts.view') || $user->hasRole('finance_admin') || $user->hasRole('super_admin'));
        Gate::define('payouts.approve', fn(User $user) => $user->hasPermission('payouts.approve') || $user->hasRole('finance_admin') || $user->hasRole('super_admin'));
        Gate::define('payouts.hold', fn(User $user) => $user->hasPermission('payouts.hold') || $user->hasRole('finance_admin') || $user->hasRole('super_admin'));
        Gate::define('payouts.process', fn(User $user) => $user->hasPermission('payouts.process') || $user->hasRole('finance_admin') || $user->hasRole('super_admin'));
        Gate::define('ledger.view', fn(User $user) => $user->hasPermission('ledger.view') || $user->hasRole('finance_admin') || $user->hasRole('super_admin'));
        Gate::define('ledger.adjust', fn(User $user) => $user->hasPermission('ledger.adjust') || $user->hasRole('finance_admin') || $user->hasRole('super_admin'));
        Gate::define('reconciliation.view', fn(User $user) => $user->hasPermission('reconciliation.view') || $user->hasRole('finance_admin') || $user->hasRole('super_admin'));
        Gate::define('reconciliation.resolve', fn(User $user) => $user->hasPermission('reconciliation.resolve') || $user->hasRole('finance_admin') || $user->hasRole('super_admin'));
        Gate::define('reports.view', fn(User $user) => $user->hasPermission('reports.view') || $user->hasRole('finance_admin') || $user->hasRole('super_admin'));
        Gate::define('reports.export', fn(User $user) => $user->hasPermission('reports.export') || $user->hasRole('finance_admin') || $user->hasRole('super_admin'));

        // 3. Domain Admin Gates
        Gate::define('products.manage', function (User $user) {
            return $user->status === 'active' && ($user->hasRole('product_admin') || $user->hasRole('super_admin') || $user->hasPermission('products.manage'));
        });

        Gate::define('sellers.manage', function (User $user) {
            return $user->status === 'active' && ($user->hasRole('seller_admin') || $user->hasRole('super_admin') || $user->hasPermission('sellers.manage'));
        });
    }
}
