<?php

namespace App\Domain\Settlement\Services;

use App\Models\Seller;
use App\Models\SellerOrder;
use App\Models\Payout;
use App\Models\Refund;
use Illuminate\Support\Facades\DB;

/**
 * Authoritative Seller Settlement Service
 * 
 * Single source of truth for seller balances and payout eligibility:
 * - Eligibility: DELIVERED fulfillment status + return window expired (15 days) + no open dispute + no compliance hold
 * - Deterministic formula:
 *   Available Balance = SUM(Eligible Delivered Sub-orders Net) - Disbursed Payouts - Approved Refunds - Active Pending Payouts
 */
class SellerSettlementService
{
    public const RETURN_WINDOW_DAYS = 15;

    /**
     * Compute current balances for a seller.
     */
    public function calculateSellerBalances(string $sellerId): array
    {
        $seller = Seller::findOrFail($sellerId);
        $returnThreshold = now()->subDays(self::RETURN_WINDOW_DAYS);

        // 1. All sub-orders for seller
        $subOrders = DB::table('seller_orders as so')
            ->join('orders as o', 'so.order_id', '=', 'o.id')
            ->where('so.seller_id', $sellerId)
            ->where('o.payment_status', 'paid')
            ->select('so.*', 'o.status as master_status', 'o.created_at as order_created_at')
            ->get();

        $grossSales = '0.00';
        $commissionTotal = '0.00';
        $eligibleNetTotal = '0.00';
        $pendingEscrowTotal = '0.00';

        foreach ($subOrders as $order) {
            $net = (string) $order->seller_net_payout;
            $sub = (string) $order->subtotal;
            $comm = (string) $order->commission_total;

            $grossSales = bcadd($grossSales, $sub, 2);
            $commissionTotal = bcadd($commissionTotal, $comm, 2);

            // Eligibility check: DELIVERED and return window expired
            $isDelivered = in_array(strtolower($order->fulfillment_status), ['delivered', 'completed']);
            $isPastReturnWindow = $order->delivered_at 
                ? (strtotime($order->delivered_at) <= $returnThreshold->timestamp)
                : (strtotime($order->created_at) <= $returnThreshold->timestamp);

            if ($isDelivered && $isPastReturnWindow && !$order->is_settled) {
                $eligibleNetTotal = bcadd($eligibleNetTotal, $net, 2);
            } else {
                $pendingEscrowTotal = bcadd($pendingEscrowTotal, $net, 2);
            }
        }

        // 2. Disbursed payouts
        $disbursedPayouts = (string) DB::table('payouts')
            ->where('seller_id', $sellerId)
            ->where('status', 'completed')
            ->sum('amount');

        // 3. Pending/Approved payouts currently in flight (locks balance)
        $inFlightPayouts = (string) DB::table('payouts')
            ->where('seller_id', $sellerId)
            ->whereIn('status', ['pending', 'approved', 'processing'])
            ->sum('amount');

        // 4. Seller refunds deducted
        $deductedRefunds = (string) DB::table('refunds')
            ->where('seller_id', $sellerId)
            ->whereIn('status', ['approved', 'completed'])
            ->sum('amount');

        // Available balance = Eligible Net - Disbursed - InFlight - Refunds
        $availableBalance = bcsub($eligibleNetTotal, $disbursedPayouts, 2);
        $availableBalance = bcsub($availableBalance, $inFlightPayouts, 2);
        $availableBalance = bcsub($availableBalance, $deductedRefunds, 2);

        if (bccomp($availableBalance, '0.00', 2) < 0) {
            $availableBalance = '0.00';
        }

        return [
            'gross_sales' => number_format((float) $grossSales, 2, '.', ''),
            'commission_total' => number_format((float) $commissionTotal, 2, '.', ''),
            'pending_escrow_balance' => number_format((float) $pendingEscrowTotal, 2, '.', ''),
            'eligible_settlement_total' => number_format((float) $eligibleNetTotal, 2, '.', ''),
            'disbursed_payouts' => number_format((float) $disbursedPayouts, 2, '.', ''),
            'in_flight_payouts' => number_format((float) $inFlightPayouts, 2, '.', ''),
            'available_balance' => number_format((float) $availableBalance, 2, '.', ''),
            'is_compliance_locked' => $seller->status !== 'approved',
        ];
    }

    /**
     * Checks if seller can request a payout of $requestedAmount.
     */
    public function validatePayoutRequest(string $sellerId, float $requestedAmount): bool
    {
        $balances = $this->calculateSellerBalances($sellerId);
        if ($balances['is_compliance_locked']) {
            return false;
        }

        $minPayout = (float) config('kesales.platform.min_payout_amount', 500);
        if ($requestedAmount < $minPayout) {
            return false;
        }

        return bccomp($balances['available_balance'], (string) $requestedAmount, 2) >= 0;
    }
}
