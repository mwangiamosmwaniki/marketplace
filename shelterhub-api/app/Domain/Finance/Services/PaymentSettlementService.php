<?php

namespace App\Domain\Finance\Services;

use App\Domain\Inventory\Services\InventoryService;
use App\Models\Order;
use App\Models\Payment;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class PaymentSettlementService
{
    public function __construct(
        protected InventoryService $inventoryService,
        protected LedgerPostingService $ledgerService
    ) {}

    public function settleSuccessfulPayment(
        string $paymentId,
        string $providerTransactionId,
        string $providerAmount
    ): array {
        $this->assertValidProviderInput($providerTransactionId, $providerAmount);

        return DB::transaction(function () use ($paymentId, $providerTransactionId, $providerAmount) {
            $payment = Payment::whereKey($paymentId)->lockForUpdate()->firstOrFail();
            $order = Order::whereKey($payment->order_id)->lockForUpdate()->firstOrFail();

            $this->assertMatchingAmounts($payment, $order, $providerAmount);

            if ($this->isAlreadySettled($payment, $order, $providerTransactionId)) {
                return ['status' => 'duplicate', 'payment_id' => $payment->id];
            }

            $this->assertPayableState($payment, $order);
            $this->applySuccessfulSettlement($payment, $order, $providerTransactionId);
            $this->commitOrderInventory($order);
            $this->postSettlementLedger($order);

            return ['status' => 'settled', 'payment_id' => $payment->id];
        });
    }

    public function settleProviderCallback(string $mpesaTransactionId, string $providerTransactionId, string $providerAmount): array
    {
        $mpesaTx = DB::table('mpesa_transactions')
            ->where('id', $mpesaTransactionId)
            ->lockForUpdate()
            ->first();

        if (!$mpesaTx) {
            throw new InvalidArgumentException('The M-Pesa provider transaction could not be located.');
        }

        $result = $this->settleSuccessfulPayment((string) $mpesaTx->payment_id, $providerTransactionId, $providerAmount);

        DB::table('mpesa_transactions')
            ->where('id', $mpesaTransactionId)
            ->update([
                'mpesa_receipt_number' => $providerTransactionId,
                'processed_at' => now(),
            ]);

        return $result;
    }

    protected function assertValidProviderInput(string $providerTransactionId, string $providerAmount): void
    {
        if ($providerTransactionId === '' || !is_numeric($providerAmount)) {
            throw new InvalidArgumentException('A provider transaction ID and decimal amount are required.');
        }
    }

    protected function assertMatchingAmounts(Payment $payment, Order $order, string $providerAmount): void
    {
        $orderAmount = (string) $order->getRawOriginal('grand_total');
        $paymentAmount = (string) $payment->getRawOriginal('amount');

        if (bccomp($paymentAmount, $orderAmount, 2) !== 0 || bccomp($providerAmount, $orderAmount, 2) !== 0) {
            throw new InvalidArgumentException('Provider, payment, and order amounts must match exactly.');
        }
    }

    protected function isAlreadySettled(Payment $payment, Order $order, string $providerTransactionId): bool
    {
        if ($payment->status === 'paid' && $order->payment_status === 'paid') {
            if ($payment->provider_transaction_id === $providerTransactionId) {
                return true;
            }

            throw new InvalidArgumentException('The order has already been settled by another transaction.');
        }

        return false;
    }

    protected function assertPayableState(Payment $payment, Order $order): void
    {
        if (!in_array($payment->status, ['pending', 'initiated', 'authorized'], true)
            || $order->payment_status !== 'pending') {
            throw new InvalidArgumentException('The payment or order is not in a payable state.');
        }
    }

    protected function applySuccessfulSettlement(Payment $payment, Order $order, string $providerTransactionId): void
    {
        $payment->forceFill([
            'status' => 'paid',
            'provider_transaction_id' => $providerTransactionId,
            'paid_at' => now(),
        ])->save();

        $order->forceFill([
            'status' => 'PAYMENT_CONFIRMED',
            'payment_status' => 'paid',
            'updated_at' => now(),
        ])->save();
    }

    protected function commitOrderInventory(Order $order): void
    {
        $orderItems = DB::table('order_items')->where('order_id', $order->id)->get();

        foreach ($orderItems as $item) {
            $this->inventoryService->commitStockSale(
                $item->variant_id,
                (int) $item->quantity,
                $order->id
            );
        }
    }

    protected function postSettlementLedger(Order $order): void
    {
        $sellerSplits = [];
        $commissionTotal = '0.00';

        foreach ($order->sellerOrders()->lockForUpdate()->get() as $sellerOrder) {
            $sellerSplits[] = [
                'seller_id' => $sellerOrder->seller_id,
                'net_amount' => (string) $sellerOrder->getRawOriginal('seller_net_payout'),
            ];

            $commissionTotal = bcadd(
                $commissionTotal,
                (string) $sellerOrder->getRawOriginal('commission_total'),
                2
            );
        }

        $this->ledgerService->postOrderPayment(
            orderId: $order->id,
            grandTotal: (string) $order->getRawOriginal('grand_total'),
            grossSubtotal: (string) $order->getRawOriginal('subtotal'),
            sellerSplits: $sellerSplits,
            commissionTotal: $commissionTotal,
            deliveryFee: (string) $order->getRawOriginal('delivery_fee'),
            discountTotal: (string) $order->getRawOriginal('discount_total')
        );
    }
}
