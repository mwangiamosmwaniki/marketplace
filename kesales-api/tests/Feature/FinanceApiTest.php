<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\Payout;
use App\Models\Seller;
use App\Models\FinancialTransaction;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Queue;
use App\Jobs\DisburseB2CPayoutJob;

class FinanceApiTest extends TestCase
{
    public function test_finance_endpoints_are_rbac_guarded(): void
    {
        // Unauthenticated -> 401
        $resUnauth = $this->getJson('/api/v1/finance/dashboard');
        $resUnauth->assertStatus(401);

        // Authenticated as Customer -> 403 Forbidden
        $this->authenticateCustomer();
        $resCust = $this->getJson('/api/v1/finance/dashboard');
        $resCust->assertStatus(403);
    }

    public function test_finance_admin_can_post_balanced_journal_adjustment(): void
    {
        $this->authenticateFinanceAdmin();

        // 1. Unbalanced adjustment rejected
        $resUnbalanced = $this->postJson('/api/v1/finance/ledger/adjustments', [
            'description' => 'Unbalanced audit adjustment',
            'lines' => [
                ['account_id' => 1000, 'debit' => 1000.00, 'credit' => 0.00],
                ['account_id' => 2000, 'debit' => 0.00, 'credit' => 800.00], // Mismatch!
            ],
        ]);
        $resUnbalanced->assertStatus(422);

        // 2. Balanced adjustment accepted
        $resBalanced = $this->postJson('/api/v1/finance/ledger/adjustments', [
            'description' => 'Annual bank fee adjustment',
            'lines' => [
                ['account_id' => 5000, 'debit' => 250.00, 'credit' => 0.00],
                ['account_id' => 1000, 'debit' => 0.00, 'credit' => 250.00],
            ],
        ]);
        $resBalanced->assertStatus(201);
        $this->assertDatabaseHas('financial_transactions', [
            'description' => 'Annual bank fee adjustment',
            'type' => 'manual_adjustment',
        ]);
    }

    public function test_disburse_payout_dispatches_b2c_job(): void
    {
        Queue::fake();
        $this->authenticateFinanceAdmin();

        $seller = Seller::create([
            'id' => (string) Str::uuid(),
            'user_id' => (string) Str::uuid(),
            'store_name' => 'Samburu Crafts',
            'slug' => 'samburu-crafts',
            'status' => 'approved',
        ]);

        $payout = Payout::create([
            'id' => (string) Str::uuid(),
            'payout_number' => 'PO-TEST-001',
            'seller_id' => $seller->id,
            'amount' => 5000.00,
            'currency' => 'KES',
            'status' => 'approved',
            'requested_at' => now(),
            'approved_at' => now(),
        ]);

        $response = $this->postJson("/api/v1/finance/payouts/{$payout->id}/disburse");
        $response->assertStatus(200);

        Queue::assertPushed(DisburseB2CPayoutJob::class, function ($job) use ($payout) {
            $reflection = new \ReflectionClass($job);
            $prop = $reflection->getProperty('payoutId');
            $prop->setAccessible(true);
            return $prop->getValue($job) === $payout->id;
        });

        $payout->refresh();
        $this->assertEquals('processing', $payout->status);
    }
}
