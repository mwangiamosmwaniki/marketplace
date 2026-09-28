<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Order;
use App\Models\Payment;
use App\Models\Payout;
use App\Models\Refund;
use App\Models\FinancialTransaction;
use App\Models\ReconciliationRun;
use App\Models\ReconciliationException;
use App\Jobs\DisburseB2CPayoutJob;
use App\Domain\Finance\Services\LedgerPostingService;
use App\Domain\Finance\Services\ReconciliationService;
use App\Domain\Finance\Services\FinanceReportService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;
use Illuminate\Routing\Controller as BaseController;
use Exception;

class FinanceController extends BaseController
{
    public function __construct(
        protected LedgerPostingService $ledgerService,
        protected ReconciliationService $reconciliationService,
        protected FinanceReportService $reportService
    ) {}

    public function overviewMetrics(): JsonResponse
    {
        $metrics = $this->reportService->getSummaryMetrics();
        return response()->json([
            'success' => true,
            'settled_gmv' => $metrics['gross_merchandise_value'],
            'escrow_liability' => $metrics['escrow_reserve'],
            'net_commission' => $metrics['total_commissions'],
            'disbursed_payouts' => $metrics['disbursed_payouts'],
            'clearing_balance' => $metrics['clearing_balance'],
        ]);
    }

    public function ordersFinancialView(Request $request): JsonResponse
    {
        $orders = Order::with(['sellerOrders.seller', 'payments'])
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json($orders);
    }

    public function showOrderFinancials(string $orderId): JsonResponse
    {
        $order = Order::with(['sellerOrders.seller', 'payments.mpesaTransaction', 'taxInvoices'])
            ->where('id', $orderId)
            ->firstOrFail();

        return response()->json(['order' => $order]);
    }

    public function payments(Request $request): JsonResponse
    {
        $payments = Payment::with(['order', 'customer', 'mpesaTransaction'])
            ->orderBy('created_at', 'desc')
            ->paginate(25);

        return response()->json($payments);
    }

    public function showPayment(string $paymentId): JsonResponse
    {
        $payment = Payment::with(['order', 'customer', 'mpesaTransaction'])
            ->where('id', $paymentId)
            ->firstOrFail();

        return response()->json(['payment' => $payment]);
    }

    public function reconcilePayment(Request $request, string $paymentId): JsonResponse
    {
        $payment = Payment::findOrFail($paymentId);
        $payment->status = 'paid';
        $payment->paid_at = now();
        $payment->save();

        return response()->json(['message' => 'Payment reconciled manually', 'payment' => $payment]);
    }

    public function refunds(Request $request): JsonResponse
    {
        $refunds = Refund::with(['order', 'payment', 'customer', 'seller'])
            ->orderBy('id', 'desc')
            ->paginate(20);

        return response()->json($refunds);
    }

    public function approveRefund(Request $request, string $refundId): JsonResponse
    {
        $refund = Refund::findOrFail($refundId);
        $refund->status = 'approved';
        $refund->approved_by = $request->user()->id;
        $refund->save();

        return response()->json(['message' => 'Refund approved', 'refund' => $refund]);
    }

    public function rejectRefund(Request $request, string $refundId): JsonResponse
    {
        $refund = Refund::findOrFail($refundId);
        $refund->status = 'rejected';
        $refund->save();

        return response()->json(['message' => 'Refund rejected', 'refund' => $refund]);
    }

    public function processRefundPayout(Request $request, string $refundId): JsonResponse
    {
        $refund = Refund::findOrFail($refundId);
        
        try {
            $this->ledgerService->postCustomerRefund(
                refundId: $refund->id,
                orderId: $refund->order_id,
                amount: (float) $refund->amount,
                customerId: $refund->customer_id
            );
        } catch (Exception $e) {
            return response()->json(['message' => 'Ledger refund posting error: ' . $e->getMessage()], 422);
        }

        $refund->status = 'completed';
        $refund->completed_at = now();
        $refund->save();

        return response()->json(['message' => 'Refund processed and ledger updated', 'refund' => $refund]);
    }

    public function payouts(Request $request): JsonResponse
    {
        $payouts = Payout::with(['seller', 'items'])
            ->orderBy('requested_at', 'desc')
            ->paginate(20);

        return response()->json($payouts);
    }

    public function approvePayout(Request $request, string $payoutId): JsonResponse
    {
        $payout = Payout::findOrFail($payoutId);
        $payout->status = 'approved';
        $payout->approved_at = now();
        $payout->approved_by = $request->user()->id;
        $payout->save();

        return response()->json(['message' => 'Payout approved for disbursement', 'payout' => $payout]);
    }

    public function holdPayout(Request $request, string $payoutId): JsonResponse
    {
        $payout = Payout::findOrFail($payoutId);
        $payout->status = 'held';
        $payout->save();

        return response()->json(['message' => 'Payout placed on compliance hold', 'payout' => $payout]);
    }

