<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use App\Models\Order;
use App\Domain\Inventory\Services\InventoryService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Sweeps orders remaining in PENDING_PAYMENT beyond the checkout TTL (15 minutes),
 * releases reserved inventory back to available stock, and marks orders EXPIRED.
 */
class ReleaseExpiredReservationsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public const EXPIRATION_MINUTES = 15;

    public function handle(InventoryService $inventoryService): void
    {
        $cutoff = now()->subMinutes(self::EXPIRATION_MINUTES);

        $expiredOrders = Order::with('items')
            ->where('status', 'PENDING_PAYMENT')
            ->where('payment_status', 'pending')
            ->where('created_at', '<=', $cutoff)
            ->get();

        foreach ($expiredOrders as $order) {
            DB::transaction(function () use ($order, $inventoryService) {
                // Double check lock
                $lockedOrder = Order::where('id', $order->id)->lockForUpdate()->first();
                if ($lockedOrder->status !== 'PENDING_PAYMENT') {
                    return;
                }

                // Release reserved stock for each item
                foreach ($order->items as $item) {
                    $inventoryService->releaseStock(
                        variantId: $item->variant_id,
                        quantity: $item->quantity,
                        orderId: $order->id
                    );
                }

                $lockedOrder->update([
                    'status' => 'CANCELLED',
                    'updated_at' => now(),
                ]);

                Log::info("Released expired stock reservations for abandoned order {$order->order_number}");
            });
        }
    }
}
