<?php

namespace App\Http\Controllers\Api\V1;

use App\Integrations\Mpesa\StkPushService;
use App\Models\Payment;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controller as BaseController;
use Exception;

class PaymentController extends BaseController
{
    public function __construct(
        protected StkPushService $stkService
    ) {}

    /**
     * Server-Authoritative STK Initiation:
     * - Amount is NEVER accepted from the frontend; strictly loaded from order->grand_total.
     * - Enforces customer ownership: order->customer_id === auth()->id().
     * - Prevents duplicate payment spam: checks for active pending payments.
     */
    public function initiateStkPush(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'order_id' => 'required|string|exists:orders,id',
            'phone' => 'required|string',
        ]);

        $user = $request->user();
        $order = Order::where('id', $validated['order_id'])
            ->where('customer_id', $user->id)
            ->first();

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Order not found or you are not authorized to pay for this order.',
            ], 403);
        }

        if ($order->payment_status === 'paid') {
            return response()->json([
                'success' => false,
                'message' => 'This order has already been paid and confirmed.',
            ], 422);
        }

        // Check for active pending STK payment within last 2 minutes to prevent duplicate prompt spam
        $recentPending = Payment::where('order_id', $order->id)
            ->where('status', 'initiated')
            ->where('created_at', '>=', now()->subMinutes(2))
            ->first();

        if ($recentPending) {
            return response()->json([
                'success' => true,
                'message' => 'An STK prompt has already been dispatched. Please enter your M-Pesa PIN on your phone or wait 2 minutes to retry.',
                'payment_id' => $recentPending->id,
                'checkout_request_id' => $recentPending->provider_request_id,
            ]);
        }

        try {
            $result = $this->stkService->initiate(
                order: $order,
                phone: $validated['phone']
            );

            return response()->json([
                'success' => true,
                'message' => 'STK push dispatched successfully to ' . $validated['phone'],
                'data' => $result,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Payment initiation failed: ' . $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Ownership-guarded payment details endpoint.
     */
    public function getPayment(Request $request, string $paymentId): JsonResponse
    {
        $user = $request->user();
        $query = Payment::with(['mpesaTransaction', 'order']);

        $isStaff = $user->hasRole('super_admin') || $user->hasRole('finance_admin');
        if (!$isStaff) {
            $query->where('customer_id', $user->id);
        }

        $payment = $query->where('id', $paymentId)->first();
        if (!$payment) {
            return response()->json([
                'success' => false,
                'message' => 'Payment record not found or access denied.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'payment' => $payment,
        ]);
    }

    /**
     * Ownership-guarded payment status verification.
     */
    public function verifyPayment(Request $request, string $paymentId): JsonResponse
    {
        $user = $request->user();
        $query = Payment::with('mpesaTransaction');

        $isStaff = $user->hasRole('super_admin') || $user->hasRole('finance_admin');
        if (!$isStaff) {
            $query->where('customer_id', $user->id);
        }

        $payment = $query->where('id', $paymentId)->first();
        if (!$payment) {
            return response()->json([
                'success' => false,
                'message' => 'Payment not found or access denied.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'payment_id' => $payment->id,
            'status' => $payment->status,
            'amount' => $payment->amount,
            'provider_transaction_id' => $payment->provider_transaction_id ?? $payment->mpesaTransaction?->mpesa_receipt_number,
            'paid_at' => $payment->paid_at,
        ]);
    }
}
