<?php

namespace Tests\Unit;

use Tests\TestCase;
use App\Domain\Finance\Services\LedgerPostingService;
use App\Models\FinancialTransaction;
use App\Models\FinancialTransactionLine;
use Illuminate\Support\Str;
use InvalidArgumentException;

class LedgerPostingServiceTest extends TestCase
{
    protected LedgerPostingService $ledgerService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->ledgerService = new LedgerPostingService();
    }

    public function test_post_order_payment_creates_balanced_two_leg_entries(): void
    {
        $orderId = (string) Str::uuid();
        $sellerId = (string) Str::uuid();
        $grandTotal = 10500.00; // KSh 10,000 subtotal + KSh 500 delivery fee
        $deliveryFee = 500.00;
        $commissionTotal = 1000.00; // 10% of KSh 10,000
        $sellerSplits = [
            [
                'seller_id' => $sellerId,
                'net_amount' => 9000.00,
            ]
        ];

        $txId = $this->ledgerService->postOrderPayment(
            orderId: $orderId,
            grandTotal: $grandTotal,
            sellerSplits: $sellerSplits,
            commissionTotal: $commissionTotal,
            deliveryFee: $deliveryFee
        );

        $this->assertNotEmpty($txId);

        // Verify Leg 1 (M-Pesa clearing & GMV influx)
        $clearingTx = FinancialTransaction::with('lines')->find($txId);
        $this->assertNotNull($clearingTx);
        $this->assertEquals('order_payment', $clearingTx->type);

        $totalDebits = $clearingTx->lines->sum('debit');
        $totalCredits = $clearingTx->lines->sum('credit');
        $this->assertEquals($grandTotal, $totalDebits);
        $this->assertEquals($grandTotal, $totalCredits);

        // Verify Leg 2 (Escrow allocation & Commission recognition)
        $escrowTx = FinancialTransaction::with('lines')
            ->where('reference_id', $orderId)
            ->where('type', 'seller_settlement')
            ->first();

        $this->assertNotNull($escrowTx);
        $escrowDebits = $escrowTx->lines->sum('debit');
        $escrowCredits = $escrowTx->lines->sum('credit');
        $this->assertEquals(10000.00, $escrowDebits);
        $this->assertEquals(10000.00, $escrowCredits);
    }

    public function test_post_seller_payout_creates_balanced_escrow_release(): void
    {
        $payoutId = (string) Str::uuid();
        $sellerId = (string) Str::uuid();
        $amount = 9000.00;

        $txId = $this->ledgerService->postSellerPayout(
            payoutId: $payoutId,
            sellerId: $sellerId,
            amount: $amount
        );

        $tx = FinancialTransaction::with('lines')->find($txId);
        $this->assertNotNull($tx);
        $this->assertEquals('payout_disbursement', $tx->type);

        $debitLine = $tx->lines->where('account_id', LedgerPostingService::ACC_SELLER_PAYABLE)->first();
        $creditLine = $tx->lines->where('account_id', LedgerPostingService::ACC_MPESA_CLEARING)->first();

        $this->assertEquals($amount, (float) $debitLine->debit);
        $this->assertEquals($amount, (float) $creditLine->credit);
    }

    public function test_unbalanced_journal_throws_invalid_argument_exception(): void
    {
        $this->expectException(InvalidArgumentException::class);

        // Reflection to call protected method commitBalancedTransaction
        $reflection = new \ReflectionClass(LedgerPostingService::class);
        $method = $reflection->getMethod('commitBalancedTransaction');
        $method->setAccessible(true);

        $method->invoke(
            $this->ledgerService,
            'test_unbalanced',
            'test',
            (string) Str::uuid(),
            'Unbalanced test',
            [
                ['account_id' => 1000, 'debit' => 100.00, 'credit' => 0.00],
                ['account_id' => 2000, 'debit' => 0.00, 'credit' => 50.00], // Mismatch!
            ]
        );
    }
}
