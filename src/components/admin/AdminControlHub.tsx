import React, { useState } from 'react';
import { useMarketplace } from '../../context/MarketplaceContext';
import {
  Shield,
  ShieldCheck,
  BarChart3,
  Users,
  Package,
  ShoppingBag,
  DollarSign,
  Ticket,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  ArrowUpRight,
  TrendingUp,
  Percent,
  Lock,
  Plus,
} from 'lucide-react';
import { Role, SellerStatus, PayoutStatus, Coupon } from '../../types';

export const AdminControlHub: React.FC = () => {
  const {
    authUser,
    currentRole,
    setCurrentRole,
    sellers,
    products,
    orders,
    payouts,
    ledger,
    coupons,
    deliveryZones,
    categories,
    formatKSh,
    approveSeller,
    suspendSeller,
    updateSellerCommission,
    approvePayout,
    rejectPayout,
    createCoupon,
  } = useMarketplace();

  const [adminTab, setAdminTab] = useState<
    'analytics' | 'sellers' | 'catalog' | 'orders' | 'finance' | 'coupons' | 'logistics'
  >('analytics');

  // Coupon Creation State
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponType, setCouponType] = useState<'percentage' | 'fixed'>('percentage');
  const [couponValue, setCouponValue] = useState<number>(10);
  const [couponMinSpend, setCouponMinSpend] = useState<number>(1000);

  // Platform Aggregate Analytics
  const totalGMV = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.grandTotal, 0);

  const totalCommissionsEarned = orders
    .filter((o) => o.status !== 'cancelled')
    .flatMap((o) => o.sellerSubOrders)
    .reduce((sum, s) => sum + s.commissionTotal, 0);

  const totalDeliveredOrders = orders.filter((o) => o.status === 'delivered').length;
  const pendingKYCSellers = sellers.filter((s) => s.status === 'under_review').length;
  const pendingPayoutsCount = payouts.filter((p) => p.status === 'pending').length;

  const handleCreateCouponSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;

    createCoupon({
      code: couponCode.trim().toUpperCase(),
      type: couponType,
      discountType: couponType,
      value: Number(couponValue),
      minOrderValue: Number(couponMinSpend),
      minOrderAmount: Number(couponMinSpend),
      expiresAt: '2026-12-31T23:59:59Z',
      usageLimit: 500,
      timesUsed: 0,
      isActive: true,
    });

    setShowCouponModal(false);
    setCouponCode('');
  };

  return (
    <div id="admin-control-hub-container" className="max-w-7xl mx-auto px-4 py-6">
      {/* 1. Admin Top Bar & RBAC Switcher */}
      <div className="bg-neutral-900 text-white rounded-xl p-5 mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg border border-neutral-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-amber-500 text-neutral-900 flex items-center justify-center font-black">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white">Allsales Marketplace Admin Hub</h1>
              <span className="text-[10px] bg-red-600 text-white font-bold px-2 py-0.5 rounded tracking-wide uppercase">
                Enterprise
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              Platform governance, seller KYC verification, multi-vendor commission accounting & logs
            </p>
          </div>
        </div>
      </div>

      {/* 2. Main Layout with Left Sidebar to prevent content overload */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Sidebar Navigation (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Admin Identity Card */}
          <div className="bg-white rounded-xl border border-neutral-200 p-3.5 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-800 font-black text-sm flex-shrink-0">
                <ShieldCheck className="w-5 h-5 text-purple-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-xs text-neutral-900 truncate">
                  {authUser?.name || 'Administrator'}
                </div>
                <div className="text-[10px] text-purple-700 font-semibold capitalize mt-0.5">
                  {currentRole.replace('_', ' ')}
                </div>
              </div>
            </div>
            <div className="mt-2.5 pt-2.5 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500">
              <span>Security Level:</span>
              <span className="font-bold text-emerald-600">Enterprise RBAC</span>
            </div>
          </div>

          {/* Sidebar Menu */}
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs">
            <div className="p-3 bg-neutral-50 border-b border-neutral-200 text-xs font-bold text-neutral-700 uppercase tracking-wider">
              Governance Menu
            </div>

            <nav className="p-2 space-y-1 text-xs font-semibold">
              <button
                onClick={() => setAdminTab('analytics')}
                className={`w-full flex items-center justify-between p-2.5 rounded-lg transition-colors text-left ${
                  adminTab === 'analytics'
                    ? 'bg-amber-50 text-amber-700 font-bold'
                    : 'text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <BarChart3 className="w-4 h-4 text-amber-600" />
                  <span>Platform Analytics</span>
                </div>
              </button>

              <button
                onClick={() => setAdminTab('sellers')}
                className={`w-full flex items-center justify-between p-2.5 rounded-lg transition-colors text-left ${
                  adminTab === 'sellers'
                    ? 'bg-amber-50 text-amber-700 font-bold'
                    : 'text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>Sellers & KYC</span>
                </div>
                {pendingKYCSellers > 0 && (
                  <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                    {pendingKYCSellers}
                  </span>
                )}
              </button>

              <button
                onClick={() => setAdminTab('catalog')}
                className={`w-full flex items-center justify-between p-2.5 rounded-lg transition-colors text-left ${
                  adminTab === 'catalog'
                    ? 'bg-amber-50 text-amber-700 font-bold'
                    : 'text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Package className="w-4 h-4 text-purple-600" />
                  <span>Catalog Moderation</span>
                </div>
                <span className="text-[10px] text-neutral-400 font-mono">
                  {products.length}
                </span>
              </button>

              <button
                onClick={() => setAdminTab('orders')}
                className={`w-full flex items-center justify-between p-2.5 rounded-lg transition-colors text-left ${
                  adminTab === 'orders'
                    ? 'bg-amber-50 text-amber-700 font-bold'
                    : 'text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <ShoppingBag className="w-4 h-4 text-amber-600" />
                  <span>Master Orders</span>
                </div>
                <span className="text-[10px] text-neutral-400 font-mono">
                  {orders.length}
                </span>
              </button>

              <button
                onClick={() => setAdminTab('finance')}
                className={`w-full flex items-center justify-between p-2.5 rounded-lg transition-colors text-left ${
                  adminTab === 'finance'
                    ? 'bg-amber-50 text-amber-700 font-bold'
                    : 'text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span>Finance & Ledger</span>
                </div>
                {pendingPayoutsCount > 0 && (
                  <span className="bg-amber-500 text-neutral-900 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                    {pendingPayoutsCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setAdminTab('coupons')}
                className={`w-full flex items-center justify-between p-2.5 rounded-lg transition-colors text-left ${
                  adminTab === 'coupons'
                    ? 'bg-amber-50 text-amber-700 font-bold'
                    : 'text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Ticket className="w-4 h-4 text-rose-600" />
                  <span>Marketing Coupons</span>
                </div>
                <span className="text-[10px] text-neutral-400 font-mono">
                  {coupons.length}
                </span>
              </button>

              <button
                onClick={() => setAdminTab('logistics')}
                className={`w-full flex items-center justify-between p-2.5 rounded-lg transition-colors text-left ${
                  adminTab === 'logistics'
                    ? 'bg-amber-50 text-amber-700 font-bold'
                    : 'text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <MapPin className="w-4 h-4 text-teal-600" />
                  <span>Delivery Zones</span>
                </div>
                <span className="text-[10px] text-neutral-400 font-mono">
                  47
                </span>
              </button>
            </nav>
          </div>

          {/* System Health Card */}
          <div className="bg-neutral-900 text-white rounded-xl p-4 shadow-xs text-xs border border-neutral-800">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-bold text-white text-[11px]">System Status: Healthy</span>
            </div>
            <p className="text-neutral-400 text-[11px] leading-relaxed">
              M-Pesa STK push gateway online. Double-entry financial ledger verified and balanced.
            </p>
          </div>
        </div>

        {/* Right Main Content (9 cols) */}
        <div className="lg:col-span-9 space-y-6">

      {/* 3. Tab Contents */}

      {/* ANALYTICS TAB */}
      {adminTab === 'analytics' && (
        <div className="space-y-6">
          {/* Main KPI metric cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs">
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Gross Merchandise Value (GMV)
              </span>
              <div className="text-2xl font-extrabold text-neutral-900 mt-1">
                {formatKSh(totalGMV)}
              </div>
              <p className="text-[11px] text-emerald-600 mt-1 font-semibold flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Across all vendor transactions</span>
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs">
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Platform Commission Revenue
              </span>
              <div className="text-2xl font-extrabold text-amber-600 mt-1">
                {formatKSh(totalCommissionsEarned)}
              </div>
              <p className="text-[11px] text-neutral-400 mt-1">
                Net earned revenue retained by Allsales
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs">
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Active Verified Merchants
              </span>
              <div className="text-2xl font-extrabold text-neutral-900 mt-1">
                {sellers.filter((s) => s.status === 'approved').length}
              </div>
              <p className="text-[11px] text-neutral-400 mt-1">
                {pendingKYCSellers} vendor awaiting KYC verification
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs">
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Successful Deliveries
              </span>
              <div className="text-2xl font-extrabold text-emerald-700 mt-1">
                {totalDeliveredOrders}
              </div>
              <p className="text-[11px] text-neutral-400 mt-1">Out of {orders.length} total orders</p>
            </div>
          </div>

          {/* Category Commission Performance & Vendor Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-xs">
              <h3 className="font-bold text-sm text-neutral-900 mb-3">
                Category Commission Tiers & Catalog Density
              </h3>
              <div className="space-y-3 text-xs">
                {categories.map((cat) => {
                  const count = products.filter((p) => p.categoryId === cat.id).length;
                  return (
                    <div key={cat.id} className="flex items-center justify-between p-2 rounded bg-neutral-50">
                      <div>
                        <span className="font-bold text-neutral-800">{cat.name}</span>
                        <span className="text-[11px] text-neutral-500 block">
                          Default commission rate: {cat.commissionRate || 10}%
                        </span>
                      </div>
                      <span className="font-semibold text-neutral-700">{count} products</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-xs">
              <h3 className="font-bold text-sm text-neutral-900 mb-3">
                System Health & Daraja M-Pesa API Status
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center p-2.5 rounded bg-emerald-50 text-emerald-800">
                  <span className="font-bold">Safaricom Daraja API Gateway</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 bg-emerald-200 rounded">
                    OPERATIONAL (99.98%)
                  </span>
                </div>

                <div className="flex justify-between items-center p-2.5 rounded bg-blue-50 text-blue-800">
                  <span className="font-bold">Order Splitting Engine</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 bg-blue-200 rounded">
                    ACTIVE (0 latencies)
                  </span>
                </div>

                <div className="flex justify-between items-center p-2.5 rounded bg-neutral-50 text-neutral-800">
                  <span className="font-bold">Financial Double-Entry Ledger</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 bg-neutral-200 rounded">
                    {ledger.length} immutable entries
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SELLERS & KYC TAB */}
      {adminTab === 'sellers' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-sm text-neutral-800">
                Merchant Governance & KYC Verification
              </h3>
              <p className="text-xs text-neutral-500">
                Audit vendor company certificates, KRA PIN numbers and set custom commission tiers.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 border-b border-neutral-200 font-bold text-neutral-600 uppercase text-[11px]">
                <tr>
                  <th className="p-3">Merchant / Business</th>
                  <th className="p-3">Tax PIN & Reg #</th>
                  <th className="p-3">Commission %</th>
                  <th className="p-3">Balance (Available)</th>
                  <th className="p-3">KYC Status</th>
                  <th className="p-3 text-right">Administrative Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {sellers.map((s) => (
                  <tr key={s.id} className="hover:bg-neutral-50/60">
                    <td className="p-3">
                      <div className="font-bold text-neutral-900">{s.businessName}</div>
                      <div className="text-[11px] text-neutral-500">
                        {s.ownerName} • {s.email}
                      </div>
                    </td>
                    <td className="p-3 font-mono text-[11px] text-neutral-600">
                      <div>PIN: {s.taxPin}</div>
                      <div>REG: {s.businessRegNumber}</div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-neutral-900">{s.commissionRate}%</span>
                        <button
                          onClick={() => {
                            const newRate = prompt('Enter new commission %:', s.commissionRate.toString());
                            if (newRate && !isNaN(Number(newRate))) {
                              updateSellerCommission(s.id, Number(newRate));
                            }
                          }}
                          className="text-[10px] text-blue-600 hover:underline"
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                    <td className="p-3 font-extrabold text-neutral-800">
                      {formatKSh(s.availableBalance)}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          s.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : s.status === 'under_review'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {s.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-2">
                        {s.status !== 'approved' && (
                          <button
                            onClick={() => approveSeller(s.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded text-xs font-semibold"
                          >
                            Approve KYC
                          </button>
                        )}
                        {s.status === 'approved' && (
                          <button
                            onClick={() => suspendSeller(s.id)}
                            className="bg-red-50 hover:bg-red-100 text-red-700 px-2.5 py-1 rounded text-xs font-semibold"
                          >
                            Suspend Vendor
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CATALOG MODERATION TAB */}
      {adminTab === 'catalog' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-sm text-neutral-800">
                Product Catalog & Quality Moderation
              </h3>
              <p className="text-xs text-neutral-500">
                Review products submitted by marketplace vendors before live customer exposure.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 border-b border-neutral-200 font-bold text-neutral-600 uppercase text-[11px]">
                <tr>
                  <th className="p-3">Item</th>
                  <th className="p-3">Seller</th>
                  <th className="p-3">Price</th>
                  <th className="p-3">Inventory</th>
                  <th className="p-3">Flash Sale</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {products.map((p) => {
                  const seller = sellers.find((s) => s.id === p.sellerId);
                  return (
                    <tr key={p.id} className="hover:bg-neutral-50/60">
                      <td className="p-3 flex items-center gap-2.5">
                        <img
                          src={p.images[0]}
                          alt={p.name}
                          className="w-10 h-10 object-cover rounded border border-neutral-200"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <div className="font-semibold text-neutral-900 max-w-xs truncate">
                            {p.name}
                          </div>
                          <div className="text-[11px] text-neutral-500 font-mono">{p.sku}</div>
                        </div>
                      </td>
                      <td className="p-3 font-medium text-neutral-800">
                        {seller?.businessName || p.sellerId}
                      </td>
                      <td className="p-3 font-bold text-neutral-900">{formatKSh(p.price)}</td>
                      <td className="p-3">
                        <span className="font-semibold text-neutral-800">{p.stock} units</span>
                      </td>
                      <td className="p-3">
                        {p.isFlashSale ? (
                          <span className="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded">
                            ACTIVE FLASH
                          </span>
                        ) : (
                          <span className="text-neutral-400 text-[11px]">Standard</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MASTER ORDERS TAB */}
      {adminTab === 'orders' && (
        <div className="space-y-4">
          <div>
            <h3 className="font-bold text-sm text-neutral-800">
              Platform Master Orders & Order Splitting Audit
            </h3>
            <p className="text-xs text-neutral-500">
              Inspect how customer checkout carts are automatically split into discrete vendor
              sub-orders.
            </p>
          </div>

          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs p-4 text-xs"
              >
                <div className="flex flex-wrap justify-between items-center border-b border-neutral-100 pb-3 gap-2">
                  <div>
                    <span className="font-mono font-bold text-sm text-neutral-900">
                      {order.orderNumber}
                    </span>
                    <span className="text-neutral-400 mx-2">•</span>
                    <span className="text-neutral-600 font-semibold">{order.customerName}</span>
                    <span className="text-neutral-400 mx-2">•</span>
                    <span className="text-neutral-500 font-mono text-[11px]">
                      {order.paymentReference}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`font-bold px-2 py-0.5 rounded text-[11px] uppercase ${
                        order.status === 'delivered'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {order.status.replace('_', ' ')}
                    </span>
                    <span className="font-extrabold text-neutral-900 text-sm">
                      {formatKSh(order.grandTotal)}
                    </span>
                  </div>
                </div>

                {/* Sub-orders List */}
                <div className="py-3">
                  <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block mb-2">
                    Splitted Vendor Sub-Orders ({order.sellerSubOrders.length})
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {order.sellerSubOrders.map((sub) => (
                      <div
                        key={sub.id}
                        className="p-3 bg-neutral-50 rounded-lg border border-neutral-200"
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-neutral-900">{sub.sellerName}</span>
                          <span className="font-mono text-[11px] text-neutral-500">
                            {sub.subOrderNumber}
                          </span>
                        </div>
                        <div className="text-[11px] text-neutral-600">
                          {sub.items.map((it) => (
                            <div key={it.id}>
                              • {it.quantity}x {it.productName} ({formatKSh(it.subtotal)})
                            </div>
                          ))}
                        </div>
                        <div className="mt-2 pt-2 border-t border-neutral-200 flex justify-between text-[11px]">
                          <span>Commission: {formatKSh(sub.commissionTotal)}</span>
                          <span className="font-bold text-emerald-700">
                            Net to Seller: {formatKSh(sub.sellerNetTotal)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FINANCE & LEDGER TAB */}
      {adminTab === 'finance' && (
        <div className="space-y-6">
          {/* Payout Approval Section */}
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs">
            <div className="p-4 bg-neutral-50 border-b border-neutral-200">
              <h3 className="font-bold text-sm text-neutral-800">
                Seller Disbursement Requests ({payouts.length})
              </h3>
              <p className="text-xs text-neutral-500">
                Review and approve withdrawal requests initiated by verified merchants.
              </p>
            </div>

            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 border-b border-neutral-200 font-bold text-neutral-600 uppercase text-[11px]">
                <tr>
                  <th className="p-3">Payout #</th>
                  <th className="p-3">Seller</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Destination</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {payouts.map((p) => {
                  const s = sellers.find((seller) => seller.id === p.sellerId);
                  return (
                    <tr key={p.id} className="hover:bg-neutral-50/60">
                      <td className="p-3 font-mono font-bold text-neutral-800">{p.payoutNumber}</td>
                      <td className="p-3 font-semibold text-neutral-800">
                        {s?.businessName || p.sellerId}
                      </td>
                      <td className="p-3 font-extrabold text-neutral-900">{formatKSh(p.amount)}</td>
                      <td className="p-3 font-mono text-[11px] text-neutral-600">
                        {p.method.toUpperCase()}: {p.accountDetails}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            p.status === 'approved' || p.status === 'processed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : p.status === 'rejected'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {p.status === 'pending' ? (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => approvePayout(p.id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-2.5 py-1 rounded"
                            >
                              Approve & Disburse
                            </button>
                            <button
                              onClick={() => rejectPayout(p.id)}
                              className="bg-red-50 hover:bg-red-100 text-red-700 font-semibold px-2.5 py-1 rounded"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-neutral-400 text-[11px]">Audit Logged</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Double Entry Financial Ledger */}
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs">
            <div className="p-4 bg-neutral-50 border-b border-neutral-200">
              <h3 className="font-bold text-sm text-neutral-800">
                Immutable Financial Audit Ledger ({ledger.length} Entries)
              </h3>
              <p className="text-xs text-neutral-500">
                All platform commissions, payouts, and order revenue transactions are recorded with
                timestamp and running balance.
              </p>
            </div>

            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 border-b border-neutral-200 font-bold text-neutral-600 uppercase text-[11px]">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Description</th>
                  <th className="p-3">Debit</th>
                  <th className="p-3">Credit</th>
                  <th className="p-3">Running Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {ledger.map((entry) => (
                  <tr key={entry.id} className="hover:bg-neutral-50/60 font-mono text-[11px]">
                    <td className="p-3 text-neutral-500">
                      {new Date(entry.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="p-3 font-semibold text-neutral-800 capitalize">
                      {entry.type.replace('_', ' ')}
                    </td>
                    <td className="p-3 font-sans text-xs text-neutral-700">{entry.description}</td>
                    <td className="p-3 text-red-600 font-bold">
                      {entry.debit ? formatKSh(entry.debit) : '—'}
                    </td>
                    <td className="p-3 text-emerald-600 font-bold">
                      {entry.credit ? formatKSh(entry.credit) : '—'}
                    </td>
                    <td className="p-3 font-bold text-neutral-900">
                      {formatKSh(entry.balanceAfter ?? entry.balance ?? 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MARKETING COUPONS TAB */}
      {adminTab === 'coupons' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-sm text-neutral-800">Marketplace Promotional Coupons</h3>
              <p className="text-xs text-neutral-500">
                Configure discount vouchers for customer acquisition and flash campaign sales.
              </p>
            </div>
            <button
              onClick={() => setShowCouponModal(true)}
              className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs py-2 px-4 rounded-lg shadow-xs flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Create Coupon
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {coupons.map((c) => (
              <div
                key={c.code}
                className="bg-white rounded-xl border border-neutral-200 p-4 shadow-xs text-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-mono font-extrabold text-sm text-amber-600 bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
                      {c.code}
                    </span>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                      ACTIVE
                    </span>
                  </div>
                  <p className="font-bold text-neutral-900 text-sm mt-1">
                    {(c.type === 'percentage' || c.discountType === 'percentage')
                      ? `${c.value}% OFF`
                      : `KSh ${c.value} OFF`}
                  </p>
                  <p className="text-neutral-500 mt-0.5 text-[11px]">
                    Min Order: {formatKSh(c.minOrderValue ?? c.minOrderAmount ?? 0)}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-neutral-100 text-[11px] text-neutral-400">
                  Times Redeemed: {c.timesUsed ?? 0} / {c.usageLimit ?? 500}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DELIVERY ZONES TAB */}
      {adminTab === 'logistics' && (
        <div className="space-y-4">
          <div>
            <h3 className="font-bold text-sm text-neutral-800">
              Logistics & Delivery Zone Rate Matrix
            </h3>
            <p className="text-xs text-neutral-500">
              Real-time shipping tariffs across Kenya's 47 counties for door delivery and pickup
              stations.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {deliveryZones.map((zone) => (
              <div
                key={zone.id || zone.county}
                className="bg-white rounded-xl border border-neutral-200 p-4 shadow-xs text-xs"
              >
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-bold text-neutral-900 text-sm flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-amber-600" />
                    {zone.county} County
                  </h4>
                  <span className="font-semibold text-neutral-500 text-[11px]">
                    {zone.estimatedDays}
                  </span>
                </div>

                <div className="space-y-1.5 mt-3 pt-2 border-t border-neutral-100 text-neutral-600">
                  <div className="flex justify-between">
                    <span>Doorstep Home Delivery:</span>
                    <span className="font-bold text-neutral-900">
                      {formatKSh(zone.homeDeliveryFee)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pickup Station Hub:</span>
                    <span className="font-bold text-emerald-700">
                      {formatKSh(zone.pickupStationFee)}
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-neutral-100">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                    Pickup Stations ({zone.pickupStations.length})
                  </span>
                  <div className="text-[11px] text-neutral-600 line-clamp-2">
                    {zone.pickupStations.join(', ')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
        </div>
      </div>

      {/* Create Coupon Modal */}
      {showCouponModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl">
            <h3 className="font-bold text-base text-neutral-900 mb-1">Create Promotional Voucher</h3>
            <p className="text-xs text-neutral-500 mb-4">
              Enter voucher discount rules for checkout redemption.
            </p>

            <form onSubmit={handleCreateCouponSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-600 font-semibold mb-1">Voucher Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FLASH20"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="w-full p-2 border border-neutral-300 rounded font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-neutral-600 font-semibold mb-1">Discount Type</label>
                <select
                  value={couponType}
                  onChange={(e) => setCouponType(e.target.value as any)}
                  className="w-full p-2 border border-neutral-300 rounded"
                >
                  <option value="percentage">Percentage Discount (%)</option>
                  <option value="fixed">Fixed Currency Discount (KSh)</option>
                </select>
              </div>

              <div>
                <label className="block text-neutral-600 font-semibold mb-1">
                  Discount Value ({couponType === 'percentage' ? '%' : 'KSh'}) *
                </label>
                <input
                  type="number"
                  required
                  value={couponValue}
                  onChange={(e) => setCouponValue(Number(e.target.value))}
                  className="w-full p-2 border border-neutral-300 rounded"
                />
              </div>

              <div>
                <label className="block text-neutral-600 font-semibold mb-1">
                  Minimum Order Spend (KSh)
                </label>
                <input
                  type="number"
                  required
                  value={couponMinSpend}
                  onChange={(e) => setCouponMinSpend(Number(e.target.value))}
                  className="w-full p-2 border border-neutral-300 rounded"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCouponModal(false)}
                  className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded"
                >
                  Publish Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
