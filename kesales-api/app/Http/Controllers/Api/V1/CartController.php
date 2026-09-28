<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\ProductVariant;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;
use Illuminate\Routing\Controller as BaseController;

class CartController extends BaseController
{
    protected function resolveCart(Request $request): Cart
    {
        $userId = $request->user()?->id;
        $sessionId = $request->header('X-Cart-Session') ?? $request->cookie('cart_session');

        if ($userId) {
            $cart = Cart::firstOrCreate(['user_id' => $userId]);
            // Merge session cart if exists
            if ($sessionId) {
                $sessionCart = Cart::where('session_id', $sessionId)->whereNull('user_id')->first();
                if ($sessionCart) {
                    foreach ($sessionCart->items as $sItem) {
                        $existing = CartItem::where('cart_id', $cart->id)
                            ->where('variant_id', $sItem->variant_id)
                            ->first();
                        if ($existing) {
                            $existing->increment('quantity', $sItem->quantity);
                        } else {
                            $sItem->update(['cart_id' => $cart->id]);
                        }
                    }
                    $sessionCart->delete();
                }
            }
            return $cart;
        }

        if (!$sessionId) {
            $sessionId = (string) Str::uuid();
        }

        return Cart::firstOrCreate(['session_id' => $sessionId]);
    }

    public function getCart(Request $request): JsonResponse
    {
        $cart = $this->resolveCart($request);
        $cart->load(['items.product.images', 'items.variant']);

        $subtotal = 0.00;
        foreach ($cart->items as $item) {
            $price = (float) ($item->variant->discount_price ?? $item->variant->price ?? $item->unit_price);
            $subtotal += round($price * $item->quantity, 2);
        }

        return response()->json([
            'success' => true,
            'cart_id' => $cart->id,
            'items' => $cart->items,
            'item_count' => $cart->items->sum('quantity'),
            'subtotal' => $subtotal,
        ]);
    }

    public function addItem(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_id' => 'required|string|exists:products,id',
            'variant_id' => 'required|string|exists:product_variants,id',
            'quantity' => 'required|integer|min:1',
        ]);

        $variant = ProductVariant::findOrFail($validated['variant_id']);
        $cart = $this->resolveCart($request);

        // Server-resolved price
        $price = (float) ($variant->discount_price ?? $variant->price);

        $item = CartItem::where('cart_id', $cart->id)
            ->where('variant_id', $variant->id)
            ->first();

        if ($item) {
            $item->increment('quantity', $validated['quantity']);
            $item->unit_price = $price;
            $item->save();
        } else {
            $item = CartItem::create([
                'id' => (string) Str::uuid(),
                'cart_id' => $cart->id,
                'product_id' => $validated['product_id'],
                'variant_id' => $variant->id,
                'quantity' => $validated['quantity'],
                'unit_price' => $price,
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Item added to cart',
            'item' => $item->load(['product.images', 'variant']),
        ], 201);
    }

    /**
     * Scope item update strictly through current user/session cart.
     */
    public function updateItem(Request $request, string $itemId): JsonResponse
    {
        $validated = $request->validate([
            'quantity' => 'required|integer|min:1',
        ]);

        $cart = $this->resolveCart($request);
        $item = CartItem::where('cart_id', $cart->id)
            ->where('id', $itemId)
            ->first();

        if (!$item) {
            return response()->json([
                'success' => false,
                'message' => 'Cart item not found or does not belong to your cart session.',
            ], 404);
        }

        $item->update(['quantity' => $validated['quantity']]);

        return response()->json([
            'success' => true,
            'message' => 'Cart updated',
            'item' => $item,
        ]);
    }

    /**
     * Scope item removal strictly through current user/session cart.
     */
    public function removeItem(Request $request, string $itemId): JsonResponse
    {
        $cart = $this->resolveCart($request);
        $item = CartItem::where('cart_id', $cart->id)
            ->where('id', $itemId)
            ->first();

        if (!$item) {
            return response()->json([
                'success' => false,
                'message' => 'Cart item not found or does not belong to your cart session.',
            ], 404);
        }

        $item->delete();

        return response()->json([
            'success' => true,
            'message' => 'Item removed from cart',
        ]);
    }

    public function clearCart(Request $request): JsonResponse
    {
        $cart = $this->resolveCart($request);
        $cart->items()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Cart cleared',
        ]);
    }
}
