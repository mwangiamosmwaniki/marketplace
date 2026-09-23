import React, { createContext, useContext, useState, useEffect } from "react";
import {
  User,
  Role,
  Seller,
  Product,
  Category,
  Brand,
  CartItem,
  MasterOrder,
  SellerSubOrder,
  OrderItem,
  FinancialLedgerEntry,
  SellerPayoutRequest,
  DeliveryAddress,
  PaymentMethod,
  OrderStatus,
  ProductStatus,
  SellerStatus,
  Coupon,
  Review,
  AuditLog,
  DeliveryZone,
  ProductVariant,
  SystemSettings,
  SupportTicket,
  Promotion,
  FlashSaleCampaign,
  HomepageSettings,
  ReturnRequest,
  SellerVerification,
} from "../types";
import {
  INITIAL_USERS,
  INITIAL_CATEGORIES,
  INITIAL_BRANDS,
  INITIAL_SELLERS,
  INITIAL_PRODUCTS,
  INITIAL_ORDERS,
  INITIAL_LEDGER,
  INITIAL_PAYOUTS,
  INITIAL_COUPONS,
  INITIAL_AUDIT_LOGS,
  INITIAL_DELIVERY_ZONES,
  INITIAL_SETTINGS,
  INITIAL_SUPPORT_TICKETS,
  INITIAL_PROMOTIONS,
  INITIAL_FLASH_SALES,
  INITIAL_HOMEPAGE_SETTINGS,
  INITIAL_RETURNS,
} from "../data/initialData";
import { hasPermission, isGeneralAdmin } from "../config/permissions";

const localStorage = {
  getItem: (key: string) =>
    typeof window === "undefined" ? null : window.localStorage.getItem(key),
  setItem: (key: string, value: string) => {
    if (typeof window !== "undefined") window.localStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    if (typeof window !== "undefined") window.localStorage.removeItem(key);
  },
};

interface MarketplaceContextType {
  // Authentication & Real User State
  authUser: User | null;
  users: User[];
  login: (
    email: string,
    password?: string,
  ) => { success: boolean; message?: string; user?: User };
  logout: () => void;
  registerUser: (userData: {
    name: string;
    email: string;
    phone: string;
    role: Role;
    sellerBusinessName?: string;
    password?: string;
  }) => { success: boolean; message?: string; user?: User };

  // Navigation & Role derived from authenticated user
  currentRole: Role;
  currentSellerId: string;
  currentSeller: Seller | undefined;

  // Data
  categories: Category[];
  brands: Brand[];
  sellers: Seller[];
  products: Product[];
  orders: MasterOrder[];
  ledger: FinancialLedgerEntry[];
  payouts: SellerPayoutRequest[];
  coupons: Coupon[];
  auditLogs: AuditLog[];
  deliveryZones: DeliveryZone[];
  reviews: Record<string, Review[]>;

  // Cart & Wishlist
  cart: CartItem[];
  wishlist: string[];
  appliedCoupon: Coupon | null;
  addToCart: (
    product: Product,
    variant?: ProductVariant,
    quantity?: number,
  ) => void;
  removeFromCart: (cartItemId: string) => void;
  updateCartQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  applyCoupon: (code: string) => { success: boolean; message: string };
  removeCoupon: () => void;
  toggleWishlist: (productId: string) => void;

  // Cart totals
  cartSubtotal: number;
  cartDiscount: number;
  cartDeliveryFee: number;
  cartGrandTotal: number;
  cartGroupedBySeller: {
    seller: Seller;
    items: CartItem[];
    subtotal: number;
  }[];

  // Checkout & Orders
  createOrder: (orderData: {
    address: DeliveryAddress;
    deliveryType: "home_delivery" | "pickup_station";
    pickupStation?: string;
    paymentMethod: PaymentMethod;
  }) => Promise<MasterOrder>;
  updateSubOrderStatus: (
    subOrderId: string,
    status: OrderStatus,
    trackingNumber?: string,
  ) => void;
  updateMasterOrder: (orderId: string, updates: Partial<MasterOrder>) => void;
  deleteMasterOrder: (orderId: string) => void;
  cancelOrder: (orderId: string, reason: string) => void;

  // Seller operations
  addSellerProduct: (
    product: Omit<Product, "id" | "createdAt" | "rating" | "reviewsCount">,
  ) => Product;
  updateSellerProduct: (productId: string, updates: Partial<Product>) => void;
  submitSellerProductForApproval: (productId: string) => void;
  updateInventoryStock: (
    productId: string,
    variantId: string | undefined,
    stock: number,
  ) => void;
  requestSellerPayout: (
    sellerId: string,
    amount: number,
    method: "mpesa" | "bank",
    account: string,
  ) => { success: boolean; message: string };
  updateSellerProfile: (sellerId: string, updates: Partial<Seller>) => void;
  updateSellerVerification: (
    sellerId: string,
    verification: SellerVerification,
  ) => void;

  // Admin operations
  updateSellerStatus: (
    sellerId: string,
    status: SellerStatus,
    reason?: string,
  ) => void;
  approveSeller: (sellerId: string) => void;
  suspendSeller: (sellerId: string) => void;
  updateSellerCommission: (sellerId: string, newRate: number) => void;
  updateProductStatus: (productId: string, status: ProductStatus) => void;
  processPayout: (
    payoutId: string,
    action: "approve" | "process" | "reject",
    reason?: string,
  ) => void;
  approvePayout: (payoutId: string) => void;
  processApprovedPayout: (payoutId: string) => void;
  rejectPayout: (payoutId: string, reason?: string) => void;
  createCoupon: (coupon: Coupon) => void;
  updateCoupon: (code: string, updates: Partial<Coupon>) => void;

  // Reviews
  addProductReview: (
    productId: string,
    rating: number,
    comment: string,
    customerName?: string,
  ) => void;

  // System Settings (Admin / Governance)
  settings: SystemSettings;
  updateSettings: (newSettings: SystemSettings) => void;

  // Customer Support Tickets
  supportTickets: SupportTicket[];
  createSupportTicket: (
    ticket: Omit<
      SupportTicket,
      "id" | "ticketNumber" | "createdAt" | "updatedAt" | "messages"
    >,
    initialMessage: string,
  ) => void;
  replySupportTicket: (ticketId: string, message: string) => void;
  updateTicketStatus: (
    ticketId: string,
    status: SupportTicket["status"],
  ) => void;

  // Promotions & Homepage Marketing
  promotions: Promotion[];
  createPromotion: (promo: Omit<Promotion, "id">) => void;
  updatePromotion: (id: string, updates: Partial<Promotion>) => void;
  deletePromotion: (id: string) => void;
  flashSales: FlashSaleCampaign[];
  createFlashSale: (sale: Omit<FlashSaleCampaign, "id" | "createdAt">) => void;
  updateFlashSale: (id: string, updates: Partial<FlashSaleCampaign>) => void;
  deleteFlashSale: (id: string) => void;
  homepageSettings: HomepageSettings;
  updateHomepageSettings: (settings: HomepageSettings) => void;

  // Customer Returns & Admin Refunds
  returns: ReturnRequest[];
  requestReturn: (
    orderId: string,
    subOrderId: string,
    productId: string,
    reason: string,
  ) => { success: boolean; message: string };
  updateReturnStatus: (
    returnId: string,
    status: ReturnRequest["status"],
    rejectionReason?: string,
  ) => void;
  cancelReturn: (returnId: string) => void;
  processReturnRefund: (returnId: string) => void;

  // Customer Addresses
  addresses: DeliveryAddress[];
  addAddress: (address: DeliveryAddress) => void;
  updateAddress: (id: string, updates: Partial<DeliveryAddress>) => void;
  deleteAddress: (id: string) => void;
  setDefaultAddress: (id: string) => void;

  // Seller Product Operations
  deleteSellerProduct: (productId: string) => void;

  // Catalog Governance (Categories & Brands)
  addCategory: (cat: Omit<Category, "id">) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  addBrand: (brand: Omit<Brand, "id">) => void;
  updateBrand: (id: string, updates: Partial<Brand>) => void;
  deleteBrand: (id: string) => void;

  // Marketing Governance
  deleteCoupon: (code: string) => void;

  // User Governance
  createUser: (userData: Omit<User, "id" | "createdAt">) => void;
  updateUser: (userId: string, updates: Partial<User>) => void;
  deleteUser: (userId: string) => void;
  suspendUser: (userId: string) => void;
  restoreUser: (userId: string) => void;
  deactivateUser: (userId: string) => void;
  anonymizeUser: (userId: string) => void;
  requirePasswordChange: (userId: string) => void;
  requireUserReverification: (userId: string) => void;
  forceLogoutUser: (userId: string) => void;

  // Logistics Governance
  addDeliveryZone: (zone: DeliveryZone) => void;
  updateDeliveryZone: (county: string, updates: Partial<DeliveryZone>) => void;
  deleteDeliveryZone: (county: string) => void;

  // Audit Logs
  addAuditLog: (
    action: string,
    entity: string,
    entityId: string,
    details: string,
  ) => void;

  // Utilities
  formatKSh: (amount: number) => string;
}

const MarketplaceContext = createContext<MarketplaceContextType | undefined>(
  undefined,
);

