<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\Payout;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Refund;
use App\Models\Role;
use App\Models\Seller;
use App\Models\User;
use App\Jobs\DisburseB2CPayoutJob;
use App\Integrations\Mpesa\MpesaClient;
use App\Domain\Finance\Services\RefundProcessorService;
use App\Models\FinancialTransaction;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Queue;

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

    public function test_finance_role_requires_an_explicit_operation_permission(): void
    {
        Role::where('slug', 'finance_admin')->firstOrFail()->permissions()->detach();
        $this->authenticateFinanceAdmin();

        $this->getJson('/api/v1/finance/dashboard')->assertStatus(403);
    }

    public function test_manual_payment_reconciliation_cannot_mark_payment_paid(): void
    {
        $this->authenticateFinanceAdmin();

        $response = $this->postJson('/api/v1/finance/payments/'.Str::uuid().'/reconcile', [
            'provider_transaction_id' => 'MPESA123456',
            'reason' => 'Provider confirmation is not yet available',
        ]);

        $response->assertStatus(409)
            ->assertJsonPath('error.code', 'PROVIDER_VERIFICATION_REQUIRED');
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
        $sellerUser = User::factory()->create();

        $seller = Seller::create([
            'id' => (string) Str::uuid(),
            'user_id' => $sellerUser->id,
            'store_name' => 'Samburu Crafts',
            'slug' => 'samburu-crafts',
            'legal_name' => 'Samburu Crafts Limited',
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

    public function test_sandbox_payout_without_gateway_credentials_never_fabricates_settlement(): void
    {
        config([
            'kesales.mpesa.env' => 'sandbox',
            'kesales.mpesa.consumer_key' => '',
            'kesales.mpesa.consumer_secret' => '',
            'kesales.mpesa.b2c_shortcode' => '',
            'kesales.mpesa.b2c_initiator' => '',
            'kesales.mpesa.b2c_security_credential' => '',
        ]);

        $sellerUser = User::factory()->create(['phone' => '+254700000123']);
        $seller = Seller::create([
            'id' => (string) Str::uuid(),
            'user_id' => $sellerUser->id,
            'store_name' => 'No Simulation Store',
            'slug' => 'no-simulation-store',
            'legal_name' => 'No Simulation Store Limited',
            'status' => 'approved',
        ]);
        $payout = Payout::create([
            'id' => (string) Str::uuid(),
            'payout_number' => 'PO-NO-SIMULATION-001',
            'seller_id' => $seller->id,
            'amount' => 5000,
            'currency' => 'KES',
            'status' => 'processing',
            'requested_at' => now(),
        ]);

        (new DisburseB2CPayoutJob($payout->id))->handle(new MpesaClient());

        $this->assertSame('failed', $payout->fresh()->status);
        $this->assertDatabaseMissing('financial_transactions', [
            'reference_type' => 'payout',
            'reference_id' => $payout->id,
        ]);
    }

    public function test_finance_reports_export_requires_valid_contract_and_metadata(): void
    {
        $this->authenticateFinanceAdmin();

        $invalid = $this->postJson('/api/v1/finance/reports/export', [
            'report_type' => 'invalid_type',
            'format' => 'csv',
        ]);
        $invalid->assertStatus(422);

        $valid = $this->postJson('/api/v1/finance/reports/export', [
            'report_type' => 'financial_summary',
            'format' => 'json',
            'date_from' => now()->subDays(7)->toDateString(),
            'date_to' => now()->toDateString(),
            'include_zero_rows' => true,
        ]);

        $valid->assertStatus(202)
            ->assertJsonPath('success', true)
            ->assertJsonPath('report.report_type', 'financial_summary')
            ->assertJsonPath('report.format', 'json');
    }

    public function test_sandbox_refund_without_gateway_credentials_never_posts_refund_ledger(): void
    {
        config([
            'kesales.mpesa.env' => 'sandbox',
            'kesales.mpesa.consumer_key' => '',
            'kesales.mpesa.consumer_secret' => '',
            'kesales.mpesa.b2c_shortcode' => '',
            'kesales.mpesa.b2c_initiator' => '',
            'kesales.mpesa.b2c_security_credential' => '',
        ]);

        $customer = User::factory()->create();
        $order = Order::create([
            'id' => (string) Str::uuid(),
            'order_number' => 'KS-ORD-NO-SIMULATION-001',
            'customer_id' => $customer->id,
            'currency' => 'KES',
            'subtotal' => 5000,
            'discount_total' => 0,
            'delivery_fee' => 0,
            'tax_total' => 0,
            'grand_total' => 5000,
            'status' => 'PAYMENT_CONFIRMED',
            'payment_status' => 'paid',
        ]);
        $payment = Payment::create([
            'id' => (string) Str::uuid(),
            'payment_number' => 'PAY-NO-SIMULATION-001',
            'order_id' => $order->id,
            'customer_id' => $customer->id,
            'provider' => 'mpesa',
            'method' => 'mpesa_stk',
            'amount' => 5000,
            'currency' => 'KES',
            'status' => 'paid',
            'provider_transaction_id' => 'MPESA-REAL-REFERENCE',
        ]);
        $refund = Refund::create([
            'id' => (string) Str::uuid(),
            'refund_number' => 'REF-NO-SIMULATION-001',
            'order_id' => $order->id,
            'payment_id' => $payment->id,
            'customer_id' => $customer->id,
            'amount' => 1000,
            'reason' => 'Return approved for provider verification.',
            'status' => 'approved',
            'requested_by' => $customer->id,
        ]);

        try {
            app(RefundProcessorService::class)->processRefund($refund->id);
            $this->fail('A refund without configured provider credentials must not complete.');
        } catch (\RuntimeException) {
            $this->assertSame('failed', $refund->fresh()->status);
            $this->assertDatabaseMissing('financial_transactions', [
                'reference_type' => 'refund',
                'reference_id' => $refund->id,
            ]);
        }
    }
}
