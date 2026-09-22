import React, { useEffect, useState } from "react";
import { useMarketplace } from "../../context/MarketplaceContext";
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
  Settings,
} from "lucide-react";
import {
  Role,
  SellerStatus,
  PayoutStatus,
  Coupon,
  SystemSettings,
  OrderStatus,
  DeliveryZone,
} from "../../types";
import { AdminManagementPanel } from "./AdminManagementPanel";
import { FinanceAdminPanel } from "./finance/FinanceAdminPanel";

const SettingsSection: React.FC<{
  title: string;
  children: React.ReactNode;
}> = ({ title, children }) => (
  <section className="bg-white border border-neutral-200 rounded-xl p-4 space-y-3">
    <h3 className="text-sm font-extrabold text-neutral-900 border-b border-neutral-100 pb-2">
      {title}
    </h3>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
  </section>
);

const SettingsInput: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
}> = ({ label, value, onChange }) => (
  <label className="text-xs font-semibold text-neutral-600">
    <span className="block mb-1">{label}</span>
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full border border-neutral-300 rounded-lg px-2.5 py-2 text-xs text-neutral-900"
    />
  </label>
);

const SettingsNumber: React.FC<{
  label: string;
  value: number;
  onChange: (value: number) => void;
}> = ({ label, value, onChange }) => (
  <label className="text-xs font-semibold text-neutral-600">
    <span className="block mb-1">{label}</span>
    <input
      type="number"
      min="0"
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      className="w-full border border-neutral-300 rounded-lg px-2.5 py-2 text-xs text-neutral-900"
    />
  </label>
);

const SettingsToggle: React.FC<{
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}> = ({ label, checked, onChange }) => (
  <label className="flex items-center gap-2 text-xs font-semibold text-neutral-700 py-2">
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      className="rounded text-amber-500"
    />
    {label}
  </label>
);

interface AdminControlHubProps {
  requestedTab?:
    | "analytics"
    | "users"
    | "roles"
    | "security"
    | "audit"
    | "system"
    | "sellers"
    | "catalog"
    | "orders"
    | "finance"
    | "coupons"
    | "logistics"
    | "settings";
}

