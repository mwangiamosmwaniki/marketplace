<?php

namespace App\Domain\Finance\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;

/**
 * Double-Entry Financial Ledger Posting Service
 * 
 * Enforces the core accounting equation:
 * SUM(debits) === SUM(credits)
 * 
 * All marketplace transactions create balanced, immutable journal lines
 * mapped to standard Chart of Accounts (COA).
 */
class LedgerPostingService
{
    // Chart of Accounts IDs
    public const ACC_MPESA_CLEARING = 1000;
    public const ACC_SELLER_PAYABLE = 2000;
    public const ACC_CUSTOMER_REFUND = 2100;
    public const ACC_MARKETPLACE_SALES = 4000;
    public const ACC_DELIVERY_REVENUE = 4100;
    public const ACC_COMMISSION_REVENUE = 4200;
    public const ACC_REFUND_EXPENSE = 5100;

    /**
     * Record settled customer order payment using the Principal-Agent Marketplace Accounting Model:
     * 
     * Journal 1 - Gross Cash Settlement:
     *   DR M-Pesa Clearing (1000):          Grand Total (KSh 10,000)
     *   CR Marketplace Gross Sales (4000):  Order Subtotal (KSh 9,500)
     *   CR Delivery Revenue (4100):         Delivery Fee (KSh 500)
     * 
     * Journal 2 - Escrow Allocation & Revenue Recognition:
     *   DR Marketplace Gross Sales (4000):  Order Subtotal (KSh 9,500)
     *   CR Seller Payable [Escrow] (2000):  Seller Net Amounts (KSh 8,550)
     *   CR Platform Commission (4200):      Marketplace Take-rate (KSh 950)
     * 
     * Both legs strictly enforce SUM(debits) === SUM(credits).
     */
    public function postOrderPayment(
        string $orderId,
        float $grandTotal,
        array $sellerSplits, // [ ['seller_id' => uuid, 'net_amount' => 8550], ... ]
        float $commissionTotal,
        float $deliveryFee = 0.00
    ): string {
        $orderSubtotal = round($grandTotal - $deliveryFee, 2);

        // --- Leg 1: Gross Clearing & GMV Influx ---
        $clearingLines = [
            [
                'account_id' => self::ACC_MPESA_CLEARING,
                'debit' => $grandTotal,
                'credit' => 0.00,
                'seller_id' => null,
                'order_id' => $orderId,
            ],
            [
                'account_id' => self::ACC_MARKETPLACE_SALES,
                'debit' => 0.00,
                'credit' => $orderSubtotal,
                'seller_id' => null,
                'order_id' => $orderId,
            ],
        ];

        if ($deliveryFee > 0) {
            $clearingLines[] = [
                'account_id' => self::ACC_DELIVERY_REVENUE,
                'debit' => 0.00,
                'credit' => $deliveryFee,
                'seller_id' => null,
                'order_id' => $orderId,
            ];
        }

        $clearingTxId = $this->commitBalancedTransaction(
            type: 'order_payment',
            referenceType: 'order',
            referenceId: $orderId,
            description: "M-Pesa Gross Clearing & GMV settlement for order {$orderId}",
            lines: $clearingLines
        );

        // --- Leg 2: Escrow Liability Allocation & Commission Recognition ---
        $escrowLines = [
            [
                'account_id' => self::ACC_MARKETPLACE_SALES,
                'debit' => $orderSubtotal,
                'credit' => 0.00,
                'seller_id' => null,
                'order_id' => $orderId,
            ],
        ];

        foreach ($sellerSplits as $split) {
            $escrowLines[] = [
                'account_id' => self::ACC_SELLER_PAYABLE,
                'debit' => 0.00,
                'credit' => $split['net_amount'],
                'seller_id' => $split['seller_id'],
                'order_id' => $orderId,
            ];
        }

        if ($commissionTotal > 0) {
            $escrowLines[] = [
                'account_id' => self::ACC_COMMISSION_REVENUE,
                'debit' => 0.00,
                'credit' => $commissionTotal,
                'seller_id' => null,
                'order_id' => $orderId,
            ];
        }

        $this->commitBalancedTransaction(
            type: 'seller_settlement',
            referenceType: 'order',
            referenceId: $orderId,
            description: "Escrow allocation & platform commission booking for order {$orderId}",
            lines: $escrowLines
        );

        return $clearingTxId;
    }

