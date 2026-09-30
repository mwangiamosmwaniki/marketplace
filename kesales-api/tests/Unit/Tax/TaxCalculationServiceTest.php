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
            unitPrice: '1160.00',
            quantity: 1,
            taxType: 'standard'
        );

        $this->assertEquals('1000.00', $res['taxable_amount']);
        $this->assertEquals('160.00', $res['tax_amount']);
        $this->assertEquals('1160.00', $res['line_total']);
        $this->assertSame('16.00', $res['tax_rate']);
    }

    public function test_calculate_order_totals_with_delivery_and_discounts(): void
    {
        $lineItems = [
            ['unit_price' => '1160.00', 'quantity' => 2, 'tax_type' => 'standard'], // 2320.00 total
            ['unit_price' => '580.00', 'quantity' => 1, 'tax_type' => 'standard'],  // 580.00 total
        ];

        $totals = $this->taxService->calculateOrderTotals(
            lineItems: $lineItems,
            deliveryFee: '300.00',
            discount: '200.00'
        );

        $this->assertEquals('2900.00', $totals['subtotal']); // 2320 + 580
        $this->assertEquals('2327.59', $totals['taxable_total']);
        $this->assertEquals('372.41', $totals['tax_total']);
        $this->assertEquals('3000.00', $totals['grand_total']); // 2900 - 200 + 300
    }

    public function test_discount_is_allocated_across_mixed_tax_types_before_tax_is_calculated(): void
    {
        $totals = $this->taxService->calculateOrderTotals(
            lineItems: [
                ['unit_price' => '1160.00', 'quantity' => 1, 'tax_type' => 'standard'],
                ['unit_price' => '500.00', 'quantity' => 1, 'tax_type' => 'zero_rated'],
                ['unit_price' => '300.00', 'quantity' => 1, 'tax_type' => 'exempt'],
            ],
            discount: '196.00'
        );

        $this->assertSame('1960.00', $totals['subtotal']);
        $this->assertSame('116.00', $totals['line_items'][0]['allocated_discount']);
        $this->assertSame('50.00', $totals['line_items'][1]['allocated_discount']);
        $this->assertSame('30.00', $totals['line_items'][2]['allocated_discount']);
        $this->assertSame('144.00', $totals['tax_total']);
        $this->assertSame('1350.00', $totals['taxable_total']);
        $this->assertSame('450.00', $totals['zero_rated_total']);
        $this->assertSame('270.00', $totals['exempt_total']);
        $this->assertSame('1764.00', $totals['grand_total']);
    }

    public function test_percentage_discount_uses_decimal_arithmetic_and_caps_the_result(): void
    {
        $this->assertSame(
            '100.00',
            $this->taxService->calculateDiscount('1160.00', 'percentage', '10', '100.00')
        );
    }
}
