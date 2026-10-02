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

        // Finance capabilities are granted per operation, never by role name alone.
        foreach ([
            'finance.dashboard.view',
            'finance.orders.view',
            'finance.payments.view',
            'finance.payments.reconcile',
            'finance.refunds.view',
            'finance.refunds.approve',
            'finance.refunds.reject',
            'finance.refunds.process',
            'finance.payouts.view',
            'finance.payouts.approve',
            'finance.payouts.hold',
            'finance.payouts.reject',
            'finance.payouts.disburse',
            'finance.ledger.view',
            'finance.ledger.adjust',
            'finance.reconciliation.view',
            'finance.reconciliation.run',
            'finance.reconciliation.resolve',
            'finance.reports.view',
            'finance.reports.export',
        ] as $permission) {
            Gate::define($permission, fn(User $user) =>
                $user->status === 'active' &&
                ($user->hasPermission($permission) || $user->hasRole('super_admin'))
            );
        }

        // 3. Domain Admin Gates
        Gate::define('products.manage', function (User $user) {
            return $user->status === 'active' && ($user->hasRole('product_admin') || $user->hasRole('super_admin') || $user->hasPermission('products.manage'));
        });

        Gate::define('sellers.manage', function (User $user) {
            return $user->status === 'active' && ($user->hasRole('seller_admin') || $user->hasRole('super_admin') || $user->hasPermission('sellers.manage'));
        });
    }
}
