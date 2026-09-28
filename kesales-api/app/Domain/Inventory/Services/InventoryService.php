<?php

namespace App\Domain\Inventory\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Models\InventoryItem;
use App\Models\InventoryMovement;
use Exception;

class InventoryService
{
    /**
     * Atomically lock and reserve inventory for an order item.
     * Enforces strict before_quantity and after_quantity audit tracking.
     */
    public function reserveStock(string $variantId, int $quantity, string $orderId, ?string $actorId = null): array
    {
        $item = InventoryItem::where('variant_id', $variantId)
            ->lockForUpdate()
            ->first();

        if (!$item) {
            throw new Exception("Inventory item not found for variant ID: {$variantId}");
        }

        $available = $item->quantity_on_hand - $item->quantity_reserved;
        if ($available < $quantity) {
            throw new Exception("Insufficient stock for variant ID: {$variantId}. Available: {$available}, Requested: {$quantity}");
        }

        $beforeReserved = $item->quantity_reserved;
        $afterReserved = $beforeReserved + $quantity;

        $item->quantity_reserved = $afterReserved;
        $item->updated_at = now();
        $item->save();

        InventoryMovement::create([
            'id' => (string) Str::uuid(),
            'inventory_item_id' => $item->id,
            'type' => 'reservation',
            'quantity' => $quantity,
            'reference_type' => 'order',
            'reference_id' => $orderId,
            'before_quantity' => $beforeReserved,
            'after_quantity' => $afterReserved,
            'created_by' => $actorId,
            'created_at' => now(),
        ]);

        return [
            'inventory_id' => $item->id,
            'quantity_on_hand' => $item->quantity_on_hand,
            'quantity_reserved' => $item->quantity_reserved,
            'quantity_available' => $item->quantity_on_hand - $item->quantity_reserved,
        ];
    }

    /**
     * Release reserved stock back to available pool on cancellation or payment failure.
     */
    public function releaseStock(string $variantId, int $quantity, string $orderId, string $reason = 'payment_failed', ?string $actorId = null): void
    {
        $item = InventoryItem::where('variant_id', $variantId)
            ->lockForUpdate()
            ->first();

        if (!$item) {
            return;
        }

        $beforeReserved = $item->quantity_reserved;
        $afterReserved = max(0, $beforeReserved - $quantity);

        $item->quantity_reserved = $afterReserved;
        $item->updated_at = now();
        $item->save();

        InventoryMovement::create([
            'id' => (string) Str::uuid(),
            'inventory_item_id' => $item->id,
            'type' => 'release',
            'quantity' => -$quantity,
            'reference_type' => $reason,
            'reference_id' => $orderId,
            'before_quantity' => $beforeReserved,
            'after_quantity' => $afterReserved,
            'created_by' => $actorId,
            'created_at' => now(),
        ]);
    }

    /**
     * Commit sale upon successful payment settlement.
     * Decrements quantity_on_hand and releases quantity_reserved.
     */
    public function commitStockSale(string $variantId, int $quantity, string $orderId, ?string $actorId = null): void
    {
        $item = InventoryItem::where('variant_id', $variantId)
            ->lockForUpdate()
            ->first();

        if (!$item) {
            return;
        }

        $beforeOnHand = $item->quantity_on_hand;
        $afterOnHand = max(0, $beforeOnHand - $quantity);

        $beforeReserved = $item->quantity_reserved;
        $afterReserved = max(0, $beforeReserved - $quantity);

        $item->quantity_on_hand = $afterOnHand;
        $item->quantity_reserved = $afterReserved;
        $item->updated_at = now();
        $item->save();

        InventoryMovement::create([
            'id' => (string) Str::uuid(),
            'inventory_item_id' => $item->id,
            'type' => 'sale',
            'quantity' => -$quantity,
            'reference_type' => 'order_settlement',
            'reference_id' => $orderId,
            'before_quantity' => $beforeOnHand,
            'after_quantity' => $afterOnHand,
            'created_by' => $actorId,
            'created_at' => now(),
        ]);
    }

    /**
     * Restock returned items after inspection approval.
     */
    public function returnStock(string $variantId, int $quantity, string $returnId, ?string $actorId = null): void
    {
        $item = InventoryItem::where('variant_id', $variantId)
            ->lockForUpdate()
            ->first();

        if (!$item) {
            return;
        }

        $beforeOnHand = $item->quantity_on_hand;
        $afterOnHand = $beforeOnHand + $quantity;

        $item->quantity_on_hand = $afterOnHand;
        $item->updated_at = now();
        $item->save();

        InventoryMovement::create([
            'id' => (string) Str::uuid(),
            'inventory_item_id' => $item->id,
            'type' => 'return',
            'quantity' => $quantity,
            'reference_type' => 'rma_return',
            'reference_id' => $returnId,
            'before_quantity' => $beforeOnHand,
            'after_quantity' => $afterOnHand,
            'created_by' => $actorId,
            'created_at' => now(),
        ]);
    }
}
