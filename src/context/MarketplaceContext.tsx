import React, { createContext, useContext, useState, useEffect } from 'react';
import {
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
} from '../types';
import {
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
} from '../data/initialData';

interface MarketplaceContextType {
  // Navigation & Role
  currentRole: Role;
  setCurrentRole: (role: Role) => void;
  currentSellerId: string;
  setCurrentSellerId: (sellerId: string) => void;
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
  addToCart: (product: Product, variant?: ProductVariant, quantity?: number) => void;
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
  cartGroupedBySeller: { seller: Seller; items: CartItem[]; subtotal: number }[];

  // Checkout & Orders
  createOrder: (orderData: {
    address: DeliveryAddress;
    deliveryType: 'home_delivery' | 'pickup_station';
    pickupStation?: string;
    paymentMethod: PaymentMethod;
  }) => Promise<MasterOrder>;
  updateSubOrderStatus: (subOrderId: string, status: OrderStatus, trackingNumber?: string) => void;
  cancelOrder: (orderId: string, reason: string) => void;

  // Seller operations
  addSellerProduct: (product: Omit<Product, 'id' | 'createdAt' | 'rating' | 'reviewsCount'>) => Product;
  updateSellerProduct: (productId: string, updates: Partial<Product>) => void;
  updateInventoryStock: (productId: string, variantId: string | undefined, stock: number) => void;
  requestSellerPayout: (
    sellerId: string,
    amount: number,
    method: 'mpesa' | 'bank',
    account: string
  ) => { success: boolean; message: string };
  updateSellerProfile: (sellerId: string, updates: Partial<Seller>) => void;

  // Admin operations
  updateSellerStatus: (sellerId: string, status: SellerStatus, reason?: string) => void;
  approveSeller: (sellerId: string) => void;
  suspendSeller: (sellerId: string) => void;
  updateSellerCommission: (sellerId: string, newRate: number) => void;
  updateProductStatus: (productId: string, status: ProductStatus) => void;
  processPayout: (payoutId: string, action: 'approve' | 'reject', reason?: string) => void;
  approvePayout: (payoutId: string) => void;
  rejectPayout: (payoutId: string, reason?: string) => void;
  createCoupon: (coupon: Coupon) => void;

  // Reviews
  addProductReview: (productId: string, rating: number, comment: string, customerName?: string) => void;

  // Utilities
  formatKSh: (amount: number) => string;
}

const MarketplaceContext = createContext<MarketplaceContextType | undefined>(undefined);

