import React, { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { MasterOrder, OrderStatus } from '../../types';

interface CustomerPortalProps {
  onViewProduct?: (productId: string) => void;
  onContinueShopping?: () => void;
  requestedTab?: 'orders' | 'wishlist' | 'addresses' | 'returns' | 'payments' | 'security';
}

export const CustomerPortal: React.FC<CustomerPortalProps> = ({
  onViewProduct,
  onContinueShopping,
  requestedTab,
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
    updateAddress,
    deleteAddress,
    setDefaultAddress,
    returns,
    requestReturn,
    cancelReturn,
  } = useMarketplace();

  const [activeTab, setActiveTab] = useState<
    'orders' | 'wishlist' | 'addresses' | 'returns' | 'payments' | 'security'
  >('orders');

  useEffect(() => {
    if (requestedTab) setActiveTab(requestedTab);
  }, [requestedTab]);
  const [selectedOrder, setSelectedOrder] = useState<MasterOrder | null>(null);
  const [returnModalSubOrder, setReturnModalSubOrder] = useState<{
    orderId: string;
    subOrderId: string;
  } | null>(null);
  const [returnReason, setReturnReason] = useState('Item defective / not turning on');
  const [returnSuccess, setReturnSuccess] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState({
    fullName: authUser?.name || '',
    phone: authUser?.phone || '',
    county: 'Nairobi',
    town: 'Westlands',
    streetAddress: '',
    deliveryInstructions: '',
  });

  const wishlistProducts = products.filter((p) => wishlist.includes(p.id));
  const customerOrders = orders.filter((order) => order.customerId === authUser?.id);
  const customerReturns = returns.filter((item) => item.customerId === authUser?.id);

  const handleReturnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnModalSubOrder) return;
    const order = customerOrders.find((item) => item.id === returnModalSubOrder.orderId);
    const subOrder = order?.sellerSubOrders.find((item) => item.id === returnModalSubOrder.subOrderId);
    const productId = subOrder?.items[0]?.productId;
    if (!productId) return;
    const result = requestReturn(returnModalSubOrder.orderId, returnModalSubOrder.subOrderId, productId, returnReason);
    setReturnSuccess(result.success);
    if (result.success) {
      setTimeout(() => {
        setReturnSuccess(false);
        setReturnModalSubOrder(null);
      }, 1800);
    }
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
    <div id="customer-portal-container" className="px-4 py-6">
      <div className="space-y-4">
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
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Orders List */
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-neutral-200">
                    <h3 className="font-bold text-sm text-neutral-900">Purchase History</h3>
                    <span className="text-xs text-neutral-500">{customerOrders.length} orders found</span>
                  </div>

                  {customerOrders.length === 0 ? (
                    <div className="bg-white rounded-xl border border-neutral-200 p-12 text-center shadow-xs">
                      <Package className="w-12 h-12 text-neutral-300 mx-auto mb-2" />
                      <h4 className="font-bold text-sm text-neutral-800">No orders placed yet</h4>
                      <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                        Explore KESALES official stores, flash sales, and top-rated electronics.
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
                    customerOrders.map((order) => (
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
                <button onClick={() => setShowAddressForm((value) => !value)} className="bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-xs px-3 py-2 rounded-lg">Add address</button>
              </div>

              {showAddressForm && (
                <form
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3 border border-amber-200 bg-amber-50/40 rounded-lg p-4 text-xs"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!newAddress.fullName.trim() || !newAddress.phone.trim() || !newAddress.streetAddress.trim()) return;
                    addAddress({ ...newAddress, isDefault: addresses.length === 0 });
                    setShowAddressForm(false);
                    setNewAddress((current) => ({ ...current, streetAddress: '', deliveryInstructions: '' }));
                  }}
                >
                  {(['fullName', 'phone', 'town', 'streetAddress', 'deliveryInstructions'] as const).map((field) => (
                    <label key={field} className="font-semibold text-neutral-600">
                      <span className="block mb-1 capitalize">{field === 'streetAddress' ? 'Street address' : field.replace(/([A-Z])/g, ' $1')}</span>
                      <input required={field !== 'deliveryInstructions'} value={newAddress[field]} onChange={(event) => setNewAddress((current) => ({ ...current, [field]: event.target.value }))} className="w-full border border-neutral-300 rounded px-2.5 py-2 bg-white" />
                    </label>
                  ))}
                  <label className="font-semibold text-neutral-600">
                    <span className="block mb-1">County</span>
                    <input value={newAddress.county} onChange={(event) => setNewAddress((current) => ({ ...current, county: event.target.value }))} className="w-full border border-neutral-300 rounded px-2.5 py-2 bg-white" />
                  </label>
                  <div className="sm:col-span-2 flex justify-end gap-2">
                    <button type="button" onClick={() => setShowAddressForm(false)} className="px-3 py-2 text-neutral-600 font-bold">Cancel</button>
                    <button type="submit" className="px-3 py-2 bg-neutral-900 text-white rounded font-bold">Save address</button>
                  </div>
                </form>
              )}

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
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className={`p-4 rounded-xl border text-xs relative ${
                      addr.isDefault
                        ? 'border-amber-500 bg-amber-50/40'
                        : 'border-neutral-200 bg-white'
                    }`}
                  >
                    {addr.isDefault && (
                      <span className="absolute top-3 right-3 text-[10px] bg-amber-500 text-white font-bold px-2 py-0.5 rounded">
                        Default Address
                      </span>
                    )}
                    <h4 className="font-bold text-neutral-900 text-sm mb-1">{addr.town} address</h4>
                    <p className="font-semibold text-neutral-800">{addr.fullName}</p>
                    <p className="text-neutral-600 mt-0.5">{addr.streetAddress}</p>
                    <p className="text-neutral-600">{addr.town}, {addr.county} County</p>
                    <p className="text-neutral-500 mt-2 font-mono">{addr.phone}</p>
                    <div className="mt-3 flex gap-3 text-[11px] font-bold">
                      {!addr.isDefault && <button onClick={() => addr.id && setDefaultAddress(addr.id)} className="text-amber-700">Set default</button>}
                      <button onClick={() => addr.id && deleteAddress(addr.id)} className="text-red-600">Delete</button>
                      <button onClick={() => addr.id && updateAddress(addr.id, { deliveryInstructions: 'Updated from account' })} className="text-neutral-600">Update note</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: RETURNS & REFUNDS */}
          {activeTab === 'returns' && (
            <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-xs space-y-4">
              <div className="border-b border-neutral-200 pb-3">
                <h3 className="font-bold text-sm text-neutral-900">Returns & Refund Claims</h3>
                <p className="text-xs text-neutral-500">
                  Track 15-day return requests and M-Pesa reversal vouchers
                </p>
              </div>

              {customerReturns.length === 0 ? (
                <div className="border border-dashed border-neutral-300 rounded-lg p-8 text-center text-xs text-neutral-500">No return requests yet.</div>
              ) : customerReturns.map((item) => (
                <div key={item.id} className="border border-neutral-200 rounded-lg p-4 bg-neutral-50 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold font-mono text-neutral-800">{item.returnNumber}</span>
                    <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase">{item.status.replace('_', ' ')}</span>
                  </div>
                  <p className="text-neutral-600">Product: {item.productName}</p>
                  <p className="text-neutral-500 text-[11px]">Reason: {item.reason} • {formatKSh(item.price)}</p>
                  {item.status === 'pending_review' && <button onClick={() => cancelReturn(item.id)} className="text-red-600 font-bold text-[11px]">Cancel return request</button>}
                </div>
              ))}
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
  );
};
