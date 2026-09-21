import React from 'react';
import { useMarketplace } from '../../context/MarketplaceContext';
import { Star, ShieldCheck, ShoppingCart, Eye } from 'lucide-react';
import { Product, Seller } from '../../types';

interface ProductCardProps {
  product: Product;
  onViewProduct: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onViewProduct }) => {
  const { sellers, addToCart, formatKSh } = useMarketplace();
  const seller = sellers.find((s: Seller) => s.id === product.sellerId);

  const discountPercent = product.discountPrice
    ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
    : 0;

  const currentPrice = product.discountPrice || product.price;

  return (
    <div
      id={`product-card-${product.id}`}
      className="group bg-white rounded-lg border border-neutral-200 overflow-hidden hover:shadow-lg transition-all duration-200 flex flex-col justify-between"
    >
      <div>
        {/* Product Image Container */}
        <div
          className="relative aspect-square overflow-hidden bg-neutral-50 cursor-pointer"
          onClick={() => onViewProduct(product)}
        >
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            referrerPolicy="no-referrer"
            loading="lazy"
          />

          {/* Discount Badge */}
          {discountPercent > 0 && (
            <div className="absolute top-2 left-2 bg-amber-500 text-white font-bold text-xs px-2 py-1 rounded shadow-sm">
              -{discountPercent}%
            </div>
          )}

          {/* Flash Sale Badge */}
          {product.isFlashSale && (
            <div className="absolute top-2 right-2 bg-red-600 text-white font-semibold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded shadow-sm">
              Flash Deal
            </div>
          )}

          {/* Quick View Overlay Button */}
          <button
            id={`btn-quickview-${product.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onViewProduct(product);
            }}
            className="absolute bottom-2 right-2 bg-white/90 hover:bg-white text-neutral-800 p-2 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
            title="Quick view"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>

        {/* Product Information */}
        <div className="p-3">
          {/* Seller / Brand Tag */}
          <div className="flex items-center gap-1 text-[11px] text-neutral-500 mb-1">
            {seller?.businessName.includes('Official') && (
              <span className="inline-flex items-center text-blue-600 font-semibold gap-0.5">
                <ShieldCheck className="w-3 h-3" />
                Official Store
              </span>
            )}
            {!seller?.businessName.includes('Official') && (
              <span className="truncate">{seller?.businessName || 'Verified Seller'}</span>
            )}
          </div>

          {/* Title */}
          <h3
            onClick={() => onViewProduct(product)}
            className="text-sm font-medium text-neutral-900 line-clamp-2 hover:text-amber-600 cursor-pointer min-h-[40px]"
            title={product.name}
          >
            {product.name}
          </h3>

          {/* Pricing */}
          <div className="mt-2 flex items-baseline gap-2 flex-wrap">
            <span className="text-base font-bold text-neutral-900">
              {formatKSh(currentPrice)}
            </span>
            {product.discountPrice && (
              <span className="text-xs text-neutral-400 line-through">
                {formatKSh(product.price)}
              </span>
            )}
          </div>

          {/* Ratings & Stock info */}
          <div className="mt-2 flex items-center justify-between text-xs text-neutral-500">
            <div className="flex items-center gap-1">
              <div className="flex text-amber-400">
                <Star className="w-3.5 h-3.5 fill-current" />
              </div>
              <span className="font-semibold text-neutral-700">{product.rating}</span>
              <span className="text-[11px] text-neutral-400">({product.reviewsCount})</span>
            </div>

            {product.stock <= 5 && product.stock > 0 && (
              <span className="text-[11px] text-red-600 font-medium">
                Only {product.stock} left
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Add To Cart Button */}
      <div className="p-3 pt-0">
        <button
          id={`btn-add-cart-${product.id}`}
          onClick={() => addToCart(product, product.variants ? product.variants[0] : undefined)}
          className="w-full bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-xs font-semibold py-2 px-3 rounded flex items-center justify-center gap-1.5 transition-colors shadow-sm"
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          Add to Cart
        </button>
      </div>
    </div>
  );
};
