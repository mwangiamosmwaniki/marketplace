import React, { useState } from 'react';
import { useMarketplace } from '../../context/MarketplaceContext';
import {
  X,
  Package,
  Heart,
  User,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  RotateCcw,
  Truck,
  Store,
  ShoppingCart,
  Trash2,
} from 'lucide-react';
import { MasterOrder } from '../../types';

interface CustomerAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewProduct: (productId: string) => void;
}

export const CustomerAccountModal: React.FC<CustomerAccountModalProps> = ({
  isOpen,
  onClose,
  onViewProduct,
}) => {
  const {
    orders,
    wishlist,
    products,
    formatKSh,
    cancelOrder,
    addToCart,
    toggleWishlist,
  } = useMarketplace();

  const [activeTab, setActiveTab] = useState<'orders' | 'wishlist' | 'profile'>('orders');
  const [selectedOrder, setSelectedOrder] = useState<MasterOrder | null>(null);
  const [returnModalSubOrder, setReturnModalSubOrder] = useState<{
    orderId: string;
    subOrderId: string;
  } | null>(null);
  const [returnReason, setReturnReason] = useState('Item defective / not turning on');
  const [returnSuccess, setReturnSuccess] = useState(false);

  if (!isOpen) return null;

  const wishlistProducts = products.filter((p) => wishlist.includes(p.id));

  const handleReturnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setReturnSuccess(true);
    setTimeout(() => {
      setReturnSuccess(false);
      setReturnModalSubOrder(null);
    }, 1800);
  };

  return (
    <div
      id="customer-account-modal-overlay"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
    >
      <div
        id="customer-account-modal-content"
        className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative flex flex-col"
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-amber-600" />
            <h2 className="font-bold text-neutral-900 text-base">Customer Account Hub</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-200 text-neutral-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-neutral-200 px-4 pt-2 gap-4 bg-white text-xs font-semibold">
          <button
            onClick={() => setActiveTab('orders')}
            className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'orders'
                ? 'border-amber-600 text-amber-600 font-bold'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Package className="w-4 h-4" />
            My Orders ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('wishlist')}
            className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'wishlist'
                ? 'border-amber-600 text-amber-600 font-bold'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Heart className="w-4 h-4" />
            Saved Wishlist ({wishlist.length})
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'profile'
                ? 'border-amber-600 text-amber-600 font-bold'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <User className="w-4 h-4" />
            Profile & Addresses
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
          {/* ORDERS TAB */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              {orders.length === 0 ? (
                <div className="text-center py-12 text-neutral-500">
                  <Package className="w-12 h-12 mx-auto text-neutral-300 mb-2" />
                  <p className="text-sm font-medium">You have not placed any orders yet.</p>
                </div>
              ) : (
                orders.map((order) => (
                  <div
                    key={order.id}
                    className="border border-neutral-200 rounded-lg overflow-hidden bg-white shadow-xs"
                  >
                    {/* Order Bar */}
                    <div className="bg-neutral-50 p-3 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div>
                        <span className="font-bold text-neutral-900">{order.orderNumber}</span>
                        <span className="text-neutral-400 mx-2">•</span>
                        <span className="text-neutral-500">
                          {new Date(order.createdAt).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`font-semibold px-2 py-0.5 rounded text-[11px] uppercase ${
                            order.status === 'delivered'
                              ? 'bg-emerald-100 text-emerald-800'
                              : order.status === 'cancelled'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {order.status.replace('_', ' ')}
                        </span>
                        <span className="font-bold text-neutral-900">
                          {formatKSh(order.grandTotal)}
                        </span>
                      </div>
                    </div>

                    {/* Order Details & Sub-Orders */}
                    <div className="p-4 space-y-4">
                      {/* Step Tracker */}
                      <div className="flex items-center justify-between text-[11px] text-neutral-500 max-w-lg mx-auto py-2">
                        <div className="flex flex-col items-center">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 mb-0.5" />
                          <span>Placed</span>
                        </div>
                        <div className="h-0.5 flex-1 bg-emerald-500 mx-1"></div>
                        <div className="flex flex-col items-center">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 mb-0.5" />
                          <span>Confirmed</span>
                        </div>
                        <div className="h-0.5 flex-1 bg-amber-400 mx-1"></div>
                        <div className="flex flex-col items-center">
                          <Truck className="w-4 h-4 text-amber-600 mb-0.5" />
                          <span>Dispatched</span>
                        </div>
                        <div className="h-0.5 flex-1 bg-neutral-200 mx-1"></div>
                        <div className="flex flex-col items-center">
                          <Clock className="w-4 h-4 text-neutral-400 mb-0.5" />
                          <span>Delivered</span>
                        </div>
                      </div>

                      {/* Sub-orders List */}
                      <div className="space-y-3 pt-2">
                        {order.sellerSubOrders.map((sub) => (
                          <div
                            key={sub.id}
                            className="bg-neutral-50 p-3 rounded-lg border border-neutral-200 text-xs"
                          >
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-bold text-neutral-800 flex items-center gap-1.5">
                                <Store className="w-3.5 h-3.5 text-amber-600" />
                                Vendor: {sub.sellerName}
                              </span>
                              <span className="text-[11px] text-neutral-500 font-mono">
                                {sub.subOrderNumber}
                              </span>
                            </div>

                            {/* Sub items */}
                            <div className="space-y-2">
                              {sub.items.map((it) => (
                                <div key={it.id} className="flex gap-2 items-center">
                                  <img
                                    src={it.productImage}
                                    alt={it.productName}
                                    className="w-10 h-10 object-cover rounded border border-neutral-200"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-neutral-900 truncate">
                                      {it.productName}
                                    </div>
                                    <div className="text-[11px] text-neutral-500">
                                      Qty: {it.quantity} × {formatKSh(it.price)}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Tracking info & Return Action */}
                            <div className="mt-3 pt-2 border-t border-neutral-200 flex justify-between items-center text-[11px]">
                              <div>
                                {sub.trackingNumber && (
                                  <span className="text-blue-600 font-medium font-mono">
                                    Tracking: {sub.trackingNumber}
                                  </span>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() =>
                                    setReturnModalSubOrder({
                                      orderId: order.id,
                                      subOrderId: sub.id,
                                    })
                                  }
                                  className="text-amber-700 hover:underline flex items-center gap-1 font-semibold"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  Request Return
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Order Action Footer */}
                      <div className="pt-2 flex justify-between items-center text-xs">
                        <div className="text-neutral-500">
                          Destination: {order.deliveryAddress.streetAddress},{' '}
                          {order.deliveryAddress.town}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              window.print();
                            }}
                            className="px-3 py-1.5 rounded bg-neutral-100 hover:bg-neutral-200 font-semibold text-neutral-700 flex items-center gap-1"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Print Tax Invoice
                          </button>
                          {order.status !== 'delivered' && order.status !== 'cancelled' && (
                            <button
                              onClick={() => cancelOrder(order.id, 'Customer requested cancellation')}
                              className="px-3 py-1.5 rounded bg-red-50 hover:bg-red-100 font-semibold text-red-700"
                            >
                              Cancel Order
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* WISHLIST TAB */}
          {activeTab === 'wishlist' && (
            <div>
              {wishlistProducts.length === 0 ? (
                <div className="text-center py-12 text-neutral-500">
                  <Heart className="w-12 h-12 mx-auto text-neutral-300 mb-2" />
                  <p className="text-sm font-medium">Your wishlist is empty.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {wishlistProducts.map((p) => (
                    <div
                      key={p.id}
                      className="border border-neutral-200 rounded-lg p-3 bg-white flex flex-col justify-between"
                    >
                      <div className="cursor-pointer" onClick={() => onViewProduct(p.id)}>
                        <img
                          src={p.images[0]}
                          alt={p.name}
                          className="w-full aspect-square object-cover rounded mb-2"
                          referrerPolicy="no-referrer"
                        />
                        <h4 className="text-xs font-semibold text-neutral-900 line-clamp-2">
                          {p.name}
                        </h4>
                        <div className="font-bold text-sm text-neutral-900 mt-1">
                          {formatKSh(p.discountPrice || p.price)}
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-neutral-100 flex gap-2">
                        <button
                          onClick={() => addToCart(p, p.variants ? p.variants[0] : undefined)}
                          className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold py-1.5 px-2 rounded flex items-center justify-center gap-1"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          Add to Cart
                        </button>
                        <button
                          onClick={() => toggleWishlist(p.id)}
                          className="p-1.5 text-neutral-400 hover:text-red-600 rounded border border-neutral-200"
                          title="Remove from wishlist"
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

          {/* PROFILE & ADDRESSES TAB */}
          {activeTab === 'profile' && (
            <div className="space-y-4 max-w-lg text-xs">
              <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                <h4 className="font-bold text-neutral-800 uppercase mb-3">Customer Profile</h4>
                <div className="space-y-2">
                  <div>
                    <span className="text-neutral-500 block">Name:</span>
                    <span className="font-semibold text-neutral-800">Jane Wambui</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block">Email:</span>
                    <span className="font-semibold text-neutral-800">jane.wambui@allsales.ke</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block">Phone:</span>
                    <span className="font-semibold text-neutral-800">+254 712 345 678</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                <h4 className="font-bold text-neutral-800 uppercase mb-3">
                  Default Delivery Address
                </h4>
                <p className="text-neutral-700 leading-relaxed">
                  Jane Wambui <br />
                  Rhapta Road, Court 3, Apt 4B <br />
                  Westlands, Nairobi County, Kenya <br />
                  Phone: +254 712 345 678
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Return & Refund Request Modal */}
      {returnModalSubOrder && (
        <div className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-neutral-900 mb-2 flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-amber-600" />
              Request Return & Refund
            </h3>
            <p className="text-xs text-neutral-500 mb-4">
              Allsales guarantees free 7-15 day returns on eligible items. Our logistics rider will
              collect the item from your registered address.
            </p>

            {returnSuccess ? (
              <div className="p-4 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                Return ticket submitted successfully. Support team will contact you within 24 hours.
              </div>
            ) : (
              <form onSubmit={handleReturnSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">
                    Select Return Reason
                  </label>
                  <select
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    className="w-full p-2 border border-neutral-300 rounded bg-neutral-50 text-neutral-800"
                  >
                    <option value="Item defective / not turning on">
                      Item defective / not working
                    </option>
                    <option value="Wrong item delivered">Wrong item or variation delivered</option>
                    <option value="Physical transit damage">
                      Item physically damaged during delivery
                    </option>
                    <option value="Missing parts / accessories">
                      Missing parts or accessories in box
                    </option>
                    <option value="Changed mind / unopened">Changed mind (Package unopened)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">
                    Explain the Issue
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Provide details for inspection team..."
                    required
                    className="w-full p-2 border border-neutral-300 rounded"
                  ></textarea>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setReturnModalSubOrder(null)}
                    className="px-3 py-1.5 text-neutral-600 hover:bg-neutral-100 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded"
                  >
                    Submit Return
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
