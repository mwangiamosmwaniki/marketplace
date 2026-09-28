<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\Order;
use App\Models\Payment;
use App\Models\ReconciliationRun;
use App\Models\ReconciliationException;
use Illuminate\Support\Str;

class ReconciliationTest extends TestCase
{
    public function test_reconciliation_detects_unposted_ledger_exceptions(): void
    {
        $this->authenticateFinanceAdmin();

        // Create an order marked paid, with payment, but WITHOUT double-entry ledger posting
        $order = Order::create([
            'id' => (string) Str::uuid(),
            'order_number' => 'KS-ORD-REC-001',
            'customer_id' => (string) Str::uuid(),
            'currency' => 'KES',
            'subtotal' => 4500.00,
            'discount_total' => 0.00,
            'delivery_fee' => 250.00,
            'grand_total' => 4750.00,
            'status' => 'PAYMENT_CONFIRMED',
            'payment_status' => 'paid',
        ]);

        Payment::create([
            'id' => (string) Str::uuid(),
            'payment_number' => 'PAY-REC-001',
            'order_id' => $order->id,
            'customer_id' => $order->customer_id,
            'provider' => 'mpesa',
            'method' => 'stk_push',
            'amount' => 4750.00,
            'currency' => 'KES',
            'status' => 'paid',
            'paid_at' => now(),
        ]);

        $response = $this->postJson('/api/v1/finance/reconciliation/run');
        $response->assertStatus(200);

        $run = ReconciliationRun::first();
        $this->assertNotNull($run);
        $this->assertGreaterThanOrEqual(1, $run->total_exceptions);

        $exception = ReconciliationException::where('reconciliation_run_id', $run->id)
            ->where('reference_id', $order->id)
            ->where('type', 'unposted_ledger_entry')
            ->first();

        $this->assertNotNull($exception);
        $this->assertEquals('open', $exception->status);

        // Test auditor resolution
        $resolveRes = $this->postJson("/api/v1/finance/reconciliation/exceptions/{$exception->id}/resolve", [
            'notes' => 'Ledger journal manually posted by auditor via journal adjustment #ADJ-102',
        ]);
        $resolveRes->assertStatus(200);

        $exception->refresh();
        $this->assertEquals('resolved', $exception->status);
    }
}
