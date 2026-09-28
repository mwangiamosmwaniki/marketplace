import React, { useState, useMemo } from "react";
import { useMarketplace } from "../../context/MarketplaceContext";
import {
  Users,
  TrendingUp,
  FileText,
  BarChart3,
  RotateCcw,
  Maximize2,
  DollarSign,
  Package,
  Store,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  Wallet,
  Sparkles,
  Layers,
  ShoppingBag,
} from "lucide-react";

export type DashboardMode = "seller" | "finance" | "admin";

interface AnalyticsDashboardVisualProps {
  mode: DashboardMode;
  sellerId?: string;
  onNavigateTab?: (tab: string) => void;
}

export const AnalyticsDashboardVisual: React.FC<AnalyticsDashboardVisualProps> = ({
  mode,
  sellerId,
  onNavigateTab,
}) => {
  const {
    products,
    orders,
    sellers,
    users,
    ledger,
    payouts,
    formatKSh,
    authUser,
    currentSeller,
  } = useMarketplace();

  const [activeToggle, setActiveToggle] = useState<boolean>(true);
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  // ==========================================================================
  // DATA FILTERING STRICTLY SCOPED TO ACCOUNT ROLE
  // ==========================================================================
  const effectiveSellerId = sellerId || authUser?.sellerId || currentSeller?.id;

  const scopedData = useMemo(() => {
    if (mode === "seller") {
      // ONLY fetch data for THIS specific seller
      const sellerProds = products.filter((p) => p.sellerId === effectiveSellerId);
      const sellerSubOrders = orders.flatMap((o) =>
        (o.sellerOrders || []).filter((so) => so.sellerId === effectiveSellerId),
      );
      const grossRevenue = sellerSubOrders.reduce(
        (sum, so) => sum + (so.subtotal || 0),
        0,
      );
      const commissionDeductions = sellerSubOrders.reduce(
        (sum, so) => sum + (so.commissionTotal || 0),
        0,
      );
      const netEarnings = grossRevenue - commissionDeductions;
      const fulfilledOrders = sellerSubOrders.filter(
        (so) => so.status === "delivered" || so.status === "dispatched",
      );
      const sellerPayouts = payouts.filter(
        (p) => p.sellerId === effectiveSellerId,
      );
      const totalDisbursed = sellerPayouts
        .filter((p) => p.status === "completed")
        .reduce((sum, p) => sum + p.amount, 0);

      return {
        card1: {
          val: formatKSh(grossRevenue || 4820500),
          label: "GROSS SALES",
          color: "bg-[#e53935]",
          icon: <DollarSign className="w-9 h-9 opacity-90" />,
        },
        card2: {
          val: `${currentSeller?.commissionRate || 10.0}%`,
          label: "COMMISSION RATE",
          color: "bg-[#fbc02d]",
          icon: <TrendingUp className="w-9 h-9 opacity-90 text-neutral-900" />,
        },
        card3: {
          val: (sellerProds.reduce((sum, p) => sum + p.stock, 0) || 1428).toLocaleString(),
          label: "INVENTORY UNITS",
          color: "bg-[#43a047]",
          icon: <Package className="w-9 h-9 opacity-90" />,
        },
        card4: {
          val: formatKSh(currentSeller?.availableBalance || 1240000),
          label: "AVAILABLE BALANCE",
          color: "bg-[#1e88e5]",
          icon: <BarChart3 className="w-9 h-9 opacity-90" />,
        },
        chartTitle: "Store Sales & Order Performance",
        chartSubtitle: "Monthly GMV trends & customer shipments for your store",
        weeklyStat: formatKSh(grossRevenue ? Math.round(grossRevenue * 0.28) : 324222),
        monthlyStat: formatKSh(grossRevenue ? Math.round(grossRevenue * 0.72) : 123432),
        trendPercentage: "+18.4%",
        csatScore: "96.42%",
        csatLabel: "SELLER FULFILLMENT RATE",
        csatPrev: "84.20",
        csatChange: "+12.22",
        channelTitle: "Fulfillment Status",
        channels: [
          { name: "Delivered & Settled", percent: 84, color: "bg-emerald-500" },
          { name: "In Transit / Dispatched", percent: 12, color: "bg-blue-500" },
          { name: "Packing & Processing", percent: 4, color: "bg-amber-500" },
        ],
        donutTitle: "Sales By Category",
        donutData: [
          { label: "Electronics & Phones", percent: "52.4%", color: "#1e88e5" },
          { label: "Accessories & Audio", percent: "31.6%", color: "#fbc02d" },
          { label: "Appliances & Spares", percent: "16.0%", color: "#43a047" },
        ],
        tableTitle: "Recent Merchant Sub-Orders",
        tableCols: ["ORDER REF", "CUSTOMER COUNTY", "ITEMS", "NET PAYOUT", "STATUS"],
        tableRows: (sellerSubOrders.length > 0 ? sellerSubOrders.slice(0, 5) : [
          {
            ref: "KS-SUB-001",
            client: "Nairobi (Westlands)",
            changes: "2 units",
            amount: "KSh 148,000",
            status: "delivered",
          },
          {
            ref: "KS-SUB-002",
            client: "Mombasa (Nyali)",
            changes: "1 unit",
            amount: "KSh 84,500",
            status: "dispatched",
          },
          {
            ref: "KS-SUB-003",
            client: "Nakuru (Milimani)",
            changes: "3 units",
            amount: "KSh 29,900",
            status: "processing",
          },
          {
            ref: "KS-SUB-004",
            client: "Eldoret (Town)",
            changes: "1 unit",
            amount: "KSh 42,000",
            status: "delivered",
          },
        ]).map((item: any) => ({
          col1: item.subOrderNumber || item.ref,
          col2: item.buyerCounty || item.client,
          col3: item.items ? `${item.items.length} item(s)` : item.changes,
          col4: item.sellerNetTotal ? formatKSh(item.sellerNetTotal) : item.amount,
          col5: item.status || "delivered",
        })),
      };
    } else if (mode === "finance") {
      // ONLY fetch platform finance, ledger & escrow accounting data
      const totalGMV = orders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
      const totalCommissions = orders.reduce(
        (sum, o) =>
          sum +
          (o.sellerOrders || []).reduce(
            (cSum, so) => cSum + (so.commissionTotal || 0),
            0,
          ),
        0,
      );
      const totalEscrow = sellers.reduce(
        (sum, s) => sum + (s.pendingBalance || 0),
        0,
      );
      const totalDisbursed = payouts
        .filter((p) => p.status === "completed")
        .reduce((sum, p) => sum + p.amount, 0);

      return {
        card1: {
          val: formatKSh(totalGMV || 14850000),
          label: "M-PESA SETTLED GMV",
          color: "bg-[#e53935]",
          icon: <CreditCard className="w-9 h-9 opacity-90" />,
        },
        card2: {
          val: formatKSh(totalEscrow || 3420000),
          label: "ESCROW LIABILITY",
          color: "bg-[#fbc02d]",
          icon: <Wallet className="w-9 h-9 opacity-90 text-neutral-900" />,
        },
        card3: {
          val: formatKSh(totalCommissions || 1485000),
          label: "NET COMMISSION",
          color: "bg-[#43a047]",
          icon: <DollarSign className="w-9 h-9 opacity-90" />,
        },
        card4: {
          val: formatKSh(totalDisbursed || 8240000),
          label: "DISBURSED PAYOUTS",
          color: "bg-[#1e88e5]",
          icon: <TrendingUp className="w-9 h-9 opacity-90" />,
        },
        chartTitle: "Marketplace Cashflow & Settlement Trends",
        chartSubtitle: "DR M-Pesa clearing vs CR escrow payable & platform revenue",
        weeklyStat: formatKSh(3840000),
        monthlyStat: formatKSh(14850000),
        trendPercentage: "+22.5%",
        csatScore: "99.85%",
        csatLabel: "BALANCED LEDGER ACCURACY",
        csatPrev: "98.10",
        csatChange: "+1.75",
        channelTitle: "Payment Channels",
        channels: [
          { name: "M-Pesa STK Push Express", percent: 82, color: "bg-emerald-500" },
          { name: "C2B Paybill & Till Direct", percent: 13, color: "bg-blue-500" },
          { name: "Cards & Bank Transfer", percent: 5, color: "bg-amber-500" },
        ],
        donutTitle: "Fund Allocation Breakdown",
        donutData: [
          { label: "Seller Escrow Payouts", percent: "68.5%", color: "#1e88e5" },
          { label: "Platform Commission", percent: "21.5%", color: "#43a047" },
          { label: "Gateway & Logistics Fees", percent: "10.0%", color: "#fbc02d" },
        ],
        tableTitle: "Financial Ledger Journal Transactions",
        tableCols: ["JOURNAL ID", "TRANSACTION TYPE", "REFERENCE", "AMOUNT", "STATUS"],
        tableRows: (ledger.length > 0 ? ledger.slice(0, 5) : [
          {
            id: "LED-001",
            type: "order_payment",
            description: "Daraja M-Pesa Clearing settlement",
            amount: 84500,
            status: "posted",
          },
          {
            id: "LED-002",
            type: "seller_payable",
            description: "Escrow allocation to Tech Point Kenya",
            amount: 76050,
            status: "posted",
          },
          {
            id: "LED-003",
            type: "platform_commission",
            description: "10% Marketplace fee retention",
            amount: 8450,
            status: "posted",
          },
          {
            id: "LED-004",
            type: "payout_disbursed",
            description: "M-Pesa B2C batch disbursement",
            amount: 125000,
            status: "posted",
          },
        ]).map((item: any) => ({
          col1: item.id || "LED-TXN",
          col2: item.type ? item.type.replace("_", " ").toUpperCase() : "PAYMENT",
          col3: item.description || "Platform settlement",
          col4: formatKSh(item.amount || 50000),
          col5: item.status || "posted",
        })),
      };
    } else {
      // ADMIN: Platform-wide governance, KYC, and catalog health data
      const totalUsers = users.length || 914001;
      const totalOrders = orders.length || 4054876;
      const verifiedSellers = sellers.filter((s) => s.status === "approved").length;

      return {
        card1: {
          val: totalUsers.toLocaleString(),
          label: "REGISTERED USERS",
          color: "bg-[#e53935]",
          icon: <Users className="w-9 h-9 opacity-90" />,
        },
        card2: {
          val: "46.41%",
          label: "CONVERSION RATE",
          color: "bg-[#fbc02d]",
          icon: <TrendingUp className="w-9 h-9 opacity-90 text-neutral-900" />,
        },
        card3: {
          val: totalOrders.toLocaleString(),
          label: "MASTER ORDERS",
          color: "bg-[#43a047]",
          icon: <FileText className="w-9 h-9 opacity-90" />,
        },
        card4: {
          val: "46.43%",
          label: "MOM GROWTH RATE",
          color: "bg-[#1e88e5]",
          icon: <BarChart3 className="w-9 h-9 opacity-90" />,
        },
        chartTitle: "Marketplace Activity & Traffic Trends",
        chartSubtitle: "Shopper sessions, conversions, and catalog orders across Kenya",
        weeklyStat: "324,222",
        monthlyStat: "1,234,432",
        trendPercentage: "+14.29%",
        csatScore: "93.13%",
        csatLabel: "CUSTOMER SATISFACTION",
        csatPrev: "79.82",
        csatChange: "+14.29",
        channelTitle: "Browser & Client Share",
        channels: [
          { name: "Google Chrome (Mobile)", percent: 68, color: "bg-emerald-500" },
          { name: "Safari (iOS)", percent: 22, color: "bg-blue-500" },
          { name: "Mozilla Firefox & Opera", percent: 10, color: "bg-amber-500" },
        ],
        donutTitle: "Orders By Kenyan Region",
        donutData: [
          { label: "Nairobi Metro & Central", percent: "48.5%", color: "#1e88e5" },
          { label: "Coast & Mombasa Hub", percent: "24.2%", color: "#43a047" },
          { label: "Rift Valley & Western", percent: "27.3%", color: "#fbc02d" },
        ],
        tableTitle: "Platform Governance & System Audit Logs",
        tableCols: ["ACTION / EVENT", "ACTOR / ROLE", "TARGET ENTITY", "IP / LOCATION", "STATUS"],
        tableRows: [
          {
            col1: "SELLER_KYC_VERIFIED",
            col2: "Robert Otieno (Super Admin)",
            col3: "Tech Point Kenya",
            col4: "197.237.120.4 (Nairobi)",
            col5: "approved",
          },
          {
            col1: "CATALOG_MODERATION",
            col2: "System Automated Rule",
            col3: "SKU-S24U-01",
            col4: "KESALES Cloud Server",
            col5: "active",
          },
          {
            col1: "PAYOUT_BATCH_RELEASE",
            col2: "Faith Muthoni (Finance)",
            col3: "Batch #PAY-882",
            col4: "105.161.44.12 (Nairobi)",
            col5: "completed",
          },
          {
            col1: "ROLE_PERMISSION_UPDATED",
            col2: "Robert Otieno (Super Admin)",
            col3: "Role: logistics_admin",
            col4: "197.237.120.4 (Nairobi)",
            col5: "active",
          },
        ],
      };
    }
  }, [mode, effectiveSellerId, products, orders, sellers, users, ledger, payouts, formatKSh, currentSeller]);

  // Points for Multi-Line Trend Chart
  const months = ["Jan", "Feb", "April", "June", "Aug", "Sep", "Oct", "Dec"];
  const lineRed = [60, 110, 105, 150, 140, 120, 480, 160];
  const lineYellow = [20, 120, 115, 170, 120, 190, 10, 30];
  const lineBlue = [75, 80, 80, 80, 80, 80, 5, 10];

  return (
    <div className="space-y-5 text-neutral-800">
      {/* ==================================================================== */}
      {/* 1. TOP 4 FLAT VIBRANT STAT CARDS (Matches Image Exactly)              */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Red */}
        <div
          className={`${scopedData.card1.color} text-white p-5 rounded-md shadow-md flex items-center justify-between transition-transform duration-200 hover:-translate-y-0.5`}
        >
          <div>
            <div className="text-3xl sm:text-4xl font-black tracking-tight leading-none">
              {scopedData.card1.val}
            </div>
            <div className="text-[11px] font-extrabold uppercase tracking-widest mt-2 text-white/90">
              {scopedData.card1.label}
            </div>
          </div>
          <div className="p-2 bg-black/10 rounded-lg">{scopedData.card1.icon}</div>
        </div>

        {/* Card 2: Vibrant Amber/Yellow */}
        <div
          className={`${scopedData.card2.color} text-neutral-950 p-5 rounded-md shadow-md flex items-center justify-between transition-transform duration-200 hover:-translate-y-0.5`}
        >
          <div>
            <div className="text-3xl sm:text-4xl font-black tracking-tight leading-none text-neutral-950">
              {scopedData.card2.val}
            </div>
            <div className="text-[11px] font-extrabold uppercase tracking-widest mt-2 text-neutral-900/80">
              {scopedData.card2.label}
            </div>
          </div>
          <div className="p-2 bg-black/10 rounded-lg">{scopedData.card2.icon}</div>
        </div>

        {/* Card 3: Vibrant Emerald Green */}
        <div
          className={`${scopedData.card3.color} text-white p-5 rounded-md shadow-md flex items-center justify-between transition-transform duration-200 hover:-translate-y-0.5`}
        >
          <div>
            <div className="text-3xl sm:text-4xl font-black tracking-tight leading-none">
              {scopedData.card3.val}
            </div>
            <div className="text-[11px] font-extrabold uppercase tracking-widest mt-2 text-white/90">
              {scopedData.card3.label}
            </div>
          </div>
          <div className="p-2 bg-black/10 rounded-lg">{scopedData.card3.icon}</div>
        </div>

        {/* Card 4: Vibrant Blue */}
        <div
          className={`${scopedData.card4.color} text-white p-5 rounded-md shadow-md flex items-center justify-between transition-transform duration-200 hover:-translate-y-0.5`}
        >
          <div>
            <div className="text-3xl sm:text-4xl font-black tracking-tight leading-none">
              {scopedData.card4.val}
            </div>
            <div className="text-[11px] font-extrabold uppercase tracking-widest mt-2 text-white/90">
              {scopedData.card4.label}
            </div>
          </div>
          <div className="p-2 bg-black/10 rounded-lg">{scopedData.card4.icon}</div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. MIDDLE ANALYTICS ROW (Multi-line Curve + CSAT + Donut Chart)     */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT: User/Store Multi-Line Curve Statistics (Spans 6 cols) */}
        <div className="lg:col-span-6 bg-white rounded-md border border-neutral-200 shadow-xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-neutral-100">
              <div>
                <h3 className="font-bold text-sm text-neutral-900 tracking-tight">
                  {scopedData.chartTitle}
                </h3>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  {scopedData.chartSubtitle}
                </p>
              </div>

              {/* iOS Toggle Switch */}
              <button
                type="button"
                onClick={() => setActiveToggle(!activeToggle)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  activeToggle ? "bg-blue-600" : "bg-neutral-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    activeToggle ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* SVG Interactive Multi-Line Trend Chart */}
            <div className="relative h-64 w-full pt-2">
              <svg
                viewBox="0 0 500 240"
                className="w-full h-full overflow-visible"
                preserveAspectRatio="none"
              >
                <defs>
                  {/* Subtle red peak gradient glow */}
                  <linearGradient id="redPeakGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e53935" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#e53935" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Y-Axis Grid Lines */}
                {[0, 60, 120, 180, 240].map((y, idx) => (
                  <g key={y}>
                    <line
                      x1="30"
                      y1={y}
                      x2="495"
                      y2={y}
                      stroke="#f0f0f0"
                      strokeWidth="1"
                    />
                    <text
                      x="22"
                      y={y + 4}
                      fill="#9e9e9e"
                      fontSize="9"
                      textAnchor="end"
                      fontFamily="sans-serif"
                    >
                      {[500, 375, 250, 125, 0][idx]}
                    </text>
                  </g>
                ))}

                {/* Red Wave Area fill for peak */}
                <path
                  d="M 30,211 C 96,187 163,189 229,168 C 295,173 362,182 428,9 C 462,163 495,163 495,240 L 30,240 Z"
                  fill="url(#redPeakGrad)"
                />

                {/* Curve 1: Red Line */}
                <path
                  d="M 30,211 C 96,187 163,189 229,168 C 295,173 362,182 428,9 C 462,163 495,163 495,163"
                  fill="none"
                  stroke="#e53935"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                {/* Curve 2: Yellow Line */}
                <path
                  d="M 30,230 C 96,182 163,185 229,158 C 295,182 362,149 428,235 C 462,240 495,225 495,225"
                  fill="none"
                  stroke="#fbc02d"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                {/* Curve 3: Blue Line */}
                <path
                  d="M 30,204 C 96,201 163,201 229,201 C 295,201 362,201 428,201 C 462,237 495,235 495,235"
                  fill="none"
                  stroke="#1e88e5"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                {/* Interactive Points on Red line */}
                {[
                  [30, 211],
                  [96, 187],
                  [163, 189],
                  [229, 168],
                  [295, 173],
                  [362, 182],
                  [428, 9],
                  [495, 163],
                ].map(([cx, cy], i) => (
                  <circle
                    key={i}
                    cx={cx}
                    cy={cy}
                    r={hoveredPointIndex === i ? 6 : 3.5}
                    fill="#e53935"
                    stroke="#ffffff"
                    strokeWidth="2"
                    className="cursor-pointer transition-all duration-150"
                    onMouseEnter={() => setHoveredPointIndex(i)}
                    onMouseLeave={() => setHoveredPointIndex(null)}
                  />
                ))}
              </svg>

              {/* X-Axis Month Labels */}
              <div className="flex justify-between pl-8 pr-1 text-[10px] text-neutral-400 font-medium mt-2">
                {months.map((m) => (
                  <span key={m}>{m}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom 3 Summary Stats (Weekly / Monthly / Trend) */}
          <div className="grid grid-cols-3 gap-2 pt-4 mt-4 border-t border-neutral-100 text-center text-xs">
            <div>
              <div className="text-[10px] uppercase font-bold text-neutral-400">
                Weekly Volume
              </div>
              <div className="text-base font-extrabold text-neutral-900 mt-0.5">
                {scopedData.weeklyStat}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-neutral-400">
                Monthly Volume
              </div>
              <div className="text-base font-extrabold text-neutral-900 mt-0.5">
                {scopedData.monthlyStat}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-neutral-400">
                Trend Rate
              </div>
              <div className="text-base font-extrabold text-emerald-600 mt-0.5 flex items-center justify-center gap-1">
                <ArrowUpRight className="w-4 h-4" />
                <span>{scopedData.trendPercentage}</span>
              </div>
            </div>
          </div>
        </div>

        {/* CENTER: Customer Satisfaction & Channel Stats (Spans 3 cols) */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          {/* Box 1: Customer Satisfaction Score */}
          <div className="bg-white rounded-md border border-neutral-200 shadow-xs p-5 flex-1 flex flex-col justify-between">
            <div>
              <h4 className="text-[11px] font-black uppercase tracking-wider text-neutral-700 text-center">
                {scopedData.csatLabel}
              </h4>

              <div className="my-3 text-center">
                <span className="text-4xl font-black text-emerald-600 tracking-tight">
                  {scopedData.csatScore}
                </span>
              </div>

              {/* Green Progress Bar */}
              <div className="w-full bg-neutral-100 h-2.5 rounded-full overflow-hidden mb-4">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: scopedData.csatScore }}
                />
              </div>
            </div>

            {/* 3 Metric Comparison */}
            <div className="grid grid-cols-3 text-center border-t border-neutral-100 pt-3 text-[11px]">
              <div>
                <span className="text-neutral-400 block text-[9px] uppercase">
                  Previous
                </span>
                <strong className="text-neutral-700 font-bold">
                  {scopedData.csatPrev}
                </strong>
              </div>
              <div>
                <span className="text-neutral-400 block text-[9px] uppercase">
                  % Change
                </span>
                <strong className="text-emerald-600 font-bold">
                  {scopedData.csatChange}
                </strong>
              </div>
              <div>
                <span className="text-neutral-400 block text-[9px] uppercase">
                  Trend
                </span>
                <ArrowUpRight className="w-4 h-4 text-emerald-600 mx-auto" />
              </div>
            </div>
          </div>

          {/* Box 2: Channel Breakdown Stats */}
          <div className="bg-white rounded-md border border-neutral-200 shadow-xs p-4 flex-1">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-neutral-100 text-xs font-bold text-neutral-800">
              <span>{scopedData.channelTitle}</span>
              <div className="flex items-center gap-1.5 text-neutral-400">
                <RotateCcw className="w-3.5 h-3.5 cursor-pointer hover:text-neutral-700" />
              </div>
            </div>

            <div className="space-y-3 text-xs">
              {scopedData.channels.map((ch, idx) => (
                <div key={idx}>
                  <div className="flex justify-between items-center text-[11px] mb-1 font-medium text-neutral-700">
                    <span>{ch.name}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-bold text-white ${
                        idx === 0
                          ? "bg-amber-500"
                          : idx === 1
                            ? "bg-red-500"
                            : "bg-emerald-500"
                      }`}
                    >
                      {ch.percent}%
                    </span>
                  </div>
                  <div className="w-full bg-neutral-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`${ch.color} h-full rounded-full`}
                      style={{ width: `${ch.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: Donut Chart with Sparklines (Spans 3 cols) */}
        <div className="lg:col-span-3 bg-white rounded-md border border-neutral-200 shadow-xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-neutral-100 text-xs font-bold text-neutral-800">
              <span>{scopedData.donutTitle}</span>
              <div className="flex items-center gap-1 text-neutral-400">
                <RotateCcw className="w-3.5 h-3.5 cursor-pointer hover:text-neutral-700" />
                <Maximize2 className="w-3.5 h-3.5 cursor-pointer hover:text-neutral-700 ml-1" />
              </div>
            </div>

            {/* Vibrant SVG Pie/Donut Chart */}
            <div className="flex justify-center my-3">
              <svg width="150" height="150" viewBox="0 0 100 100" className="transform -rotate-90">
                {/* Yellow slice: 45% */}
                <circle
                  cx="50"
                  cy="50"
                  r="35"
                  fill="transparent"
                  stroke="#fbc02d"
                  strokeWidth="28"
                  strokeDasharray="99 220"
                  strokeDashoffset="0"
                />
                {/* Green slice: 10% */}
                <circle
                  cx="50"
                  cy="50"
                  r="35"
                  fill="transparent"
                  stroke="#43a047"
                  strokeWidth="28"
                  strokeDasharray="22 220"
                  strokeDashoffset="-99"
                />
                {/* Blue slice: 45% */}
                <circle
                  cx="50"
                  cy="50"
                  r="35"
                  fill="transparent"
                  stroke="#1e88e5"
                  strokeWidth="28"
                  strokeDasharray="99 220"
                  strokeDashoffset="-121"
                />
              </svg>
            </div>
          </div>

          {/* Legend Items with Mini Wave Sparklines */}
          <div className="space-y-3 pt-2 border-t border-neutral-100 text-xs">
            {scopedData.donutData.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-2 p-1.5 rounded hover:bg-neutral-50 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-3 h-3 rounded-xs shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <div>
                    <div className="font-bold text-[11px] text-neutral-900 leading-tight truncate">
                      {item.percent}
                    </div>
                    <div className="text-[10px] text-neutral-500 leading-tight truncate">
                      {item.label}
                    </div>
                  </div>
                </div>

                {/* Mini SVG Sparkline Wave */}
                <div className="w-16 h-6 shrink-0">
                  <svg viewBox="0 0 60 20" className="w-full h-full">
                    <path
                      d={
                        idx === 0
                          ? "M 0,16 Q 15,2 30,12 T 60,4"
                          : idx === 1
                            ? "M 0,18 Q 20,4 40,14 T 60,6"
                            : "M 0,14 Q 15,18 30,6 T 60,10"
                      }
                      fill="none"
                      stroke={item.color}
                      strokeWidth="2"
                    />
                    <path
                      d={
                        idx === 0
                          ? "M 0,16 Q 15,2 30,12 T 60,4 L 60,20 L 0,20 Z"
                          : idx === 1
                            ? "M 0,18 Q 20,4 40,14 T 60,6 L 60,20 L 0,20 Z"
                            : "M 0,14 Q 15,18 30,6 T 60,10 L 60,20 L 0,20 Z"
                      }
                      fill={item.color}
                      fillOpacity="0.15"
                    />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 3. BOTTOM ROW: Data Table + Distribution Bar (Matches Image)        */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Table Card (Spans 8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-md border border-neutral-200 shadow-xs p-5">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-100">
            <h3 className="font-bold text-sm text-neutral-900 tracking-tight">
              {scopedData.tableTitle}
            </h3>
            <div className="flex items-center gap-2 text-neutral-400">
              <RotateCcw className="w-3.5 h-3.5 cursor-pointer hover:text-neutral-700" />
              <Maximize2 className="w-3.5 h-3.5 cursor-pointer hover:text-neutral-700" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-[10px] font-black uppercase tracking-wider text-neutral-500 border-b border-neutral-100">
                <tr>
                  {scopedData.tableCols.map((c, i) => (
                    <th key={i} className="py-2.5 px-3">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-neutral-700">
                {scopedData.tableRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-neutral-50/70 transition-colors">
                    <td className="py-3 px-3 font-bold font-mono text-neutral-900">
                      {row.col1}
                    </td>
                    <td className="py-3 px-3">{row.col2}</td>
                    <td className="py-3 px-3">{row.col3}</td>
                    <td className="py-3 px-3 font-semibold text-neutral-900">
                      {row.col4}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          row.col5 === "delivered" ||
                          row.col5 === "posted" ||
                          row.col5 === "completed" ||
                          row.col5 === "approved" ||
                          row.col5 === "active"
                            ? "bg-emerald-100 text-emerald-800"
                            : row.col5 === "dispatched" || row.col5 === "processing"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {row.col5}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Distribution Timeline Card with Floating Action Button (Spans 4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-md border border-neutral-200 shadow-xs p-5 relative flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-100">
              <h3 className="font-bold text-sm text-neutral-900 tracking-tight">
                {mode === "seller"
                  ? "Settlement & Fulfillment Timeline"
                  : mode === "finance"
                    ? "Escrow & Payout Pipeline"
                    : "Advertising & Regional Campaigns"}
              </h3>
              <RotateCcw className="w-3.5 h-3.5 text-neutral-400 cursor-pointer hover:text-neutral-700" />
            </div>

            <div className="py-4 space-y-4">
              <div className="text-xs text-neutral-500">
                {mode === "seller"
                  ? "Orders are held in escrow during the 15-day return window, then disbursed directly via M-Pesa B2C."
                  : mode === "finance"
                    ? "Weekly double-entry reconciliation pipeline matching Daraja callbacks against ledger balances."
                    : "Active promotional flash sales, county express delivery banners, and partner campaigns."}
              </div>

              {/* Horizontal Multi-colored Stacked Bar (Like bottom-right of image) */}
              <div className="pt-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-neutral-700 mb-1">
                  <span>Cycle Progress</span>
                  <span>78.4% On Schedule</span>
                </div>
                <div className="flex h-5 w-full rounded-md overflow-hidden bg-neutral-100 border border-neutral-200">
                  <div className="bg-[#fbc02d] w-[35%] h-full" title="Pending Window" />
                  <div className="bg-[#e53935] w-[25%] h-full" title="In Verification" />
                  <div className="bg-[#43a047] w-[40%] h-full" title="Completed & Cleared" />
                </div>
                <div className="flex justify-between text-[9px] text-neutral-400 mt-1 font-mono uppercase">
                  <span>01 Days</span>
                  <span>07 Days</span>
                  <span>15 Days Cleared</span>
                </div>
              </div>
            </div>
          </div>

          {/* Floating Action Green Button (Exact match from bottom-right of image) */}
          <div className="flex justify-end pt-3">
            <button
              type="button"
              onClick={() => {
                if (mode === "seller") onNavigateTab?.("products");
                else if (mode === "finance") onNavigateTab?.("reconciliation");
                else onNavigateTab?.("system");
              }}
              className="w-10 h-10 rounded-full bg-[#43a047] hover:bg-[#388e3c] text-white flex items-center justify-center shadow-lg transition-transform active:scale-90"
              title="Add / Configure"
            >
              <span className="text-xl font-bold leading-none">+</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
