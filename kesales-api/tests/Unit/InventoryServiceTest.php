<?php

namespace Tests\Unit;

use Tests\TestCase;
use App\Domain\Inventory\Services\InventoryService;
use App\Models\InventoryItem;
use App\Models\InventoryMovement;
use App\Models\ProductVariant;
use App\Models\Product;
use App\Models\Seller;
use App\Models\Category;
use App\Models\User;
use Illuminate\Support\Str;
use Exception;

class InventoryServiceTest extends TestCase
{
    protected InventoryService $inventoryService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->inventoryService = new InventoryService();
    }

    private function createInventory(int $onHand, int $reserved, int $reorderLevel): InventoryItem
    {
        $sellerUser = User::factory()->create();
        $seller = Seller::create([
            'id' => (string) Str::uuid(),
            'user_id' => $sellerUser->id,
            'store_name' => 'Inventory Unit Seller',
            'slug' => 'inventory-unit-'.Str::lower(Str::random(8)),
            'legal_name' => 'Inventory Unit Seller Limited',
            'status' => 'approved',
        ]);
        $category = Category::create([
            'name' => 'Inventory Test Category',
            'slug' => 'inventory-test-'.Str::lower(Str::random(8)),
        ]);
        $product = Product::create([
            'id' => (string) Str::uuid(),
            'seller_id' => $seller->id,
            'category_id' => $category->id,
            'name' => 'Inventory Test Product',
            'slug' => 'inventory-product-'.Str::lower(Str::random(8)),
            'sku' => 'INV-'.strtoupper(Str::random(8)),
            'description' => 'Inventory test product.',
            'status' => 'active',
        ]);
        $variant = ProductVariant::create([
            'id' => (string) Str::uuid(),
            'product_id' => $product->id,
            'sku' => 'INV-V-'.strtoupper(Str::random(8)),
            'name' => 'Default',
            'price' => 1000,
        ]);

        return InventoryItem::create([
            'id' => (string) Str::uuid(),
            'product_id' => $product->id,
            'variant_id' => $variant->id,
            'seller_id' => $seller->id,
            'quantity_on_hand' => $onHand,
            'quantity_reserved' => $reserved,
            'reorder_level' => $reorderLevel,
        ]);
    }

    public function test_reserve_stock_locks_inventory_and_logs_audit_movement(): void
    {
        $inventory = $this->createInventory(15, 0, 2);

        $orderId = (string) Str::uuid();
        $customerId = User::factory()->create()->id;

        $log = $this->inventoryService->reserveStock($inventory->variant_id, 5, $orderId, $customerId);

        $inventory->refresh();
        $this->assertEquals(15, $inventory->quantity_on_hand);
        $this->assertEquals(5, $inventory->quantity_reserved);

        $movement = InventoryMovement::where('inventory_item_id', $inventory->id)->first();
        $this->assertNotNull($movement);
        $this->assertEquals('reservation', $movement->type);
        $this->assertEquals(5, $movement->quantity);
    }

    public function test_reserve_stock_throws_exception_when_insufficient_stock(): void
    {
        $this->expectException(Exception::class);

        $inventory = $this->createInventory(2, 0, 0);

        $this->inventoryService->reserveStock($inventory->variant_id, 10, (string) Str::uuid());
    }

    public function test_commit_stock_sale_deducts_reserved_inventory(): void
    {
        $inventory = $this->createInventory(10, 5, 0);

        $orderId = (string) Str::uuid();
        $this->inventoryService->commitStockSale($inventory->variant_id, 5, $orderId);

        $inventory->refresh();
        $this->assertEquals(0, $inventory->quantity_reserved);
        $this->assertEquals(5, $inventory->quantity_on_hand);

        $movement = InventoryMovement::where('inventory_item_id', $inventory->id)
            ->where('type', 'sale')
            ->first();
        $this->assertNotNull($movement);
    }
}
