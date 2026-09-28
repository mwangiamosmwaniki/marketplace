import React, { useEffect, useState } from "react";
import { useMarketplace } from "../../context/MarketplaceContext";
import { useDialog } from "../../context/DialogContext";
import { ImageUploadField } from "../ImageUploadField";
import { AnalyticsDashboardVisual } from "../dashboard/AnalyticsDashboardVisual";
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
} from "lucide-react";
import {
  Product,
  ProductVariant,
  OrderStatus,
  SellerPerson,
  SellerType,
  SellerVerification,
  VerificationItemStatus,
} from "../../types";

interface SellerPortalProps {
  requestedTab?:
    | "dashboard"
    | "products"
    | "inventory"
    | "orders"
    | "payouts"
    | "verification"
    | "settings";
}

const createVerificationDraft = (
  seller: NonNullable<ReturnType<typeof useMarketplace>["currentSeller"]>,
): SellerVerification =>
  seller.verification || {
    sellerType: "individual",
    natureOfBusiness: "",
    productCategories: [],
    expectedMonthlySalesVolume: "",
    numberOfEmployees: 0,
    legalName: seller.ownerName,
    tradingName: seller.businessName,
    nationality: "Kenyan",
    dateOfBirth: "",
    idOrPassportNumber: "",
    identitySelfieFileName: "",
    emailVerified: true,
    phoneVerified: true,
    otpVerified: true,
    residentialAddress: "",
    physicalBusinessAddress: seller.address,
    buildingOrEstate: "",
    streetOrRoad: "",
    floorOrUnit: "",
    locationDescription: "",
    gpsCoordinates: "",
    website: "",
    socialMedia: "",
    vatNumber: "",
    vatApplicable: false,
    mpesaNumber: seller.payoutMethod === "mpesa" ? seller.payoutAccount : "",
    mpesaAccountHolderName: seller.ownerName,
    bankName: "",
    bankAccountName: "",
    bankAccountNumber: "",
    bankBranch: "",
    partners: [],
    directors: [],
    beneficialOwners: [],
    documents: [],
    declarations: {},
    applicationStatus: seller.status === "approved" ? "verified" : "unverified",
    identityStatus: "pending",
    businessStatus: "pending",
    taxStatus: "pending",
    payoutStatus: "pending",
    categoryComplianceStatus: "pending",
    riskFlags: [],
  };

const parsePeople = (value: string): SellerPerson[] =>
  value
    .split("\n")
    .map((line, index) => {
      const [
        fullName = "",
        idOrPassportNumber = "",
        kraPin = "",
        ownership = "",
      ] = line.split("|").map((part) => part.trim());
      return {
        id: `person-${index}-${fullName}`,
        fullName,
        idOrPassportNumber,
        kraPin,
        ownershipPercentage: Number(ownership) || 0,
      };
    })
    .filter((person) => person.fullName);

const peopleToText = (people: SellerPerson[]) =>
  people
    .map(
      (person) =>
        `${person.fullName} | ${person.idOrPassportNumber || ""} | ${person.kraPin || ""} | ${person.ownershipPercentage || ""}`,
    )
    .join("\n");

