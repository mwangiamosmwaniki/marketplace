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

    public function initiateStkPush(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'order_id' => 'required|string|exists:orders,id',
            'phone' => 'required|string',
            'amount' => 'required|numeric|min:1',
        ]);

        $order = Order::findOrFail($validated['order_id']);

        try {
            $result = $this->stkService->initiate(
                orderId: $order->id,
                phone: $validated['phone'],
                amount: (float) $validated['amount'],
                accountReference: $order->order_number,
                customerId: $request->user()->id
            );

            return response()->json($result);
        } catch (Exception $e) {
            return response()->json([
                'message' => 'Payment initiation failed: ' . $e->getMessage(),
            ], 400);
        }
    }

    public function getPayment(Request $request, string $paymentId): JsonResponse
    {
        $payment = Payment::with(['mpesaTransaction', 'order'])
            ->where('id', $paymentId)
            ->firstOrFail();

        return response()->json(['payment' => $payment]);
    }

    public function verifyPayment(Request $request, string $paymentId): JsonResponse
    {
        $payment = Payment::with('mpesaTransaction')->findOrFail($paymentId);

        return response()->json([
            'payment_id' => $payment->id,
            'status' => $payment->status,
            'amount' => $payment->amount,
            'provider_transaction_id' => $payment->provider_transaction_id ?? $payment->mpesaTransaction?->mpesa_receipt_number,
            'paid_at' => $payment->paid_at,
        ]);
    }
}
