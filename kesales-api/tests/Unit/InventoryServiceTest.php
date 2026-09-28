<?php

namespace Tests\Unit;

use Tests\TestCase;
use App\Domain\Inventory\Services\InventoryService;
use App\Models\InventoryItem;
use App\Models\InventoryMovement;
use App\Models\ProductVariant;
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

    public function test_reserve_stock_locks_inventory_and_logs_audit_movement(): void
    {
        $variantId = (string) Str::uuid();
        $inventory = InventoryItem::create([
            'id' => (string) Str::uuid(),
            'variant_id' => $variantId,
            'quantity_on_hand' => 15,
            'reserved_quantity' => 0,
            'safety_stock' => 2,
        ]);

        $orderId = (string) Str::uuid();
        $customerId = (string) Str::uuid();

        $log = $this->inventoryService->reserveStock($variantId, 5, $orderId, $customerId);

        $inventory->refresh();
        $this->assertEquals(10, $inventory->quantity_on_hand);
        $this->assertEquals(5, $inventory->reserved_quantity);

        $movement = InventoryMovement::where('inventory_item_id', $inventory->id)->first();
        $this->assertNotNull($movement);
        $this->assertEquals('reservation', $movement->type);
        $this->assertEquals(5, $movement->quantity);
    }

    public function test_reserve_stock_throws_exception_when_insufficient_stock(): void
    {
        $this->expectException(Exception::class);

        $variantId = (string) Str::uuid();
        InventoryItem::create([
            'id' => (string) Str::uuid(),
            'variant_id' => $variantId,
            'quantity_on_hand' => 2,
            'reserved_quantity' => 0,
            'safety_stock' => 0,
        ]);

        $this->inventoryService->reserveStock($variantId, 10, (string) Str::uuid());
    }

    public function test_commit_stock_sale_deducts_reserved_inventory(): void
    {
        $variantId = (string) Str::uuid();
        $inventory = InventoryItem::create([
            'id' => (string) Str::uuid(),
            'variant_id' => $variantId,
            'quantity_on_hand' => 10,
            'reserved_quantity' => 5,
            'safety_stock' => 0,
        ]);

        $orderId = (string) Str::uuid();
        $this->inventoryService->commitStockSale($variantId, 5, $orderId);

        $inventory->refresh();
        $this->assertEquals(0, $inventory->reserved_quantity);
        $this->assertEquals(10, $inventory->quantity_on_hand);

        $movement = InventoryMovement::where('inventory_item_id', $inventory->id)
            ->where('type', 'sale')
            ->first();
        $this->assertNotNull($movement);
    }
}
