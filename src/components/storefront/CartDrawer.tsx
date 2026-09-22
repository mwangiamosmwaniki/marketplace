import React, { useState } from 'react';
import { useMarketplace } from '../../context/MarketplaceContext';
import {
  X,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ShoppingBag,
  Store,
  Tag,
  CheckCircle2,
} from 'lucide-react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onProceedToCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  onProceedToCheckout,
}) => {
  const {
    cart,
    cartGroupedBySeller,
    cartSubtotal,
    cartDiscount,
    cartDeliveryFee,
    cartGrandTotal,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    updateCartQuantity,
    removeFromCart,
    formatKSh,
  } = useMarketplace();

  const [couponInput, setCouponInput] = useState('');
  const [couponMessage, setCouponMessage] = useState<{ text: string; success: boolean } | null>(
    null
  );

  if (!isOpen) return null;

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    const res = applyCoupon(couponInput);
    setCouponMessage({ text: res.message, success: res.success });
    if (res.success) {
      setCouponInput('');
    }
  };

  return (
    <div
      id="cart-drawer-backdrop"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end"
      onClick={onClose}
    >
      <div
        id="cart-drawer-panel"
        className="bg-white w-full max-w-lg h-full shadow-2xl flex flex-col justify-between"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cart Header */}
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-amber-600" />
            <h2 className="font-bold text-neutral-900 text-base">
              My Shopping Cart ({cart.reduce((s, i) => s + i.quantity, 0)} items)
            </h2>
          </div>
          <button
            id="btn-close-cart"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-200 text-neutral-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cart Items Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {cart.length === 0 ? (
            <div className="text-center py-16">
              <ShoppingBag className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
              <h3 className="font-bold text-neutral-800 text-base mb-1">Your cart is empty</h3>
              <p className="text-xs text-neutral-500 max-w-xs mx-auto mb-6">
                Explore our catalog of authentic brands, flash sales, and top electronics.
              </p>
              <button
                onClick={onClose}
                className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold py-2.5 px-6 rounded-lg shadow-sm"
              >
                Start Shopping
              </button>
            </div>
          ) : (
            <>
              {/* Grouped by Seller (Section 17 requirement) */}
              {cartGroupedBySeller.map(({ seller, items, subtotal }) => (
                <div
                  key={seller.id}
                  className="border border-neutral-200 rounded-lg overflow-hidden bg-white shadow-xs"
                >
                  {/* Seller Header */}
                  <div className="bg-neutral-50 px-3 py-2 border-b border-neutral-200 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-neutral-800">
                      <Store className="w-3.5 h-3.5 text-amber-600" />
                      <span>Shipment from {seller.businessName}</span>
                    </div>
                    <span className="text-[11px] text-neutral-500 font-medium">
                      Subtotal: {formatKSh(subtotal)}
                    </span>
                  </div>

                  {/* Items in this seller group */}
                  <div className="divide-y divide-neutral-100 p-2 space-y-2">
                    {items.map((item) => (
                      <div key={item.id} className="flex gap-3 py-2">
                        <img
                          src={item.productImage}
                          alt={item.name}
                          className="w-16 h-16 object-cover rounded border border-neutral-200 flex-shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <h4 className="text-xs font-medium text-neutral-900 truncate">
                              {item.name}
                            </h4>
                            {item.variantText && (
                              <p className="text-[11px] text-neutral-500 truncate">
                                {item.variantText}
                              </p>
                            )}
                            <div className="text-xs font-bold text-neutral-900 mt-1">
                              {formatKSh(item.price)}
                            </div>
                          </div>

                          <div className="flex items-center justify-between mt-2">
                            {/* Quantity controls */}
                            <div className="flex items-center border border-neutral-200 rounded">
                              <button
                                onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                                className="p-1 text-neutral-500 hover:bg-neutral-100"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="px-2 text-xs font-bold text-neutral-800">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                                disabled={item.quantity >= item.maxStock}
                                className="p-1 text-neutral-500 hover:bg-neutral-100 disabled:opacity-30"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Remove button */}
                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="text-neutral-400 hover:text-red-600 p-1 transition-colors"
                              title="Remove item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Coupon Code Section */}
              <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200">
                <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800 mb-2">
                  <Tag className="w-3.5 h-3.5 text-amber-600" />
                  Have a Promo Voucher / Coupon?
                </div>

                {appliedCoupon ? (
                  <div className="flex items-center justify-between bg-emerald-50 text-emerald-800 p-2 rounded text-xs border border-emerald-200">
                    <span className="font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {appliedCoupon.code} applied (-{formatKSh(cartDiscount)})
                    </span>
                    <button
                      onClick={removeCoupon}
                      className="text-neutral-500 hover:text-red-600 text-xs font-semibold underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyCoupon} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. KESALES10 or WELCOME500"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      className="flex-1 text-xs p-2 border border-neutral-300 rounded bg-white font-mono"
                    />
                    <button
                      type="submit"
                      className="bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold px-3 py-2 rounded"
                    >
                      Apply
                    </button>
                  </form>
                )}

                {couponMessage && (
                  <p
                    className={`text-[11px] mt-1.5 font-medium ${
                      couponMessage.success ? 'text-emerald-700' : 'text-red-600'
                    }`}
                  >
                    {couponMessage.text}
                  </p>
                )}

                <div className="mt-2 flex gap-1 flex-wrap text-[10px] text-neutral-500">
                  <span>Try:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setCouponInput('KESALES10');
                      applyCoupon('KESALES10');
                    }}
                    className="underline hover:text-amber-600"
                  >
                    KESALES10
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => {
                      setCouponInput('WELCOME500');
                      applyCoupon('WELCOME500');
                    }}
                    className="underline hover:text-amber-600"
                  >
                    WELCOME500
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Cart Footer Summary */}
        {cart.length > 0 && (
          <div className="p-4 border-t border-neutral-200 bg-neutral-50 space-y-3">
            <div className="space-y-1.5 text-xs text-neutral-600">
              <div className="flex justify-between">
                <span>Subtotal ({cart.reduce((s, i) => s + i.quantity, 0)} items)</span>
                <span className="font-semibold text-neutral-900">{formatKSh(cartSubtotal)}</span>
              </div>
              {cartDiscount > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Coupon Discount</span>
                  <span>-{formatKSh(cartDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Estimated Delivery Fee</span>
                <span className="font-semibold text-neutral-900">{formatKSh(cartDeliveryFee)}</span>
              </div>
              <div className="pt-2 border-t border-neutral-200 flex justify-between items-baseline">
                <span className="text-sm font-bold text-neutral-900">Total</span>
                <span className="text-lg font-extrabold text-neutral-900">
                  {formatKSh(cartGrandTotal)}
                </span>
              </div>
            </div>

            <button
              id="btn-proceed-checkout"
              onClick={() => {
                onClose();
                onProceedToCheckout();
              }}
              className="w-full bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
