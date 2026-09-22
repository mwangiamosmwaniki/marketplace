import React, { useState } from 'react';
import { Layers, FileCode, CheckCircle2, Copy, Terminal, Shield, Database } from 'lucide-react';

export const LaravelArchitectureViewer: React.FC = () => {
  const [activeFile, setActiveFile] = useState<string>('OrderSplittingService.php');
  const [copied, setCopied] = useState(false);

  const fileTree = [
    {
      category: 'Core Domain Services (app/Services/)',
      files: [
        {
          name: 'OrderSplittingService.php',
          desc: 'Atomic order decomposition into seller sub-orders with commission & stock reservation',
          code: `<?php

namespace App\\Services;

use App\\Models\\Order;
use App\\Models\\SellerSubOrder;
use App\\Models\\OrderItem;
use App\\Models\\ProductVariant;
use App\\Models\\LedgerEntry;
use Illuminate\\Support\\Facades\\DB;
use Illuminate\\Support\\Str;

class OrderSplittingService
{
    /**
     * Atomically split a master checkout cart into tenant-isolated seller sub-orders.
     *
     * @param Order $masterOrder
     * @param array $cartItemsGroupedBySeller
     * @return Order
     * @throws \\Exception
     */
    public function splitAndPersist(Order $masterOrder, array $cartItemsGroupedBySeller): Order
    {
        return DB::transaction(function () use ($masterOrder, $cartItemsGroupedBySeller) {
            $totalMasterSubtotal = 0;
            $totalCommission = 0;

            foreach ($cartItemsGroupedBySeller as $sellerId => $items) {
                $seller = \\App\\Models\\Seller::findOrFail($sellerId);
                $sellerSubtotal = 0;

                // 1. Calculate Seller Subtotal & Validate Stock Atomically
                foreach ($items as $item) {
                    $variant = ProductVariant::lockForUpdate()->findOrFail($item['variant_id']);
                    
                    if ($variant->stock < $item['quantity']) {
                        throw new \\Exception("Insufficient stock for SKU: {$variant->sku}");
                    }

                    // Decrement Stock
                    $variant->decrement('stock', $item['quantity']);
                    $variant->product()->decrement('stock', $item['quantity']);

                    $sellerSubtotal += ($item['price'] * $item['quantity']);
                }

                // 2. Calculate Tiered Commission
                $commissionTotal = round(($sellerSubtotal * $seller->commission_rate) / 100, 2);
                $sellerNetTotal = $sellerSubtotal - $commissionTotal;

                // 3. Create Seller Sub-Order
                $subOrder = SellerSubOrder::create([
                    'order_id' => $masterOrder->id,
                    'seller_id' => $seller->id,
                    'sub_order_number' => 'KS-SUB-' . strtoupper(Str::random(8)),
                    'status' => 'processing',
                    'subtotal' => $sellerSubtotal,
                    'commission_total' => $commissionTotal,
                    'seller_net_total' => $sellerNetTotal,
                    'delivery_fee' => 150.00,
                ]);

                // 4. Attach Line Items
                foreach ($items as $item) {
                    OrderItem::create([
                        'seller_sub_order_id' => $subOrder->id,
                        'product_id' => $item['product_id'],
                        'product_variant_id' => $item['variant_id'],
                        'quantity' => $item['quantity'],
                        'price' => $item['price'],
                        'subtotal' => $item['price'] * $item['quantity'],
                    ]);
                }

                // 5. Update Seller Escrow / Pending Balance
                $seller->increment('pending_balance', $sellerNetTotal);

                // 6. Record Double-Entry Audit Ledger
                LedgerEntry::create([
                    'seller_id' => $seller->id,
                    'order_id' => $masterOrder->id,
                    'type' => 'order_commission',
                    'description' => "Commission earned on sub-order {$subOrder->sub_order_number}",
                    'credit' => $commissionTotal,
                    'balance' => LedgerEntry::latestBalance() + $commissionTotal,
                ]);

                $totalMasterSubtotal += $sellerSubtotal;
                $totalCommission += $commissionTotal;
            }

            $masterOrder->update([
                'subtotal' => $totalMasterSubtotal,
                'status' => 'confirmed',
            ]);

            return $masterOrder->load('sellerSubOrders.items');
        });
    }
}`,
        },
        {
          name: 'MpesaDarajaService.php',
          desc: 'Safaricom Daraja STK Push generation, token authorization, and callback webhook processor',
          code: `<?php

namespace App\\Services;

use App\\Models\\Order;
use App\\Models\\Payment;
use Illuminate\\Support\\Facades\\Http;
use Illuminate\\Support\\Facades\\Log;

class MpesaDarajaService
{
    protected string $consumerKey;
    protected string $consumerSecret;
    protected string $shortcode;
    protected string $passkey;
    protected string $callbackUrl;

    public function __construct()
    {
        $this->consumerKey = config('services.mpesa.consumer_key');
        $this->consumerSecret = config('services.mpesa.consumer_secret');
        $this->shortcode = config('services.mpesa.shortcode', '829104');
        $this->passkey = config('services.mpesa.passkey');
        $this->callbackUrl = route('api.v1.payments.mpesa.callback');
    }

    /**
     * Generate OAuth Bearer Token from Safaricom API.
     */
    public function generateToken(): string
    {
        $url = 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';
        $response = Http::withBasicAuth($this->consumerKey, $this->consumerSecret)->get($url);

        return $response->json('access_token');
    }

    /**
     * Send M-Pesa Express (STK Push) prompt directly to buyer phone.
     */
    public function initiateSTKPush(Order $order, string $phoneNumber): array
    {
        $token = $this->generateToken();
        $timestamp = date('YmdHis');
        $password = base64_encode($this->shortcode . $this->passkey . $timestamp);

        $payload = [
            'BusinessShortCode' => $this->shortcode,
            'Password' => $password,
            'Timestamp' => $timestamp,
            'TransactionType' => 'CustomerPayBillOnline',
            'Amount' => (int) $order->grand_total,
            'PartyA' => $phoneNumber,
            'PartyB' => $this->shortcode,
            'PhoneNumber' => $phoneNumber,
            'CallBackURL' => $this->callbackUrl,
            'AccountReference' => $order->order_number,
            'TransactionDesc' => 'Payment for KESALES Order ' . $order->order_number,
        ];

        $response = Http::withToken($token)
            ->post('https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest', $payload);

        return $response->json();
    }

    /**
     * Handle Daraja Callback Webhook.
     */
    public function handleCallback(array $payload): void
    {
        $resultCode = $payload['Body']['stkCallback']['ResultCode'] ?? -1;
        $merchantRequestId = $payload['Body']['stkCallback']['MerchantRequestID'];

        if ($resultCode === 0) {
            $meta = collect($payload['Body']['stkCallback']['CallbackMetadata']['Item'])
                ->pluck('Value', 'Name');

            $order = Order::where('merchant_request_id', $merchantRequestId)->firstOrFail();
            
            $order->update([
                'payment_status' => 'paid',
                'payment_reference' => $meta['MpesaReceiptNumber'] ?? 'MPESA-AUTO',
            ]);

            Log::info("Order {$order->order_number} marked paid via M-Pesa {$meta['MpesaReceiptNumber']}");
        }
    }
}`,
        },
      ],
    },
    {
      category: 'Eloquent Database Models (app/Models/)',
      files: [
        {
          name: 'Seller.php',
          desc: 'Seller tenant model with isolation scopes, commissions, and KYC relations',
          code: `<?php

namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Model;
use Illuminate\\Database\\Eloquent\\Relations\\HasMany;
use Illuminate\\Database\\Eloquent\\Relations\\BelongsTo;
use Illuminate\\Database\\Eloquent\\SoftDeletes;

class Seller extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'user_id',
        'business_name',
        'slug',
        'owner_name',
        'email',
        'phone',
        'tax_pin',
        'business_reg_number',
        'commission_rate',
        'status',
        'available_balance',
        'pending_balance',
        'total_payouts',
        'payout_account',
    ];

    protected $casts = [
        'commission_rate' => 'decimal:2',
        'available_balance' => 'decimal:2',
        'pending_balance' => 'decimal:2',
        'total_payouts' => 'decimal:2',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    public function subOrders(): HasMany
    {
        return $this->hasMany(SellerSubOrder::class);
    }

    public function payouts(): HasMany
    {
        return $this->hasMany(Payout::class);
    }
}`,
        },
        {
          name: 'SellerSubOrder.php',
          desc: 'Individual seller package decomposed from the Master Order',
          code: `<?php

namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Model;
use Illuminate\\Database\\Eloquent\\Relations\\BelongsTo;
use Illuminate\\Database\\Eloquent\\Relations\\HasMany;

class SellerSubOrder extends Model
{
    protected $fillable = [
        'order_id',
        'seller_id',
        'sub_order_number',
        'status', // processing, ready_for_dispatch, dispatched, delivered, cancelled
        'subtotal',
        'delivery_fee',
        'commission_total',
        'seller_net_total',
        'tracking_number',
        'dispatched_at',
        'delivered_at',
    ];

    public function masterOrder(): BelongsTo
    {
        return $this->belongsTo(Order::class, 'order_id');
    }

    public function seller(): BelongsTo
    {
        return $this->belongsTo(Seller::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }
}`,
        },
      ],
    },
    {
      category: 'Database Schema Migrations (database/migrations/)',
      files: [
        {
          name: '2026_01_01_000003_create_sellers_and_orders_tables.php',
          desc: 'PostgreSQL/MySQL schema migrations for sellers, orders, and sub-orders',
          code: `<?php

use Illuminate\\Database\\Migrations\\Migration;
use Illuminate\\Database\\Schema\\Blueprint;
use Illuminate\\Support\\Facades\\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Sellers Table
        Schema::create('sellers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('business_name');
            $table->string('slug')->unique();
            $table->string('owner_name');
            $table->string('email')->unique();
            $table->string('phone');
            $table->string('tax_pin');
            $table->string('business_reg_number');
            $table->decimal('commission_rate', 5, 2)->default(10.00);
            $table->enum('status', ['under_review', 'approved', 'suspended', 'rejected'])->default('under_review');
            $table->decimal('available_balance', 12, 2)->default(0);
            $table->decimal('pending_balance', 12, 2)->default(0);
            $table->decimal('total_payouts', 12, 2)->default(0);
            $table->string('payout_account')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        // 2. Master Orders Table
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained();
            $table->string('order_number')->unique();
            $table->decimal('subtotal', 12, 2);
            $table->decimal('discount_total', 12, 2)->default(0);
            $table->decimal('delivery_fee', 12, 2)->default(0);
            $table->decimal('grand_total', 12, 2);
            $table->enum('payment_method', ['mpesa_stk', 'card', 'cash_on_delivery']);
            $table->enum('payment_status', ['pending', 'paid', 'failed', 'refunded'])->default('pending');
            $table->string('payment_reference')->nullable();
            $table->enum('status', ['pending', 'confirmed', 'processing', 'dispatched', 'delivered', 'cancelled'])->default('pending');
            $table->json('delivery_address');
            $table->timestamps();
        });

        // 3. Seller Sub Orders Table
        Schema::create('seller_sub_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('seller_id')->constrained();
            $table->string('sub_order_number')->unique();
            $table->enum('status', ['processing', 'ready_for_dispatch', 'dispatched', 'delivered', 'cancelled'])->default('processing');
            $table->decimal('subtotal', 12, 2);
            $table->decimal('delivery_fee', 12, 2)->default(0);
            $table->decimal('commission_total', 12, 2);
            $table->decimal('seller_net_total', 12, 2);
            $table->string('tracking_number')->nullable();
            $table->timestamp('dispatched_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('seller_sub_orders');
        Schema::dropIfExists('orders');
        Schema::dropIfExists('sellers');
    }
};`,
        },
      ],
    },
  ];

  const currentFileObj = fileTree.flatMap((g) => g.files).find((f) => f.name === activeFile);

  const handleCopyCode = () => {
    if (currentFileObj) {
      navigator.clipboard.writeText(currentFileObj.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div id="laravel-architecture-viewer" className="max-w-7xl mx-auto px-4 py-6">
      {/* Header Banner */}
      <div className="bg-red-950 text-white rounded-xl p-5 mb-6 flex items-center justify-between border border-red-900 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-6 h-6 text-red-400" />
            <h2 className="text-lg font-bold">Laravel 11 Production Codebase & Architecture</h2>
          </div>
          <p className="text-xs text-red-200 mt-1">
            Enterprise backend architecture: Service Layer, Atomic Transactions, Daraja STK Push,
            Eloquent ORM & Double-Entry Financial Accounting.
          </p>
        </div>
      </div>

      {/* Grid: Left Navigation Tree, Right Code Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Tree (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {fileTree.map((group, gIdx) => (
            <div
              key={gIdx}
              className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs"
            >
              <div className="p-3 bg-neutral-50 border-b border-neutral-200 font-bold text-xs text-neutral-800">
                {group.category}
              </div>
              <div className="divide-y divide-neutral-100">
                {group.files.map((file) => {
                  const isSelected = activeFile === file.name;
                  return (
                    <div
                      key={file.name}
                      onClick={() => setActiveFile(file.name)}
                      className={`p-3 cursor-pointer transition-colors ${
                        isSelected ? 'bg-red-50/70 border-l-4 border-red-600' : 'hover:bg-neutral-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <FileCode
                          className={`w-4 h-4 ${isSelected ? 'text-red-600' : 'text-neutral-400'}`}
                        />
                        <span className="font-mono text-xs font-bold text-neutral-900">
                          {file.name}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500">{file.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Right Code Display (8 cols) */}
        <div className="lg:col-span-8 bg-neutral-950 text-neutral-100 rounded-xl border border-neutral-800 shadow-xl overflow-hidden flex flex-col">
          <div className="p-3 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between text-xs">
            <span className="font-mono font-bold text-red-400 flex items-center gap-2">
              <Terminal className="w-4 h-4" />
              {activeFile}
            </span>

            <button
              onClick={handleCopyCode}
              className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-xs flex items-center gap-1 font-semibold"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy PHP Source
                </>
              )}
            </button>
          </div>

          <div className="p-4 flex-1 overflow-auto max-h-[600px] font-mono text-xs leading-relaxed text-neutral-300">
            <pre className="text-neutral-200">
              <code>{currentFileObj?.code}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
