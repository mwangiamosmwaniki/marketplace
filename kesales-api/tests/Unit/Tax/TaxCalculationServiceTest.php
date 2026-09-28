<?php

namespace Tests\Unit\Tax;

use Tests\TestCase;
use App\Domain\Tax\Services\TaxCalculationService;

class TaxCalculationServiceTest extends TestCase
{
    protected TaxCalculationService $taxService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->taxService = new TaxCalculationService();
    }

    public function test_calculate_line_tax_standard_vat_16_percent(): void
    {
        // 1160 KES line item -> 1000 KES taxable + 160 KES VAT
        $res = $this->taxService->calculateLineTax(
            unitPrice: 1160.00,
            quantity: 1,
            taxType: 'standard'
        );

        $this->assertEquals('1000.00', $res['taxable_amount']);
        $this->assertEquals('160.00', $res['tax_amount']);
        $this->assertEquals('1160.00', $res['line_total']);
        $this->assertEquals(16.00, $res['tax_rate']);
    }

    public function test_calculate_order_totals_with_delivery_and_discounts(): void
    {
        $lineItems = [
            ['unit_price' => 1160.00, 'quantity' => 2, 'tax_type' => 'standard'], // 2320.00 total
            ['unit_price' => 580.00, 'quantity' => 1, 'tax_type' => 'standard'],  // 580.00 total
        ];

        $totals = $this->taxService->calculateOrderTotals(
            lineItems: $lineItems,
            deliveryFee: 300.00,
            discount: 200.00
        );

        $this->assertEquals('2900.00', $totals['subtotal']); // 2320 + 580
        $this->assertEquals('2500.00', $totals['taxable_total']); // 2900 / 1.16 = 2500
        $this->assertEquals('400.00', $totals['tax_total']);
        $this->assertEquals('3000.00', $totals['grand_total']); // 2900 - 200 + 300
    }
}
