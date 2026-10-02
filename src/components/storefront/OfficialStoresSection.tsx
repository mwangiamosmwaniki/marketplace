import React from 'react';
import { useApp } from '../../context/AppContext';
import { ShieldCheck, ArrowRight } from 'lucide-react';

interface OfficialStoresSectionProps {
  onSelectBrand: (brandId: string) => void;
}

export const OfficialStoresSection: React.FC<OfficialStoresSectionProps> = ({
  onSelectBrand,
}) => {
  const { brands } = useApp();

  return (
    <div
      id="official-stores-section"
      className="bg-white rounded-lg border border-neutral-200 p-4 shadow-xs my-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-sm sm:text-base text-neutral-900">
            Official Brand Stores & Authorised Retailers
          </h3>
        </div>
        <span className="text-xs text-neutral-500 font-medium hidden sm:inline">
          100% Genuine Products with Manufacturer Warranty
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {brands.map((brand) => (
          <button
            key={brand.id}
            onClick={() => onSelectBrand(brand.id)}
            className="flex flex-col items-center justify-center p-3 rounded-lg border border-neutral-200 hover:border-blue-500 hover:shadow-xs transition-all bg-neutral-50 hover:bg-white group"
          >
            <div className="w-12 h-12 flex items-center justify-center mb-2">
              <img
                src={brand.logo}
                alt={brand.name}
                className="max-h-8 max-w-full object-contain filter group-hover:brightness-90 transition-all"
                referrerPolicy="no-referrer"
              />
            </div>
            <span className="text-xs font-bold text-neutral-800 group-hover:text-blue-600 truncate w-full text-center">
              {brand.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
