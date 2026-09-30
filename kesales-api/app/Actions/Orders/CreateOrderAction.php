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
            $masterTaxTotal = '0.00';

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
                $unitPrice = number_format((float) ($variant->discount_price ?? $variant->price), 2, '.', '');

                // Authoritative line tax breakdown must stay decimal-safe and be applied against the line subtotal.
                $lineTax = $this->taxService->calculateLineTax(
                    unitPrice: $unitPrice,
                    quantity: $quantity,
                    taxType: 'standard'
                );

                $lineTotal = $lineTax['line_total'];
                $taxAmount = $lineTax['tax_amount'];

                // Reserve inventory atomically with accurate audit counts
                $this->inventoryService->reserveStock($variant->id, $quantity, $orderId, $customerId);

                // Commission rate from seller profile or platform default.
                $commissionRate = number_format((float) ($seller->commission_rate ?? 10.00), 2, '.', '');
                $commissionAmount = bcdiv(bcmul($lineTotal, $commissionRate, 4), '100', 2);
                $sellerNet = bcsub($lineTotal, $commissionAmount, 2);

                $itemSnapshot = [
                    'product_id' => $product->id,
                    'variant_id' => $variant->id,
                    'seller_id' => $seller->id,
                    'product_name' => $product->name . ' - ' . $variant->name,
                    'sku' => $variant->sku,
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                    'tax' => $taxAmount,
                    'line_total' => $lineTotal,
                    'commission_rate' => $commissionRate,
                    'commission_amount' => $commissionAmount,
                    'seller_net_amount' => $sellerNet,
                ];

                $masterOrderItemsData[] = $itemSnapshot;
                $itemsBySeller[$seller->id][] = $itemSnapshot;

                $masterSubtotal = bcadd($masterSubtotal, $lineTotal, 2);
                $masterTaxTotal = bcadd($masterTaxTotal, $taxAmount, 2);
            }

            // 2. Server-calculated Delivery Fee based on shipping county & delivery type
            $county = $shippingAddress['county'] ?? 'Nairobi';
            $zone = DeliveryZone::where('county', $county)->first();
            $deliveryFee = '250.00';
            if ($zone) {
                $deliveryFee = $deliveryType === 'pickup_station'
                    ? number_format((float) $zone->pickup_station_fee, 2, '.', '')
                    : number_format((float) $zone->home_delivery_fee, 2, '.', '');
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

                if ($coupon && (float) $masterSubtotal >= (float) ($coupon->min_order_amount ?? 0)) {
                    // Check per-customer usage limit
                    $existingUses = DB::table('coupon_usages')
                        ->where('coupon_id', $coupon->id)
                        ->where('user_id', $customerId)
                        ->count();

                    if ($existingUses < ($coupon->per_customer_limit ?? 1)) {
                        if ($coupon->type === 'percentage') {
                            $discount = number_format(((float) $masterSubtotal * (float) $coupon->value) / 100, 2, '.', '');
                            if ($coupon->max_discount && (float) $discount > (float) $coupon->max_discount) {
                                $discount = number_format((float) $coupon->max_discount, 2, '.', '');
                            }
                            $discountTotal = $discount;
                        } else {
                            $discountTotal = number_format(min((float) $masterSubtotal, (float) $coupon->value), 2, '.', '');
                        }

                        $coupon->increment('times_used');
                        $appliedCoupon = $coupon;
                    }
                }
            }

            $discountedSubtotal = bcsub($masterSubtotal, $discountTotal, 2);
            $grandTotal = bcadd($discountedSubtotal, $deliveryFee, 2);
            if (bccomp($grandTotal, '0.00', 2) < 0) {
                $grandTotal = '0.00';
            }

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
                    'discount' => 0.00,
                    'tax' => $mItem['tax'],
                    'line_total' => $mItem['line_total'],
                    'created_at' => now(),
                ]);
            }

            // 8. Persist Multi-Vendor Seller Sub-Orders & Seller Items
            $sellerIndex = 'A';
            foreach ($itemsBySeller as $sellerId => $sellerItems) {
                $subOrderNumber = "KS-SUB-{$datePrefix}-{$uniqueCode}-{$sellerIndex}";
                $subtotalSeller = array_sum(array_column($sellerItems, 'line_total'));
                $commSeller = array_sum(array_column($sellerItems, 'commission_amount'));
                $netSeller = round($subtotalSeller - $commSeller, 2);

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
