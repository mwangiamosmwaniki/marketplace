<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Order;
use App\Models\CustomerAddress;
use App\Models\Wishlist;
use App\Models\Review;
use App\Models\ReturnRequest;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;
use Illuminate\Routing\Controller as BaseController;

class CustomerController extends BaseController
{
    public function orders(Request $request): JsonResponse
    {
        $orders = Order::with(['sellerOrders.items', 'address', 'payments'])
            ->where('customer_id', $request->user()->id)
            ->orderBy('created_at', 'desc')
            ->paginate(15);

        return response()->json($orders);
    }

    public function showOrder(Request $request, string $orderNumber): JsonResponse
    {
        $order = Order::with(['sellerOrders.items', 'address', 'payments', 'taxInvoices'])
            ->where('customer_id', $request->user()->id)
            ->where('order_number', $orderNumber)
            ->firstOrFail();

        return response()->json(['order' => $order]);
    }

    public function cancelOrder(Request $request, string $orderNumber): JsonResponse
    {
        $order = Order::where('customer_id', $request->user()->id)
            ->where('order_number', $orderNumber)
            ->firstOrFail();

        if (!in_array($order->status, ['PENDING_PAYMENT', 'PAYMENT_CONFIRMED'])) {
            return response()->json([
                'message' => 'Order cannot be cancelled in its current state: ' . $order->status,
            ], 422);
        }

        $order->update(['status' => 'CANCELLED']);

        return response()->json([
            'message' => 'Order cancelled successfully',
            'order' => $order,
        ]);
    }

    public function requestReturn(Request $request, string $orderNumber): JsonResponse
    {
        $validated = $request->validate([
            'reason' => 'required|string|max:255',
        ]);

        $order = Order::where('customer_id', $request->user()->id)
            ->where('order_number', $orderNumber)
            ->firstOrFail();

        $return = ReturnRequest::create([
            'id' => (string) Str::uuid(),
            'return_number' => 'RMA-' . date('Ymd') . '-' . strtoupper(Str::random(6)),
            'order_id' => $order->id,
            'customer_id' => $request->user()->id,
            'reason' => $validated['reason'],
            'status' => 'requested',
            'created_at' => now(),
        ]);

        return response()->json([
            'message' => 'Return request submitted successfully',
            'return' => $return,
        ], 201);
    }

    public function addresses(Request $request): JsonResponse
    {
        $addresses = CustomerAddress::where('user_id', $request->user()->id)->get();
        return response()->json(['addresses' => $addresses]);
    }

    public function createAddress(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'full_name' => 'required|string',
            'phone' => 'required|string',
            'county' => 'required|string',
            'town' => 'required|string',
            'street_address' => 'required|string',
            'is_default' => 'nullable|boolean',
        ]);

        $address = CustomerAddress::create([
            'id' => (string) Str::uuid(),
            'user_id' => $request->user()->id,
            'full_name' => $validated['full_name'],
            'phone' => $validated['phone'],
            'county' => $validated['county'],
            'town' => $validated['town'],
            'street_address' => $validated['street_address'],
            'is_default' => $validated['is_default'] ?? false,
        ]);

        return response()->json(['address' => $address], 201);
    }

    public function updateAddress(Request $request, string $addressId): JsonResponse
    {
        $address = CustomerAddress::where('user_id', $request->user()->id)
            ->where('id', $addressId)
            ->firstOrFail();

        $address->update($request->only(['full_name', 'phone', 'county', 'town', 'street_address', 'is_default']));

        return response()->json(['address' => $address]);
    }

    public function deleteAddress(Request $request, string $addressId): JsonResponse
    {
        $address = CustomerAddress::where('user_id', $request->user()->id)
            ->where('id', $addressId)
            ->firstOrFail();

        $address->delete();

        return response()->json(['message' => 'Address removed']);
    }

    public function wishlist(Request $request): JsonResponse
    {
        $items = Wishlist::with('product.images', 'product.variants')
            ->where('user_id', $request->user()->id)
            ->get();

        return response()->json(['wishlist' => $items]);
    }

    public function toggleWishlist(Request $request, string $productId): JsonResponse
    {
        $existing = Wishlist::where('user_id', $request->user()->id)
            ->where('product_id', $productId)
            ->first();

        if ($existing) {
            $existing->delete();
            return response()->json(['message' => 'Item removed from wishlist', 'favorited' => false]);
        }

        Wishlist::create([
            'id' => (string) Str::uuid(),
            'user_id' => $request->user()->id,
            'product_id' => $productId,
        ]);

        return response()->json(['message' => 'Item saved to wishlist', 'favorited' => true]);
    }

    public function submitReview(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_id' => 'required|string|exists:products,id',
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'required|string',
        ]);

        $hasPurchased = Order::where('customer_id', $request->user()->id)
            ->where('status', 'DELIVERED')
            ->whereHas('sellerOrders.items', function ($q) use ($validated) {
                $q->where('product_id', $validated['product_id']);
            })
            ->exists();

        $review = Review::create([
            'id' => (string) Str::uuid(),
            'product_id' => $validated['product_id'],
            'user_id' => $request->user()->id,
            'rating' => $validated['rating'],
            'comment' => $validated['comment'],
            'is_verified_purchase' => $hasPurchased,
        ]);

        return response()->json([
            'message' => 'Review submitted successfully',
            'review' => $review,
        ], 201);
    }
}
