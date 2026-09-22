import React, { useState, useMemo } from 'react';
import { MarketplaceProvider, useMarketplace } from './context/MarketplaceContext';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/storefront/HeroSection';
import { FlashSalesSection } from './components/storefront/FlashSalesSection';
import { OfficialStoresSection } from './components/storefront/OfficialStoresSection';
import { ProductCard } from './components/storefront/ProductCard';
import { ProductDetailModal } from './components/storefront/ProductDetailModal';
import { CartDrawer } from './components/storefront/CartDrawer';
import { CheckoutModal } from './components/storefront/CheckoutModal';
import { CustomerAccountModal } from './components/storefront/CustomerAccountModal';
import { CustomerPortal } from './components/customer/CustomerPortal';
import { SellerPortal } from './components/seller/SellerPortal';
import { AdminControlHub } from './components/admin/AdminControlHub';
import { AuthModal } from './components/auth/AuthModal';
import { Footer } from './components/Footer';
import { PublicInfoPage, PublicPageSlug } from './components/PublicInfoPage';
import { Product, MasterOrder, Role } from './types';
import {
  SlidersHorizontal,
  ArrowUpDown,
  RotateCcw,
  CheckCircle2,
  Sparkles,
  ShoppingBag,
  Store,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Zap,
  Bell,
  Search,
  CalendarDays,
  Home,
  Users,
  Boxes,
  Wallet,
  Ticket,
  MapPinned,
  Settings,
  ChevronRight,
  Package,
  FileText,
} from 'lucide-react';

interface DashboardShellProps {
  title: string;
  subtitle: string;
  navItems: Array<{ label: string; icon: React.ReactNode; active?: boolean; badge?: number }>; 
  rightHeaderLabel: string;
  onNavigate?: (label: string) => void;
  children: React.ReactNode;
}

