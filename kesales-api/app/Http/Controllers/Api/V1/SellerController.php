<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\InventoryItem;
use App\Models\InventoryMovement;
use App\Models\SellerOrder;
use App\Models\Payout;
use App\Models\SellerDocument;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;
use Illuminate\Routing\Controller as BaseController;

class SellerController extends BaseController
{
    protected function getSeller(Request $request)
    {
        $seller = $request->user()->seller;
        if (!$seller) {
            abort(403, 'User is not registered as an active merchant seller.');
        }
        return $seller;
    }

    public function dashboardMetrics(Request $request): JsonResponse
    {
        $seller = $this->getSeller($request);

        $subOrders = SellerOrder::where('seller_id', $seller->id)->get();
        $grossSales = $subOrders->sum('subtotal');
        $commissionDeductions = $subOrders->sum('commission_total');
        $netEarnings = $subOrders->sum('seller_net_payout');
        $orderCount = $subOrders->count();

        $inventoryCount = InventoryItem::where('seller_id', $seller->id)->sum('quantity_on_hand');

        return response()->json([
            'store_name' => $seller->store_name,
            'status' => $seller->status,
            'commission_rate' => $seller->commission_rate,
            'gross_sales' => $grossSales,
            'commission_deductions' => $commissionDeductions,
            'net_earnings' => $netEarnings,
            'total_orders' => $orderCount,
            'total_inventory_units' => $inventoryCount,
        ]);
    }

    public function products(Request $request): JsonResponse
    {
        $seller = $this->getSeller($request);
        $products = Product::with(['variants.inventoryItem', 'category'])
            ->where('seller_id', $seller->id)
            ->paginate(20);

        return response()->json($products);
    }