export const MarketplaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Current view state
  const [currentRole, setCurrentRole] = useState<Role>('customer');
  const [currentSellerId, setCurrentSellerId] = useState<string>('seller-1');

  // Datasets initialized from storage or defaults
  const [categories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [brands] = useState<Brand[]>(INITIAL_BRANDS);
  const [sellers, setSellers] = useState<Seller[]>(() => {
    const saved = localStorage.getItem('jumia_sellers');
    return saved ? JSON.parse(saved) : INITIAL_SELLERS;
  });
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('jumia_products');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });
  const [orders, setOrders] = useState<MasterOrder[]>(() => {
    const saved = localStorage.getItem('jumia_orders');
    return saved ? JSON.parse(saved) : INITIAL_ORDERS;
  });
  const [ledger, setLedger] = useState<FinancialLedgerEntry[]>(() => {
    const saved = localStorage.getItem('jumia_ledger');
    return saved ? JSON.parse(saved) : INITIAL_LEDGER;
  });
  const [payouts, setPayouts] = useState<SellerPayoutRequest[]>(() => {
    const saved = localStorage.getItem('jumia_payouts');
    return saved ? JSON.parse(saved) : INITIAL_PAYOUTS;
  });
  const [coupons, setCoupons] = useState<Coupon[]>(() => {
    const saved = localStorage.getItem('jumia_coupons');
    return saved ? JSON.parse(saved) : INITIAL_COUPONS;
  });
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem('jumia_audit_logs');
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
  });
  const [deliveryZones] = useState<DeliveryZone[]>(INITIAL_DELIVERY_ZONES);

  // Cart & Wishlist
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('jumia_cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [wishlist, setWishlist] = useState<string[]>(() => {
    const saved = localStorage.getItem('jumia_wishlist');
    return saved ? JSON.parse(saved) : ['prod-sony-wh1000xm5', 'prod-nike-airmax-90'];
  });
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);

  // Reviews dictionary by product ID
  const [reviews, setReviews] = useState<Record<string, Review[]>>({
    'prod-s24-ultra': [
      {
        id: 'rev-1',
        productId: 'prod-s24-ultra',
        customerName: 'John Kamau',
        rating: 5,
        comment: 'Absolute monster of a phone. The display is flat and anti-reflective, and battery easily lasts 2 full days in Nairobi traffic.',
        verifiedPurchase: true,
        date: '2026-09-10',
      },
      {
        id: 'rev-2',
        productId: 'prod-s24-ultra',
        customerName: 'Beatrice A.',
        rating: 5,
        comment: 'Original Samsung warranty confirmed via dial code. Arrived in 24 hours via Allsales Express!',
        verifiedPurchase: true,
        date: '2026-09-15',
      },
    ],
    'prod-anker-737': [
      {
        id: 'rev-3',
        productId: 'prod-anker-737',
        customerName: 'Edwin M.',
        rating: 5,
        comment: 'Charges my M2 MacBook Pro at full 100W speed! The screen is super handy to see wattage.',
        verifiedPurchase: true,
        date: '2026-09-12',
      },
    ],
  });

  // Sync state to LocalStorage
  useEffect(() => {
    localStorage.setItem('jumia_sellers', JSON.stringify(sellers));
  }, [sellers]);

  useEffect(() => {
    localStorage.setItem('jumia_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('jumia_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('jumia_ledger', JSON.stringify(ledger));
  }, [ledger]);

  useEffect(() => {
    localStorage.setItem('jumia_payouts', JSON.stringify(payouts));
  }, [payouts]);

  useEffect(() => {
    localStorage.setItem('jumia_coupons', JSON.stringify(coupons));
  }, [coupons]);

  useEffect(() => {
    localStorage.setItem('jumia_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('jumia_wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  useEffect(() => {
    localStorage.setItem('jumia_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  // Current logged in seller object
  const currentSeller = sellers.find((s) => s.id === currentSellerId);

  // Cart operations
  const addToCart = (product: Product, variant?: ProductVariant, quantity = 1) => {
    setCart((prev) => {
      const price = variant ? (variant.discountPrice || variant.price) : (product.discountPrice || product.price);
      const maxStock = variant ? variant.stock : product.stock;
      const variantText = variant
        ? Object.entries(variant.attributes)
            .map(([k, v]) => `${k}: ${v}`)
            .join(' | ')
        : undefined;

      const existingIndex = prev.findIndex(
        (item) => item.productId === product.id && item.variantId === (variant?.id || undefined)
      );

      if (existingIndex > -1) {
        const updated = [...prev];
        const newQty = Math.min(updated[existingIndex].quantity + quantity, maxStock);
        updated[existingIndex] = { ...updated[existingIndex], quantity: newQty };
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
      })
    );
  };

  const clearCart = () => {
    setCart([]);
    setAppliedCoupon(null);
  };

  const applyCoupon = (code: string) => {
    const found = coupons.find((c) => c.code.toUpperCase() === code.trim().toUpperCase());
    if (!found) {
      return { success: false, message: 'Invalid or expired coupon code' };
    }
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    if (subtotal < found.minOrderValue) {
      return {
        success: false,
        message: `Minimum order value for ${found.code} is KSh ${found.minOrderValue.toLocaleString()}`,
      };
    }
    setAppliedCoupon(found);
    return { success: true, message: `Coupon ${found.code} applied successfully!` };
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
  };

  const toggleWishlist = (productId: string) => {
    setWishlist((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  // Cart financial calculations
  const cartSubtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  let cartDiscount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.type === 'percentage') {
      const calc = (cartSubtotal * appliedCoupon.value) / 100;
      cartDiscount = appliedCoupon.maxDiscount ? Math.min(calc, appliedCoupon.maxDiscount) : calc;
    } else {
      cartDiscount = appliedCoupon.value;
    }
  }

  // Delivery fee: Base 250 for Nairobi, +100 per additional seller
  const uniqueSellerIds = Array.from(new Set(cart.map((item) => item.sellerId)));
  const cartDeliveryFee = cart.length === 0 ? 0 : 250 + Math.max(0, uniqueSellerIds.length - 1) * 100;
  const cartGrandTotal = Math.max(0, cartSubtotal - cartDiscount + cartDeliveryFee);

  // Group cart items by seller
  const cartGroupedBySeller = uniqueSellerIds
    .map((sellerId) => {
      const seller = sellers.find((s) => s.id === sellerId) || {
        id: sellerId,
        userId: 'u',
        businessName: 'Independent Vendor',
        slug: 'independent-vendor',
        ownerName: 'Vendor',
        email: '',
        phone: '',
        county: 'Nairobi',
        town: 'Nairobi',
        address: '',
        taxPin: '',
        businessRegNumber: '',
        logo: '',
        banner: '',
        description: '',
        status: 'approved' as SellerStatus,
        commissionRate: 10,
        rating: 4.5,
        totalSalesCount: 0,
        pendingBalance: 0,
        availableBalance: 0,
        totalPayouts: 0,
        payoutMethod: 'mpesa' as const,
        payoutAccount: '',
        createdAt: '',
      };
      const items = cart.filter((item) => item.sellerId === sellerId);
      const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      return { seller, items, subtotal };
    })
    .filter((g) => g.items.length > 0);

  // Helper log function
  const logAuditAction = (action: string, entity: string, entityId: string, details: string) => {
    const newLog: AuditLog = {
      id: `aud-${Date.now()}`,
      userId: currentRole === 'seller' ? currentSellerId : 'user-admin',
      userName: currentRole === 'seller' ? currentSeller?.businessName || 'Seller' : 'Platform Administrator',
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
    deliveryType: 'home_delivery' | 'pickup_station';
    pickupStation?: string;
    paymentMethod: PaymentMethod;
  }): Promise<MasterOrder> => {
    if (cart.length === 0) {
      throw new Error('Cart is empty');
    }

    // 1. Stock Reservation & Validation
    for (const item of cart) {
      const prod = products.find((p) => p.id === item.productId);
      if (!prod) throw new Error(`Product ${item.name} not found`);

      if (item.variantId && prod.variants) {
        const variant = prod.variants.find((v) => v.id === item.variantId);
        if (!variant || variant.stock < item.quantity) {
          throw new Error(`Insufficient stock for ${item.name} (${item.variantText || ''})`);
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
        const cartItemsForProd = cart.filter((item) => item.productId === prod.id);
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
      })
    );

    // 3. Generate Master Order and Seller Sub-Orders
    const orderTimestamp = new Date().toISOString();
    const orderRandomSuffix = Math.floor(100000 + Math.random() * 900000);
    const orderNumber = `JM-ORD-${orderRandomSuffix}`;
    const masterOrderId = `ord-${Date.now()}`;

    // Split items into sub-orders for each seller
    const sellerSubOrders: SellerSubOrder[] = [];
    const newLedgerEntries: FinancialLedgerEntry[] = [];

    // Base delivery fee divided across sellers
    const perSellerDeliveryFee = Math.round(cartDeliveryFee / uniqueSellerIds.length);

    uniqueSellerIds.forEach((sellerId, idx) => {
      const seller = sellers.find((s) => s.id === sellerId);
      const sellerName = seller?.businessName || 'Independent Vendor';
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
      const commissionTotal = subItems.reduce((acc, i) => acc + i.sellerCommission, 0);
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
        status: 'processing',
        createdAt: orderTimestamp,
      };

      sellerSubOrders.push(subOrder);

      // Financial Ledger record: Platform Commission
      newLedgerEntries.push({
        id: `led-com-${Date.now()}-${idx}`,
        transactionRef: `TXN-COM-${orderRandomSuffix}-${letterCode}`,
        type: 'PLATFORM_COMMISSION',
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
              totalSalesCount: s.totalSalesCount + sellerItems.reduce((q, item) => q + item.quantity, 0),
            };
          }
          return s;
        })
      );
    });

    // Customer Payment transaction
    const paymentRef =
      orderData.paymentMethod === 'mpesa_stk'
        ? `MPESA-WS${Math.random().toString(36).substring(2, 9).toUpperCase()}`
        : `CRD-TXN-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    newLedgerEntries.unshift({
      id: `led-pay-${Date.now()}`,
      transactionRef: paymentRef,
      type: 'CUSTOMER_PAYMENT',
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
      type: 'DELIVERY_FEE',
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
      customerId: 'cust-demo-1',
      customerName: orderData.address.fullName,
      customerEmail: 'customer@allsales.ke',
      customerPhone: orderData.address.phone,
      deliveryAddress: orderData.address,
      deliveryType: orderData.deliveryType,
      pickupStationName: orderData.pickupStation,
      paymentMethod: orderData.paymentMethod,
      paymentStatus: 'paid',
      paymentReference: paymentRef,
      subtotal: cartSubtotal,
      discountTotal: cartDiscount,
      couponCode: appliedCoupon?.code,
      deliveryFeeTotal: cartDeliveryFee,
      grandTotal: cartGrandTotal,
      status: 'confirmed',
      sellerSubOrders,
      createdAt: orderTimestamp,
    };

    setOrders((prev) => [newMasterOrder, ...prev]);
    setLedger((prev) => [...newLedgerEntries, ...prev]);

    logAuditAction('ORDER_PLACED', 'Order', orderNumber, `Customer placed order ${orderNumber} worth KSh ${cartGrandTotal.toLocaleString()}`);

    // Clear cart after checkout
    clearCart();

    return newMasterOrder;
  };

  // Sub-order status update by seller or admin
  const updateSubOrderStatus = (subOrderId: string, status: OrderStatus, trackingNumber?: string) => {
    setOrders((prev) =>
      prev.map((order) => {
        const subIndex = order.sellerSubOrders.findIndex((s) => s.id === subOrderId);
        if (subIndex === -1) return order;

        const updatedSubOrders = [...order.sellerSubOrders];
        const targetSub = { ...updatedSubOrders[subIndex], status };

        if (trackingNumber) {
          targetSub.trackingNumber = trackingNumber;
        }
        if (status === 'dispatched') {
          targetSub.dispatchedAt = new Date().toISOString();
        }
        if (status === 'delivered') {
          targetSub.deliveredAt = new Date().toISOString();

          // Transfer funds from Pending to Available for seller
          setSellers((sList) =>
            sList.map((s) => {
              if (s.id === targetSub.sellerId) {
                return {
                  ...s,
                  pendingBalance: Math.max(0, s.pendingBalance - targetSub.sellerNetTotal),
                  availableBalance: s.availableBalance + targetSub.sellerNetTotal,
                };
              }
              return s;
            })
          );
        }

        updatedSubOrders[subIndex] = targetSub;

        // Calculate overall master order status
        const allDelivered = updatedSubOrders.every((s) => s.status === 'delivered');
        const anyDispatched = updatedSubOrders.some((s) => s.status === 'dispatched');
        let newMasterStatus = order.status;

        if (allDelivered) newMasterStatus = 'delivered';
        else if (anyDispatched) newMasterStatus = 'dispatched';

        return {
          ...order,
          status: newMasterStatus,
          sellerSubOrders: updatedSubOrders,
        };
      })
    );

    logAuditAction('SUB_ORDER_STATUS_CHANGE', 'SubOrder', subOrderId, `Sub-order status transitioned to ${status}`);
  };

  const cancelOrder = (orderId: string, reason: string) => {
    setOrders((prev) =>
      prev.map((order) => {
        if (order.id === orderId) {
          const updatedSubOrders = order.sellerSubOrders.map((sub) => ({
            ...sub,
            status: 'cancelled' as OrderStatus,
          }));
          return {
            ...order,
            status: 'cancelled' as OrderStatus,
            paymentStatus: 'refunded',
            sellerSubOrders: updatedSubOrders,
          };
        }
        return order;
      })
    );

    logAuditAction('ORDER_CANCELLED', 'Order', orderId, `Order cancelled: ${reason}`);
  };

  // Seller Product Creation & Inventory Management
  const addSellerProduct = (
    productData: Omit<Product, 'id' | 'createdAt' | 'rating' | 'reviewsCount'>
  ): Product => {
    const newProduct: Product = {
      ...productData,
      id: `prod-${Date.now()}`,
      rating: 5.0,
      reviewsCount: 0,
      createdAt: new Date().toISOString(),
    };

    setProducts((prev) => [newProduct, ...prev]);
    logAuditAction('PRODUCT_CREATED', 'Product', newProduct.id, `Created product "${newProduct.name}" by seller ${newProduct.sellerId}`);
    return newProduct;
  };

  const updateSellerProduct = (productId: string, updates: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          return { ...p, ...updates };
        }
        return p;
      })
    );
    logAuditAction('PRODUCT_UPDATED', 'Product', productId, `Updated product specs for ID ${productId}`);
  };

  const updateInventoryStock = (productId: string, variantId: string | undefined, stock: number) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;

        if (variantId && p.variants) {
          const updatedVariants = p.variants.map((v) => (v.id === variantId ? { ...v, stock } : v));
          const totalStock = updatedVariants.reduce((sum, v) => sum + v.stock, 0);
          return { ...p, variants: updatedVariants, stock: totalStock };
        }
        return { ...p, stock };
      })
    );

    logAuditAction('STOCK_UPDATED', 'Inventory', productId, `Stock adjusted to ${stock} units`);
  };

  // Seller Payout Request
  const requestSellerPayout = (
    sellerId: string,
    amount: number,
    method: 'mpesa' | 'bank',
    account: string
  ) => {
    const seller = sellers.find((s) => s.id === sellerId);
    if (!seller) return { success: false, message: 'Seller not found' };

    if (amount < 2000) {
      return { success: false, message: 'Minimum payout threshold is KSh 2,000' };
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
      status: 'pending',
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
      })
    );

    logAuditAction('PAYOUT_REQUESTED', 'Payout', payoutNumber, `Seller ${seller.businessName} requested payout of KSh ${amount.toLocaleString()}`);

    return {
      success: true,
      message: `Payout request ${payoutNumber} submitted. Platform admin will review and disburse funds shortly.`,
    };
  };

  const updateSellerProfile = (sellerId: string, updates: Partial<Seller>) => {
    setSellers((prev) =>
      prev.map((s) => (s.id === sellerId ? { ...s, ...updates } : s))
    );
  };

  // Admin Operations
  const updateSellerStatus = (sellerId: string, status: SellerStatus, reason?: string) => {
    setSellers((prev) =>
      prev.map((s) => (s.id === sellerId ? { ...s, status } : s))
    );
    logAuditAction('SELLER_STATUS_CHANGED', 'Seller', sellerId, `Seller status updated to ${status}. ${reason || ''}`);
  };

  const updateSellerCommission = (sellerId: string, newRate: number) => {
    setSellers((prev) =>
      prev.map((s) => (s.id === sellerId ? { ...s, commissionRate: newRate } : s))
    );
    logAuditAction('COMMISSION_RATE_UPDATED', 'Seller', sellerId, `Commission adjusted to ${newRate}%`);
  };

  const updateProductStatus = (productId: string, status: ProductStatus) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, status } : p))
    );
    logAuditAction('PRODUCT_STATUS_CHANGED', 'Product', productId, `Admin updated product status to ${status}`);
  };

  const processPayout = (payoutId: string, action: 'approve' | 'reject', reason?: string) => {
    const payout = payouts.find((p) => p.id === payoutId);
    if (!payout) return;

    if (action === 'approve') {
      const ref = `B2C-${payout.method.toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      setPayouts((prev) =>
        prev.map((p) =>
          p.id === payoutId
            ? { ...p, status: 'approved', processedAt: new Date().toISOString(), transactionRef: ref }
            : p
        )
      );

      // Increase seller's totalPayouts
      setSellers((prev) =>
        prev.map((s) =>
          s.id === payout.sellerId ? { ...s, totalPayouts: s.totalPayouts + payout.amount } : s
        )
      );

      // Financial Ledger record
      const ledgerEntry: FinancialLedgerEntry = {
        id: `led-payout-${Date.now()}`,
        transactionRef: ref,
        type: 'SELLER_PAYOUT',
        sellerId: payout.sellerId,
        sellerName: payout.sellerName,
        debit: payout.amount,
        credit: 0,
        balanceAfter: 0,
        notes: `Payout ${payout.payoutNumber} disbursed via ${payout.method.toUpperCase()} to ${payout.accountDetails}`,
        createdAt: new Date().toISOString(),
      };
      setLedger((prev) => [ledgerEntry, ...prev]);

      logAuditAction('PAYOUT_APPROVED', 'Payout', payout.payoutNumber, `Disbursed KSh ${payout.amount.toLocaleString()} to ${payout.sellerName}`);
    } else {
      // Rejection: restore available balance
      setPayouts((prev) =>
        prev.map((p) =>
          p.id === payoutId
            ? { ...p, status: 'rejected', rejectionReason: reason || 'Declined by administrator' }
            : p
        )
      );

      setSellers((prev) =>
        prev.map((s) =>
          s.id === payout.sellerId ? { ...s, availableBalance: s.availableBalance + payout.amount } : s
        )
      );

      logAuditAction('PAYOUT_REJECTED', 'Payout', payout.payoutNumber, `Rejected payout. Funds returned to seller balance. Reason: ${reason || 'Unspecified'}`);
    }
  };

  const approveSeller = (sellerId: string) => updateSellerStatus(sellerId, 'approved');
  const suspendSeller = (sellerId: string) => updateSellerStatus(sellerId, 'suspended');
  const approvePayout = (payoutId: string) => processPayout(payoutId, 'approve');
  const rejectPayout = (payoutId: string, reason?: string) => processPayout(payoutId, 'reject', reason);
  const createCoupon = (coupon: Coupon) => {
    setCoupons((prev) => [coupon, ...prev]);
    logAuditAction('COUPON_CREATED', 'Coupon', coupon.code, `Created coupon ${coupon.code}`);
  };

  const addProductReview = (
    productId: string,
    rating: number,
    comment: string,
    customerName = 'Verified Shopper'
  ) => {
    const newRev: Review = {
      id: `rev-${Date.now()}`,
      productId,
      customerName,
      rating,
      comment,
      verifiedPurchase: true,
      date: new Date().toISOString().split('T')[0],
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
          const avg = prodReviews.reduce((sum, r) => sum + r.rating, 0) / prodReviews.length;
          return {
            ...p,
            rating: Number(avg.toFixed(1)),
            reviewsCount: prodReviews.length,
          };
        }
        return p;
      })
    );
  };

  const formatKSh = (amount: number) => {
    return `KSh ${Math.round(amount).toLocaleString()}`;
  };

  return (
    <MarketplaceContext.Provider
      value={{
        currentRole,
        setCurrentRole,
        currentSellerId,
        setCurrentSellerId,
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
        cancelOrder,
        addSellerProduct,
        updateSellerProduct,
        updateInventoryStock,
        requestSellerPayout,
        updateSellerProfile,
        updateSellerStatus,
        approveSeller,
        suspendSeller,
        updateSellerCommission,
        updateProductStatus,
        processPayout,
        approvePayout,
        rejectPayout,
        createCoupon,
        addProductReview,
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
    throw new Error('useMarketplace must be used within a MarketplaceProvider');
  }
  return context;
};
