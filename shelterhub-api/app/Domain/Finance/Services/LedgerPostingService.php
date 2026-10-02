<?php

namespace App\Domain\Finance\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;
use RuntimeException;

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
    public const ACC_PLATFORM_PROMOTION_EXPENSE = 5300;

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
        string $grandTotal,
        string $grossSubtotal,
        array $sellerSplits,
        string $commissionTotal,
        string $deliveryFee = '0.00',
        string $discountTotal = '0.00'
    ): string {
        $cashAndPromoDebit = bcadd($grandTotal, $discountTotal, 2);
        $grossSalesAndDeliveryCredit = bcadd($grossSubtotal, $deliveryFee, 2);
        if (bccomp($cashAndPromoDebit, $grossSalesAndDeliveryCredit, 2) !== 0) {
            throw new InvalidArgumentException('Order payment, discount, gross subtotal and delivery do not balance.');
        }

        return DB::transaction(function () use (
            $orderId,
            $grandTotal,
            $grossSubtotal,
            $sellerSplits,
            $commissionTotal,
            $deliveryFee,
            $discountTotal
        ) {
            $clearingLines = [
            [
                'account_id' => self::ACC_MPESA_CLEARING,
                'debit' => $grandTotal,
                'credit' => '0.00',
                'seller_id' => null,
                'order_id' => $orderId,
            ],
            [
                'account_id' => self::ACC_MARKETPLACE_SALES,
                'debit' => '0.00',
                'credit' => $grossSubtotal,
                'seller_id' => null,
                'order_id' => $orderId,
            ],
            ];

            if (bccomp($discountTotal, '0.00', 2) > 0) {
                $clearingLines[] = [
                    'account_id' => self::ACC_PLATFORM_PROMOTION_EXPENSE,
                    'debit' => $discountTotal,
                    'credit' => '0.00',
                    'seller_id' => null,
                    'order_id' => $orderId,
                ];
            }

            if (bccomp($deliveryFee, '0.00', 2) > 0) {
                $clearingLines[] = [
                    'account_id' => self::ACC_DELIVERY_REVENUE,
                    'debit' => '0.00',
                    'credit' => $deliveryFee,
                    'seller_id' => null,
                    'order_id' => $orderId,
                ];
            }

            $clearingTxId = $this->commitBalancedTransaction(
                type: 'order_payment',
                referenceType: 'order',
                referenceId: $orderId,
                description: "Gross sales, customer clearing and platform discount for order {$orderId}",
                lines: $clearingLines
            );

            $escrowLines = [
                [
                    'account_id' => self::ACC_MARKETPLACE_SALES,
                    'debit' => $grossSubtotal,
                    'credit' => '0.00',
                    'seller_id' => null,
                    'order_id' => $orderId,
                ],
            ];

            foreach ($sellerSplits as $split) {
                $escrowLines[] = [
                    'account_id' => self::ACC_SELLER_PAYABLE,
                    'debit' => '0.00',
                    'credit' => $split['net_amount'],
                    'seller_id' => $split['seller_id'],
                    'order_id' => $orderId,
                ];
            }

            if (bccomp($commissionTotal, '0.00', 2) > 0) {
                $escrowLines[] = [
                    'account_id' => self::ACC_COMMISSION_REVENUE,
                    'debit' => '0.00',
                    'credit' => $commissionTotal,
                    'seller_id' => null,
                    'order_id' => $orderId,
                ];
            }

            $this->commitBalancedTransaction(
                type: 'seller_settlement',
                referenceType: 'order',
                referenceId: $orderId,
                description: "Escrow allocation and platform commission booking for order {$orderId}",
                lines: $escrowLines
            );

            return $clearingTxId;
        });
    }

    /**
     * Record M-Pesa B2C Seller Payout Disbursement
     * DR Seller Payable (Escrow release): KSh 9,000
     * CR M-Pesa Clearing:                 KSh 9,000
     */
    public function postSellerPayout(string $payoutId, string $sellerId, string $amount): string
    {
        $lines = [
            [
                'account_id' => self::ACC_SELLER_PAYABLE,
                'debit' => $amount,
                'credit' => '0.00',
                'seller_id' => $sellerId,
                'order_id' => null,
            ],
            [
                'account_id' => self::ACC_MPESA_CLEARING,
                'debit' => '0.00',
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
    public function postCustomerRefund(string $refundId, string $orderId, string $amount): string
    {
        $lines = [
            [
                'account_id' => self::ACC_CUSTOMER_REFUND,
                'debit' => $amount,
                'credit' => '0.00',
                'seller_id' => null,
                'order_id' => $orderId,
            ],
            [
                'account_id' => self::ACC_MPESA_CLEARING,
                'debit' => '0.00',
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
        $totalDebit = '0.00';
        $totalCredit = '0.00';
        foreach ($lines as $line) {
            $debit = $line['debit'] ?? '0.00';
            $credit = $line['credit'] ?? '0.00';
            if (!is_string($debit) || !is_string($credit) || !is_numeric($debit) || !is_numeric($credit)) {
                throw new InvalidArgumentException('Ledger amounts must be decimal strings.');
            }
            if (bccomp($debit, '0.00', 2) < 0 || bccomp($credit, '0.00', 2) < 0 || (bccomp($debit, '0.00', 2) > 0 && bccomp($credit, '0.00', 2) > 0)) {
                throw new InvalidArgumentException('Each ledger line must have one non-negative debit or credit amount.');
            }
            $totalDebit = bcadd($totalDebit, $debit, 2);
            $totalCredit = bcadd($totalCredit, $credit, 2);
        }

        // Strict accounting check
        if (bccomp($totalDebit, $totalCredit, 2) !== 0) {
            throw new InvalidArgumentException(
                "Unbalanced financial transaction! Total Debit ({$totalDebit}) != Total Credit ({$totalCredit})"
            );
        }

        return DB::transaction(function () use ($type, $referenceType, $referenceId, $description, $lines) {
            $txId = Str::uuid()->toString();
            $txNumber = 'TXN-' . date('YmdHis') . '-' . strtoupper(Str::random(4));

            $inserted = DB::table('financial_transactions')->insertOrIgnore([
                'id' => $txId,
                'transaction_number' => $txNumber,
                'type' => $type,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'description' => $description,
                'status' => 'posted',
                'posted_at' => now(),
            ]);

            if ($inserted !== 1) {
                $existing = DB::table('financial_transactions')
                    ->where('type', $type)
                    ->where('reference_type', $referenceType)
                    ->where('reference_id', $referenceId)
                    ->first();
                if (!$existing) {
                    throw new RuntimeException('Ledger event could not be claimed or loaded.');
                }
                return $existing->id;
            }

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
