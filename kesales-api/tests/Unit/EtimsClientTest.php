<?php

namespace Tests\Unit;

use Tests\TestCase;
use App\Integrations\ETims\EtimsClient;
use App\Models\Order;
use App\Models\SellerOrder;
use App\Models\SellerOrderItem;
use App\Models\TaxInvoice;
use Illuminate\Support\Str;

class EtimsClientTest extends TestCase
{
    public function test_etims_vat_breakdown_and_sandbox_submission(): void
    {
        $orderId = (string) Str::uuid();
        $subOrderId = (string) Str::uuid();

        Order::create([
            'id' => $orderId,
            'order_number' => 'KS-ORD-TEST-001',
            'customer_id' => (string) Str::uuid(),
            'currency' => 'KES',
            'subtotal' => 11600.00,
            'discount_total' => 0.00,
            'delivery_fee' => 0.00,
            'tax_total' => 1600.00,
            'grand_total' => 11600.00,
            'status' => 'PAYMENT_CONFIRMED',
            'payment_status' => 'paid',
        ]);

        SellerOrder::create([
            'id' => $subOrderId,
            'order_id' => $orderId,
            'sub_order_number' => 'KS-SUB-TEST-001',
            'seller_id' => (string) Str::uuid(),
            'subtotal' => 11600.00,
            'commission_total' => 1160.00,
            'seller_net_payout' => 10440.00,
            'fulfillment_status' => 'unfulfilled',
        ]);

        SellerOrderItem::create([
            'id' => (string) Str::uuid(),
            'seller_order_id' => $subOrderId,
            'product_id' => (string) Str::uuid(),
            'variant_id' => (string) Str::uuid(),
            'product_name' => 'Kenya AA Coffee 1kg',
            'sku' => 'COF-AA-1000',
            'quantity' => 10,
            'unit_price' => 1160.00, // Total 11,600 KES (10,000 net + 1,600 VAT)
            'commission_rate' => 10.00,
            'commission_amount' => 1160.00,
            'seller_net_amount' => 10440.00,
        ]);

        $client = new EtimsClient();
        $res = $client->submitInvoice($orderId);

        $this->assertTrue($res['success']);
        $this->assertEquals(10000.00, $res['taxable_amount']);
        $this->assertEquals(1600.00, $res['total_vat']);
        $this->assertEquals('submitted', $res['status']);
        $this->assertTrue($res['simulated']);

        $invoice = TaxInvoice::where('order_id', $orderId)->first();
        $this->assertNotNull($invoice);
        $this->assertEquals('submitted', $invoice->etims_status);
    }
}
