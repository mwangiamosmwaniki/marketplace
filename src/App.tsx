import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppProvider, useApp } from "./context/AppContext";
import { DialogProvider } from "./context/DialogContext";
import { Navbar } from "./components/Navbar";
import { AccountTopbar, type AccountView } from "./components/AccountTopbar";
import { HeroSection } from "./components/storefront/HeroSection";
import { FlashSalesSection } from "./components/storefront/FlashSalesSection";
import { OfficialStoresSection } from "./components/storefront/OfficialStoresSection";
import { ProductCard } from "./components/storefront/ProductCard";
import { ProductDetailModal } from "./components/storefront/ProductDetailModal";
import { CartDrawer } from "./components/storefront/CartDrawer";
import { CheckoutModal } from "./components/storefront/CheckoutModal";
import { CustomerAccountModal } from "./components/storefront/CustomerAccountModal";
import { CustomerPortal } from "./components/customer/CustomerPortal";
import { SellerPortal } from "./components/seller/SellerPortal";
import { AdminControlHub } from "./components/admin/AdminControlHub";
import {
  FinanceAdminPanel,
  FinanceSection,
} from "./components/admin/finance/FinanceAdminPanel";
import { FINANCE_NAV } from "./config/permissions";
import { Footer } from "./components/Footer";
import { PublicInfoPage, PublicPageSlug } from "./components/PublicInfoPage";
import { Product, MasterOrder, Role } from "./types";
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
  Tags,
  Wallet,
  Ticket,
  MapPinned,
  Settings,
  ChevronRight,
  Package,
  FileText,
  CreditCard,
  BarChart3,
  Menu,
  X,
} from "lucide-react";

type NavigationState = {
  userId?: string;
  activeView: "storefront" | "seller" | "admin" | "finance" | "customer";
  financeSection: FinanceSection;
  customerTab:
    | "orders"
    | "wishlist"
    | "addresses"
    | "returns"
    | "payments"
    | "security";
  sellerTab:
    | "dashboard"
    | "products"
    | "inventory"
    | "orders"
    | "payouts"
    | "verification"
    | "settings";
  adminTab:
    | "analytics"
    | "users"
    | "roles"
    | "security"
    | "audit"
    | "system"
    | "sellers"
    | "catalog"
    | "categories"
    | "orders"
    | "coupons"
    | "logistics"
    | "settings";
};

interface DashboardShellProps {
  accountView: AccountView;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onBackToStorefront: () => void;
  title: string;
  subtitle: string;
  navItems: Array<{
    label: string;
    icon: React.ReactNode;
    active?: boolean;
    badge?: number;
    group?: string;
    path?: string;
  }>;
  rightHeaderLabel: string;
  onNavigate?: (label: string) => void;
  collapsibleGroups?: boolean;
  children: React.ReactNode;
}

