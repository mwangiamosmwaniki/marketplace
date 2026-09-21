import React, { useState } from 'react';
import { useMarketplace } from '../../context/MarketplaceContext';
import {
  LayoutDashboard,
  Package,
  Boxes,
  ShoppingBag,
  DollarSign,
  Settings,
  Plus,
  Truck,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Store,
  Clock,
  ShieldCheck,
  Send,
  Save,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { Product, ProductVariant, OrderStatus } from '../../types';

export const SellerPortal: React.FC = () => {
  const {
    currentRole,
    setCurrentRole,
    currentSeller,
    currentSellerId,
    sellers,
    setCurrentSellerId,
    products,
    orders,
    payouts,
    categories,
    brands,
    formatKSh,
    addSellerProduct,
    updateSellerProduct,
    updateInventoryStock,
    updateSubOrderStatus,
    requestSellerPayout,
    updateSellerProfile,
  } = useMarketplace();

  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'products' | 'inventory' | 'orders' | 'payouts' | 'settings'
  >('dashboard');

  // Add product modal state
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdSku, setNewProdSku] = useState('');
  const [newProdCategory, setNewProdCategory] = useState(categories[0]?.id || 'cat-phones');
  const [newProdBrand, setNewProdBrand] = useState(brands[0]?.id || 'brand-samsung');
  const [newProdPrice, setNewProdPrice] = useState<number>(10000);
  const [newProdDiscount, setNewProdDiscount] = useState<number | undefined>(undefined);
  const [newProdStock, setNewProdStock] = useState<number>(20);
  const [newProdDesc, setNewProdDesc] = useState('');
  const [newProdWarranty, setNewProdWarranty] = useState('12 Months Warranty');
  const [newProdCondition, setNewProdCondition] = useState<'Brand New' | 'Refurbished' | 'Open Box'>('Brand New');
  const [newProdImage, setNewProdImage] = useState(
    'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&auto=format&fit=crop&q=80'
  );

  // Variant generator state
  const [hasVariants, setHasVariants] = useState(false);
  const [variantColor, setVariantColor] = useState('Black');
  const [variantStorage, setVariantStorage] = useState('128GB');

  // Payout request modal state
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState<number>(5000);
  const [payoutMethod, setPayoutMethod] = useState<'mpesa' | 'bank'>('mpesa');
  const [payoutAccount, setPayoutAccount] = useState('');
  const [payoutMessage, setPayoutMessage] = useState<{ text: string; success: boolean } | null>(null);

  // Tracking number dispatch input state
  const [dispatchTrackingInput, setDispatchTrackingInput] = useState<Record<string, string>>({});

  if (!currentSeller) {
    return (
      <div className="p-8 text-center bg-white rounded-lg border border-neutral-200 my-6">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-2" />
        <h3 className="font-bold text-neutral-800 text-base">Seller Not Found</h3>
        <p className="text-xs text-neutral-500">Please select a registered seller from the navigation bar.</p>
      </div>
    );
  }

  // Tenant Isolated Data
  const sellerProducts = products.filter((p) => p.sellerId === currentSeller.id);
  const sellerSubOrders = orders.flatMap((o) =>
    o.sellerSubOrders.filter((sub) => sub.sellerId === currentSeller.id)
  );
  const sellerPayouts = payouts.filter((p) => p.sellerId === currentSeller.id);

  // Analytics
  const totalSalesRevenue = sellerSubOrders
    .filter((s) => s.status !== 'cancelled')
    .reduce((sum, s) => sum + s.subtotal, 0);

  const totalCommissionDeducted = sellerSubOrders
    .filter((s) => s.status !== 'cancelled')
    .reduce((sum, s) => sum + s.commissionTotal, 0);

  const pendingOrdersCount = sellerSubOrders.filter(
    (s) => s.status === 'processing' || s.status === 'ready_for_dispatch'
  ).length;

  const lowStockCount = sellerProducts.filter((p) => p.stock <= 5).length;

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim() || !newProdSku.trim()) return;

    let generatedVariants: ProductVariant[] | undefined = undefined;
    if (hasVariants) {
      generatedVariants = [
        {
          id: `var-${Date.now()}-1`,
          sku: `${newProdSku}-1`,
          attributes: { Color: variantColor, Spec: variantStorage },
          price: newProdPrice,
          discountPrice: newProdDiscount,
          stock: newProdStock,
        },
      ];
    }

    addSellerProduct({
      sellerId: currentSeller.id,
      name: newProdName.trim(),
      slug: newProdName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      sku: newProdSku.trim().toUpperCase(),
      shortDescription: newProdDesc.slice(0, 100),
      description: newProdDesc || 'Genuine product sourced from official distributors.',
      categoryId: newProdCategory,
      brandId: newProdBrand,
      price: Number(newProdPrice),
      discountPrice: newProdDiscount ? Number(newProdDiscount) : undefined,
      stock: Number(newProdStock),
      images: [newProdImage],
      variants: generatedVariants,
      status: 'active',
      isFeatured: false,
      warranty: newProdWarranty,
      condition: newProdCondition,
      returnPolicy: '7 Days Return on eligible items',
      weightKg: 0.5,
    });

    setShowAddProductModal(false);
    // Reset form
    setNewProdName('');
    setNewProdSku('');
    setNewProdDesc('');
  };

  const handleRequestPayoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const account = payoutAccount.trim() || currentSeller.payoutAccount;
    const res = requestSellerPayout(currentSeller.id, payoutAmount, payoutMethod, account);
    setPayoutMessage({ text: res.message, success: res.success });
    if (res.success) {
      setTimeout(() => {
        setShowPayoutModal(false);
        setPayoutMessage(null);
      }, 1500);
    }
  };

  return (
    <div id="seller-center-container" className="max-w-7xl mx-auto px-4 py-6">
      {/* 1. Seller Tenant Header Banner */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-xs mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-lg bg-amber-500 text-white font-black text-xl flex items-center justify-center shadow-xs overflow-hidden">
            {currentSeller.logo ? (
              <img
                src={currentSeller.logo}
                alt={currentSeller.businessName}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              currentSeller.businessName[0]
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900">
                {currentSeller.businessName}
              </h1>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                  currentSeller.status === 'approved'
                    ? 'bg-emerald-100 text-emerald-800'
                    : currentSeller.status === 'under_review'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {currentSeller.status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              Seller ID: <span className="font-mono text-neutral-700">{currentSeller.id}</span> •
              Commission Tier:{' '}
              <span className="font-semibold text-neutral-800">{currentSeller.commissionRate}%</span> •
              Rating: <span className="text-amber-600 font-bold">{currentSeller.rating} ★</span>
            </p>
          </div>
        </div>

        {/* Quick Action & Tenant Switcher */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="text-left md:text-right text-xs">
            <span className="text-neutral-400 block">Available Payout Funds</span>
            <span className="text-base font-extrabold text-emerald-700">
              {formatKSh(currentSeller.availableBalance)}
            </span>
          </div>

          <button
            onClick={() => {
              setPayoutAccount(currentSeller.payoutAccount);
              setShowPayoutModal(true);
            }}
            disabled={currentSeller.availableBalance < 2000}
            className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs py-2 px-4 rounded-lg shadow-xs transition-colors disabled:opacity-40"
          >
            Request Payout
          </button>
        </div>
      </div>

      {/* Role-Based Access Notice if viewing as Customer */}
      {currentRole !== 'seller' && (
        <div className="mb-6 bg-amber-50 border border-amber-300 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="font-bold text-amber-950">You are viewing Seller Center in Preview Mode</p>
              <p className="text-amber-800">
                You are currently signed in with the <span className="font-semibold capitalize">{currentRole.replace('_', ' ')}</span> role. Switch to Seller role for full catalog & payout authorization.
              </p>
            </div>
          </div>
          <button
            onClick={() => setCurrentRole('seller')}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold rounded-lg whitespace-nowrap transition-colors shadow-2xs"
          >
            Activate Seller Session
          </button>
        </div>
      )}

      {/* 2. Main Layout with Left Sidebar to prevent content overload */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Sidebar Navigation (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Shop Switcher Card */}
          <div className="bg-white rounded-xl border border-neutral-200 p-3.5 shadow-xs">
            <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
              Active Vendor Account
            </label>
            <select
              value={currentSellerId}
              onChange={(e) => setCurrentSellerId(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-300 rounded-lg p-2 text-xs font-bold text-neutral-900 focus:outline-none focus:border-amber-500"
            >
              {sellers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.businessName} ({s.status})
                </option>
              ))}
            </select>
          </div>

          {/* Sidebar Menu */}
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs">
            <div className="p-3 bg-neutral-50 border-b border-neutral-200 text-xs font-bold text-neutral-700 uppercase tracking-wider">
              Seller Navigation
            </div>

            <nav className="p-2 space-y-1 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`w-full flex items-center justify-between p-2.5 rounded-lg transition-colors text-left ${
                  activeTab === 'dashboard'
                    ? 'bg-amber-50 text-amber-700 font-bold'
                    : 'text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <LayoutDashboard className="w-4 h-4 text-amber-600" />
                  <span>Dashboard Overview</span>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('products')}
                className={`w-full flex items-center justify-between p-2.5 rounded-lg transition-colors text-left ${
                  activeTab === 'products'
                    ? 'bg-amber-50 text-amber-700 font-bold'
                    : 'text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Package className="w-4 h-4 text-blue-600" />
                  <span>My Products</span>
                </div>
                <span className="text-[10px] bg-neutral-100 text-neutral-800 font-bold px-1.5 py-0.5 rounded-full">
                  {sellerProducts.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('inventory')}
                className={`w-full flex items-center justify-between p-2.5 rounded-lg transition-colors text-left ${
                  activeTab === 'inventory'
                    ? 'bg-amber-50 text-amber-700 font-bold'
                    : 'text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Boxes className="w-4 h-4 text-purple-600" />
                  <span>Inventory Stock</span>
                </div>
                {lowStockCount > 0 ? (
                  <span className="text-[10px] bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded-full">
                    {lowStockCount} Low
                  </span>
                ) : (
                  <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded-full">
                    OK
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('orders')}
                className={`w-full flex items-center justify-between p-2.5 rounded-lg transition-colors text-left ${
                  activeTab === 'orders'
                    ? 'bg-amber-50 text-amber-700 font-bold'
                    : 'text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <ShoppingBag className="w-4 h-4 text-amber-600" />
                  <span>Orders & Dispatch</span>
                </div>
                {pendingOrdersCount > 0 && (
                  <span className="text-[10px] bg-amber-500 text-neutral-900 font-bold px-1.5 py-0.5 rounded-full">
                    {pendingOrdersCount} New
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('payouts')}
                className={`w-full flex items-center justify-between p-2.5 rounded-lg transition-colors text-left ${
                  activeTab === 'payouts'
                    ? 'bg-amber-50 text-amber-700 font-bold'
                    : 'text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span>Earnings & Payouts</span>
                </div>
                <span className="text-[10px] text-emerald-700 font-bold">
                  {sellerPayouts.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                className={`w-full flex items-center justify-between p-2.5 rounded-lg transition-colors text-left ${
                  activeTab === 'settings'
                    ? 'bg-amber-50 text-amber-700 font-bold'
                    : 'text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Settings className="w-4 h-4 text-neutral-600" />
                  <span>Store Profile & KYC</span>
                </div>
              </button>
            </nav>
          </div>

          {/* Available Balance Quick Widget */}
          <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4 shadow-xs text-xs">
            <span className="text-emerald-800 text-[11px] font-medium block">
              Available Escrow Settlement
            </span>
            <div className="text-lg font-extrabold text-emerald-950 mt-0.5">
              {formatKSh(currentSeller.availableBalance)}
            </div>
            <button
              onClick={() => {
                setPayoutAccount(currentSeller.payoutAccount);
                setShowPayoutModal(true);
              }}
              disabled={currentSeller.availableBalance < 2000}
              className="mt-3 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-3 rounded-lg shadow-xs transition-colors disabled:opacity-40"
            >
              Request Disbursement
            </button>
          </div>
        </div>

        {/* Right Main Content (9 cols) */}
        <div className="lg:col-span-9 space-y-6">

      {/* 3. Tab Contents */}

      {/* DASHBOARD TAB */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs">
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Gross Product Sales
              </span>
              <div className="text-2xl font-extrabold text-neutral-900 mt-1">
                {formatKSh(totalSalesRevenue)}
              </div>
              <p className="text-[11px] text-neutral-400 mt-1 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                <span>Across {sellerSubOrders.length} customer shipments</span>
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs">
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Platform Commission ({currentSeller.commissionRate}%)
              </span>
              <div className="text-2xl font-extrabold text-amber-600 mt-1">
                {formatKSh(totalCommissionDeducted)}
              </div>
              <p className="text-[11px] text-neutral-400 mt-1">
                Calculated server-side on net vendor orders
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs">
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Pending Settlement Balance
              </span>
              <div className="text-2xl font-extrabold text-blue-600 mt-1">
                {formatKSh(currentSeller.pendingBalance)}
              </div>
              <p className="text-[11px] text-neutral-400 mt-1">
                Unlocks when return period lapses post-delivery
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs">
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Pending Dispatch Orders
              </span>
              <div className="text-2xl font-extrabold text-neutral-900 mt-1">
                {pendingOrdersCount}
              </div>
              <p className="text-[11px] text-amber-600 mt-1 font-semibold">
                Requires warehouse packing & handover
              </p>
            </div>
          </div>

          {/* Recent Orders Queue */}
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs">
            <div className="p-4 bg-neutral-50 border-b border-neutral-200 flex justify-between items-center">
              <h3 className="font-bold text-sm text-neutral-900">
                Recent Sub-Orders for {currentSeller.businessName}
              </h3>
              <button
                onClick={() => setActiveTab('orders')}
                className="text-xs font-semibold text-amber-600 hover:text-amber-700"
              >
                View all orders
              </button>
            </div>

            <div className="divide-y divide-neutral-100">
              {sellerSubOrders.length === 0 ? (
                <div className="p-8 text-center text-xs text-neutral-500">
                  No orders placed for this vendor yet.
                </div>
              ) : (
                sellerSubOrders.slice(0, 5).map((sub) => (
                  <div key={sub.id} className="p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-neutral-900 font-mono">
                          {sub.subOrderNumber}
                        </span>
                        <span
                          className={`font-semibold px-2 py-0.5 rounded text-[10px] uppercase ${
                            sub.status === 'delivered'
                              ? 'bg-emerald-100 text-emerald-800'
                              : sub.status === 'dispatched'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {sub.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500 mt-0.5">
                        {sub.items.length} item(s): {sub.items.map((i) => i.productName).join(', ')}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="font-bold text-neutral-900 block">
                          Net: {formatKSh(sub.sellerNetTotal)}
                        </span>
                        <span className="text-[10px] text-neutral-400">
                          (Comm: {formatKSh(sub.commissionTotal)})
                        </span>
                      </div>

                      {sub.status === 'processing' && (
                        <button
                          onClick={() => updateSubOrderStatus(sub.id, 'ready_for_dispatch')}
                          className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-3 py-1.5 rounded"
                        >
                          Mark Ready
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* PRODUCTS TAB */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-sm text-neutral-800">
              Catalogue Management ({sellerProducts.length} Products)
            </h3>
            <button
              id="btn-add-product"
              onClick={() => setShowAddProductModal(true)}
              className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs py-2 px-4 rounded-lg shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Add New Product
            </button>
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 border-b border-neutral-200 font-bold text-neutral-600 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3">Product</th>
                  <th className="p-3">SKU</th>
                  <th className="p-3">Stock Units</th>
                  <th className="p-3">Price</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {sellerProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-neutral-50/60">
                    <td className="p-3 flex items-center gap-3">
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
                        <div className="text-[11px] text-neutral-400">
                          {p.variants?.length ? `${p.variants.length} Variants` : 'Single Item'}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 font-mono text-neutral-600">{p.sku}</td>
                    <td className="p-3">
                      <span
                        className={`font-bold ${
                          p.stock <= 5 ? 'text-red-600' : 'text-neutral-800'
                        }`}
                      >
                        {p.stock} in stock
                      </span>
                    </td>
                    <td className="p-3 font-bold text-neutral-900">
                      {formatKSh(p.discountPrice || p.price)}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          p.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-neutral-200 text-neutral-800'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => {
                          const newPrice = prompt('Enter new price in KSh:', p.price.toString());
                          if (newPrice && !isNaN(Number(newPrice))) {
                            updateSellerProduct(p.id, { price: Number(newPrice) });
                          }
                        }}
                        className="text-amber-600 hover:text-amber-700 font-semibold text-xs mr-2"
                      >
                        Edit Price
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* INVENTORY TAB */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-sm text-neutral-800">Real-Time Stock Adjustment</h3>
              <p className="text-xs text-neutral-500">
                Update stock levels instantly to prevent overselling and out-of-stock cancellations.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 border-b border-neutral-200 font-bold text-neutral-600 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3">Item / Variant</th>
                  <th className="p-3">SKU</th>
                  <th className="p-3">Current Available Stock</th>
                  <th className="p-3">Adjust Quantity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {sellerProducts.map((p) => (
                  <React.Fragment key={p.id}>
                    {p.variants && p.variants.length > 0 ? (
                      p.variants.map((v) => (
                        <tr key={v.id} className="hover:bg-neutral-50/60">
                          <td className="p-3">
                            <span className="font-semibold text-neutral-800">{p.name}</span>
                            <span className="text-neutral-500 block text-[11px]">
                              {Object.entries(v.attributes)
                                .map(([k, val]) => `${k}: ${val}`)
                                .join(' | ')}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-neutral-600">{v.sku}</td>
                          <td className="p-3">
                            <span
                              className={`font-bold ${
                                v.stock <= 5 ? 'text-red-600' : 'text-neutral-800'
                              }`}
                            >
                              {v.stock} units
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                defaultValue={v.stock}
                                onBlur={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  if (!isNaN(val) && val >= 0) {
                                    updateInventoryStock(p.id, v.id, val);
                                  }
                                }}
                                className="w-20 p-1 text-xs border border-neutral-300 rounded text-center"
                              />
                              <span className="text-[10px] text-neutral-400">(Auto-saves on blur)</span>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr className="hover:bg-neutral-50/60">
                        <td className="p-3 font-semibold text-neutral-800">{p.name}</td>
                        <td className="p-3 font-mono text-neutral-600">{p.sku}</td>
                        <td className="p-3">
                          <span
                            className={`font-bold ${
                              p.stock <= 5 ? 'text-red-600' : 'text-neutral-800'
                            }`}
                          >
                            {p.stock} units
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              defaultValue={p.stock}
                              onBlur={(e) => {
                                const val = parseInt(e.target.value, 10);
                                if (!isNaN(val) && val >= 0) {
                                  updateInventoryStock(p.id, undefined, val);
                                }
                              }}
                              className="w-20 p-1 text-xs border border-neutral-300 rounded text-center"
                            />
                            <span className="text-[10px] text-neutral-400">(Auto-saves on blur)</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ORDERS & FULFILLMENT TAB */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div>
            <h3 className="font-bold text-sm text-neutral-800">
              Sub-Orders Dispatch & Fulfillment ({sellerSubOrders.length})
            </h3>
            <p className="text-xs text-neutral-500">
              Only orders containing products fulfilled by {currentSeller.businessName} are shown
              here.
            </p>
          </div>

          <div className="space-y-4">
            {sellerSubOrders.map((sub) => (
              <div
                key={sub.id}
                className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs p-4 text-xs"
              >
                <div className="flex flex-wrap justify-between items-center border-b border-neutral-100 pb-3 gap-2">
                  <div>
                    <span className="font-mono font-bold text-sm text-neutral-900">
                      {sub.subOrderNumber}
                    </span>
                    <span className="text-neutral-400 mx-2">•</span>
                    <span className="text-neutral-500">
                      Placed on {new Date(sub.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <span
                    className={`font-bold px-2 py-0.5 rounded text-[11px] uppercase ${
                      sub.status === 'delivered'
                        ? 'bg-emerald-100 text-emerald-800'
                        : sub.status === 'dispatched'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {sub.status.replace('_', ' ')}
                  </span>
                </div>

                {/* Items */}
                <div className="py-3 space-y-2">
                  {sub.items.map((it) => (
                    <div key={it.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img
                          src={it.productImage}
                          alt={it.productName}
                          className="w-10 h-10 object-cover rounded border"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <div className="font-semibold text-neutral-900">{it.productName}</div>
                          <div className="text-[11px] text-neutral-500">
                            Qty: {it.quantity} • Unit: {formatKSh(it.price)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-neutral-900">{formatKSh(it.subtotal)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Financial breakdown */}
                <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200 flex flex-wrap justify-between items-center text-[11px] text-neutral-600 gap-2">
                  <div>Package Subtotal: {formatKSh(sub.subtotal)}</div>
                  <div>Platform Commission ({currentSeller.commissionRate}%): -{formatKSh(sub.commissionTotal)}</div>
                  <div className="font-bold text-neutral-900">
                    Net Seller Payout: {formatKSh(sub.sellerNetTotal)}
                  </div>
                </div>

                {/* Fulfillment Actions */}
                <div className="mt-4 pt-3 border-t border-neutral-100 flex flex-wrap justify-between items-center gap-3">
                  <div className="flex items-center gap-2">
                    {sub.status === 'ready_for_dispatch' && (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Carrier Tracking # (e.g. TRK-JUM-991)"
                          value={dispatchTrackingInput[sub.id] || ''}
                          onChange={(e) =>
                            setDispatchTrackingInput({
                              ...dispatchTrackingInput,
                              [sub.id]: e.target.value,
                            })
                          }
                          className="p-1.5 text-xs border border-neutral-300 rounded w-52"
                        />
                        <button
                          onClick={() => {
                            const trk =
                              dispatchTrackingInput[sub.id] || `TRK-JUM-${Math.floor(10000 + Math.random() * 90000)}`;
                            updateSubOrderStatus(sub.id, 'dispatched', trk);
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded flex items-center gap-1"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          Hand Over to Courier
                        </button>
                      </div>
                    )}

                    {sub.status === 'processing' && (
                      <button
                        onClick={() => updateSubOrderStatus(sub.id, 'ready_for_dispatch')}
                        className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-4 py-1.5 rounded"
                      >
                        Accept & Pack Order
                      </button>
                    )}

                    {sub.status === 'dispatched' && (
                      <button
                        onClick={() => updateSubOrderStatus(sub.id, 'delivered')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Simulate Customer Delivery
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => window.print()}
                    className="text-neutral-600 hover:text-neutral-900 flex items-center gap-1 font-semibold"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Print Packing Slip
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* EARNINGS & PAYOUTS TAB */}
      {activeTab === 'payouts' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-xs">
              <span className="text-xs font-semibold text-neutral-500 uppercase">
                Available for Withdrawal
              </span>
              <div className="text-2xl font-extrabold text-emerald-700 mt-1">
                {formatKSh(currentSeller.availableBalance)}
              </div>
              <p className="text-[11px] text-neutral-400 mt-1">
                Cleared funds from completed deliveries
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-xs">
              <span className="text-xs font-semibold text-neutral-500 uppercase">
                Pending Settlement
              </span>
              <div className="text-2xl font-extrabold text-blue-600 mt-1">
                {formatKSh(currentSeller.pendingBalance)}
              </div>
              <p className="text-[11px] text-neutral-400 mt-1">
                Under active transit / customer return window
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-xs">
              <span className="text-xs font-semibold text-neutral-500 uppercase">
                Total Payouts Disbursed
              </span>
              <div className="text-2xl font-extrabold text-neutral-800 mt-1">
                {formatKSh(currentSeller.totalPayouts)}
              </div>
              <p className="text-[11px] text-neutral-400 mt-1">Lifetime historical withdrawals</p>
            </div>
          </div>

          {/* Past Payout Requests Table */}
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs">
            <div className="p-4 bg-neutral-50 border-b border-neutral-200 flex justify-between items-center">
              <h3 className="font-bold text-sm text-neutral-800">Disbursement History</h3>
              <button
                onClick={() => {
                  setPayoutAccount(currentSeller.payoutAccount);
                  setShowPayoutModal(true);
                }}
                disabled={currentSeller.availableBalance < 2000}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-1.5 px-3 rounded disabled:opacity-40"
              >
                + Request Payout
              </button>
            </div>

            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 border-b border-neutral-200 font-bold text-neutral-600 uppercase text-[11px]">
                <tr>
                  <th className="p-3">Reference</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Method & Destination</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Requested Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {sellerPayouts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-neutral-400">
                      No payout records found.
                    </td>
                  </tr>
                ) : (
                  sellerPayouts.map((pay) => (
                    <tr key={pay.id} className="hover:bg-neutral-50/60">
                      <td className="p-3 font-mono font-bold text-neutral-800">
                        {pay.payoutNumber}
                      </td>
                      <td className="p-3 font-extrabold text-neutral-900">
                        {formatKSh(pay.amount)}
                      </td>
                      <td className="p-3">
                        <span className="uppercase font-semibold text-neutral-700">
                          {pay.method}:
                        </span>{' '}
                        <span className="text-neutral-500 font-mono text-[11px]">
                          {pay.accountDetails}
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            pay.status === 'approved' || pay.status === 'processed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : pay.status === 'rejected'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {pay.status}
                        </span>
                      </td>
                      <td className="p-3 text-neutral-500">
                        {new Date(pay.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* STORE SETTINGS & KYC TAB */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-xs max-w-2xl space-y-4 text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
            <div>
              <h3 className="font-bold text-sm text-neutral-900">Merchant Profile & KYC Documents</h3>
              <p className="text-neutral-500">
                Official registration and tax credentials for compliance.
              </p>
            </div>
            <span className="flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
              <ShieldCheck className="w-4 h-4" />
              Verified Merchant
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-neutral-500 mb-1">Business Registered Name</label>
              <input
                type="text"
                defaultValue={currentSeller.businessName}
                onBlur={(e) => updateSellerProfile(currentSeller.id, { businessName: e.target.value })}
                className="w-full p-2 border border-neutral-300 rounded font-semibold"
              />
            </div>

            <div>
              <label className="block text-neutral-500 mb-1">Owner / Director Name</label>
              <input
                type="text"
                defaultValue={currentSeller.ownerName}
                onBlur={(e) => updateSellerProfile(currentSeller.id, { ownerName: e.target.value })}
                className="w-full p-2 border border-neutral-300 rounded font-semibold"
              />
            </div>

            <div>
              <label className="block text-neutral-500 mb-1">Tax PIN (KRA)</label>
              <input
                type="text"
                disabled
                defaultValue={currentSeller.taxPin}
                className="w-full p-2 border border-neutral-200 bg-neutral-50 rounded font-mono text-neutral-600"
              />
            </div>

            <div>
              <label className="block text-neutral-500 mb-1">Business Registration Certificate #</label>
              <input
                type="text"
                disabled
                defaultValue={currentSeller.businessRegNumber}
                className="w-full p-2 border border-neutral-200 bg-neutral-50 rounded font-mono text-neutral-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-neutral-500 mb-1">Storefront Description</label>
            <textarea
              rows={3}
              defaultValue={currentSeller.description}
              onBlur={(e) => updateSellerProfile(currentSeller.id, { description: e.target.value })}
              className="w-full p-2 border border-neutral-300 rounded"
            />
          </div>

          <div>
            <label className="block text-neutral-500 mb-1">Default Settlement Account</label>
            <input
              type="text"
              defaultValue={currentSeller.payoutAccount}
              onBlur={(e) => updateSellerProfile(currentSeller.id, { payoutAccount: e.target.value })}
              className="w-full p-2 border border-neutral-300 rounded font-mono"
            />
          </div>
        </div>
      )}
        </div>
      </div>

      {/* Add Product Modal */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-2xl relative">
            <h3 className="font-bold text-base text-neutral-900 mb-1">
              Add New Product to Storefront
            </h3>
            <p className="text-xs text-neutral-500 mb-4">
              Enter product specifications, pricing, stock and optional variation matrix.
            </p>

            <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">
                    Product Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Anker Prime 67W GaN Wall Charger"
                    value={newProdName}
                    onChange={(e) => setNewProdName(e.target.value)}
                    className="w-full p-2 border border-neutral-300 rounded"
                  />
                </div>

                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Base SKU *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ANK-PRIME-67W"
                    value={newProdSku}
                    onChange={(e) => setNewProdSku(e.target.value.toUpperCase())}
                    className="w-full p-2 border border-neutral-300 rounded font-mono"
                  />
                </div>

                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Category</label>
                  <select
                    value={newProdCategory}
                    onChange={(e) => setNewProdCategory(e.target.value)}
                    className="w-full p-2 border border-neutral-300 rounded"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Brand</label>
                  <select
                    value={newProdBrand}
                    onChange={(e) => setNewProdBrand(e.target.value)}
                    className="w-full p-2 border border-neutral-300 rounded"
                  >
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">
                    Original Price (KSh) *
                  </label>
                  <input
                    type="number"
                    required
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(Number(e.target.value))}
                    className="w-full p-2 border border-neutral-300 rounded"
                  />
                </div>

                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">
                    Discount Price (Optional)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 8999"
                    value={newProdDiscount || ''}
                    onChange={(e) =>
                      setNewProdDiscount(e.target.value ? Number(e.target.value) : undefined)
                    }
                    className="w-full p-2 border border-neutral-300 rounded"
                  />
                </div>

                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">
                    Stock Quantity *
                  </label>
                  <input
                    type="number"
                    required
                    value={newProdStock}
                    onChange={(e) => setNewProdStock(Number(e.target.value))}
                    className="w-full p-2 border border-neutral-300 rounded"
                  />
                </div>

                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Condition</label>
                  <select
                    value={newProdCondition}
                    onChange={(e) => setNewProdCondition(e.target.value as any)}
                    className="w-full p-2 border border-neutral-300 rounded"
                  >
                    <option value="Brand New">Brand New</option>
                    <option value="Refurbished">Refurbished</option>
                    <option value="Open Box">Open Box</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-neutral-600 font-semibold mb-1">Image URL</label>
                <input
                  type="url"
                  value={newProdImage}
                  onChange={(e) => setNewProdImage(e.target.value)}
                  className="w-full p-2 border border-neutral-300 rounded"
                />
              </div>

              <div>
                <label className="block text-neutral-600 font-semibold mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newProdDesc}
                  onChange={(e) => setNewProdDesc(e.target.value)}
                  placeholder="Key features, specs and what is in the box..."
                  className="w-full p-2 border border-neutral-300 rounded"
                />
              </div>

              {/* Variation Option */}
              <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                <label className="flex items-center gap-2 font-semibold text-neutral-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasVariants}
                    onChange={(e) => setHasVariants(e.target.checked)}
                  />
                  <span>This product has size, color or storage variations</span>
                </label>

                {hasVariants && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-neutral-500">Color</label>
                      <input
                        type="text"
                        value={variantColor}
                        onChange={(e) => setVariantColor(e.target.value)}
                        className="w-full p-1.5 border rounded bg-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-neutral-500">Spec / Storage</label>
                      <input
                        type="text"
                        value={variantStorage}
                        onChange={(e) => setVariantStorage(e.target.value)}
                        className="w-full p-1.5 border rounded bg-white text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded"
                >
                  Save & Publish Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payout Request Modal */}
      {showPayoutModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="font-bold text-base text-neutral-900 mb-1 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              Request Payout Disbursement
            </h3>
            <p className="text-xs text-neutral-500 mb-4">
              Funds will be disbursed to your registered M-Pesa or Bank account after administrative
              audit.
            </p>

            <form onSubmit={handleRequestPayoutSubmit} className="space-y-4 text-xs">
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg font-semibold flex justify-between">
                <span>Available Balance:</span>
                <span className="font-bold">{formatKSh(currentSeller.availableBalance)}</span>
              </div>

              <div>
                <label className="block text-neutral-600 font-semibold mb-1">
                  Withdrawal Amount (Min KSh 2,000) *
                </label>
                <input
                  type="number"
                  min={2000}
                  max={currentSeller.availableBalance}
                  required
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(Number(e.target.value))}
                  className="w-full p-2 border border-neutral-300 rounded font-bold text-sm"
                />
              </div>

              <div>
                <label className="block text-neutral-600 font-semibold mb-1">Disbursement Channel</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPayoutMethod('mpesa')}
                    className={`p-2 rounded border font-semibold text-center ${
                      payoutMethod === 'mpesa'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                        : 'border-neutral-200'
                    }`}
                  >
                    M-Pesa B2C
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayoutMethod('bank')}
                    className={`p-2 rounded border font-semibold text-center ${
                      payoutMethod === 'bank'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                        : 'border-neutral-200'
                    }`}
                  >
                    Bank EFT / RTGS
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-neutral-600 font-semibold mb-1">
                  Recipient Account Details
                </label>
                <input
                  type="text"
                  required
                  value={payoutAccount}
                  onChange={(e) => setPayoutAccount(e.target.value)}
                  placeholder="e.g. +254712345678 or Equity Bank Acc 081029..."
                  className="w-full p-2 border border-neutral-300 rounded font-mono"
                />
              </div>

              {payoutMessage && (
                <div
                  className={`p-2.5 rounded text-xs font-semibold ${
                    payoutMessage.success
                      ? 'bg-emerald-50 text-emerald-800'
                      : 'bg-red-50 text-red-800'
                  }`}
                >
                  {payoutMessage.text}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPayoutModal(false)}
                  className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded"
                >
                  Submit Payout Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
