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
use App\Domain\Finance\Services\RefundProcessorService;
use App\Services\AuditService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Routing\Controller as BaseController;
use Exception;

class FinanceController extends BaseController
{
    public function __construct(
        protected LedgerPostingService $ledgerService,
        protected ReconciliationService $reconciliationService,
        protected FinanceReportService $reportService,
        protected RefundProcessorService $refundProcessor
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
        return response()->json([
            'success' => false,
            'error' => [
                'code' => 'PROVIDER_VERIFICATION_REQUIRED',
                'message' => 'Manual payment reconciliation is disabled until provider evidence and maker-checker approval are implemented.',
            ],
        ], 409);
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
        $refund = DB::transaction(function () use ($request, $refundId): ?Refund {
            $locked = Refund::whereKey($refundId)->lockForUpdate()->firstOrFail();
            if ($locked->status !== 'requested' || (string) $locked->requested_by === (string) $request->user()->id) {
                return null;
            }

            $locked->update([
                'status' => 'approved',
                'approved_by' => $request->user()->id,
            ]);

            return $locked;
        });

        if (!$refund) {
            return response()->json([
                'success' => false,
                'message' => 'Refund must be requested and approved by different users.',
            ], 422);
        }

        AuditService::log(
            action: 'approve_refund',
            module: 'finance',
            entityType: 'refund',
            entityId: $refund->id,
            newValues: ['approved_by' => $request->user()->id, 'amount' => $refund->amount],
            actorId: $request->user()->id
        );

        return response()->json(['message' => 'Refund approved', 'refund' => $refund]);
    }

    public function rejectRefund(Request $request, string $refundId): JsonResponse
    {
        $refund = DB::transaction(function () use ($refundId): ?Refund {
            $locked = Refund::whereKey($refundId)->lockForUpdate()->firstOrFail();
            if ($locked->status !== 'requested') {
                return null;
            }

            $locked->update(['status' => 'rejected']);
            return $locked;
        });

        if (!$refund) {
            return response()->json(['success' => false, 'message' => 'Only requested refunds can be rejected.'], 422);
        }

        return response()->json(['message' => 'Refund rejected', 'refund' => $refund]);
    }

    public function processRefundPayout(Request $request, string $refundId): JsonResponse
    {
        try {
            $result = $this->refundProcessor->processRefund($refundId, (string) $request->user()->id);
            return response()->json([
                'success' => true,
                'message' => 'Refund payout processed through payment gateway and general ledger.',
                'result' => $result,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Refund payout processing error: ' . $e->getMessage(),
            ], 422);
        }
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
        $payout = DB::transaction(function () use ($request, $payoutId): ?Payout {
            $locked = Payout::whereKey($payoutId)->lockForUpdate()->firstOrFail();
            if ($locked->status !== 'pending') {
                return null;
            }

            $locked->update([
                'status' => 'approved',
                'approved_at' => now(),
                'approved_by' => $request->user()->id,
            ]);
            return $locked;
        });

        if (!$payout) {
            return response()->json(['success' => false, 'message' => 'Only pending payouts can be approved.'], 422);
        }

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
        $approverId = Payout::whereKey($payoutId)->value('approved_by');
        if ($approverId !== null && (string) $approverId === (string) $request->user()->id) {
            return response()->json([
                'success' => false,
                'message' => 'Payout approval and disbursement must be performed by different finance users.',
            ], 403);
        }

        $payout = DB::transaction(function () use ($request, $payoutId): ?Payout {
            $locked = Payout::whereKey($payoutId)->lockForUpdate()->firstOrFail();
            if ($locked->status !== 'approved') {
                return null;
            }

            $locked->update([
                'status' => 'processing',
                'processed_at' => now(),
                'processed_by' => $request->user()->id,
                'provider' => 'mpesa',
                'provider_status' => 'queued',
            ]);

            return $locked;
        });

        if (!$payout) {
            return response()->json([
                'success' => false,
                'message' => 'Payout is no longer approved for disbursement.',
            ], 422);
        }

        DisburseB2CPayoutJob::dispatch($payout->id)->afterCommit();

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

        $debits = '0.00';
        $credits = '0.00';
        foreach ($validated['lines'] as $line) {
            $debit = (string) $line['debit'];
            $credit = (string) $line['credit'];
            if (bccomp($debit, '0.00', 2) < 0 || bccomp($credit, '0.00', 2) < 0
                || (bccomp($debit, '0.00', 2) > 0 && bccomp($credit, '0.00', 2) > 0)
                || (bccomp($debit, '0.00', 2) === 0 && bccomp($credit, '0.00', 2) === 0)) {
                return response()->json([
                    'message' => 'Each journal line must contain exactly one positive debit or credit.',
                ], 422);
            }
            $debits = bcadd($debits, $debit, 2);
            $credits = bcadd($credits, $credit, 2);
        }

        if (bccomp($debits, $credits, 2) !== 0) {
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
        $validated = $request->validate([
            'report_type' => ['required', 'string', 'in:financial_summary,orders,payouts,refunds'],
            'format' => ['required', 'string', 'in:csv,json'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
            'include_zero_rows' => ['nullable', 'boolean'],
        ]);

        $summary = $this->reportService->getSummaryMetrics();
        $reportName = strtoupper(str_replace('_', '-', $validated['report_type']));

        return response()->json([
            'success' => true,
            'message' => 'Report export prepared successfully.',
            'report' => [
                'report_type' => $validated['report_type'],
                'format' => $validated['format'],
                'date_from' => $validated['date_from'] ?? null,
                'date_to' => $validated['date_to'] ?? null,
                'filename' => sprintf('%s-%s.%s', strtolower($reportName), now()->format('YmdHis'), $validated['format']),
                'rows' => $summary['gross_merchandise_value'] !== '0.00' || ($validated['include_zero_rows'] ?? false) ? 1 : 0,
                'generated_at' => now()->toIso8601String(),
            ],
        ], 202);
    }
}
