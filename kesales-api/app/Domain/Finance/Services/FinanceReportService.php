<?php

namespace App\Domain\Finance\Services;

use App\Models\Order;
use App\Models\Payment;
use App\Models\Payout;
use App\Models\Seller;
use App\Models\FinancialTransactionLine;
use Illuminate\Support\Facades\DB;

class FinanceReportService
{
    /**
     * Compute real-time platform financial balances directly from PostgreSQL transactions.
     * Zero hardcoded numbers.
     */
    public function getSummaryMetrics(): array
    {
        // 1. Gross Merchandise Value from settled orders
        $settledGmv = (string) (DB::table('orders')
            ->where('payment_status', 'paid')
            ->selectRaw('COALESCE(SUM(grand_total), 0) AS total')
            ->value('total') ?? '0.00');

        // 2. Real Net Platform Commission earned
        $totalCommission = (string) (DB::table('seller_orders')
            ->join('orders', 'seller_orders.order_id', '=', 'orders.id')
            ->where('orders.payment_status', 'paid')
            ->selectRaw('COALESCE(SUM(seller_orders.commission_total), 0) AS total')
            ->value('total') ?? '0.00');

        // 3. Current M-Pesa Clearing Balance: Sum of debits minus credits in Account 1000
        $clearingDebits = (string) (FinancialTransactionLine::where('account_id', 1000)->sum('debit') ?: '0.00');
        $clearingCredits = (string) (FinancialTransactionLine::where('account_id', 1000)->sum('credit') ?: '0.00');
        $clearingBalance = bcsub($clearingDebits, $clearingCredits, 2);

        // 4. Current Escrow Liability: Account 2000 credits (inflow) minus debits (disbursed)
        $escrowCredits = (string) (FinancialTransactionLine::where('account_id', 2000)->sum('credit') ?: '0.00');
        $escrowDebits = (string) (FinancialTransactionLine::where('account_id', 2000)->sum('debit') ?: '0.00');
        $escrowLiability = bcsub($escrowCredits, $escrowDebits, 2);

        // 5. Estimated 16% standard VAT on marketplace commissions
        $vatLiability = $this->roundMoney(bcdiv(bcmul($totalCommission, '16', 8), '116', 8));

        // 6. Total disbursed payouts
        $disbursedPayouts = (string) (Payout::where('status', 'completed')->sum('amount') ?: '0.00');

        return [
            'period' => date('F Y'),
            'gross_merchandise_value' => $settledGmv,
            'total_commissions' => $totalCommission,
            'clearing_balance' => bccomp($clearingBalance, '0.00', 2) > 0 ? $clearingBalance : '0.00',
            'escrow_reserve' => bccomp($escrowLiability, '0.00', 2) > 0 ? $escrowLiability : '0.00',
            'disbursed_payouts' => $disbursedPayouts,
            'vat_liability_estimated' => $vatLiability,
            'active_currency' => 'KES',
            'computed_at' => now()->toIso8601String(),
        ];
    }

    private function roundMoney(string $amount): string
    {
        return bcdiv(bcadd(bcmul($amount, '100', 8), '0.5', 0), '100', 2);
    }
}
