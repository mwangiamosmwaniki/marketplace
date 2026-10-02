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
    public const STANDARD_VAT_RATE = '16.00';

    /**
     * Compute tax breakdown for a line item.
     * Kenya retail marketplace prices are VAT-inclusive by default.
     * 
    * @param string $unitPrice
     * @param int $quantity
     * @param string $taxType 'standard' (16%), 'zero_rated' (0%), 'exempt'
     * @return array [ 'taxable_amount', 'tax_rate', 'tax_amount', 'line_total' ]
     */
    public function calculateLineTax(
        string $unitPrice,
        int $quantity,
        string $taxType = 'standard'
    ): array {
        $price = $this->money($unitPrice);
        $qty = max(1, $quantity);
        $lineTotal = bcmul($price, (string) $qty, 2);

        return $this->calculateTaxOnAmount($lineTotal, $taxType);
    }

    /**
     * Compute aggregate tax totals for an order across its items.
     * 
     * @param array $lineItems
     * @return array [ 'subtotal', 'taxable_total', 'tax_total', 'grand_total' ]
     */
    public function calculateOrderTotals(array $lineItems, string $deliveryFee = '0.00', string $discount = '0.00'): array
    {
        $subtotal = '0.00';
        $grossLines = [];

        foreach ($lineItems as $item) {
            $grossLineTotal = bcmul(
                $this->money($item['unit_price']),
                (string) max(1, (int) $item['quantity']),
                2
            );
            $grossLines[] = [
                'gross_line_total' => $grossLineTotal,
                'tax_type' => $item['tax_type'] ?? 'standard',
            ];
            $subtotal = bcadd($subtotal, $grossLineTotal, 2);
        }

        $delivery = $this->money($deliveryFee);
        $disc = $this->money($discount);
        if (bccomp($disc, $subtotal, 2) > 0) {
            $disc = $subtotal;
        }

        $lineTotals = $this->calculateDiscountedLineTotals($grossLines, $subtotal, $disc);

        $netSubtotal = bcsub($subtotal, $disc, 2);
        $grandTotal = bcadd($netSubtotal, $delivery, 2);

        return [
            'subtotal' => $subtotal,
            'discount_total' => $disc,
            'delivery_fee' => $delivery,
            'taxable_total' => $lineTotals['taxable_total'],
            'zero_rated_total' => $lineTotals['zero_rated_total'],
            'exempt_total' => $lineTotals['exempt_total'],
            'tax_total' => $lineTotals['tax_total'],
            'grand_total' => $grandTotal,
            'line_items' => $lineTotals['line_items'],
        ];
    }

    private function calculateDiscountedLineTotals(array $grossLines, string $subtotal, string $discount): array
    {
        $totals = [
            'taxable_total' => '0.00',
            'zero_rated_total' => '0.00',
            'exempt_total' => '0.00',
            'tax_total' => '0.00',
            'line_items' => [],
        ];
        $remainingDiscount = $discount;

        foreach ($grossLines as $index => $line) {
            $gross = $line['gross_line_total'];
            $allocatedDiscount = $this->allocateLineDiscount(
                $gross,
                $index,
                array_key_last($grossLines),
                $subtotal,
                $discount,
                $remainingDiscount
            );
            $remainingDiscount = bcsub($remainingDiscount, $allocatedDiscount, 2);
            $netLineTotal = bcsub($gross, $allocatedDiscount, 2);
            $tax = $this->calculateTaxOnAmount($netLineTotal, $line['tax_type']);
            $this->addTaxToTotals($totals, $line['tax_type'], $tax);

            $totals['line_items'][] = [
                ...$tax,
                'gross_line_total' => $gross,
                'allocated_discount' => $allocatedDiscount,
                'net_line_total' => $netLineTotal,
            ];
        }

        return $totals;
    }

    private function allocateLineDiscount(
        string $gross,
        int $index,
        ?int $lastIndex,
        string $subtotal,
        string $discount,
        string $remainingDiscount
    ): string {
        if ($index === $lastIndex) {
            $allocatedDiscount = $remainingDiscount;
        } elseif (bccomp($subtotal, '0.00', 2) > 0) {
            $proportional = $this->roundMoney(bcdiv(bcmul($discount, $gross, 8), $subtotal, 8));
            $allocatedDiscount = bccomp($proportional, $remainingDiscount, 2) > 0
                ? $remainingDiscount
                : $proportional;
        } else {
            $allocatedDiscount = '0.00';
        }

        return bccomp($allocatedDiscount, $gross, 2) > 0 ? $gross : $allocatedDiscount;
    }

    private function addTaxToTotals(array &$totals, string $taxType, array $tax): void
    {
        if ($taxType !== 'exempt') {
            $totals['taxable_total'] = bcadd($totals['taxable_total'], $tax['taxable_amount'], 2);
        }
        if ($taxType === 'zero_rated') {
            $totals['zero_rated_total'] = bcadd($totals['zero_rated_total'], $tax['taxable_amount'], 2);
        }
        if ($taxType === 'exempt') {
            $totals['exempt_total'] = bcadd($totals['exempt_total'], $tax['taxable_amount'], 2);
        }
        $totals['tax_total'] = bcadd($totals['tax_total'], $tax['tax_amount'], 2);
    }

    public function calculateDiscount(
        string $subtotal,
        string $type,
        string $value,
        ?string $maximum = null
    ): string {
        $subtotal = $this->money($subtotal);
        $value = $this->money($value);
        $discount = $type === 'percentage'
            ? $this->roundMoney(bcdiv(bcmul($subtotal, $value, 8), '100', 8))
            : $value;

        if ($maximum !== null && bccomp($discount, $this->money($maximum), 2) > 0) {
            $discount = $this->money($maximum);
        }

        return bccomp($discount, $subtotal, 2) > 0 ? $subtotal : $discount;
    }

    public function calculatePercentageAmount(string $amount, string $rate): string
    {
        return $this->roundMoney(bcdiv(
            bcmul($this->money($amount), $this->money($rate), 8),
            '100',
            8
        ));
    }

    private function calculateTaxOnAmount(string $lineTotal, string $taxType): array
    {
        if (!in_array($taxType, ['standard', 'zero_rated', 'exempt'], true)) {
            throw new \InvalidArgumentException("Unsupported tax type: {$taxType}");
        }

        if ($taxType === 'standard') {
            $taxableAmount = $this->roundMoney(bcdiv($lineTotal, '1.16', 8));
            $taxAmount = bcsub($lineTotal, $taxableAmount, 2);
            $taxRate = self::STANDARD_VAT_RATE;
        } else {
            $taxableAmount = $lineTotal;
            $taxAmount = '0.00';
            $taxRate = '0.00';
        }

        return [
            'tax_type' => $taxType,
            'tax_rate' => $taxRate,
            'taxable_amount' => $taxableAmount,
            'tax_amount' => $taxAmount,
            'line_total' => $lineTotal,
        ];
    }

    private function money(string $amount): string
    {
        if (!is_numeric($amount)) {
            throw new \InvalidArgumentException('Monetary values must be numeric decimal strings.');
        }

        if (bccomp($amount, '0', 8) < 0) {
            throw new \InvalidArgumentException('Monetary values cannot be negative.');
        }

        return $this->roundMoney($amount);
    }

    private function roundMoney(string $amount): string
    {
        $minorUnits = bcadd(bcmul($amount, '100', 8), '0.5', 0);
        return bcdiv($minorUnits, '100', 2);
    }
}
