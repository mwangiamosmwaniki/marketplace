import React from "react";
import { ShieldCheck, Truck, RotateCcw, Headphones, Mail } from "lucide-react";
import { PublicPageSlug } from "./PublicInfoPage";

interface FooterProps {
  onOpenPage: (slug: PublicPageSlug) => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenPage }) => {
  return (
    <footer
      id="main-footer"
      className="bg-neutral-900 text-neutral-300 mt-16 border-t border-neutral-800"
    >
      {/* 1. Value Proposition Banner */}
      <div className="border-b border-neutral-800 py-8 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center text-amber-500">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Delivery Across Kenya
              </h4>
              <p className="text-[11px] text-neutral-400">
                Multiple delivery options available
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center text-emerald-500">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Verified Marketplace Sellers
              </h4>
              <p className="text-[11px] text-neutral-400">
                Seller and product information is displayed clearly
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center text-blue-500">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Returns Made Clear
              </h4>
              <p className="text-[11px] text-neutral-400">
                Review the return policy before purchase
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center text-amber-500">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Customer Support
              </h4>
              <p className="text-[11px] text-neutral-400">
                Helpline: +254 700 000 000
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Directory Links */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-xs">
          {/* Col 1: Customer Care */}
          <div>
            <h5 className="text-white font-bold uppercase tracking-wider mb-3">
              Customer Care
            </h5>
            <ul className="space-y-2 text-neutral-400">
              <li>
                <button
                  onClick={() => onOpenPage("help")}
                  className="hover:text-amber-400 text-left"
                >
                  Help Center & FAQs
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenPage("how-to-shop")}
                  className="hover:text-amber-400 text-left"
                >
                  How to Shop on KESALES
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenPage("delivery")}
                  className="hover:text-amber-400 text-left"
                >
                  Delivery Timelines & Fees
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenPage("disputes")}
                  className="hover:text-amber-400 text-left"
                >
                  Dispute Resolution
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenPage("returns")}
                  className="hover:text-amber-400 text-left"
                >
                  Return & Refund Policy
                </button>
              </li>
            </ul>
          </div>

          {/* Col 2: About KESALES */}
          <div>
            <h5 className="text-white font-bold uppercase tracking-wider mb-3">
              About KESALES
            </h5>
            <ul className="space-y-2 text-neutral-400">
              <li>
                <button
                  onClick={() => onOpenPage("about")}
                  className="hover:text-amber-400 text-left"
                >
                  About Us
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenPage("express")}
                  className="hover:text-amber-400 text-left"
                >
                  KESALES Express
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenPage("terms")}
                  className="hover:text-amber-400 text-left"
                >
                  Terms & Conditions
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenPage("privacy")}
                  className="hover:text-amber-400 text-left"
                >
                  Privacy Notice
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenPage("careers")}
                  className="hover:text-amber-400 text-left"
                >
                  Careers at KESALES
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Make Money With Us */}
          <div>
            <h5 className="text-white font-bold uppercase tracking-wider mb-3">
              Make Money With Us
            </h5>
            <ul className="space-y-2 text-neutral-400">
              <li>
                <button
                  onClick={() => onOpenPage("sell")}
                  className="hover:text-amber-400 text-left"
                >
                  Sell on KESALES (Vendor Center)
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenPage("logistics")}
                  className="hover:text-amber-400 text-left"
                >
                  Become a Logistics Partner
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenPage("pickup-station")}
                  className="hover:text-amber-400 text-left"
                >
                  Open a KESALES Pickup Station
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenPage("affiliate")}
                  className="hover:text-amber-400 text-left"
                >
                  KESALES Affiliate Program
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Payment Methods */}
          <div>
            <h5 className="text-white font-bold uppercase tracking-wider mb-3">
              Payment Methods
            </h5>
            <p className="text-[11px] text-neutral-400 mb-3">
              We accept safe and secure payments via M-Pesa, debit/credit cards,
              and cash on delivery.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="bg-neutral-800 text-emerald-400 font-bold px-2 py-1 rounded text-[11px] border border-neutral-700">
                M-PESA
              </span>
              <span className="bg-neutral-800 text-white font-bold px-2 py-1 rounded text-[11px] border border-neutral-700">
                VISA
              </span>
              <span className="bg-neutral-800 text-white font-bold px-2 py-1 rounded text-[11px] border border-neutral-700">
                Mastercard
              </span>
              <span className="bg-neutral-800 text-amber-400 font-bold px-2 py-1 rounded text-[11px] border border-neutral-700">
                Pay on Delivery
              </span>
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="mt-12 pt-6 border-t border-neutral-800 text-[11px] text-neutral-500 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 KESALES Marketplace Kenya. All rights reserved.</p>
          <div className="flex gap-4">
            <span>Kenya</span>
            <span>•</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
