import React, { useState, useEffect } from 'react';
import { useMarketplace } from '../../context/MarketplaceContext';
import {
  Smartphone,
  Tv,
  Laptop,
  Shirt,
  Home,
  Sparkles,
  Zap,
  ShieldCheck,
  Truck,
  RotateCcw,
  ChevronRight,
  ArrowRight,
  Store,
} from 'lucide-react';

interface HeroSectionProps {
  onSelectCategory: (categoryId: string) => void;
  onOpenSellerPortal: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onSelectCategory,
  onOpenSellerPortal,
}) => {
  const { categories } = useMarketplace();

  // Slide index
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      id: 1,
      title: 'Mega Flash Sales — Up to 40% Off',
      subtitle: 'Official Flagship Phones, QLED TVs & Wireless Audio with Free Express Delivery',
      tag: 'LIMITED TIME DEALS',
      bgClass: 'from-amber-600 to-orange-600',
      image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800&auto=format&fit=crop&q=80',
      cta: 'Shop Deals Now',
    },
    {
      id: 2,
      title: 'Official Samsung Brand Week',
      subtitle: 'Galaxy S24 Ultra, 4K Smart Screens & Appliances with 24-Month Warranty',
      tag: 'OFFICIAL STORE GUARANTEE',
      bgClass: 'from-blue-700 to-indigo-900',
      image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&auto=format&fit=crop&q=80',
      cta: 'Explore Samsung',
    },
    {
      id: 3,
      title: 'High Performance Computing',
      subtitle: 'Intel Core Ultra & M3 Laptops, 140W GaN Charging & Studio Peripherals',
      tag: 'WORK & GAMING GEAR',
      bgClass: 'from-neutral-900 to-neutral-800',
      image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80',
      cta: 'View Laptops',
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Smartphone':
        return <Smartphone className="w-4 h-4 text-neutral-600" />;
      case 'Tv':
        return <Tv className="w-4 h-4 text-neutral-600" />;
      case 'Laptop':
        return <Laptop className="w-4 h-4 text-neutral-600" />;
      case 'Shirt':
        return <Shirt className="w-4 h-4 text-neutral-600" />;
      case 'Home':
        return <Home className="w-4 h-4 text-neutral-600" />;
      case 'Sparkles':
        return <Sparkles className="w-4 h-4 text-neutral-600" />;
      default:
        return <Zap className="w-4 h-4 text-neutral-600" />;
    }
  };

  return (
    <div id="hero-section" className="grid grid-cols-1 lg:grid-cols-12 gap-4 py-4">
      {/* 1. Category Sidebar (3 cols on desktop) */}
      <div className="hidden lg:block lg:col-span-3 bg-white rounded-lg border border-neutral-200 overflow-hidden shadow-xs">
        <div className="p-3 bg-neutral-50 border-b border-neutral-200 font-bold text-xs uppercase tracking-wider text-neutral-700 flex items-center justify-between">
          <span>Categories</span>
          <span className="text-[10px] text-amber-600 font-normal">All 6 Hubs</span>
        </div>

        <div className="divide-y divide-neutral-100 py-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-amber-50/50 hover:text-amber-700 transition-colors text-left group"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1 rounded bg-neutral-100 group-hover:bg-amber-100 transition-colors">
                  {getCategoryIcon(cat.icon)}
                </div>
                <span className="text-xs font-medium text-neutral-800 group-hover:text-amber-700">
                  {cat.name}
                </span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-neutral-300 group-hover:text-amber-600" />
            </button>
          ))}
        </div>
      </div>

      {/* 2. Hero Slider Banner (6 cols on desktop) */}
      <div className="lg:col-span-6 relative rounded-lg overflow-hidden min-h-[340px] flex flex-col justify-between shadow-xs">
        {slides.map((slide, idx) => (
          <div
            key={slide.id}
            className={`absolute inset-0 bg-gradient-to-r ${
              slide.bgClass
            } text-white p-6 sm:p-8 flex flex-col justify-between transition-opacity duration-700 ${
              currentSlide === idx ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          >
            {/* Background ambient glow image */}
            <div className="absolute top-0 right-0 w-1/2 h-full opacity-25 overflow-hidden pointer-events-none">
              <img
                src={slide.image}
                alt="Banner ambient"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>

            <div>
              <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-white/20 backdrop-blur-xs px-2.5 py-0.5 rounded text-amber-200 mb-2">
                {slide.tag}
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold max-w-md leading-tight">
                {slide.title}
              </h2>
              <p className="text-xs sm:text-sm text-white/80 max-w-sm mt-2 leading-relaxed">
                {slide.subtitle}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => onSelectCategory('cat-phones')}
                className="bg-amber-500 hover:bg-amber-400 text-neutral-900 font-extrabold text-xs py-2.5 px-5 rounded-lg shadow flex items-center gap-1.5 transition-transform active:scale-95"
              >
                <span>{slide.cta}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {/* Slide Indicators */}
        <div className="absolute bottom-3 right-4 z-20 flex gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                currentSlide === i ? 'bg-amber-400 w-6' : 'bg-white/50'
              }`}
            />
          ))}
        </div>
      </div>

      {/* 3. Promotional Trust Cards (3 cols on desktop) */}
      <div className="lg:col-span-3 flex flex-col gap-3">
        {/* Card 1: Become a Seller */}
        <div className="p-4 bg-white rounded-lg border border-neutral-200 flex-1 flex flex-col justify-between shadow-xs hover:border-amber-400 transition-colors">
          <div>
            <div className="flex items-center gap-2 text-amber-600 mb-1">
              <Store className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                Sell on KESALES
              </span>
            </div>
            <h4 className="text-xs font-bold text-neutral-800 mb-1">
              Reach 5M+ Buyers Across Kenya
            </h4>
            <p className="text-[11px] text-neutral-500">
              Open your vendor storefront, list products with multi-SKU variations, and receive direct M-Pesa payouts.
            </p>
          </div>
          <button
            onClick={onOpenSellerPortal}
            className="mt-3 text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1"
          >
            <span>Open Seller Center</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Card 2: Express Shipping */}
        <div className="p-4 bg-white rounded-lg border border-neutral-200 flex-1 flex flex-col justify-between shadow-xs">
          <div className="space-y-2 text-xs">
            <div className="flex items-start gap-2">
              <Truck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-neutral-800">KESALES Express</span>
                <p className="text-[11px] text-neutral-500">
                  Fast next-day delivery on thousands of products.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <RotateCcw className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-neutral-800">15-Day Free Returns</span>
                <p className="text-[11px] text-neutral-500">
                  Full refund via M-Pesa or bank transfer.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-neutral-800">100% Authentic</span>
                <p className="text-[11px] text-neutral-500">
                  Official manufacturer warranty on all items.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