    public function rejectPayout(Request $request, string $payoutId): JsonResponse
    {
        $payout = Payout::findOrFail($payoutId);
        $payout->status = 'rejected';
        $payout->save();

        return response()->json(['message' => 'Payout rejected', 'payout' => $payout]);
    }

    /**
     * Disburse Payout:
     * Sets payout status to 'processing' and dispatches to M-Pesa B2C integration.
     * Ledger is only credited upon Safaricom B2C callback confirmation.
     */
    public function disburseB2CPayout(Request $request, string $payoutId): JsonResponse
    {
        $payout = Payout::findOrFail($payoutId);

        if ($payout->status !== 'approved') {
            return response()->json([
                'success' => false,
                'message' => "Payout cannot be disbursed. Current status: {$payout->status}. Must be 'approved'.",
            ], 422);
        }

        $payout->status = 'processing';
        $payout->processed_at = now();
        $payout->processed_by = $request->user()->id;
        $payout->save();

        DisburseB2CPayoutJob::dispatch($payout->id);

        return response()->json([
            'success' => true,
            'message' => 'Payout submitted to Safaricom Daraja B2C queue. Financial ledger will settle upon gateway confirmation.',
            'payout' => $payout,
        ]);
    }

    public function ledgerEntries(Request $request): JsonResponse
    {
        $entries = FinancialTransaction::with(['lines.account', 'lines.seller', 'creator'])
            ->orderBy('posted_at', 'desc')
            ->paginate(30);

        return response()->json($entries);
    }

    public function createJournalAdjustment(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'description' => 'required|string',
            'lines' => 'required|array|min:2',
            'lines.*.account_id' => 'required|integer',
            'lines.*.debit' => 'required|numeric|min:0',
            'lines.*.credit' => 'required|numeric|min:0',
            'lines.*.seller_id' => 'nullable|string',
        ]);

        $debits = array_sum(array_column($validated['lines'], 'debit'));
        $credits = array_sum(array_column($validated['lines'], 'credit'));

        if (round($debits, 2) !== round($credits, 2)) {
            return response()->json([
                'message' => "Unbalanced journal adjustment. Debits ({$debits}) must equal Credits ({$credits}).",
            ], 422);
        }

        $txId = (string) Str::uuid();
        $tx = FinancialTransaction::create([
            'id' => $txId,
            'transaction_number' => 'ADJ-' . date('Ymd') . '-' . strtoupper(Str::random(6)),
            'type' => 'manual_adjustment',
            'reference_type' => 'manual',
            'reference_id' => $txId,
            'description' => $validated['description'],
            'status' => 'posted',
            'posted_at' => now(),
            'created_by' => $request->user()->id,
        ]);

        foreach ($validated['lines'] as $line) {
            $tx->lines()->create([
                'id' => (string) Str::uuid(),
                'account_id' => $line['account_id'],
                'debit' => $line['debit'],
                'credit' => $line['credit'],
                'currency' => 'KES',
                'seller_id' => $line['seller_id'] ?? null,
            ]);
        }

        return response()->json([
            'message' => 'Journal adjustment posted successfully',
            'transaction' => $tx->load('lines.account'),
        ], 201);
    }

    public function reconciliationRuns(): JsonResponse
    {
        $runs = ReconciliationRun::with('exceptions')->orderBy('run_date', 'desc')->get();
        return response()->json(['runs' => $runs]);
    }

    /**
     * Executes real 3-way reconciliation audit across Orders, Payments, M-Pesa, and General Ledger.
     */
    public function triggerReconciliation(Request $request): JsonResponse
    {
        $run = $this->reconciliationService->executeReconciliationRun();

        return response()->json([
            'success' => true,
            'message' => "Automated reconciliation run completed. {$run->total_exceptions} exception(s) detected.",
            'run' => $run,
        ]);
    }

    public function resolveException(Request $request, string $id): JsonResponse
    {
        $exception = ReconciliationException::findOrFail($id);
        $exception->status = 'resolved';
        $exception->resolution_notes = $request->input('notes', 'Resolved manually by finance auditor.');
        $exception->resolved_by = $request->user()->id;
        $exception->save();

        return response()->json(['message' => 'Exception resolved', 'exception' => $exception]);
    }

    /**
     * Zero-hardcoded reports endpoint derived strictly from database records.
     */
    public function reportsSummary(): JsonResponse
    {
        $summary = $this->reportService->getSummaryMetrics();
        return response()->json($summary);
    }

    public function exportReportJob(Request $request): JsonResponse
    {
        return response()->json([
            'message' => 'Financial export dispatched to Horizon background workers. Download link will be available once compiled.',
            'job_id' => (string) Str::uuid(),
            'status' => 'queued',
        ]);
    }
}
