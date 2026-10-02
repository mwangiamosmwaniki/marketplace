import { useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  Package,
  RotateCcw,
  ShoppingBag,
  Store,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { useApp } from "../../context/AppContext";

type DashboardRange = "7D" | "30D" | "3M" | "12M";

const rangeDays: Record<DashboardRange, number> = {
  "7D": 7,
  "30D": 30,
  "3M": 90,
  "12M": 365,
};
const bucketCounts: Record<DashboardRange, number> = {
  "7D": 7,
  "30D": 8,
  "3M": 12,
  "12M": 12,
};

const chartColors = ["#e5484d", "#3984f5", "#a348ef", "#e9a323"];
const categoryColors = [
  "#e5484d",
  "#e4a52e",
  "#32a878",
  "#4d88ed",
  "#9a68dc",
  "#74839d",
];

function makeLinePath(values: number[], width = 560, height = 154) {
  if (values.length === 0) return "";
  const max = Math.max(...values, 1);
  const points = values.map((value, index) => ({
    x: values.length === 1 ? width / 2 : (index / (values.length - 1)) * width,
    y: height - 8 - (value / max) * (height - 20),
  }));

  return points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const previous = points[index - 1];
    const middle = (previous.x + point.x) / 2;
    return `${path} C ${middle} ${previous.y}, ${middle} ${point.y}, ${point.x} ${point.y}`;
  }, "");
}

function percentChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? "0.0%" : "New";
  const percent = ((current - previous) / previous) * 100;
  return `${percent > 0 ? "+" : ""}${percent.toFixed(1)}%`;
}

function relativeTime(value: string) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "Recently";
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function donutGradient(values: Array<{ value: number; color: string }>) {
  const total = values.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) return "conic-gradient(#e8edf3 0deg 360deg)";

  let cursor = 0;
  const segments = values.map(({ value, color }) => {
    const start = cursor;
    cursor += (value / total) * 360;
    return `${color} ${start}deg ${cursor}deg`;
  });
  return `conic-gradient(${segments.join(", ")})`;
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