export const AdminControlHub: React.FC<AdminControlHubProps> = ({
  requestedTab,
}) => {
  const {
    authUser,
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
    updateSellerVerification,
    updateMasterOrder,
    deleteMasterOrder,
    updateSellerCommission,
    approvePayout,
    rejectPayout,
    createCoupon,
    updateProductStatus,
    settings,
    updateSettings,
    addDeliveryZone,
    updateDeliveryZone,
    deleteDeliveryZone,
  } = useMarketplace();

  const [adminTab, setAdminTab] = useState<
    | "analytics"
    | "users"
    | "roles"
    | "security"
    | "audit"
    | "system"
    | "sellers"
    | "catalog"
    | "orders"
    | "finance"
    | "coupons"
    | "logistics"
    | "settings"
  >("analytics");

  useEffect(() => {
    if (requestedTab) setAdminTab(requestedTab);
  }, [requestedTab]);
  const [settingsDraft, setSettingsDraft] = useState<SystemSettings>(settings);
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);
  const [newZone, setNewZone] = useState<DeliveryZone>({
    county: "",
    towns: [],
    homeDeliveryFee: 0,
    pickupStationFee: 0,
    estimatedDays: "2-3 days",
    pickupStations: [],
  });
  const [showZoneForm, setShowZoneForm] = useState(false);
  const role = authUser?.role;
  const canViewSellers = role === "super_admin" || role === "seller_admin";
  const canViewCatalog = role === "super_admin" || role === "product_admin";
  const canViewFinance = role === "super_admin" || role === "finance_admin";
  const canViewMarketing = role === "super_admin" || role === "marketing_admin";
  const canViewLogistics = role === "super_admin" || role === "logistics_admin";

  // Coupon Creation State
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponType, setCouponType] = useState<"percentage" | "fixed">(
    "percentage",
  );
  const [couponValue, setCouponValue] = useState<number>(10);
  const [couponMinSpend, setCouponMinSpend] = useState<number>(1000);

  // Platform Aggregate Analytics
  const totalGMV = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((sum, o) => sum + o.grandTotal, 0);

  const totalCommissionsEarned = orders
    .filter((o) => o.status !== "cancelled")
    .flatMap((o) => o.sellerSubOrders)
    .reduce((sum, s) => sum + s.commissionTotal, 0);

  const totalDeliveredOrders = orders.filter(
    (o) => o.status === "delivered",
  ).length;
  const pendingKYCSellers = sellers.filter(
    (s) => s.status === "under_review",
  ).length;
  const pendingPayoutsCount = payouts.filter(
    (p) => p.status === "pending",
  ).length;
  const selectedSeller = sellers.find(
    (seller) => seller.id === selectedSellerId,
  );

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
      expiresAt: "2026-12-31T23:59:59Z",
      usageLimit: 500,
      timesUsed: 0,
      isActive: true,
    });

    setShowCouponModal(false);
    setCouponCode("");
  };

  const handleCreateZone = (event: React.FormEvent) => {
    event.preventDefault();
    if (!newZone.county.trim()) return;
    addDeliveryZone({
      ...newZone,
      county: newZone.county.trim(),
      towns: newZone.towns.filter(Boolean),
      pickupStations: newZone.pickupStations.filter(Boolean),
    });
    setNewZone({
      county: "",
      towns: [],
      homeDeliveryFee: 0,
      pickupStationFee: 0,
      estimatedDays: "2-3 days",
      pickupStations: [],
    });
    setShowZoneForm(false);
  };

  const editZone = (zone: DeliveryZone) => {
    const homeFee = window.prompt(
      "Home delivery fee (KSh):",
      String(zone.homeDeliveryFee),
    );
    const pickupFee = window.prompt(
      "Pickup station fee (KSh):",
      String(zone.pickupStationFee),
    );
    const estimatedDays = window.prompt(
      "Estimated delivery period:",
      zone.estimatedDays,
    );
    if (homeFee === null || pickupFee === null || estimatedDays === null)
      return;
    updateDeliveryZone(zone.county, {
      homeDeliveryFee: Number(homeFee),
      pickupStationFee: Number(pickupFee),
      estimatedDays,
    });
  };

  return (
    <div id="admin-control-hub-container" className="px-4 py-6">
      <div className="space-y-6">
        {(adminTab === "users" ||
          adminTab === "roles" ||
          adminTab === "security" ||
          adminTab === "audit" ||
          adminTab === "system") && (
          <AdminManagementPanel initialTab={adminTab} />
        )}

        {/* 3. Tab Contents */}

        {adminTab === "finance" && <FinanceAdminPanel />}

        {/* ANALYTICS TAB */}
        {adminTab === "analytics" && (
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
                  Net earned revenue retained by KESALES
                </p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs">
                <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Active Verified Merchants
                </span>
                <div className="text-2xl font-extrabold text-neutral-900 mt-1">
                  {sellers.filter((s) => s.status === "approved").length}
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
                <p className="text-[11px] text-neutral-400 mt-1">
                  Out of {orders.length} total orders
                </p>
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
                    const count = products.filter(
                      (p) => p.categoryId === cat.id,
                    ).length;
                    return (
                      <div
                        key={cat.id}
                        className="flex items-center justify-between p-2 rounded bg-neutral-50"
                      >
                        <div>
                          <span className="font-bold text-neutral-800">
                            {cat.name}
                          </span>
                          <span className="text-[11px] text-neutral-500 block">
                            Default commission rate: {cat.commissionRate || 10}%
                          </span>
                        </div>
                        <span className="font-semibold text-neutral-700">
                          {count} products
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-xs">
                <h3 className="font-bold text-sm text-neutral-900 mb-3">
                  Finance Data Status
                </h3>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center p-2.5 rounded bg-emerald-50 text-emerald-800">
                    <span className="font-bold">
                      Payment records
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 bg-emerald-200 rounded">
                      Demo dataset
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-2.5 rounded bg-blue-50 text-blue-800">
                    <span className="font-bold">Pending reconciliation</span>
                    <span className="text-[11px] font-bold px-2 py-0.5 bg-blue-200 rounded">
                      Review queue
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-2.5 rounded bg-neutral-50 text-neutral-800">
                    <span className="font-bold">
                      Journal entries
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 bg-neutral-200 rounded">
                      {ledger.length} demo records
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SELLERS & KYC TAB */}
        {adminTab === "sellers" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm text-neutral-800">
                  Merchant Governance & KYC Verification
                </h3>
                <p className="text-xs text-neutral-500">
                  Audit vendor company certificates, KRA PIN numbers and set
                  custom commission tiers.
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
                        <div className="font-bold text-neutral-900">
                          {s.businessName}
                        </div>
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
                          <span className="font-bold text-neutral-900">
                            {s.commissionRate}%
                          </span>
                          <button
                            onClick={() => {
                              const newRate = prompt(
                                "Enter new commission %:",
                                s.commissionRate.toString(),
                              );
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
                            s.status === "approved"
                              ? "bg-emerald-100 text-emerald-800"
                              : s.status === "under_review"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-red-100 text-red-800"
                          }`}
                        >
                          {s.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setSelectedSellerId(s.id)}
                            className="text-blue-700 font-semibold"
                          >
                            Review application
                          </button>
                          {s.status !== "approved" && (
                            <button
                              onClick={() => approveSeller(s.id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded text-xs font-semibold"
                            >
                              Approve KYC
                            </button>
                          )}
                          {s.status === "approved" && (
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
            {selectedSeller && (
              <div className="bg-white rounded-xl border border-neutral-200 p-5 space-y-4 text-xs">
                <div className="flex flex-wrap justify-between gap-3 border-b border-neutral-100 pb-3">
                  <div>
                    <h3 className="font-bold text-sm text-neutral-900">
                      {selectedSeller.businessName} application
                    </h3>
                    <p className="text-neutral-500">
                      {selectedSeller.ownerName} • {selectedSeller.email} •
                      submitted{" "}
                      {selectedSeller.verification?.submittedAt
                        ? new Date(
                            selectedSeller.verification.submittedAt,
                          ).toLocaleDateString()
                        : "not submitted"}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedSellerId(null)}
                    className="text-neutral-500"
                  >
                    Close
                  </button>
                </div>
                {selectedSeller.verification ? (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                      {[
                        [
                          "Identity",
                          selectedSeller.verification.identityStatus,
                        ],
                        [
                          "Business",
                          selectedSeller.verification.businessStatus,
                        ],
                        ["Tax", selectedSeller.verification.taxStatus],
                        ["Payout", selectedSeller.verification.payoutStatus],
                        [
                          "Category",
                          selectedSeller.verification.categoryComplianceStatus,
                        ],
                      ].map(([label, status]) => (
                        <div key={label} className="bg-neutral-50 rounded p-2">
                          <span className="block text-neutral-500">
                            {label}
                          </span>
                          <strong className="capitalize">
                            {String(status).replace("_", " ")}
                          </strong>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <strong className="block">Identity</strong>
                        <p>
                          {selectedSeller.verification.legalName ||
                            selectedSeller.ownerName}{" "}
                          •{" "}
                          {selectedSeller.verification.idOrPassportNumber ||
                            "ID not supplied"}
                        </p>
                        <p>
                          {selectedSeller.verification.nationality ||
                            "Nationality not supplied"}
                        </p>
                      </div>
                      <div>
                        <strong className="block">Business</strong>
                        <p>
                          {selectedSeller.verification.tradingName ||
                            selectedSeller.businessName}
                        </p>
                        <p>
                          {selectedSeller.verification
                            .physicalBusinessAddress || selectedSeller.address}
                        </p>
                      </div>
                      <div>
                        <strong className="block">Financial</strong>
                        <p>
                          {selectedSeller.verification.mpesaNumber ||
                            selectedSeller.verification.bankAccountNumber ||
                            "Payout details not supplied"}
                        </p>
                        <p>
                          {selectedSeller.verification.mpesaAccountHolderName ||
                            selectedSeller.verification.bankAccountName ||
                            "Account holder not supplied"}
                        </p>
                      </div>
                    </div>
                    <div>
                      <strong className="block mb-2">
                        Ownership and control
                      </strong>
                      <p>
                        Directors:{" "}
                        {selectedSeller.verification.directors
                          .map((person) => person.fullName)
                          .join(", ") || "None recorded"}
                      </p>
                      <p>
                        Beneficial owners:{" "}
                        {selectedSeller.verification.beneficialOwners
                          .map(
                            (person) =>
                              `${person.fullName} (${person.ownershipPercentage || 0}%)`,
                          )
                          .join(", ") || "None recorded"}
                      </p>
                      <p>
                        Partners:{" "}
                        {selectedSeller.verification.partners
                          .map((person) => person.fullName)
                          .join(", ") || "None recorded"}
                      </p>
                    </div>
                    <div>
                      <strong className="block mb-2">Documents</strong>
                      <div className="space-y-2">
                        {selectedSeller.verification!.documents.map(
                          (document) => (
                            <div
                              key={document.id}
                              className="flex flex-wrap items-center gap-2 border border-neutral-200 rounded p-2"
                            >
                              <span className="font-semibold flex-1">
                                {document.documentType}
                              </span>
                              <span className="text-neutral-500">
                                {document.fileName || "No filename"}
                              </span>
                              <span className="capitalize">
                                {document.status.replace("_", " ")}
                              </span>
                              <button
                                onClick={() =>
                                  updateSellerVerification(selectedSeller.id, {
                                    ...selectedSeller.verification!,
                                    documents:
                                      selectedSeller.verification!.documents.map(
                                        (item) =>
                                          item.id === document.id
                                            ? {
                                                ...item,
                                                status: "verified",
                                                reviewedAt:
                                                  new Date().toISOString(),
                                              }
                                            : item,
                                      ),
                                  })
                                }
                                className="text-emerald-700 font-semibold"
                              >
                                Verify
                              </button>
                              <button
                                onClick={() =>
                                  updateSellerVerification(selectedSeller.id, {
                                    ...selectedSeller.verification!,
                                    documents:
                                      selectedSeller.verification!.documents.map(
                                        (item) =>
                                          item.id === document.id
                                            ? {
                                                ...item,
                                                status: "re_upload_required",
                                                reviewedAt:
                                                  new Date().toISOString(),
                                                verificationNotes:
                                                  "Additional information required",
                                              }
                                            : item,
                                      ),
                                  })
                                }
                                className="text-red-700 font-semibold"
                              >
                                Request re-upload
                              </button>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">Risk flags:</span>
                      {selectedSeller.verification.riskFlags.length ? (
                        selectedSeller.verification.riskFlags.map((flag) => (
                          <span
                            key={flag}
                            className="bg-red-100 text-red-800 px-2 py-1 rounded"
                          >
                            {flag}
                          </span>
                        ))
                      ) : (
                        <span className="text-emerald-700">None recorded</span>
                      )}
                      <button
                        onClick={() => approveSeller(selectedSeller.id)}
                        className="ml-auto bg-emerald-600 text-white px-3 py-1.5 rounded font-semibold"
                      >
                        Approve application
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-amber-900">
                    This seller has no verification application record yet. Ask
                    them to complete the seller verification workspace.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* CATALOG MODERATION TAB */}
        {adminTab === "catalog" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm text-neutral-800">
                  Product Catalog & Quality Moderation
                </h3>
                <p className="text-xs text-neutral-500">
                  Review products submitted by marketplace vendors before live
                  customer exposure.
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
                    <th className="p-3 text-right">Workflow</th>
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
                            <div className="text-[11px] text-neutral-500 font-mono">
                              {p.sku}
                            </div>
                          </div>
                        </td>
                        <td className="p-3 font-medium text-neutral-800">
                          {seller?.businessName || p.sellerId}
                        </td>
                        <td className="p-3 font-bold text-neutral-900">
                          {formatKSh(p.price)}
                        </td>
                        <td className="p-3">
                          <span className="font-semibold text-neutral-800">
                            {p.stock} units
                          </span>
                        </td>
                        <td className="p-3">
                          {p.isFlashSale ? (
                            <span className="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded">
                              ACTIVE FLASH
                            </span>
                          ) : (
                            <span className="text-neutral-400 text-[11px]">
                              Standard
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                            {p.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-2">
                            {["pending_approval", "draft", "rejected"].includes(
                              p.status,
                            ) && (
                              <button
                                onClick={() =>
                                  updateProductStatus(p.id, "active")
                                }
                                className="text-emerald-700 font-semibold"
                              >
                                Approve
                              </button>
                            )}
                            {p.status === "active" && (
                              <button
                                onClick={() =>
                                  updateProductStatus(p.id, "inactive")
                                }
                                className="text-red-600 font-semibold"
                              >
                                Suspend
                              </button>
                            )}
                            {p.status === "inactive" && (
                              <button
                                onClick={() =>
                                  updateProductStatus(p.id, "active")
                                }
                                className="text-blue-600 font-semibold"
                              >
                                Restore
                              </button>
                            )}
                          </div>
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
        {adminTab === "orders" && (
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-sm text-neutral-800">
                Platform Master Orders & Order Splitting Audit
              </h3>
              <p className="text-xs text-neutral-500">
                Inspect how customer checkout carts are automatically split into
                discrete vendor sub-orders.
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
                      <span className="text-neutral-600 font-semibold">
                        {order.customerName}
                      </span>
                      <span className="text-neutral-400 mx-2">•</span>
                      <span className="text-neutral-500 font-mono text-[11px]">
                        {order.paymentReference}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`font-bold px-2 py-0.5 rounded text-[11px] uppercase ${
                          order.status === "delivered"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {order.status.replace("_", " ")}
                      </span>
                      <span className="font-extrabold text-neutral-900 text-sm">
                        {formatKSh(order.grandTotal)}
                      </span>
                      <select
                        value={order.status}
                        onChange={(event) =>
                          updateMasterOrder(order.id, {
                            status: event.target.value as OrderStatus,
                          })
                        }
                        className="border border-neutral-300 rounded px-2 py-1 text-[11px]"
                      >
                        {[
                          "pending",
                          "confirmed",
                          "processing",
                          "ready_for_dispatch",
                          "dispatched",
                          "out_for_delivery",
                          "delivered",
                          "cancelled",
                          "returned",
                          "refunded",
                        ].map((status) => (
                          <option key={status} value={status}>
                            {status.replace("_", " ")}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => {
                          if (
                            window.confirm(`Delete order ${order.orderNumber}?`)
                          )
                            deleteMasterOrder(order.id);
                        }}
                        className="text-red-600 font-semibold"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Sub-orders List */}
                  <div className="py-3">
                    <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block mb-2">
                      Splitted Vendor Sub-Orders ({order.sellerSubOrders.length}
                      )
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {order.sellerSubOrders.map((sub) => (
                        <div
                          key={sub.id}
                          className="p-3 bg-neutral-50 rounded-lg border border-neutral-200"
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-neutral-900">
                              {sub.sellerName}
                            </span>
                            <span className="font-mono text-[11px] text-neutral-500">
                              {sub.subOrderNumber}
                            </span>
                          </div>
                          <div className="text-[11px] text-neutral-600">
                            {sub.items.map((it) => (
                              <div key={it.id}>
                                • {it.quantity}x {it.productName} (
                                {formatKSh(it.subtotal)})
                              </div>
                            ))}
                          </div>
                          <div className="mt-2 pt-2 border-t border-neutral-200 flex justify-between text-[11px]">
                            <span>
                              Commission: {formatKSh(sub.commissionTotal)}
                            </span>
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
        {false && adminTab === "finance" && (
          <div className="space-y-6">
            {/* Payout Approval Section */}
            <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs">
              <div className="p-4 bg-neutral-50 border-b border-neutral-200">
                <h3 className="font-bold text-sm text-neutral-800">
                  Seller Disbursement Requests ({payouts.length})
                </h3>
                <p className="text-xs text-neutral-500">
                  Review and approve withdrawal requests initiated by verified
                  merchants.
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
                    const s = sellers.find(
                      (seller) => seller.id === p.sellerId,
                    );
                    return (
                      <tr key={p.id} className="hover:bg-neutral-50/60">
                        <td className="p-3 font-mono font-bold text-neutral-800">
                          {p.payoutNumber}
                        </td>
                        <td className="p-3 font-semibold text-neutral-800">
                          {s?.businessName || p.sellerId}
                        </td>
                        <td className="p-3 font-extrabold text-neutral-900">
                          {formatKSh(p.amount)}
                        </td>
                        <td className="p-3 font-mono text-[11px] text-neutral-600">
                          {p.method.toUpperCase()}: {p.accountDetails}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              p.status === "approved" ||
                              p.status === "processed"
                                ? "bg-emerald-100 text-emerald-800"
                                : p.status === "rejected"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          {p.status === "pending" ? (
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
                            <span className="text-neutral-400 text-[11px]">
                              Audit Logged
                            </span>
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
                  All platform commissions, payouts, and order revenue
                  transactions are recorded with timestamp and running balance.
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
                    <tr
                      key={entry.id}
                      className="hover:bg-neutral-50/60 font-mono text-[11px]"
                    >
                      <td className="p-3 text-neutral-500">
                        {new Date(entry.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="p-3 font-semibold text-neutral-800 capitalize">
                        {entry.type.replace("_", " ")}
                      </td>
                      <td className="p-3 font-sans text-xs text-neutral-700">
                        {entry.description}
                      </td>
                      <td className="p-3 text-red-600 font-bold">
                        {entry.debit ? formatKSh(entry.debit) : "—"}
                      </td>
                      <td className="p-3 text-emerald-600 font-bold">
                        {entry.credit ? formatKSh(entry.credit) : "—"}
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
        {adminTab === "coupons" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm text-neutral-800">
                  Marketplace Promotional Coupons
                </h3>
                <p className="text-xs text-neutral-500">
                  Configure discount vouchers for customer acquisition and flash
                  campaign sales.
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
                      {c.type === "percentage" ||
                      c.discountType === "percentage"
                        ? `${c.value}% OFF`
                        : `KSh ${c.value} OFF`}
                    </p>
                    <p className="text-neutral-500 mt-0.5 text-[11px]">
                      Min Order:{" "}
                      {formatKSh(c.minOrderValue ?? c.minOrderAmount ?? 0)}
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
        {adminTab === "logistics" && (
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-sm text-neutral-800">
                Logistics & Delivery Zone Rate Matrix
              </h3>
              <p className="text-xs text-neutral-500">
                Real-time shipping tariffs across Kenya's 47 counties for door
                delivery and pickup stations.
              </p>
            </div>

            <div className="bg-white rounded-xl border border-neutral-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm">Delivery zone records</h3>
                <button
                  onClick={() => setShowZoneForm(!showZoneForm)}
                  className="bg-amber-500 text-neutral-950 px-3 py-2 rounded-lg text-xs font-bold"
                >
                  {showZoneForm ? "Close" : "Add zone"}
                </button>
              </div>
              {showZoneForm && (
                <form
                  onSubmit={handleCreateZone}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2"
                >
                  <input
                    required
                    placeholder="County"
                    value={newZone.county}
                    onChange={(event) =>
                      setNewZone({ ...newZone, county: event.target.value })
                    }
                    className="border border-neutral-300 rounded px-2 py-2"
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder="Home fee"
                    value={newZone.homeDeliveryFee}
                    onChange={(event) =>
                      setNewZone({
                        ...newZone,
                        homeDeliveryFee: Number(event.target.value),
                      })
                    }
                    className="border border-neutral-300 rounded px-2 py-2"
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder="Pickup fee"
                    value={newZone.pickupStationFee}
                    onChange={(event) =>
                      setNewZone({
                        ...newZone,
                        pickupStationFee: Number(event.target.value),
                      })
                    }
                    className="border border-neutral-300 rounded px-2 py-2"
                  />
                  <input
                    placeholder="Estimated days"
                    value={newZone.estimatedDays}
                    onChange={(event) =>
                      setNewZone({
                        ...newZone,
                        estimatedDays: event.target.value,
                      })
                    }
                    className="border border-neutral-300 rounded px-2 py-2"
                  />
                  <input
                    placeholder="Towns, comma separated"
                    onChange={(event) =>
                      setNewZone({
                        ...newZone,
                        towns: event.target.value
                          .split(",")
                          .map((item) => item.trim()),
                      })
                    }
                    className="border border-neutral-300 rounded px-2 py-2"
                  />
                  <input
                    placeholder="Pickup stations, comma separated"
                    onChange={(event) =>
                      setNewZone({
                        ...newZone,
                        pickupStations: event.target.value
                          .split(",")
                          .map((item) => item.trim()),
                      })
                    }
                    className="border border-neutral-300 rounded px-2 py-2"
                  />
                  <button className="bg-neutral-900 text-white rounded px-3 py-2 font-bold lg:col-span-2">
                    Create delivery zone
                  </button>
                </form>
              )}
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
                      {zone.pickupStations.join(", ")}
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-neutral-100 flex justify-end gap-2">
                    <button
                      onClick={() => editZone(zone)}
                      className="text-blue-700 font-semibold"
                    >
                      Edit rates
                    </button>
                    <button
                      onClick={() => {
                        if (
                          window.confirm(`Delete ${zone.county} delivery zone?`)
                        )
                          deleteDeliveryZone(zone.county);
                      }}
                      className="text-red-600 font-semibold"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SYSTEM SETTINGS TAB */}
        {adminTab === "settings" && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-extrabold text-neutral-900">
                System Settings
              </h2>
              <p className="text-xs text-neutral-500 mt-1">
                Manage KESALES configuration stored in the frontend demo state.
              </p>
            </div>
            <form
              className="grid grid-cols-1 xl:grid-cols-2 gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                updateSettings(settingsDraft);
              }}
            >
              <SettingsSection title="General">
                <SettingsInput
                  label="Marketplace Name"
                  value={settingsDraft.general.marketplaceName}
                  onChange={(value) =>
                    setSettingsDraft((prev) => ({
                      ...prev,
                      general: { ...prev.general, marketplaceName: value },
                    }))
                  }
                />
                <SettingsInput
                  label="Support Email"
                  value={settingsDraft.general.supportEmail}
                  onChange={(value) =>
                    setSettingsDraft((prev) => ({
                      ...prev,
                      general: { ...prev.general, supportEmail: value },
                    }))
                  }
                />
                <SettingsInput
                  label="Support Phone"
                  value={settingsDraft.general.supportPhone}
                  onChange={(value) =>
                    setSettingsDraft((prev) => ({
                      ...prev,
                      general: { ...prev.general, supportPhone: value },
                    }))
                  }
                />
                <SettingsInput
                  label="Address"
                  value={settingsDraft.general.address}
                  onChange={(value) =>
                    setSettingsDraft((prev) => ({
                      ...prev,
                      general: { ...prev.general, address: value },
                    }))
                  }
                />
              </SettingsSection>
              <SettingsSection title="Commerce">
                <SettingsNumber
                  label="Commission rate (%)"
                  value={settingsDraft.commerce.defaultCommissionRate}
                  onChange={(value) =>
                    setSettingsDraft((prev) => ({
                      ...prev,
                      commerce: {
                        ...prev.commerce,
                        defaultCommissionRate: value,
                      },
                    }))
                  }
                />
                <SettingsNumber
                  label="Minimum payout (KSh)"
                  value={settingsDraft.commerce.minPayoutAmount}
                  onChange={(value) =>
                    setSettingsDraft((prev) => ({
                      ...prev,
                      commerce: { ...prev.commerce, minPayoutAmount: value },
                    }))
                  }
                />
                <SettingsNumber
                  label="Return period (days)"
                  value={settingsDraft.commerce.returnPeriodDays}
                  onChange={(value) =>
                    setSettingsDraft((prev) => ({
                      ...prev,
                      commerce: { ...prev.commerce, returnPeriodDays: value },
                    }))
                  }
                />
                <SettingsNumber
                  label="VAT (%)"
                  value={settingsDraft.commerce.vatRate}
                  onChange={(value) =>
                    setSettingsDraft((prev) => ({
                      ...prev,
                      commerce: { ...prev.commerce, vatRate: value },
                    }))
                  }
                />
              </SettingsSection>
              <SettingsSection title="Payments">
                <SettingsToggle
                  label="M-Pesa"
                  checked={settingsDraft.payments.enableMpesa}
                  onChange={(value) =>
                    setSettingsDraft((prev) => ({
                      ...prev,
                      payments: { ...prev.payments, enableMpesa: value },
                    }))
                  }
                />
                <SettingsToggle
                  label="Cards"
                  checked={settingsDraft.payments.enableCard}
                  onChange={(value) =>
                    setSettingsDraft((prev) => ({
                      ...prev,
                      payments: { ...prev.payments, enableCard: value },
                    }))
                  }
                />
                <SettingsToggle
                  label="Bank transfer"
                  checked={settingsDraft.payments.enableBankTransfer}
                  onChange={(value) =>
                    setSettingsDraft((prev) => ({
                      ...prev,
                      payments: { ...prev.payments, enableBankTransfer: value },
                    }))
                  }
                />
                <SettingsToggle
                  label="Cash on delivery"
                  checked={settingsDraft.payments.enableCod}
                  onChange={(value) =>
                    setSettingsDraft((prev) => ({
                      ...prev,
                      payments: { ...prev.payments, enableCod: value },
                    }))
                  }
                />
              </SettingsSection>
              <SettingsSection title="Delivery & Notifications">
                <SettingsNumber
                  label="Delivery fee (KSh)"
                  value={settingsDraft.delivery.defaultDeliveryFee}
                  onChange={(value) =>
                    setSettingsDraft((prev) => ({
                      ...prev,
                      delivery: { ...prev.delivery, defaultDeliveryFee: value },
                    }))
                  }
                />
                <SettingsNumber
                  label="Free delivery threshold (KSh)"
                  value={settingsDraft.delivery.freeDeliveryThreshold}
                  onChange={(value) =>
                    setSettingsDraft((prev) => ({
                      ...prev,
                      delivery: {
                        ...prev.delivery,
                        freeDeliveryThreshold: value,
                      },
                    }))
                  }
                />
                <SettingsToggle
                  label="Pickup stations"
                  checked={settingsDraft.delivery.enablePickupStations}
                  onChange={(value) =>
                    setSettingsDraft((prev) => ({
                      ...prev,
                      delivery: {
                        ...prev.delivery,
                        enablePickupStations: value,
                      },
                    }))
                  }
                />
                <SettingsToggle
                  label="Email notifications"
                  checked={
                    settingsDraft.notifications.emailNotificationsEnabled
                  }
                  onChange={(value) =>
                    setSettingsDraft((prev) => ({
                      ...prev,
                      notifications: {
                        ...prev.notifications,
                        emailNotificationsEnabled: value,
                      },
                    }))
                  }
                />
                <SettingsToggle
                  label="SMS notifications"
                  checked={settingsDraft.notifications.smsNotificationsEnabled}
                  onChange={(value) =>
                    setSettingsDraft((prev) => ({
                      ...prev,
                      notifications: {
                        ...prev.notifications,
                        smsNotificationsEnabled: value,
                      },
                    }))
                  }
                />
              </SettingsSection>
              <SettingsSection title="Security & SEO">
                <SettingsNumber
                  label="Password minimum length"
                  value={settingsDraft.security.passwordMinLength}
                  onChange={(value) =>
                    setSettingsDraft((prev) => ({
                      ...prev,
                      security: { ...prev.security, passwordMinLength: value },
                    }))
                  }
                />
                <SettingsNumber
                  label="Session timeout (minutes)"
                  value={settingsDraft.security.sessionTimeoutMinutes}
                  onChange={(value) =>
                    setSettingsDraft((prev) => ({
                      ...prev,
                      security: {
                        ...prev.security,
                        sessionTimeoutMinutes: value,
                      },
                    }))
                  }
                />
                <SettingsToggle
                  label="Require admin 2FA"
                  checked={settingsDraft.security.twoFactorRequiredForAdmins}
                  onChange={(value) =>
                    setSettingsDraft((prev) => ({
                      ...prev,
                      security: {
                        ...prev.security,
                        twoFactorRequiredForAdmins: value,
                      },
                    }))
                  }
                />
                <SettingsInput
                  label="Meta title"
                  value={settingsDraft.seo.metaTitle}
                  onChange={(value) =>
                    setSettingsDraft((prev) => ({
                      ...prev,
                      seo: { ...prev.seo, metaTitle: value },
                    }))
                  }
                />
                <SettingsToggle
                  label="Search indexing"
                  checked={settingsDraft.seo.indexingEnabled}
                  onChange={(value) =>
                    setSettingsDraft((prev) => ({
                      ...prev,
                      seo: { ...prev.seo, indexingEnabled: value },
                    }))
                  }
                />
              </SettingsSection>
              <SettingsSection title="Maintenance">
                <SettingsToggle
                  label="Maintenance mode"
                  checked={settingsDraft.maintenance.isMaintenanceMode}
                  onChange={(value) =>
                    setSettingsDraft((prev) => ({
                      ...prev,
                      maintenance: {
                        ...prev.maintenance,
                        isMaintenanceMode: value,
                      },
                    }))
                  }
                />
                <SettingsInput
                  label="Maintenance message"
                  value={settingsDraft.maintenance.maintenanceMessage}
                  onChange={(value) =>
                    setSettingsDraft((prev) => ({
                      ...prev,
                      maintenance: {
                        ...prev.maintenance,
                        maintenanceMessage: value,
                      },
                    }))
                  }
                />
              </SettingsSection>
              <div className="xl:col-span-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSettingsDraft(settings)}
                  className="px-4 py-2 border border-neutral-300 rounded-lg text-xs font-bold text-neutral-700"
                >
                  Cancel / Reset
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 rounded-lg text-xs font-bold text-neutral-950"
                >
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Create Coupon Modal */}
      {showCouponModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl">
            <h3 className="font-bold text-base text-neutral-900 mb-1">
              Create Promotional Voucher
            </h3>
            <p className="text-xs text-neutral-500 mb-4">
              Enter voucher discount rules for checkout redemption.
            </p>

            <form
              onSubmit={handleCreateCouponSubmit}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-neutral-600 font-semibold mb-1">
                  Voucher Code *
                </label>
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
                <label className="block text-neutral-600 font-semibold mb-1">
                  Discount Type
                </label>
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
                  Discount Value ({couponType === "percentage" ? "%" : "KSh"}) *
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
