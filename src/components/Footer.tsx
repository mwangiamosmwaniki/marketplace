import React from 'react';
import { ShieldCheck, Truck, RotateCcw, Headphones, Mail } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer id="main-footer" className="bg-neutral-900 text-neutral-300 mt-16 border-t border-neutral-800">
      {/* 1. Value Proposition Banner */}
      <div className="border-b border-neutral-800 py-8 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center text-amber-500">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Fast Doorstep Delivery
              </h4>
              <p className="text-[11px] text-neutral-400">
                Next-day shipping across all 47 counties
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center text-emerald-500">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                100% Authentic Products
              </h4>
              <p className="text-[11px] text-neutral-400">
                Official manufacturers and verified sellers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center text-blue-500">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Easy 15-Day Free Returns
              </h4>
              <p className="text-[11px] text-neutral-400">
                Instant refund via M-Pesa or bank transfer
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center text-amber-500">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                24/7 Dedicated Support
              </h4>
              <p className="text-[11px] text-neutral-400">Helpline: +254 700 000 000</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Directory Links */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-xs">
          {/* Col 1: Customer Care */}
          <div>
            <h5 className="text-white font-bold uppercase tracking-wider mb-3">Customer Care</h5>
            <ul className="space-y-2 text-neutral-400">
              <li><a href="#help" className="hover:text-amber-400">Help Center & FAQs</a></li>
              <li><a href="#how-to-buy" className="hover:text-amber-400">How to Shop on Jumia</a></li>
              <li><a href="#delivery" className="hover:text-amber-400">Delivery Timelines & Fees</a></li>
              <li><a href="#disputes" className="hover:text-amber-400">Dispute Resolution</a></li>
              <li><a href="#returns" className="hover:text-amber-400">Return & Refund Policy</a></li>
            </ul>
          </div>

          {/* Col 2: About Jumia */}
          <div>
            <h5 className="text-white font-bold uppercase tracking-wider mb-3">About Jumia</h5>
            <ul className="space-y-2 text-neutral-400">
              <li><a href="#about" className="hover:text-amber-400">About Us</a></li>
              <li><a href="#jumia-express" className="hover:text-amber-400">Jumia Express</a></li>
              <li><a href="#terms" className="hover:text-amber-400">Terms & Conditions</a></li>
              <li><a href="#privacy" className="hover:text-amber-400">Privacy Notice</a></li>
              <li><a href="#careers" className="hover:text-amber-400">Careers at Jumia</a></li>
            </ul>
          </div>

          {/* Col 3: Make Money With Us */}
          <div>
            <h5 className="text-white font-bold uppercase tracking-wider mb-3">Make Money With Us</h5>
            <ul className="space-y-2 text-neutral-400">
              <li><a href="#sell" className="hover:text-amber-400">Sell on Jumia (Vendor Center)</a></li>
              <li><a href="#logistics" className="hover:text-amber-400">Become a Logistics Partner</a></li>
              <li><a href="#hub" className="hover:text-amber-400">Open a Jumia Pickup Station</a></li>
              <li><a href="#affiliate" className="hover:text-amber-400">Jumia Affiliate Program</a></li>
            </ul>
          </div>

          {/* Col 4: Payment Methods */}
          <div>
            <h5 className="text-white font-bold uppercase tracking-wider mb-3">Payment Methods</h5>
            <p className="text-[11px] text-neutral-400 mb-3">
              We accept safe and secure payments via M-Pesa, debit/credit cards, and cash on delivery.
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
          <p>© 2026 Jumia Marketplace Kenya. All rights reserved.</p>
          <div className="flex gap-4">
            <span>Kenya</span>
            <span>•</span>
            <span>Nigeria</span>
            <span>•</span>
            <span>Egypt</span>
            <span>•</span>
            <span>Ghana</span>
            <span>•</span>
            <span>Uganda</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
