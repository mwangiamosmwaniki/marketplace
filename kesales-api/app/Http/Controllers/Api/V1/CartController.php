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
        $sessionId = $request->header('X-Cart-Session') ?? $request->cookie('cart_session') ?? (string) Str::uuid();

        if ($userId) {
            return Cart::firstOrCreate(['user_id' => $userId]);
        }

        return Cart::firstOrCreate(['session_id' => $sessionId]);
    }

    public function getCart(Request $request): JsonResponse
    {
        $cart = $this->resolveCart($request);
        $cart->load(['items.product.images', 'items.variant']);

        $subtotal = $cart->items->sum(function ($item) {
            return $item->unit_price * $item->quantity;
        });

        return response()->json([
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

        $price = $variant->discount_price ?? $variant->price;

        $item = CartItem::where('cart_id', $cart->id)
            ->where('variant_id', $variant->id)
            ->first();

        if ($item) {
            $item->quantity += $validated['quantity'];
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
            'message' => 'Item added to cart',
            'item' => $item,
        ], 201);
    }

    public function updateItem(Request $request, string $itemId): JsonResponse
    {
        $validated = $request->validate([
            'quantity' => 'required|integer|min:1',
        ]);

        $item = CartItem::findOrFail($itemId);
        $item->update(['quantity' => $validated['quantity']]);

        return response()->json([
            'message' => 'Cart updated',
            'item' => $item,
        ]);
    }

    public function removeItem(string $itemId): JsonResponse
    {
        $item = CartItem::findOrFail($itemId);
        $item->delete();

        return response()->json([
            'message' => 'Item removed from cart',
        ]);
    }

    public function clearCart(Request $request): JsonResponse
    {
        $cart = $this->resolveCart($request);
        $cart->items()->delete();

        return response()->json([
            'message' => 'Cart cleared',
        ]);
    }
}
