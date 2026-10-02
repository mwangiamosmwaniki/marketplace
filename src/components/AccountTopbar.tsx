import { useState } from "react";
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Search,
  Shield,
  Settings,
  Store,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import { useApp } from "../context/AppContext";

export type AccountView = "seller" | "admin" | "finance" | "customer";

interface AccountTopbarProps {
  view: AccountView;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onBackToStorefront: () => void;
  mobileSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

const accountSearchLabels: Record<AccountView, string> = {
  seller: "Search products, SKUs, or customer orders...",
  admin: "Search sellers, audit logs, ledger records...",
  finance: "Search payments, payouts, orders...",
  customer: "Search your orders and account...",
};

const accountSettingsPaths: Partial<Record<AccountView, string>> = {
  admin: "/admin/settings",
  seller: "/seller/settings",
  customer: "/customer/security",
};

function roleLabel(role?: string, view?: AccountView) {
  if (role === "super_admin") return "Super Administrator";
  if (role === "seller_admin") return "Seller Compliance Admin";
  if (role === "logistics_admin") return "Logistics & Delivery Admin";
  if (role === "product_admin") return "Product Catalog Admin";
  if (role === "support_admin") return "Customer Support Admin";
  if (role === "marketing_admin") return "Marketing Admin";
  if (view === "finance") return "Finance Administrator";
  if (view === "seller") return "Seller Account";
  return "Customer Account";
}

export function AccountTopbar({
  view,
  searchQuery,
  setSearchQuery,
  onBackToStorefront,
  mobileSidebarOpen,
  onToggleSidebar,
}: AccountTopbarProps) {
  const { authUser, logout } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const searchLabel = accountSearchLabels[view];
  const settingsPath = accountSettingsPaths[view];
  const accountRole = roleLabel(authUser?.role, view);
  const RoleIcon =
    view === "seller"
      ? Store
      : view === "finance"
        ? Wallet
        : view === "customer"
          ? UserRound
          : Shield;

  return (
    <header className="relative z-40 flex min-h-14 shrink-0 items-center border-b border-[#999999] bg-[#F0F2F5] px-3 text-neutral-900 sm:px-4">
      <div className="flex w-full items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="rounded-lg border border-[#999999] p-2 text-neutral-800 hover:bg-black/10 xl:hidden"
          aria-label={
            mobileSidebarOpen ? "Close navigation" : "Open navigation"
          }
          aria-expanded={mobileSidebarOpen}
        >
          {mobileSidebarOpen ? (
            <X className="h-4 w-4" />
          ) : (
            <Menu className="h-4 w-4" />
          )}
        </button>

        <div className="hidden shrink-0 items-center gap-2 border-l border-[#999999] pl-3 sm:flex">
          <RoleIcon className="h-3.5 w-3.5 text-neutral-700" />
          <span className="text-xs font-semibold text-neutral-800">
            {accountRole}
          </span>
        </div>

        <label className="relative mx-auto flex min-w-[72px] max-w-lg flex-1 items-center">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={searchLabel}
            aria-label={searchLabel}
            className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 pl-9 text-[11px] text-neutral-900 shadow-sm placeholder:text-neutral-500 focus:border-amber-600 focus:outline-none"
          />
        </label>

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            className="relative p-2 text-neutral-700 hover:text-neutral-950"
            title="Notifications"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-amber-500" />
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="flex items-center gap-2 rounded-lg border border-[#999999] bg-[#D0D0D0] px-2 py-1.5 text-xs hover:bg-[#C2C2C2]"
              aria-label={`${authUser?.name || "Account"} account menu`}
              aria-haspopup="true"
              aria-expanded={menuOpen}
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-200 font-bold text-amber-900">
                {authUser?.name?.charAt(0) || "A"}
              </span>
              <span className="hidden max-w-40 truncate font-bold text-neutral-900 sm:inline">
                {authUser?.name || "Account"}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-neutral-700" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-60 rounded-lg border border-[#999999] bg-[#F4F4F4] py-1 text-xs shadow-2xl">
                <div className="border-b border-[#C5C5C5] px-3 py-2">
                  <div className="font-bold text-neutral-900">
                    {authUser?.name || "Account"}
                  </div>
                  <div className="truncate text-[11px] text-neutral-600">
                    {authUser?.email || accountRole}
                  </div>
                </div>
                {settingsPath && (
                  <Link
                    href={settingsPath}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 font-semibold text-neutral-700 hover:bg-black/5 hover:text-neutral-950"
                  >
                    <Settings className="h-4 w-4 text-neutral-500" />
                    Settings
                  </Link>
                )}
                <div className="border-t border-[#C5C5C5]" />
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    logout();
                    onBackToStorefront();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left font-semibold text-red-700 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
