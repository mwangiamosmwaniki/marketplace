import React, { useState } from 'react';
import { useMarketplace } from '../../context/MarketplaceContext';
import {
  Package,
  Heart,
  User,
  MapPin,
  RotateCcw,
  CreditCard,
  ShieldCheck,
  Truck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  ShoppingCart,
  Trash2,
  ArrowRight,
  ExternalLink,
  Phone,
  Mail,
  ChevronRight,
  Plus,
  LifeBuoy,
  MessageSquare,
  Send,
  Check,
} from 'lucide-react';
import { MasterOrder, OrderStatus, DeliveryAddress, SupportTicket } from '../../types';

interface CustomerPortalProps {
  onViewProduct?: (productId: string) => void;
  onContinueShopping?: () => void;
}

export const CustomerPortal: React.FC<CustomerPortalProps> = ({
  onViewProduct,
  onContinueShopping,
}) => {
  const {
    authUser,
    orders,
    wishlist,
    products,
    formatKSh,
    cancelOrder,
    addToCart,
    toggleWishlist,
    addresses,
    addAddress,
    deleteAddress,
    setDefaultAddress,
    returns,
    requestReturn,
    supportTickets,
    createSupportTicket,
    replySupportTicket,
  } = useMarketplace();

  const [activeTab, setActiveTab] = useState<
    'orders' | 'wishlist' | 'addresses' | 'returns' | 'support' | 'payments' | 'security'
  >('orders');
  const [selectedOrder, setSelectedOrder] = useState<MasterOrder | null>(null);
  const [returnModalSubOrder, setReturnModalSubOrder] = useState<{
    orderId: string;
    subOrderId: string;
  } | null>(null);
  const [returnReason, setReturnReason] = useState('Item defective / not turning on');
  const [returnSuccess, setReturnSuccess] = useState(false);

  // Address modal form state
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [newAddress, setNewAddress] = useState<Omit<DeliveryAddress, 'id'>>({
    fullName: authUser?.name || 'Jane Wambui',
    phone: authUser?.phone || '+254 712 345678',
    county: 'Nairobi',
    town: 'Westlands',
    streetAddress: '',
    deliveryInstructions: '',
    isDefault: false,
  });

  // Support ticket state
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [newTicketSubject, setNewTicketSubject] = useState('');
  const [newTicketCategory, setNewTicketCategory] = useState<SupportTicket['category']>('orders');
  const [newTicketPriority, setNewTicketPriority] = useState<SupportTicket['priority']>('medium');
  const [newTicketMessage, setNewTicketMessage] = useState('');
  const [ticketReplyText, setTicketReplyText] = useState('');

  const wishlistProducts = products.filter((p) => wishlist.includes(p.id));

  const handleReturnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (returnModalSubOrder) {
      const order = orders.find((o) => o.id === returnModalSubOrder.orderId);
      const sub = order?.sellerSubOrders.find((s) => s.id === returnModalSubOrder.subOrderId);
      const prodId = sub?.items[0]?.productId || '';
      requestReturn(returnModalSubOrder.orderId, returnModalSubOrder.subOrderId, prodId, returnReason);
    }
    setReturnSuccess(true);
    setTimeout(() => {
      setReturnSuccess(false);
      setReturnModalSubOrder(null);
    }, 1800);
  };

  const handleCreateAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddress.streetAddress || !newAddress.town) return;
    addAddress({
      id: `addr-${Date.now()}`,
      ...newAddress,
    });
    setIsAddressModalOpen(false);
    setNewAddress({
      fullName: authUser?.name || 'Jane Wambui',
      phone: authUser?.phone || '+254 712 345678',
      county: 'Nairobi',
      town: 'Westlands',
      streetAddress: '',
      deliveryInstructions: '',
      isDefault: false,
    });
  };

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicketSubject.trim() || !newTicketMessage.trim()) return;
    createSupportTicket(
      {
        userId: authUser?.id || 'cust-1',
        userName: authUser?.name || 'Jane Wambui',
        userEmail: authUser?.email || 'jane.wambui@example.com',
        userRole: 'customer',
        subject: newTicketSubject,
        category: newTicketCategory,
        priority: newTicketPriority,
        status: 'open',
      },
      newTicketMessage
    );
    setNewTicketSubject('');
    setNewTicketMessage('');
    setIsTicketModalOpen(false);
  };

  const handleSendTicketReply = (ticketId: string) => {
    if (!ticketReplyText.trim()) return;
    replySupportTicket(ticketId, ticketReplyText);
    setTicketReplyText('');
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'delivered':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'dispatched':
      case 'out_for_delivery':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'processing':
      case 'ready_for_dispatch':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-neutral-100 text-neutral-800 border-neutral-200';
    }
  };

  return (
    <div id="customer-portal-container" className="max-w-7xl mx-auto px-4 py-6">
      {/* 1. Header Banner */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-xs mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-amber-500 text-white font-bold text-xl flex items-center justify-center shadow-xs">
            {authUser?.name ? authUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'CU'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900">{authUser?.name || 'Customer Account'}</h1>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-200">
                Verified Buyer
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              {authUser?.email || 'customer@allsales.ke'} • {authUser?.phone || '+254 712 345678'} • Nairobi, Kenya
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right text-xs hidden sm:block">
            <span className="text-neutral-400 block">Active Orders</span>
            <span className="text-base font-extrabold text-neutral-900">
              {orders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled').length} in transit
            </span>
          </div>
          {onContinueShopping && (
            <button
              onClick={onContinueShopping}
              className="bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-xs py-2 px-4 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Continue Shopping</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Main Layout with Left Sidebar & Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Sidebar Navigation (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs">
            <div className="p-3.5 bg-neutral-50 border-b border-neutral-200 text-xs font-bold text-neutral-700 uppercase tracking-wider">
              Customer Account
            </div>

            <nav className="p-2 space-y-1 text-xs font-semibold">
              <button
                onClick={() => {
                  setActiveTab('orders');
                  setSelectedOrder(null);
                }}
                className={`w-full flex items-center justify-between p-2.5 rounded-lg transition-colors text-left ${
                  activeTab === 'orders'
                    ? 'bg-amber-50 text-amber-700 font-bold'
                    : 'text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Package className="w-4 h-4 text-amber-600" />
                  <span>My Orders & Tracking</span>
                </div>
                <span className="text-[10px] bg-neutral-200 text-neutral-800 font-bold px-1.5 py-0.5 rounded-full">
                  {orders.length}
                </span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('wishlist');
                  setSelectedOrder(null);
                }}
                className={`w-full flex items-center justify-between p-2.5 rounded-lg transition-colors text-left ${
                  activeTab === 'wishlist'
                    ? 'bg-amber-50 text-amber-700 font-bold'
                    : 'text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Heart className="w-4 h-4 text-red-500" />
                  <span>Saved Wishlist</span>
                </div>
                <span className="text-[10px] bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded-full">
                  {wishlist.length}
                </span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('addresses');
                  setSelectedOrder(null);
                }}
                className={`w-full flex items-center justify-between p-2.5 rounded-lg transition-colors text-left ${
                  activeTab === 'addresses'
                    ? 'bg-amber-50 text-amber-700 font-bold'
                    : 'text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <span>Delivery Addresses</span>
                </div>
                <span className="text-[10px] text-neutral-400">{addresses.length} saved</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('returns');
                  setSelectedOrder(null);
                }}
                className={`w-full flex items-center justify-between p-2.5 rounded-lg transition-colors text-left ${
                  activeTab === 'returns'
                    ? 'bg-amber-50 text-amber-700 font-bold'
                    : 'text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <RotateCcw className="w-4 h-4 text-blue-600" />
                  <span>Returns & Refunds</span>
                </div>
                <span className="text-[10px] text-neutral-400">{returns.length}</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('support');
                  setSelectedOrder(null);
                }}
                className={`w-full flex items-center justify-between p-2.5 rounded-lg transition-colors text-left ${
                  activeTab === 'support'
                    ? 'bg-amber-50 text-amber-700 font-bold'
                    : 'text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <LifeBuoy className="w-4 h-4 text-indigo-600" />
                  <span>Support Desk</span>
                </div>
                <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.5 rounded-full">
                  {supportTickets.length}
                </span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('payments');
                  setSelectedOrder(null);
                }}
                className={`w-full flex items-center justify-between p-2.5 rounded-lg transition-colors text-left ${
                  activeTab === 'payments'
                    ? 'bg-amber-50 text-amber-700 font-bold'
                    : 'text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <CreditCard className="w-4 h-4 text-purple-600" />
                  <span>Payment Preferences</span>
                </div>
              </button>

              <button
                onClick={() => {
                  setActiveTab('security');
                  setSelectedOrder(null);
                }}
                className={`w-full flex items-center justify-between p-2.5 rounded-lg transition-colors text-left ${
                  activeTab === 'security'
                    ? 'bg-amber-50 text-amber-700 font-bold'
                    : 'text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-neutral-600" />
                  <span>Security & Profile</span>
                </div>
              </button>
            </nav>
          </div>

          {/* Quick Help Card */}
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 shadow-xs text-xs">
            <h4 className="font-bold text-amber-900 mb-1">Need help with an order?</h4>
            <p className="text-amber-800 text-[11px] leading-relaxed mb-3">
              Allsales Customer Protection guarantees 100% genuine products with 15-day return policy and instant M-Pesa refunds.
            </p>
            <div className="flex items-center gap-2 text-[11px] font-bold text-amber-900">
              <Phone className="w-3.5 h-3.5" />
              <span>0700 000 000 (Toll Free)</span>
            </div>
          </div>
        </div>

        {/* Right Main Content Area (9 cols) */}
        <div className="lg:col-span-9 space-y-4">
          {/* TAB 1: ORDERS & TRACKING */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              {selectedOrder ? (
                /* Order Detailed Inspection View */
                <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-xs">
                  <div className="flex items-center justify-between border-b border-neutral-200 pb-3 mb-4">
                    <button
                      onClick={() => setSelectedOrder(null)}
                      className="text-xs text-amber-600 hover:text-amber-700 font-bold flex items-center gap-1"
                    >
                      ← Back to All Orders
                    </button>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider border ${getStatusBadge(
                        selectedOrder.status
                      )}`}
                    >
                      {selectedOrder.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 mb-4 bg-neutral-50 p-3 rounded-lg text-xs">
                    <div>
                      <span className="text-neutral-500 block">Order Reference</span>
                      <span className="font-mono font-bold text-neutral-900">
                        {selectedOrder.orderNumber}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block">Date Placed</span>
                      <span className="font-semibold text-neutral-800">
                        {new Date(selectedOrder.createdAt).toLocaleDateString('en-KE', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block">Payment Method</span>
                      <span className="font-bold text-neutral-800 uppercase">
                        {selectedOrder.paymentMethod === 'mpesa_stk'
                          ? 'M-Pesa Express'
                          : selectedOrder.paymentMethod}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block">Grand Total</span>
                      <span className="font-extrabold text-amber-600">
                        {formatKSh(selectedOrder.grandTotal)}
                      </span>
                    </div>
                  </div>

                  {/* Delivery Location */}
                  <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 mb-6 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-neutral-800 mb-1">
                      <Truck className="w-4 h-4 text-amber-600" />
                      <span>Delivery Information:</span>
                    </div>
                    <p className="text-neutral-600">
                      Recipient: <span className="font-semibold text-neutral-900">{selectedOrder.deliveryAddress.fullName}</span> ({selectedOrder.deliveryAddress.phone})
                    </p>
                    <p className="text-neutral-600 mt-0.5">
                      {selectedOrder.deliveryAddress.streetAddress}, {selectedOrder.deliveryAddress.town}, {selectedOrder.deliveryAddress.county}
                    </p>
                    {selectedOrder.pickupStationName && (
                      <p className="text-blue-700 font-medium mt-1">
                        Pickup Hub: {selectedOrder.pickupStationName}
                      </p>
                    )}
                  </div>

                  {/* Seller Sub-Orders breakdown */}
                  <div className="space-y-4">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-neutral-500">
                      Multi-Vendor Packages ({selectedOrder.sellerSubOrders.length})
                    </h4>

                    {selectedOrder.sellerSubOrders.map((sub) => (
                      <div
                        key={sub.id}
                        className="border border-neutral-200 rounded-lg p-4 bg-white shadow-2xs space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-2.5 text-xs">
                          <div>
                            <span className="font-bold text-neutral-900">{sub.sellerName}</span>
                            <span className="text-[11px] text-neutral-400 block font-mono">
                              Package ID: {sub.subOrderNumber}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${getStatusBadge(
                                sub.status
                              )}`}
                            >
                              {sub.status.replace(/_/g, ' ')}
                            </span>
                            {sub.status === 'delivered' && (
                              <button
                                onClick={() =>
                                  setReturnModalSubOrder({
                                    orderId: selectedOrder.id,
                                    subOrderId: sub.id,
                                  })
                                }
                                className="text-[11px] text-blue-600 hover:underline font-semibold"
                              >
                                Request Return
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Items in Sub Order */}
                        <div className="space-y-2">
                          {sub.items.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs py-1">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded bg-neutral-100 overflow-hidden border border-neutral-200 flex-shrink-0">
                                  <img
                                    src={item.productImage}
                                    alt={item.productName}
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                                <div>
                                  <p
                                    onClick={() => onViewProduct && onViewProduct(item.productId)}
                                    className="font-bold text-neutral-800 hover:text-amber-600 cursor-pointer line-clamp-1"
                                  >
                                    {item.productName}
                                  </p>
                                  {item.variantText && (
                                    <p className="text-[11px] text-neutral-500">
                                      {item.variantText}
                                    </p>
                                  )}
                                  <p className="text-[11px] text-neutral-400">Qty: {item.quantity}</p>
                                </div>
                              </div>
                              <span className="font-bold text-neutral-900">
                                {formatKSh(item.price * item.quantity)}
                              </span>
                            </div>
                          ))}
                        </div>

                        {sub.trackingNumber && (
                          <div className="bg-neutral-50 p-2 rounded text-[11px] text-neutral-600 flex items-center justify-between">
                            <span>Courier Tracking: <strong className="font-mono text-neutral-800">{sub.trackingNumber}</strong></span>
                            <span className="text-emerald-600 font-semibold">Live GPS Active</span>
                          </div>
                        )}

                        <div className="mt-2 pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px]">
                          <span className="text-neutral-500">Allsales 7-15 Day Protection Guarantee</span>
                          <button
                            onClick={() =>
                              setReturnModalSubOrder({
                                orderId: selectedOrder.id,
                                subOrderId: sub.id,
                              })
                            }
                            className="text-amber-700 hover:text-amber-800 flex items-center gap-1 font-semibold"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Request Return & Refund</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Orders List */
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-neutral-200">
                    <h3 className="font-bold text-sm text-neutral-900">Purchase History</h3>
                    <span className="text-xs text-neutral-500">{orders.length} orders found</span>
                  </div>

                  {orders.length === 0 ? (
                    <div className="bg-white rounded-xl border border-neutral-200 p-12 text-center shadow-xs">
                      <Package className="w-12 h-12 text-neutral-300 mx-auto mb-2" />
                      <h4 className="font-bold text-sm text-neutral-800">No orders placed yet</h4>
                      <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                        Explore Allsales's official stores, flash sales, and top-rated electronics.
                      </p>
                      {onContinueShopping && (
                        <button
                          onClick={onContinueShopping}
                          className="mt-4 px-4 py-2 bg-amber-500 text-white font-bold text-xs rounded-lg hover:bg-amber-600"
                        >
                          Start Shopping
                        </button>
                      )}
                    </div>
                  ) : (
                    orders.map((order) => (
                      <div
                        key={order.id}
                        className="bg-white rounded-xl border border-neutral-200 p-4 shadow-xs hover:border-amber-400 transition-colors"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-3 mb-3 text-xs">
                          <div>
                            <span className="font-mono font-bold text-neutral-900 text-sm">
                              {order.orderNumber}
                            </span>
                            <span className="text-[11px] text-neutral-400 block mt-0.5">
                              {new Date(order.createdAt).toLocaleDateString('en-KE', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${getStatusBadge(
                                order.status
                              )}`}
                            >
                              {order.status.replace(/_/g, ' ')}
                            </span>
                            <button
                              onClick={() => setSelectedOrder(order)}
                              className="px-2.5 py-1 bg-neutral-100 hover:bg-amber-100 text-neutral-800 hover:text-amber-800 rounded font-semibold text-xs transition-colors flex items-center gap-1"
                            >
                              <span>Details</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Items preview */}
                        <div className="space-y-2 mb-3">
                          {order.sellerSubOrders.flatMap((sub) => sub.items).slice(0, 3).map((item, i) => (
                            <div key={i} className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded bg-neutral-50 overflow-hidden border border-neutral-200 flex-shrink-0">
                                  <img
                                    src={item.productImage}
                                    alt={item.productName}
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                                <span className="font-medium text-neutral-800 line-clamp-1">
                                  {item.productName}
                                </span>
                              </div>
                              <span className="text-neutral-500 font-medium">x{item.quantity}</span>
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center justify-between border-t border-neutral-100 pt-2 text-xs">
                          <span className="text-neutral-500">
                            {order.sellerSubOrders.length} packages • {order.paymentMethod.replace('_', ' ').toUpperCase()}
                          </span>
                          <span className="font-extrabold text-neutral-900 text-sm">
                            {formatKSh(order.grandTotal)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SAVED WISHLIST */}
          {activeTab === 'wishlist' && (
            <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                <div>
                  <h3 className="font-bold text-sm text-neutral-900">My Saved Wishlist</h3>
                  <p className="text-xs text-neutral-500">
                    Items you saved for later purchase ({wishlistProducts.length} items)
                  </p>
                </div>
              </div>

              {wishlistProducts.length === 0 ? (
                <div className="py-12 text-center">
                  <Heart className="w-12 h-12 text-neutral-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-neutral-700">Your wishlist is empty</p>
                  <p className="text-xs text-neutral-400 mt-1">
                    Click the heart icon on any product in the storefront to save it here.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {wishlistProducts.map((p) => (
                    <div
                      key={p.id}
                      className="border border-neutral-200 rounded-lg p-3 hover:border-amber-400 transition-colors flex flex-col justify-between"
                    >
                      <div>
                        <div className="relative aspect-square rounded-md overflow-hidden bg-neutral-100 mb-2">
                          <img
                            src={p.images[0]}
                            alt={p.name}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <button
                            onClick={() => toggleWishlist(p.id)}
                            className="absolute top-2 right-2 p-1.5 bg-white/90 hover:bg-white text-red-500 rounded-full shadow-xs"
                            title="Remove from wishlist"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <h4
                          onClick={() => onViewProduct && onViewProduct(p.id)}
                          className="font-bold text-xs text-neutral-900 hover:text-amber-600 cursor-pointer line-clamp-2"
                        >
                          {p.name}
                        </h4>
                        <div className="mt-1 flex items-baseline gap-2">
                          <span className="font-extrabold text-sm text-neutral-900">
                            {formatKSh(p.discountPrice || p.price)}
                          </span>
                          {p.discountPrice && (
                            <span className="text-neutral-400 line-through text-xs">
                              {formatKSh(p.price)}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => addToCart(p)}
                        className="mt-3 w-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs py-1.5 rounded flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>Add to Cart</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ADDRESSES */}
          {activeTab === 'addresses' && (
            <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                <div>
                  <h3 className="font-bold text-sm text-neutral-900">Saved Delivery Addresses</h3>
                  <p className="text-xs text-neutral-500">
                    Manage destination addresses for fast 1-click checkout
                  </p>
                </div>
                <button
                  onClick={() => setIsAddressModalOpen(true)}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add New Address</span>
                </button>
              </div>

              {addresses.length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-500">
                  <MapPin className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                  No delivery addresses saved yet. Click "Add New Address" above.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {addresses.map((addr) => (
                    <div
                      key={addr.id}
                      className={`p-4 rounded-xl border text-xs relative flex flex-col justify-between ${
                        addr.isDefault
                          ? 'border-amber-500 bg-amber-50/40'
                          : 'border-neutral-200 bg-white'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <h4 className="font-bold text-neutral-900 text-sm">{addr.fullName}</h4>
                          {addr.isDefault ? (
                            <span className="text-[10px] bg-amber-500 text-white font-bold px-2 py-0.5 rounded">
                              Default
                            </span>
                          ) : (
                            <button
                              onClick={() => addr.id && setDefaultAddress(addr.id)}
                              className="text-[11px] text-amber-700 hover:underline font-semibold"
                            >
                              Set as Default
                            </button>
                          )}
                        </div>
                        <p className="text-neutral-700 font-medium">{addr.streetAddress}</p>
                        <p className="text-neutral-600">{addr.town}, {addr.county} County</p>
                        <p className="text-neutral-500 mt-1 font-mono">{addr.phone}</p>
                        {addr.deliveryInstructions && (
                          <p className="text-[11px] text-neutral-400 italic mt-1">
                            Note: {addr.deliveryInstructions}
                          </p>
                        )}
                      </div>

                      <div className="mt-3 pt-2 border-t border-neutral-100 flex justify-end">
                        <button
                          onClick={() => addr.id && deleteAddress(addr.id)}
                          className="text-neutral-400 hover:text-red-600 p-1 rounded hover:bg-neutral-100 transition-colors"
                          title="Delete Address"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: RETURNS & REFUNDS */}
          {activeTab === 'returns' && (
            <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-xs space-y-4">
              <div className="border-b border-neutral-200 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-neutral-900">Returns & Refund Claims</h3>
                  <p className="text-xs text-neutral-500">
                    Track 15-day return requests and automated M-Pesa reversal vouchers
                  </p>
                </div>
              </div>

              {returns.length === 0 ? (
                <div className="py-10 text-center text-xs text-neutral-500">
                  <RotateCcw className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                  <p className="font-bold text-neutral-700">No return requests active</p>
                  <p className="text-neutral-400 mt-0.5">
                    You can request a return from the "My Orders" tab on any delivered package.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {returns.map((ret) => {
                    const statusColors: Record<string, string> = {
                      pending_review: 'bg-amber-100 text-amber-800 border-amber-200',
                      approved: 'bg-blue-100 text-blue-800 border-blue-200',
                      item_received: 'bg-purple-100 text-purple-800 border-purple-200',
                      refunded: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                      rejected: 'bg-red-100 text-red-800 border-red-200',
                    };

                    return (
                      <div
                        key={ret.id}
                        className="border border-neutral-200 rounded-xl p-4 bg-white text-xs space-y-2.5 shadow-xs"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold font-mono text-neutral-900 text-sm">
                              {ret.returnNumber || ret.id}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                                statusColors[ret.status] || 'bg-neutral-100 text-neutral-800 border-neutral-200'
                              }`}
                            >
                              {ret.status.replace('_', ' ')}
                            </span>
                          </div>
                          <span className="font-bold text-neutral-900 text-sm">
                            {formatKSh(ret.price)}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          {ret.productImage && (
                            <img
                              src={ret.productImage}
                              alt={ret.productName}
                              className="w-12 h-12 object-cover rounded-lg border border-neutral-200"
                              referrerPolicy="no-referrer"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-neutral-800 line-clamp-1">
                              {ret.productName}
                            </p>
                            <p className="text-neutral-500 text-[11px] mt-0.5">
                              Reason: <span className="text-neutral-700">{ret.reason}</span>
                            </p>
                            <p className="text-neutral-400 text-[10px] font-mono mt-0.5">
                              Order Ref: {ret.orderNumber || ret.orderId} • Package: {ret.subOrderId}
                            </p>
                          </div>
                        </div>

                        {ret.status === 'refunded' && (
                          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-[11px] text-emerald-800 flex items-center justify-between">
                            <span>
                              M-Pesa Reversal Voucher settled to registered customer phone
                            </span>
                            <span className="font-bold text-emerald-700">Settled</span>
                          </div>
                        )}

                        {ret.status === 'rejected' && ret.rejectionReason && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-[11px] text-red-800">
                            Reason for rejection: {ret.rejectionReason}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4.5: SUPPORT DESK */}
          {activeTab === 'support' && (
            <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                <div>
                  <h3 className="font-bold text-sm text-neutral-900">Customer Support Desk</h3>
                  <p className="text-xs text-neutral-500">
                    Live assistance for Daraja M-Pesa payments, deliveries & warranty claims
                  </p>
                </div>
                <button
                  onClick={() => setIsTicketModalOpen(true)}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Open New Ticket</span>
                </button>
              </div>

              {supportTickets.length === 0 ? (
                <div className="py-10 text-center text-xs text-neutral-500">
                  <LifeBuoy className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                  <p className="font-bold text-neutral-700">No support tickets found</p>
                  <p className="text-neutral-400 mt-0.5">Need help with an order? Open a ticket above.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  {/* Ticket List (5 cols) */}
                  <div className="lg:col-span-5 space-y-2">
                    {supportTickets.map((ticket) => {
                      const isSelected = selectedTicketId === ticket.id;
                      const statusColor: Record<string, string> = {
                        open: 'bg-blue-100 text-blue-800',
                        in_progress: 'bg-amber-100 text-amber-800',
                        waiting_on_customer: 'bg-purple-100 text-purple-800',
                        resolved: 'bg-emerald-100 text-emerald-800',
                        closed: 'bg-neutral-100 text-neutral-700',
                      };

                      return (
                        <div
                          key={ticket.id}
                          onClick={() => setSelectedTicketId(ticket.id)}
                          className={`p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                            isSelected
                              ? 'border-amber-500 bg-amber-50/50'
                              : 'border-neutral-200 hover:border-neutral-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono font-bold text-neutral-700 text-[11px]">
                              {ticket.id}
                            </span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${statusColor}`}
                            >
                              {ticket.status.replace('_', ' ')}
                            </span>
                          </div>
                          <h4 className="font-bold text-neutral-900 line-clamp-1">{ticket.subject}</h4>
                          <div className="flex items-center justify-between text-[11px] text-neutral-400 mt-1">
                            <span className="capitalize">{ticket.category.replace('_', ' ')}</span>
                            <span>{ticket.messages.length} msg</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Ticket Thread (7 cols) */}
                  <div className="lg:col-span-7 bg-neutral-50 rounded-xl border border-neutral-200 p-4 flex flex-col justify-between min-h-[300px]">
                    {selectedTicketId ? (
                      (() => {
                        const ticket = supportTickets.find((t) => t.id === selectedTicketId);
                        if (!ticket) return null;
                        return (
                          <div className="flex flex-col h-full justify-between space-y-4">
                            <div>
                              <div className="border-b border-neutral-200 pb-2 mb-3">
                                <h4 className="font-bold text-neutral-900 text-sm">
                                  {ticket.subject}
                                </h4>
                                <div className="text-[11px] text-neutral-500 mt-0.5 flex gap-2">
                                  <span>Priority: <strong className="capitalize">{ticket.priority}</strong></span>
                                  <span>•</span>
                                  <span>Status: <strong className="capitalize">{ticket.status.replace('_', ' ')}</strong></span>
                                </div>
                              </div>

                              {/* Messages list */}
                              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                                {ticket.messages.map((m) => {
                                  const isStaff = m.senderRole !== 'customer';
                                  return (
                                    <div
                                      key={m.id}
                                      className={`p-3 rounded-lg text-xs ${
                                        isStaff
                                          ? 'bg-purple-50 border border-purple-200 text-purple-950 ml-4'
                                          : 'bg-white border border-neutral-200 text-neutral-800 mr-4'
                                      }`}
                                    >
                                      <div className="flex justify-between items-center text-[10px] text-neutral-500 mb-1 font-semibold">
                                        <span>{m.senderName} ({m.senderRole})</span>
                                        <span>
                                          {new Date(m.createdAt).toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                          })}
                                        </span>
                                      </div>
                                      <p className="leading-relaxed">{m.message}</p>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Reply box */}
                            <div className="flex gap-2 pt-2 border-t border-neutral-200">
                              <input
                                type="text"
                                placeholder="Type your reply..."
                                value={ticketReplyText}
                                onChange={(e) => setTicketReplyText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSendTicketReply(ticket.id);
                                }}
                                className="flex-1 px-3 py-2 bg-white border border-neutral-300 rounded-lg text-xs"
                              />
                              <button
                                onClick={() => handleSendTicketReply(ticket.id)}
                                className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>Send</span>
                              </button>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="my-auto text-center text-xs text-neutral-400">
                        Select a ticket on the left to view the conversation thread.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: PAYMENTS */}
          {activeTab === 'payments' && (
            <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-xs space-y-4">
              <div className="border-b border-neutral-200 pb-3">
                <h3 className="font-bold text-sm text-neutral-900">Payment Preferences</h3>
                <p className="text-xs text-neutral-500">
                  Safaricom Daraja M-Pesa Express & Card credentials
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-lg border border-emerald-300 bg-emerald-50/60 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-emerald-600 text-white font-bold flex items-center justify-center">
                      M
                    </div>
                    <div>
                      <p className="font-bold text-emerald-950">M-Pesa Express (Primary)</p>
                      <p className="text-emerald-800 text-[11px] font-mono">254712345678</p>
                    </div>
                  </div>
                  <span className="bg-emerald-200 text-emerald-900 font-bold text-[10px] px-2 py-0.5 rounded">
                    Active
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: SECURITY */}
          {activeTab === 'security' && (
            <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-xs space-y-4">
              <div className="border-b border-neutral-200 pb-3">
                <h3 className="font-bold text-sm text-neutral-900">Security & Account Settings</h3>
                <p className="text-xs text-neutral-500">
                  Two-factor authentication, phone verification, and login logs
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 rounded-lg border border-neutral-200 bg-neutral-50">
                  <div>
                    <span className="font-bold text-neutral-800 block">Safaricom SMS 2FA</span>
                    <span className="text-neutral-500 text-[11px]">Require OTP verification before placing large orders</span>
                  </div>
                  <span className="text-emerald-600 font-bold">Enabled</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-neutral-200 bg-neutral-50">
                  <div>
                    <span className="font-bold text-neutral-800 block">Email Notifications</span>
                    <span className="text-neutral-500 text-[11px]">Receive order dispatch tracking updates via email</span>
                  </div>
                  <span className="text-emerald-600 font-bold">Subscribed</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: RETURN REQUEST */}
      {returnModalSubOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-neutral-900 mb-1 flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-amber-600" />
              <span>Request Return & Refund</span>
            </h3>
            <p className="text-xs text-neutral-500 mb-4">
              Allsales guarantees free 7-15 day returns on eligible items. An inspected rider will
              collect the parcel and M-Pesa reversal will be processed immediately upon verification.
            </p>

            {returnSuccess ? (
              <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 border border-emerald-200">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <span>Return ticket submitted successfully! Tracking reference created in Returns tab.</span>
              </div>
            ) : (
              <form onSubmit={handleReturnSubmit} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">
                    Select Return Reason
                  </label>
                  <select
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    className="w-full p-2.5 border border-neutral-300 rounded-lg bg-neutral-50 text-neutral-800"
                  >
                    <option value="Item defective / not turning on">
                      Item defective / not working
                    </option>
                    <option value="Wrong item or color delivered">Wrong item or variation delivered</option>
                    <option value="Physical transit damage">
                      Item physically damaged during delivery
                    </option>
                    <option value="Missing parts / accessories">
                      Missing parts or accessories in box
                    </option>
                    <option value="Changed mind / unopened box">Changed mind (Package unopened)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">
                    Explain the Issue in Detail
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Provide details for logistics pickup & inspection team..."
                    required
                    className="w-full p-2.5 border border-neutral-300 rounded-lg"
                  ></textarea>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => setReturnModalSubOrder(null)}
                    className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-lg font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg shadow-xs"
                  >
                    Submit Return Request
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: ADD DELIVERY ADDRESS */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-neutral-900 mb-1 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-600" />
              <span>Add New Delivery Destination</span>
            </h3>
            <p className="text-xs text-neutral-500 mb-4">
              Enter your residential or office address for rider doorstep dispatch across Kenya.
            </p>

            <form onSubmit={handleCreateAddress} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">Recipient Name</label>
                  <input
                    type="text"
                    required
                    value={newAddress.fullName}
                    onChange={(e) => setNewAddress({ ...newAddress, fullName: e.target.value })}
                    className="w-full p-2.5 border border-neutral-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    required
                    value={newAddress.phone}
                    onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                    className="w-full p-2.5 border border-neutral-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">County</label>
                  <select
                    value={newAddress.county}
                    onChange={(e) => setNewAddress({ ...newAddress, county: e.target.value })}
                    className="w-full p-2.5 border border-neutral-300 rounded-lg bg-neutral-50"
                  >
                    <option value="Nairobi">Nairobi</option>
                    <option value="Kiambu">Kiambu</option>
                    <option value="Mombasa">Mombasa</option>
                    <option value="Nakuru">Nakuru</option>
                    <option value="Kisumu">Kisumu</option>
                    <option value="Machakos">Machakos</option>
                    <option value="Kajiado">Kajiado</option>
                    <option value="Eldoret / Uasin Gishu">Eldoret / Uasin Gishu</option>
                  </select>
                </div>
                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">Town / Area</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Westlands, Kilimani, Thika"
                    value={newAddress.town}
                    onChange={(e) => setNewAddress({ ...newAddress, town: e.target.value })}
                    className="w-full p-2.5 border border-neutral-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-700 font-semibold mb-1">
                  Street Address, Building & House / Apt Number
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mpaka Road, Woodvale Grove, Apt 4B"
                  value={newAddress.streetAddress}
                  onChange={(e) => setNewAddress({ ...newAddress, streetAddress: e.target.value })}
                  className="w-full p-2.5 border border-neutral-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-neutral-700 font-semibold mb-1">
                  Rider Delivery Instructions (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ring bell at main black gate, leave with security"
                  value={newAddress.deliveryInstructions}
                  onChange={(e) =>
                    setNewAddress({ ...newAddress, deliveryInstructions: e.target.value })
                  }
                  className="w-full p-2.5 border border-neutral-300 rounded-lg"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="modal-default-address"
                  checked={newAddress.isDefault}
                  onChange={(e) => setNewAddress({ ...newAddress, isDefault: e.target.checked })}
                  className="rounded text-amber-500 focus:ring-amber-400"
                />
                <label htmlFor="modal-default-address" className="text-neutral-700 font-medium">
                  Make this my default delivery address
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsAddressModalOpen(false)}
                  className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs"
                >
                  Save Address
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: OPEN SUPPORT TICKET */}
      {isTicketModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-neutral-900 mb-1 flex items-center gap-2">
              <LifeBuoy className="w-5 h-5 text-indigo-600" />
              <span>Open Customer Support Ticket</span>
            </h3>
            <p className="text-xs text-neutral-500 mb-4">
              Allsales 24/7 dedicated support team will review and respond promptly.
            </p>

            <form onSubmit={handleCreateTicket} className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-700 font-semibold mb-1">Issue Category</label>
                <select
                  value={newTicketCategory}
                  onChange={(e) =>
                    setNewTicketCategory(e.target.value as SupportTicket['category'])
                  }
                  className="w-full p-2.5 border border-neutral-300 rounded-lg bg-neutral-50"
                >
                  <option value="orders">Order & Delivery Inquiry</option>
                  <option value="payments">Daraja M-Pesa Payment Issue</option>
                  <option value="returns">Return & Refund Processing</option>
                  <option value="technical">Account or Technical Issue</option>
                  <option value="general">General Support</option>
                </select>
              </div>

              <div>
                <label className="block text-neutral-700 font-semibold mb-1">Priority</label>
                <select
                  value={newTicketPriority}
                  onChange={(e) =>
                    setNewTicketPriority(e.target.value as SupportTicket['priority'])
                  }
                  className="w-full p-2.5 border border-neutral-300 rounded-lg bg-neutral-50"
                >
                  <option value="low">Low (General question)</option>
                  <option value="medium">Medium (Standard tracking/order)</option>
                  <option value="high">High (Urgent payment / missing item)</option>
                </select>
              </div>

              <div>
                <label className="block text-neutral-700 font-semibold mb-1">Subject</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. M-Pesa debited but order still processing"
                  value={newTicketSubject}
                  onChange={(e) => setNewTicketSubject(e.target.value)}
                  className="w-full p-2.5 border border-neutral-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-neutral-700 font-semibold mb-1">Message</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Please describe the issue with any transaction codes or order numbers..."
                  value={newTicketMessage}
                  onChange={(e) => setNewTicketMessage(e.target.value)}
                  className="w-full p-2.5 border border-neutral-300 rounded-lg"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsTicketModalOpen(false)}
                  className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-xs"
                >
                  Submit Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