function Donut({
  items,
  total,
  centerLabel,
}: Readonly<{
  items: Array<{ label: string; value: number; color: string }>;
  total: number;
  centerLabel: string;
}>) {
  const entries = items.filter((item) => item.value > 0);
  const sum = entries.reduce((value, item) => value + item.value, 0);

  return (
    <div className="flex min-h-[110px] items-center gap-4">
      <div
        className="relative grid h-[92px] w-[92px] shrink-0 place-items-center rounded-full"
        style={{ background: donutGradient(entries) }}
        role="img"
        aria-label={`${centerLabel}: ${total}`}
      >
        <div className="grid h-[60px] w-[60px] place-content-center rounded-full bg-white text-center">
          <strong className="text-[14px] leading-4 text-slate-800">
            {total.toLocaleString()}
          </strong>
          <span className="text-[9px] text-slate-500">{centerLabel}</span>
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between gap-2 text-[10px]"
          >
            <span className="flex min-w-0 items-center gap-1.5 text-slate-600">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="truncate">{item.label}</span>
            </span>
            <span className="shrink-0 font-semibold text-slate-700">
              {sum ? `${((item.value / sum) * 100).toFixed(1)}%` : "0%"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminOverview({
  onNavigateTab,
}: Readonly<{
  onNavigateTab?: (tab: "catalog" | "audit") => void;
}>) {
  const {
    authUser,
    auditLogs,
    categories,
    formatKSh,
    ledger,
    orders,
    payouts,
    products,
    returns,
    sellers,
  } = useApp();
  const [range, setRange] = useState<DashboardRange>("30D");

  const now = new Date();
  const rangeStart = new Date(now.getTime() - rangeDays[range] * 86_400_000);
  const previousStart = new Date(
    rangeStart.getTime() - rangeDays[range] * 86_400_000,
  );
  const inPeriod = (date: string, start: Date, end: Date) => {
    const time = new Date(date).getTime();
    return (
      Number.isFinite(time) && time >= start.getTime() && time < end.getTime()
    );
  };

  const currentOrders = orders.filter((order) =>
    inPeriod(order.createdAt, rangeStart, now),
  );
  const previousOrders = orders.filter((order) =>
    inPeriod(order.createdAt, previousStart, rangeStart),
  );
  const currentGMV = currentOrders
    .filter((order) => order.status !== "cancelled")
    .reduce((sum, order) => sum + order.grandTotal, 0);
  const previousGMV = previousOrders
    .filter((order) => order.status !== "cancelled")
    .reduce((sum, order) => sum + order.grandTotal, 0);
  const paidOrders = currentOrders.filter(
    (order) => order.paymentStatus === "paid",
  );
  const previousPaidOrders = previousOrders.filter(
    (order) => order.paymentStatus === "paid",
  );
  const currentNetSales = paidOrders.reduce(
    (sum, order) => sum + order.grandTotal,
    0,
  );
  const previousNetSales = previousPaidOrders.reduce(
    (sum, order) => sum + order.grandTotal,
    0,
  );
  const currentCommission = paidOrders.reduce(
    (sum, order) =>
      sum +
      order.sellerSubOrders.reduce(
        (subtotal, item) => subtotal + item.commissionTotal,
        0,
      ),
    0,
  );
  const previousCommission = previousPaidOrders.reduce(
    (sum, order) =>
      sum +
      order.sellerSubOrders.reduce(
        (subtotal, item) => subtotal + item.commissionTotal,
        0,
      ),
    0,
  );

  const buyerCount = new Set(currentOrders.map((order) => order.customerId))
    .size;
  const previousBuyerCount = new Set(
    previousOrders.map((order) => order.customerId),
  ).size;
  const activeSellers = sellers.filter(
    (seller) => seller.status === "approved",
  );
  const createdSellers = activeSellers.filter((seller) =>
    inPeriod(seller.createdAt, rangeStart, now),
  ).length;
  const previousSellers = activeSellers.filter((seller) =>
    inPeriod(seller.createdAt, previousStart, rangeStart),
  ).length;

  const bucketCount = bucketCounts[range];
  const chartLabels = Array.from({ length: bucketCount }, (_, index) => {
    const bucketTime =
      rangeStart.getTime() +
      ((index + 0.5) / bucketCount) * (now.getTime() - rangeStart.getTime());
    return new Intl.DateTimeFormat("en-KE", {
      day: "numeric",
      month: "short",
    }).format(new Date(bucketTime));
  });
  const chartSeries = [
    {
      label: "GMV",
      color: chartColors[0],
      values: Array.from({ length: bucketCount }, () => 0),
    },
    {
      label: "Net sales",
      color: chartColors[1],
      values: Array.from({ length: bucketCount }, () => 0),
    },
    {
      label: "Platform revenue",
      color: chartColors[2],
      values: Array.from({ length: bucketCount }, () => 0),
    },
    {
      label: "Orders",
      color: chartColors[3],
      values: Array.from({ length: bucketCount }, () => 0),
    },
  ];

  for (const order of currentOrders) {
    const index = Math.min(
      bucketCount - 1,
      Math.floor(
        ((new Date(order.createdAt).getTime() - rangeStart.getTime()) /
          (now.getTime() - rangeStart.getTime())) *
          bucketCount,
      ),
    );
    if (!Number.isInteger(index) || index < 0) continue;
    chartSeries[3].values[index] += 1;
    if (order.status !== "cancelled")
      chartSeries[0].values[index] += order.grandTotal;
    if (order.paymentStatus === "paid") {
      chartSeries[1].values[index] += order.grandTotal;
      chartSeries[2].values[index] += order.sellerSubOrders.reduce(
        (sum, item) => sum + item.commissionTotal,
        0,
      );
    }
  }

  const metrics = [
    {
      label: "GMV",
      value: formatKSh(currentGMV),
      change: percentChange(currentGMV, previousGMV),
      trend: chartSeries[0].values,
      icon: <DollarSign size={15} />,
      iconClass: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Net Sales",
      value: formatKSh(currentNetSales),
      change: percentChange(currentNetSales, previousNetSales),
      trend: chartSeries[1].values,
      icon: <CreditCard size={15} />,
      iconClass: "bg-blue-50 text-blue-600",
    },
    {
      label: "Total Orders",
      value: currentOrders.length.toLocaleString(),
      change: percentChange(currentOrders.length, previousOrders.length),
      trend: chartSeries[3].values,
      icon: <ShoppingBag size={15} />,
      iconClass: "bg-violet-50 text-violet-600",
    },
    {
      label: "Active Customers",
      value: buyerCount.toLocaleString(),
      change: percentChange(buyerCount, previousBuyerCount),
      trend: chartSeries[3].values,
      icon: <Users size={15} />,
      iconClass: "bg-green-50 text-green-600",
    },
    {
      label: "Active Sellers",
      value: activeSellers.length.toLocaleString(),
      change: percentChange(createdSellers, previousSellers),
      trend: chartSeries[3].values,
      icon: <Store size={15} />,
      iconClass: "bg-orange-50 text-orange-600",
    },
    {
      label: "Platform Revenue",
      value: formatKSh(currentCommission),
      change: percentChange(currentCommission, previousCommission),
      trend: chartSeries[2].values,
      icon: <Wallet size={15} />,
      iconClass: "bg-rose-50 text-rose-600",
    },
  ];

  const salesByCategory = categories
    .map((category) => {
      const productIds = new Set(
        products
          .filter((product) => product.categoryId === category.id)
          .map((product) => product.id),
      );
      const revenue = paidOrders
        .flatMap((order) => order.sellerSubOrders)
        .flatMap((subOrder) => subOrder.items)
        .filter((item) => productIds.has(item.productId))
        .reduce((sum, item) => sum + item.subtotal, 0);
      return { name: category.name, revenue };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6);
  const maxCategoryRevenue = Math.max(
    ...salesByCategory.map((category) => category.revenue),
    1,
  );

  const paymentMethods = [
    {
      label: "M-Pesa",
      value: currentOrders.filter(
        (order) => order.paymentMethod === "mpesa_stk",
      ).length,
      color: "#e5484d",
    },
    {
      label: "Card",
      value: currentOrders.filter((order) => order.paymentMethod === "card")
        .length,
      color: "#3984f5",
    },
    {
      label: "Bank transfer",
      value: currentOrders.filter(
        (order) => order.paymentMethod === "bank_transfer",
      ).length,
      color: "#e9a323",
    },
    {
      label: "Cash on delivery",
      value: currentOrders.filter(
        (order) => order.paymentMethod === "cash_on_delivery",
      ).length,
      color: "#32a878",
    },
  ];
  const orderStatuses = [
    {
      label: "Delivered",
      value: orders.filter((order) => order.status === "delivered").length,
      color: "#32a878",
    },
    {
      label: "Processing",
      value: orders.filter((order) =>
        ["confirmed", "processing", "ready_for_dispatch"].includes(
          order.status,
        ),
      ).length,
      color: "#3984f5",
    },
    {
      label: "Dispatched",
      value: orders.filter((order) =>
        ["dispatched", "out_for_delivery"].includes(order.status),
      ).length,
      color: "#e9a323",
    },
    {
      label: "Pending",
      value: orders.filter((order) => order.status === "pending").length,
      color: "#a348ef",
    },
    {
      label: "Cancelled / returned",
      value: orders.filter((order) =>
        ["cancelled", "returned", "refunded", "return_requested"].includes(
          order.status,
        ),
      ).length,
      color: "#e5484d",
    },
  ];

  const healthLeft = [
    { label: "Active sellers", value: activeSellers.length, color: "#32a878" },
    {
      label: "Pending verification",
      value: sellers.filter((seller) =>
        ["pending", "under_review"].includes(seller.status),
      ).length,
      color: "#e9a323",
    },
    {
      label: "Suspended",
      value: sellers.filter((seller) => seller.status === "suspended").length,
      color: "#e5484d",
    },
    { label: "New this period", value: createdSellers, color: "#3984f5" },
  ];
  const healthRight = [
    { label: "Pending", value: orderStatuses[3].value, color: "#e9a323" },
    { label: "Processing", value: orderStatuses[1].value, color: "#3984f5" },
    { label: "Dispatched", value: orderStatuses[2].value, color: "#a348ef" },
    { label: "Delivered", value: orderStatuses[0].value, color: "#32a878" },
  ];

  const recentActivity = useMemo(
    () =>
      [
        ...auditLogs.map((log) => ({
          id: `audit-${log.id}`,
          title: log.action.replaceAll("_", " ").toLowerCase(),
          detail: `${log.userName} · ${log.entity}`,
          timestamp: log.timestamp,
          icon: "audit",
        })),
        ...orders.map((order) => ({
          id: `order-${order.id}`,
          title: `Order ${order.orderNumber} ${order.status.replaceAll("_", " ")}`,
          detail: `${order.customerName} · ${formatKSh(order.grandTotal)}`,
          timestamp: order.createdAt,
          icon: "order",
        })),
      ]
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        )
        .slice(0, 5),
    [auditLogs, orders, formatKSh],
  );

  const paidTotal = orders
    .filter((order) => order.paymentStatus === "paid")
    .reduce((sum, order) => sum + order.grandTotal, 0);
  const sellerPayable = orders
    .flatMap((order) => order.sellerSubOrders)
    .reduce((sum, item) => sum + item.sellerNetTotal, 0);
  const processedPayouts = payouts
    .filter((payout) => payout.status === "processed")
    .reduce((sum, payout) => sum + payout.amount, 0);

  const alerts = [
    {
      label: "Seller verification queue",
      detail: "Applications awaiting review",
      count: sellers.filter((seller) =>
        ["pending", "under_review"].includes(seller.status),
      ).length,
      color: "text-amber-600",
      icon: <Clock size={13} />,
    },
    {
      label: "Payout approvals",
      detail: "Requests awaiting approval",
      count: payouts.filter((payout) => payout.status === "pending").length,
      color: "text-orange-600",
      icon: <Wallet size={13} />,
    },
    {
      label: "Failed payments",
      detail: "Orders needing payment review",
      count: orders.filter((order) => order.paymentStatus === "failed").length,
      color: "text-rose-600",
      icon: <AlertTriangle size={13} />,
    },
    {
      label: "Low stock products",
      detail: "Active listings with 5 units or fewer",
      count: products.filter(
        (product) =>
          product.status === "active" &&
          product.stock > 0 &&
          product.stock <= 5,
      ).length,
      color: "text-blue-600",
      icon: <Package size={13} />,
    },
    {
      label: "Open return requests",
      detail: "Returns requiring attention",
      count: returns.filter((item) =>
        ["pending_review", "approved", "item_received"].includes(item.status),
      ).length,
      color: "text-violet-600",
      icon: <RotateCcw size={13} />,
    },
  ];
  const alertCount = alerts.reduce((sum, alert) => sum + alert.count, 0);
  const dateLabel = new Intl.DateTimeFormat("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(now);
  const greetingName = authUser?.role?.includes("admin")
    ? "Admin"
    : authUser?.name.split(" ")[0] || "Admin";

  return (
    <div className="space-y-2.5 text-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-0.5">
        <div>
          <p className="text-[10px] text-slate-500">
            Here&apos;s what&apos;s happening in your marketplace today.
          </p>
          <h2 className="text-[17px] font-bold leading-6 text-slate-900">
            Good morning, {greetingName}
          </h2>
        </div>
        <div
          role="group"
          aria-label="Dashboard date range"
          className="flex h-9 shrink-0 items-center gap-2.5 rounded-md border border-slate-300 bg-white px-3 text-[11px] leading-none text-slate-700 shadow-sm"
        >
          <CalendarDays className="h-3.5 w-3.5 shrink-0 text-slate-500" />
          <select
            aria-label="Dashboard date range"
            value={range}
            onChange={(event) => setRange(event.target.value as DashboardRange)}
            className="h-4 appearance-none bg-transparent py-0 text-[11px] font-semibold leading-none outline-none"
          >
            <option value="7D">Last 7 days</option>
            <option value="30D">Last 30 days</option>
            <option value="3M">Last 3 months</option>
            <option value="12M">Last 12 months</option>
          </select>
          <ChevronDown className="h-3 w-3 shrink-0 text-slate-500" />
          <span className="hidden items-center text-[11px] leading-none text-slate-500 sm:inline-flex">
            · {dateLabel}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {metrics.map((metric) => {
          const positive = !metric.change.startsWith("-");
          return (
            <section
              key={metric.label}
              className="min-w-0 rounded-md border border-slate-200 bg-white p-2.5 shadow-sm"
            >
              <div className="flex items-center gap-1.5 text-[9px] font-medium text-slate-500">
                <span
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-md ${metric.iconClass}`}
                >
                  {metric.icon}
                </span>
                <span className="truncate">{metric.label}</span>
              </div>
              <div className="mt-1.5 truncate text-[17px] font-bold leading-5 text-slate-800">
                {metric.value}
              </div>
              <div className="mt-1 flex items-center justify-between gap-1">
                <span
                  className={`flex min-w-0 items-center gap-0.5 text-[9px] font-semibold ${positive ? "text-emerald-600" : "text-rose-600"}`}
                >
                  {positive ? (
                    <ArrowUpRight size={11} />
                  ) : (
                    <ArrowDownRight size={11} />
                  )}
                  {metric.change}
                </span>
                <svg
                  viewBox="0 0 72 22"
                  className="h-5 w-[64px] shrink-0"
                  aria-hidden="true"
                >
                  <path
                    d={makeLinePath(metric.trend, 72, 18)}
                    fill="none"
                    stroke={positive ? "#35b887" : "#ef6268"}
                    strokeWidth="1.7"
                  />
                </svg>
              </div>
              <p className="mt-0.5 truncate text-[8px] text-slate-400">
                vs previous period
              </p>
            </section>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-12">
        <Panel title="Revenue & GMV Trend" className="xl:col-span-8">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 text-[9px] text-slate-500">
              {chartSeries.map((series) => (
                <span key={series.label} className="flex items-center gap-1">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: series.color }}
                  />
                  {series.label}
                </span>
              ))}
            </div>
            <div className="flex rounded bg-slate-100 p-0.5">
              {(["7D", "30D", "3M", "12M"] as DashboardRange[]).map(
                (option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setRange(option)}
                    aria-label={`${option} trend period`}
                    aria-pressed={range === option}
                    className={`rounded px-2 py-0.5 text-[9px] ${range === option ? "bg-rose-600 font-bold text-white" : "text-slate-500 hover:text-slate-800"}`}
                  >
                    {option}
                  </button>
                ),
              )}
            </div>
          </div>
          <div className="relative h-[176px] w-full">
            <svg
              viewBox="0 0 620 190"
              className="h-full w-full"
              role="img"
              aria-label={`GMV, net sales, platform revenue, and order trends for the last ${range}`}
            >
              {[24, 62, 100, 138].map((y, index) => (
                <g key={y}>
                  <line
                    x1="44"
                    y1={y}
                    x2="610"
                    y2={y}
                    stroke="#edf0f4"
                    strokeWidth="1"
                  />
                  <text
                    x="37"
                    y={y + 3}
                    fill="#9aa3b2"
                    fontSize="8"
                    textAnchor="end"
                  >
                    {100 - index * 25}%
                  </text>
                </g>
              ))}
              {currentOrders.length > 0 &&
                chartSeries.map((series) => (
                  <path
                    key={series.label}
                    d={makeLinePath(series.values, 556, 125)}
                    transform="translate(48 20)"
                    fill="none"
                    stroke={series.color}
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                ))}
              {chartLabels.map((label, index) => (
                <text
                  key={`${label}-${index}`}
                  x={48 + (index / Math.max(chartLabels.length - 1, 1)) * 556}
                  y="174"
                  fill="#8993a2"
                  fontSize="8"
                  textAnchor="middle"
                >
                  {label}
                </text>
              ))}
            </svg>
            {currentOrders.length === 0 && (
              <span className="pointer-events-none absolute inset-x-0 top-1/2 text-center text-[10px] text-slate-400">
                No transactions in this period
              </span>
            )}
          </div>
        </Panel>

        <Panel
          title="Sales by Category"
          action={
            <button
              type="button"
              className="text-[9px] font-semibold text-blue-600"
              onClick={() => onNavigateTab?.("catalog")}
            >
              View all →
            </button>
          }
          className="xl:col-span-4"
        >
          <div className="space-y-2.5 pt-0.5">
            {salesByCategory.map((category, index) => (
              <div
                key={category.name}
                className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-2 gap-y-1"
              >
                <div className="flex min-w-0 items-center gap-1.5 text-[10px]">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-slate-50 text-slate-500">
                    <Package size={12} />
                  </span>
                  <span className="truncate font-medium text-slate-700">
                    {category.name}
                  </span>
                </div>
                <span className="text-[9px] text-slate-500">
                  {formatKSh(category.revenue)}
                </span>
                <div className="col-span-2 h-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${category.revenue ? Math.max(3, (category.revenue / maxCategoryRevenue) * 100) : 0}%`,
                      backgroundColor:
                        categoryColors[index % categoryColors.length],
                    }}
                  />
                </div>
              </div>
            ))}
            {salesByCategory.length === 0 && (
              <p className="py-8 text-center text-[10px] text-slate-400">
                Category sales will appear when products and orders are
                available.
              </p>
            )}
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-3">
        <Panel title="Payment Method Distribution">
          <Donut
            items={paymentMethods}
            total={currentOrders.length}
            centerLabel="Orders"
          />
        </Panel>
        <Panel title="Order Status Distribution">
          <Donut
            items={orderStatuses}
            total={orders.length}
            centerLabel="All orders"
          />
        </Panel>
        <Panel title="Marketplace Health">
          <div className="grid grid-cols-2 gap-3 pt-1">
            {[
              { title: "SELLER HEALTH", items: healthLeft },
              { title: "ORDER HEALTH", items: healthRight },
            ].map((group) => (
              <div key={group.title}>
                <h4 className="mb-2 text-[8px] font-bold text-slate-500">
                  {group.title}
                </h4>
                <div className="space-y-2">
                  {group.items.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between gap-1 text-[9px]"
                    >
                      <span className="flex min-w-0 items-center gap-1.5 text-slate-600">
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        {item.label}
                      </span>
                      <span className="font-bold text-slate-700">
                        {item.value.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-3">
        <Panel
          title="Recent Activity"
          action={
            <button
              type="button"
              className="text-[9px] text-blue-600"
              onClick={() => onNavigateTab?.("audit")}
            >
              View all →
            </button>
          }
        >
          <div className="divide-y divide-slate-100">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center gap-2 py-2 first:pt-1 last:pb-1"
              >
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${activity.icon === "audit" ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"}`}
                >
                  {activity.icon === "audit" ? (
                    <CheckCircle2 size={12} />
                  ) : (
                    <ShoppingBag size={12} />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[10px] font-semibold capitalize text-slate-700">
                    {activity.title}
                  </p>
                  <p className="truncate text-[9px] text-slate-400">
                    {activity.detail}
                  </p>
                </div>
                <time className="shrink-0 text-[8px] text-slate-400">
                  {relativeTime(activity.timestamp)}
                </time>
              </div>
            ))}
            {recentActivity.length === 0 && (
              <p className="py-8 text-center text-[10px] text-slate-400">
                No recent activity recorded.
              </p>
            )}
          </div>
        </Panel>

        <Panel
          title="Financial Overview"
          action={
            <span className="text-[9px] font-semibold text-blue-600">
              Current balances
            </span>
          }
        >
          <div className="divide-y divide-slate-100">
            {[
              {
                label: "Payments collected",
                value: formatKSh(paidTotal),
                icon: <CreditCard size={12} />,
                color: "text-blue-600",
              },
              {
                label: "Platform commission",
                value: formatKSh(currentCommission),
                icon: <DollarSign size={12} />,
                color: "text-emerald-600",
              },
              {
                label: "Seller payable",
                value: formatKSh(sellerPayable),
                icon: <Store size={12} />,
                color: "text-violet-600",
              },
              {
                label: "Payouts disbursed",
                value: formatKSh(processedPayouts),
                icon: <Wallet size={12} />,
                color: "text-orange-600",
              },
              {
                label: "Ledger entries",
                value: ledger.length.toLocaleString(),
                icon: <TrendingUp size={12} />,
                color: "text-rose-600",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between gap-2 py-2 first:pt-1 last:pb-1 text-[10px]"
              >
                <span
                  className={`flex items-center gap-1.5 text-slate-600 ${item.color}`}
                >
                  {item.icon}
                  <span className="text-slate-600">{item.label}</span>
                </span>
                <span className="font-bold text-slate-700">{item.value}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          title="Recent Alerts"
          action={
            <span
              className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${alertCount ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-700"}`}
            >
              {alertCount} open
            </span>
          }
        >
          <div className="divide-y divide-slate-100">
            {alerts
              .filter((alert) => alert.count > 0)
              .map((alert) => (
                <div
                  key={alert.label}
                  className="flex items-center gap-2 py-2 first:pt-1 last:pb-1"
                >
                  <span
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-50 ${alert.color}`}
                  >
                    {alert.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10px] font-semibold text-slate-700">
                      {alert.label}
                    </p>
                    <p className="truncate text-[9px] text-slate-400">
                      {alert.detail}
                    </p>
                  </div>
                  <span className="min-w-5 text-right text-[10px] font-bold text-slate-700">
                    {alert.count}
                  </span>
                </div>
              ))}
            {alertCount === 0 && (
              <div className="flex items-center gap-2 py-6 text-[10px] text-emerald-700">
                <CheckCircle2 size={15} />
                No outstanding alerts.
              </div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
