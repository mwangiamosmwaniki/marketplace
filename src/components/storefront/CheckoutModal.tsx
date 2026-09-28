import React, { useState } from "react";
import { useMarketplace } from "../../context/MarketplaceContext";
import {
  X,
  MapPin,
  Truck,
  CreditCard,
  Phone,
  CheckCircle2,
  Lock,
  ArrowLeft,
  Store,
  FileText,
  AlertCircle,
  Smartphone,
} from "lucide-react";
import { DeliveryAddress, PaymentMethod, MasterOrder } from "../../types";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCompleted: (order: MasterOrder) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  onOrderCompleted,
}) => {
  const {
    cart,
    cartGroupedBySeller,
    cartSubtotal,
    cartDiscount,
    cartDeliveryFee,
    cartGrandTotal,
    appliedCoupon,
    deliveryZones,
    createOrder,
    formatKSh,
  } = useMarketplace();

  // Multi-step state: 1 = Address & Delivery, 2 = Payment Selection, 3 = Confirmation
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Address state
  const [address, setAddress] = useState<DeliveryAddress>({
    fullName: "Jane Wambui",
    phone: "+254712345678",
    county: "Nairobi",
    town: "Westlands",
    streetAddress: "Rhapta Road, Apartment 4B",
    deliveryInstructions: "Ring bell 4B or leave at reception.",
  });

  const [deliveryType, setDeliveryType] = useState<
    "home_delivery" | "pickup_station"
  >("home_delivery");

  const activeZone = deliveryZones.find((z) => z.county === address.county) ||
    deliveryZones[0] || {
      county: address.county || "Nairobi",
      towns: [address.town || "Nairobi"],
      homeDeliveryFee: 0,
      pickupStationFee: 0,
      estimatedDays: "2-5 days",
      pickupStations: [],
    };
  const [selectedPickupStation, setSelectedPickupStation] = useState<
    string | undefined
  >(activeZone.pickupStations[0]);

  // Payment state
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("mpesa_stk");
  const [mpesaPhone, setMpesaPhone] = useState(address.phone);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  // Simulated M-Pesa STK Push prompt state
  const [showMpesaPrompt, setShowMpesaPrompt] = useState(false);
  const [mpesaPin, setMpesaPin] = useState("");
  const [mpesaProcessing, setMpesaProcessing] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<MasterOrder | null>(null);

  if (!isOpen) return null;

  const handleCountyChange = (county: string) => {
    const zone = deliveryZones.find((z) => z.county === county) || activeZone;
    setAddress((prev) => ({
      ...prev,
      county,
      town: zone?.towns[0] || prev.town || "CBD",
    }));
    if (zone && zone.pickupStations.length > 0) {
      setSelectedPickupStation(zone.pickupStations[0]);
    } else {
      setSelectedPickupStation(undefined);
    }
  };

  const handleContinueToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.fullName || !address.phone || !address.streetAddress) {
      setOrderError("Please fill in all delivery details.");
      return;
    }
    setOrderError(null);
    setStep(2);
  };

  const handleInitiatePayment = async () => {
    setOrderError(null);

    if (paymentMethod === "mpesa_stk") {
      // Trigger simulated interactive M-Pesa USSD STK Push prompt
      setShowMpesaPrompt(true);
      return;
    }

    // Direct card or COD processing
    await processOrderCreation();
  };

  const processOrderCreation = async () => {
    setIsSubmitting(true);
    try {
      const order = await createOrder({
        address,
        deliveryType,
        pickupStation:
          deliveryType === "pickup_station" ? selectedPickupStation : undefined,
        paymentMethod,
      });

      setCreatedOrder(order);
      setStep(3);
      onOrderCompleted(order);
    } catch (err: any) {
      setOrderError(
        err.message || "Failed to complete order. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMpesaPinSubmit = async () => {
    if (mpesaPin.length < 4) {
      setOrderError("Please enter a 4-digit M-Pesa PIN");
      return;
    }
    setMpesaProcessing(true);
    // Simulate STK Push callback latency (1.5 seconds)
    setTimeout(async () => {
      setMpesaProcessing(false);
      setShowMpesaPrompt(false);
      await processOrderCreation();
    }, 1500);
  };

  return (
    <div
      id="checkout-modal-overlay"
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
    >
      <div
        id="checkout-modal-content"
        className="bg-white rounded-xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl relative flex flex-col"
      >
        {/* Header */}
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            {step === 2 && (
              <button
                onClick={() => setStep(1)}
                className="p-1 hover:bg-neutral-200 rounded text-neutral-600"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <h2 className="font-bold text-neutral-900 text-base flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-600" />
                Secure Marketplace Checkout
              </h2>
              <p className="text-[11px] text-neutral-500">
                Step {step} of 3:{" "}
                {step === 1
                  ? "Delivery Information"
                  : step === 2
                    ? "Payment Method"
                    : "Order Confirmed"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-200 text-neutral-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 flex-1">
          {orderError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{orderError}</span>
            </div>
          )}

          {/* STEP 1: Delivery Address & Logistics Method */}
          {step === 1 && (
            <form onSubmit={handleContinueToPayment} className="space-y-6">
              {/* Delivery Type Selector */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                  1. Select Fulfillment Method
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setDeliveryType("home_delivery")}
                    className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                      deliveryType === "home_delivery"
                        ? "border-amber-600 bg-amber-50/60 ring-1 ring-amber-500"
                        : "border-neutral-200 hover:border-neutral-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs text-neutral-900 mb-1">
                      <Truck className="w-4 h-4 text-amber-600" />
                      <span>Doorstep Home Delivery</span>
                    </div>
                    <p className="text-[11px] text-neutral-500">
                      Delivered directly to your residence or office.
                    </p>
                    <div className="mt-2 text-xs font-semibold text-neutral-800">
                      Fee: {formatKSh(activeZone.homeDeliveryFee)} (
                      {activeZone.estimatedDays})
                    </div>
                  </div>

                  <div
                    onClick={() => setDeliveryType("pickup_station")}
                    className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                      deliveryType === "pickup_station"
                        ? "border-amber-600 bg-amber-50/60 ring-1 ring-amber-500"
                        : "border-neutral-200 hover:border-neutral-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs text-neutral-900 mb-1">
                      <MapPin className="w-4 h-4 text-amber-600" />
                      <span>KESALES Pickup Station</span>
                    </div>
                    <p className="text-[11px] text-neutral-500">
                      Collect at a designated secure neighborhood hub.
                    </p>
                    <div className="mt-2 text-xs font-semibold text-neutral-800">
                      Fee: {formatKSh(activeZone.pickupStationFee)} (Save KSh
                      150)
                    </div>
                  </div>
                </div>
              </div>

              {/* Pickup Station Dropdown if selected */}
              {deliveryType === "pickup_station" && (
                <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Select Convenient Pickup Hub ({address.county})
                  </label>
                  <select
                    value={selectedPickupStation}
                    onChange={(e) => setSelectedPickupStation(e.target.value)}
                    className="w-full text-xs p-2 border border-neutral-300 rounded bg-white"
                  >
                    {activeZone.pickupStations.map((station, i) => (
                      <option key={i} value={station}>
                        {station}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Recipient Details & Address */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                  2. Recipient & Destination Details
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-neutral-600 mb-1">
                      Recipient Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={address.fullName}
                      onChange={(e) =>
                        setAddress({ ...address, fullName: e.target.value })
                      }
                      className="w-full text-xs p-2 border border-neutral-300 rounded bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-neutral-600 mb-1">
                      Phone Number (Safaricom / Airtel) *
                    </label>
                    <input
                      type="tel"
                      required
                      value={address.phone}
                      onChange={(e) => {
                        setAddress({ ...address, phone: e.target.value });
                        setMpesaPhone(e.target.value);
                      }}
                      className="w-full text-xs p-2 border border-neutral-300 rounded bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-neutral-600 mb-1">
                      County *
                    </label>
                    <select
                      value={address.county}
                      onChange={(e) => handleCountyChange(e.target.value)}
                      className="w-full text-xs p-2 border border-neutral-300 rounded bg-white"
                    >
                      {deliveryZones.map((z) => (
                        <option key={z.county} value={z.county}>
                          {z.county}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-neutral-600 mb-1">
                      Town / Area *
                    </label>
                    <select
                      value={address.town}
                      onChange={(e) =>
                        setAddress({ ...address, town: e.target.value })
                      }
                      className="w-full text-xs p-2 border border-neutral-300 rounded bg-white"
                    >
                      {activeZone.towns.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-3">
                  <label className="block text-[11px] text-neutral-600 mb-1">
                    Street Address / Building / House No. *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rhapta Road, Court 3, Apt 4B"
                    value={address.streetAddress}
                    onChange={(e) =>
                      setAddress({ ...address, streetAddress: e.target.value })
                    }
                    className="w-full text-xs p-2 border border-neutral-300 rounded bg-white"
                  />
                </div>

                <div className="mt-3">
                  <label className="block text-[11px] text-neutral-600 mb-1">
                    Special Delivery Instructions (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Gate code, call when nearby"
                    value={address.deliveryInstructions || ""}
                    onChange={(e) =>
                      setAddress({
                        ...address,
                        deliveryInstructions: e.target.value,
                      })
                    }
                    className="w-full text-xs p-2 border border-neutral-300 rounded bg-white"
                  />
                </div>
              </div>

              {/* Order Package Preview by Vendor */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                  3. Order Package Summary ({cartGroupedBySeller.length} Vendor
                  Package
                  {cartGroupedBySeller.length > 1 ? "s" : ""})
                </label>
                <div className="space-y-2">
                  {cartGroupedBySeller.map(({ seller, items, subtotal }) => (
                    <div
                      key={seller.id}
                      className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 text-xs flex justify-between items-center"
                    >
                      <div>
                        <span className="font-bold text-neutral-800 flex items-center gap-1">
                          <Store className="w-3.5 h-3.5 text-amber-600" />
                          Package from {seller.businessName}
                        </span>
                        <p className="text-[11px] text-neutral-500">
                          {items.reduce((s, i) => s + i.quantity, 0)} item(s):{" "}
                          {items.map((i) => i.name).join(", ")}
                        </p>
                      </div>
                      <span className="font-bold text-neutral-900">
                        {formatKSh(subtotal)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Price Summary */}
              <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold">
                    {formatKSh(cartSubtotal)}
                  </span>
                </div>
                {cartDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Coupon ({appliedCoupon?.code})</span>
                    <span>-{formatKSh(cartDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Delivery Fee</span>
                  <span className="font-semibold">
                    {formatKSh(cartDeliveryFee)}
                  </span>
                </div>
                <div className="pt-2 border-t border-neutral-200 flex justify-between items-baseline font-bold text-sm">
                  <span>Total Payable</span>
                  <span className="text-amber-600 text-base">
                    {formatKSh(cartGrandTotal)}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs text-neutral-600 hover:bg-neutral-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-continue-payment"
                  className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold py-2.5 px-6 rounded-lg shadow-sm"
                >
                  Proceed to Payment ({formatKSh(cartGrandTotal)})
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: Payment Method */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                  Select Payment Gateway
                </label>

                <div className="space-y-3">
                  {/* M-Pesa STK Push */}
                  <div
                    onClick={() => setPaymentMethod("mpesa_stk")}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      paymentMethod === "mpesa_stk"
                        ? "border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-500"
                        : "border-neutral-200 hover:border-neutral-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-5 h-5 text-emerald-600" />
                        <span className="font-bold text-sm text-neutral-900">
                          M-Pesa STK Push (Instant Daraja API)
                        </span>
                      </div>
                      <span className="text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded">
                        FASTEST
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 mb-3">
                      A prompt will be sent directly to your Safaricom phone.
                      Simply enter your M-Pesa PIN to complete payment.
                    </p>

                    {paymentMethod === "mpesa_stk" && (
                      <div className="mt-2 pt-2 border-t border-emerald-100">
                        <label className="block text-[11px] text-neutral-600 font-semibold mb-1">
                          M-Pesa Mobile Number
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="tel"
                            value={mpesaPhone}
                            onChange={(e) => setMpesaPhone(e.target.value)}
                            placeholder="+254 7XX XXX XXX"
                            className="text-xs p-2 border border-neutral-300 rounded bg-white flex-1 font-mono"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Payment */}
                  <div
                    onClick={() => setPaymentMethod("card")}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      paymentMethod === "card"
                        ? "border-blue-600 bg-blue-50/50 ring-1 ring-blue-500"
                        : "border-neutral-200 hover:border-neutral-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <CreditCard className="w-5 h-5 text-blue-600" />
                      <span className="font-bold text-sm text-neutral-900">
                        Visa / Mastercard / Debit Card
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500">
                      Encrypted 3D-Secure card processing with zero transaction
                      fee.
                    </p>
                  </div>

                  {/* Cash on Delivery */}
                  <div
                    onClick={() => setPaymentMethod("cash_on_delivery")}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      paymentMethod === "cash_on_delivery"
                        ? "border-neutral-800 bg-neutral-100 ring-1 ring-neutral-700"
                        : "border-neutral-200 hover:border-neutral-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Truck className="w-5 h-5 text-neutral-700" />
                      <span className="font-bold text-sm text-neutral-900">
                        Pay on Delivery (Cash / M-Pesa at Doorstep)
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500">
                      Pay upon physical inspection and receipt of goods.
                    </p>
                  </div>
                </div>
              </div>

              {/* Order Final Summary */}
              <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200 text-xs space-y-2">
                <div className="flex justify-between text-neutral-600">
                  <span>Delivery destination:</span>
                  <span className="font-semibold text-neutral-800">
                    {address.streetAddress}, {address.town}, {address.county}
                  </span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Method:</span>
                  <span className="font-semibold text-neutral-800 capitalize">
                    {deliveryType.replace("_", " ")}
                  </span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Subtotal + Delivery:</span>
                  <span className="font-semibold text-neutral-800">
                    {formatKSh(cartSubtotal + cartDeliveryFee - cartDiscount)}
                  </span>
                </div>
                <div className="pt-2 border-t border-neutral-200 flex justify-between items-baseline font-bold text-sm">
                  <span>Grand Total to Pay:</span>
                  <span className="text-base text-emerald-700 font-extrabold">
                    {formatKSh(cartGrandTotal)}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 text-xs text-neutral-600 hover:bg-neutral-100 rounded"
                >
                  Back to Delivery
                </button>
                <button
                  id="btn-pay-now"
                  onClick={handleInitiatePayment}
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold py-3 px-8 rounded-lg shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  <Lock className="w-4 h-4" />
                  {paymentMethod === "mpesa_stk"
                    ? "Prompt M-Pesa Payment"
                    : "Complete & Pay Order"}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Order Confirmation & Sub-Order Breakdown */}
          {step === 3 && createdOrder && (
            <div className="space-y-6 text-center py-4">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-neutral-900">
                  Order Confirmed!
                </h3>
                <p className="text-xs text-neutral-500 mt-1">
                  Thank you,{" "}
                  <span className="font-semibold">
                    {createdOrder.customerName}
                  </span>
                  . Your order reference is{" "}
                  <span className="font-mono font-bold text-neutral-800">
                    {createdOrder.orderNumber}
                  </span>
                  .
                </p>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Payment Reference: {createdOrder.paymentReference}
                </p>
              </div>

              {/* Vendor Sub-Orders Transparency */}
              <div className="text-left bg-neutral-50 rounded-lg p-4 border border-neutral-200">
                <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider mb-2">
                  Fulfillment & Seller Sub-Orders (
                  {createdOrder.sellerSubOrders.length})
                </h4>
                <div className="space-y-3">
                  {createdOrder.sellerSubOrders.map((sub) => (
                    <div
                      key={sub.id}
                      className="p-3 bg-white rounded border border-neutral-200 text-xs shadow-2xs"
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-neutral-900 flex items-center gap-1">
                          <Store className="w-3.5 h-3.5 text-amber-600" />
                          {sub.sellerName}
                        </span>
                        <span className="font-mono text-[11px] text-neutral-500">
                          Sub-Order: {sub.subOrderNumber}
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
                      <div className="mt-2 pt-2 border-t border-neutral-100 flex justify-between items-center text-[11px]">
                        <span className="bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded">
                          Status: Processing & Packing
                        </span>
                        <span className="font-bold text-neutral-800">
                          Package Subtotal:{" "}
                          {formatKSh(sub.subtotal + sub.deliveryFee)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={() => {
                    window.print();
                  }}
                  className="px-4 py-2 text-xs font-bold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Print Tax Invoice
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-2 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded"
                >
                  Return to Storefront
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Simulated Safaricom M-PESA STK Push Phone Dialog */}
      {showMpesaPrompt && (
        <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-neutral-900 text-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-neutral-700 text-center animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto mb-3">
              <Phone className="w-6 h-6" />
            </div>

            <h4 className="text-base font-bold text-emerald-400 font-mono tracking-wide mb-1">
              SIM TOOLKIT / M-PESA
            </h4>
            <p className="text-xs text-neutral-300 mb-4">
              Do you want to pay{" "}
              <span className="text-white font-bold">
                {formatKSh(cartGrandTotal)}
              </span>{" "}
              to <span className="text-emerald-300 font-bold">KESALES</span>?
            </p>

            <div className="bg-neutral-800 p-3 rounded-lg border border-neutral-700 mb-4 text-left font-mono text-xs text-neutral-300 space-y-1">
              <div>Business No: 829104</div>
              <div>Account: KESALES-DEMO</div>
              <div>Amount: {formatKSh(cartGrandTotal)}</div>
            </div>

            <div className="mb-4">
              <label className="block text-xs text-neutral-400 mb-1">
                Enter M-PESA PIN (Simulated):
              </label>
              <input
                type="password"
                maxLength={4}
                autoFocus
                placeholder="• • • •"
                value={mpesaPin}
                onChange={(e) => setMpesaPin(e.target.value)}
                className="w-36 text-center tracking-widest text-lg font-bold p-2 bg-neutral-800 border border-neutral-600 rounded text-white focus:outline-none focus:border-emerald-500 mx-auto"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowMpesaPrompt(false)}
                className="flex-1 py-2 text-xs font-semibold bg-neutral-700 hover:bg-neutral-600 text-neutral-300 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleMpesaPinSubmit}
                disabled={mpesaProcessing}
                className="flex-1 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded flex items-center justify-center gap-1.5"
              >
                {mpesaProcessing ? "Verifying Callback..." : "Send / OK"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
