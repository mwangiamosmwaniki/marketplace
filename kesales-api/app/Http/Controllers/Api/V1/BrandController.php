<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Brand;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller as BaseController;

class BrandController extends BaseController
{
    public function index(): JsonResponse
    {
        return response()->json(Brand::orderBy('name')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $brand = Brand::create($request->validate([
            'name' => 'required|string|max:150',
            'slug' => 'required|string|max:150|unique:brands,slug',
            'logo_url' => 'nullable|url|max:2048',
            'is_official' => 'sometimes|boolean',
            'status' => 'sometimes|in:active,inactive',
        ]));

        return response()->json($brand, 201);
    }

    public function show(string $brand): JsonResponse
    {
        return response()->json(Brand::findOrFail($brand));
    }

    public function update(Request $request, string $brand): JsonResponse
    {
        $model = Brand::findOrFail($brand);
        $model->update($request->validate([
            'name' => 'sometimes|required|string|max:150',
            'slug' => 'sometimes|required|string|max:150|unique:brands,slug,'.$model->id,
            'logo_url' => 'sometimes|nullable|url|max:2048',
            'is_official' => 'sometimes|boolean',
            'status' => 'sometimes|in:active,inactive',
        ]));

        return response()->json($model);
    }

    public function destroy(string $brand): JsonResponse
    {
        $model = Brand::findOrFail($brand);
        if ($model->products()->exists()) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'BRAND_IN_USE',
                    'message' => 'Brands with products cannot be deleted.',
                ],
            ], 409);
        }

        $model->delete();
        return response()->json(['success' => true]);
    }
}