    public function storeProduct(Request $request): JsonResponse
    {
        $seller = $this->getSeller($request);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'category_id' => 'required|integer|exists:categories,id',
            'brand_id' => 'nullable|integer|exists:brands,id',
            'description' => 'required|string',
            'price' => 'required|numeric|min:0',
            'stock' => 'required|integer|min:0',
            'sku' => 'nullable|string',
        ]);

        $sku = $validated['sku'] ?? 'SKU-' . strtoupper(Str::random(8));
        $slug = Str::slug($validated['name']) . '-' . Str::random(5);

        $product = Product::create([
            'id' => (string) Str::uuid(),
            'seller_id' => $seller->id,
            'category_id' => $validated['category_id'],
            'brand_id' => $validated['brand_id'] ?? null,
            'name' => $validated['name'],
            'slug' => $slug,
            'sku' => $sku,
            'description' => $validated['description'],
            'status' => 'active',
            'published_at' => now(),
        ]);

        $variant = ProductVariant::create([
            'id' => (string) Str::uuid(),
            'product_id' => $product->id,
            'sku' => $sku . '-V1',
            'name' => 'Default Variant',
            'price' => $validated['price'],
        ]);

        InventoryItem::create([
            'id' => (string) Str::uuid(),
            'product_id' => $product->id,
            'variant_id' => $variant->id,
            'seller_id' => $seller->id,
            'quantity_on_hand' => $validated['stock'],
            'quantity_reserved' => 0,
        ]);

        return response()->json([
            'message' => 'Product published successfully',
            'product' => $product->load('variants'),
        ], 201);
    }

    public function showProduct(Request $request, string $id): JsonResponse
    {
        $seller = $this->getSeller($request);
        $product = Product::with(['variants.inventoryItem', 'category', 'images'])
            ->where('seller_id', $seller->id)
            ->where('id', $id)
            ->firstOrFail();

        return response()->json(['product' => $product]);
    }

    public function updateProduct(Request $request, string $id): JsonResponse
    {
        $seller = $this->getSeller($request);
        $product = Product::where('seller_id', $seller->id)->where('id', $id)->firstOrFail();

        $product->update($request->only(['name', 'description', 'category_id', 'brand_id', 'status']));

        return response()->json([
            'message' => 'Product updated successfully',
            'product' => $product,
        ]);
    }

    public function deleteProduct(Request $request, string $id): JsonResponse
    {
        $seller = $this->getSeller($request);
        $product = Product::where('seller_id', $seller->id)->where('id', $id)->firstOrFail();
        $product->delete();

        return response()->json(['message' => 'Product deleted successfully']);
    }

    public function inventory(Request $request): JsonResponse
    {
        $seller = $this->getSeller($request);
        $inventory = InventoryItem::with(['product', 'variant'])
            ->where('seller_id', $seller->id)
            ->get();

        return response()->json(['inventory' => $inventory]);
    }

    public function adjustInventory(Request $request): JsonResponse
    {
        $seller = $this->getSeller($request);

        $validated = $request->validate([
            'inventory_item_id' => 'required|string|exists:inventory_items,id',
            'adjustment_quantity' => 'required|integer',
            'reason' => 'required|string',
        ]);

        $item = InventoryItem::where('seller_id', $seller->id)
            ->where('id', $validated['inventory_item_id'])
            ->firstOrFail();

        $before = $item->quantity_on_hand;
        $after = $before + $validated['adjustment_quantity'];
        if ($after < $item->quantity_reserved) {
            return response()->json([
                'message' => 'Adjustment would drop available stock below currently reserved customer commitments.',
            ], 422);
        }

        $item->quantity_on_hand = $after;
        $item->save();

        InventoryMovement::create([
            'id' => (string) Str::uuid(),
            'inventory_item_id' => $item->id,
            'type' => 'adjustment',
            'quantity' => $validated['adjustment_quantity'],
            'reference_type' => 'manual_adjustment',
            'reference_id' => (string) Str::uuid(),
            'before_quantity' => $before,
            'after_quantity' => $after,
            'created_by' => $request->user()->id,
            'created_at' => now(),
        ]);

        return response()->json([
            'message' => 'Inventory updated',
            'item' => $item,
        ]);
    }

    public function subOrders(Request $request): JsonResponse
    {
        $seller = $this->getSeller($request);
        $orders = SellerOrder::with(['items', 'order.address'])
            ->where('seller_id', $seller->id)
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json($orders);
    }

    public function showSubOrder(Request $request, string $subOrderNumber): JsonResponse
    {
        $seller = $this->getSeller($request);
        $subOrder = SellerOrder::with(['items', 'order.address'])
            ->where('seller_id', $seller->id)
            ->where('sub_order_number', $subOrderNumber)
            ->firstOrFail();

        return response()->json(['sub_order' => $subOrder]);
    }

    public function fulfillSubOrder(Request $request, string $subOrderNumber): JsonResponse
    {
        $seller = $this->getSeller($request);
        $subOrder = SellerOrder::where('seller_id', $seller->id)
            ->where('sub_order_number', $subOrderNumber)
            ->firstOrFail();

        $subOrder->update(['fulfillment_status' => 'dispatched']);

        return response()->json([
            'message' => 'Order marked as dispatched for hub collection',
            'sub_order' => $subOrder,
        ]);
    }

    public function payouts(Request $request): JsonResponse
    {
        $seller = $this->getSeller($request);
        $payouts = Payout::with('items')
            ->where('seller_id', $seller->id)
            ->orderBy('requested_at', 'desc')
            ->get();

        return response()->json(['payouts' => $payouts]);
    }

    public function requestPayout(Request $request): JsonResponse
    {
        $seller = $this->getSeller($request);

        $validated = $request->validate([
            'amount' => 'required|numeric|min:500',
            'method' => 'required|in:mpesa_b2c,bank_transfer',
        ]);

        $payout = Payout::create([
            'id' => (string) Str::uuid(),
            'payout_number' => 'PO-' . date('Ymd') . '-' . strtoupper(Str::random(6)),
            'seller_id' => $seller->id,
            'amount' => $validated['amount'],
            'currency' => 'KES',
            'method' => $validated['method'],
            'status' => 'pending',
            'requested_at' => now(),
        ]);

        return response()->json([
            'message' => 'Payout requested successfully and submitted to Finance Escrow Queue',
            'payout' => $payout,
        ], 201);
    }

    public function verificationStatus(Request $request): JsonResponse
    {
        $seller = $this->getSeller($request);
        $documents = SellerDocument::where('seller_id', $seller->id)->get();

        return response()->json([
            'seller_status' => $seller->status,
            'documents' => $documents,
        ]);
    }

    public function uploadDocument(Request $request): JsonResponse
    {
        $seller = $this->getSeller($request);

        $validated = $request->validate([
            'document_type' => 'required|string|in:national_id,passport,business_permit,cr12,tax_compliance,bank_statement',
            'file_path' => 'required|string',
            'document_number' => 'nullable|string',
        ]);

        $doc = SellerDocument::create([
            'id' => (string) Str::uuid(),
            'seller_id' => $seller->id,
            'document_type' => $validated['document_type'],
            'document_number' => $validated['document_number'] ?? null,
            'file_path' => $validated['file_path'],
            'status' => 'pending',
            'created_at' => now(),
        ]);

        return response()->json([
            'message' => 'Document submitted for compliance review',
            'document' => $doc,
        ], 201);
    }

    public function updateStoreSettings(Request $request): JsonResponse
    {
        $seller = $this->getSeller($request);

        $seller->update($request->only([
            'store_name',
            'description',
            'logo_path',
            'banner_path',
        ]));

        return response()->json([
            'message' => 'Store profile updated',
            'seller' => $seller,
        ]);
    }
}
