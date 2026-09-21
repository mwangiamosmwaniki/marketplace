import React, { useState, useEffect } from 'react';
import { useMarketplace } from '../../context/MarketplaceContext';
import { ProductCard } from './ProductCard';
import { Zap, Clock, ArrowRight } from 'lucide-react';
import { Product } from '../../types';

interface FlashSalesSectionProps {
  onViewProduct: (product: Product) => void;
}

export const FlashSalesSection: React.FC<FlashSalesSectionProps> = ({ onViewProduct }) => {
  const { products } = useMarketplace();
  const flashProducts = products.filter((p) => p.isFlashSale && p.status === 'active');

  // Countdown timer state: 8 hours, 42 minutes, 19 seconds remaining
  const [timeLeft, setTimeLeft] = useState({
    hours: 8,
    minutes: 42,
    seconds: 19,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return { hours: 24, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    <div
      id="flash-sales-section"
      className="bg-white rounded-lg border border-neutral-200 overflow-hidden shadow-xs my-6"
    >
      {/* Flash Sale Banner Header */}
      <div className="bg-gradient-to-r from-red-600 via-red-500 to-amber-500 text-white p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-1.5 rounded-full flex items-center justify-center animate-pulse">
            <Zap className="w-5 h-5 text-amber-200 fill-current" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm sm:text-base tracking-wide uppercase flex items-center gap-2">
              Flash Deals
            </h3>
            <p className="text-[11px] text-white/90">Daily curated top discounts with limited stock</p>
          </div>
        </div>

        {/* Live Countdown Timer */}
        <div className="flex items-center gap-2 text-xs font-bold">
          <Clock className="w-4 h-4 text-amber-200" />
          <span className="text-[11px] text-white/90">Time Left:</span>
          <div className="flex gap-1 text-neutral-900 font-mono">
            <span className="bg-white px-2 py-1 rounded shadow-xs">{pad(timeLeft.hours)}h</span>
            <span className="text-white font-bold self-center">:</span>
            <span className="bg-white px-2 py-1 rounded shadow-xs">{pad(timeLeft.minutes)}m</span>
            <span className="text-white font-bold self-center">:</span>
            <span className="bg-white px-2 py-1 rounded shadow-xs">{pad(timeLeft.seconds)}s</span>
          </div>
        </div>
      </div>

      {/* Product Grid */}
      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {flashProducts.slice(0, 4).map((prod) => (
          <ProductCard key={prod.id} product={prod} onViewProduct={onViewProduct} />
        ))}
      </div>
    </div>
  );
};
