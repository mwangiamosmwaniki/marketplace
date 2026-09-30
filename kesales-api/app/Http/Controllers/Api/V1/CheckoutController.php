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
        $customerId = $request->user()?->id;
        $resolvedItems = [];

        if ($source === 'cart') {
            $user = $request->user();
            $sessionId = $request->header('X-Cart-Session') ?? $request->cookie('cart_session');
            $cart = Cart::where(function ($q) use ($user, $sessionId) {
                if ($user) {
                    $q->where('user_id', $user->id);
                } elseif ($sessionId) {
                    $q->where('session_id', $sessionId);
                }
            })->with('items.variant.product')->first();

            if (!$cart || $cart->items->isEmpty()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cart is empty. Cannot generate checkout quote.',
                ], 422);
            }

            foreach ($cart->items as $cItem) {
                if ($cItem->variant && $cItem->variant->product) {
                    $resolvedItems[] = [
                        'variant_id' => $cItem->variant_id,
                        'quantity' => $cItem->quantity,
                        'unit_price' => $this->resolvedUnitPrice($cItem->variant),
                        'tax_type' => $cItem->variant->product->tax_type ?? 'standard',
                    ];
                }
            }
        } else {
            foreach ($validated['items'] as $item) {
                $variant = ProductVariant::with('product')->find($item['variant_id']);
                if ($variant && $variant->product) {
                    $resolvedItems[] = [
                        'variant_id' => $variant->id,
                        'quantity' => (int) $item['quantity'],
                        'unit_price' => $this->resolvedUnitPrice($variant),
                        'tax_type' => $variant->product->tax_type ?? 'standard',
                    ];
                }
            }
        }

        // Server-resolved delivery tariff
        $zone = DeliveryZone::where('county', $validated['county'])->first();
        $deliveryFee = '250.00';
        if ($zone) {
            $deliveryFee = (string) $zone->getRawOriginal(
                $validated['delivery_type'] === 'pickup_station'
                    ? 'pickup_station_fee'
                    : 'home_delivery_fee'
            );
        }

        $baseTotals = $this->taxService->calculateOrderTotals($resolvedItems, $deliveryFee);
        $subtotal = $baseTotals['subtotal'];

        // Server-validated coupon discount
        $discount = '0.00';
        if (!empty($validated['coupon_code'])) {
            $coupon = Coupon::where('code', trim($validated['coupon_code']))
                ->where('is_active', true)
                ->where('expires_at', '>', now())
                ->first();

            $hasGlobalCapacity = $coupon && (
                $coupon->getRawOriginal('usage_limit') === null
                || (int) $coupon->times_used < (int) $coupon->getRawOriginal('usage_limit')
            );
            $customerUses = $coupon && $customerId
                ? DB::table('coupon_usages')
                    ->where('coupon_id', $coupon->id)
                    ->where('user_id', $customerId)
                    ->count()
                : 0;

            if ($coupon && $hasGlobalCapacity && $customerUses < (int) $coupon->per_customer_limit && bccomp(
                $subtotal,
                (string) $coupon->getRawOriginal('min_order_amount'),
                2
            ) >= 0) {
                $discount = $this->taxService->calculateDiscount(
                    $subtotal,
                    $coupon->type,
                    (string) $coupon->getRawOriginal('value'),
                    $coupon->getRawOriginal('max_discount') === null
                        ? null
                        : (string) $coupon->getRawOriginal('max_discount')
                );
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
            'subtotal' => $totals['subtotal'],
            'discount' => $totals['discount_total'],
            'delivery_fee' => $totals['delivery_fee'],
            'taxable_amount' => $totals['taxable_total'],
            'tax_total' => $totals['tax_total'],
            'grand_total' => $totals['grand_total'],
            'currency' => 'KES',
            'items' => array_map(
                fn (array $item, array $pricedLine) => [
                    ...$item,
                    'discount' => $pricedLine['allocated_discount'],
                    'taxable_amount' => $pricedLine['taxable_amount'],
                    'tax' => $pricedLine['tax_amount'],
                    'net_line_total' => $pricedLine['net_line_total'],
                    'line_total' => $pricedLine['gross_line_total'],
                ],
                $resolvedItems,
                $totals['line_items']
            ),
        ]);
    }

    private function resolvedUnitPrice(ProductVariant $variant): string
    {
        $discountPrice = $variant->getRawOriginal('discount_price');
        return (string) ($discountPrice !== null
            ? $discountPrice
            : $variant->getRawOriginal('price'));
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
