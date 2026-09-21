import React, { useState, useRef, useEffect } from 'react';
import { useMarketplace } from '../context/MarketplaceContext';
import {
  Search,
  ShoppingCart,
  Heart,
  User,
  HelpCircle,
  Store,
  Shield,
  Code,
  Layers,
  ChevronDown,
  Menu,
  X,
  Package,
  CheckCircle2,
  AlertCircle,
  Key,
  ShieldAlert,
  Sparkles,
  Phone,
  Briefcase,
  Users,
  Truck,
  CreditCard,
} from 'lucide-react';
import { Role } from '../types';

export interface Persona {
  id: string;
  name: string;
  email: string;
  role: Role;
  roleLabel: string;
  roleBadgeColor: string;
  sellerId?: string;
  description: string;
}

export const DEMO_PERSONAS: Persona[] = [
  {
    id: 'persona-customer',
    name: 'Jane Wambui',
    email: 'jane.wambui@allsales.ke',
    role: 'customer',
    roleLabel: 'Customer / Buyer',
    roleBadgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    description: 'Shopping, tracking multi-vendor orders, wishlist & returns',
  },
  {
    id: 'persona-seller-1',
    name: 'Tech Point Kenya (David Kiprono)',
    email: 'seller@techpoint.co.ke',
    role: 'seller',
    roleLabel: 'Approved Electronics Seller',
    roleBadgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    sellerId: 'seller-1',
    description: 'Official store partner, SKU catalog, dispatch & payouts',
  },
  {
    id: 'persona-seller-2',
    name: 'Kilifi Spice & Goods (Amina Hassan)',
    email: 'sales@kilifispice.co.ke',
    role: 'seller',
    roleLabel: 'Apparel & Food Merchant',
    roleBadgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    sellerId: 'seller-2',
    description: 'Fashion & spices merchant with regional dispatch orders',
  },
  {
    id: 'persona-seller-3',
    name: 'Nairobi Sound Masters (Kevin O.)',
    email: 'kevin@soundmasters.co.ke',
    role: 'seller',
    roleLabel: 'Audio Seller (Under Review)',
    roleBadgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    sellerId: 'seller-3',
    description: 'New vendor undergoing KYC document compliance audit',
  },
  {
    id: 'persona-super-admin',
    name: 'Robert Otieno',
    email: 'robert.admin@allsales.ke',
    role: 'super_admin',
    roleLabel: 'Platform Superadmin',
    roleBadgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    description: 'Unrestricted governance, ledger, KYC approvals & policies',
  },
  {
    id: 'persona-finance-admin',
    name: 'Faith Muthoni',
    email: 'faith.finance@allsales.ke',
    role: 'finance_admin',
    roleLabel: 'Finance & Escrow Admin',
    roleBadgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    description: 'Settlement disbursements, double-entry ledger & vouchers',
  },
  {
    id: 'persona-logistics-admin',
    name: 'Brian Cheruiyot',
    email: 'brian.logistics@allsales.ke',
    role: 'logistics_admin',
    roleLabel: 'Fulfillment & Logistics Admin',
    roleBadgeColor: 'bg-teal-100 text-teal-800 border-teal-200',
    description: 'County delivery zones tariffs, pickup stations & dispatch',
  },
  {
    id: 'persona-seller-admin',
    name: 'Grace Nduta',
    email: 'grace.kyc@allsales.ke',
    role: 'seller_admin',
    roleLabel: 'Seller Compliance Admin',
    roleBadgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
    description: 'KYC business tax PIN audits & catalog moderation',
  },
];

