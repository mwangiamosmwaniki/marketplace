<?php

namespace App\Http\Controllers\Api\V1;

use App\Actions\Orders\CreateOrderAction;
use App\Models\Order;
use App\Models\DeliveryZone;
use App\Models\Coupon;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controller as BaseController;
use Exception;

class CheckoutController extends BaseController
{
    public function __construct(
        protected CreateOrderAction $createOrderAction
    ) {}

    public function calculateQuote(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.unit_price' => 'required|numeric',
            'items.*.quantity' => 'required|integer|min:1',
            'county' => 'required|string',
            'delivery_type' => 'required|in:home_delivery,pickup_station',
            'coupon_code' => 'nullable|string',
        ]);

        $subtotal = 0;
        foreach ($validated['items'] as $item) {
            $subtotal += ($item['unit_price'] * $item['quantity']);
        }

        $zone = DeliveryZone::where('county', $validated['county'])->first();
        $deliveryFee = 250.00;
        if ($zone) {
            $deliveryFee = $validated['delivery_type'] === 'pickup_station' 
                ? (float) $zone->pickup_station_fee 
                : (float) $zone->home_delivery_fee;
        }

        $discount = 0.00;
        if (!empty($validated['coupon_code'])) {
            $coupon = Coupon::where('code', $validated['coupon_code'])
                ->where('is_active', true)
                ->where('expires_at', '>', now())
                ->first();

            if ($coupon && $subtotal >= ($coupon->min_order_amount ?? 0)) {
                if ($coupon->type === 'percentage') {
                    $discount = round(($subtotal * $coupon->value) / 100, 2);
                    if ($coupon->max_discount && $discount > $coupon->max_discount) {
                        $discount = $coupon->max_discount;
                    }
                } else {
                    $discount = min($subtotal, $coupon->value);
                }
            }
        }

        $grandTotal = max(0, $subtotal - $discount + $deliveryFee);

        return response()->json([
            'subtotal' => $subtotal,
            'discount' => $discount,
            'delivery_fee' => $deliveryFee,
            'grand_total' => $grandTotal,
            'currency' => 'KES',
        ]);
    }

    public function createOrder(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'cart_items' => 'required|array|min:1',
            'cart_items.*.product_id' => 'required|string',
            'cart_items.*.variant_id' => 'required|string',
            'cart_items.*.product_name' => 'required|string',
            'cart_items.*.sku' => 'required|string',
            'cart_items.*.seller_id' => 'required|string',
            'cart_items.*.quantity' => 'required|integer|min:1',
            'cart_items.*.unit_price' => 'required|numeric',
            'cart_items.*.commission_rate' => 'nullable|numeric',
            'shipping_address' => 'required|array',
            'shipping_address.full_name' => 'required|string',
            'shipping_address.phone' => 'required|string',
            'shipping_address.county' => 'required|string',
            'shipping_address.town' => 'required|string',
            'shipping_address.street_address' => 'required|string',
            'shipping_address.delivery_instructions' => 'nullable|string',
            'delivery_fee' => 'required|numeric',
        ]);

        try {
            $order = $this->createOrderAction->execute(
                customerId: $request->user()->id,
                cartItems: $validated['cart_items'],
                shippingAddress: $validated['shipping_address'],
                countyDeliveryFee: (float) $validated['delivery_fee']
            );

            return response()->json([
                'message' => 'Order created successfully',
                'order' => $order->load(['sellerOrders.items', 'address']),
            ], 201);
        } catch (Exception $e) {
            return response()->json([
                'message' => 'Checkout error: ' . $e->getMessage(),
            ], 422);
        }
    }

    public function orderStatus(string $orderNumber): JsonResponse
    {
        $order = Order::with(['sellerOrders.items', 'address', 'payments'])
            ->where('order_number', $orderNumber)
            ->firstOrFail();

        return response()->json(['order' => $order]);
    }
}
