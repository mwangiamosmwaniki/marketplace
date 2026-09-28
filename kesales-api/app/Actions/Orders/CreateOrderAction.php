<?php

namespace App\Actions\Orders;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Models\Order;
use App\Models\SellerOrder;
use App\Models\InventoryItem;
use App\Models\InventoryMovement;
use Exception;

/**
 * Atomic Multi-Vendor Order Creation & Stock Reservation
 * 
 * Enforces:
 * 1. Database transaction + row locking on inventory_items (FOR UPDATE)
 * 2. Verification of quantity_available (quantity_on_hand - quantity_reserved)
 * 3. Master Order creation (e.g. KS-ORD-20260928-000001)
 * 4. Multi-vendor order splitting into Seller Sub-Orders (e.g. KS-SUB-20260928-000001-A)
 * 5. Inventory movement audit trail ('reservation')
 */
class CreateOrderAction
{
    public function execute(string $customerId, array $cartItems, array $shippingAddress, float $countyDeliveryFee): Order
    {
        return DB::transaction(function () use ($customerId, $cartItems, $shippingAddress, $countyDeliveryFee) {
            
            // 1. Group items by Seller for multi-vendor splitting
            $itemsBySeller = [];
            $masterSubtotal = 0;
            $masterCommission = 0;

            foreach ($cartItems as $item) {
                // Lock inventory row to prevent concurrent race conditions
                $inventory = DB::table('inventory_items')
                    ->where('variant_id', $item['variant_id'])
                    ->lockForUpdate()
                    ->first();

                if (!$inventory) {
                    throw new Exception("Inventory record not found for variant: {$item['variant_id']}");
                }

                $available = $inventory->quantity_on_hand - $inventory->quantity_reserved;
                if ($available < $item['quantity']) {
                    throw new Exception("Insufficient stock for SKU {$item['sku']}. Available: {$available}, requested: {$item['quantity']}");
                }

                // Reserve quantity
                DB::table('inventory_items')
                    ->where('id', $inventory->id)
                    ->increment('quantity_reserved', $item['quantity']);

                // Calculate item financials
                $lineTotal = $item['unit_price'] * $item['quantity'];
                $commissionRate = $item['commission_rate'] ?? 10.00;
                $commissionAmount = round(($lineTotal * $commissionRate) / 100, 2);
                $sellerNet = $lineTotal - $commissionAmount;

                $itemsBySeller[$item['seller_id']][] = [
                    'product_id' => $item['product_id'],
                    'variant_id' => $item['variant_id'],
                    'product_name' => $item['product_name'],
                    'sku' => $item['sku'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'commission_rate' => $commissionRate,
                    'commission_amount' => $commissionAmount,
                    'seller_net_amount' => $sellerNet,
                    'line_total' => $lineTotal,
                    'inventory_id' => $inventory->id,
                ];

                $masterSubtotal += $lineTotal;
                $masterCommission += $commissionAmount;
            }

            // 2. Generate Master Order Number
            $datePrefix = date('Ymd');
            $uniqueCode = strtoupper(Str::random(6));
            $orderNumber = "KS-ORD-{$datePrefix}-{$uniqueCode}";
            $grandTotal = $masterSubtotal + $countyDeliveryFee;

            // 3. Insert Master Order Record
            $orderId = Str::uuid()->toString();
            DB::table('orders')->insert([
                'id' => $orderId,
                'order_number' => $orderNumber,
                'customer_id' => $customerId,
                'currency' => 'KES',
                'subtotal' => $masterSubtotal,
                'delivery_fee' => $countyDeliveryFee,
                'tax_total' => 0.00,
                'grand_total' => $grandTotal,
                'status' => 'PENDING_PAYMENT',
                'payment_status' => 'pending',
                'placed_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // 4. Snapshot Shipping Address
            DB::table('order_addresses')->insert([
                'id' => Str::uuid()->toString(),
                'order_id' => $orderId,
                'type' => 'shipping',
                'full_name' => $shippingAddress['full_name'],
                'phone' => $shippingAddress['phone'],
                'county' => $shippingAddress['county'],
                'town' => $shippingAddress['town'],
                'street_address' => $shippingAddress['street_address'],
                'delivery_instructions' => $shippingAddress['delivery_instructions'] ?? null,
            ]);

            // 5. Create Seller Sub-Orders (Multi-Vendor Splitting)
            $sellerIndex = 'A';
            foreach ($itemsBySeller as $sellerId => $sellerItems) {
                $subOrderNumber = "KS-SUB-{$datePrefix}-{$uniqueCode}-{$sellerIndex}";
                $subtotalSeller = array_sum(array_column($sellerItems, 'line_total'));
                $commSeller = array_sum(array_column($sellerItems, 'commission_amount'));
                $netSeller = $subtotalSeller - $commSeller;

                $subOrderId = Str::uuid()->toString();
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

                // Insert Sub-Order items & log inventory movement
                foreach ($sellerItems as $sItem) {
                    DB::table('seller_order_items')->insert([
                        'id' => Str::uuid()->toString(),
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

                    // Audit inventory movement
                    DB::table('inventory_movements')->insert([
                        'id' => Str::uuid()->toString(),
                        'inventory_item_id' => $sItem['inventory_id'],
                        'type' => 'reservation',
                        'quantity' => -$sItem['quantity'],
                        'reference_type' => 'order',
                        'reference_id' => $orderId,
                        'before_quantity' => 0,
                        'after_quantity' => 0,
                        'created_by' => $customerId,
                        'created_at' => now(),
                    ]);
                }

                $sellerIndex = chr(ord($sellerIndex) + 1);
            }

            return Order::with(['sellerOrders.items', 'address'])->findOrFail($orderId);
        });
    }
}
