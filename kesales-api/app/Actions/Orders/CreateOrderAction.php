<?php

namespace App\Actions\Orders;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\SellerOrder;
use App\Models\SellerOrderItem;
use App\Models\ProductVariant;
use App\Models\Coupon;
use App\Models\DeliveryZone;
use App\Domain\Inventory\Services\InventoryService;
use App\Domain\Tax\Services\TaxCalculationService;
use Exception;

/**
 * Server-Authoritative Multi-Vendor Order Creation & Stock Reservation
 * 
 * Enforces:
 * 1. Zero frontend trust: unit prices, discounts, commissions, delivery tariffs loaded from DB
 * 2. Real-time verification of active merchant & product status
 * 3. Atomic stock reservation with accurate before/after inventory movement logs
 * 4. Master order snapshot (orders + order_items) AND tenant-partitioned sub-orders (seller_orders + seller_order_items)
 * 5. Authoritative Tax calculation (16% VAT standard) and per-customer coupon usage tracking
 */
class CreateOrderAction
{
    public function __construct(
        protected InventoryService $inventoryService,
        protected TaxCalculationService $taxService
    ) {}

    /**
     * @param string $customerId
     * @param array $items [ ['variant_id' => string, 'quantity' => int] ]
     * @param array $shippingAddress
     * @param string $deliveryType 'home_delivery' | 'pickup_station'
     * @param string|null $couponCode
     * @return Order
     * @throws Exception
     */
    public function execute(
        string $customerId,
        array $items,
        array $shippingAddress,
        string $deliveryType = 'home_delivery',
        ?string $couponCode = null
    ): Order {
        return DB::transaction(function () use ($customerId, $items, $shippingAddress, $deliveryType, $couponCode) {
            $orderId = (string) Str::uuid();
            $datePrefix = date('Ymd');
            $uniqueCode = strtoupper(Str::random(6));
            $orderNumber = "KS-ORD-{$datePrefix}-{$uniqueCode}";

            $itemsBySeller = [];
            $masterOrderItemsData = [];
            $masterSubtotal = '0.00';

            // 1. Process items with database authority
            foreach ($items as $reqItem) {
                $variantId = $reqItem['variant_id'];
                $quantity = max(1, (int) $reqItem['quantity']);

                $variant = ProductVariant::with(['product.seller'])->find($variantId);
                if (!$variant) {
                    throw new Exception("Product variant not found: {$variantId}");
                }

                $product = $variant->product;
                if (!$product || $product->status !== 'active') {
                    throw new Exception("Product '{$product?->name}' is not currently available for purchase.");
                }

                $seller = $product->seller;
                if (!$seller || $seller->status !== 'approved') {
                    throw new Exception("Merchant store '{$seller?->store_name}' is not currently accepting orders.");
                }

                // Server-derived price (respecting active discount price if set)
                $discountPrice = $variant->getRawOriginal('discount_price');
                $unitPrice = (string) ($discountPrice !== null
                    ? $discountPrice
                    : $variant->getRawOriginal('price'));
                $lineTotal = bcmul($unitPrice, (string) $quantity, 2);
                $taxType = $product->tax_type ?? 'standard';

                // Reserve inventory atomically with accurate audit counts
                $this->inventoryService->reserveStock($variant->id, $quantity, $orderId, $customerId);

                // Commission rate from seller profile or platform default.
                $commissionRate = (string) ($seller->getRawOriginal('commission_rate') ?? '10.00');

                $itemSnapshot = [
                    'product_id' => $product->id,
                    'variant_id' => $variant->id,
                    'seller_id' => $seller->id,
                    'product_name' => $product->name . ' - ' . $variant->name,
                    'sku' => $variant->sku,
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                    'discount' => '0.00',
                    'tax_type' => $taxType,
                    'taxable_amount' => '0.00',
                    'tax' => '0.00',
                    'net_line_total' => $lineTotal,
                    'line_total' => $lineTotal,
                    'commission_rate' => $commissionRate,
                    'commission_amount' => '0.00',
                    'seller_net_amount' => '0.00',
                ];

                $masterOrderItemsData[] = $itemSnapshot;
                $masterSubtotal = bcadd($masterSubtotal, $lineTotal, 2);
            }

            // 2. Server-calculated Delivery Fee based on shipping county & delivery type
            $county = $shippingAddress['county'] ?? 'Nairobi';
            $zone = DeliveryZone::where('county', $county)->first();
            $deliveryFee = '250.00';
            if ($zone) {
                $deliveryFee = (string) $zone->getRawOriginal(
                    $deliveryType === 'pickup_station'
                        ? 'pickup_station_fee'
                        : 'home_delivery_fee'
                );
            }

            // 3. Server-validated Coupon & Discount Calculation with per-customer limit
            $discountTotal = '0.00';
            $appliedCoupon = null;

            if (!empty($couponCode)) {
                $coupon = Coupon::where('code', trim($couponCode))
                    ->where('is_active', true)
                    ->where('expires_at', '>', now())
                    ->lockForUpdate()
                    ->first();

                if ($coupon && bccomp(
                    $masterSubtotal,
                    (string) $coupon->getRawOriginal('min_order_amount'),
                    2
                ) >= 0) {
                    // Check per-customer usage limit
                    $existingUses = DB::table('coupon_usages')
                        ->where('coupon_id', $coupon->id)
                        ->where('user_id', $customerId)
                        ->count();

                    $usageLimit = $coupon->getRawOriginal('usage_limit');
                    $hasGlobalCapacity = $usageLimit === null
                        || (int) $coupon->times_used < (int) $usageLimit;
                    $perCustomerLimit = (int) $coupon->per_customer_limit;

                    if ($hasGlobalCapacity && $existingUses < $perCustomerLimit) {
                        $discountTotal = $this->taxService->calculateDiscount(
                            $masterSubtotal,
                            $coupon->type,
                            (string) $coupon->getRawOriginal('value'),
                            $coupon->getRawOriginal('max_discount') === null
                                ? null
                                : (string) $coupon->getRawOriginal('max_discount')
                        );

                        $coupon->increment('times_used');
                        $appliedCoupon = $coupon;
                    }
                }
            }

            $pricing = $this->taxService->calculateOrderTotals(
                lineItems: array_map(
                    fn (array $item) => [
                        'unit_price' => $item['unit_price'],
                        'quantity' => $item['quantity'],
                        'tax_type' => $item['tax_type'],
                    ],
                    $masterOrderItemsData
                ),
                deliveryFee: $deliveryFee,
                discount: $discountTotal
            );
            $masterSubtotal = $pricing['subtotal'];
            $discountTotal = $pricing['discount_total'];
            $deliveryFee = $pricing['delivery_fee'];
            $masterTaxTotal = $pricing['tax_total'];
            $grandTotal = $pricing['grand_total'];

            foreach ($masterOrderItemsData as $index => &$itemSnapshot) {
                $pricedLine = $pricing['line_items'][$index];
                $itemSnapshot['discount'] = $pricedLine['allocated_discount'];
                $itemSnapshot['taxable_amount'] = $pricedLine['taxable_amount'];
                $itemSnapshot['tax'] = $pricedLine['tax_amount'];
                $itemSnapshot['net_line_total'] = $pricedLine['net_line_total'];

                // Existing generic coupons are platform-funded, so commission remains on gross item value.
                $itemSnapshot['commission_amount'] = $this->taxService->calculatePercentageAmount(
                    $itemSnapshot['line_total'],
                    $itemSnapshot['commission_rate']
                );
                $itemSnapshot['seller_net_amount'] = bcsub(
                    $itemSnapshot['line_total'],
                    $itemSnapshot['commission_amount'],
                    2
                );
                $itemsBySeller[$itemSnapshot['seller_id']][] = $itemSnapshot;
            }
            unset($itemSnapshot);

            // 4. Persist Master Order
            DB::table('orders')->insert([
                'id' => $orderId,
                'order_number' => $orderNumber,
                'customer_id' => $customerId,
                'currency' => 'KES',
                'subtotal' => $masterSubtotal,
                'discount_total' => $discountTotal,
                'delivery_fee' => $deliveryFee,
                'tax_total' => $masterTaxTotal,
                'grand_total' => $grandTotal,
                'status' => 'PENDING_PAYMENT',
                'payment_status' => 'pending',
                'placed_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // 5. Persist Coupon Usage if coupon was applied
            if ($appliedCoupon) {
                DB::table('coupon_usages')->insert([
                    'id' => (string) Str::uuid(),
                    'coupon_id' => $appliedCoupon->id,
                    'user_id' => $customerId,
                    'order_id' => $orderId,
                    'used_at' => now(),
                ]);
            }

            // 6. Persist Shipping Address
            DB::table('order_addresses')->insert([
                'id' => (string) Str::uuid(),
                'order_id' => $orderId,
                'type' => 'shipping',
                'full_name' => $shippingAddress['full_name'],
                'phone' => $shippingAddress['phone'],
                'county' => $shippingAddress['county'],
                'town' => $shippingAddress['town'],
                'street_address' => $shippingAddress['street_address'],
                'delivery_instructions' => $shippingAddress['delivery_instructions'] ?? null,
            ]);

            // 7. Persist Master Order Items
            foreach ($masterOrderItemsData as $mItem) {
                DB::table('order_items')->insert([
                    'id' => (string) Str::uuid(),
                    'order_id' => $orderId,
                    'product_id' => $mItem['product_id'],
                    'variant_id' => $mItem['variant_id'],
                    'seller_id' => $mItem['seller_id'],
                    'product_name' => $mItem['product_name'],
                    'sku' => $mItem['sku'],
                    'quantity' => $mItem['quantity'],
                    'unit_price' => $mItem['unit_price'],
                    'discount' => $mItem['discount'],
                    'tax_type' => $mItem['tax_type'],
                    'taxable_amount' => $mItem['taxable_amount'],
                    'tax' => $mItem['tax'],
                    'net_line_total' => $mItem['net_line_total'],
                    'line_total' => $mItem['line_total'],
                    'created_at' => now(),
                ]);
            }

            // 8. Persist Multi-Vendor Seller Sub-Orders & Seller Items
            $sellerIndex = 'A';
            foreach ($itemsBySeller as $sellerId => $sellerItems) {
                $subOrderNumber = "KS-SUB-{$datePrefix}-{$uniqueCode}-{$sellerIndex}";
                $subtotalSeller = '0.00';
                $commSeller = '0.00';
                $netSeller = '0.00';
                foreach ($sellerItems as $sellerItem) {
                    $subtotalSeller = bcadd($subtotalSeller, $sellerItem['line_total'], 2);
                    $commSeller = bcadd($commSeller, $sellerItem['commission_amount'], 2);
                    $netSeller = bcadd($netSeller, $sellerItem['seller_net_amount'], 2);
                }

                $subOrderId = (string) Str::uuid();
                DB::table('seller_orders')->insert([
                    'id' => $subOrderId,
                    'order_id' => $orderId,
                    'sub_order_number' => $subOrderNumber,
                    'seller_id' => $sellerId,
                    'subtotal' => $subtotalSeller,
                    'delivery_share' => 0.00,
                    'commission_total' => $commSeller,
                    'seller_net_payout' => $netSeller,
                    'fulfillment_status' => 'unfulfilled',
                    'is_settled' => false,
                    'created_at' => now(),
                ]);

                foreach ($sellerItems as $sItem) {
                    DB::table('seller_order_items')->insert([
                        'id' => (string) Str::uuid(),
                        'seller_order_id' => $subOrderId,
                        'product_id' => $sItem['product_id'],
                        'variant_id' => $sItem['variant_id'],
                        'product_name' => $sItem['product_name'],
                        'sku' => $sItem['sku'],
                        'quantity' => $sItem['quantity'],
                        'unit_price' => $sItem['unit_price'],
                        'discount' => $sItem['discount'],
                        'net_line_total' => $sItem['net_line_total'],
                        'commission_rate' => $sItem['commission_rate'],
                        'commission_amount' => $sItem['commission_amount'],
                        'seller_net_amount' => $sItem['seller_net_amount'],
                    ]);
                }

                $sellerIndex = chr(ord($sellerIndex) + 1);
            }

            return Order::with(['items', 'sellerOrders.items', 'address'])->findOrFail($orderId);
        });
    }
}
