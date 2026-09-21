export type Role =
  | 'super_admin'
  | 'product_admin'
  | 'seller_admin'
  | 'finance_admin'
  | 'logistics_admin'
  | 'support_admin'
  | 'marketing_admin'
  | 'seller'
  | 'customer';

export type SellerStatus = 'pending' | 'under_review' | 'approved' | 'rejected' | 'suspended' | 'disabled';
export type ProductStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'active' | 'inactive' | 'out_of_stock';
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'ready_for_dispatch'
  | 'dispatched'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'return_requested'
  | 'returned'
  | 'refunded';

export type PaymentStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
export type PaymentMethod = 'mpesa_stk' | 'card' | 'bank_transfer' | 'cash_on_delivery';
export type PayoutStatus = 'pending' | 'approved' | 'processed' | 'rejected';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  sellerId?: string;
  permissions: string[];
  status: 'active' | 'suspended';
  avatar?: string;
  createdAt: string;
}

export interface Seller {
  id: string;
  userId: string;
  businessName: string;
  slug: string;
  ownerName: string;
  email: string;
  phone: string;
  county: string;
  town: string;
  address: string;
  taxPin: string;
  businessRegNumber: string;
  logo: string;
  banner: string;
  description: string;
  status: SellerStatus;
  commissionRate: number; // e.g. 10 for 10%
  rating: number;
  totalSalesCount: number;
  // Financial balances
  pendingBalance: number;
  availableBalance: number;
  totalPayouts: number;
  payoutMethod: 'mpesa' | 'bank';
  payoutAccount: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  image: string;
  parentId?: string;
  description?: string;
  featured?: boolean;
  commissionRate?: number;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo: string;
  isOfficial?: boolean;
}

export interface ProductVariant {
  id: string;
  sku: string;
  attributes: Record<string, string>; // e.g. { "RAM/Storage": "8GB / 256GB", "Color": "Titanium Gray" }
  price: number;
  discountPrice?: number;
  stock: number;
  image?: string;
}

export interface Product {
  id: string;
  sellerId: string;
  name: string;
  slug: string;
  sku: string;
  shortDescription: string;
  description: string;
  categoryId: string;
  brandId: string;
  price: number;
  discountPrice?: number;
  stock: number; // aggregate of variants or standalone
  images: string[];
  variants?: ProductVariant[];
  status: ProductStatus;
  rating: number;
  reviewsCount: number;
  isFlashSale?: boolean;
  flashSaleEndsAt?: string;
  isFeatured?: boolean;
  warranty: string;
  condition: 'Brand New' | 'Refurbished' | 'Open Box';
  returnPolicy: string;
  weightKg: number;
  createdAt: string;
}

export interface CartItem {
  id: string;
  productId: string;
  variantId?: string;
  sellerId: string;
  name: string;
  productImage: string;
  variantText?: string;
  price: number;
  quantity: number;
  maxStock: number;
}

export interface DeliveryAddress {
  fullName: string;
  phone: string;
  county: string;
  town: string;
  streetAddress: string;
  deliveryInstructions?: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  variantId?: string;
  variantText?: string;
  sku: string;
  price: number;
  quantity: number;
  subtotal: number;
  sellerCommission: number;
}

export interface SellerSubOrder {
  id: string;
  masterOrderId: string;
  sellerId: string;
  sellerName: string;
  subOrderNumber: string;
  items: OrderItem[];
  subtotal: number;
  commissionTotal: number;
  sellerNetTotal: number;
  deliveryFee: number;
  status: OrderStatus;
  trackingNumber?: string;
  dispatchedAt?: string;
  deliveredAt?: string;
  createdAt: string;
}

export interface MasterOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryAddress: DeliveryAddress;
  deliveryType: 'home_delivery' | 'pickup_station';
  pickupStationName?: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentReference?: string;
  subtotal: number;
  discountTotal: number;
  couponCode?: string;
  deliveryFeeTotal: number;
  grandTotal: number;
  status: OrderStatus;
  sellerSubOrders: SellerSubOrder[];
  createdAt: string;
}

export interface FinancialLedgerEntry {
  id: string;
  transactionRef: string;
  type: 'CUSTOMER_PAYMENT' | 'SELLER_CREDIT' | 'PLATFORM_COMMISSION' | 'DELIVERY_FEE' | 'REFUND' | 'SELLER_PAYOUT';
  orderNumber?: string;
  sellerId?: string;
  sellerName?: string;
  debit: number;
  credit: number;
  balanceAfter: number;
  balance?: number;
  notes: string;
  description?: string;
  createdAt: string;
}

export interface SellerPayoutRequest {
  id: string;
  payoutNumber: string;
  sellerId: string;
  sellerName: string;
  amount: number;
  method: 'mpesa' | 'bank';
  accountDetails: string;
  status: 'pending' | 'approved' | 'processed' | 'rejected';
  rejectionReason?: string;
  transactionRef?: string;
  createdAt: string;
  processedAt?: string;
}

export interface Review {
  id: string;
  productId: string;
  customerName: string;
  rating: number;
  comment: string;
  verifiedPurchase: boolean;
  date: string;
}

export interface Coupon {
  id?: string;
  code: string;
  type: 'percentage' | 'fixed';
  discountType?: 'percentage' | 'fixed';
  value: number; // e.g. 10 for 10% or 500 for KSh 500
  minOrderValue: number;
  minOrderAmount?: number;
  maxDiscount?: number;
  expiresAt: string;
  usageLimit?: number;
  timesUsed?: number;
  isActive?: boolean;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
  timestamp: string;
}

export interface DeliveryZone {
  id?: string;
  county: string;
  towns: string[];
  homeDeliveryFee: number;
  pickupStationFee: number;
  estimatedDays: string;
  pickupStations: string[];
}
