import { useState, type ReactNode } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  Package,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  Wallet,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { OrderStatus } from "../../types";

type OverviewRange = "7D" | "30D" | "3M" | "12M";

const rangeDays: Record<OverviewRange, number> = {
  "7D": 7,
  "30D": 30,
  "3M": 90,
  "12M": 365,
};

const rangeBuckets: Record<OverviewRange, number> = {
  "7D": 7,
  "30D": 8,
  "3M": 12,
  "12M": 12,
};

const chartColors = ["#4385f5", "#8f55ed", "#34aa78", "#e8a53b"];

function relativeTime(value: string) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return "Recently";
  const minutes = Math.max(0, Math.floor((Date.now() - time) / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function changeLabel(current: number, previous: number) {
  if (previous === 0) return current === 0 ? "0.0%" : "New";
  const change = ((current - previous) / previous) * 100;
  return `${change > 0 ? "+" : ""}${change.toFixed(1)}%`;
}

function curvePath(values: number[], width: number, height: number) {
  if (values.length === 0) return "";
  const max = Math.max(...values, 1);
  const points = values.map((value, index) => ({
    x: values.length === 1 ? 0 : (index / (values.length - 1)) * width,
    y: height - 5 - (value / max) * (height - 14),
  }));

  return points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const previous = points[index - 1];
    const middle = (previous.x + point.x) / 2;
    return `${path} C ${middle} ${previous.y}, ${middle} ${point.y}, ${point.x} ${point.y}`;
  }, "");
}

function donutStyle(values: Array<{ value: number; color: string }>) {
  const total = values.reduce((sum, item) => sum + item.value, 0);
  if (!total) return "conic-gradient(#e8edf4 0deg 360deg)";
  let position = 0;
  return `conic-gradient(${values
    .map((item) => {
      const start = position;
      position += (item.value / total) * 360;
      return `${item.color} ${start}deg ${position}deg`;
    })
    .join(", ")})`;
}

function Panel({
  title,
  action,
  children,
  className = "",
}: Readonly<{
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}>) {
  return (
    <section
      className={`min-w-0 rounded-md border border-slate-200 bg-white p-3 shadow-sm ${className}`}
    >
      <header className="mb-2 flex min-h-5 items-center justify-between gap-2">
        <h3 className="text-[12px] font-bold text-slate-800">{title}</h3>
        {action}
      </header>
      {children}
    </section>
  );
}

