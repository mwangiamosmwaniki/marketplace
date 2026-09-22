import React, { useState, useRef, useEffect } from 'react';
import { useMarketplace } from '../context/MarketplaceContext';
import {
  Search,
  ShoppingCart,
  Heart,
  User as UserIcon,
  HelpCircle,
  Store,
  Shield,
  ChevronDown,
  Menu,
  X,
  Package,
  LogOut,
  Settings,
  MapPin,
  Clock,
  Phone,
  Bell,
  ExternalLink,
} from 'lucide-react';

interface NavbarProps {
  onOpenCart: () => void;
  onOpenAccount: () => void;
  onSelectCategory: (categoryId: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeView: 'storefront' | 'seller' | 'admin' | 'finance' | 'customer';
  setActiveView: (view: 'storefront' | 'seller' | 'admin' | 'finance' | 'customer') => void;
  onOpenAuthModal: (tab?: 'login' | 'register_customer' | 'register_seller') => void;
  onBackToStorefront: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenCart,
  onOpenAccount,
  onSelectCategory,
  searchQuery,
  setSearchQuery,
  activeView,
  setActiveView,
  onOpenAuthModal,
  onBackToStorefront,
}) => {
  const {
    authUser,
    logout,
    cart,
    wishlist,
    currentSeller,
    categories,
    cartSubtotal,
  } = useMarketplace();

  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setShowAccountDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Determine user context
  const isSellerUser = authUser?.role === 'seller';
  const isFinanceUser = authUser?.role === 'finance_admin';
  const isAdminUser =
    authUser?.role === 'super_admin' ||
    authUser?.role === 'seller_admin' ||
    authUser?.role === 'logistics_admin' ||
    authUser?.role === 'product_admin' ||
    authUser?.role === 'support_admin' ||
    authUser?.role === 'marketing_admin';

  /* -------------------------------------------------------------
   * 1. SELLER HEADER: Dedicated, compact & role-aware
   * ------------------------------------------------------------- */
  if (isSellerUser) {
    return (
      <header id="seller-header" className="sticky top-0 z-40 bg-white border-b border-neutral-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 py-2.5">
          <div className="flex items-center justify-between gap-4">
            {/* Logo & Store Context */}
            <div className="flex items-center gap-3">
              <div
                onClick={() => setActiveView('seller')}
                className="flex items-center gap-2 cursor-pointer select-none"
              >
                <div className="w-8 h-8 bg-amber-500 text-neutral-950 rounded-lg flex items-center justify-center font-black text-lg">
                  ★
                </div>
                <div>
                  <span className="font-black text-lg tracking-tight text-neutral-900">
                    KESALES<span className="text-amber-500">.</span>
                  </span>
                  <span className="text-[10px] font-extrabold tracking-widest text-emerald-700 block -mt-1 uppercase">
                    Seller Center
                  </span>
                </div>
              </div>

              {currentSeller && (
                <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-neutral-200">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <span className="text-xs font-bold text-neutral-800">{currentSeller.businessName}</span>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200 font-semibold capitalize">
                    {currentSeller.status}
                  </span>
                </div>
              )}
            </div>

            {/* Seller Quick Search */}
            <div className="flex-1 max-w-md hidden md:block">
              <div className="relative flex items-center">
                <input
                  type="text"
                  placeholder="Search products, SKUs, or customer orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-neutral-50 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:border-amber-500"
                />
                <Search className="w-4 h-4 text-neutral-400 absolute left-3 pointer-events-none" />
              </div>
            </div>

            {/* Right Context Controls */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={onBackToStorefront}
                className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-amber-600 px-2.5 py-1.5 rounded-lg hover:bg-neutral-50 transition-colors"
                title="Preview public storefront"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>View Storefront</span>
              </button>

              {/* Notifications */}
              <div className="relative p-2 text-neutral-600 hover:text-neutral-900 cursor-pointer">
                <Bell className="w-4 h-4" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full"></span>
              </div>

              {/* Seller Account Menu */}
              <div className="relative" ref={accountMenuRef}>
                <button
                  onClick={() => setShowAccountDropdown(!showAccountDropdown)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-neutral-200 hover:border-neutral-300 bg-neutral-50 hover:bg-white transition-all text-xs"
                >
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
                    {authUser?.name.charAt(0) || 'S'}
                  </div>
                  <span className="font-bold text-neutral-800 hidden sm:inline">{authUser?.name}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                </button>

                {showAccountDropdown && (
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-neutral-200 py-1 z-50 text-xs">
                    <div className="px-3 py-2 border-b border-neutral-100">
                      <div className="font-bold text-neutral-900">{authUser?.name}</div>
                      <div className="text-[11px] text-neutral-500">{authUser?.email}</div>
                    </div>
                    <button
                      onClick={() => {
                        setActiveView('seller');
                        setShowAccountDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-neutral-50 text-neutral-700 flex items-center gap-2"
                    >
                      <Store className="w-4 h-4 text-neutral-400" />
                      <span>My Store & Dashboard</span>
                    </button>
                    <button
                      onClick={() => {
                        setActiveView('seller');
                        setShowAccountDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-neutral-50 text-neutral-700 flex items-center gap-2"
                    >
                      <Package className="w-4 h-4 text-neutral-400" />
                      <span>Inventory & SKUs</span>
                    </button>
                    <button
                      onClick={() => {
                        setActiveView('seller');
                        setShowAccountDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-neutral-50 text-neutral-700 flex items-center gap-2"
                    >
                      <Settings className="w-4 h-4 text-neutral-400" />
                      <span>Store Settings</span>
                    </button>
                    <div className="border-t border-neutral-100 my-1"></div>
                    <button
                      onClick={() => {
                        logout();
                        setActiveView('storefront');
                        setShowAccountDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2 font-semibold"
                    >
                      <LogOut className="w-4 h-4 text-red-500" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>
    );
  }

  if (isFinanceUser) {
    return (
      <header id="finance-header" className="sticky top-0 z-40 bg-neutral-950 text-white border-b border-neutral-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
          <button onClick={() => setActiveView('finance')} className="flex items-center gap-3 text-left flex-shrink-0">
            <span className="w-8 h-8 rounded-lg bg-amber-500 text-neutral-950 flex items-center justify-center font-black">★</span>
            <span><strong className="block text-lg tracking-tight">KESALES<span className="text-amber-500">.</span></strong><span className="block text-[10px] uppercase tracking-widest text-amber-400">Finance</span></span>
          </button>
          <div className="flex-1 max-w-md hidden md:block relative">
            <Search className="w-4 h-4 absolute left-3 top-2 text-neutral-500" />
            <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search payments, payouts, orders..." className="w-full bg-neutral-900 border border-neutral-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-500" />
          </div>
          <div className="flex items-center gap-2 sm:gap-3 text-xs">
            <button className="hidden sm:flex items-center gap-1.5 text-neutral-300 hover:text-white px-2 py-1.5 rounded-lg hover:bg-neutral-900"><HelpCircle className="w-4 h-4" /> Help</button>
            <button className="relative p-2 text-neutral-300 hover:text-white" title="Notifications"><Bell className="w-4 h-4" /><span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full" /></button>
            <div className="relative" ref={accountMenuRef}>
              <button onClick={() => setShowAccountDropdown((open) => !open)} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-neutral-800 bg-neutral-900 hover:border-neutral-700">
                <span className="w-6 h-6 rounded-full bg-amber-900 text-amber-200 flex items-center justify-center font-bold">{authUser?.name.charAt(0) || 'F'}</span>
                <span className="hidden sm:block text-left"><strong className="block text-neutral-200">{authUser?.name}</strong><span className="text-[10px] text-neutral-400">Finance Admin</span></span><ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
              </button>
              {showAccountDropdown && <div className="absolute right-0 mt-2 w-52 bg-neutral-900 rounded-xl shadow-2xl border border-neutral-800 py-1 z-50"><div className="px-3 py-2 border-b border-neutral-800"><strong className="block text-white">{authUser?.name}</strong><span className="text-[11px] text-neutral-400">{authUser?.email}</span></div><button onClick={() => setShowAccountDropdown(false)} className="w-full text-left px-3 py-2 hover:bg-neutral-800 text-neutral-200 flex items-center gap-2"><UserIcon className="w-4 h-4 text-neutral-400" /> My Profile</button><button onClick={() => setShowAccountDropdown(false)} className="w-full text-left px-3 py-2 hover:bg-neutral-800 text-neutral-200 flex items-center gap-2"><Settings className="w-4 h-4 text-neutral-400" /> Preferences</button><div className="border-t border-neutral-800 my-1" /><button onClick={() => { logout(); setActiveView('storefront'); setShowAccountDropdown(false); }} className="w-full text-left px-3 py-2 hover:bg-red-950/50 text-red-400 flex items-center gap-2 font-semibold"><LogOut className="w-4 h-4" /> Sign Out</button></div>}
            </div>
          </div>
        </div>
      </header>
    );
  }

  /* -------------------------------------------------------------
   * 2. ADMIN HEADER: Dedicated, compact & governance-focused
   * ------------------------------------------------------------- */
  if (isAdminUser) {
    const roleLabel =
      authUser?.role === 'super_admin'
        ? 'Super Administrator'
        : authUser?.role === 'finance_admin'
        ? 'Finance & Escrow Admin'
        : authUser?.role === 'seller_admin'
        ? 'Seller Compliance Admin'
        : authUser?.role === 'logistics_admin'
        ? 'Logistics & Delivery Admin'
        : authUser?.role === 'product_admin'
        ? 'Product Catalog Admin'
        : authUser?.role === 'support_admin'
        ? 'Customer Support Admin'
        : 'Marketing Admin';

    return (
      <header id="admin-header" className="sticky top-0 z-40 bg-neutral-950 text-white border-b border-neutral-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-2.5">
          <div className="flex items-center justify-between gap-4">
            {/* Logo & Section Context */}
            <div className="flex items-center gap-3">
              <div
                onClick={() => setActiveView('admin')}
                className="flex items-center gap-2 cursor-pointer select-none"
              >
                <div className="w-8 h-8 bg-amber-500 text-neutral-950 rounded-lg flex items-center justify-center font-black text-lg">
                  ★
                </div>
                <div>
                  <span className="font-black text-lg tracking-tight text-white">
                    KESALES<span className="text-amber-500">.</span>
                  </span>
                  <span className="text-[10px] font-extrabold tracking-widest text-amber-400 block -mt-1 uppercase">
                    Admin Control Hub
                  </span>
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-neutral-800">
                <Shield className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-xs font-semibold text-neutral-300">{roleLabel}</span>
              </div>
            </div>

            {/* Admin Search */}
            <div className="flex-1 max-w-md hidden md:block">
              <div className="relative flex items-center">
                <input
                  type="text"
                  placeholder="Search sellers, audit logs, ledger records..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-neutral-900 text-xs text-white rounded-lg border border-neutral-700 focus:outline-none focus:border-amber-500 placeholder:text-neutral-500"
                />
                <Search className="w-4 h-4 text-neutral-500 absolute left-3 pointer-events-none" />
              </div>
            </div>

            {/* Right Context Controls */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={onBackToStorefront}
                className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-neutral-400 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-neutral-900 transition-colors"
                title="View customer storefront"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Storefront</span>
              </button>

              <div className="relative p-2 text-neutral-400 hover:text-white cursor-pointer">
                <Bell className="w-4 h-4" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-purple-500 rounded-full"></span>
              </div>

              {/* Admin Account Menu */}
              <div className="relative" ref={accountMenuRef}>
                <button
                  onClick={() => setShowAccountDropdown(!showAccountDropdown)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-neutral-800 hover:border-neutral-700 bg-neutral-900 hover:bg-neutral-850 transition-all text-xs"
                >
                  <div className="w-6 h-6 rounded-full bg-purple-900 text-purple-200 font-bold flex items-center justify-center text-xs">
                    {authUser?.name.charAt(0) || 'A'}
                  </div>
                  <span className="font-bold text-neutral-200 hidden sm:inline">{authUser?.name}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                </button>

                {showAccountDropdown && (
                  <div className="absolute right-0 mt-2 w-52 bg-neutral-900 rounded-xl shadow-2xl border border-neutral-800 py-1 z-50 text-xs text-neutral-200">
                    <div className="px-3 py-2 border-b border-neutral-800">
                      <div className="font-bold text-white">{authUser?.name}</div>
                      <div className="text-[11px] text-neutral-400">{roleLabel}</div>
                    </div>
                    <button
                      onClick={() => {
                        setActiveView('admin');
                        setShowAccountDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-neutral-800 text-neutral-200 flex items-center gap-2"
                    >
                      <Shield className="w-4 h-4 text-purple-400" />
                      <span>Governance Dashboard</span>
                    </button>
                    <button
                      onClick={() => {
                        setActiveView('admin');
                        setShowAccountDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-neutral-800 text-neutral-200 flex items-center gap-2"
                    >
                      <Settings className="w-4 h-4 text-neutral-400" />
                      <span>System Settings</span>
                    </button>
                    <div className="border-t border-neutral-800 my-1"></div>
                    <button
                      onClick={() => {
                        logout();
                        setActiveView('storefront');
                        setShowAccountDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-red-950/50 text-red-400 flex items-center gap-2 font-semibold"
                    >
                      <LogOut className="w-4 h-4 text-red-400" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>
    );
  }

  /* -------------------------------------------------------------
   * 3. CUSTOMER / PUBLIC HEADER: Clean, commercial & focused
   * ------------------------------------------------------------- */
  return (
    <header id="main-header" className="sticky top-0 z-40 bg-white border-b border-neutral-200 shadow-2xs">
      {/* 1. Top Utility Announcement Bar */}
      <div className="bg-neutral-900 text-neutral-300 text-xs py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-[11px]">
              <span className="text-amber-400 font-extrabold tracking-wide flex items-center gap-1">
              <span>★</span> KESALES MARKETPLACE
            </span>
            <span className="hidden lg:inline text-neutral-400 border-l border-neutral-700 pl-3">
              Kenya's Leading Multi-Vendor E-Commerce Platform
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <button
              onClick={() => onOpenAuthModal('register_seller')}
              className="text-neutral-300 hover:text-amber-400 transition-colors font-medium flex items-center gap-1"
            >
              <Store className="w-3 h-3 text-amber-400" />
              <span>Sell on KESALES</span>
            </button>

            <div className="hidden sm:flex items-center gap-1 text-neutral-400">
              <Phone className="w-3 h-3 text-amber-400" />
              <span>0700 000 000</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Topbar */}
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <div
            onClick={onBackToStorefront}
            className="flex items-center gap-2.5 cursor-pointer select-none flex-shrink-0"
          >
            <div className="w-9 h-9 bg-amber-500 text-neutral-950 rounded-lg flex items-center justify-center font-black text-xl shadow-xs">
              ★
            </div>
            <div>
              <span className="font-black text-xl tracking-tight text-neutral-900 flex items-center">
                KESALES<span className="text-amber-500 text-2xl leading-none">.</span>
              </span>
              <span className="text-[9px] font-extrabold tracking-widest text-neutral-500 block -mt-1 uppercase">
                {activeView === 'customer' ? 'My Account' : 'Marketplace'}
              </span>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-xl hidden md:block">
            <div className="relative flex items-center">
              <input
                id="main-search-input"
                type="text"
                placeholder="Search products, brands and categories in Kenya..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (activeView !== 'storefront') setActiveView('storefront');
                }}
                className="w-full pl-10 pr-20 py-2 bg-neutral-50 hover:bg-neutral-100/70 focus:bg-white text-xs text-neutral-900 rounded-lg border border-neutral-300 focus:outline-none focus:border-amber-500 transition-colors shadow-2xs"
              />
              <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 pointer-events-none" />
              <button
                onClick={() => {
                  if (activeView !== 'storefront') setActiveView('storefront');
                }}
                className="absolute right-1 bg-amber-500 hover:bg-amber-600 text-neutral-950 text-xs font-bold py-1 px-3 rounded-md shadow-xs transition-colors"
              >
                Search
              </button>
            </div>
          </div>

          {/* Right Action Items */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Wishlist Button */}
            <button
              id="btn-nav-wishlist"
              onClick={() => {
                setActiveView('customer');
              }}
              className="relative p-2 rounded-lg text-neutral-700 hover:text-amber-600 hover:bg-neutral-50 transition-colors"
              title="Saved Items"
            >
              <Heart className="w-5 h-5" />
              {wishlist.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {wishlist.length}
                </span>
              )}
            </button>

            {/* Cart Button */}
            <button
              id="btn-nav-cart"
              onClick={onOpenCart}
              className="relative flex items-center gap-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-neutral-950 font-bold text-xs py-2 px-3 sm:px-4 rounded-lg shadow-xs transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
              <span className="hidden sm:inline">Cart</span>
              {cartItemCount > 0 && (
                <span className="bg-neutral-950 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {cartItemCount}
                </span>
              )}
            </button>

            {/* Account / Sign In */}
            {authUser ? (
              <div className="relative" ref={accountMenuRef}>
                <button
                  id="btn-nav-account"
                  onClick={() => setShowAccountDropdown(!showAccountDropdown)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-neutral-200 hover:border-amber-400 bg-neutral-50 hover:bg-white transition-all text-xs"
                >
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-xs">
                    {authUser.name.charAt(0)}
                  </div>
                  <div className="text-left hidden sm:block">
                    <div className="font-bold text-neutral-900 leading-tight line-clamp-1 max-w-[120px]">
                      {authUser.name.split(' ')[0]}
                    </div>
                    <div className="text-[10px] text-neutral-500 leading-tight">My Account</div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                </button>

                {showAccountDropdown && (
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-neutral-200 py-1 z-50 text-xs animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3 py-2 border-b border-neutral-100">
                      <div className="font-bold text-neutral-900">{authUser.name}</div>
                      <div className="text-[11px] text-neutral-500 truncate">{authUser.email}</div>
                    </div>
                    <button
                      onClick={() => {
                        setActiveView('customer');
                        setShowAccountDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-neutral-50 text-neutral-700 flex items-center gap-2"
                    >
                      <UserIcon className="w-4 h-4 text-neutral-400" />
                      <span>My Account</span>
                    </button>
                    <button
                      onClick={() => {
                        setActiveView('customer');
                        setShowAccountDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-neutral-50 text-neutral-700 flex items-center gap-2"
                    >
                      <Package className="w-4 h-4 text-neutral-400" />
                      <span>My Orders</span>
                    </button>
                    <button
                      onClick={() => {
                        setActiveView('customer');
                        setShowAccountDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-neutral-50 text-neutral-700 flex items-center gap-2"
                    >
                      <Heart className="w-4 h-4 text-neutral-400" />
                      <span>Saved Wishlist</span>
                    </button>
                    <button
                      onClick={() => {
                        setActiveView('customer');
                        setShowAccountDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-neutral-50 text-neutral-700 flex items-center gap-2"
                    >
                      <MapPin className="w-4 h-4 text-neutral-400" />
                      <span>Saved Addresses</span>
                    </button>
                    <div className="border-t border-neutral-100 my-1"></div>
                    <button
                      onClick={() => {
                        logout();
                        setActiveView('storefront');
                        setShowAccountDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2 font-semibold"
                    >
                      <LogOut className="w-4 h-4 text-red-500" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => onOpenAuthModal('login')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-300 hover:border-amber-500 text-xs font-bold text-neutral-800 hover:bg-amber-50/50 transition-colors"
              >
                <UserIcon className="w-4 h-4 text-neutral-600" />
                <span>Sign In</span>
              </button>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 md:hidden text-neutral-700"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Search */}
        <div className="mt-2 md:hidden">
          <div className="relative flex items-center">
            <input
              type="text"
              placeholder="Search products, brands..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-neutral-50 text-xs rounded-lg border border-neutral-300"
            />
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 3. Categories Ribbon (Storefront only) */}
      {activeView === 'storefront' && (
        <div className="bg-neutral-50 border-t border-neutral-200 overflow-x-auto py-2 px-4 scrollbar-none">
          <div className="max-w-7xl mx-auto flex items-center gap-6 text-xs font-medium text-neutral-600 whitespace-nowrap">
            <button
              onClick={() => onSelectCategory('all')}
              className="hover:text-amber-600 transition-colors font-bold text-neutral-900"
            >
              All Products
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className="hover:text-amber-600 transition-colors"
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};
