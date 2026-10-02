<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller as BaseController;

class CategoryController extends BaseController
{
    public function index(): JsonResponse
    {
        return response()->json(Category::orderBy('sort_order')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $category = Category::create($request->validate([
            'parent_id' => 'nullable|integer|exists:categories,id',
            'name' => 'required|string|max:150',
            'slug' => 'required|string|max:150|unique:categories,slug',
            'description' => 'nullable|string',
            'image_url' => 'nullable|url|max:2048',
            'status' => 'sometimes|in:active,inactive',
            'sort_order' => 'sometimes|integer|min:0',
        ]));

        return response()->json($category, 201);
    }

    public function show(string $category): JsonResponse
    {
        return response()->json(Category::findOrFail($category));
    }

    public function update(Request $request, string $category): JsonResponse
    {
        $model = Category::findOrFail($category);
        $model->update($request->validate([
            'parent_id' => 'sometimes|nullable|integer|exists:categories,id',
            'name' => 'sometimes|required|string|max:150',
            'slug' => 'sometimes|required|string|max:150|unique:categories,slug,'.$model->id,
            'description' => 'sometimes|nullable|string',
            'image_url' => 'sometimes|nullable|url|max:2048',
            'status' => 'sometimes|in:active,inactive',
            'sort_order' => 'sometimes|integer|min:0',
        ]));

        return response()->json($model);
    }

    public function destroy(string $category): JsonResponse
    {
        $model = Category::findOrFail($category);
        if ($model->products()->exists() || $model->children()->exists()) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'CATEGORY_IN_USE',
                    'message' => 'Categories with products or child categories cannot be deleted.',
                ],
            ], 409);
        }

        $model->delete();
        return response()->json(['success' => true]);
    }
}
