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
import { RestApiExplorer } from './components/api/RestApiExplorer';
import { LaravelArchitectureViewer } from './components/laravel/LaravelArchitectureViewer';
import { Footer } from './components/Footer';
import { Product, MasterOrder } from './types';
import {
  SlidersHorizontal,
  ArrowUpDown,
  RotateCcw,
  CheckCircle2,
  Sparkles,
  ShoppingBag,
  Store,
  ShieldCheck,
  Zap,
} from 'lucide-react';

function MarketplaceApp() {
  const { products, categories, brands, formatKSh } = useMarketplace();

  // Navigation & Modals View state
  const [activeView, setActiveView] = useState<
    'storefront' | 'seller' | 'admin' | 'customer' | 'api' | 'laravel'
  >('storefront');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<Product | null>(null);

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
        if (onlyOfficial && !p.isFeatured) {
          // Check if seller is official
          const brand = brands.find((b) => b.id === p.brandId);
          if (!brand?.isOfficial) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const priceA = a.discountPrice || a.price;
        const priceB = b.discountPrice || b.price;

        if (sortBy === 'price_asc') return priceA - priceB;
        if (sortBy === 'price_desc') return priceB - priceA;
        if (sortBy === 'rating') return b.rating - a.rating;
        if (sortBy === 'popular') return b.reviewsCount - a.reviewsCount;
        return 0; // relevance
      });
  }, [
    products,
    searchQuery,
    selectedCategory,
    selectedBrand,
    minPrice,
    maxPrice,
    onlyOfficial,
    sortBy,
    brands,
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
        onOpenAccount={() => setActiveView('customer')}
        onSelectCategory={(catId) => {
          setSelectedCategory(catId);
          if (activeView !== 'storefront') setActiveView('storefront');
        }}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        activeView={activeView}
        setActiveView={setActiveView}
      />

      {/* 2. Main Body Content Switcher */}
      <main className="flex-1">
        {/* VIEW 1: CUSTOMER STOREFRONT */}
        {activeView === 'storefront' && (
          <div className="max-w-7xl mx-auto px-4">
            {/* Show Hero & Promos only when browsing top-level without search */}
            {!hasActiveFilters && (
              <>
                <HeroSection
                  onSelectCategory={(catId) => setSelectedCategory(catId)}
                  onOpenSellerPortal={() => setActiveView('seller')}
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
          <CustomerPortal
            onViewProduct={(prodId) => {
              const p = products.find((prod) => prod.id === prodId);
              if (p) {
                setSelectedProductForDetail(p);
              }
            }}
          />
        )}

        {/* VIEW 3: SELLER CENTER PORTAL (WITH SIDEBAR) */}
        {activeView === 'seller' && <SellerPortal />}

        {/* VIEW 4: ADMIN CONTROL HUB (WITH SIDEBAR) */}
        {activeView === 'admin' && <AdminControlHub />}

        {/* VIEW 5: REST API EXPLORER */}
        {activeView === 'api' && <RestApiExplorer />}

        {/* VIEW 6: LARAVEL ARCHITECTURE & CODEBASE */}
        {activeView === 'laravel' && <LaravelArchitectureViewer />}
      </main>

      {/* 3. Global Footer */}
      <Footer />

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
