<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Product;
use App\Models\Category;
use App\Models\Brand;
use App\Models\Seller;
use App\Models\DeliveryZone;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controller as BaseController;

class CatalogController extends BaseController
{
    public function index(Request $request): JsonResponse
    {
        $query = Product::with(['variants', 'images', 'category', 'brand', 'seller'])
            ->where('status', 'active');

        if ($request->has('category')) {
            $query->whereHas('category', function ($q) use ($request) {
                $q->where('slug', $request->query('category'));
            });
        }

        if ($request->has('search')) {
            $term = $request->query('search');
            $query->where(function ($q) use ($term) {
                $q->where('name', 'ILIKE', "%{$term}%")
                  ->orWhere('description', 'ILIKE', "%{$term}%");
            });
        }

        if ($request->boolean('featured')) {
            $query->where('is_featured', true);
        }

        if ($request->boolean('flash_sale')) {
            $query->where('is_flash_sale', true);
        }

        $products = $query->paginate($request->query('per_page', 24));

        return response()->json($products);
    }

    public function show(string $slug): JsonResponse
    {
        $product = Product::with(['variants.inventoryItem', 'images', 'category', 'brand', 'seller', 'reviews.user'])
            ->where('slug', $slug)
            ->firstOrFail();

        return response()->json(['product' => $product]);
    }

    public function categories(): JsonResponse
    {
        $categories = Category::with('children')->where('status', 'active')->orderBy('sort_order')->get();
        return response()->json(['categories' => $categories]);
    }

    public function brands(): JsonResponse
    {
        $brands = Brand::where('status', 'active')->get();
        return response()->json(['brands' => $brands]);
    }

    public function promotions(): JsonResponse
    {
        $promotions = [
            [
                'id' => 'promo-01',
                'title' => 'Nairobi Mega Electronic Expo',
                'discount' => 'Up to 40% OFF',
                'tag' => 'Official Stores',
                'image' => 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=800&q=80',
            ],
            [
                'id' => 'promo-02',
                'title' => 'Fresh Fashion & Apparel Festival',
                'discount' => 'Flat KSh 500 Coupon',
                'tag' => 'Flash Sale',
                'image' => 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=800&q=80',
            ],
        ];

        return response()->json(['promotions' => $promotions]);
    }

    public function flashSales(): JsonResponse
    {
        $flashProducts = Product::with(['variants', 'images', 'seller'])
            ->where('is_flash_sale', true)
            ->where('status', 'active')
            ->limit(10)
            ->get();

        return response()->json([
            'ends_at' => now()->addHours(6)->toIso8601String(),
            'products' => $flashProducts,
        ]);
    }

    public function sellerStore(string $slug): JsonResponse
    {
        $seller = Seller::with(['profile', 'products.variants', 'products.images'])
            ->where('slug', $slug)
            ->where('status', 'approved')
            ->firstOrFail();

        return response()->json(['seller' => $seller]);
    }

    public function deliveryZones(): JsonResponse
    {
        $zones = DeliveryZone::where('is_active', true)->get();
        return response()->json(['zones' => $zones]);
    }
}
