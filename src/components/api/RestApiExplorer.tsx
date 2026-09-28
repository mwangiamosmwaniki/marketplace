import React, { useState } from "react";
import { useMarketplace } from "../../context/MarketplaceContext";
import {
  Code,
  Play,
  CheckCircle2,
  Copy,
  Layers,
  ExternalLink,
} from "lucide-react";

export const RestApiExplorer: React.FC = () => {
  const {
    products,
    sellers,
    orders,
    payouts,
    categories,
    brands,
    deliveryZones,
  } = useMarketplace();

  const [selectedEndpoint, setSelectedEndpoint] = useState<string>(
    "GET /api/v1/products",
  );
  const [responseJson, setResponseJson] = useState<string>("");
  const [statusCode, setStatusCode] = useState<number>(200);
  const [responseTime, setResponseTime] = useState<number>(38);
  const [copied, setCopied] = useState(false);

  const endpoints = [
    {
      group: "Public Storefront",
      items: [
        {
          id: "GET /api/v1/products",
          method: "GET",
          path: "/api/v1/products",
          desc: "List active catalog products with filtering, price bounds, sorting & pagination.",
          handler: () => ({
            success: true,
            total: products.length,
            page: 1,
            limit: 20,
            data: products.map((p) => ({
              id: p.id,
              name: p.name,
              sku: p.sku,
              price: p.price,
              discount_price: p.discountPrice,
              stock: p.stock,
              seller_id: p.sellerId,
              rating: p.rating,
              is_flash_sale: p.isFlashSale,
            })),
          }),
        },
        {
          id: "GET /api/v1/categories",
          method: "GET",
          path: "/api/v1/categories",
          desc: "Retrieve marketplace category taxonomy tree with commission rates.",
          handler: () => ({
            success: true,
            data: categories,
          }),
        },
        {
          id: "GET /api/v1/delivery/zones",
          method: "GET",
          path: "/api/v1/delivery/zones",
          desc: "Get real-time delivery fees, pickup hubs and SLAs for all 47 counties.",
          handler: () => ({
            success: true,
            data: deliveryZones,
          }),
        },
      ],
    },
    {
      group: "Checkout & Payments (Daraja M-Pesa)",
      items: [
        {
          id: "POST /api/v1/checkout/quote",
          method: "POST",
          path: "/api/v1/checkout/quote",
          desc: "Server-authoritative price & delivery quote: client sends variant IDs and quantities, backend calculates subtotal & zone fee.",
          handler: () => ({
            success: true,
            subtotal: 45000.0,
            discount: 0.0,
            delivery_fee: 300.0,
            grand_total: 45300.0,
            currency: "KES",
          }),
        },
        {
          id: "POST /api/v1/payments/mpesa/stk",
          method: "POST",
          path: "/api/v1/payments/mpesa/stk",
          desc: "Trigger interactive Daraja USSD STK Push on Safaricom subscriber SIM card.",
          handler: () => ({
            success: true,
            payment_id: "pay-891023-uuid",
            checkout_request_id: "ws_CO_28092026_891023",
            customer_message: "Success. Request accepted for processing",
          }),
        },
        {
          id: "POST /webhooks/mpesa/c2b/confirmation",
          method: "POST",
          path: "/webhooks/mpesa/c2b/confirmation",
          desc: "Strictly idempotent C2B Paybill confirmation webhook enforcing TransID uniqueness and two-leg ledger settlement.",
          handler: () => ({
            ResultCode: 0,
            ResultDesc: "Confirmation Processed Successfully",
          }),
        },
      ],
    },
    {
      group: "Finance & Reconciliation",
      items: [
        {
          id: "POST /api/v1/finance/reconciliation/run",
          method: "POST",
          path: "/api/v1/finance/reconciliation/run",
          desc: "Executes automated 3-way reconciliation across Orders, M-Pesa settlements, and General Ledger accounts.",
          handler: () => ({
            success: true,
            message: "Automated reconciliation run completed. 0 exception(s) detected.",
            run: {
              id: "run-uuid-today",
              run_date: new Date().toISOString().split("T")[0],
              total_processed: orders.length,
              total_exceptions: 0,
              status: "completed",
            },
          }),
        },
      ],
    },
    {
      group: "Seller Center API",
      items: [
        {
          id: "GET /api/v1/seller/orders",
          method: "GET",
          path: "/api/v1/seller/orders",
          desc: "Tenant-isolated vendor sub-orders with commission deductions.",
          handler: () => ({
            success: true,
            seller_id: "seller-samsung",
            sub_orders: orders.flatMap((o) =>
              o.sellerSubOrders.filter(
                (sub) => sub.sellerId === "seller-samsung",
              ),
            ),
          }),
        },
        {
          id: "GET /api/v1/seller/inventory",
          method: "GET",
          path: "/api/v1/seller/inventory",
          desc: "Retrieve SKU-level stock balances and low stock alert warnings.",
          handler: () => ({
            success: true,
            seller_id: "seller-samsung",
            items: products
              .filter((p) => p.sellerId === "seller-samsung")
              .map((p) => ({
                sku: p.sku,
                stock: p.stock,
                low_stock_warning: p.stock <= 5,
              })),
          }),
        },
      ],
    },
    {
      group: "Platform Admin API",
      items: [
        {
          id: "GET /api/v1/admin/analytics",
          method: "GET",
          path: "/api/v1/admin/analytics",
          desc: "Consolidated Gross Merchandise Value, commissions, and seller counts.",
          handler: () => ({
            success: true,
            gross_merchandise_value: orders.reduce(
              (s, o) => s + o.grandTotal,
              0,
            ),
            total_commissions_earned: orders
              .flatMap((o) => o.sellerSubOrders)
              .reduce((s, sub) => s + sub.commissionTotal, 0),
            total_orders: orders.length,
            active_sellers_count: sellers.filter((s) => s.status === "approved")
              .length,
          }),
        },
      ],
    },
  ];

  const handleExecute = (epId: string) => {
    setSelectedEndpoint(epId);
    let foundHandler: any = null;
    for (const grp of endpoints) {
      const match = grp.items.find((i) => i.id === epId);
      if (match) {
        foundHandler = match.handler;
        break;
      }
    }

    if (foundHandler) {
      const result = foundHandler();
      setResponseJson(JSON.stringify(result, null, 2));
      setStatusCode(200);
      setResponseTime(Math.floor(25 + Math.random() * 30));
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(responseJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div id="rest-api-explorer" className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-xs mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Code className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg font-bold text-neutral-900">
              KESALES RESTful API Engine
            </h2>
            <span className="text-[10px] bg-neutral-900 text-white font-bold px-2 py-0.5 rounded font-mono">
              v1.4.0 frontend contract draft
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Standard REST API specifications for mobile apps (iOS / Android),
            merchant ERP integrations, and Safaricom Daraja M-Pesa webhooks.
          </p>
        </div>
      </div>

      {/* Explorer Grid: Left endpoints, Right response viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Endpoints List (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {endpoints.map((grp, idx) => (
            <div
              key={idx}
              className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs"
            >
              <div className="p-3 bg-neutral-50 border-b border-neutral-200 text-xs font-bold text-neutral-700 uppercase tracking-wider">
                {grp.group}
              </div>
              <div className="divide-y divide-neutral-100">
                {grp.items.map((ep) => {
                  const isSelected = selectedEndpoint === ep.id;
                  return (
                    <div
                      key={ep.id}
                      onClick={() => handleExecute(ep.id)}
                      className={`p-3 cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-amber-50/70 border-l-4 border-amber-600"
                          : "hover:bg-neutral-50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded ${
                              ep.method === "GET"
                                ? "bg-blue-100 text-blue-800"
                                : ep.method === "POST"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {ep.method}
                          </span>
                          <span className="font-mono text-xs font-bold text-neutral-900">
                            {ep.path}
                          </span>
                        </div>
                        <Play className="w-3 h-3 text-neutral-400 hover:text-amber-600" />
                      </div>
                      <p className="text-[11px] text-neutral-500">{ep.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Right Interactive Console (7 cols) */}
        <div className="lg:col-span-7 bg-neutral-950 text-neutral-200 rounded-xl border border-neutral-800 shadow-xl overflow-hidden flex flex-col min-h-[500px]">
          {/* Console Header */}
          <div className="p-3 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <span className="font-mono font-bold text-amber-400">
                {selectedEndpoint}
              </span>
              {responseJson && (
                <>
                  <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-mono px-2 py-0.5 rounded font-bold">
                    HTTP {statusCode} OK
                  </span>
                  <span className="text-neutral-400 font-mono text-[10px]">
                    {responseTime}ms
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExecute(selectedEndpoint)}
                className="bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold px-3 py-1 rounded text-xs flex items-center gap-1 shadow-xs transition-colors"
              >
                <Play className="w-3 h-3 fill-current" />
                Send Request
              </button>
              {responseJson && (
                <button
                  onClick={handleCopy}
                  className="p-1 text-neutral-400 hover:text-white rounded border border-neutral-700"
                  title="Copy Response JSON"
                >
                  {copied ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Response Payload Viewer */}
          <div className="p-4 flex-1 overflow-auto font-mono text-xs text-neutral-300">
            {responseJson ? (
              <pre className="text-emerald-400 leading-relaxed">
                {responseJson}
              </pre>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-neutral-600">
                <Code className="w-8 h-8 mb-2" />
                <p>
                  Select an API endpoint and click "Send Request" to preview
                  live output.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