const DashboardShell: React.FC<DashboardShellProps> = ({
  accountView,
  searchQuery,
  setSearchQuery,
  onBackToStorefront,
  title,
  subtitle,
  navItems,
  rightHeaderLabel,
  onNavigate,
  collapsibleGroups = true,
  children,
}) => {
  const [selectedNav, setSelectedNav] = useState<string>(
    navItems.find((item) => item.active)?.label || navItems[0]?.label || "",
  );
  const router = useRouter();
  useEffect(() => {
    const activeLabel = navItems.find((item) => item.active)?.label;
    if (activeLabel && activeLabel !== selectedNav) setSelectedNav(activeLabel);
  }, [navItems, selectedNav]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const groups = Array.from(
    new Set(navItems.map((item) => item.group).filter(Boolean)),
  ) as string[];
  const initialOpenGroups = groups.reduce<Record<string, boolean>>(
    (open, group) => {
      open[group] = navItems.some(
        (item) => item.group === group && item.label === selectedNav,
      );
      return open;
    },
    {},
  );
  const [openGroups, setOpenGroups] =
    useState<Record<string, boolean>>(initialOpenGroups);

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-white">
      <div
        className={`grid min-h-0 w-full flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)] ${sidebarCollapsed ? "xl:grid-cols-[76px_minmax(0,1fr)]" : "xl:grid-cols-[260px_minmax(0,1fr)]"} overflow-hidden`}
      >
        {mobileSidebarOpen && (
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileSidebarOpen(false)}
            className="fixed inset-0 top-14 z-40 bg-neutral-950/40 xl:hidden"
          />
        )}
        <aside
          className={`${mobileSidebarOpen ? "fixed inset-y-0 left-0 top-14 z-50 flex w-[min(82vw,280px)] h-[calc(100dvh-56px)] shadow-2xl" : "hidden"} bg-[#F0F2F5] text-neutral-900 border-r border-[#999999] overflow-hidden flex-col min-h-0 xl:relative xl:inset-auto xl:z-auto xl:flex xl:h-full xl:min-h-full xl:w-auto xl:shadow-none`}
        >
          <div
            className={`flex min-h-14 items-center gap-2 border-b border-[#999999] px-2 ${sidebarCollapsed ? "justify-center" : "justify-between"}`}
          >
            <div
              className={`flex min-w-0 items-center gap-2 ${sidebarCollapsed ? "justify-center" : ""}`}
              title={sidebarCollapsed ? "ShelterHub" : undefined}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-lg font-black text-neutral-950">
                ★
              </span>
              {!sidebarCollapsed && (
                <span className="min-w-0 leading-tight">
                  <span className="block truncate text-base font-black text-neutral-950">
                    ShelterHub
                  </span>
                  <span className="block truncate text-[9px] font-extrabold uppercase tracking-widest text-neutral-700">
                    {accountView === "admin"
                      ? "Admin Control Hub"
                      : accountView === "seller"
                        ? "Seller Center"
                        : accountView === "finance"
                          ? "Finance Console"
                          : "My Account"}
                  </span>
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
              className="shrink-0 rounded-lg p-2 text-neutral-700 hover:bg-black/10 hover:text-neutral-950"
              aria-label={
                sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
              }
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <ChevronRight
                className={`h-4 w-4 transition-transform ${sidebarCollapsed ? "" : "rotate-180"}`}
              />
            </button>
          </div>

          <nav className="p-3 space-y-1.5 flex-1 min-h-0 max-h-[45vh] overflow-y-auto scrollbar-thin xl:max-h-none">
            {navItems.map(({ label, icon, badge, group, path }, index) => {
              const isActive = selectedNav === label;
              const isGroupOpen =
                !collapsibleGroups ||
                sidebarCollapsed ||
                !group ||
                openGroups[group];

              return (
                <React.Fragment key={label}>
                  {!sidebarCollapsed &&
                    group &&
                    (index === 0 || navItems[index - 1]?.group !== group) &&
                    (collapsibleGroups ? (
                      <button
                        type="button"
                        onClick={() =>
                          setOpenGroups((current) => ({
                            ...current,
                            [group]: !current[group],
                          }))
                        }
                        className="w-full flex items-center justify-between px-3 pt-4 pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-700 hover:text-neutral-950"
                        aria-expanded={isGroupOpen}
                      >
                        <span>{group}</span>
                        <ChevronRight
                          className={`w-3.5 h-3.5 transition-transform ${isGroupOpen ? "rotate-90" : ""}`}
                        />
                      </button>
                    ) : (
                      <div className="px-3 pt-4 pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-700">
                        {group}
                      </div>
                    ))}
                  {isGroupOpen && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedNav(label);
                        setMobileSidebarOpen(false);
                        onNavigate?.(label);
                        if (path) router.push(path);
                      }}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors cursor-pointer ${
                        isActive
                          ? "bg-[#333333] text-white border-l-2 border-amber-400"
                          : "text-neutral-900 hover:bg-black/10"
                      }`}
                    >
                      <span
                        className={`flex items-center ${sidebarCollapsed ? "justify-center w-full" : "gap-3"}`}
                        title={sidebarCollapsed ? label : undefined}
                      >
                        <span className="text-lg leading-none">{icon}</span>
                        {!sidebarCollapsed && (
                          <span className="font-semibold text-sm">{label}</span>
                        )}
                      </span>
                      {badge !== undefined && badge > 0 ? (
                        <span className="min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                          {badge}
                        </span>
                      ) : null}
                    </button>
                  )}
                </React.Fragment>
              );
            })}
          </nav>

          <div className="mt-auto border-t border-[#999999] p-3 space-y-2">
            <button
              type="button"
              onClick={() => router.push("/")}
              className={`w-full flex items-center ${sidebarCollapsed ? "justify-center" : "gap-2.5"} px-3 py-2 rounded-lg bg-[#D0D0D0] hover:bg-[#A5A5A5] text-neutral-900 border border-[#999999] transition-colors text-xs font-semibold cursor-pointer`}
              title="Return to storefront"
            >
              <ShoppingBag className="w-4 h-4 text-amber-400 flex-shrink-0" />
              {!sidebarCollapsed && <span>View Storefront</span>}
            </button>
            <div
              className={`flex items-center ${sidebarCollapsed ? "justify-center" : "gap-3"} bg-[#D0D0D0] border border-[#999999] p-2.5`}
              title={
                sidebarCollapsed ? "System status: Operational" : undefined
              }
            >
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
              {!sidebarCollapsed && (
                <div className="flex-1">
                  <div className="text-[11px] font-bold text-neutral-900 leading-tight">
                    System status
                  </div>
                  <div className="text-[10px] font-semibold text-emerald-800 leading-tight">
                    Operational
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>

        <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
          <AccountTopbar
            view={accountView}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onBackToStorefront={onBackToStorefront}
            mobileSidebarOpen={mobileSidebarOpen}
            onToggleSidebar={() => setMobileSidebarOpen((open) => !open)}
          />
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

type AppRouteProps = {
  initialView?: NavigationState["activeView"];
  initialAdminTab?: NavigationState["adminTab"];
  initialSellerTab?: NavigationState["sellerTab"];
  initialCustomerTab?: NavigationState["customerTab"];
  initialFinanceSection?: NavigationState["financeSection"];
};

function MarketplaceApp({
  initialView,
  initialAdminTab,
  initialSellerTab,
  initialCustomerTab,
  initialFinanceSection,
}: AppRouteProps) {
  const router = useRouter();
  const {
    products,
    categories,
    brands,
    formatKSh,
    authUser,
    homepageSettings,
  } = useApp();
  const supportedCategories = categories.filter(
    (category) => category.isSupported !== false,
  );

  // Navigation & Modals View state
  const [isClientHydrated, setIsClientHydrated] = useState(false);

  useEffect(() => {
    setIsClientHydrated(true);
  }, []);

  const savedNavigation =
    isClientHydrated && typeof window !== "undefined"
      ? (() => {
          try {
            const saved = localStorage.getItem("shelterhub_navigation");
            return saved
              ? (JSON.parse(saved) as Partial<NavigationState>)
              : null;
          } catch {
            return null;
          }
        })()
      : null;
  const defaultView = initialView || "storefront";
  const [activeView, setActiveView] = useState<
    "storefront" | "seller" | "admin" | "finance" | "customer"
  >(() => initialView || defaultView);
  const [financeSection, setFinanceSection] = useState<FinanceSection>(
    () => initialFinanceSection || "overview",
  );
  const [customerTab, setCustomerTab] = useState<
    "orders" | "wishlist" | "addresses" | "returns" | "payments" | "security"
  >(() => initialCustomerTab || "orders");
  const [sellerTab, setSellerTab] = useState<
    | "dashboard"
    | "products"
    | "inventory"
    | "orders"
    | "payouts"
    | "verification"
    | "settings"
  >(() => initialSellerTab || "dashboard");
  const [adminTab, setAdminTab] = useState<
    | "analytics"
    | "users"
    | "roles"
    | "security"
    | "audit"
    | "system"
    | "sellers"
    | "catalog"
    | "categories"
    | "orders"
    | "coupons"
    | "logistics"
    | "settings"
  >(() => initialAdminTab || "analytics");

  // Keep state synchronized with incoming route props from URL navigation
  useEffect(() => {
    if (initialView) {
      setActiveView(initialView);
    }
  }, [initialView]);

  useEffect(() => {
    if (initialCustomerTab) {
      setCustomerTab(initialCustomerTab);
    }
  }, [initialCustomerTab]);

  useEffect(() => {
    if (initialSellerTab) {
      setSellerTab(initialSellerTab);
    }
  }, [initialSellerTab]);

  useEffect(() => {
    if (initialAdminTab) {
      setAdminTab(initialAdminTab);
    }
  }, [initialAdminTab]);

  useEffect(() => {
    if (initialFinanceSection) {
      setFinanceSection(initialFinanceSection);
    }
  }, [initialFinanceSection]);

  useEffect(() => {
    localStorage.setItem(
      "shelterhub_navigation",
      JSON.stringify({
        userId: authUser?.id,
        activeView,
        financeSection,
        customerTab,
        sellerTab,
        adminTab,
      }),
    );
  }, [
    authUser?.id,
    activeView,
    financeSection,
    customerTab,
    sellerTab,
    adminTab,
  ]);
  const [publicPage, setPublicPage] = useState<PublicPageSlug | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedProductForDetail, setSelectedProductForDetail] =
    useState<Product | null>(null);

  const openAuth = (
    tab?: "login" | "register_customer" | "register_seller",
  ) => {
    if (tab === "register_seller") router.push("/seller/register");
    else if (tab === "register_customer") router.push("/register");
    else router.push("/login");
  };

  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [minPrice, setMinPrice] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(200000);
  const [onlyExpress, setOnlyExpress] = useState(false);
  const [onlyOfficial, setOnlyOfficial] = useState(false);
  const [sortBy, setSortBy] = useState<
    "relevance" | "price_asc" | "price_desc" | "rating" | "popular"
  >("relevance");

  // Filtered & Sorted Product Collection
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Status check
        if (p.status !== "active") return false;

        // Search text matching name, description, brand, or SKU
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesTitle = p.name.toLowerCase().includes(q);
          const matchesDesc = p.description.toLowerCase().includes(q);
          const matchesSku = p.sku.toLowerCase().includes(q);
          if (!matchesTitle && !matchesDesc && !matchesSku) return false;
        }

        // Category filter
        if (selectedCategory !== "all" && p.categoryId !== selectedCategory)
          return false;
        if (selectedBrand !== "all" && p.brandId !== selectedBrand)
          return false;
        const productPrice = p.discountPrice || p.price;
        if (productPrice < minPrice || productPrice > maxPrice) return false;
        if (onlyExpress && !p.isExpress) return false;
        if (onlyOfficial) {
          const brand = brands.find((item) => item.id === p.brandId);
          if (!brand?.isOfficial) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const priceA = a.discountPrice || a.price;
        const priceB = b.discountPrice || b.price;

        if (sortBy === "price_asc") return priceA - priceB;
        if (sortBy === "price_desc") return priceB - priceA;
        if (sortBy === "rating") return b.rating - a.rating;
        if (sortBy === "popular") return b.reviewsCount - a.reviewsCount;
        const query = searchQuery.trim().toLowerCase();
        if (!query)
          return (
            Number(b.isFeatured) - Number(a.isFeatured) ||
            b.reviewsCount - a.reviewsCount
          );
        const score = (product: Product) => {
          const brand =
            brands
              .find((item) => item.id === product.brandId)
              ?.name.toLowerCase() || "";
          const category =
            categories
              .find((item) => item.id === product.categoryId)
              ?.name.toLowerCase() || "";
          const name = product.name.toLowerCase();
          const description =
            `${product.shortDescription} ${product.description}`.toLowerCase();
          return (
            (name === query ? 100 : 0) +
            (name.includes(query) ? 40 : 0) +
            (brand.includes(query) ? 25 : 0) +
            (category.includes(query) ? 20 : 0) +
            (description.includes(query) ? 10 : 0) +
            product.rating * 2 +
            Math.log10(product.reviewsCount + 1)
          );
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
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedBrand("all");
    setMinPrice(0);
    setMaxPrice(200000);
    setOnlyExpress(false);
    setOnlyOfficial(false);
    setSortBy("relevance");
  };

  const hasActiveFilters =
    searchQuery !== "" ||
    selectedCategory !== "all" ||
    selectedBrand !== "all" ||
    minPrice > 0 ||
    maxPrice < 200000 ||
    onlyExpress ||
    onlyOfficial;

  const scrollToCatalog = () => {
    if (typeof window !== "undefined") {
      const el = document.getElementById("catalog-section");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  const homepageSections = {
    hero: (
      <HeroSection
        onSelectCategory={(catId) => {
          setSelectedCategory(catId);
          scrollToCatalog();
        }}
        onOpenSellerPortal={() => {
          if (authUser?.role === "seller") {
            setActiveView("seller");
            router.push("/seller");
          } else {
            router.push("/seller/register");
          }
        }}
      />
    ),
    flash_sales: (
      <FlashSalesSection
        onViewProduct={(product) => setSelectedProductForDetail(product)}
      />
    ),
    official_stores: (
      <OfficialStoresSection
        onSelectBrand={(brandId) => {
          setSelectedBrand(brandId);
          scrollToCatalog();
        }}
      />
    ),
  };

  const handleCheckoutInitiated = () => {
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const handleOrderCompleted = (order: MasterOrder) => {
    setIsCheckoutOpen(false);
    setCustomerTab("orders");
    setActiveView("customer");
    router.push("/customer/orders");
  };

  const navigateToStorefront = () => {
    setPublicPage(null);
    setActiveView("storefront");
    router.push("/");
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div
      className={`${activeView === "storefront" ? "min-h-screen" : "h-dvh overflow-hidden"} flex flex-col bg-neutral-100 font-sans text-neutral-900 selection:bg-amber-500 selection:text-white`}
    >
      {/* Public and account navigation use separate headers. */}
      {activeView === "storefront" && (
        <Navbar
          onOpenCart={() => setIsCartOpen(true)}
          onOpenAccount={() => {
            if (!authUser) {
              router.push("/login");
            } else {
              setCustomerTab("orders");
              setActiveView("customer");
              router.push("/customer");
            }
          }}
          onNavigateCustomerTab={(tab) => {
            setCustomerTab(tab);
            setActiveView("customer");
            router.push(tab === "orders" ? "/customer" : `/customer/${tab}`);
          }}
          onSelectCategory={(catId) => {
            setSelectedCategory(catId);
            if (activeView !== "storefront") setActiveView("storefront");
            scrollToCatalog();
          }}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          activeView={activeView}
          setActiveView={(view) => {
            setActiveView(view);
            if (view === "storefront") router.push("/");
            else if (view === "customer") router.push("/customer");
            else if (view === "seller") router.push("/seller");
            else if (view === "admin") router.push("/admin");
            else if (view === "finance") router.push("/finance");
          }}
          onOpenAuthModal={openAuth}
          onBackToStorefront={navigateToStorefront}
        />
      )}

      {/* 2. Main Body Content Switcher */}
      <main className="min-h-0 flex-1">
        {/* VIEW 1: CUSTOMER STOREFRONT */}
        {activeView === "storefront" && publicPage && (
          <PublicInfoPage
            slug={publicPage}
            onBack={() => setPublicPage(null)}
            onOpenAuth={openAuth}
          />
        )}

        {activeView === "storefront" && !publicPage && (
          <div className="max-w-7xl mx-auto px-4">
            {/* Show Hero & Promos only when browsing top-level without search */}
            {!hasActiveFilters && (
              <>
                {homepageSettings.sections.map((section) =>
                  homepageSettings.visibility[section] ? (
                    <React.Fragment key={section}>
                      {homepageSections[section]}
                    </React.Fragment>
                  ) : null,
                )}
              </>
            )}

            {/* Catalog Grid Area with Filtering Sidebar */}
            <div id="catalog-section" className="my-6 scroll-mt-20">
              {/* Filter / Search Header */}
              <div className="bg-white rounded-lg border border-neutral-200 p-4 mb-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-neutral-900 flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-amber-500" />
                    <span>
                      {selectedCategory !== "all"
                        ? categories.find((c) => c.id === selectedCategory)
                            ?.name
                        : "Explore All Products"}
                    </span>
                    <span className="text-xs text-neutral-400 font-normal">
                      ({filteredProducts.length} items found)
                    </span>
                  </h3>
                  {hasActiveFilters && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-neutral-500">
                        Filtered results
                      </span>
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
                    <option value="relevance">Relevance</option>
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
                      <label className="block text-xs font-bold text-neutral-800 mb-2">
                        Category
                      </label>
                      <div className="space-y-1.5 text-xs text-neutral-600">
                        <div
                          onClick={() => setSelectedCategory("all")}
                          className={`cursor-pointer px-2 py-1 rounded transition-colors ${
                            selectedCategory === "all"
                              ? "bg-amber-50 text-amber-700 font-bold"
                              : "hover:bg-neutral-50"
                          }`}
                        >
                          All Categories
                        </div>
                        {supportedCategories.map((c) => (
                          <div
                            key={c.id}
                            onClick={() => setSelectedCategory(c.id)}
                            className={`cursor-pointer px-2 py-1 rounded transition-colors ${
                              selectedCategory === c.id
                                ? "bg-amber-50 text-amber-700 font-bold"
                                : "hover:bg-neutral-50"
                            }`}
                          >
                            {c.name}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Brand Filter */}
                    <div className="py-3 border-b border-neutral-100">
                      <label className="block text-xs font-bold text-neutral-800 mb-2">
                        Brand
                      </label>
                      <div className="space-y-1.5 text-xs text-neutral-600">
                        <div
                          onClick={() => setSelectedBrand("all")}
                          className={`cursor-pointer px-2 py-1 rounded transition-colors ${
                            selectedBrand === "all"
                              ? "bg-amber-50 text-amber-700 font-bold"
                              : "hover:bg-neutral-50"
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
                                ? "bg-amber-50 text-amber-700 font-bold"
                                : "hover:bg-neutral-50"
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
                          value={minPrice || ""}
                          onChange={(e) => setMinPrice(Number(e.target.value))}
                          className="w-full p-1.5 border border-neutral-300 rounded text-center text-xs"
                        />
                        <span>-</span>
                        <input
                          type="number"
                          placeholder="Max"
                          value={maxPrice || ""}
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
                        <span>ShelterHub Express eligible</span>
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
                      <h4 className="font-bold text-sm text-neutral-800">
                        No matching products found
                      </h4>
                      <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                        Try modifying your search term or adjusting filter
                        bounds to view more items.
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
        {activeView === "customer" && (
          <DashboardShell
            accountView="customer"
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onBackToStorefront={navigateToStorefront}
            title={`Good morning, ${authUser?.name?.split(" ")[0] || "Robert"}`}
            subtitle="Here’s what’s happening with your marketplace today."
            rightHeaderLabel={authUser?.name || "Robert Otieno"}
            collapsibleGroups={false}
            navItems={[
              {
                label: "Dashboard",
                icon: <Home className="w-4 h-4" />,
                path: "/customer",
              },
              {
                label: "My Orders",
                icon: <ShoppingBag className="w-4 h-4" />,
                path: "/customer/orders",
                active: customerTab === "orders",
                badge: 2,
                group: "Shopping",
              },
              {
                label: "Wishlist",
                icon: <Sparkles className="w-4 h-4" />,
                path: "/customer/wishlist",
                active: customerTab === "wishlist",
                group: "Shopping",
              },
              {
                label: "Saved Addresses",
                icon: <MapPinned className="w-4 h-4" />,
                path: "/customer/addresses",
                active: customerTab === "addresses",
                group: "Account",
              },
              {
                label: "Returns",
                icon: <RotateCcw className="w-4 h-4" />,
                path: "/customer/returns",
                active: customerTab === "returns",
                group: "Account",
              },
              {
                label: "Settings",
                icon: <Settings className="w-4 h-4" />,
                path: "/customer/security",
                active: customerTab === "security",
                group: "Account",
              },
            ]}
            onNavigate={(label) => {
              const tabMap: Record<string, typeof customerTab> = {
                Dashboard: "orders",
                "My Orders": "orders",
                Wishlist: "wishlist",
                "Saved Addresses": "addresses",
                Returns: "returns",
                Settings: "security",
              };
              const nextTab = tabMap[label];
              if (nextTab) setCustomerTab(nextTab);
            }}
          >
            <CustomerPortal
              requestedTab={customerTab}
              onContinueShopping={() => {
                setActiveView("storefront");
                router.push("/");
                if (typeof window !== "undefined") {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
              onViewProduct={(prodId) => {
                const p = products.find((prod) => prod.id === prodId);
                if (p) {
                  setSelectedProductForDetail(p);
                }
              }}
            />
          </DashboardShell>
        )}

        {/* VIEW 3: SELLER CENTER PORTAL */}
        {activeView === "seller" && (
          <DashboardShell
            accountView="seller"
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onBackToStorefront={navigateToStorefront}
            title={authUser?.name || "Seller Dashboard"}
            subtitle="Manage your storefront, inventory, orders, and payouts from one view."
            rightHeaderLabel={authUser?.name || "Seller"}
            navItems={[
              {
                label: "Dashboard",
                icon: <Home className="w-4 h-4" />,
                path: "/seller",
                active: sellerTab === "dashboard",
              },
              {
                label: "Products",
                icon: <Boxes className="w-4 h-4" />,
                path: "/seller/products",
                active: sellerTab === "products",
                group: "Catalog",
              },
              {
                label: "Inventory",
                icon: <ShoppingBag className="w-4 h-4" />,
                path: "/seller/inventory",
                active: sellerTab === "inventory",
                group: "Catalog",
              },
              {
                label: "Orders",
                icon: <Package className="w-4 h-4" />,
                path: "/seller/orders",
                active: sellerTab === "orders",
                badge: 1,
                group: "Sales",
              },
              {
                label: "Payouts",
                icon: <Wallet className="w-4 h-4" />,
                path: "/seller/payouts",
                active: sellerTab === "payouts",
                group: "Finance",
              },
              {
                label: "Verification",
                icon: <ShieldCheck className="w-4 h-4" />,
                path: "/seller/verification",
                active: sellerTab === "verification",
                group: "Account",
              },
              {
                label: "Settings",
                icon: <Settings className="w-4 h-4" />,
                path: "/seller/settings",
                active: sellerTab === "settings",
                group: "Account",
              },
            ]}
            onNavigate={(label) => {
              const tabMap: Record<string, typeof sellerTab> = {
                Dashboard: "dashboard",
                Products: "products",
                Inventory: "inventory",
                Orders: "orders",
                Payouts: "payouts",
                Verification: "verification",
                Settings: "settings",
              };
              const nextTab = tabMap[label];
              if (nextTab) setSellerTab(nextTab);
            }}
          >
            <SellerPortal requestedTab={sellerTab} />
          </DashboardShell>
        )}

        {/* VIEW 4: FINANCE CONSOLE */}
        {activeView === "finance" && (
          <DashboardShell
            accountView="finance"
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onBackToStorefront={navigateToStorefront}
            title="Finance Dashboard"
            subtitle="Review payments, refunds, payouts, journal records, and reconciliation exceptions."
            rightHeaderLabel={authUser?.name || "Finance Admin"}
            navItems={FINANCE_NAV.map((item) => ({
              label: item.label,
              path:
                item.section === "overview"
                  ? "/finance"
                  : `/finance/${item.section}`,
              group: item.section === "overview" ? undefined : item.group,
              active: item.section === financeSection,
              icon:
                item.section === "overview" ? (
                  <Home className="w-4 h-4" />
                ) : item.section === "orders" ? (
                  <ShoppingBag className="w-4 h-4" />
                ) : item.section === "payments" ? (
                  <CreditCard className="w-4 h-4" />
                ) : item.section === "refunds" ? (
                  <RotateCcw className="w-4 h-4" />
                ) : item.section === "payouts" ? (
                  <Wallet className="w-4 h-4" />
                ) : item.section === "reconciliation" ? (
                  <ArrowUpDown className="w-4 h-4" />
                ) : item.section === "ledger" ? (
                  <FileText className="w-4 h-4" />
                ) : (
                  <BarChart3 className="w-4 h-4" />
                ),
            }))}
            onNavigate={(label) => {
              const next = FINANCE_NAV.find((item) => item.label === label);
              if (next) setFinanceSection(next.section);
            }}
          >
            <FinanceAdminPanel section={financeSection} />
          </DashboardShell>
        )}

        {/* VIEW 5: ADMIN CONTROL HUB */}
        {activeView === "admin" && (
          <DashboardShell
            accountView="admin"
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onBackToStorefront={navigateToStorefront}
            title="Admin Control Hub"
            subtitle="Platform-wide governance, RBAC role management, catalog moderation, audit logs, and settings."
            rightHeaderLabel={authUser?.name || "Robert Otieno"}
            navItems={[
              {
                label: "Dashboard",
                icon: <Home className="w-4 h-4" />,
                path: "/admin",
                active: adminTab === "analytics",
              },
              {
                label: "Users",
                icon: <Users className="w-4 h-4" />,
                path: "/admin/users",
                active: adminTab === "users",
                group: "Users",
              },
              {
                label: "Roles & Permissions",
                icon: <ShieldCheck className="w-4 h-4" />,
                path: "/admin/roles",
                active: adminTab === "roles",
                group: "Users",
              },
              {
                label: "Security Center",
                icon: <ShieldAlert className="w-4 h-4" />,
                path: "/admin/security",
                active: adminTab === "security",
                group: "System",
              },
              {
                label: "System Controls",
                icon: <Settings className="w-4 h-4" />,
                path: "/admin/system",
                active: adminTab === "system",
                group: "System",
              },
              {
                label: "Audit Logs",
                icon: <FileText className="w-4 h-4" />,
                path: "/admin/audit",
                active: adminTab === "audit",
                group: "System",
              },
              {
                label: "Sellers & KYC",
                icon: <Users className="w-4 h-4" />,
                path: "/admin/sellers",
                active: adminTab === "sellers",
                badge: 1,
                group: "Sellers",
              },
              {
                label: "Catalog Moderation",
                icon: <Boxes className="w-4 h-4" />,
                path: "/admin/catalog",
                active: adminTab === "catalog",
                group: "Catalog",
              },
              {
                label: "Categories",
                icon: <Tags className="w-4 h-4" />,
                path: "/admin/categories",
                active: adminTab === "categories",
                group: "Catalog",
              },
              {
                label: "Master Orders",
                icon: <ShoppingBag className="w-4 h-4" />,
                path: "/admin/orders",
                active: adminTab === "orders",
                group: "Orders",
              },
              {
                label: "Marketing & Campaigns",
                icon: <Ticket className="w-4 h-4" />,
                path: "/admin/marketing",
                active: adminTab === "coupons",
                badge: 3,
                group: "Marketing",
              },
              {
                label: "Delivery Zones",
                icon: <MapPinned className="w-4 h-4" />,
                path: "/admin/logistics",
                active: adminTab === "logistics",
                badge: 47,
                group: "Logistics",
              },
              {
                label: "System Settings",
                icon: <Settings className="w-4 h-4" />,
                path: "/admin/settings",
                active: adminTab === "settings",
              },
            ]}
            onNavigate={(label) => {
              const tabMap: Record<string, typeof adminTab> = {
                Dashboard: "analytics",
                Users: "users",
                "Roles & Permissions": "roles",
                "Security Center": "security",
                "System Controls": "system",
                "Audit Logs": "audit",
                "Sellers & KYC": "sellers",
                "Catalog Moderation": "catalog",
                Categories: "categories",
                "Master Orders": "orders",
                "Marketing & Campaigns": "coupons",
                "Delivery Zones": "logistics",
                "System Settings": "settings",
              };
              const nextTab = tabMap[label];
              if (nextTab) setAdminTab(nextTab);
            }}
          >
            <AdminControlHub requestedTab={adminTab} />
          </DashboardShell>
        )}
      </main>

      {/* Public storefront footer */}
      {activeView === "storefront" && !publicPage && (
        <Footer
          onOpenPage={(slug) => {
            setPublicPage(slug);
            if (typeof window !== "undefined") {
              window.scrollTo({ top: 0, behavior: "smooth" });
            }
          }}
        />
      )}

      {/* 4. Modals & Drawers */}
      {/* Product Detail Modal */}
      {selectedProductForDetail && (
        <ProductDetailModal
          product={selectedProductForDetail}
          isOpen={!!selectedProductForDetail}
          onClose={() => setSelectedProductForDetail(null)}
          onBuyNow={() => {
            setSelectedProductForDetail(null);
            setIsCheckoutOpen(true);
          }}
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

export default function App(props: AppRouteProps) {
  return (
    <AppProvider>
      <DialogProvider>
        <MarketplaceApp {...props} />
      </DialogProvider>
    </AppProvider>
  );
}
