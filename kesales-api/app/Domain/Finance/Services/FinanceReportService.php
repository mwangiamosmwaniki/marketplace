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
        $settledGmv = (float) Order::where('payment_status', 'paid')->sum('grand_total');

        // 2. Real Net Platform Commission earned
        $totalCommission = (float) DB::table('seller_orders')
            ->join('orders', 'seller_orders.order_id', '=', 'orders.id')
            ->where('orders.payment_status', 'paid')
            ->sum('seller_orders.commission_total');

        // 3. Current M-Pesa Clearing Balance: Sum of debits minus credits in Account 1000
        $clearingDebits = (float) FinancialTransactionLine::where('account_id', 1000)->sum('debit');
        $clearingCredits = (float) FinancialTransactionLine::where('account_id', 1000)->sum('credit');
        $clearingBalance = round($clearingDebits - $clearingCredits, 2);

        // 4. Current Escrow Liability: Account 2000 credits (inflow) minus debits (disbursed)
        $escrowCredits = (float) FinancialTransactionLine::where('account_id', 2000)->sum('credit');
        $escrowDebits = (float) FinancialTransactionLine::where('account_id', 2000)->sum('debit');
        $escrowLiability = round($escrowCredits - $escrowDebits, 2);

        // 5. Estimated 16% standard VAT on marketplace commissions
        $vatLiability = round(($totalCommission * 0.16) / 1.16, 2);

        // 6. Total disbursed payouts
        $disbursedPayouts = (float) Payout::where('status', 'completed')->sum('amount');

        return [
            'period' => date('F Y'),
            'gross_merchandise_value' => $settledGmv,
            'total_commissions' => $totalCommission,
            'clearing_balance' => max(0.00, $clearingBalance),
            'escrow_reserve' => max(0.00, $escrowLiability),
            'disbursed_payouts' => $disbursedPayouts,
            'vat_liability_estimated' => $vatLiability,
            'active_currency' => 'KES',
            'computed_at' => now()->toIso8601String(),
        ];
    }
}
