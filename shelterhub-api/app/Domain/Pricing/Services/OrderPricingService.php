<?php

namespace App\Domain\Pricing\Services;

use App\Domain\Tax\Services\TaxCalculationService;

class OrderPricingService
{
    public function __construct(
        protected TaxCalculationService $taxService = new TaxCalculationService()
    ) {}

    /**
     * Single pricing entry point for quote and order creation.
     *
     * @param array<int, array{unit_price: string|int|float, quantity: int, tax_type?: string}> $lineItems
     */
    public function calculate(array $lineItems, string $deliveryFee = '0.00', string $discount = '0.00'): array
    {
        return $this->taxService->calculateOrderTotals(
            lineItems: $lineItems,
            deliveryFee: $deliveryFee,
            discount: $discount
        );
    }

    public function calculateDiscount(
        string $subtotal,
        string $type,
        string $value,
        ?string $maximum = null
    ): string {
        return $this->taxService->calculateDiscount(
            subtotal: $subtotal,
            type: $type,
            value: $value,
            maximum: $maximum
        );
    }

    public function calculatePercentageAmount(string $amount, string $rate): string
    {
        return $this->taxService->calculatePercentageAmount($amount, $rate);
    }

    public function resolveCouponFunding(?string $funding): string
    {
        $normalized = strtolower(trim((string) ($funding ?? 'platform')));

        return in_array($normalized, ['platform', 'seller'], true)
            ? $normalized
            : 'platform';
    }

    public function calculateCouponFundingBreakdown(string $grossMerchandiseValue, string $discountTotal, ?string $funding = null): array
    {
        $funding = $this->resolveCouponFunding($funding);
        $platformDiscount = $funding === 'platform' ? $discountTotal : '0.00';
        $sellerDiscount = $funding === 'seller' ? $discountTotal : '0.00';

        return [
            'coupon_funding' => $funding,
            'gross_merchandise_value' => $grossMerchandiseValue,
            'platform_discount' => $platformDiscount,
            'seller_discount' => $sellerDiscount,
            'net_merchandise_value' => bcsub($grossMerchandiseValue, $discountTotal, 2),
        ];
    }
}
