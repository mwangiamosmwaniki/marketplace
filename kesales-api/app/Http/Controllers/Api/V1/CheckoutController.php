<?php

namespace App\Http\Controllers\Api\V1;

use App\Actions\Orders\CreateOrderAction;
use App\Models\Order;
use App\Models\ProductVariant;
use App\Models\DeliveryZone;
use App\Models\Coupon;
use App\Models\CustomerAddress;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controller as BaseController;
use Exception;

class CheckoutController extends BaseController
{
    public function __construct(
        protected CreateOrderAction $createOrderAction
    ) {}

    /**
     * Calculate an authoritative quote without trusting any client-submitted prices or delivery rates.
     */
    public function calculateQuote(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.variant_id' => 'required|string|exists:product_variants,id',
            'items.*.quantity' => 'required|integer|min:1',
            'county' => 'required|string',
            'delivery_type' => 'required|in:home_delivery,pickup_station',
            'coupon_code' => 'nullable|string',
        ]);

        $subtotal = 0.00;
        foreach ($validated['items'] as $item) {
            $variant = ProductVariant::find($item['variant_id']);
            if ($variant) {
                $price = (float) ($variant->discount_price ?? $variant->price);
                $subtotal += round($price * (int) $item['quantity'], 2);
            }
        }

        // Server-resolved delivery tariff
        $zone = DeliveryZone::where('county', $validated['county'])->first();
        $deliveryFee = 250.00;
        if ($zone) {
            $deliveryFee = $validated['delivery_type'] === 'pickup_station' 
                ? (float) $zone->pickup_station_fee 
                : (float) $zone->home_delivery_fee;
        }

        // Server-validated coupon discount
        $discount = 0.00;
        if (!empty($validated['coupon_code'])) {
            $coupon = Coupon::where('code', trim($validated['coupon_code']))
                ->where('is_active', true)
                ->where('expires_at', '>', now())
                ->first();

            if ($coupon && $subtotal >= ($coupon->min_order_amount ?? 0)) {
                if ($coupon->type === 'percentage') {
                    $discount = round(($subtotal * $coupon->value) / 100, 2);
                    if ($coupon->max_discount && $discount > $coupon->max_discount) {
                        $discount = (float) $coupon->max_discount;
                    }
                } else {
                    $discount = min($subtotal, (float) $coupon->value);
                }
            }
        }

        $grandTotal = max(0.00, round($subtotal - $discount + $deliveryFee, 2));

        return response()->json([
            'success' => true,
            'subtotal' => $subtotal,
            'discount' => $discount,
            'delivery_fee' => $deliveryFee,
            'grand_total' => $grandTotal,
            'currency' => 'KES',
        ]);
    }

    /**
     * Server-Authoritative Checkout: Only variant_id, quantity, and delivery parameters accepted.
     */
    public function createOrder(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.variant_id' => 'required|string|exists:product_variants,id',
            'items.*.quantity' => 'required|integer|min:1',
            'shipping_address_id' => 'nullable|string|exists:customer_addresses,id',
            'shipping_address' => 'required_without:shipping_address_id|array',
            'shipping_address.full_name' => 'required_without:shipping_address_id|string',
            'shipping_address.phone' => 'required_without:shipping_address_id|string',
            'shipping_address.county' => 'required_without:shipping_address_id|string',
            'shipping_address.town' => 'required_without:shipping_address_id|string',
            'shipping_address.street_address' => 'required_without:shipping_address_id|string',
            'shipping_address.delivery_instructions' => 'nullable|string',
            'delivery_type' => 'nullable|in:home_delivery,pickup_station',
            'coupon_code' => 'nullable|string',
        ]);

        $shippingAddress = [];
        if (!empty($validated['shipping_address_id'])) {
            $savedAddr = CustomerAddress::where('user_id', $request->user()->id)
                ->where('id', $validated['shipping_address_id'])
                ->firstOrFail();

            $shippingAddress = [
                'full_name' => $savedAddr->full_name,
                'phone' => $savedAddr->phone,
                'county' => $savedAddr->county,
                'town' => $savedAddr->town,
                'street_address' => $savedAddr->street_address,
                'delivery_instructions' => null,
            ];
        } else {
            $shippingAddress = $validated['shipping_address'];
        }

        try {
            $order = $this->createOrderAction->execute(
                customerId: $request->user()->id,
                items: $validated['items'],
                shippingAddress: $shippingAddress,
                deliveryType: $validated['delivery_type'] ?? 'home_delivery',
                couponCode: $validated['coupon_code'] ?? null
            );

            return response()->json([
                'success' => true,
                'message' => 'Order created successfully',
                'order' => $order,
            ], 201);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Checkout error: ' . $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Ownership-guarded Order Status endpoint.
     */
    public function orderStatus(Request $request, string $orderNumber): JsonResponse
    {
        $query = Order::with(['items', 'sellerOrders.items', 'address', 'payments'])
            ->where('order_number', $orderNumber);

        // Enforce ownership: customer must match, or user must have admin/finance permissions
        $user = $request->user();
        if ($user) {
            $isStaff = $user->hasRole('super_admin') || $user->hasRole('finance_admin');
            if (!$isStaff) {
                $query->where('customer_id', $user->id);
            }
        }

        $order = $query->first();
        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Order not found or access denied.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'order' => $order,
        ]);
    }
}