interface NavbarProps {
  onOpenCart: () => void;
  onOpenAccount: () => void;
  onSelectCategory: (categoryId: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeView: 'storefront' | 'seller' | 'admin' | 'customer' | 'api' | 'laravel';
  setActiveView: (view: 'storefront' | 'seller' | 'admin' | 'customer' | 'api' | 'laravel') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenCart,
  onOpenAccount,
  onSelectCategory,
  searchQuery,
  setSearchQuery,
  activeView,
  setActiveView,
}) => {
  const {
    cart,
    wishlist,
    currentRole,
    setCurrentRole,
    currentSellerId,
    setCurrentSellerId,
    sellers,
    categories,
    formatKSh,
    cartSubtotal,
  } = useMarketplace();

  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [showHelpDropdown, setShowHelpDropdown] = useState(false);
  const [showDevDropdown, setShowDevDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const roleMenuRef = useRef<HTMLDivElement>(null);

  // Determine current persona
  const activePersona =
    DEMO_PERSONAS.find((p) => {
      if (p.role === 'seller') {
        return p.role === currentRole && p.sellerId === currentSellerId;
      }
      return p.role === currentRole;
    }) || DEMO_PERSONAS[0];

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleSelectPersona = (persona: Persona) => {
    setCurrentRole(persona.role);
    if (persona.sellerId) {
      setCurrentSellerId(persona.sellerId);
    }

    // Auto-navigate to appropriate view
    if (persona.role === 'customer') {
      setActiveView('storefront');
    } else if (persona.role === 'seller') {
      setActiveView('seller');
    } else {
      setActiveView('admin');
    }

    setShowRoleModal(false);
  };

  return (
    <header id="main-header" className="sticky top-0 z-40 bg-white border-b border-neutral-200 shadow-xs">
      {/* 1. Clean Top Utility Bar */}
      <div className="bg-neutral-900 text-neutral-300 text-xs py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Left Announcement */}
          <div className="flex items-center gap-3 text-[11px]">
            <span className="text-amber-400 font-extrabold tracking-wide flex items-center gap-1">
              <span>★</span> ALLSALES MARKETPLACE
            </span>
            <span className="hidden lg:inline text-neutral-400 border-l border-neutral-700 pl-3">
              Kenya's Leading Multi-Vendor E-Commerce Platform
            </span>
          </div>

          {/* Right Fast Portal Switcher & Tech Dropdown */}
          <div className="flex items-center gap-2 sm:gap-4 text-[11px]">
            {/* Primary Interface Tabs */}
            <div className="flex items-center bg-neutral-800 rounded-md p-0.5 border border-neutral-700">
              <button
                id="top-nav-storefront"
                onClick={() => setActiveView('storefront')}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors flex items-center gap-1 ${
                  activeView === 'storefront'
                    ? 'bg-amber-500 text-neutral-950'
                    : 'text-neutral-300 hover:text-white'
                }`}
              >
                <span>Storefront</span>
              </button>

              <button
                id="top-nav-customer"
                onClick={() => setActiveView('customer')}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors flex items-center gap-1 ${
                  activeView === 'customer'
                    ? 'bg-amber-500 text-neutral-950'
                    : 'text-neutral-300 hover:text-white'
                }`}
              >
                <span>My Account</span>
              </button>

              <button
                id="top-nav-seller"
                onClick={() => {
                  setActiveView('seller');
                  if (currentRole === 'customer') {
                    setCurrentRole('seller');
                  }
                }}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors flex items-center gap-1 ${
                  activeView === 'seller'
                    ? 'bg-amber-500 text-neutral-950'
                    : 'text-neutral-300 hover:text-white'
                }`}
              >
                <Store className="w-3 h-3" />
                <span>Seller Center</span>
              </button>

              <button
                id="top-nav-admin"
                onClick={() => {
                  setActiveView('admin');
                  if (currentRole === 'customer' || currentRole === 'seller') {
                    setCurrentRole('super_admin');
                  }
                }}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors flex items-center gap-1 ${
                  activeView === 'admin'
                    ? 'bg-amber-500 text-neutral-950'
                    : 'text-neutral-300 hover:text-white'
                }`}
              >
                <Shield className="w-3 h-3" />
                <span>Admin Hub</span>
              </button>
            </div>

            {/* Dev Tools Dropdown (Clean, tucked away) */}
            <div className="relative">
              <button
                onClick={() => setShowDevDropdown(!showDevDropdown)}
                className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-amber-400 transition-colors py-0.5 px-1.5 rounded hover:bg-neutral-800"
              >
                <Code className="w-3 h-3" />
                <span className="hidden md:inline">Dev Tools</span>
                <ChevronDown className="w-2.5 h-2.5" />
              </button>

              {showDevDropdown && (
                <div
                  className="absolute right-0 mt-1.5 w-48 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl py-1 z-50 text-xs"
                  onClick={() => setShowDevDropdown(false)}
                >
                  <button
                    onClick={() => setActiveView('api')}
                    className="w-full text-left px-3 py-1.5 hover:bg-neutral-800 text-neutral-200 hover:text-amber-400 flex items-center gap-2"
                  >
                    <Code className="w-3.5 h-3.5" />
                    <span>REST API Explorer</span>
                  </button>
                  <button
                    onClick={() => setActiveView('laravel')}
                    className="w-full text-left px-3 py-1.5 hover:bg-neutral-800 text-neutral-200 hover:text-amber-400 flex items-center gap-2"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Laravel 11 Architecture</span>
                  </button>
                </div>
              )}
            </div>

            <div className="hidden lg:flex items-center gap-1 text-neutral-400 text-[11px]">
              <Phone className="w-3 h-3 text-amber-400" />
              <span>0700 000 000</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Clean Topbar */}
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <div
            onClick={() => setActiveView('storefront')}
            className="flex items-center gap-2.5 cursor-pointer select-none flex-shrink-0"
          >
            <div className="w-9 h-9 bg-amber-500 text-neutral-950 rounded-lg flex items-center justify-center font-black text-xl shadow-xs">
              ★
            </div>
            <div>
              <span className="font-black text-xl tracking-tight text-neutral-900 flex items-center">
                ALLSALES<span className="text-amber-500 text-2xl leading-none">.</span>
              </span>
              <span className="text-[9px] font-extrabold tracking-widest text-neutral-500 block -mt-1 uppercase">
                {activeView === 'seller'
                  ? 'Seller Center'
                  : activeView === 'admin'
                  ? 'Admin Control Hub'
                  : activeView === 'customer'
                  ? 'Customer Account'
                  : 'Marketplace'}
              </span>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-xl hidden md:block">
            <div className="relative flex items-center">
              <input
                id="main-search-input"
                type="text"
                placeholder={
                  activeView === 'seller'
                    ? 'Search products, inventory SKUs, or customer orders...'
                    : activeView === 'admin'
                    ? 'Search registered sellers, catalog items, or ledger records...'
                    : 'Search products, brands and categories in Kenya...'
                }
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (activeView !== 'storefront' && activeView !== 'seller' && activeView !== 'admin') {
                    setActiveView('storefront');
                  }
                }}
                className="w-full pl-10 pr-20 py-2 bg-neutral-50 hover:bg-neutral-100/70 focus:bg-white text-xs text-neutral-900 rounded-lg border border-neutral-300 focus:outline-none focus:border-amber-500 transition-colors shadow-2xs"
              />
              <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 pointer-events-none" />
              <button
                onClick={() => {
                  if (activeView === 'customer') setActiveView('storefront');
                }}
                className="absolute right-1 bg-amber-500 hover:bg-amber-600 text-neutral-950 text-xs font-bold py-1 px-3 rounded-md shadow-xs transition-colors"
              >
                Search
              </button>
            </div>
          </div>

          {/* Right Role-Based Control Items */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* RBAC Persona / Role Switcher Pill */}
            <div className="relative" ref={roleMenuRef}>
              <button
                id="btn-role-switcher"
                onClick={() => setShowRoleModal(!showRoleModal)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-neutral-200 hover:border-amber-400 bg-neutral-50 hover:bg-white transition-all text-xs shadow-2xs"
                title="Switch Active Persona and Role Access"
              >
                <div className="w-5 h-5 rounded-full bg-amber-500 text-neutral-950 font-extrabold flex items-center justify-center text-[10px]">
                  {activePersona.role === 'customer'
                    ? '👤'
                    : activePersona.role === 'seller'
                    ? '🏪'
                    : '🛡️'}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="font-bold text-neutral-900 leading-tight line-clamp-1 max-w-[130px]">
                    {activePersona.name}
                  </div>
                  <div className="text-[10px] text-amber-700 font-semibold leading-tight">
                    {activePersona.roleLabel}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
              </button>

              {/* RBAC Persona Switcher Dropdown */}
              {showRoleModal && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-neutral-200 p-3 z-50 text-xs animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-100">
                    <div>
                      <h4 className="font-bold text-neutral-900 text-xs flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-amber-600" />
                        <span>Role-Based Access Control (RBAC)</span>
                      </h4>
                      <p className="text-[11px] text-neutral-500">
                        Switch persona to experience each dedicated interface
                      </p>
                    </div>
                    <button
                      onClick={() => setShowRoleModal(false)}
                      className="p-1 rounded-full hover:bg-neutral-100 text-neutral-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Persona Options */}
                  <div className="max-h-80 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                    <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-2 pt-1">
                      Customer & Buyer
                    </div>
                    {DEMO_PERSONAS.filter((p) => p.role === 'customer').map((p) => (
                      <div
                        key={p.id}
                        onClick={() => handleSelectPersona(p)}
                        className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-start justify-between gap-2 ${
                          currentRole === p.role
                            ? 'border-amber-500 bg-amber-50/60 shadow-2xs'
                            : 'border-neutral-100 hover:border-neutral-300 hover:bg-neutral-50'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-neutral-900">{p.name}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${p.roleBadgeColor}`}>
                              {p.roleLabel}
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-500 mt-0.5">{p.description}</p>
                        </div>
                        {currentRole === p.role && (
                          <CheckCircle2 className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        )}
                      </div>
                    ))}

                    <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-2 pt-2">
                      Sellers & Vendors
                    </div>
                    {DEMO_PERSONAS.filter((p) => p.role === 'seller').map((p) => (
                      <div
                        key={p.id}
                        onClick={() => handleSelectPersona(p)}
                        className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-start justify-between gap-2 ${
                          currentRole === p.role && currentSellerId === p.sellerId
                            ? 'border-amber-500 bg-amber-50/60 shadow-2xs'
                            : 'border-neutral-100 hover:border-neutral-300 hover:bg-neutral-50'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-neutral-900">{p.name}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${p.roleBadgeColor}`}>
                              {p.roleLabel}
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-500 mt-0.5">{p.description}</p>
                        </div>
                        {currentRole === p.role && currentSellerId === p.sellerId && (
                          <CheckCircle2 className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        )}
                      </div>
                    ))}

                    <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-2 pt-2">
                      Admin & Staff Roles
                    </div>
                    {DEMO_PERSONAS.filter((p) => p.role !== 'customer' && p.role !== 'seller').map((p) => (
                      <div
                        key={p.id}
                        onClick={() => handleSelectPersona(p)}
                        className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-start justify-between gap-2 ${
                          currentRole === p.role
                            ? 'border-amber-500 bg-amber-50/60 shadow-2xs'
                            : 'border-neutral-100 hover:border-neutral-300 hover:bg-neutral-50'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-neutral-900">{p.name}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${p.roleBadgeColor}`}>
                              {p.roleLabel}
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-500 mt-0.5">{p.description}</p>
                        </div>
                        {currentRole === p.role && (
                          <CheckCircle2 className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="mt-2 pt-2 border-t border-neutral-100 text-[10px] text-neutral-400 text-center">
                    Simulating live authentication and permissions across Kenyan commerce actors
                  </div>
                </div>
              )}
            </div>

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

      {/* 3. Storefront Contextual Categories Ribbon (Only shown on Storefront) */}
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
