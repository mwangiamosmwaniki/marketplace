<?php

namespace App\Http\Controllers\Api\V1;

use App\Actions\Orders\CreateOrderAction;
use App\Models\Order;
use App\Models\Cart;
use App\Models\ProductVariant;
use App\Models\DeliveryZone;
use App\Models\Coupon;
use App\Models\CustomerAddress;
use App\Domain\Tax\Services\TaxCalculationService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controller as BaseController;
use Illuminate\Support\Facades\DB;
use Throwable;

class CheckoutController extends BaseController
{
    public function __construct(
        protected CreateOrderAction $createOrderAction,
        protected TaxCalculationService $taxService
    ) {}

    /**
     * Calculate an authoritative quote without trusting any client-submitted prices or delivery rates.
     * Supports both source: 'cart' and source: 'buy_now'.
     */
    public function calculateQuote(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'source' => 'nullable|in:cart,buy_now',
            'items' => 'required_if:source,buy_now|array',
            'items.*.variant_id' => 'required_with:items|string|exists:product_variants,id',
            'items.*.quantity' => 'required_with:items|integer|min:1',
            'county' => 'required|string',
            'delivery_type' => 'required|in:home_delivery,pickup_station',
            'coupon_code' => 'nullable|string',
        ]);

        $source = $validated['source'] ?? (!empty($validated['items']) ? 'buy_now' : 'cart');
        $resolvedItems = [];

        if ($source === 'cart') {
            $user = $request->user();
            $sessionId = $request->header('X-Cart-Session') ?? $request->cookie('cart_session');
            $cart = Cart::where(function ($q) use ($user, $sessionId) {
                if ($user) $q->where('user_id', $user->id);
                elseif ($sessionId) $q->where('session_id', $sessionId);
            })->with('items.variant')->first();

            if (!$cart || $cart->items->isEmpty()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cart is empty. Cannot generate checkout quote.',
                ], 422);
            }

            foreach ($cart->items as $cItem) {
                if ($cItem->variant) {
                    $resolvedItems[] = [
                        'variant_id' => $cItem->variant_id,
                        'quantity' => $cItem->quantity,
                        'unit_price' => (float) ($cItem->variant->discount_price ?? $cItem->variant->price),
                    ];
                }
            }
        } else {
            foreach ($validated['items'] as $item) {
                $variant = ProductVariant::find($item['variant_id']);
                if ($variant) {
                    $resolvedItems[] = [
                        'variant_id' => $variant->id,
                        'quantity' => (int) $item['quantity'],
                        'unit_price' => (float) ($variant->discount_price ?? $variant->price),
                    ];
                }
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

        // Subtotal and raw tax calculation
        $subtotal = 0.00;
        foreach ($resolvedItems as $rItem) {
            $subtotal += round($rItem['unit_price'] * $rItem['quantity'], 2);
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

        $totals = $this->taxService->calculateOrderTotals(
            lineItems: $resolvedItems,
            deliveryFee: $deliveryFee,
            discount: $discount
        );

        return response()->json([
            'success' => true,
            'source' => $source,
            'subtotal' => (float) $totals['subtotal'],
            'discount' => (float) $totals['discount_total'],
            'delivery_fee' => (float) $totals['delivery_fee'],
            'taxable_amount' => (float) $totals['taxable_total'],
            'tax_total' => (float) $totals['tax_total'],
            'grand_total' => (float) $totals['grand_total'],
            'currency' => 'KES',
            'items' => $resolvedItems,
        ]);
    }

    /**
     * Server-Authoritative Checkout:
     * - Idempotency-Key header support
     * - source: 'cart' | 'buy_now'
     * - Zero client pricing trust
     */
    public function createOrder(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'source' => 'nullable|in:cart,buy_now',
            'items' => 'required_if:source,buy_now|array',
            'items.*.variant_id' => 'required_with:items|string|exists:product_variants,id',
            'items.*.quantity' => 'required_with:items|integer|min:1',
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

        $source = $validated['source'] ?? (!empty($validated['items']) ? 'buy_now' : 'cart');
        $checkoutItems = [];

        if ($source === 'cart') {
            $cart = Cart::where('user_id', $user->id)->with('items.variant')->first();
            if (!$cart || $cart->items->isEmpty()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cart is empty. Cannot checkout from cart.',
                ], 422);
            }

            foreach ($cart->items as $cItem) {
                $checkoutItems[] = [
                    'variant_id' => $cItem->variant_id,
                    'quantity' => $cItem->quantity,
                ];
            }
        } else {
            $checkoutItems = $validated['items'];
        }

        $shippingAddress = [];
        if (!empty($validated['shipping_address_id'])) {
            $savedAddr = CustomerAddress::where('user_id', $user->id)
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

        $idempotencyRecordId = $request->attributes->get('idempotency_key_record_id');

        try {
            $responsePayload = DB::transaction(function () use (
                $user,
                $checkoutItems,
                $shippingAddress,
                $validated,
                $source,
                $idempotencyRecordId
            ) {
                $order = $this->createOrderAction->execute(
                    customerId: $user->id,
                    items: $checkoutItems,
                    shippingAddress: $shippingAddress,
                    deliveryType: $validated['delivery_type'] ?? 'home_delivery',
                    couponCode: $validated['coupon_code'] ?? null
                );

                if ($source === 'cart') {
                    Cart::where('user_id', $user->id)->first()?->items()->delete();
                }

                $responsePayload = [
                    'success' => true,
                    'message' => 'Order created successfully',
                    'order' => $order,
                ];

                if ($idempotencyRecordId !== null) {
                    DB::table('idempotency_keys')
                        ->where('id', $idempotencyRecordId)
                        ->whereNull('response_body')
                        ->update([
                            'response_code' => 201,
                            'response_body' => json_encode($responsePayload, JSON_THROW_ON_ERROR),
                        ]);
                }

                return $responsePayload;
            });

            return response()->json($responsePayload, 201);
        } catch (Throwable) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'CHECKOUT_FAILED',
                    'message' => 'Checkout could not be completed. Review the request and try again.',
                ],
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