export const MarketplaceProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Authentication & Real User State
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);

  const [authUser, setAuthUser] = useState<User | null>(INITIAL_USERS[0]);

  useEffect(() => {
    const savedUsers = localStorage.getItem("kesales_users");
    if (savedUsers) {
      try {
        setUsers(JSON.parse(savedUsers) as User[]);
      } catch {
        localStorage.removeItem("kesales_users");
      }
    }

    const saved = localStorage.getItem("kesales_auth_user");
    if (!saved) {
      setAuthUser(INITIAL_USERS[0]);
      return;
    }

    try {
      const persistedUser = JSON.parse(saved) as User;
      const currentUsers = localStorage.getItem("kesales_users");
      const storedUsers = currentUsers
        ? (JSON.parse(currentUsers) as User[])
        : INITIAL_USERS;
      const currentUser = storedUsers.find(
        (user) => user.id === persistedUser.id,
      );
      if (!currentUser || currentUser.status === "suspended") {
        localStorage.removeItem("kesales_auth_user");
        localStorage.removeItem("kesales_navigation");
        setAuthUser(null);
        return;
      }
      setAuthUser(currentUser);
    } catch {
      localStorage.removeItem("kesales_auth_user");
      localStorage.removeItem("kesales_navigation");
      setAuthUser(null);
    }
  }, []);

  // Current view state derived from authenticated user
  const currentRole: Role = authUser?.role || "customer";
  const currentSellerId =
    authUser?.role === "seller" ? (authUser.sellerId ?? "") : "";

  const isAdmin = isGeneralAdmin(currentRole);
  const isSeller = currentRole === "seller";
  const isCustomer = currentRole === "customer";
  const canGovernSellers =
    currentRole === "super_admin" || currentRole === "seller_admin";
  const canGovernCatalog =
    currentRole === "super_admin" || currentRole === "product_admin";
  const canGovernLogistics =
    currentRole === "super_admin" || currentRole === "logistics_admin";
  const canGovernMarketing =
    currentRole === "super_admin" || currentRole === "marketing_admin";
  const canManageSeller = (sellerId: string) =>
    isAdmin || (isSeller && currentSellerId === sellerId);
  const canManageProduct = (product: Product) =>
    isAdmin ||
    (isSeller &&
      currentSellerId !== "" &&
      currentSellerId === product.sellerId);

  // Datasets initialized from storage or defaults
  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem("kesales_categories");
    return saved ? JSON.parse(saved) : INITIAL_CATEGORIES;
  });
  const [brands, setBrands] = useState<Brand[]>(() => {
    const saved = localStorage.getItem("kesales_brands");
    return saved ? JSON.parse(saved) : INITIAL_BRANDS;
  });
  const [sellers, setSellers] = useState<Seller[]>(() => {
    const saved = localStorage.getItem("kesales_sellers");
    return saved ? JSON.parse(saved) : INITIAL_SELLERS;
  });
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem("kesales_products");
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });
  const [orders, setOrders] = useState<MasterOrder[]>(() => {
    const saved = localStorage.getItem("kesales_orders");
    return saved ? JSON.parse(saved) : INITIAL_ORDERS;
  });
  const [ledger, setLedger] = useState<FinancialLedgerEntry[]>(() => {
    const saved = localStorage.getItem("kesales_ledger");
    return saved ? JSON.parse(saved) : INITIAL_LEDGER;
  });
  const [payouts, setPayouts] = useState<SellerPayoutRequest[]>(() => {
    const saved = localStorage.getItem("kesales_payouts");
    return saved ? JSON.parse(saved) : INITIAL_PAYOUTS;
  });
  const [coupons, setCoupons] = useState<Coupon[]>(() => {
    const saved = localStorage.getItem("kesales_coupons");
    return saved ? JSON.parse(saved) : INITIAL_COUPONS;
  });
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem("kesales_audit_logs");
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
  });
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>(() => {
    const saved = localStorage.getItem("kesales_delivery_zones");
    return saved ? JSON.parse(saved) : INITIAL_DELIVERY_ZONES;
  });
  const [settings, setSettings] = useState<SystemSettings>(() => {
    const saved = localStorage.getItem("kesales_settings");
    return saved ? JSON.parse(saved) : INITIAL_SETTINGS;
  });
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>(() => {
    const saved = localStorage.getItem("kesales_support_tickets");
    return saved ? JSON.parse(saved) : INITIAL_SUPPORT_TICKETS;
  });
  const [promotions, setPromotions] = useState<Promotion[]>(() => {
    const saved = localStorage.getItem("kesales_promotions");
    return saved ? JSON.parse(saved) : INITIAL_PROMOTIONS;
  });
  const [flashSales, setFlashSales] = useState<FlashSaleCampaign[]>(() => {
    const saved = localStorage.getItem("kesales_flash_sales");
    return saved ? JSON.parse(saved) : INITIAL_FLASH_SALES;
  });
  const [homepageSettings, setHomepageSettings] = useState<HomepageSettings>(
    () => {
      const saved = localStorage.getItem("kesales_homepage_settings");
      return saved ? JSON.parse(saved) : INITIAL_HOMEPAGE_SETTINGS;
    },
  );
  const [returns, setReturns] = useState<ReturnRequest[]>(() => {
    const saved = localStorage.getItem("kesales_returns");
    return saved ? JSON.parse(saved) : INITIAL_RETURNS;
  });
  const [addresses, setAddresses] = useState<DeliveryAddress[]>(() => {
    const saved = localStorage.getItem("kesales_addresses");
    return saved
      ? JSON.parse(saved)
      : [
          {
            id: "addr-1",
            fullName: "Jane Wambui",
            phone: "+254 712 345678",
            county: "Nairobi",
            town: "Westlands / Parklands",
            streetAddress: "Mpaka Road, Woodvale Grove, Apt 4B",
            deliveryInstructions: "Ring bell 4B or leave at gate security",
            isDefault: true,
          },
          {
            id: "addr-2",
            fullName: "Jane Wambui",
            phone: "+254 712 345678",
            county: "Nairobi",
            town: "Kilimani / Kileleshwa",
            streetAddress: "Argwings Kodhek Road, Landmark Plaza, 3rd Floor",
            deliveryInstructions:
              "Reception desk during business hours (8am - 5pm)",
            isDefault: false,
          },
        ];
  });

  // Cart & Wishlist
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem("kesales_cart");
    return saved ? JSON.parse(saved) : [];
  });
  const [wishlist, setWishlist] = useState<string[]>(() => {
    const saved = localStorage.getItem("kesales_wishlist");
    return saved
      ? JSON.parse(saved)
      : ["prod-sony-wh1000xm5", "prod-nike-airmax-90"];
  });
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);

  // Reviews dictionary by product ID
  const [reviews, setReviews] = useState<Record<string, Review[]>>({
    "prod-s24-ultra": [
      {
        id: "rev-1",
        productId: "prod-s24-ultra",
        customerName: "John Kamau",
        rating: 5,
        comment:
          "Absolute monster of a phone. The display is flat and anti-reflective, and battery easily lasts 2 full days in Nairobi traffic.",
        verifiedPurchase: true,
        date: "2026-09-10",
      },
      {
        id: "rev-2",
        productId: "prod-s24-ultra",
        customerName: "Beatrice A.",
        rating: 5,
        comment:
          "Original Samsung warranty confirmed via dial code. Arrived in 24 hours via KESALES Express!",
        verifiedPurchase: true,
        date: "2026-09-15",
      },
    ],
    "prod-anker-737": [
      {
        id: "rev-3",
        productId: "prod-anker-737",
        customerName: "Edwin M.",
        rating: 5,
        comment:
          "Charges my M2 MacBook Pro at full 100W speed! The screen is super handy to see wattage.",
        verifiedPurchase: true,
        date: "2026-09-12",
      },
    ],
  });

  // Authentication methods
  const login = (email: string, password?: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const found = users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!found) {
      return {
        success: false,
        message: "Account not found. Please verify your email or register.",
      };
    }
    if (found.status === "suspended") {
      return {
        success: false,
        message: "Your account has been suspended by marketplace compliance.",
      };
    }
    if (!password || password.length === 0 || found.email === cleanEmail) {
      setAuthUser(found);
      localStorage.setItem("kesales_auth_user", JSON.stringify(found));
      return { success: true, user: found };
    }

    setAuthUser(found);
    localStorage.setItem("kesales_auth_user", JSON.stringify(found));
    return { success: true, user: found };
  };

  const logout = () => {
    setAuthUser(null);
    localStorage.removeItem("kesales_auth_user");
  };

  const registerUser = (userData: {
    name: string;
    email: string;
    phone: string;
    role: Role;
    sellerBusinessName?: string;
    password?: string;
  }) => {
    const cleanEmail = userData.email.trim().toLowerCase();
    const existing = users.some((u) => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      return {
        success: false,
        message: "An account with this email address already exists.",
      };
    }

    let sellerId: string | undefined = undefined;
    if (userData.role === "seller") {
      sellerId = `seller-${Date.now()}`;
      const newSeller: Seller = {
        id: sellerId,
        userId: `user-${Date.now()}`,
        businessName: userData.sellerBusinessName || `${userData.name} Store`,
        slug: (userData.sellerBusinessName || userData.name)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-"),
        ownerName: userData.name,
        email: userData.email,
        phone: userData.phone,
        county: "Nairobi",
        town: "Nairobi CBD",
        address: "Nairobi, Kenya",
        taxPin: "P051" + Math.floor(100000 + Math.random() * 900000) + "X",
        businessRegNumber: "BN-" + Math.floor(100000 + Math.random() * 900000),
        logo: "https://images.unsplash.com/photo-1572021335469-31706a17aaef?w=150&auto=format&fit=crop&q=80",
        banner:
          "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&auto=format&fit=crop&q=80",
        description: "New verified vendor on KESALES marketplace.",
        status: "approved",
        commissionRate: 10,
        rating: 5.0,
        totalSalesCount: 0,
        pendingBalance: 0,
        availableBalance: 0,
        totalPayouts: 0,
        payoutMethod: "mpesa",
        payoutAccount: userData.phone,
        createdAt: new Date().toISOString(),
      };
      setSellers((prev) => [newSeller, ...prev]);
    }

    const newUser: User = {
      id: `user-${Date.now()}`,
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      role: userData.role,
      sellerId,
      permissions:
        userData.role === "customer"
          ? [
              "orders.view",
              "orders.create",
              "reviews.create",
              "wishlist.manage",
            ]
          : [
              "products.manage",
              "orders.fulfill",
              "payouts.request",
              "inventory.manage",
            ],
      status: "active",
      createdAt: new Date().toISOString(),
    };

    setUsers((prev) => {
      const updated = [...prev, newUser];
      localStorage.setItem("kesales_users", JSON.stringify(updated));
      return updated;
    });

    setAuthUser(newUser);
    localStorage.setItem("kesales_auth_user", JSON.stringify(newUser));
    return { success: true, user: newUser };
  };

  // Sync state to LocalStorage
  useEffect(() => {
    localStorage.setItem("kesales_users", JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem("kesales_sellers", JSON.stringify(sellers));
  }, [sellers]);

  useEffect(() => {
    localStorage.setItem("kesales_products", JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem("kesales_orders", JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem("kesales_ledger", JSON.stringify(ledger));
  }, [ledger]);

  useEffect(() => {
    localStorage.setItem("kesales_payouts", JSON.stringify(payouts));
  }, [payouts]);

  useEffect(() => {
    localStorage.setItem("kesales_coupons", JSON.stringify(coupons));
  }, [coupons]);

  useEffect(() => {
    localStorage.setItem("kesales_cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem("kesales_wishlist", JSON.stringify(wishlist));
  }, [wishlist]);

  useEffect(() => {
    localStorage.setItem("kesales_audit_logs", JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem("kesales_categories", JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem("kesales_brands", JSON.stringify(brands));
  }, [brands]);

  useEffect(() => {
    localStorage.setItem(
      "kesales_delivery_zones",
      JSON.stringify(deliveryZones),
    );
  }, [deliveryZones]);

  useEffect(() => {
    localStorage.setItem("kesales_settings", JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(
      "kesales_support_tickets",
      JSON.stringify(supportTickets),
    );
  }, [supportTickets]);

  useEffect(() => {
    localStorage.setItem("kesales_promotions", JSON.stringify(promotions));
  }, [promotions]);

  useEffect(() => {
    localStorage.setItem("kesales_flash_sales", JSON.stringify(flashSales));
  }, [flashSales]);

  useEffect(() => {
    localStorage.setItem(
      "kesales_homepage_settings",
      JSON.stringify(homepageSettings),
    );
  }, [homepageSettings]);

  useEffect(() => {
    localStorage.setItem("kesales_returns", JSON.stringify(returns));
  }, [returns]);

  useEffect(() => {
    localStorage.setItem("kesales_addresses", JSON.stringify(addresses));
  }, [addresses]);

  // Current logged in seller object
  const currentSeller = currentSellerId
    ? sellers.find((s) => s.id === currentSellerId)
    : undefined;

  // Cart operations
  const addToCart = (
    product: Product,
    variant?: ProductVariant,
    quantity = 1,
  ) => {
    setCart((prev) => {
      const price = variant
        ? variant.discountPrice || variant.price
        : product.discountPrice || product.price;
      const maxStock = variant ? variant.stock : product.stock;
      const variantText = variant
        ? Object.entries(variant.attributes)
            .map(([k, v]) => `${k}: ${v}`)
            .join(" | ")
        : undefined;

      const existingIndex = prev.findIndex(
        (item) =>
          item.productId === product.id &&
          item.variantId === (variant?.id || undefined),
      );

      if (existingIndex > -1) {
        const updated = [...prev];
        const newQty = Math.min(
          updated[existingIndex].quantity + quantity,
          maxStock,
        );
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
        };
        return updated;
      }

      const newItem: CartItem = {
        id: `cart-item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        productId: product.id,
        variantId: variant?.id,
        sellerId: product.sellerId,
        name: product.name,
        productImage: variant?.image || product.images[0],
        variantText,
        price,
        quantity: Math.min(quantity, maxStock),
        maxStock,
      };

      return [...prev, newItem];
    });
  };

  const removeFromCart = (cartItemId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== cartItemId));
  };

  const updateCartQuantity = (cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(cartItemId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => {
        if (item.id === cartItemId) {
          return { ...item, quantity: Math.min(quantity, item.maxStock) };
        }
        return item;
      }),
    );
  };

  const clearCart = () => {
    setCart([]);
    setAppliedCoupon(null);
  };

  const applyCoupon = (code: string) => {
    const found = coupons.find(
      (c) => c.code.toUpperCase() === code.trim().toUpperCase(),
    );
    if (!found) {
      return { success: false, message: "Invalid or expired coupon code" };
    }
    const subtotal = cart.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    if (subtotal < found.minOrderValue) {
      return {
        success: false,
        message: `Minimum order value for ${found.code} is KSh ${found.minOrderValue.toLocaleString()}`,
      };
    }
    setAppliedCoupon(found);
    return {
      success: true,
      message: `Coupon ${found.code} applied successfully!`,
    };
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
  };

  const toggleWishlist = (productId: string) => {
    setWishlist((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId],
    );
  };

  // Cart financial calculations
  const cartSubtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  let cartDiscount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.type === "percentage") {
      const calc = (cartSubtotal * appliedCoupon.value) / 100;
      cartDiscount = appliedCoupon.maxDiscount
        ? Math.min(calc, appliedCoupon.maxDiscount)
        : calc;
    } else {
      cartDiscount = appliedCoupon.value;
    }
  }

  // Delivery fee: Base 250 for Nairobi, +100 per additional seller
  const uniqueSellerIds = Array.from(
    new Set(cart.map((item) => item.sellerId)),
  );
  const cartDeliveryFee =
    cart.length === 0 ? 0 : 250 + Math.max(0, uniqueSellerIds.length - 1) * 100;
  const cartGrandTotal = Math.max(
    0,
    cartSubtotal - cartDiscount + cartDeliveryFee,
  );

  // Group cart items by seller
  const cartGroupedBySeller = uniqueSellerIds
    .map((sellerId) => {
      const seller = sellers.find((s) => s.id === sellerId) || {
        id: sellerId,
        userId: "u",
        businessName: "Independent Vendor",
        slug: "independent-vendor",
        ownerName: "Vendor",
        email: "",
        phone: "",
        county: "Nairobi",
        town: "Nairobi",
        address: "",
        taxPin: "",
        businessRegNumber: "",
        logo: "",
        banner: "",
        description: "",
        status: "approved" as SellerStatus,
        commissionRate: 10,
        rating: 4.5,
        totalSalesCount: 0,
        pendingBalance: 0,
        availableBalance: 0,
        totalPayouts: 0,
        payoutMethod: "mpesa" as const,
        payoutAccount: "",
        createdAt: "",
      };
      const items = cart.filter((item) => item.sellerId === sellerId);
      const subtotal = items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );
      return { seller, items, subtotal };
    })
    .filter((g) => g.items.length > 0);

  // Helper log function
  const logAuditAction = (
    action: string,
    entity: string,
    entityId: string,
    details: string,
  ) => {
    const newLog: AuditLog = {
      id: `aud-${Date.now()}`,
      userId: currentRole === "seller" ? currentSellerId : "user-admin",
      userName:
        currentRole === "seller"
          ? currentSeller?.businessName || "Seller"
          : "Platform Administrator",
      action,
      entity,
      entityId,
      details,
      timestamp: new Date().toISOString(),
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Create Order with Seller Sub-Orders Splitting & Atomic Stock Reservation
  const createOrder = async (orderData: {
    address: DeliveryAddress;
    deliveryType: "home_delivery" | "pickup_station";
    pickupStation?: string;
    paymentMethod: PaymentMethod;
  }): Promise<MasterOrder> => {
    if (cart.length === 0) {
      throw new Error("Cart is empty");
    }

    // 1. Stock Reservation & Validation
    for (const item of cart) {
      const prod = products.find((p) => p.id === item.productId);
      if (!prod) throw new Error(`Product ${item.name} not found`);

      if (item.variantId && prod.variants) {
        const variant = prod.variants.find((v) => v.id === item.variantId);
        if (!variant || variant.stock < item.quantity) {
          throw new Error(
            `Insufficient stock for ${item.name} (${item.variantText || ""})`,
          );
        }
      } else {
        if (prod.stock < item.quantity) {
          throw new Error(`Insufficient stock for ${item.name}`);
        }
      }
    }

    // 2. Deduct inventory atomically
    setProducts((prev) =>
      prev.map((prod) => {
        const cartItemsForProd = cart.filter(
          (item) => item.productId === prod.id,
        );
        if (cartItemsForProd.length === 0) return prod;

        const updated = { ...prod };
        let totalDeducted = 0;

        if (updated.variants && updated.variants.length > 0) {
          updated.variants = updated.variants.map((v) => {
            const item = cartItemsForProd.find((ci) => ci.variantId === v.id);
            if (item) {
              totalDeducted += item.quantity;
              return { ...v, stock: Math.max(0, v.stock - item.quantity) };
            }
            return v;
          });
          updated.stock = Math.max(0, updated.stock - totalDeducted);
        } else {
          const item = cartItemsForProd[0];
          updated.stock = Math.max(0, updated.stock - item.quantity);
        }

        return updated;
      }),
    );

    // 3. Generate Master Order and Seller Sub-Orders
    const orderTimestamp = new Date().toISOString();
    const orderRandomSuffix = Math.floor(100000 + Math.random() * 900000);
    const orderNumber = `KS-ORD-${orderRandomSuffix}`;
    const masterOrderId = `ord-${Date.now()}`;

    // Split items into sub-orders for each seller
    const sellerSubOrders: SellerSubOrder[] = [];
    const newLedgerEntries: FinancialLedgerEntry[] = [];

    // Base delivery fee divided across sellers
    const perSellerDeliveryFee = Math.round(
      cartDeliveryFee / uniqueSellerIds.length,
    );

    uniqueSellerIds.forEach((sellerId, idx) => {
      const seller = sellers.find((s) => s.id === sellerId);
      const sellerName = seller?.businessName || "Independent Vendor";
      const commissionRate = seller?.commissionRate || 10;
      const letterCode = String.fromCharCode(65 + idx); // 'A', 'B', 'C'
      const subOrderNumber = `${orderNumber}-${letterCode}`;

      const sellerItems = cart.filter((item) => item.sellerId === sellerId);
      const subItems: OrderItem[] = sellerItems.map((ci) => {
        const itemSubtotal = ci.price * ci.quantity;
        const itemCommission = (itemSubtotal * commissionRate) / 100;
        return {
          id: `item-${Date.now()}-${ci.id}`,
          productId: ci.productId,
          productName: ci.name,
          productImage: ci.productImage,
          variantId: ci.variantId,
          variantText: ci.variantText,
          sku: `SKU-${ci.productId.toUpperCase()}`,
          price: ci.price,
          quantity: ci.quantity,
          subtotal: itemSubtotal,
          sellerCommission: itemCommission,
        };
      });

      const subtotal = subItems.reduce((acc, i) => acc + i.subtotal, 0);
      const commissionTotal = subItems.reduce(
        (acc, i) => acc + i.sellerCommission,
        0,
      );
      const sellerNetTotal = subtotal - commissionTotal;

      const subOrder: SellerSubOrder = {
        id: `sub-${masterOrderId}-${idx}`,
        masterOrderId,
        sellerId,
        sellerName,
        subOrderNumber,
        items: subItems,
        subtotal,
        commissionTotal,
        sellerNetTotal,
        deliveryFee: perSellerDeliveryFee,
        status: "processing",
        createdAt: orderTimestamp,
      };

      sellerSubOrders.push(subOrder);

      // Financial Ledger record: Platform Commission
      newLedgerEntries.push({
        id: `led-com-${Date.now()}-${idx}`,
        transactionRef: `TXN-COM-${orderRandomSuffix}-${letterCode}`,
        type: "PLATFORM_COMMISSION",
        orderNumber,
        sellerId,
        sellerName,
        debit: 0,
        credit: commissionTotal,
        balanceAfter: 0, // updated below
        notes: `Platform commission (${commissionRate}%) on ${sellerName} sub-order ${subOrderNumber}`,
        createdAt: orderTimestamp,
      });

      // Update seller's pending balance
      setSellers((prev) =>
        prev.map((s) => {
          if (s.id === sellerId) {
            return {
              ...s,
              pendingBalance: s.pendingBalance + sellerNetTotal,
              totalSalesCount:
                s.totalSalesCount +
                sellerItems.reduce((q, item) => q + item.quantity, 0),
            };
          }
          return s;
        }),
      );
    });

    // Customer Payment transaction
    const paymentRef =
      orderData.paymentMethod === "mpesa_stk"
        ? `MPESA-WS${Math.random().toString(36).substring(2, 9).toUpperCase()}`
        : `CRD-TXN-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    newLedgerEntries.unshift({
      id: `led-pay-${Date.now()}`,
      transactionRef: paymentRef,
      type: "CUSTOMER_PAYMENT",
      orderNumber,
      debit: 0,
      credit: cartGrandTotal,
      balanceAfter: cartGrandTotal,
      notes: `Customer payment received via ${orderData.paymentMethod.toUpperCase()} for ${orderNumber}`,
      createdAt: orderTimestamp,
    });

    // Delivery Fee ledger entry
    newLedgerEntries.push({
      id: `led-del-${Date.now()}`,
      transactionRef: `TXN-DEL-${orderRandomSuffix}`,
      type: "DELIVERY_FEE",
      orderNumber,
      debit: 0,
      credit: cartDeliveryFee,
      balanceAfter: 0,
      notes: `Delivery logistics fee collected for ${orderData.deliveryType}`,
      createdAt: orderTimestamp,
    });

    const newMasterOrder: MasterOrder = {
      id: masterOrderId,
      orderNumber,
      customerId: authUser?.id || "user-customer-1",
      customerName: orderData.address.fullName,
      customerEmail: "customer@kesales.ke",
      customerPhone: orderData.address.phone,
      deliveryAddress: orderData.address,
      deliveryType: orderData.deliveryType,
      pickupStationName: orderData.pickupStation,
      paymentMethod: orderData.paymentMethod,
      paymentStatus: "paid",
      paymentReference: paymentRef,
      subtotal: cartSubtotal,
      discountTotal: cartDiscount,
      couponCode: appliedCoupon?.code,
      deliveryFeeTotal: cartDeliveryFee,
      grandTotal: cartGrandTotal,
      status: "confirmed",
      sellerSubOrders,
      createdAt: orderTimestamp,
    };

    setOrders((prev) => [newMasterOrder, ...prev]);
    setLedger((prev) => [...newLedgerEntries, ...prev]);

    logAuditAction(
      "ORDER_PLACED",
      "Order",
      orderNumber,
      `Customer placed order ${orderNumber} worth KSh ${cartGrandTotal.toLocaleString()}`,
    );

    // Clear cart after checkout
    clearCart();

    return newMasterOrder;
  };

  // Sub-order status update by seller or admin
  const updateSubOrderStatus = (
    subOrderId: string,
    status: OrderStatus,
    trackingNumber?: string,
  ) => {
    const targetOrder = orders.find((order) =>
      order.sellerSubOrders.some((sub) => sub.id === subOrderId),
    );
    const targetSubOrder = targetOrder?.sellerSubOrders.find(
      (sub) => sub.id === subOrderId,
    );
    if (!targetSubOrder || !canManageSeller(targetSubOrder.sellerId)) return;
    const transitions: Partial<Record<OrderStatus, OrderStatus[]>> = {
      processing: ["ready_for_dispatch", "cancelled"],
      ready_for_dispatch: ["dispatched", "cancelled"],
      dispatched: ["out_for_delivery", "delivered", "returned"],
      out_for_delivery: ["delivered", "returned"],
    };
    if (
      currentRole === "seller" &&
      !transitions[targetSubOrder.status]?.includes(status)
    )
      return;

    setOrders((prev) =>
      prev.map((order) => {
        const subIndex = order.sellerSubOrders.findIndex(
          (s) => s.id === subOrderId,
        );
        if (subIndex === -1) return order;

        const updatedSubOrders = [...order.sellerSubOrders];
        const targetSub = { ...updatedSubOrders[subIndex], status };

        if (trackingNumber) {
          targetSub.trackingNumber = trackingNumber;
        }
        if (status === "dispatched") {
          targetSub.dispatchedAt = new Date().toISOString();
        }
        if (status === "delivered") {
          targetSub.deliveredAt = new Date().toISOString();

          // Transfer funds from Pending to Available for seller
          setSellers((sList) =>
            sList.map((s) => {
              if (s.id === targetSub.sellerId) {
                return {
                  ...s,
                  pendingBalance: Math.max(
                    0,
                    s.pendingBalance - targetSub.sellerNetTotal,
                  ),
                  availableBalance:
                    s.availableBalance + targetSub.sellerNetTotal,
                };
              }
              return s;
            }),
          );
        }

        updatedSubOrders[subIndex] = targetSub;

        // Calculate overall master order status
        const allDelivered = updatedSubOrders.every(
          (s) => s.status === "delivered",
        );
        const anyDispatched = updatedSubOrders.some(
          (s) => s.status === "dispatched",
        );
        let newMasterStatus = order.status;

        if (allDelivered) newMasterStatus = "delivered";
        else if (anyDispatched) newMasterStatus = "dispatched";

        return {
          ...order,
          status: newMasterStatus,
          sellerSubOrders: updatedSubOrders,
        };
      }),
    );

    logAuditAction(
      "SUB_ORDER_STATUS_CHANGE",
      "SubOrder",
      subOrderId,
      `Sub-order status transitioned to ${status}`,
    );
  };

  const updateMasterOrder = (
    orderId: string,
    updates: Partial<MasterOrder>,
  ) => {
    if (!isAdmin) return;
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId ? { ...order, ...updates } : order,
      ),
    );
    logAuditAction(
      "ORDER_UPDATED",
      "MasterOrder",
      orderId,
      `Updated master order fields: ${Object.keys(updates).join(", ")}`,
    );
  };

  const deleteMasterOrder = (orderId: string) => {
    if (!isAdmin) return;
    setOrders((prev) => prev.filter((order) => order.id !== orderId));
    logAuditAction(
      "ORDER_DELETED",
      "MasterOrder",
      orderId,
      `Deleted master order ${orderId}`,
    );
  };

  const cancelOrder = (orderId: string, reason: string) => {
    const order = orders.find((item) => item.id === orderId);
    const ownsOrder = !!order && order.customerId === authUser?.id;
    if (
      !order ||
      currentRole !== "customer" ||
      !ownsOrder ||
      !["pending", "confirmed", "processing"].includes(order.status)
    )
      return;

    setOrders((prev) =>
      prev.map((order) => {
        if (order.id === orderId) {
          const updatedSubOrders = order.sellerSubOrders.map((sub) => ({
            ...sub,
            status: "cancelled" as OrderStatus,
          }));
          return {
            ...order,
            status: "cancelled" as OrderStatus,
            paymentStatus: "refunded",
            sellerSubOrders: updatedSubOrders,
          };
        }
        return order;
      }),
    );

    logAuditAction(
      "ORDER_CANCELLED",
      "Order",
      orderId,
      `Order cancelled: ${reason}`,
    );
  };

  // Seller Product Creation & Inventory Management
  const addSellerProduct = (
    productData: Omit<Product, "id" | "createdAt" | "rating" | "reviewsCount">,
  ): Product => {
    if (
      !isSeller ||
      !currentSellerId ||
      productData.sellerId !== currentSellerId
    ) {
      throw new Error(
        "Only the authenticated seller can create products for their own store.",
      );
    }
    const newProduct: Product = {
      ...productData,
      status: "pending_approval",
      id: `prod-${Date.now()}`,
      rating: 5.0,
      reviewsCount: 0,
      createdAt: new Date().toISOString(),
    };

    setProducts((prev) => [newProduct, ...prev]);
    logAuditAction(
      "PRODUCT_CREATED",
      "Product",
      newProduct.id,
      `Created product "${newProduct.name}" by seller ${newProduct.sellerId}`,
    );
    return newProduct;
  };

  const updateSellerProduct = (
    productId: string,
    updates: Partial<Product>,
  ) => {
    const product = products.find((item) => item.id === productId);
    if (!product || !canManageProduct(product)) return;
    if (isSeller) {
      const sellerUpdates = { ...updates } as Partial<Product>;
      delete sellerUpdates.status;
      delete sellerUpdates.sellerId;
      delete sellerUpdates.rating;
      delete sellerUpdates.reviewsCount;
      updates = sellerUpdates;
    }
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          return { ...p, ...updates };
        }
        return p;
      }),
    );
    logAuditAction(
      "PRODUCT_UPDATED",
      "Product",
      productId,
      `Updated product specs for ID ${productId}`,
    );
  };

  const submitSellerProductForApproval = (productId: string) => {
    const product = products.find((item) => item.id === productId);
    if (
      !product ||
      !isSeller ||
      !currentSellerId ||
      product.sellerId !== currentSellerId
    )
      return;
    if (!["draft", "rejected", "inactive"].includes(product.status)) return;
    setProducts((prev) =>
      prev.map((item) =>
        item.id === productId ? { ...item, status: "pending_approval" } : item,
      ),
    );
    logAuditAction(
      "PRODUCT_SUBMITTED",
      "Product",
      productId,
      `Seller submitted ${product.name} for approval`,
    );
  };

  const updateInventoryStock = (
    productId: string,
    variantId: string | undefined,
    stock: number,
  ) => {
    const product = products.find((item) => item.id === productId);
    if (!product || !canManageProduct(product) || stock < 0) return;
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;

        if (variantId && p.variants) {
          const updatedVariants = p.variants.map((v) =>
            v.id === variantId ? { ...v, stock } : v,
          );
          const totalStock = updatedVariants.reduce(
            (sum, v) => sum + v.stock,
            0,
          );
          return { ...p, variants: updatedVariants, stock: totalStock };
        }
        return { ...p, stock };
      }),
    );

    logAuditAction(
      "STOCK_UPDATED",
      "Inventory",
      productId,
      `Stock adjusted to ${stock} units`,
    );
  };

  // Seller Payout Request
  const requestSellerPayout = (
    sellerId: string,
    amount: number,
    method: "mpesa" | "bank",
    account: string,
  ) => {
    const seller = sellers.find((s) => s.id === sellerId);
    if (!seller || currentRole !== "seller" || currentSellerId !== sellerId) {
      return {
        success: false,
        message: "Only the authenticated seller can request this payout.",
      };
    }

    if (amount < 2000) {
      return {
        success: false,
        message: "Minimum payout threshold is KSh 2,000",
      };
    }

    if (amount > seller.availableBalance) {
      return {
        success: false,
        message: `Requested amount exceeds available balance (Available: KSh ${seller.availableBalance.toLocaleString()})`,
      };
    }

    const payoutNumber = `PAY-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newPayout: SellerPayoutRequest = {
      id: `payout-${Date.now()}`,
      payoutNumber,
      sellerId,
      sellerName: seller.businessName,
      amount,
      method,
      accountDetails: account,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    setPayouts((prev) => [newPayout, ...prev]);

    // Deduct immediately from seller's available balance to prevent double payouts
    setSellers((prev) =>
      prev.map((s) => {
        if (s.id === sellerId) {
          return { ...s, availableBalance: s.availableBalance - amount };
        }
        return s;
      }),
    );

    logAuditAction(
      "PAYOUT_REQUESTED",
      "Payout",
      payoutNumber,
      `Seller ${seller.businessName} requested payout of KSh ${amount.toLocaleString()}`,
    );

    return {
      success: true,
      message: `Payout request ${payoutNumber} submitted. Platform admin will review and disburse funds shortly.`,
    };
  };

  const updateSellerProfile = (sellerId: string, updates: Partial<Seller>) => {
    if (!canManageSeller(sellerId)) return;
    if (isSeller && currentSellerId !== sellerId) return;
    if (isSeller) {
      const safeUpdates = { ...updates } as Partial<Seller>;
      delete safeUpdates.status;
      delete safeUpdates.commissionRate;
      delete safeUpdates.pendingBalance;
      delete safeUpdates.availableBalance;
      delete safeUpdates.totalPayouts;
      updates = safeUpdates;
    }
    setSellers((prev) =>
      prev.map((s) => (s.id === sellerId ? { ...s, ...updates } : s)),
    );
  };

  const updateSellerVerification = (
    sellerId: string,
    verification: SellerVerification,
  ) => {
    if (!canManageSeller(sellerId)) return;
    setSellers((prev) =>
      prev.map((seller) =>
        seller.id === sellerId ? { ...seller, verification } : seller,
      ),
    );
  };

  // Admin Operations
  const updateSellerStatus = (
    sellerId: string,
    status: SellerStatus,
    reason?: string,
  ) => {
    if (!canGovernSellers) return;
    setSellers((prev) =>
      prev.map((s) => {
        if (s.id !== sellerId) return s;
        if (!s.verification) return { ...s, status };
        let applicationStatus = s.verification.applicationStatus;
        if (status === "approved") applicationStatus = "verified";
        if (status === "suspended") applicationStatus = "suspended";
        return {
          ...s,
          status,
          verification: {
            ...s.verification,
            applicationStatus,
            reviewedAt:
              status === "approved" || status === "rejected"
                ? new Date().toISOString()
                : s.verification.reviewedAt,
            approvedAt:
              status === "approved"
                ? new Date().toISOString()
                : s.verification.approvedAt,
            rejectedAt:
              status === "rejected"
                ? new Date().toISOString()
                : s.verification.rejectedAt,
            reviewNotes: reason || s.verification.reviewNotes,
          },
        };
      }),
    );
    logAuditAction(
      "SELLER_STATUS_CHANGED",
      "Seller",
      sellerId,
      `Seller status updated to ${status}. ${reason || ""}`,
    );
  };

  const updateSellerCommission = (sellerId: string, newRate: number) => {
    if (!canGovernSellers || newRate < 0 || newRate > 100) return;
    setSellers((prev) =>
      prev.map((s) =>
        s.id === sellerId ? { ...s, commissionRate: newRate } : s,
      ),
    );
    logAuditAction(
      "COMMISSION_RATE_UPDATED",
      "Seller",
      sellerId,
      `Commission adjusted to ${newRate}%`,
    );
  };

  const updateProductStatus = (productId: string, status: ProductStatus) => {
    if (!canGovernCatalog) return;
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, status } : p)),
    );
    logAuditAction(
      "PRODUCT_STATUS_CHANGED",
      "Product",
      productId,
      `Admin updated product status to ${status}`,
    );
  };

  const processPayout = (
    payoutId: string,
    action: "approve" | "process" | "reject",
    reason?: string,
  ) => {
    const requiredPermission =
      action === "process"
        ? "payouts.process"
        : action === "approve"
          ? "payouts.approve"
          : "payouts.reject";
    if (!hasPermission(currentRole, requiredPermission)) return;
    const payout = payouts.find((p) => p.id === payoutId);
    if (!payout) return;

    if (action === "approve") {
      setPayouts((prev) =>
        prev.map((p) => (p.id === payoutId ? { ...p, status: "approved" } : p)),
      );
      logAuditAction(
        "PAYOUT_APPROVED",
        "Payout",
        payout.payoutNumber,
        `Approved KSh ${payout.amount.toLocaleString()} for processing for ${payout.sellerName}`,
      );
    } else if (action === "process") {
      const ref = `B2C-${payout.method.toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      setPayouts((prev) =>
        prev.map((p) =>
          p.id === payoutId
            ? {
                ...p,
                status: "processed",
                processedAt: new Date().toISOString(),
                transactionRef: ref,
              }
            : p,
        ),
      );

      // Increase seller's totalPayouts
      setSellers((prev) =>
        prev.map((s) =>
          s.id === payout.sellerId
            ? { ...s, totalPayouts: s.totalPayouts + payout.amount }
            : s,
        ),
      );

      // Financial Ledger record
      const ledgerEntry: FinancialLedgerEntry = {
        id: `led-payout-${Date.now()}`,
        transactionRef: ref,
        type: "SELLER_PAYOUT",
        sellerId: payout.sellerId,
        sellerName: payout.sellerName,
        debit: payout.amount,
        credit: 0,
        balanceAfter: 0,
        notes: `Payout ${payout.payoutNumber} disbursed via ${payout.method.toUpperCase()} to ${payout.accountDetails}`,
        createdAt: new Date().toISOString(),
      };
      setLedger((prev) => [ledgerEntry, ...prev]);

      logAuditAction(
        "PAYOUT_APPROVED",
        "Payout",
        payout.payoutNumber,
        `Processed KSh ${payout.amount.toLocaleString()} to ${payout.sellerName}`,
      );
    } else {
      // Rejection: restore available balance
      setPayouts((prev) =>
        prev.map((p) =>
          p.id === payoutId
            ? {
                ...p,
                status: "rejected",
                rejectionReason: reason || "Declined by administrator",
              }
            : p,
        ),
      );

      setSellers((prev) =>
        prev.map((s) =>
          s.id === payout.sellerId
            ? { ...s, availableBalance: s.availableBalance + payout.amount }
            : s,
        ),
      );

      logAuditAction(
        "PAYOUT_REJECTED",
        "Payout",
        payout.payoutNumber,
        `Rejected payout. Funds returned to seller balance. Reason: ${reason || "Unspecified"}`,
      );
    }
  };

  const approveSeller = (sellerId: string) =>
    updateSellerStatus(sellerId, "approved");
  const suspendSeller = (sellerId: string) =>
    updateSellerStatus(sellerId, "suspended");
  const approvePayout = (payoutId: string) =>
    processPayout(payoutId, "approve");
  const processApprovedPayout = (payoutId: string) =>
    processPayout(payoutId, "process");
  const rejectPayout = (payoutId: string, reason?: string) =>
    processPayout(payoutId, "reject", reason);
  const createCoupon = (coupon: Coupon) => {
    if (!canGovernMarketing) return;
    setCoupons((prev) => [coupon, ...prev]);
    logAuditAction(
      "COUPON_CREATED",
      "Coupon",
      coupon.code,
      `Created coupon ${coupon.code}`,
    );
  };

  const deleteCoupon = (code: string) => {
    if (!canGovernMarketing) return;
    setCoupons((prev) => prev.filter((c) => c.code !== code));
    logAuditAction(
      "COUPON_DELETED",
      "Coupon",
      code,
      `Deleted coupon code ${code}`,
    );
  };

  const updateCoupon = (code: string, updates: Partial<Coupon>) => {
    if (!canGovernMarketing) return;
    setCoupons((prev) =>
      prev.map((coupon) =>
        coupon.code === code ? { ...coupon, ...updates } : coupon,
      ),
    );
    logAuditAction("COUPON_UPDATED", "Coupon", code, `Updated coupon ${code}`);
  };

  // System Settings Operations
  const updateSettings = (newSettings: SystemSettings) => {
    if (currentRole !== "super_admin") return;
    setSettings(newSettings);
    logAuditAction(
      "SETTINGS_UPDATED",
      "SystemSettings",
      "global",
      `Marketplace system configurations updated by ${authUser?.name || "Administrator"}`,
    );
  };

  // Catalog Governance (Categories & Brands)
  const addCategory = (cat: Omit<Category, "id">) => {
    if (!canGovernCatalog) return;
    const id = `cat-${Date.now()}`;
    const newCat: Category = { id, ...cat };
    setCategories((prev) => [...prev, newCat]);
    logAuditAction(
      "CATEGORY_CREATED",
      "Category",
      id,
      `Added category ${cat.name}`,
    );
  };

  const updateCategory = (id: string, updates: Partial<Category>) => {
    if (!canGovernCatalog) return;
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    );
    logAuditAction(
      "CATEGORY_UPDATED",
      "Category",
      id,
      `Updated category ${updates.name || id}`,
    );
  };

  const deleteCategory = (id: string) => {
    if (!canGovernCatalog) return;
    setCategories((prev) => prev.filter((c) => c.id !== id));
    logAuditAction(
      "CATEGORY_DELETED",
      "Category",
      id,
      `Deleted category ${id}`,
    );
  };

  const addBrand = (brand: Omit<Brand, "id">) => {
    if (!canGovernCatalog) return;
    const id = `brand-${Date.now()}`;
    const newBrand: Brand = { id, ...brand };
    setBrands((prev) => [...prev, newBrand]);
    logAuditAction("BRAND_CREATED", "Brand", id, `Added brand ${brand.name}`);
  };

  const updateBrand = (id: string, updates: Partial<Brand>) => {
    if (!canGovernCatalog) return;
    setBrands((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...updates } : b)),
    );
    logAuditAction(
      "BRAND_UPDATED",
      "Brand",
      id,
      `Updated brand ${updates.name || id}`,
    );
  };

  const deleteBrand = (id: string) => {
    if (!canGovernCatalog) return;
    setBrands((prev) => prev.filter((b) => b.id !== id));
    logAuditAction("BRAND_DELETED", "Brand", id, `Deleted brand ${id}`);
  };

  // Seller Product Delete
  const deleteSellerProduct = (productId: string) => {
    const product = products.find((item) => item.id === productId);
    if (
      !product ||
      !isSeller ||
      !currentSellerId ||
      product.sellerId !== currentSellerId
    )
      return;
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, status: "archived" } : p)),
    );
    logAuditAction(
      "PRODUCT_ARCHIVED",
      "Product",
      productId,
      `Archived product SKU/ID ${productId}`,
    );
  };

  // User Governance Operations
  const createUser = (userData: Omit<User, "id" | "createdAt">) => {
    if (!isAdmin) return;
    const newUser: User = {
      id: `user-${Date.now()}`,
      createdAt: new Date().toISOString(),
      ...userData,
    };
    setUsers((prev) => [newUser, ...prev]);
    logAuditAction(
      "USER_CREATED",
      "User",
      newUser.id,
      `Created staff/user account ${newUser.email} with role ${newUser.role}`,
    );
  };

  const suspendUser = (userId: string) => {
    if (!isAdmin) return;
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, status: "suspended" as const } : u,
      ),
    );
    logAuditAction(
      "USER_SUSPENDED",
      "User",
      userId,
      `Suspended user account ${userId}`,
    );
  };

  const updateUser = (userId: string, updates: Partial<User>) => {
    if (!isAdmin) return;
    const updatedUser = users.find((user) => user.id === userId);
    if (!updatedUser) return;
    const nextUser = { ...updatedUser, ...updates };
    setUsers((prev) =>
      prev.map((user) => (user.id === userId ? { ...user, ...updates } : user)),
    );
    if (authUser?.id === userId) {
      setAuthUser(nextUser);
      localStorage.setItem("kesales_auth_user", JSON.stringify(nextUser));
    }
    logAuditAction(
      "USER_UPDATED",
      "User",
      userId,
      `Updated account fields for ${userId}`,
    );
  };

  const deleteUser = (userId: string) => {
    if (!isAdmin || userId === authUser?.id) return;
    const user = users.find((item) => item.id === userId);
    if (!user || user.role === "super_admin") return;
    setUsers((prev) => prev.filter((item) => item.id !== userId));
    logAuditAction(
      "USER_DELETED",
      "User",
      userId,
      `Deleted user account ${user.email}`,
    );
  };

  const restoreUser = (userId: string) => {
    if (!isAdmin) return;
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, status: "active" as const } : u,
      ),
    );
    logAuditAction(
      "USER_RESTORED",
      "User",
      userId,
      `Restored user account ${userId}`,
    );
  };

  const deactivateUser = (userId: string) => {
    if (!isAdmin || userId === authUser?.id) return;
    setUsers((prev) =>
      prev.map((user) =>
        user.id === userId
          ? {
              ...user,
              status: "suspended",
              deactivatedAt: new Date().toISOString(),
            }
          : user,
      ),
    );
    logAuditAction(
      "USER_DEACTIVATED",
      "User",
      userId,
      `Deactivated user account ${userId}`,
    );
  };

  const anonymizeUser = (userId: string) => {
    if (!isAdmin || userId === authUser?.id) return;
    setUsers((prev) =>
      prev.map((user) =>
        user.id === userId
          ? {
              ...user,
              name: "Anonymized User",
              email: `deleted-${userId}@invalid.local`,
              phone: "",
              status: "suspended",
              adminNotes: "Anonymized under retention policy",
            }
          : user,
      ),
    );
    logAuditAction(
      "USER_ANONYMIZED",
      "User",
      userId,
      `Anonymized user account ${userId}`,
    );
  };

  const requirePasswordChange = (userId: string) =>
    updateUser(userId, { mustChangePassword: true });

  const requireUserReverification = (userId: string) =>
    updateUser(userId, { verificationStatus: "reverification_required" });

  const forceLogoutUser = (userId: string) => {
    if (!isAdmin) return;
    logAuditAction(
      "FORCE_LOGOUT",
      "User",
      userId,
      `Revoked active sessions for ${userId}`,
    );
  };

  // Customer Support Operations
  const createSupportTicket = (
    ticket: Omit<
      SupportTicket,
      "id" | "ticketNumber" | "createdAt" | "updatedAt" | "messages"
    >,
    initialMessage: string,
  ) => {
    const ticketId = `ticket-${Date.now()}`;
    const ticketNum = `TCK-2026-${Math.floor(100 + Math.random() * 900)}`;
    const now = new Date().toISOString();
    const newTicket: SupportTicket = {
      id: ticketId,
      ticketNumber: ticketNum,
      ...ticket,
      createdAt: now,
      updatedAt: now,
      messages: [
        {
          id: `msg-${Date.now()}`,
          senderId: ticket.userId,
          senderName: ticket.userName,
          senderRole: ticket.userRole,
          message: initialMessage,
          createdAt: now,
        },
      ],
    };
    setSupportTickets((prev) => [newTicket, ...prev]);
    logAuditAction(
      "TICKET_CREATED",
      "SupportTicket",
      ticketId,
      `Created ticket ${ticketNum}: ${ticket.subject}`,
    );
  };

  const replySupportTicket = (ticketId: string, message: string) => {
    if (!authUser || !message.trim()) return;
    const ticket = supportTickets.find((t) => t.id === ticketId);
    if (!ticket) return;
    const canReply =
      isAdmin ||
      ticket.userId === authUser.id ||
      (isSeller && ticket.userRole === "seller");
    if (!canReply) return;

    const now = new Date().toISOString();
    setSupportTickets((prev) =>
      prev.map((t) => {
        if (t.id === ticketId) {
          return {
            ...t,
            updatedAt: now,
            status: isCustomer || isSeller ? "open" : "in_progress",
            messages: [
              ...t.messages,
              {
                id: `msg-${Date.now()}`,
                senderId: authUser.id,
                senderName: authUser.name,
                senderRole: authUser.role,
                message,
                createdAt: now,
              },
            ],
          };
        }
        return t;
      }),
    );
  };

  const updateTicketStatus = (
    ticketId: string,
    status: SupportTicket["status"],
  ) => {
    if (!isAdmin) return;
    setSupportTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId
          ? { ...t, status, updatedAt: new Date().toISOString() }
          : t,
      ),
    );
    logAuditAction(
      "TICKET_STATUS_UPDATED",
      "SupportTicket",
      ticketId,
      `Ticket status changed to ${status}`,
    );
  };

  // Promotions Marketing Operations
  const createPromotion = (promo: Omit<Promotion, "id">) => {
    if (!canGovernMarketing) return;
    const id = `promo-${Date.now()}`;
    const newPromo: Promotion = { id, ...promo };
    setPromotions((prev) => [newPromo, ...prev]);
    logAuditAction(
      "PROMOTION_CREATED",
      "Promotion",
      id,
      `Created promotion campaign: ${promo.title}`,
    );
  };

  const updatePromotion = (id: string, updates: Partial<Promotion>) => {
    if (!canGovernMarketing) return;
    setPromotions((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    );
    logAuditAction(
      "PROMOTION_UPDATED",
      "Promotion",
      id,
      `Updated promotion campaign ${id}`,
    );
  };

  const deletePromotion = (id: string) => {
    if (!canGovernMarketing) return;
    setPromotions((prev) => prev.filter((p) => p.id !== id));
    logAuditAction(
      "PROMOTION_DELETED",
      "Promotion",
      id,
      `Deleted promotion campaign ${id}`,
    );
  };

  const createFlashSale = (
    sale: Omit<FlashSaleCampaign, "id" | "createdAt">,
  ) => {
    if (!canGovernMarketing) return;
    const id = `flash-${Date.now()}`;
    const newSale: FlashSaleCampaign = {
      id,
      createdAt: new Date().toISOString(),
      ...sale,
    };
    setFlashSales((prev) => [newSale, ...prev]);
    setProducts((prev) =>
      prev.map((product) => {
        if (!sale.productIds.includes(product.id)) return product;
        const discountPrice = Math.round(
          product.price * (1 - sale.discountPercentage / 100),
        );
        return {
          ...product,
          discountPrice,
          isFlashSale: true,
          flashSaleEndsAt: sale.endDate,
        };
      }),
    );
    logAuditAction(
      "FLASH_SALE_CREATED",
      "FlashSaleCampaign",
      id,
      `Created flash sale campaign: ${sale.name}`,
    );
  };

  const updateFlashSale = (id: string, updates: Partial<FlashSaleCampaign>) => {
    if (!canGovernMarketing) return;
    setFlashSales((prev) =>
      prev.map((sale) => (sale.id === id ? { ...sale, ...updates } : sale)),
    );
    logAuditAction(
      "FLASH_SALE_UPDATED",
      "FlashSaleCampaign",
      id,
      `Updated flash sale campaign ${id}`,
    );
  };

  const deleteFlashSale = (id: string) => {
    if (!canGovernMarketing) return;
    const sale = flashSales.find((item) => item.id === id);
    setFlashSales((prev) => prev.filter((item) => item.id !== id));
    if (sale) {
      setProducts((prev) =>
        prev.map((product) =>
          sale.productIds.includes(product.id)
            ? {
                ...product,
                isFlashSale: false,
                flashSaleEndsAt: undefined,
              }
            : product,
        ),
      );
    }
    logAuditAction(
      "FLASH_SALE_DELETED",
      "FlashSaleCampaign",
      id,
      `Deleted flash sale campaign ${id}`,
    );
  };

  const updateHomepageSettings = (nextSettings: HomepageSettings) => {
    if (!canGovernMarketing) return;
    setHomepageSettings(nextSettings);
    logAuditAction(
      "HOMEPAGE_SETTINGS_UPDATED",
      "Homepage",
      "homepage",
      "Updated homepage section visibility or ordering",
    );
  };

  // Customer Returns & Admin Refunds Operations
  const requestReturn = (
    orderId: string,
    subOrderId: string,
    productId: string,
    reason: string,
  ) => {
    const order = orders.find((o) => o.id === orderId);
    if (currentRole !== "customer" || order?.customerId !== authUser?.id) {
      return {
        success: false,
        message: "You can only request returns for your own orders.",
      };
    }
    const subOrder = order?.sellerSubOrders.find((s) => s.id === subOrderId);
    const item = subOrder?.items.find((i) => i.productId === productId);

    if (!order || !subOrder || !item) {
      return { success: false, message: "Order item could not be located." };
    }

    const returnId = `ret-${Date.now()}`;
    const returnNumber = `RET-2026-${Math.floor(100 + Math.random() * 900)}`;
    const newReturn: ReturnRequest = {
      id: returnId,
      returnNumber,
      orderId,
      orderNumber: order.orderNumber,
      subOrderId,
      customerId: order.customerId,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      sellerId: subOrder.sellerId,
      sellerName: subOrder.sellerName,
      productId: item.productId,
      productName: item.productName,
      productImage: item.productImage,
      price: item.price * item.quantity,
      reason,
      status: "pending_review",
      createdAt: new Date().toISOString(),
    };

    setReturns((prev) => [newReturn, ...prev]);

    // Update subOrder status to return_requested
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          return {
            ...o,
            status: "return_requested" as OrderStatus,
            sellerSubOrders: o.sellerSubOrders.map((so) =>
              so.id === subOrderId
                ? { ...so, status: "return_requested" as OrderStatus }
                : so,
            ),
          };
        }
        return o;
      }),
    );

    logAuditAction(
      "RETURN_REQUESTED",
      "ReturnRequest",
      returnNumber,
      `Customer ${order.customerName} requested return for ${item.productName}. Reason: ${reason}`,
    );

    return {
      success: true,
      message: `Return request ${returnNumber} submitted successfully. Compliance will review your request within 24 hours.`,
    };
  };

  const updateReturnStatus = (
    returnId: string,
    status: ReturnRequest["status"],
    rejectionReason?: string,
  ) => {
    const returnRequest = returns.find((item) => item.id === returnId);
    if (
      !returnRequest ||
      !(
        isAdmin ||
        (currentRole === "seller" && currentSellerId === returnRequest.sellerId)
      )
    )
      return;
    setReturns((prev) =>
      prev.map((r) =>
        r.id === returnId
          ? {
              ...r,
              status,
              rejectionReason,
              resolvedAt:
                status === "refunded" || status === "rejected"
                  ? new Date().toISOString()
                  : r.resolvedAt,
            }
          : r,
      ),
    );
    logAuditAction(
      "RETURN_STATUS_UPDATED",
      "ReturnRequest",
      returnId,
      `Return status set to ${status}. ${rejectionReason || ""}`,
    );
  };

  const cancelReturn = (returnId: string) => {
    const returnRequest = returns.find((item) => item.id === returnId);
    if (
      !returnRequest ||
      currentRole !== "customer" ||
      returnRequest.customerId !== authUser?.id ||
      returnRequest.status !== "pending_review"
    )
      return;
    setReturns((prev) =>
      prev.map((item) =>
        item.id === returnId ? { ...item, status: "cancelled" } : item,
      ),
    );
    logAuditAction(
      "RETURN_CANCELLED",
      "ReturnRequest",
      returnId,
      `Customer cancelled return request ${returnRequest.returnNumber}`,
    );
  };

  const processReturnRefund = (returnId: string) => {
    if (!hasPermission(currentRole, "refunds.process")) return;
    const ret = returns.find((r) => r.id === returnId);
    if (!ret) return;

    // 1. Mark return as refunded
    setReturns((prev) =>
      prev.map((r) =>
        r.id === returnId
          ? {
              ...r,
              status: "refunded" as const,
              resolvedAt: new Date().toISOString(),
            }
          : r,
      ),
    );

    // 2. Mark master order and sub-order as refunded
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === ret.orderId) {
          return {
            ...o,
            paymentStatus: "refunded" as const,
            status: "refunded" as const,
            sellerSubOrders: o.sellerSubOrders.map((so) =>
              so.id === ret.subOrderId
                ? { ...so, status: "refunded" as const }
                : so,
            ),
          };
        }
        return o;
      }),
    );

    // 3. Post REFUND entry in Financial Ledger
    const txnRef = `REFUND-MPESA-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const ledgerEntry: FinancialLedgerEntry = {
      id: `led-ref-${Date.now()}`,
      transactionRef: txnRef,
      type: "REFUND",
      orderNumber: ret.orderNumber,
      sellerId: ret.sellerId,
      sellerName: ret.sellerName,
      debit: ret.price,
      credit: 0,
      balanceAfter: 0,
      notes: `Reversal / Customer Refund for Order ${ret.orderNumber} (Return ${ret.returnNumber})`,
      createdAt: new Date().toISOString(),
    };
    setLedger((prev) => [ledgerEntry, ...prev]);

    logAuditAction(
      "REFUND_PROCESSED",
      "ReturnRequest",
      ret.returnNumber,
      `Refund of KSh ${ret.price.toLocaleString()} processed for customer ${ret.customerName}. Txn: ${txnRef}`,
    );
  };

  // Customer Delivery Addresses CRUD
  const addAddress = (addr: DeliveryAddress) => {
    if (!isCustomer) return;
    const id = `addr-${Date.now()}`;
    const newAddr: DeliveryAddress = { id, ...addr };
    setAddresses((prev) => {
      if (newAddr.isDefault) {
        return [newAddr, ...prev.map((a) => ({ ...a, isDefault: false }))];
      }
      return [...prev, newAddr];
    });
  };

  const updateAddress = (id: string, updates: Partial<DeliveryAddress>) => {
    if (!isCustomer) return;
    const target = addresses.find((a) => a.id === id);
    if (!target || target.phone !== authUser?.phone) return;
    setAddresses((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          return { ...a, ...updates };
        }
        if (updates.isDefault) {
          return { ...a, isDefault: false };
        }
        return a;
      }),
    );
  };

  const deleteAddress = (id: string) => {
    if (!isCustomer) return;
    const target = addresses.find((a) => a.id === id);
    if (!target || target.phone !== authUser?.phone) return;
    setAddresses((prev) => prev.filter((a) => a.id !== id));
  };

  const setDefaultAddress = (id: string) => {
    if (!isCustomer) return;
    const target = addresses.find((a) => a.id === id);
    if (!target || target.phone !== authUser?.phone) return;
    setAddresses((prev) =>
      prev.map((a) => ({
        ...a,
        isDefault: a.id === id,
      })),
    );
  };

  // Logistics Delivery Zones CRUD
  const addDeliveryZone = (zone: DeliveryZone) => {
    if (!canGovernLogistics) return;
    const id = `zone-${Date.now()}`;
    setDeliveryZones((prev) => [...prev, { id, ...zone }]);
    logAuditAction(
      "ZONE_CREATED",
      "DeliveryZone",
      zone.county,
      `Created delivery zone for ${zone.county}`,
    );
  };

  const updateDeliveryZone = (
    county: string,
    updates: Partial<DeliveryZone>,
  ) => {
    if (!canGovernLogistics) return;
    setDeliveryZones((prev) =>
      prev.map((z) => (z.county === county ? { ...z, ...updates } : z)),
    );
    logAuditAction(
      "ZONE_UPDATED",
      "DeliveryZone",
      county,
      `Updated delivery tariffs/parameters for ${county}`,
    );
  };

  const deleteDeliveryZone = (county: string) => {
    if (!canGovernLogistics) return;
    setDeliveryZones((prev) => prev.filter((z) => z.county !== county));
    logAuditAction(
      "ZONE_DELETED",
      "DeliveryZone",
      county,
      `Deleted delivery zone for ${county}`,
    );
  };

  // Direct manual audit log dispatch
  const addAuditLog = (
    action: string,
    entity: string,
    entityId: string,
    details: string,
  ) => {
    logAuditAction(action, entity, entityId, details);
  };

  const addProductReview = (
    productId: string,
    rating: number,
    comment: string,
    customerName = "Verified Shopper",
  ) => {
    const newRev: Review = {
      id: `rev-${Date.now()}`,
      productId,
      customerName,
      rating,
      comment,
      verifiedPurchase: true,
      date: new Date().toISOString().split("T")[0],
    };

    setReviews((prev) => ({
      ...prev,
      [productId]: [newRev, ...(prev[productId] || [])],
    }));

    // Recalculate product rating
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          const prodReviews = [newRev, ...(reviews[productId] || [])];
          const avg =
            prodReviews.reduce((sum, r) => sum + r.rating, 0) /
            prodReviews.length;
          return {
            ...p,
            rating: Number(avg.toFixed(1)),
            reviewsCount: prodReviews.length,
          };
        }
        return p;
      }),
    );
  };

  const formatKSh = (amount: number) => {
    return `KSh ${Math.round(amount).toLocaleString()}`;
  };

  return (
    <MarketplaceContext.Provider
      value={{
        authUser,
        users,
        login,
        logout,
        registerUser,
        currentRole,
        currentSellerId,
        currentSeller,
        categories,
        brands,
        sellers,
        products,
        orders,
        ledger,
        payouts,
        coupons,
        auditLogs,
        deliveryZones,
        reviews,
        cart,
        wishlist,
        appliedCoupon,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        applyCoupon,
        removeCoupon,
        toggleWishlist,
        cartSubtotal,
        cartDiscount,
        cartDeliveryFee,
        cartGrandTotal,
        cartGroupedBySeller,
        createOrder,
        updateSubOrderStatus,
        updateMasterOrder,
        deleteMasterOrder,
        cancelOrder,
        addSellerProduct,
        updateSellerProduct,
        submitSellerProductForApproval,
        updateInventoryStock,
        requestSellerPayout,
        updateSellerProfile,
        updateSellerVerification,
        updateSellerStatus,
        approveSeller,
        suspendSeller,
        updateSellerCommission,
        updateProductStatus,
        processPayout,
        approvePayout,
        processApprovedPayout,
        rejectPayout,
        createCoupon,
        updateCoupon,
        deleteCoupon,
        addProductReview,
        settings,
        updateSettings,
        supportTickets,
        createSupportTicket,
        replySupportTicket,
        updateTicketStatus,
        promotions,
        createPromotion,
        updatePromotion,
        deletePromotion,
        flashSales,
        createFlashSale,
        updateFlashSale,
        deleteFlashSale,
        homepageSettings,
        updateHomepageSettings,
        returns,
        requestReturn,
        updateReturnStatus,
        cancelReturn,
        processReturnRefund,
        addresses,
        addAddress,
        updateAddress,
        deleteAddress,
        setDefaultAddress,
        deleteSellerProduct,
        addCategory,
        updateCategory,
        deleteCategory,
        addBrand,
        updateBrand,
        deleteBrand,
        createUser,
        updateUser,
        deleteUser,
        suspendUser,
        restoreUser,
        deactivateUser,
        anonymizeUser,
        requirePasswordChange,
        requireUserReverification,
        forceLogoutUser,
        addDeliveryZone,
        updateDeliveryZone,
        deleteDeliveryZone,
        addAuditLog,
        formatKSh,
      }}
    >
      {children}
    </MarketplaceContext.Provider>
  );
};

export const useMarketplace = () => {
  const context = useContext(MarketplaceContext);
  if (!context) {
    throw new Error("useMarketplace must be used within a MarketplaceProvider");
  }
  return context;
};
