import React, { useState } from 'react';
import { useMarketplace } from '../../context/MarketplaceContext';
import { Product, ProductVariant } from '../../types';
import {
  X,
  Star,
  ShieldCheck,
  Truck,
  RotateCcw,
  Store,
  CheckCircle2,
  ShoppingCart,
  Zap,
  Plus,
  Minus,
  MessageSquarePlus,
  Send,
} from 'lucide-react';

interface ProductDetailModalProps {
  product: Product | null;
  isOpen?: boolean;
  onClose: () => void;
  onBuyNow?: (product: Product, variant?: ProductVariant, quantity?: number) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  isOpen = true,
  onClose,
  onBuyNow,
}) => {
  const {
    sellers,
    addToCart,
    formatKSh,
    deliveryZones,
    reviews,
    addProductReview,
  } = useMarketplace();

  if (!product) return null;

  const seller = sellers.find((s) => s.id === product.sellerId);
  const productReviews = reviews[product.id] || [];

  // Selected variant state
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>(
    product.variants && product.variants.length > 0 ? product.variants[0] : undefined
  );
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);

  // Delivery calculator state
  const [selectedCounty, setSelectedCounty] = useState('Nairobi');
  const activeZone = deliveryZones.find((z) => z.county === selectedCounty) || deliveryZones[0];
  const [selectedTown, setSelectedTown] = useState(activeZone.towns[0]);

  // Review form state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewerName, setReviewerName] = useState('');

  // Pricing calculations based on variant
  const currentPrice = selectedVariant
    ? selectedVariant.discountPrice || selectedVariant.price
    : product.discountPrice || product.price;

  const originalPrice = selectedVariant ? selectedVariant.price : product.price;
  const hasDiscount = (selectedVariant?.discountPrice ?? product.discountPrice) !== undefined;
  const currentStock = selectedVariant ? selectedVariant.stock : product.stock;

  const handleCountyChange = (countyName: string) => {
    setSelectedCounty(countyName);
    const newZone = deliveryZones.find((z) => z.county === countyName);
    if (newZone && newZone.towns.length > 0) {
      setSelectedTown(newZone.towns[0]);
    }
  };

  const handleAddToCart = () => {
    addToCart(product, selectedVariant, quantity);
  };

  const handleBuyNow = () => {
    addToCart(product, selectedVariant, quantity);
    if (onBuyNow) {
      onBuyNow(product, selectedVariant, quantity);
    } else {
      onClose();
    }
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewComment.trim()) return;
    addProductReview(
      product.id,
      reviewRating,
      reviewComment.trim(),
      reviewerName.trim() || 'Verified Shopper'
    );
    setReviewComment('');
    setShowReviewForm(false);
  };

  return (
    <div
      id="product-detail-modal-overlay"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="product-detail-modal-content"
        className="bg-white rounded-xl max-w-5xl w-full max-h-[92vh] overflow-y-auto shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          id="btn-close-product-modal"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 p-2 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-4 sm:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Image Gallery Column (5 cols) */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="relative aspect-square bg-neutral-50 rounded-lg overflow-hidden border border-neutral-200">
                <img
                  src={product.images[activeImageIndex] || product.images[0]}
                  alt={product.name}
                  className="w-full h-full object-contain p-4"
                  referrerPolicy="no-referrer"
                />
                {hasDiscount && (
                  <span className="absolute top-3 left-3 bg-amber-500 text-white font-bold text-xs px-2.5 py-1 rounded shadow">
                    SALE
                  </span>
                )}
              </div>

              {/* Thumbnails */}
              {product.images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {product.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`w-16 h-16 rounded border-2 overflow-hidden flex-shrink-0 bg-neutral-50 transition-all ${
                        activeImageIndex === idx
                          ? 'border-amber-500 ring-2 ring-amber-200'
                          : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <img
                        src={img}
                        alt={`Thumbnail ${idx}`}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Seller Trust Banner */}
              {seller && (
                <div className="mt-4 p-4 rounded-lg bg-neutral-50 border border-neutral-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Store className="w-4 h-4 text-amber-600" />
                      <span className="font-semibold text-neutral-800 text-sm">
                        {seller.businessName}
                      </span>
                    </div>
                    <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded">
                      {seller.rating} ★
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 line-clamp-2">{seller.description}</p>
                  <div className="mt-3 pt-2 border-t border-neutral-200 flex items-center justify-between text-xs text-neutral-600">
                    <span className="flex items-center gap-1 text-emerald-700 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Verified Seller
                    </span>
                    <span>{seller.totalSalesCount}+ successful orders</span>
                  </div>
                </div>
              )}
            </div>

            {/* Product Details & Variant Selectors (7 cols) */}
            <div className="lg:col-span-7 flex flex-col">
              {/* Product Header */}
              <div className="border-b border-neutral-200 pb-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">
                  <span>SKU: {selectedVariant ? selectedVariant.sku : product.sku}</span>
                  <span>•</span>
                  <span className="text-emerald-700">{product.condition}</span>
                </div>

                <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 leading-snug">
                  {product.name}
                </h1>

                {/* Ratings Overview */}
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center gap-1 text-amber-500">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="text-sm font-bold text-neutral-800">{product.rating}</span>
                  </div>
                  <span className="text-xs text-neutral-500">
                    ({product.reviewsCount} verified customer ratings)
                  </span>
                  <span className="text-xs text-blue-600 hover:underline cursor-pointer">
                    View reviews
                  </span>
                </div>
              </div>

              {/* Price Block */}
              <div className="py-4 border-b border-neutral-200">
                <div className="flex items-baseline gap-3">
                  <span className="text-2xl sm:text-3xl font-extrabold text-neutral-900">
                    {formatKSh(currentPrice)}
                  </span>
                  {hasDiscount && (
                    <span className="text-sm sm:text-base text-neutral-400 line-through">
                      {formatKSh(originalPrice)}
                    </span>
                  )}
                  {hasDiscount && (
                    <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">
                      Save {formatKSh(originalPrice - currentPrice)}
                    </span>
                  )}
                </div>

                <div className="mt-2 flex items-center gap-2 text-xs">
                  {currentStock > 0 ? (
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> In Stock ({currentStock} available)
                    </span>
                  ) : (
                    <span className="text-red-600 font-semibold">Out of Stock</span>
                  )}
                </div>
              </div>

              {/* Product Variations Matrix */}
              {product.variants && product.variants.length > 0 && (
                <div className="py-4 border-b border-neutral-200">
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                    Select Variation:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {product.variants.map((v) => {
                      const isSelected = selectedVariant?.id === v.id;
                      const label = Object.entries(v.attributes)
                        .map(([key, val]) => `${key}: ${val}`)
                        .join(' | ');

                      return (
                        <button
                          key={v.id}
                          onClick={() => {
                            setSelectedVariant(v);
                            setQuantity(1);
                          }}
                          className={`px-3 py-2 rounded-lg text-xs font-medium border text-left transition-all ${
                            isSelected
                              ? 'border-amber-600 bg-amber-50 text-amber-900 ring-1 ring-amber-500 font-bold'
                              : 'border-neutral-200 hover:border-neutral-300 text-neutral-700 bg-white'
                          }`}
                        >
                          <div>{label}</div>
                          <div className="text-[11px] text-neutral-500 mt-0.5">
                            {formatKSh(v.discountPrice || v.price)}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quantity & CTA Buttons */}
              <div className="py-4 border-b border-neutral-200">
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-xs font-semibold text-neutral-700 uppercase">
                    Quantity:
                  </span>
                  <div className="flex items-center border border-neutral-300 rounded-lg">
                    <button
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                      className="p-2 text-neutral-600 hover:bg-neutral-100 disabled:opacity-40"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-4 text-sm font-bold text-neutral-800 min-w-[2rem] text-center">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity((q) => Math.min(currentStock, q + 1))}
                      disabled={quantity >= currentStock}
                      className="p-2 text-neutral-600 hover:bg-neutral-100 disabled:opacity-40"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    id="btn-modal-add-cart"
                    onClick={handleAddToCart}
                    disabled={currentStock <= 0}
                    className="bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Add to Cart
                  </button>
                  <button
                    id="btn-modal-buy-now"
                    onClick={handleBuyNow}
                    disabled={currentStock <= 0}
                    className="bg-neutral-900 hover:bg-neutral-800 active:bg-neutral-950 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
                  >
                    <Zap className="w-4 h-4 text-amber-400" />
                    Buy Now
                  </button>
                </div>
              </div>

              {/* Delivery & Logistics Estimator */}
              <div className="py-4 border-b border-neutral-200">
                <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                  <Truck className="w-4 h-4 text-amber-600" />
                  Delivery & Returns Estimator
                </h4>

                {/* County and Town Selector */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <label className="block text-[11px] text-neutral-500 mb-1">County</label>
                    <select
                      value={selectedCounty}
                      onChange={(e) => handleCountyChange(e.target.value)}
                      className="w-full text-xs border border-neutral-300 rounded p-1.5 bg-neutral-50 text-neutral-800 font-medium"
                    >
                      {deliveryZones.map((zone) => (
                        <option key={zone.county} value={zone.county}>
                          {zone.county}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-neutral-500 mb-1">Town / Area</label>
                    <select
                      value={selectedTown}
                      onChange={(e) => setSelectedTown(e.target.value)}
                      className="w-full text-xs border border-neutral-300 rounded p-1.5 bg-neutral-50 text-neutral-800 font-medium"
                    >
                      {activeZone.towns.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Delivery Rates */}
                <div className="space-y-2 text-xs bg-neutral-50 p-3 rounded-lg border border-neutral-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-semibold text-neutral-800">Doorstep Delivery</span>
                      <p className="text-[11px] text-neutral-500">
                        Estimated arrival: {activeZone.estimatedDays}
                      </p>
                    </div>
                    <span className="font-bold text-neutral-900">
                      {formatKSh(activeZone.homeDeliveryFee)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-neutral-200">
                    <div>
                      <span className="font-semibold text-neutral-800">Pickup Station Hub</span>
                      <p className="text-[11px] text-neutral-500">
                        {activeZone.pickupStations[0]}
                      </p>
                    </div>
                    <span className="font-bold text-neutral-900">
                      {formatKSh(activeZone.pickupStationFee)}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2 text-xs text-neutral-600">
                  <RotateCcw className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{product.returnPolicy}</span>
                </div>
              </div>

              {/* Warranty & Guarantee */}
              <div className="py-3 text-xs text-neutral-600 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>{product.warranty}</span>
              </div>
            </div>
          </div>

          {/* Product Description & Specifications */}
          <div className="mt-8 pt-6 border-t border-neutral-200">
            <h3 className="text-base font-bold text-neutral-900 mb-3">Product Overview & Specs</h3>
            <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-line mb-6">
              {product.description}
            </p>

            <div className="bg-neutral-50 rounded-lg p-4 border border-neutral-200 max-w-2xl">
              <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider mb-2">
                Key Specifications
              </h4>
              <div className="grid grid-cols-2 gap-y-2 text-xs">
                <span className="text-neutral-500">Condition:</span>
                <span className="font-medium text-neutral-800">{product.condition}</span>

                <span className="text-neutral-500">Package Weight:</span>
                <span className="font-medium text-neutral-800">{product.weightKg} kg</span>

                <span className="text-neutral-500">Warranty:</span>
                <span className="font-medium text-neutral-800">{product.warranty}</span>

                <span className="text-neutral-500">Return Window:</span>
                <span className="font-medium text-neutral-800">{product.returnPolicy}</span>
              </div>
            </div>
          </div>

          {/* Customer Reviews Section */}
          <div className="mt-8 pt-6 border-t border-neutral-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-neutral-900">
                  Customer Ratings & Reviews
                </h3>
                <p className="text-xs text-neutral-500">
                  Verified reviews from real purchases
                </p>
              </div>
              <button
                id="btn-write-review"
                onClick={() => setShowReviewForm(!showReviewForm)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                <MessageSquarePlus className="w-3.5 h-3.5" />
                Write a Review
              </button>
            </div>

            {/* Review Form Drawer */}
            {showReviewForm && (
              <form
                onSubmit={handleSubmitReview}
                className="mb-6 p-4 rounded-lg bg-neutral-50 border border-neutral-200"
              >
                <h4 className="text-xs font-bold text-neutral-800 uppercase mb-3">
                  Share Your Experience
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-[11px] text-neutral-600 mb-1">Your Name</label>
                    <input
                      type="text"
                      placeholder="e.g. David Mwangi"
                      value={reviewerName}
                      onChange={(e) => setReviewerName(e.target.value)}
                      className="w-full text-xs p-2 border border-neutral-300 rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-neutral-600 mb-1">Rating</label>
                    <select
                      value={reviewRating}
                      onChange={(e) => setReviewRating(Number(e.target.value))}
                      className="w-full text-xs p-2 border border-neutral-300 rounded bg-white"
                    >
                      <option value="5">5 Stars - Excellent</option>
                      <option value="4">4 Stars - Very Good</option>
                      <option value="3">3 Stars - Average</option>
                      <option value="2">2 Stars - Poor</option>
                      <option value="1">1 Star - Terrible</option>
                    </select>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="block text-[11px] text-neutral-600 mb-1">Review Comments</label>
                  <textarea
                    rows={3}
                    placeholder="Tell other shoppers about product quality, delivery, and performance..."
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    required
                    className="w-full text-xs p-2 border border-neutral-300 rounded bg-white"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowReviewForm(false)}
                    className="px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-200 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs bg-amber-500 hover:bg-amber-600 text-white font-bold rounded flex items-center gap-1"
                  >
                    <Send className="w-3 h-3" />
                    Submit Review
                  </button>
                </div>
              </form>
            )}

            {/* Reviews List */}
            <div className="space-y-3">
              {productReviews.length === 0 ? (
                <p className="text-xs text-neutral-500 italic py-2">
                  No written reviews yet. Be the first to review this product!
                </p>
              ) : (
                productReviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-3 bg-neutral-50 rounded-lg border border-neutral-200"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-neutral-800">
                          {rev.customerName}
                        </span>
                        {rev.verifiedPurchase && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-semibold">
                            <CheckCircle2 className="w-3 h-3" />
                            Verified Purchase
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-neutral-400">{rev.date}</span>
                    </div>
                    <div className="flex text-amber-400 mb-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${
                            i < rev.rating ? 'fill-current' : 'text-neutral-300'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-neutral-700">{rev.comment}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