    /**
     * Record M-Pesa B2C Seller Payout Disbursement
     * DR Seller Payable (Escrow release): KSh 9,000
     * CR M-Pesa Clearing:                 KSh 9,000
     */
    public function postSellerPayout(string $payoutId, string $sellerId, float $amount): string
    {
        $lines = [
            [
                'account_id' => self::ACC_SELLER_PAYABLE,
                'debit' => $amount,
                'credit' => 0.00,
                'seller_id' => $sellerId,
                'order_id' => null,
            ],
            [
                'account_id' => self::ACC_MPESA_CLEARING,
                'debit' => 0.00,
                'credit' => $amount,
                'seller_id' => $sellerId,
                'order_id' => null,
            ],
        ];

        return $this->commitBalancedTransaction(
            type: 'payout_disbursement',
            referenceType: 'payout',
            referenceId: $payoutId,
            description: "M-Pesa B2C Payout disbursement to seller {$sellerId}",
            lines: $lines
        );
    }

    /**
     * Record Customer Refund Disbursement
     * DR Refund Expense / Liability: KSh 2,000
     * CR M-Pesa Clearing:            KSh 2,000
     */
    public function postCustomerRefund(string $refundId, string $orderId, float $amount, ?string $customerId = null): string
    {
        $lines = [
            [
                'account_id' => self::ACC_CUSTOMER_REFUND,
                'debit' => $amount,
                'credit' => 0.00,
                'seller_id' => null,
                'order_id' => $orderId,
            ],
            [
                'account_id' => self::ACC_MPESA_CLEARING,
                'debit' => 0.00,
                'credit' => $amount,
                'seller_id' => null,
                'order_id' => $orderId,
            ],
        ];

        return $this->commitBalancedTransaction(
            type: 'refund',
            referenceType: 'refund',
            referenceId: $refundId,
            description: "Customer refund issued for order {$orderId}",
            lines: $lines
        );
    }

    /**
     * Commits journal entry verifying that SUM(debit) === SUM(credit)
     */
    protected function commitBalancedTransaction(
        string $type,
        string $referenceType,
        string $referenceId,
        string $description,
        array $lines
    ): string {
        $totalDebit = round(array_sum(array_column($lines, 'debit')), 2);
        $totalCredit = round(array_sum(array_column($lines, 'credit')), 2);

        // Strict accounting check
        if (abs($totalDebit - $totalCredit) > 0.001) {
            throw new InvalidArgumentException(
                "Unbalanced financial transaction! Total Debit ({$totalDebit}) != Total Credit ({$totalCredit})"
            );
        }

        return DB::transaction(function () use ($type, $referenceType, $referenceId, $description, $lines) {
            $txId = Str::uuid()->toString();
            $txNumber = 'TXN-' . date('YmdHis') . '-' . strtoupper(Str::random(4));

            DB::table('financial_transactions')->insert([
                'id' => $txId,
                'transaction_number' => $txNumber,
                'type' => $type,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'description' => $description,
                'status' => 'posted',
                'posted_at' => now(),
            ]);

            foreach ($lines as $line) {
                DB::table('financial_transaction_lines')->insert([
                    'id' => Str::uuid()->toString(),
                    'financial_transaction_id' => $txId,
                    'account_id' => $line['account_id'],
                    'debit' => $line['debit'],
                    'credit' => $line['credit'],
                    'currency' => 'KES',
                    'seller_id' => $line['seller_id'] ?? null,
                    'order_id' => $line['order_id'] ?? null,
                ]);
            }

            return $txId;
        });
    }
}