function StatusDonut({
  items,
  total,
}: Readonly<{
  items: Array<{ label: string; value: number; color: string }>;
  total: number;
}>) {
  return (
    <div className="flex min-h-[108px] items-center gap-3">
      <div
        className="relative grid h-[92px] w-[92px] shrink-0 place-items-center rounded-full"
        style={{ background: donutStyle(items) }}
        role="img"
        aria-label={`Order status distribution: ${total} seller orders`}
      >
        <div className="grid h-[60px] w-[60px] place-content-center rounded-full bg-white text-center">
          <strong className="text-[14px] leading-4 text-slate-800">
            {total.toLocaleString()}
          </strong>
          <span className="text-[9px] text-slate-500">Total Orders</span>
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between gap-2 text-[9px]"
          >
            <span className="flex min-w-0 items-center gap-1.5 text-slate-600">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="truncate">{item.label}</span>
            </span>
            <span className="shrink-0 font-semibold text-slate-700">
              {item.value} (
              {total ? ((item.value / total) * 100).toFixed(1) : "0.0"}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function statusTone(status: OrderStatus) {
  if (status === "delivered") return "bg-emerald-100 text-emerald-700";
  if (status === "dispatched" || status === "out_for_delivery")
    return "bg-violet-100 text-violet-700";
  if (status === "cancelled" || status === "returned" || status === "refunded")
    return "bg-rose-100 text-rose-700";
  if (status === "ready_for_dispatch") return "bg-amber-100 text-amber-700";
  return "bg-blue-100 text-blue-700";
}

function payoutTone(status: string) {
  if (status === "processed") return "bg-emerald-100 text-emerald-700";
  if (status === "rejected") return "bg-rose-100 text-rose-700";
  return "bg-blue-100 text-blue-700";
}

function stockTone(stock: number) {
  if (stock === 0) return "bg-rose-100 text-rose-700";
  if (stock <= 2) return "bg-orange-100 text-orange-700";
  return "bg-amber-100 text-amber-700";
}

export function SellerOverview({
  onNavigateTab,
}: Readonly<{
  onNavigateTab: (tab: "products" | "orders" | "payouts" | "inventory") => void;
}>) {
  const { categories, currentSeller, formatKSh, orders, payouts, products } =
    useApp();
  const [range, setRange] = useState<OverviewRange>("30D");

  if (!currentSeller) return null;

  const sellerProducts = products.filter(
    (product) => product.sellerId === currentSeller.id,
  );
  const sellerSubOrders = orders.flatMap((order) =>
    order.sellerSubOrders.filter(
      (subOrder) => subOrder.sellerId === currentSeller.id,
    ),
  );
  const sellerPayouts = payouts
    .filter((payout) => payout.sellerId === currentSeller.id)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  const now = new Date();
  const start = new Date(now.getTime() - rangeDays[range] * 86_400_000);
  const previousStart = new Date(
    start.getTime() - rangeDays[range] * 86_400_000,
  );
  const inRange = (date: string, from: Date, to: Date) => {
    const time = new Date(date).getTime();
    return (
      Number.isFinite(time) && time >= from.getTime() && time < to.getTime()
    );
  };
  const currentRangeOrders = sellerSubOrders.filter((subOrder) =>
    inRange(subOrder.createdAt, start, now),
  );
  const previousRangeOrders = sellerSubOrders.filter((subOrder) =>
    inRange(subOrder.createdAt, previousStart, start),
  );
  const totalSales = currentRangeOrders
    .filter((subOrder) => subOrder.status !== "cancelled")
    .reduce((sum, subOrder) => sum + subOrder.subtotal, 0);
  const previousSales = previousRangeOrders
    .filter((subOrder) => subOrder.status !== "cancelled")
    .reduce((sum, subOrder) => sum + subOrder.subtotal, 0);
  const activeProducts = sellerProducts.filter(
    (product) => product.status === "active",
  );
  const previousProducts = sellerProducts.filter((product) =>
    inRange(product.createdAt, previousStart, start),
  ).length;
  const currentProductsAdded = sellerProducts.filter((product) =>
    inRange(product.createdAt, start, now),
  ).length;

  const buckets = rangeBuckets[range];
  const trendValues = Array.from({ length: buckets }, () => 0);
  const orderValues = Array.from({ length: buckets }, () => 0);
  currentRangeOrders.forEach((subOrder) => {
    const time = new Date(subOrder.createdAt).getTime();
    const index = Math.min(
      buckets - 1,
      Math.floor(
        ((time - start.getTime()) / (now.getTime() - start.getTime())) *
          buckets,
      ),
    );
    if (index < 0 || !Number.isFinite(index)) return;
    if (subOrder.status !== "cancelled")
      trendValues[index] += subOrder.subtotal;
    orderValues[index] += 1;
  });
  const trendLabels = Array.from({ length: buckets }, (_, index) => {
    const time =
      start.getTime() +
      ((index + 0.5) / buckets) * (now.getTime() - start.getTime());
    return new Intl.DateTimeFormat("en-KE", {
      day: "numeric",
      month: "short",
    }).format(new Date(time));
  });

  const salesByProduct = new Map<
    string,
    { quantity: number; revenue: number }
  >();
  sellerSubOrders.forEach((subOrder) => {
    subOrder.items.forEach((item) => {
      const current = salesByProduct.get(item.productId) || {
        quantity: 0,
        revenue: 0,
      };
      current.quantity += item.quantity;
      current.revenue += item.subtotal;
      salesByProduct.set(item.productId, current);
    });
  });
  const topProducts = sellerProducts
    .map((product) => ({
      product,
      quantity: salesByProduct.get(product.id)?.quantity || 0,
      revenue: salesByProduct.get(product.id)?.revenue || 0,
    }))
    .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)
    .slice(0, 5);

  const statusCounts = [
    {
      label: "Delivered",
      value: sellerSubOrders.filter((item) => item.status === "delivered")
        .length,
      color: "#31a77a",
    },
    {
      label: "Processing",
      value: sellerSubOrders.filter((item) =>
        ["processing", "confirmed"].includes(item.status),
      ).length,
      color: "#4385f5",
    },
    {
      label: "Packed",
      value: sellerSubOrders.filter(
        (item) => item.status === "ready_for_dispatch",
      ).length,
      color: "#f0ad3f",
    },
    {
      label: "Dispatched",
      value: sellerSubOrders.filter((item) =>
        ["dispatched", "out_for_delivery"].includes(item.status),
      ).length,
      color: "#8f55ed",
    },
    {
      label: "Cancelled",
      value: sellerSubOrders.filter((item) => item.status === "cancelled")
        .length,
      color: "#eb6474",
    },
    {
      label: "Returned",
      value: sellerSubOrders.filter((item) =>
        ["returned", "refunded", "return_requested"].includes(item.status),
      ).length,
      color: "#8290a5",
    },
  ];

  const revenueMonths = Array.from({ length: 7 }, (_, index) => {
    const monthStart = new Date(
      now.getFullYear(),
      now.getMonth() - 6 + index,
      1,
    );
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
    const sales = sellerSubOrders
      .filter(
        (subOrder) =>
          inRange(subOrder.createdAt, monthStart, monthEnd) &&
          subOrder.status !== "cancelled",
      )
      .reduce((sum, subOrder) => sum + subOrder.subtotal, 0);
    return {
      label: new Intl.DateTimeFormat("en-KE", { month: "short" }).format(
        monthStart,
      ),
      sales,
    };
  });
  const maxMonthRevenue = Math.max(
    ...revenueMonths.map((item) => item.sales),
    1,
  );

  const ordersById = new Map(orders.map((order) => [order.id, order]));
  const recentOrders = [...sellerSubOrders]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 5)
    .map((subOrder) => ({
      subOrder,
      masterOrder: ordersById.get(subOrder.masterOrderId),
    }));
  const lowStockProducts = sellerProducts
    .filter((product) => product.stock <= 5 && product.status !== "archived")
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 5);
  const lowStockNoun =
    lowStockProducts.length === 1 ? "product is" : "products are";
  const quickTip =
    lowStockProducts.length > 0
      ? `${lowStockProducts.length} ${lowStockNoun} running low. Restock popular items to avoid missed orders.`
      : "Keep product availability and delivery details up to date to give shoppers confidence.";

  const metrics = [
    {
      label: "Total Sales",
      value: formatKSh(totalSales),
      change: changeLabel(totalSales, previousSales),
      icon: <ShoppingBag size={15} />,
      tone: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Orders Received",
      value: currentRangeOrders.length.toLocaleString(),
      change: changeLabel(
        currentRangeOrders.length,
        previousRangeOrders.length,
      ),
      icon: <Package size={15} />,
      tone: "bg-blue-50 text-blue-600",
    },
    {
      label: "Active Products",
      value: activeProducts.length.toLocaleString(),
      change: changeLabel(currentProductsAdded, previousProducts),
      icon: <Store size={15} />,
      tone: "bg-violet-50 text-violet-600",
    },
    {
      label: "Available Balance",
      value: formatKSh(currentSeller.availableBalance),
      change: "Available now",
      icon: <Wallet size={15} />,
      tone: "bg-orange-50 text-orange-600",
    },
    {
      label: "Average Rating",
      value: currentSeller.rating.toFixed(1),
      change: "Store rating",
      icon: <Star size={15} />,
      tone: "bg-amber-50 text-amber-600",
    },
  ];

  const dateLabel = new Intl.DateTimeFormat("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(now);
  const sellerGreeting = currentSeller.ownerName.split(" ")[0] || "Seller";

  return (
    <div className="space-y-2.5 text-slate-800">
      <div className="flex flex-wrap items-end justify-between gap-2 pb-0.5">
        <div>
          <p className="text-[10px] text-slate-500">
            Here&apos;s how your store is performing today.
          </p>
          <h2 className="text-[17px] font-bold leading-6 text-slate-900">
            Good morning, {sellerGreeting} 👋
          </h2>
        </div>
        <label className="flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 text-[10px] text-slate-600 shadow-sm">
          <CalendarDays size={13} className="text-slate-500" />
          <span className="sr-only">Dashboard date range</span>
          <select
            value={range}
            onChange={(event) => setRange(event.target.value as OverviewRange)}
            className="bg-transparent text-[10px] font-medium outline-none"
          >
            <option value="7D">Last 7 days</option>
            <option value="30D">Last 30 days</option>
            <option value="3M">Last 3 months</option>
            <option value="12M">Last 12 months</option>
          </select>
          <span className="hidden text-slate-400 sm:inline">· {dateLabel}</span>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
        {metrics.map((metric) => {
          const positive = !metric.change.startsWith("-");
          return (
            <section
              key={metric.label}
              className="min-w-0 rounded-md border border-slate-200 bg-white p-2.5 shadow-sm"
            >
              <div className="flex items-center gap-1.5 text-[9px] font-medium text-slate-500">
                <span
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-md ${metric.tone}`}
                >
                  {metric.icon}
                </span>
                <span className="truncate">{metric.label}</span>
              </div>
              <div className="mt-1.5 truncate text-[17px] font-bold leading-5 text-slate-800">
                {metric.value}
              </div>
              <div
                className={`mt-1 flex items-center gap-0.5 text-[9px] font-semibold ${positive ? "text-emerald-600" : "text-rose-600"}`}
              >
                {positive ? (
                  <ArrowUpRight size={11} />
                ) : (
                  <ArrowDownRight size={11} />
                )}
                <span className="truncate">{metric.change}</span>
              </div>
              <p className="mt-0.5 truncate text-[8px] text-slate-400">
                {metric.label === "Available Balance" ||
                metric.label === "Average Rating"
                  ? "Current value"
                  : "vs previous period"}
              </p>
            </section>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-12">
        <Panel
          title="Sales Overview"
          action={
            <div className="flex items-center gap-3 text-[9px] text-slate-500">
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                Sales
              </span>
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                Orders
              </span>
            </div>
          }
          className="xl:col-span-7"
        >
          <div className="relative h-[178px] w-full">
            <svg
              viewBox="0 0 540 190"
              className="h-full w-full"
              role="img"
              aria-label={`Store sales and orders over the last ${range}`}
            >
              {[25, 60, 95, 130].map((y, index) => (
                <g key={y}>
                  <line
                    x1="42"
                    y1={y}
                    x2="530"
                    y2={y}
                    stroke="#edf0f4"
                    strokeWidth="1"
                  />
                  <text
                    x="36"
                    y={y + 3}
                    fill="#9aa3b2"
                    fontSize="8"
                    textAnchor="end"
                  >
                    {100 - index * 25}%
                  </text>
                </g>
              ))}
              {trendLabels.map((label, index) => {
                const value = trendValues[index];
                const width = Math.max(8, 350 / buckets - 4);
                const x =
                  48 + (index / Math.max(buckets - 1, 1)) * 470 - width / 2;
                const height = value
                  ? Math.max(3, (value / Math.max(...trendValues, 1)) * 112)
                  : 0;
                return (
                  <rect
                    key={`bar-${label}`}
                    x={x}
                    y={142 - height}
                    width={width}
                    height={height}
                    rx="1.5"
                    fill="#9b8df4"
                    opacity="0.72"
                  />
                );
              })}
              {currentRangeOrders.length > 0 && (
                <path
                  d={curvePath(trendValues, 484, 112)}
                  transform="translate(48 23)"
                  fill="none"
                  stroke={chartColors[0]}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              )}
              {trendLabels.map((label, index) => (
                <text
                  key={label}
                  x={48 + (index / Math.max(buckets - 1, 1)) * 484}
                  y="170"
                  fill="#8993a2"
                  fontSize="8"
                  textAnchor="middle"
                >
                  {label}
                </text>
              ))}
            </svg>
            {currentRangeOrders.length === 0 && (
              <span className="pointer-events-none absolute inset-x-0 top-1/2 text-center text-[10px] text-slate-400">
                Sales and order trends will appear when your store receives
                orders.
              </span>
            )}
          </div>
        </Panel>

        <Panel
          title="Top Selling Products"
          action={
            <button
              type="button"
              onClick={() => onNavigateTab("products")}
              className="text-[9px] font-semibold text-blue-600"
            >
              View all →
            </button>
          }
          className="xl:col-span-5"
        >
          <div className="grid grid-cols-[20px_minmax(0,1fr)_52px_76px] gap-2 border-b border-slate-100 pb-1 text-[8px] font-semibold uppercase text-slate-400">
            <span>#</span>
            <span>Product</span>
            <span className="text-right">Units</span>
            <span className="text-right">Revenue</span>
          </div>
          <div className="divide-y divide-slate-100">
            {topProducts.map(({ product, quantity, revenue }, index) => (
              <div
                key={product.id}
                className="grid grid-cols-[20px_minmax(0,1fr)_52px_76px] items-center gap-2 py-1.5 text-[9px]"
              >
                <span className="text-slate-500">{index + 1}</span>
                <span className="flex min-w-0 items-center gap-1.5">
                  <img
                    src={product.images[0] || "/placeholder-product.png"}
                    alt=""
                    className="h-7 w-7 shrink-0 rounded border border-slate-100 object-cover"
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-slate-700">
                      {product.name}
                    </span>
                    <span className="block truncate text-[8px] text-slate-400">
                      {categories.find(
                        (category) => category.id === product.categoryId,
                      )?.name || "Product"}
                    </span>
                  </span>
                </span>
                <span className="text-right text-slate-600">{quantity}</span>
                <span className="truncate text-right font-medium text-slate-700">
                  {formatKSh(revenue)}
                </span>
              </div>
            ))}
            {topProducts.length === 0 && (
              <p className="py-8 text-center text-[10px] text-slate-400">
                Add a product to start building your catalogue.
              </p>
            )}
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
        <Panel title="Order Status">
          <StatusDonut items={statusCounts} total={sellerSubOrders.length} />
        </Panel>
        <Panel
          title="Revenue Trend"
          action={
            <span className="text-[9px] font-semibold text-emerald-600">
              Gross product sales
            </span>
          }
        >
          <div className="flex h-[108px] items-end gap-2 border-b border-slate-100 px-1">
            {revenueMonths.map((month) => (
              <div
                key={`${month.label}-${month.sales}`}
                className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
              >
                {month.sales > 0 && (
                  <span className="max-w-full truncate text-[8px] text-slate-400">
                    {formatKSh(month.sales)}
                  </span>
                )}
                <div
                  className="w-full max-w-7 rounded-t-sm bg-emerald-500"
                  style={{
                    height: `${month.sales ? Math.max(5, (month.sales / maxMonthRevenue) * 70) : 2}px`,
                  }}
                />
                <span className="text-[8px] text-slate-500">{month.label}</span>
              </div>
            ))}
          </div>
          {sellerSubOrders.length === 0 && (
            <p className="pt-2 text-center text-[9px] text-slate-400">
              Monthly revenue will appear after your first order.
            </p>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-12">
        <Panel
          title="Recent Orders"
          action={
            <button
              type="button"
              onClick={() => onNavigateTab("orders")}
              className="text-[9px] font-semibold text-blue-600"
            >
              View all →
            </button>
          }
          className="xl:col-span-7"
        >
          <div className="grid grid-cols-[minmax(0,1fr)_38px_72px_68px] gap-2 border-b border-slate-100 pb-1 text-[8px] font-semibold uppercase text-slate-400">
            <span>Customer</span>
            <span className="text-right">Items</span>
            <span className="text-right">Total</span>
            <span className="text-right">Status</span>
          </div>
          <div className="divide-y divide-slate-100">
            {recentOrders.map(({ subOrder, masterOrder }) => (
              <div
                key={subOrder.id}
                className="grid grid-cols-[minmax(0,1fr)_38px_72px_68px] items-center gap-2 py-2 text-[9px]"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-slate-700">
                    {masterOrder?.customerName || "Customer"}
                  </span>
                  <span className="block truncate text-[8px] text-slate-400">
                    {subOrder.subOrderNumber}
                  </span>
                </span>
                <span className="text-right text-slate-600">
                  {subOrder.items.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
                <span className="truncate text-right text-slate-600">
                  {formatKSh(subOrder.subtotal)}
                </span>
                <span
                  className={`truncate rounded-full px-1.5 py-0.5 text-center text-[8px] font-medium capitalize ${statusTone(subOrder.status)}`}
                >
                  {subOrder.status.replaceAll("_", " ")}
                </span>
              </div>
            ))}
            {recentOrders.length === 0 && (
              <p className="py-7 text-center text-[10px] text-slate-400">
                No orders yet. New customer orders will appear here.
              </p>
            )}
          </div>
        </Panel>

        <Panel
          title="Payouts"
          action={
            <button
              type="button"
              onClick={() => onNavigateTab("payouts")}
              className="text-[9px] font-semibold text-blue-600"
            >
              View all →
            </button>
          }
          className="xl:col-span-5"
        >
          <div className="grid grid-cols-[1fr_76px_72px] gap-2 border-b border-slate-100 pb-1 text-[8px] font-semibold uppercase text-slate-400">
            <span>Date</span>
            <span className="text-right">Amount</span>
            <span className="text-right">Status</span>
          </div>
          <div className="divide-y divide-slate-100">
            {sellerPayouts.slice(0, 4).map((payout) => (
              <div
                key={payout.id}
                className="grid grid-cols-[1fr_76px_72px] items-center gap-2 py-2 text-[9px]"
              >
                <span className="min-w-0">
                  <span className="block text-slate-600">
                    {new Intl.DateTimeFormat("en-KE", {
                      day: "numeric",
                      month: "short",
                    }).format(new Date(payout.createdAt))}
                  </span>
                  <span className="block truncate text-[8px] text-slate-400">
                    {payout.payoutNumber}
                  </span>
                </span>
                <span className="text-right text-slate-600">
                  {formatKSh(payout.amount)}
                </span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-center text-[8px] capitalize ${payoutTone(payout.status)}`}
                >
                  {payout.status}
                </span>
              </div>
            ))}
            {sellerPayouts.length === 0 && (
              <p className="py-7 text-center text-[10px] text-slate-400">
                Payout history will appear here.
              </p>
            )}
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-12">
        <Panel
          title="Inventory Alerts"
          action={
            <button
              type="button"
              onClick={() => onNavigateTab("inventory")}
              className="text-[9px] font-semibold text-blue-600"
            >
              View all →
            </button>
          }
          className="xl:col-span-5"
        >
          <div className="grid grid-cols-[minmax(0,1fr)_54px_70px] gap-2 border-b border-slate-100 pb-1 text-[8px] font-semibold uppercase text-slate-400">
            <span>Product</span>
            <span className="text-right">Stock</span>
            <span className="text-right">Status</span>
          </div>
          <div className="divide-y divide-slate-100">
            {lowStockProducts.map((product) => (
              <div
                key={product.id}
                className="grid grid-cols-[minmax(0,1fr)_54px_70px] items-center gap-2 py-1.5 text-[9px]"
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <img
                    src={product.images[0] || "/placeholder-product.png"}
                    alt=""
                    className="h-6 w-6 shrink-0 rounded border border-slate-100 object-cover"
                  />
                  <span className="truncate text-slate-700">
                    {product.name}
                  </span>
                </span>
                <span className="text-right text-slate-600">
                  {product.stock}
                </span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-center text-[8px] ${stockTone(product.stock)}`}
                >
                  {product.stock === 0 ? "Out of stock" : "Low stock"}
                </span>
              </div>
            ))}
            {lowStockProducts.length === 0 && (
              <p className="py-7 text-center text-[10px] text-slate-400">
                No low-stock products. Your inventory is looking good.
              </p>
            )}
          </div>
        </Panel>

        <div className="grid gap-2.5 xl:col-span-7">
          <section className="relative flex min-h-[104px] items-center overflow-hidden rounded-md border border-slate-200 bg-gradient-to-r from-blue-50 via-white to-indigo-50 p-4">
            <span className="mr-4 grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-blue-100 text-blue-600">
              <Store size={27} />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-[13px] font-bold text-slate-800">
                Grow Your Sales
              </h3>
              <p className="mt-1 max-w-md text-[10px] leading-4 text-slate-500">
                Keep your catalogue current and stock popular products to help
                more customers find your store.
              </p>
              <button
                type="button"
                onClick={() => onNavigateTab("products")}
                className="mt-2 inline-flex items-center gap-1 rounded bg-blue-600 px-2.5 py-1.5 text-[9px] font-semibold text-white hover:bg-blue-700"
              >
                Manage products <Sparkles size={11} />
              </button>
            </div>
          </section>
          <section className="flex items-start gap-2 rounded-md border border-blue-100 bg-blue-50/70 px-3 py-2.5">
            <BadgeCheck size={15} className="mt-0.5 shrink-0 text-blue-600" />
            <div>
              <h3 className="text-[10px] font-bold text-slate-700">
                Quick Tip
              </h3>
              <p className="mt-0.5 text-[9px] leading-4 text-slate-500">
                {quickTip}
              </p>
            </div>
            {lowStockProducts.length === 0 && (
              <CheckCircle2
                size={14}
                className="ml-auto mt-0.5 shrink-0 text-emerald-600"
              />
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
