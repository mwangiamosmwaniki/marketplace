<?php

namespace App\Domain\Tax\Services;

/**
 * Authoritative Tax Calculation Service
 * 
 * Single source of truth for marketplace tax computations:
 * - Kenya Standard VAT (16% inclusive for standard rated retail goods)
 * - Zero-rated supplies (0%)
 * - Tax-exempt supplies
 * - Decimal-safe monetary arithmetic avoiding floating point rounding drift
 */
class TaxCalculationService
{
    public const STANDARD_VAT_RATE = 16.00; // 16.0%

    /**
     * Compute tax breakdown for a line item.
     * Kenya retail marketplace prices are VAT-inclusive by default.
     * 
     * @param string|float $unitPrice
     * @param int $quantity
     * @param string $taxType 'standard' (16%), 'zero_rated' (0%), 'exempt'
     * @return array [ 'taxable_amount', 'tax_rate', 'tax_amount', 'line_total' ]
     */
    public function calculateLineTax(
        string|float $unitPrice,
        int $quantity,
        string $taxType = 'standard'
    ): array {
        $price = number_format((float) $unitPrice, 2, '.', '');
        $qty = max(1, $quantity);
        $lineTotal = number_format(bcmul($price, (string) $qty, 4), 2, '.', '');

        if ($taxType === 'standard') {
            // Price is 116% of taxable amount
            // taxable = lineTotal / 1.16
            $taxRate = self::STANDARD_VAT_RATE;
            $taxableAmount = number_format(bcdiv($lineTotal, '1.16', 4), 2, '.', '');
            $taxAmount = number_format(bcsub($lineTotal, $taxableAmount, 4), 2, '.', '');
        } elseif ($taxType === 'zero_rated') {
            $taxRate = 0.00;
            $taxableAmount = $lineTotal;
            $taxAmount = '0.00';
        } else { // exempt
            $taxRate = 0.00;
            $taxableAmount = $lineTotal;
            $taxAmount = '0.00';
        }

        return [
            'tax_type' => $taxType,
            'tax_rate' => $taxRate,
            'taxable_amount' => $taxableAmount,
            'tax_amount' => $taxAmount,
            'line_total' => $lineTotal,
        ];
    }

    /**
     * Compute aggregate tax totals for an order across its items.
     * 
     * @param array $lineItems
     * @return array [ 'subtotal', 'taxable_total', 'tax_total', 'grand_total' ]
     */
    public function calculateOrderTotals(array $lineItems, string|float $deliveryFee = '0.00', string|float $discount = '0.00'): array
    {
        $subtotal = '0.00';
        $taxableTotal = '0.00';
        $taxTotal = '0.00';

        foreach ($lineItems as $item) {
            $tax = $this->calculateLineTax(
                unitPrice: $item['unit_price'],
                quantity: $item['quantity'],
                taxType: $item['tax_type'] ?? 'standard'
            );

            $subtotal = bcadd($subtotal, $tax['line_total'], 2);
            $taxableTotal = bcadd($taxableTotal, $tax['taxable_amount'], 2);
            $taxTotal = bcadd($taxTotal, $tax['tax_amount'], 2);
        }

        $delivery = number_format((float) $deliveryFee, 2, '.', '');
        $disc = number_format((float) $discount, 2, '.', '');

        $netAfterDiscount = bcsub($subtotal, $disc, 2);
        if (bccomp($netAfterDiscount, '0.00', 2) < 0) {
            $netAfterDiscount = '0.00';
        }

        $grandTotal = bcadd($netAfterDiscount, $delivery, 2);

        return [
            'subtotal' => number_format((float) $subtotal, 2, '.', ''),
            'discount_total' => number_format((float) $disc, 2, '.', ''),
            'delivery_fee' => number_format((float) $delivery, 2, '.', ''),
            'taxable_total' => number_format((float) $taxableTotal, 2, '.', ''),
            'tax_total' => number_format((float) $taxTotal, 2, '.', ''),
            'grand_total' => number_format((float) $grandTotal, 2, '.', ''),
        ];
    }
}
