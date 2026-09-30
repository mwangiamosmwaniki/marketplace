<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\InventoryItem;
use App\Models\InventoryMovement;
use App\Models\SellerOrder;
use App\Models\Payout;
use App\Models\SellerDocument;
use App\Domain\Settlement\Services\SellerSettlementService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;
use Illuminate\Routing\Controller as BaseController;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class SellerController extends BaseController
{
    public function __construct(
        protected SellerSettlementService $settlementService
    ) {}
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
        abort_unless($seller->status === 'approved', 403, 'Seller approval is required before listing products.');

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
            'status' => 'pending_approval',
            'published_at' => null,
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
            'message' => 'Product submitted for catalog approval',
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

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'sometimes|required|string',
            'category_id' => 'sometimes|required|integer|exists:categories,id',
            'brand_id' => 'sometimes|nullable|integer|exists:brands,id',
        ]);

        if ($validated !== []) {
            $product->update(array_merge($validated, [
                'status' => 'pending_approval',
                'published_at' => null,
            ]));
        }

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
            'adjustment_quantity' => 'required|integer|not_in:0',
            'reason' => 'required|string|max:500',
        ]);

        return DB::transaction(function () use ($request, $seller, $validated): JsonResponse {
            $item = InventoryItem::where('seller_id', $seller->id)
                ->where('id', $validated['inventory_item_id'])
                ->lockForUpdate()
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
        });
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
        $validated = $request->validate([
            'status' => 'required|in:processing,packed,dispatched,delivered',
            'tracking_number' => 'required_if:status,dispatched|nullable|string|max:100',
            'carrier' => 'required_if:status,dispatched|nullable|string|max:100',
        ]);

        return DB::transaction(function () use ($request, $seller, $subOrderNumber, $validated): JsonResponse {
            $subOrder = SellerOrder::where('seller_id', $seller->id)
                ->where('sub_order_number', $subOrderNumber)
                ->lockForUpdate()
                ->firstOrFail();

            $allowedNext = [
                'unfulfilled' => 'processing',
                'processing' => 'packed',
                'packed' => 'dispatched',
                'dispatched' => 'delivered',
            ];
            $nextStatus = $validated['status'];
            if (($allowedNext[$subOrder->fulfillment_status] ?? null) !== $nextStatus) {
                return response()->json([
                    'message' => 'Invalid fulfillment transition.',
                    'current_status' => $subOrder->fulfillment_status,
                    'requested_status' => $nextStatus,
                ], 422);
            }

            $currentStatus = $subOrder->fulfillment_status;
            $updates = ['fulfillment_status' => $nextStatus];
            if ($nextStatus === 'dispatched') {
                $updates['tracking_number'] = trim($validated['tracking_number']);
                $updates['carrier'] = trim($validated['carrier']);
            }
            if ($nextStatus === 'delivered') {
                $updates['delivered_at'] = now();
            }
            $subOrder->update($updates);

            DB::table('seller_order_events')->insert([
                'id' => (string) Str::uuid(),
                'seller_order_id' => $subOrder->id,
                'actor_id' => $request->user()->id,
                'from_status' => $currentStatus,
                'to_status' => $nextStatus,
                'metadata' => json_encode(array_filter([
                    'tracking_number' => $updates['tracking_number'] ?? null,
                    'carrier' => $updates['carrier'] ?? null,
                ]), JSON_THROW_ON_ERROR),
                'created_at' => now(),
            ]);

            return response()->json([
                'message' => 'Fulfillment status updated.',
                'sub_order' => $subOrder->refresh(),
            ]);
        });
    }

    public function payouts(Request $request): JsonResponse
    {
        $seller = $this->getSeller($request);
        $balances = $this->settlementService->calculateSellerBalances($seller->id);
        $payouts = Payout::with('items')
            ->where('seller_id', $seller->id)
            ->orderBy('requested_at', 'desc')
            ->get();

        return response()->json([
            'balances' => $balances,
            'payouts' => $payouts,
        ]);
    }

    public function requestPayout(Request $request): JsonResponse
    {
        $seller = $this->getSeller($request);

        $validated = $request->validate([
            'amount' => 'required|numeric|min:500',
            'method' => 'required|in:mpesa_b2c,bank_transfer',
        ]);

        return \Illuminate\Support\Facades\DB::transaction(function () use ($seller, $validated) {
            $lockedSeller = \App\Models\Seller::where('id', $seller->id)->lockForUpdate()->first();
            $balances = $this->settlementService->calculateSellerBalances($lockedSeller->id);

            $requestedAmount = (string) $validated['amount'];
            $isValid = $this->settlementService->validatePayoutRequest($lockedSeller->id, $requestedAmount);
            if (!$isValid) {
                return response()->json([
                    'success' => false,
                    'message' => "Requested amount (KSh {$validated['amount']}) exceeds available settled balance (KSh {$balances['available_balance']}) or minimum payout threshold (KSh 500).",
                    'available_balance' => $balances['available_balance'],
                ], 422);
            }

            $payout = Payout::create([
                'id' => (string) Str::uuid(),
                'payout_number' => 'PO-' . date('Ymd') . '-' . strtoupper(Str::random(6)),
                'seller_id' => $lockedSeller->id,
                'amount' => $requestedAmount,
                'currency' => 'KES',
                'method' => $validated['method'],
                'status' => 'pending',
                'requested_at' => now(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Payout request submitted for finance compliance review',
                'payout' => $payout,
            ], 201);
        });
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
            'file' => 'required|file|mimes:pdf,jpg,jpeg,png|max:10240',
            'document_number' => 'nullable|string',
        ]);

        $filePath = $request->file('file')->store('seller-kyc/'.$seller->id, 'local');
        if (!$filePath) {
            return response()->json([
                'success' => false,
                'message' => 'The document could not be stored securely.',
            ], 500);
        }

        try {
            $doc = SellerDocument::create([
                'id' => (string) Str::uuid(),
                'seller_id' => $seller->id,
                'document_type' => $validated['document_type'],
                'document_number' => $validated['document_number'] ?? null,
                'file_path' => $filePath,
                'status' => 'pending',
                'created_at' => now(),
            ]);
        } catch (\Throwable $exception) {
            Storage::disk('local')->delete($filePath);
            throw $exception;
        }

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