export const SellerPortal: React.FC<SellerPortalProps> = ({ requestedTab }) => {
  const { prompt: dialogPrompt } = useDialog();
  const {
    currentSeller,
    sellers,
    products,
    orders,
    payouts,
    categories,
    brands,
    formatKSh,
    addSellerProduct,
    updateSellerProduct,
    submitSellerProductForApproval,
    updateInventoryStock,
    updateSubOrderStatus,
    requestSellerPayout,
    updateSellerProfile,
    updateSellerVerification,
  } = useMarketplace();
  const supportedCategories = categories.filter(
    (category) => category.isSupported !== false,
  );

  const [activeTab, setActiveTab] = useState<
    | "dashboard"
    | "products"
    | "inventory"
    | "orders"
    | "payouts"
    | "verification"
    | "settings"
  >("dashboard");

  useEffect(() => {
    if (requestedTab) setActiveTab(requestedTab);
  }, [requestedTab]);

  // Add product modal state
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newProdName, setNewProdName] = useState("");
  const [newProdSku, setNewProdSku] = useState("");
  const [newProdCategory, setNewProdCategory] = useState(
    supportedCategories[0]?.id || "cat-phones",
  );
  const [newProdBrand, setNewProdBrand] = useState(
    brands[0]?.id || "brand-samsung",
  );
  const [newProdPrice, setNewProdPrice] = useState<number>(10000);
  const [newProdDiscount, setNewProdDiscount] = useState<number | undefined>(
    undefined,
  );
  const [newProdStock, setNewProdStock] = useState<number>(20);
  const [newProdDesc, setNewProdDesc] = useState("");
  const [newProdWarranty, setNewProdWarranty] = useState("12 Months Warranty");
  const [newProdCondition, setNewProdCondition] = useState<
    "Brand New" | "Refurbished" | "Open Box"
  >("Brand New");
  const [newProdImage, setNewProdImage] = useState(
    "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&auto=format&fit=crop&q=80",
  );

  // Variant generator state
  const [hasVariants, setHasVariants] = useState(false);
  const [variantColor, setVariantColor] = useState("Black");
  const [variantStorage, setVariantStorage] = useState("128GB");

  // Payout request modal state
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState<number>(5000);
  const [payoutMethod, setPayoutMethod] = useState<"mpesa" | "bank">("mpesa");
  const [payoutAccount, setPayoutAccount] = useState("");
  const [payoutMessage, setPayoutMessage] = useState<{
    text: string;
    success: boolean;
  } | null>(null);

  // Tracking number dispatch input state
  const [dispatchTrackingInput, setDispatchTrackingInput] = useState<
    Record<string, string>
  >({});
  const [verificationDraft, setVerificationDraft] =
    useState<SellerVerification | null>(null);

  useEffect(() => {
    if (currentSeller)
      setVerificationDraft(createVerificationDraft(currentSeller));
  }, [currentSeller?.id]);

  if (!currentSeller) {
    return (
      <div className="p-8 text-center bg-white rounded-lg border border-neutral-200 my-6">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-2" />
        <h3 className="font-bold text-neutral-800 text-base">
          Seller Not Found
        </h3>
        <p className="text-xs text-neutral-500">
          Please select a registered seller from the navigation bar.
        </p>
      </div>
    );
  }

  const verification =
    verificationDraft || createVerificationDraft(currentSeller);
  const updateVerification = (updates: Partial<SellerVerification>) => {
    const next = { ...verification, ...updates };
    setVerificationDraft(next);
    updateSellerVerification(currentSeller.id, next);
  };
  const requiredDocuments = [
    "National ID / Passport (front and back)",
    "Selfie / identity verification",
    "KRA PIN certificate",
    ...(verification.sellerType !== "individual"
      ? ["Business registration certificate"]
      : []),
    ...(verification.sellerType === "partnership"
      ? ["Partnership deed", "Authorized representative proof"]
      : []),
    ...(verification.sellerType === "limited_company"
      ? [
          "Certificate of incorporation",
          "Current company profile",
          "Beneficial ownership information",
          "Company bank account confirmation",
        ]
      : []),
    ...(verification.vatApplicable ? ["VAT certificate"] : []),
    ...(verification.sellerType !== "individual"
      ? ["County business permit"]
      : []),
    ...(verification.productCategories.some((category) =>
      /health|food|automotive/i.test(category),
    )
      ? ["Sector licence / regulatory certificate"]
      : []),
  ];
  const optionalDocuments = [
    "Proof of address",
    "Lease agreement",
    "Utility bill",
    "Business premises photo",
    "Product authorization",
    "Manufacturer authorization",
    "Import documentation",
    "Brand authorization",
    "Safety certification",
    "Health-related certification",
  ];

  // Tenant Isolated Data
  const sellerProducts = products.filter(
    (p) => p.sellerId === currentSeller.id,
  );
  const sellerSubOrders = orders.flatMap((o) =>
    o.sellerSubOrders.filter((sub) => sub.sellerId === currentSeller.id),
  );
  const sellerPayouts = payouts.filter((p) => p.sellerId === currentSeller.id);

  // Analytics
  const totalSalesRevenue = sellerSubOrders
    .filter((s) => s.status !== "cancelled")
    .reduce((sum, s) => sum + s.subtotal, 0);

  const totalCommissionDeducted = sellerSubOrders
    .filter((s) => s.status !== "cancelled")
    .reduce((sum, s) => sum + s.commissionTotal, 0);

  const pendingOrdersCount = sellerSubOrders.filter(
    (s) => s.status === "processing" || s.status === "ready_for_dispatch",
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
      slug: newProdName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      sku: newProdSku.trim().toUpperCase(),
      shortDescription: newProdDesc.slice(0, 100),
      description:
        newProdDesc || "Genuine product sourced from official distributors.",
      categoryId: newProdCategory,
      brandId: newProdBrand,
      price: Number(newProdPrice),
      discountPrice: newProdDiscount ? Number(newProdDiscount) : undefined,
      stock: Number(newProdStock),
      images: [newProdImage],
      variants: generatedVariants,
      status: "active",
      isFeatured: false,
      warranty: newProdWarranty,
      condition: newProdCondition,
      returnPolicy: "7 Days Return on eligible items",
      weightKg: 0.5,
    });

    setShowAddProductModal(false);
    // Reset form
    setNewProdName("");
    setNewProdSku("");
    setNewProdDesc("");
  };

  const handleRequestPayoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const account = payoutAccount.trim() || currentSeller.payoutAccount;
    const res = requestSellerPayout(
      currentSeller.id,
      payoutAmount,
      payoutMethod,
      account,
    );
    setPayoutMessage({ text: res.message, success: res.success });
    if (res.success) {
      setTimeout(() => {
        setShowPayoutModal(false);
        setPayoutMessage(null);
      }, 1500);
    }
  };

  return (
    <div id="seller-center-container" className="px-4 py-6">
      <div className="space-y-6">
        {/* 3. Tab Contents */}

        {/* DASHBOARD TAB */}
        {activeTab === "dashboard" && (
          <AnalyticsDashboardVisual
            mode="seller"
            sellerId={currentSeller.id}
            onNavigateTab={(tab) => setActiveTab(tab as any)}
          />
        )}

        {/* PRODUCTS TAB */}
        {activeTab === "products" && (
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
                            {p.variants?.length
                              ? `${p.variants.length} Variants`
                              : "Single Item"}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 font-mono text-neutral-600">
                        {p.sku}
                      </td>
                      <td className="p-3">
                        <span
                          className={`font-bold ${
                            p.stock <= 5 ? "text-red-600" : "text-neutral-800"
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
                            p.status === "active"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-neutral-200 text-neutral-800"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-2 flex-wrap">
                          <button
                            onClick={async () => {
                              const newPrice = await dialogPrompt(
                                "Enter new price in KSh:",
                                p.price.toString(),
                                "Edit product price",
                              );
                              if (newPrice && !isNaN(Number(newPrice)))
                                updateSellerProduct(p.id, {
                                  price: Number(newPrice),
                                });
                            }}
                            className="text-amber-600 hover:text-amber-700 font-semibold text-xs"
                          >
                            Edit Price
                          </button>
                          {["draft", "rejected", "inactive"].includes(
                            p.status,
                          ) && (
                            <button
                              onClick={() =>
                                submitSellerProductForApproval(p.id)
                              }
                              className="text-blue-600 hover:text-blue-700 font-semibold text-xs"
                            >
                              Submit for approval
                            </button>
                          )}
                          {p.status === "active" && (
                            <button
                              onClick={() =>
                                updateSellerProduct(p.id, {
                                  status: "inactive",
                                })
                              }
                              className="text-red-600 hover:text-red-700 font-semibold text-xs"
                            >
                              Pause
                            </button>
                          )}
                          {p.status === "inactive" && (
                            <button
                              onClick={() =>
                                updateSellerProduct(p.id, { status: "draft" })
                              }
                              className="text-emerald-600 hover:text-emerald-700 font-semibold text-xs"
                            >
                              Resume
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

        {/* INVENTORY TAB */}
        {activeTab === "inventory" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm text-neutral-800">
                  Real-Time Stock Adjustment
                </h3>
                <p className="text-xs text-neutral-500">
                  Update stock levels instantly to prevent overselling and
                  out-of-stock cancellations.
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
                              <span className="font-semibold text-neutral-800">
                                {p.name}
                              </span>
                              <span className="text-neutral-500 block text-[11px]">
                                {Object.entries(v.attributes)
                                  .map(([k, val]) => `${k}: ${val}`)
                                  .join(" | ")}
                              </span>
                            </td>
                            <td className="p-3 font-mono text-neutral-600">
                              {v.sku}
                            </td>
                            <td className="p-3">
                              <span
                                className={`font-bold ${
                                  v.stock <= 5
                                    ? "text-red-600"
                                    : "text-neutral-800"
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
                                <span className="text-[10px] text-neutral-400">
                                  (Auto-saves on blur)
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr className="hover:bg-neutral-50/60">
                          <td className="p-3 font-semibold text-neutral-800">
                            {p.name}
                          </td>
                          <td className="p-3 font-mono text-neutral-600">
                            {p.sku}
                          </td>
                          <td className="p-3">
                            <span
                              className={`font-bold ${
                                p.stock <= 5
                                  ? "text-red-600"
                                  : "text-neutral-800"
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
                              <span className="text-[10px] text-neutral-400">
                                (Auto-saves on blur)
                              </span>
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
        {activeTab === "orders" && (
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-sm text-neutral-800">
                Sub-Orders Dispatch & Fulfillment ({sellerSubOrders.length})
              </h3>
              <p className="text-xs text-neutral-500">
                Only orders containing products fulfilled by{" "}
                {currentSeller.businessName} are shown here.
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
                        sub.status === "delivered"
                          ? "bg-emerald-100 text-emerald-800"
                          : sub.status === "dispatched"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {sub.status.replace("_", " ")}
                    </span>
                  </div>

                  {/* Items */}
                  <div className="py-3 space-y-2">
                    {sub.items.map((it) => (
                      <div
                        key={it.id}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <img
                            src={it.productImage}
                            alt={it.productName}
                            className="w-10 h-10 object-cover rounded border"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <div className="font-semibold text-neutral-900">
                              {it.productName}
                            </div>
                            <div className="text-[11px] text-neutral-500">
                              Qty: {it.quantity} • Unit: {formatKSh(it.price)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-neutral-900">
                            {formatKSh(it.subtotal)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Financial breakdown */}
                  <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200 flex flex-wrap justify-between items-center text-[11px] text-neutral-600 gap-2">
                    <div>Package Subtotal: {formatKSh(sub.subtotal)}</div>
                    <div>
                      Platform Commission ({currentSeller.commissionRate}%): -
                      {formatKSh(sub.commissionTotal)}
                    </div>
                    <div className="font-bold text-neutral-900">
                      Net Seller Payout: {formatKSh(sub.sellerNetTotal)}
                    </div>
                  </div>

                  {/* Fulfillment Actions */}
                  <div className="mt-4 pt-3 border-t border-neutral-100 flex flex-wrap justify-between items-center gap-3">
                    <div className="flex items-center gap-2">
                      {sub.status === "ready_for_dispatch" && (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Carrier Tracking # (e.g. TRK-KS-991)"
                            value={dispatchTrackingInput[sub.id] || ""}
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
                                dispatchTrackingInput[sub.id] ||
                                `TRK-KS-${Math.floor(10000 + Math.random() * 90000)}`;
                              updateSubOrderStatus(sub.id, "dispatched", trk);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded flex items-center gap-1"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            Hand Over to Courier
                          </button>
                        </div>
                      )}

                      {sub.status === "processing" && (
                        <button
                          onClick={() =>
                            updateSubOrderStatus(sub.id, "ready_for_dispatch")
                          }
                          className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-4 py-1.5 rounded"
                        >
                          Accept & Pack Order
                        </button>
                      )}

                      {sub.status === "dispatched" && (
                        <button
                          onClick={() =>
                            updateSubOrderStatus(sub.id, "delivered")
                          }
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
        {activeTab === "payouts" && (
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
                <p className="text-[11px] text-neutral-400 mt-1">
                  Lifetime historical withdrawals
                </p>
              </div>
            </div>

            {/* Past Payout Requests Table */}
            <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs">
              <div className="p-4 bg-neutral-50 border-b border-neutral-200 flex justify-between items-center">
                <h3 className="font-bold text-sm text-neutral-800">
                  Disbursement History
                </h3>
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
                      <td
                        colSpan={5}
                        className="p-6 text-center text-neutral-400"
                      >
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
                          </span>{" "}
                          <span className="text-neutral-500 font-mono text-[11px]">
                            {pay.accountDetails}
                          </span>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              pay.status === "approved" ||
                              pay.status === "processed"
                                ? "bg-emerald-100 text-emerald-800"
                                : pay.status === "rejected"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-amber-100 text-amber-800"
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

        {/* SELLER VERIFICATION WORKSPACE */}
        {activeTab === "verification" && (
          <div className="space-y-4 text-xs">
            <div className="bg-neutral-900 text-white rounded-xl p-5 flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-amber-400 font-bold uppercase tracking-wider text-[10px]">
                  Seller verification
                </p>
                <h2 className="text-xl font-black mt-1">
                  Build your compliance profile
                </h2>
                <p className="text-neutral-300 mt-1 max-w-xl">
                  Capture the information KESALES needs for identity, KYB, tax,
                  payout and category review. Requirements update with your
                  seller type and categories.
                </p>
              </div>
              <div className="text-right">
                <span className="block text-2xl font-black">
                  {verification.applicationStatus.replaceAll("_", " ")}
                </span>
                <span className="text-neutral-400">
                  {
                    verification.documents.filter(
                      (document) => document.status === "verified",
                    ).length
                  }{" "}
                  verified documents
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {(
                [
                  "identityStatus",
                  "businessStatus",
                  "taxStatus",
                  "payoutStatus",
                  "categoryComplianceStatus",
                ] as const
              ).map((key, index) => {
                const labels = [
                  "Identity",
                  "Business",
                  "Tax",
                  "Payout",
                  "Category compliance",
                ];
                return (
                  <div
                    key={key}
                    className="bg-white border border-neutral-200 rounded-lg p-3"
                  >
                    <span className="text-neutral-500 block">
                      {labels[index]}
                    </span>
                    <strong className="capitalize text-neutral-900">
                      {verification[key].replaceAll("_", " ")}
                    </strong>
                  </div>
                );
              })}
            </div>

            <div className="bg-white rounded-xl border border-neutral-200 p-5 space-y-5">
              <div>
                <h3 className="font-bold text-sm text-neutral-900">
                  1. Seller account information
                </h3>
                <p className="text-neutral-500 mt-1">
                  These fields establish the seller, store and expected
                  operating profile.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <label>
                  Seller type
                  <select
                    value={verification.sellerType}
                    onChange={(event) =>
                      updateVerification({
                        sellerType: event.target.value as SellerType,
                      })
                    }
                    className="form-input"
                  >
                    <option value="individual">Individual</option>
                    <option value="sole_proprietor">Sole proprietor</option>
                    <option value="partnership">Partnership</option>
                    <option value="limited_company">Limited company</option>
                    <option value="other_organization">
                      Other registered organization
                    </option>
                  </select>
                </label>
                <label>
                  Full legal name
                  <input
                    value={verification.legalName}
                    onChange={(event) =>
                      updateVerification({ legalName: event.target.value })
                    }
                    className="form-input"
                  />
                </label>
                <label>
                  Trading / store name
                  <input
                    value={verification.tradingName}
                    onChange={(event) =>
                      updateVerification({ tradingName: event.target.value })
                    }
                    className="form-input"
                  />
                </label>
                <label>
                  Email address
                  <input
                    type="email"
                    value={currentSeller.email}
                    readOnly
                    className="form-input bg-neutral-50"
                  />
                </label>
                <label>
                  Phone number
                  <input
                    value={currentSeller.phone}
                    readOnly
                    className="form-input bg-neutral-50"
                  />
                </label>
                <label>
                  Nature of business
                  <input
                    value={verification.natureOfBusiness}
                    onChange={(event) =>
                      updateVerification({
                        natureOfBusiness: event.target.value,
                      })
                    }
                    className="form-input"
                  />
                </label>
                <label>
                  Expected monthly sales volume
                  <input
                    value={verification.expectedMonthlySalesVolume}
                    onChange={(event) =>
                      updateVerification({
                        expectedMonthlySalesVolume: event.target.value,
                      })
                    }
                    placeholder="e.g. KSh 100,000 - 500,000"
                    className="form-input"
                  />
                </label>
                <label>
                  Number of employees
                  <input
                    type="number"
                    min="0"
                    value={verification.numberOfEmployees || 0}
                    onChange={(event) =>
                      updateVerification({
                        numberOfEmployees: Number(event.target.value),
                      })
                    }
                    className="form-input"
                  />
                </label>
                <label>
                  Product categories
                  <select
                    multiple
                    value={verification.productCategories}
                    onChange={(event) =>
                      updateVerification({
                        productCategories: Array.from(
                          event.target.selectedOptions,
                          (option) => option.value,
                        ),
                      })
                    }
                    className="form-input h-20"
                  >
                    {supportedCategories.map((category) => (
                      <option key={category.id} value={category.name}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-neutral-200 p-5 space-y-4">
              <div>
                <h3 className="font-bold text-sm text-neutral-900">
                  2. Identity, contact and location
                </h3>
                <p className="text-neutral-500 mt-1">
                  Collect enough information to verify the applicant and where
                  the business operates.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <label>
                  Date of birth
                  <input
                    type="date"
                    value={verification.dateOfBirth || ""}
                    onChange={(event) =>
                      updateVerification({ dateOfBirth: event.target.value })
                    }
                    className="form-input"
                  />
                </label>
                <label>
                  Nationality
                  <input
                    value={verification.nationality || ""}
                    onChange={(event) =>
                      updateVerification({ nationality: event.target.value })
                    }
                    className="form-input"
                  />
                </label>
                <label>
                  ID / passport number
                  <input
                    value={verification.idOrPassportNumber || ""}
                    onChange={(event) =>
                      updateVerification({
                        idOrPassportNumber: event.target.value,
                      })
                    }
                    className="form-input"
                  />
                </label>
                <label>
                  Residential address
                  <input
                    value={verification.residentialAddress}
                    onChange={(event) =>
                      updateVerification({
                        residentialAddress: event.target.value,
                      })
                    }
                    className="form-input"
                  />
                </label>
                <label>
                  Physical business address
                  <input
                    value={verification.physicalBusinessAddress}
                    onChange={(event) =>
                      updateVerification({
                        physicalBusinessAddress: event.target.value,
                      })
                    }
                    className="form-input"
                  />
                </label>
                <label>
                  County
                  <input
                    value={currentSeller.county}
                    readOnly
                    className="form-input bg-neutral-50"
                  />
                </label>
                <label>
                  Town / city
                  <input
                    value={currentSeller.town}
                    readOnly
                    className="form-input bg-neutral-50"
                  />
                </label>
                <label>
                  Building / estate
                  <input
                    value={verification.buildingOrEstate}
                    onChange={(event) =>
                      updateVerification({
                        buildingOrEstate: event.target.value,
                      })
                    }
                    className="form-input"
                  />
                </label>
                <label>
                  Street / road
                  <input
                    value={verification.streetOrRoad}
                    onChange={(event) =>
                      updateVerification({ streetOrRoad: event.target.value })
                    }
                    className="form-input"
                  />
                </label>
                <label>
                  Floor / unit
                  <input
                    value={verification.floorOrUnit}
                    onChange={(event) =>
                      updateVerification({ floorOrUnit: event.target.value })
                    }
                    className="form-input"
                  />
                </label>
                <label>
                  GPS coordinates
                  <input
                    value={verification.gpsCoordinates || ""}
                    onChange={(event) =>
                      updateVerification({ gpsCoordinates: event.target.value })
                    }
                    className="form-input"
                  />
                </label>
                <label>
                  Location description
                  <textarea
                    value={verification.locationDescription}
                    onChange={(event) =>
                      updateVerification({
                        locationDescription: event.target.value,
                      })
                    }
                    className="form-input"
                  />
                </label>
              </div>
              <div className="flex flex-wrap gap-4 border-t border-neutral-100 pt-3">
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={verification.emailVerified}
                    onChange={(event) =>
                      updateVerification({
                        emailVerified: event.target.checked,
                      })
                    }
                  />{" "}
                  Email verified
                </label>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={verification.phoneVerified}
                    onChange={(event) =>
                      updateVerification({
                        phoneVerified: event.target.checked,
                      })
                    }
                  />{" "}
                  Phone verified
                </label>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={verification.otpVerified}
                    onChange={(event) =>
                      updateVerification({ otpVerified: event.target.checked })
                    }
                  />{" "}
                  OTP verified
                </label>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-neutral-200 p-5 space-y-4">
              <div>
                <h3 className="font-bold text-sm text-neutral-900">
                  3. Business, ownership and tax
                </h3>
                <p className="text-neutral-500 mt-1">
                  Use one person per line:{" "}
                  <span className="font-mono">
                    Full name | ID/passport | KRA PIN | ownership %
                  </span>
                  .
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <label>
                  Partners
                  <textarea
                    value={peopleToText(verification.partners)}
                    onChange={(event) =>
                      updateVerification({
                        partners: parsePeople(event.target.value),
                      })
                    }
                    className="form-input h-24"
                    placeholder="Required for partnerships"
                  />
                </label>
                <label>
                  Directors
                  <textarea
                    value={peopleToText(verification.directors)}
                    onChange={(event) =>
                      updateVerification({
                        directors: parsePeople(event.target.value),
                      })
                    }
                    className="form-input h-24"
                    placeholder="Required for limited companies"
                  />
                </label>
                <label>
                  Beneficial owners
                  <textarea
                    value={peopleToText(verification.beneficialOwners)}
                    onChange={(event) =>
                      updateVerification({
                        beneficialOwners: parsePeople(event.target.value),
                      })
                    }
                    className="form-input h-24"
                    placeholder="Include control details in review notes"
                  />
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label>
                  VAT applicable
                  <select
                    value={String(verification.vatApplicable)}
                    onChange={(event) =>
                      updateVerification({
                        vatApplicable: event.target.value === "true",
                      })
                    }
                    className="form-input"
                  >
                    <option value="false">No</option>
                    <option value="true">Yes</option>
                  </select>
                </label>
                <label>
                  VAT number
                  <input
                    value={verification.vatNumber || ""}
                    onChange={(event) =>
                      updateVerification({ vatNumber: event.target.value })
                    }
                    className="form-input"
                  />
                </label>
                <label>
                  Review notes
                  <textarea
                    value={verification.reviewNotes || ""}
                    onChange={(event) =>
                      updateVerification({ reviewNotes: event.target.value })
                    }
                    className="form-input"
                  />
                </label>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-neutral-200 p-5 space-y-4">
              <div>
                <h3 className="font-bold text-sm text-neutral-900">
                  4. Payout identity
                </h3>
                <p className="text-neutral-500 mt-1">
                  KESALES compares the verified seller, business identity and
                  payout destination.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <label>
                  M-Pesa number
                  <input
                    value={verification.mpesaNumber || ""}
                    onChange={(event) =>
                      updateVerification({ mpesaNumber: event.target.value })
                    }
                    className="form-input"
                  />
                </label>
                <label>
                  M-Pesa account holder
                  <input
                    value={verification.mpesaAccountHolderName || ""}
                    onChange={(event) =>
                      updateVerification({
                        mpesaAccountHolderName: event.target.value,
                      })
                    }
                    className="form-input"
                  />
                </label>
                <label>
                  Bank name
                  <input
                    value={verification.bankName || ""}
                    onChange={(event) =>
                      updateVerification({ bankName: event.target.value })
                    }
                    className="form-input"
                  />
                </label>
                <label>
                  Bank account name
                  <input
                    value={verification.bankAccountName || ""}
                    onChange={(event) =>
                      updateVerification({
                        bankAccountName: event.target.value,
                      })
                    }
                    className="form-input"
                  />
                </label>
                <label>
                  Bank account number
                  <input
                    value={verification.bankAccountNumber || ""}
                    onChange={(event) =>
                      updateVerification({
                        bankAccountNumber: event.target.value,
                      })
                    }
                    className="form-input"
                  />
                </label>
                <label>
                  Branch
                  <input
                    value={verification.bankBranch || ""}
                    onChange={(event) =>
                      updateVerification({ bankBranch: event.target.value })
                    }
                    className="form-input"
                  />
                </label>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-neutral-200 p-5 space-y-4">
              <div>
                <h3 className="font-bold text-sm text-neutral-900">
                  5. Documents and category compliance
                </h3>
                <p className="text-neutral-500 mt-1">
                  Upload only what applies. Every item keeps its own review
                  status and rejection notes.
                </p>
              </div>
              <div className="space-y-2">
                {requiredDocuments.map((requiredDocument) => {
                  const document = verification.documents.find(
                    (item) => item.documentType === requiredDocument,
                  );
                  return (
                    <div
                      key={requiredDocument}
                      className="flex flex-wrap items-center gap-2 border border-neutral-200 rounded-lg p-3"
                    >
                      <span className="font-semibold flex-1 min-w-48">
                        {requiredDocument}
                      </span>
                      {document ? (
                        <>
                          <span className="text-neutral-500">
                            {document.fileName || "No file selected"}
                          </span>
                          <select
                            value={document.status}
                            onChange={(event) =>
                              updateVerification({
                                documents: verification.documents.map((item) =>
                                  item.id === document.id
                                    ? {
                                        ...item,
                                        status: event.target
                                          .value as VerificationItemStatus,
                                      }
                                    : item,
                                ),
                              })
                            }
                            className="border border-neutral-300 rounded px-2 py-1"
                          >
                            <option value="pending">Pending</option>
                            <option value="under_review">Under review</option>
                            <option value="verified">Verified</option>
                            <option value="rejected">Rejected</option>
                            <option value="expired">Expired</option>
                            <option value="re_upload_required">
                              Re-upload required
                            </option>
                          </select>
                          <input
                            value={document.verificationNotes || ""}
                            onChange={(event) =>
                              updateVerification({
                                documents: verification.documents.map((item) =>
                                  item.id === document.id
                                    ? {
                                        ...item,
                                        verificationNotes: event.target.value,
                                      }
                                    : item,
                                ),
                              })
                            }
                            placeholder="Review note"
                            className="border border-neutral-300 rounded px-2 py-1"
                          />
                        </>
                      ) : (
                        <input
                          type="file"
                          onChange={(event) => {
                            const fileName = event.target.files?.[0]?.name;
                            if (fileName)
                              updateVerification({
                                documents: [
                                  ...verification.documents,
                                  {
                                    id: `doc-${Date.now()}`,
                                    documentType: requiredDocument,
                                    fileName,
                                    status: "pending",
                                    uploadedAt: new Date().toISOString(),
                                  },
                                ],
                              });
                          }}
                          className="max-w-full"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              <div>
                <p className="font-semibold text-neutral-700 mb-2">
                  Optional supporting evidence and category documents
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {optionalDocuments.map((optionalDocument) => {
                    const document = verification.documents.find(
                      (item) => item.documentType === optionalDocument,
                    );
                    return (
                      <label
                        key={optionalDocument}
                        className="border border-dashed border-neutral-300 rounded-lg p-3"
                      >
                        {optionalDocument}
                        {document ? (
                          <span className="block text-neutral-500 mt-1">
                            {document.fileName}
                          </span>
                        ) : (
                          <input
                            type="file"
                            onChange={(event) => {
                              const fileName = event.target.files?.[0]?.name;
                              if (fileName)
                                updateVerification({
                                  documents: [
                                    ...verification.documents,
                                    {
                                      id: `doc-${Date.now()}`,
                                      documentType: optionalDocument,
                                      fileName,
                                      status: "pending",
                                      uploadedAt: new Date().toISOString(),
                                    },
                                  ],
                                });
                            }}
                            className="block mt-1 max-w-full"
                          />
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label>
                  Website
                  <input
                    value={verification.website || ""}
                    onChange={(event) =>
                      updateVerification({ website: event.target.value })
                    }
                    className="form-input"
                  />
                </label>
                <label>
                  Social media pages
                  <input
                    value={verification.socialMedia || ""}
                    onChange={(event) =>
                      updateVerification({ socialMedia: event.target.value })
                    }
                    className="form-input"
                  />
                </label>
                <label>
                  Selfie file
                  <input
                    type="file"
                    onChange={(event) =>
                      updateVerification({
                        identitySelfieFileName:
                          event.target.files?.[0]?.name || "",
                      })
                    }
                    className="form-input"
                  />
                </label>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-neutral-200 p-5 space-y-3">
              <h3 className="font-bold text-sm text-neutral-900">
                6. Seller declarations
              </h3>
              {[
                "Information provided is accurate",
                "Authorized to sell listed products",
                "Agrees to KESALES seller terms",
                "Agrees to returns and refund policy",
                "Agrees to prohibited-products policy",
                "Agrees to shipping and fulfillment requirements",
                "Agrees to payment and payout terms",
                "Agrees to privacy and data-processing terms",
                "Ownership and control information is accurate",
                "Documents submitted are genuine",
              ].map((declaration) => (
                <label key={declaration} className="check-label block">
                  <input
                    type="checkbox"
                    checked={Boolean(verification.declarations[declaration])}
                    onChange={(event) =>
                      updateVerification({
                        declarations: {
                          ...verification.declarations,
                          [declaration]: event.target.checked,
                        },
                      })
                    }
                  />{" "}
                  {declaration}
                </label>
              ))}
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  onClick={() =>
                    updateVerification({ applicationStatus: "incomplete" })
                  }
                  className="button-secondary"
                >
                  Save draft
                </button>
                <button
                  onClick={() =>
                    updateVerification({
                      applicationStatus: "pending_review",
                      submittedAt: new Date().toISOString(),
                      declarationAcceptedAt: new Date().toISOString(),
                      termsVersion: "2026.09",
                      privacyPolicyVersion: "2026.09",
                    })
                  }
                  className="button-primary"
                >
                  <Send className="w-4 h-4" /> Submit for compliance review
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STORE SETTINGS & KYC TAB */}
        {activeTab === "settings" && (
          <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-xs max-w-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <div>
                <h3 className="font-bold text-sm text-neutral-900">
                  Merchant Profile & KYC Documents
                </h3>
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
                <label className="block text-neutral-500 mb-1">
                  Business Registered Name
                </label>
                <input
                  type="text"
                  defaultValue={currentSeller.businessName}
                  onBlur={(e) =>
                    updateSellerProfile(currentSeller.id, {
                      businessName: e.target.value,
                    })
                  }
                  className="w-full p-2 border border-neutral-300 rounded font-semibold"
                />
              </div>

              <div>
                <label className="block text-neutral-500 mb-1">
                  Owner / Director Name
                </label>
                <input
                  type="text"
                  defaultValue={currentSeller.ownerName}
                  onBlur={(e) =>
                    updateSellerProfile(currentSeller.id, {
                      ownerName: e.target.value,
                    })
                  }
                  className="w-full p-2 border border-neutral-300 rounded font-semibold"
                />
              </div>

              <div>
                <label className="block text-neutral-500 mb-1">
                  Tax PIN (KRA)
                </label>
                <input
                  type="text"
                  disabled
                  defaultValue={currentSeller.taxPin}
                  className="w-full p-2 border border-neutral-200 bg-neutral-50 rounded font-mono text-neutral-600"
                />
              </div>

              <div>
                <label className="block text-neutral-500 mb-1">
                  Business Registration Certificate #
                </label>
                <input
                  type="text"
                  disabled
                  defaultValue={currentSeller.businessRegNumber}
                  className="w-full p-2 border border-neutral-200 bg-neutral-50 rounded font-mono text-neutral-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-neutral-500 mb-1">
                Storefront Description
              </label>
              <textarea
                rows={3}
                defaultValue={currentSeller.description}
                onBlur={(e) =>
                  updateSellerProfile(currentSeller.id, {
                    description: e.target.value,
                  })
                }
                className="w-full p-2 border border-neutral-300 rounded"
              />
            </div>

            <div>
              <label className="block text-neutral-500 mb-1">
                Default Settlement Account
              </label>
              <input
                type="text"
                defaultValue={currentSeller.payoutAccount}
                onBlur={(e) =>
                  updateSellerProfile(currentSeller.id, {
                    payoutAccount: e.target.value,
                  })
                }
                className="w-full p-2 border border-neutral-300 rounded font-mono"
              />
            </div>
          </div>
        )}
      </div>

      {/* Add Product Modal */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-2xl relative">
            <h3 className="font-bold text-base text-neutral-900 mb-1">
              Add New Product to Storefront
            </h3>
            <p className="text-xs text-neutral-500 mb-4">
              Enter product specifications, pricing, stock and optional
              variation matrix.
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
                  <label className="block text-neutral-600 font-semibold mb-1">
                    Base SKU *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ANK-PRIME-67W"
                    value={newProdSku}
                    onChange={(e) =>
                      setNewProdSku(e.target.value.toUpperCase())
                    }
                    className="w-full p-2 border border-neutral-300 rounded font-mono"
                  />
                </div>

                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">
                    Category
                  </label>
                  <select
                    value={newProdCategory}
                    onChange={(e) => setNewProdCategory(e.target.value)}
                    className="w-full p-2 border border-neutral-300 rounded"
                  >
                    {supportedCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">
                    Brand
                  </label>
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
                    value={newProdDiscount || ""}
                    onChange={(e) =>
                      setNewProdDiscount(
                        e.target.value ? Number(e.target.value) : undefined,
                      )
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
                  <label className="block text-neutral-600 font-semibold mb-1">
                    Condition
                  </label>
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

              <ImageUploadField
                label="Product image"
                value={newProdImage}
                onChange={setNewProdImage}
                required
              />

              <div>
                <label className="block text-neutral-600 font-semibold mb-1">
                  Description
                </label>
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
                  <span>
                    This product has size, color or storage variations
                  </span>
                </label>

                {hasVariants && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-neutral-500">
                        Color
                      </label>
                      <input
                        type="text"
                        value={variantColor}
                        onChange={(e) => setVariantColor(e.target.value)}
                        className="w-full p-1.5 border rounded bg-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-neutral-500">
                        Spec / Storage
                      </label>
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
              Funds will be disbursed to your registered M-Pesa or Bank account
              after administrative audit.
            </p>

            <form
              onSubmit={handleRequestPayoutSubmit}
              className="space-y-4 text-xs"
            >
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg font-semibold flex justify-between">
                <span>Available Balance:</span>
                <span className="font-bold">
                  {formatKSh(currentSeller.availableBalance)}
                </span>
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
                <label className="block text-neutral-600 font-semibold mb-1">
                  Disbursement Channel
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPayoutMethod("mpesa")}
                    className={`p-2 rounded border font-semibold text-center ${
                      payoutMethod === "mpesa"
                        ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                        : "border-neutral-200"
                    }`}
                  >
                    M-Pesa B2C
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayoutMethod("bank")}
                    className={`p-2 rounded border font-semibold text-center ${
                      payoutMethod === "bank"
                        ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                        : "border-neutral-200"
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
                      ? "bg-emerald-50 text-emerald-800"
                      : "bg-red-50 text-red-800"
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