const DashboardShell: React.FC<DashboardShellProps> = ({
  title,
  subtitle,
  navItems,
  rightHeaderLabel,
  onNavigate,
  children,
}) => {
  const [selectedNav, setSelectedNav] = useState<string>(navItems.find((item) => item.active)?.label || navItems[0]?.label || '');

  return (
    <div className="min-h-[calc(100vh-72px)] w-full bg-[#eef0f2]">
      <div className="grid grid-cols-1 xl:grid-cols-[260px_minmax(0,1fr)] w-full h-[calc(100vh-72px)] overflow-hidden">
        <aside className="bg-[#0d1420] text-white border-r border-neutral-800 overflow-hidden flex flex-col h-full sticky top-0">
          <div className="px-5 py-4 border-b border-neutral-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500 text-neutral-950 font-black text-lg flex items-center justify-center">
              K
            </div>
            <div>
              <div className="font-black tracking-tight text-xl">KESALES<span className="text-amber-500">.</span></div>
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-400">Admin hub</div>
            </div>
          </div>

          <nav className="p-3 space-y-1.5">
            {navItems.map(({ label, icon, badge }) => {
              const isActive = selectedNav === label;

              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    setSelectedNav(label);
                    onNavigate?.(label);
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors cursor-pointer ${
                    isActive ? 'bg-[#1b2d3e] text-amber-300 border-l-2 border-amber-400' : 'text-neutral-200 hover:bg-white/5'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className="text-lg leading-none">{icon}</span>
                    <span className="font-semibold text-sm">{label}</span>
                  </span>
                  {badge !== undefined && badge > 0 ? (
                    <span className="min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>

          <div className="mt-auto border-t border-neutral-800 p-4">
            <div className="flex items-center gap-3 bg-[#101a27] border border-neutral-700 p-3">
              <span className="inline-flex h-3 w-3 rounded-full bg-emerald-400" />
              <div className="flex-1">
                <div className="text-[12px] font-bold text-white">System status</div>
                <div className="text-[11px] text-emerald-300">Healthy</div>
              </div>
            </div>
          </div>
        </aside>

        <div className="bg-[#f3f4f6] h-full overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

function MarketplaceApp() {
  const { products, categories, brands, formatKSh, authUser } = useMarketplace();

  // Navigation & Modals View state
  const [activeView, setActiveView] = useState<
    'storefront' | 'seller' | 'admin' | 'customer'
  >('storefront');
  const [customerTab, setCustomerTab] = useState<
    'orders' | 'wishlist' | 'addresses' | 'returns' | 'payments' | 'security'
  >('orders');
  const [sellerTab, setSellerTab] = useState<
    'dashboard' | 'products' | 'inventory' | 'orders' | 'payouts' | 'verification' | 'settings'
  >('dashboard');
  const [adminTab, setAdminTab] = useState<
    'analytics' | 'users' | 'roles' | 'security' | 'audit' | 'system' | 'sellers' | 'catalog' | 'orders' | 'finance' | 'coupons' | 'logistics' | 'settings'
  >('analytics');
  const [publicPage, setPublicPage] = useState<PublicPageSlug | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<Product | null>(null);

  // Real Authentication Modal state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register_customer' | 'register_seller'>('login');

  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [minPrice, setMinPrice] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(200000);
  const [onlyExpress, setOnlyExpress] = useState(false);
  const [onlyOfficial, setOnlyOfficial] = useState(false);
  const [sortBy, setSortBy] = useState<
    'relevance' | 'price_asc' | 'price_desc' | 'rating' | 'popular'
  >('relevance');

  // Filtered & Sorted Product Collection
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Status check
        if (p.status !== 'active') return false;

        // Search text matching name, description, brand, or SKU
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesTitle = p.name.toLowerCase().includes(q);
          const matchesDesc = p.description.toLowerCase().includes(q);
          const matchesSku = p.sku.toLowerCase().includes(q);
          if (!matchesTitle && !matchesDesc && !matchesSku) return false;
        }

        // Category filter
        if (selectedCategory !== 'all' && p.categoryId !== selectedCategory) {
          return false;
        }

        // Brand filter
        if (selectedBrand !== 'all' && p.brandId !== selectedBrand) {
          return false;
        }

        // Price range
        const effectivePrice = p.discountPrice || p.price;
        if (effectivePrice < minPrice || effectivePrice > maxPrice) {
          return false;
        }

        // Official Stores filter
        if (onlyOfficial) {
          // Check if seller is official
          const brand = brands.find((b) => b.id === p.brandId);
          if (!brand?.isOfficial) return false;
        }

        if (onlyExpress && !p.isExpress) return false;

        return true;
      })
      .sort((a, b) => {
        const priceA = a.discountPrice || a.price;
        const priceB = b.discountPrice || b.price;

        if (sortBy === 'price_asc') return priceA - priceB;
        if (sortBy === 'price_desc') return priceB - priceA;
        if (sortBy === 'rating') return b.rating - a.rating;
        if (sortBy === 'popular') return b.reviewsCount - a.reviewsCount;
        const query = searchQuery.trim().toLowerCase();
        if (!query) return (Number(b.isFeatured) - Number(a.isFeatured)) || b.reviewsCount - a.reviewsCount;
        const score = (product: Product) => {
          const brand = brands.find((item) => item.id === product.brandId)?.name.toLowerCase() || '';
          const category = categories.find((item) => item.id === product.categoryId)?.name.toLowerCase() || '';
          const name = product.name.toLowerCase();
          const description = `${product.shortDescription} ${product.description}`.toLowerCase();
          return (name === query ? 100 : 0) +
            (name.includes(query) ? 40 : 0) +
            (brand.includes(query) ? 25 : 0) +
            (category.includes(query) ? 20 : 0) +
            (description.includes(query) ? 10 : 0) +
            product.rating * 2 + Math.log10(product.reviewsCount + 1);
        };
        return score(b) - score(a);
      });
  }, [
    products,
    searchQuery,
    selectedCategory,
    selectedBrand,
    minPrice,
    maxPrice,
    onlyExpress,
    onlyOfficial,
    sortBy,
    brands,
    categories,
  ]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedBrand('all');
    setMinPrice(0);
    setMaxPrice(200000);
    setOnlyExpress(false);
    setOnlyOfficial(false);
    setSortBy('relevance');
  };

  const hasActiveFilters =
    searchQuery !== '' ||
    selectedCategory !== 'all' ||
    selectedBrand !== 'all' ||
    minPrice > 0 ||
    maxPrice < 200000 ||
    onlyExpress ||
    onlyOfficial;

  const handleCheckoutInitiated = () => {
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const handleOrderCompleted = (order: MasterOrder) => {
    // Optionally trigger feedback or state
  };

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col font-sans text-neutral-900 selection:bg-amber-500 selection:text-white">
      {/* 1. Global Navigation Bar */}
      <Navbar
        onOpenCart={() => setIsCartOpen(true)}
        onOpenAccount={() => {
          if (!authUser) {
            setAuthModalTab('login');
            setIsAuthModalOpen(true);
          } else {
            setActiveView('customer');
          }
        }}
        onSelectCategory={(catId) => {
          setSelectedCategory(catId);
          if (activeView !== 'storefront') setActiveView('storefront');
        }}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        activeView={activeView}
        setActiveView={setActiveView}
        onOpenAuthModal={(tab) => {
          setAuthModalTab(tab || 'login');
          setIsAuthModalOpen(true);
        }}
        onBackToStorefront={() => {
          setPublicPage(null);
          setActiveView('storefront');
        }}
      />

      {/* 2. Main Body Content Switcher */}
      <main className="flex-1">
        {/* VIEW 1: CUSTOMER STOREFRONT */}
        {activeView === 'storefront' && publicPage && (
          <PublicInfoPage
            slug={publicPage}
            onBack={() => setPublicPage(null)}
            onOpenAuth={(tab) => {
              setAuthModalTab(tab || 'login');
              setIsAuthModalOpen(true);
            }}
          />
        )}

        {activeView === 'storefront' && !publicPage && (
          <div className="max-w-7xl mx-auto px-4">
            {/* Show Hero & Promos only when browsing top-level without search */}
            {!hasActiveFilters && (
              <>
                <HeroSection
                  onSelectCategory={(catId) => setSelectedCategory(catId)}
                  onOpenSellerPortal={() => {
                    if (authUser?.role === 'seller') {
                      setActiveView('seller');
                    } else {
                      setAuthModalTab('register_seller');
                      setIsAuthModalOpen(true);
                    }
                  }}
                />
                <FlashSalesSection
                  onViewProduct={(product) => setSelectedProductForDetail(product)}
                />
                <OfficialStoresSection
                  onSelectBrand={(brandId) => setSelectedBrand(brandId)}
                />
              </>
            )}

            {/* Catalog Grid Area with Filtering Sidebar */}
            <div className="my-6">
              {/* Filter / Search Header */}
              <div className="bg-white rounded-lg border border-neutral-200 p-4 mb-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-neutral-900 flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-amber-500" />
                    <span>
                      {selectedCategory !== 'all'
                        ? categories.find((c) => c.id === selectedCategory)?.name
                        : 'Explore All Products'}
                    </span>
                    <span className="text-xs text-neutral-400 font-normal">
                      ({filteredProducts.length} items found)
                    </span>
                  </h3>
                  {hasActiveFilters && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-neutral-500">Filtered results</span>
                      <button
                        onClick={resetFilters}
                        className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1 font-semibold"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Clear All Filters
                      </button>
                    </div>
                  )}
                </div>

                {/* Sort dropdown */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-neutral-500 font-medium">Sort By:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="p-1.5 border border-neutral-300 rounded bg-white font-medium text-neutral-800 focus:outline-none focus:border-amber-500"
                  >
                    <option value="relevance">Popularity / Relevance</option>
                    <option value="price_asc">Price: Lowest to Highest</option>
                    <option value="price_desc">Price: Highest to Lowest</option>
                    <option value="rating">Product Rating</option>
                    <option value="popular">Most Reviewed</option>
                  </select>
                </div>
              </div>

              {/* Main Grid: Sidebar Filters (3 cols) + Product Grid (9 cols) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Filter Sidebar */}
                <div className="lg:col-span-3 space-y-4">
                  <div className="bg-white rounded-lg border border-neutral-200 p-4 shadow-xs">
                    <div className="font-bold text-xs uppercase tracking-wider text-neutral-700 pb-3 border-b border-neutral-200 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        Filter Catalog
                      </span>
                      {hasActiveFilters && (
                        <button
                          onClick={resetFilters}
                          className="text-[11px] text-amber-600 font-normal hover:underline"
                        >
                          Reset
                        </button>
                      )}
                    </div>

                    {/* Category Filter */}
                    <div className="py-3 border-b border-neutral-100">
                      <label className="block text-xs font-bold text-neutral-800 mb-2">Category</label>
                      <div className="space-y-1.5 text-xs text-neutral-600">
                        <div
                          onClick={() => setSelectedCategory('all')}
                          className={`cursor-pointer px-2 py-1 rounded transition-colors ${
                            selectedCategory === 'all'
                              ? 'bg-amber-50 text-amber-700 font-bold'
                              : 'hover:bg-neutral-50'
                          }`}
                        >
                          All Categories
                        </div>
                        {categories.map((c) => (
                          <div
                            key={c.id}
                            onClick={() => setSelectedCategory(c.id)}
                            className={`cursor-pointer px-2 py-1 rounded transition-colors ${
                              selectedCategory === c.id
                                ? 'bg-amber-50 text-amber-700 font-bold'
                                : 'hover:bg-neutral-50'
                            }`}
                          >
                            {c.name}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Brand Filter */}
                    <div className="py-3 border-b border-neutral-100">
                      <label className="block text-xs font-bold text-neutral-800 mb-2">Brand</label>
                      <div className="space-y-1.5 text-xs text-neutral-600">
                        <div
                          onClick={() => setSelectedBrand('all')}
                          className={`cursor-pointer px-2 py-1 rounded transition-colors ${
                            selectedBrand === 'all'
                              ? 'bg-amber-50 text-amber-700 font-bold'
                              : 'hover:bg-neutral-50'
                          }`}
                        >
                          All Brands
                        </div>
                        {brands.map((b) => (
                          <div
                            key={b.id}
                            onClick={() => setSelectedBrand(b.id)}
                            className={`cursor-pointer px-2 py-1 rounded transition-colors ${
                              selectedBrand === b.id
                                ? 'bg-amber-50 text-amber-700 font-bold'
                                : 'hover:bg-neutral-50'
                            }`}
                          >
                            {b.name}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Price Range Filter */}
                    <div className="py-3 border-b border-neutral-100">
                      <label className="block text-xs font-bold text-neutral-800 mb-2">
                        Price (KSh)
                      </label>
                      <div className="flex items-center gap-2 text-xs">
                        <input
                          type="number"
                          placeholder="Min"
                          value={minPrice || ''}
                          onChange={(e) => setMinPrice(Number(e.target.value))}
                          className="w-full p-1.5 border border-neutral-300 rounded text-center text-xs"
                        />
                        <span>-</span>
                        <input
                          type="number"
                          placeholder="Max"
                          value={maxPrice || ''}
                          onChange={(e) => setMaxPrice(Number(e.target.value))}
                          className="w-full p-1.5 border border-neutral-300 rounded text-center text-xs"
                        />
                      </div>
                    </div>

                    {/* Checkbox toggles */}
                    <div className="pt-3 space-y-2 text-xs">
                      <label className="flex items-center gap-2 cursor-pointer text-neutral-700">
                        <input
                          type="checkbox"
                          checked={onlyExpress}
                          onChange={(e) => setOnlyExpress(e.target.checked)}
                          className="rounded text-amber-500"
                        />
                        <span>KESALES Express eligible</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-neutral-700">
                        <input
                          type="checkbox"
                          checked={onlyOfficial}
                          onChange={(e) => setOnlyOfficial(e.target.checked)}
                          className="rounded text-amber-500"
                        />
                        <span>Official Brand Stores Only</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Product Grid (9 cols) */}
                <div className="lg:col-span-9">
                  {filteredProducts.length === 0 ? (
                    <div className="bg-white rounded-lg border border-neutral-200 p-12 text-center shadow-xs">
                      <ShoppingBag className="w-12 h-12 text-neutral-300 mx-auto mb-2" />
                      <h4 className="font-bold text-sm text-neutral-800">No matching products found</h4>
                      <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                        Try modifying your search term or adjusting filter bounds to view more items.
                      </p>
                      <button
                        onClick={resetFilters}
                        className="mt-4 px-4 py-2 bg-amber-500 text-white font-bold text-xs rounded hover:bg-amber-600"
                      >
                        Reset All Filters
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                      {filteredProducts.map((prod) => (
                        <ProductCard
                          key={prod.id}
                          product={prod}
                          onViewProduct={(p) => setSelectedProductForDetail(p)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: CUSTOMER ACCOUNT PORTAL (WITH SIDEBAR) */}
        {activeView === 'customer' && (
          <DashboardShell
            title={`Good morning, ${authUser?.name?.split(' ')[0] || 'Robert'}`}
            subtitle="Here’s what’s happening with your marketplace today."
            rightHeaderLabel={authUser?.name || 'Robert Otieno'}
            navItems={[
              { label: 'Dashboard', icon: <Home className="w-4 h-4" />, active: true },
              { label: 'My Orders', icon: <ShoppingBag className="w-4 h-4" />, badge: 2 },
              { label: 'Wishlist', icon: <Sparkles className="w-4 h-4" /> },
              { label: 'Saved Addresses', icon: <MapPinned className="w-4 h-4" /> },
              { label: 'Returns', icon: <RotateCcw className="w-4 h-4" /> },
              { label: 'Settings', icon: <Settings className="w-4 h-4" /> },
            ]}
            onNavigate={(label) => {
              const tabMap: Record<string, typeof customerTab> = {
                Dashboard: 'orders',
                'My Orders': 'orders',
                Wishlist: 'wishlist',
                'Saved Addresses': 'addresses',
                Returns: 'returns',
                Settings: 'security',
              };
              const nextTab = tabMap[label];
              if (nextTab) setCustomerTab(nextTab);
            }}
          >
            <CustomerPortal
              requestedTab={customerTab}
              onViewProduct={(prodId) => {
                const p = products.find((prod) => prod.id === prodId);
                if (p) {
                  setSelectedProductForDetail(p);
                }
              }}
            />
          </DashboardShell>
        )}

        {/* VIEW 3: SELLER CENTER PORTAL (RBAC Guarded) */}
        {activeView === 'seller' && (
          authUser?.role === 'seller' ? (
            <DashboardShell
              title={authUser?.name || 'Seller Dashboard'}
              subtitle="Manage your storefront, inventory, orders, and payouts from one view."
              rightHeaderLabel={authUser?.name || 'Seller'}
              navItems={[
                { label: 'Dashboard', icon: <Home className="w-4 h-4" />, active: true },
                { label: 'Products', icon: <Boxes className="w-4 h-4" /> },
                { label: 'Inventory', icon: <ShoppingBag className="w-4 h-4" /> },
                { label: 'Orders', icon: <Package className="w-4 h-4" />, badge: 1 },
                { label: 'Payouts', icon: <Wallet className="w-4 h-4" /> },
                { label: 'Verification', icon: <ShieldCheck className="w-4 h-4" /> },
                { label: 'Settings', icon: <Settings className="w-4 h-4" /> },
              ]}
              onNavigate={(label) => {
                const tabMap: Record<string, typeof sellerTab> = {
                  Dashboard: 'dashboard',
                  Products: 'products',
                  Inventory: 'inventory',
                  Orders: 'orders',
                  Payouts: 'payouts',
                  Verification: 'verification',
                  Settings: 'settings',
                };
                const nextTab = tabMap[label];
                if (nextTab) setSellerTab(nextTab);
              }}
            >
              <SellerPortal requestedTab={sellerTab} />
            </DashboardShell>
          ) : (
            <div className="max-w-2xl mx-auto my-12 p-8 bg-white rounded-2xl border border-neutral-200 shadow-md text-center">
              <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-emerald-600 border border-emerald-200">
                <Store className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-black text-neutral-900 mb-1">
                KESALES Seller Center
              </h2>
              <p className="text-xs text-neutral-600 max-w-md mx-auto mb-6">
                Access to the merchant portal requires an approved KESALES seller account. Sign in to your vendor profile or register your shop today.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => {
                    setAuthModalTab('login');
                    setIsAuthModalOpen(true);
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-lg text-xs transition-colors"
                >
                  Sign In as Seller
                </button>
                <button
                  onClick={() => {
                    setAuthModalTab('register_seller');
                    setIsAuthModalOpen(true);
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-colors"
                >
                  Register New Vendor Account
                </button>
              </div>
            </div>
          )
        )}

        {/* VIEW 4: ADMIN CONTROL HUB (RBAC Guarded) */}
        {activeView === 'admin' && (
          (authUser?.role === 'super_admin' ||
           authUser?.role === 'finance_admin' ||
           authUser?.role === 'seller_admin' ||
           authUser?.role === 'logistics_admin' ||
           authUser?.role === 'product_admin' ||
           authUser?.role === 'support_admin' ||
           authUser?.role === 'marketing_admin') ? (
            <DashboardShell
              title={`Good morning, ${authUser?.name?.split(' ')[0] || 'Robert'}`}
              subtitle="Here’s what’s happening with your marketplace today."
              rightHeaderLabel={authUser?.name || 'Robert Otieno'}
              navItems={[
                { label: 'Dashboard', icon: <Home className="w-4 h-4" />, active: true },
                { label: 'Users', icon: <Users className="w-4 h-4" /> },
                { label: 'Roles & Permissions', icon: <ShieldCheck className="w-4 h-4" /> },
                { label: 'Security Center', icon: <ShieldAlert className="w-4 h-4" /> },
                { label: 'System Controls', icon: <Settings className="w-4 h-4" /> },
                { label: 'Audit Logs', icon: <FileText className="w-4 h-4" /> },
                { label: 'Sellers & KYC', icon: <Users className="w-4 h-4" />, badge: 1 },
                { label: 'Catalog Moderation', icon: <Boxes className="w-4 h-4" /> },
                { label: 'Master Orders', icon: <ShoppingBag className="w-4 h-4" /> },
                { label: 'Finance & Ledger', icon: <Wallet className="w-4 h-4" /> },
                { label: 'Marketing Coupons', icon: <Ticket className="w-4 h-4" />, badge: 3 },
                { label: 'Delivery Zones', icon: <MapPinned className="w-4 h-4" />, badge: 47 },
                { label: 'System Settings', icon: <Settings className="w-4 h-4" /> },
              ]}
              onNavigate={(label) => {
                const tabMap: Record<string, typeof adminTab> = {
                  Dashboard: 'analytics',
                  Users: 'users',
                  'Roles & Permissions': 'roles',
                  'Security Center': 'security',
                  'System Controls': 'system',
                  'Audit Logs': 'audit',
                  'Sellers & KYC': 'sellers',
                  'Catalog Moderation': 'catalog',
                  'Master Orders': 'orders',
                  'Finance & Ledger': 'finance',
                  'Marketing Coupons': 'coupons',
                  'Delivery Zones': 'logistics',
                  'System Settings': 'settings',
                };
                const nextTab = tabMap[label];
                if (nextTab) setAdminTab(nextTab);
              }}
            >
              <AdminControlHub requestedTab={adminTab} />
            </DashboardShell>
          ) : (
            <div className="max-w-2xl mx-auto my-12 p-8 bg-white rounded-2xl border border-neutral-200 shadow-md text-center">
              <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-purple-700 border border-purple-200">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-black text-neutral-900 mb-1">
                Restricted Governance Area
              </h2>
              <p className="text-xs text-neutral-600 max-w-md mx-auto mb-6">
                This console is reserved exclusively for authenticated KESALES administrative staff (Finance, KYC Compliance, Super Admin).
              </p>
              <button
                onClick={() => {
                  setAuthModalTab('login');
                  setIsAuthModalOpen(true);
                }}
                className="px-6 py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-lg text-xs transition-colors inline-flex items-center gap-2"
              >
                <Lock className="w-4 h-4" />
                <span>Sign In with Staff Credentials</span>
              </button>
            </div>
          )
        )}

      </main>

      {/* Public storefront footer */}
      {activeView === 'storefront' && !publicPage && <Footer onOpenPage={setPublicPage} />}

      {/* 4. Real Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        defaultTab={authModalTab}
        onSuccess={(role) => {
          if (role === 'seller') {
            setActiveView('seller');
          } else if (
            role === 'super_admin' ||
            role === 'finance_admin' ||
            role === 'seller_admin' ||
            role === 'logistics_admin' ||
              role === 'product_admin' ||
              role === 'support_admin' ||
              role === 'marketing_admin'
          ) {
            setActiveView('admin');
          } else {
            setActiveView('storefront');
          }
        }}
      />

      {/* 4. Modals & Drawers */}
      {/* Product Detail Modal */}
      {selectedProductForDetail && (
        <ProductDetailModal
          product={selectedProductForDetail}
          isOpen={!!selectedProductForDetail}
          onClose={() => setSelectedProductForDetail(null)}
        />
      )}

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onProceedToCheckout={handleCheckoutInitiated}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onOrderCompleted={handleOrderCompleted}
      />

      {/* Customer Account & Orders Modal */}
      <CustomerAccountModal
        isOpen={isAccountOpen}
        onClose={() => setIsAccountOpen(false)}
        onViewProduct={(prodId) => {
          const p = products.find((prod) => prod.id === prodId);
          if (p) {
            setIsAccountOpen(false);
            setSelectedProductForDetail(p);
          }
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <MarketplaceProvider>
      <MarketplaceApp />
    </MarketplaceProvider>
  );
}
