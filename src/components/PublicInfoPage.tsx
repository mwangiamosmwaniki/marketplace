import React from 'react';
import {
  ArrowLeft,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileCheck2,
  Headphones,
  LockKeyhole,
  MapPin,
  PackageCheck,
  Percent,
  RefreshCcw,
  ShieldCheck,
  ShoppingBag,
  Store,
  Truck,
} from 'lucide-react';

export type PublicPageSlug =
  | 'help'
  | 'how-to-shop'
  | 'delivery'
  | 'disputes'
  | 'returns'
  | 'about'
  | 'express'
  | 'terms'
  | 'privacy'
  | 'careers'
  | 'sell'
  | 'logistics'
  | 'pickup-station'
  | 'affiliate';

interface PublicInfoPageProps {
  slug: PublicPageSlug;
  onBack: () => void;
  onOpenAuth: (tab?: 'login' | 'register_customer' | 'register_seller') => void;
}

type PageContent = {
  eyebrow: string;
  title: string;
  intro: string;
  icon: React.ElementType;
  sections: { title: string; body: string; bullets?: string[] }[];
  action?: { label: string; tab?: 'login' | 'register_customer' | 'register_seller' };
};

const pages: Record<PublicPageSlug, PageContent> = {
  help: {
    eyebrow: 'Customer Care',
    title: 'Help Center & FAQs',
    intro: 'Find clear answers about shopping, payments, delivery, returns, and account access on ShelterHub.',
    icon: Headphones,
    sections: [
      { title: 'How can I place an order?', body: 'Search for a product, choose any available variant, add it to your cart, and complete checkout with your delivery and payment details.' },
      { title: 'Where is my order?', body: 'Open Account, choose Orders, and select an order to see its latest fulfillment status and tracking information.' },
      { title: 'Which payments are accepted?', body: 'ShelterHub supports M-Pesa, cards, bank transfer, and cash on delivery where the option is available for your order.' },
      { title: 'Need more help?', body: 'Contact the ShelterHub support team with your order number, registered email, and a short description of the issue.' },
    ],
  },
  'how-to-shop': {
    eyebrow: 'Customer Care',
    title: 'How to Shop on ShelterHub',
    intro: 'From discovery to doorstep delivery, shopping on ShelterHub is designed to be simple and transparent.',
    icon: ShoppingBag,
    sections: [
      { title: '1. Discover', body: 'Use search, categories, brand filters, price ranges, and delivery filters to find the right product.' },
      { title: '2. Compare', body: 'Review product details, seller information, available variants, stock, warranty, returns, ratings, and delivery options.' },
      { title: '3. Checkout', body: 'Add your delivery address, choose home delivery or a pickup station, apply an eligible coupon, and select a payment method.' },
      { title: '4. Track and review', body: 'Follow your order in Account, request support when needed, and share a review after delivery.' },
    ],
  },
  delivery: {
    eyebrow: 'Customer Care',
    title: 'Delivery Timelines & Fees',
    intro: 'Delivery options and charges depend on your county, town, order size, and selected delivery method.',
    icon: Truck,
    sections: [
      { title: 'Nairobi', body: 'Home delivery is typically same day to 24 hours. The standard home delivery fee is KSh 250.' },
      { title: 'Other counties', body: 'Mombasa, Nakuru, Kisumu, and Eldoret generally arrive within 1 to 3 business days. Fees are shown at checkout.' },
      { title: 'Pickup stations', body: 'Choose a ShelterHub Hub, Station, or Express location during checkout. Pickup fees and availability are shown for your selected county.' },
      { title: 'ShelterHub Express', body: 'Eligible products are clearly marked and prioritized for faster fulfillment in supported locations.' },
    ],
  },
  disputes: {
    eyebrow: 'Customer Care',
    title: 'Dispute Resolution',
    intro: 'We help customers and sellers resolve order, payment, delivery, and product concerns fairly.',
    icon: ShieldCheck,
    sections: [
      { title: 'Start with support', body: 'Open a support ticket from your account and include the order number, evidence, and the resolution you are requesting.' },
      { title: 'Review process', body: 'ShelterHub may contact the customer, seller, courier, or payment provider to verify the facts.' },
      { title: 'Possible outcomes', body: 'Depending on the evidence, we may arrange replacement, return, refund, seller correction, or delivery investigation.' },
      { title: 'Keep your records', body: 'Keep photos, delivery confirmations, payment references, and messages until the case is closed.' },
    ],
  },
  returns: {
    eyebrow: 'Customer Care',
    title: 'Return & Refund Policy',
    intro: 'Eligible products can be returned within the period shown on the product page and order details.',
    icon: RefreshCcw,
    sections: [
      { title: 'Request a return', body: 'Open Account, select the order, choose the item, and submit the reason and any supporting details.' },
      { title: 'Eligibility', body: 'Items should be unused where applicable, include original accessories and packaging, and match the selected return reason.' },
      { title: 'Inspection', body: 'A return may be collected or taken to a designated location for inspection before approval.' },
      { title: 'Refunds', body: 'Approved refunds are sent through the applicable payment method, including M-Pesa or bank transfer where supported.' },
    ],
  },
  about: {
    eyebrow: 'About ShelterHub',
    title: 'About Us',
    intro: 'ShelterHub is a Kenya-focused multi-vendor marketplace connecting customers with trusted sellers and useful delivery options.',
    icon: Store,
    sections: [
      { title: 'A practical marketplace', body: 'We bring electronics, phones, computing, fashion, home, and everyday essentials into one dependable shopping experience.' },
      { title: 'Built around trust', body: 'Seller governance, product information, buyer protection, and visible order status help customers shop with confidence.' },
      { title: 'Made for local commerce', body: 'ShelterHub supports Kenyan sellers, Kenyan payment habits, local delivery zones, and pickup locations across the country.' },
    ],
  },
  express: {
    eyebrow: 'About ShelterHub',
    title: 'ShelterHub Express',
    intro: 'ShelterHub Express is our fast-fulfillment experience for eligible products and supported delivery locations.',
    icon: PackageCheck,
    sections: [
      { title: 'Fast fulfillment', body: 'Express-eligible products are prioritized for dispatch and show an Express label on the storefront.' },
      { title: 'Clear expectations', body: 'The available delivery window is confirmed using your location and selected delivery method at checkout.' },
      { title: 'Reliable handoff', body: 'Track dispatch and delivery progress from your account after your order is confirmed.' },
    ],
  },
  terms: {
    eyebrow: 'About ShelterHub',
    title: 'Terms & Conditions',
    intro: 'These terms describe the rules for using ShelterHub as a customer, seller, or visitor.',
    icon: FileCheck2,
    sections: [
      { title: 'Using the marketplace', body: 'Use accurate account information, protect your credentials, and do not misuse the marketplace or another person’s account.' },
      { title: 'Orders and listings', body: 'Product availability, pricing, delivery, warranties, and seller obligations are governed by the information shown at the time of purchase.' },
      { title: 'Fair participation', body: 'Fraud, abusive behavior, manipulated reviews, counterfeit goods, and policy evasion may lead to account or listing action.' },
      { title: 'Updates', body: 'ShelterHub may update these terms when the service, law, or marketplace policies change.' },
    ],
  },
  privacy: {
    eyebrow: 'About ShelterHub',
    title: 'Privacy Notice',
    intro: 'This notice explains the types of information ShelterHub uses to provide and improve marketplace services.',
    icon: LockKeyhole,
    sections: [
      { title: 'Information we use', body: 'This may include account details, delivery information, order history, support messages, and payment references needed to process your order.' },
      { title: 'Why we use it', body: 'We use information to authenticate accounts, fulfill orders, provide support, prevent abuse, and communicate important service updates.' },
      { title: 'Your choices', body: 'Keep your account information current and contact support about access, correction, or account-related questions.' },
      { title: 'Payment safety', body: 'Payment credentials are handled through the selected payment provider. ShelterHub demo checkout does not represent a live payment account.' },
    ],
  },
  careers: {
    eyebrow: 'About ShelterHub',
    title: 'Careers at ShelterHub',
    intro: 'Help us build useful, trusted commerce experiences for customers and businesses across Africa.',
    icon: BriefcaseBusiness,
    sections: [
      { title: 'What we value', body: 'We value ownership, clear communication, customer empathy, responsible experimentation, and respect for the people we serve.' },
      { title: 'Teams', body: 'Opportunities may span product, engineering, operations, commercial partnerships, support, logistics, and seller success.' },
      { title: 'Express your interest', body: 'Send a short introduction and the role or team you are interested in to careers@shelterhub.ke.' },
    ],
  },
  sell: {
    eyebrow: 'Make Money With Us',
    title: 'Sell on ShelterHub',
    intro: 'Reach more customers with seller tools for catalog, inventory, fulfillment, support, and payouts.',
    icon: Store,
    sections: [
      { title: 'Open your store', body: 'Register a seller account, provide your business details, and complete the approval process.' },
      { title: 'Manage your catalog', body: 'Create products with accurate pricing, stock, images, variants, warranty, and return information.' },
      { title: 'Grow with confidence', body: 'Use order tracking, inventory tools, seller insights, and payout requests to run your store.' },
    ],
    action: { label: 'Register as a seller', tab: 'register_seller' },
  },
  logistics: {
    eyebrow: 'Make Money With Us',
    title: 'Become a Logistics Partner',
    intro: 'Support reliable delivery for ShelterHub customers and sellers across local routes and counties.',
    icon: Truck,
    sections: [
      { title: 'Partner profile', body: 'Share your operating area, vehicle or rider capacity, contact details, and availability.' },
      { title: 'Work that matters', body: 'Collect, route, and deliver marketplace orders while keeping customers informed at every handoff.' },
      { title: 'Get started', body: 'Contact partnerships@shelterhub.ke with your county, town, and logistics experience.' },
    ],
  },
  'pickup-station': {
    eyebrow: 'Make Money With Us',
    title: 'Open a ShelterHub Pickup Station',
    intro: 'Turn a suitable local business location into a convenient collection point for ShelterHub customers.',
    icon: MapPin,
    sections: [
      { title: 'Suitable locations', body: 'We look for accessible, secure locations near customers with dependable opening hours and storage capacity.' },
      { title: 'Station responsibilities', body: 'Receive parcels, verify collection details, store orders securely, and provide a smooth customer handoff.' },
      { title: 'Apply', body: 'Send your location, operating hours, contact information, and a short description to stations@shelterhub.ke.' },
    ],
  },
  affiliate: {
    eyebrow: 'Make Money With Us',
    title: 'ShelterHub Affiliate Program',
    intro: 'Share products you trust and earn from eligible purchases referred through your approved affiliate links.',
    icon: Percent,
    sections: [
      { title: 'How it works', body: 'Apply, receive approved tracking links, share useful product recommendations, and monitor qualifying referrals.' },
      { title: 'Create value', body: 'Successful affiliates focus on honest comparisons, relevant audiences, and helpful content rather than misleading promotions.' },
      { title: 'Join the program', body: 'Email partnerships@shelterhub.ke with your audience, channels, and the product categories you cover.' },
    ],
  },
};

export const PublicInfoPage: React.FC<PublicInfoPageProps> = ({ slug, onBack, onOpenAuth }) => {
  const page = pages[slug];
  const Icon = page.icon;

  return (
    <section className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
      <button onClick={onBack} className="inline-flex items-center gap-2 text-xs font-bold text-neutral-600 hover:text-amber-700 mb-8">
        <ArrowLeft className="w-4 h-4" />
        Back to shopping
      </button>

      <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="bg-neutral-950 text-white p-6 sm:p-10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500 text-neutral-950 flex items-center justify-center shrink-0">
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-amber-400 font-bold">{page.eyebrow}</p>
              <h1 className="text-2xl sm:text-3xl font-black mt-2">{page.title}</h1>
              <p className="text-sm text-neutral-300 mt-3 max-w-2xl leading-relaxed">{page.intro}</p>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-10 grid gap-5 sm:grid-cols-2">
          {page.sections.map((section) => (
            <article key={section.title} className="border border-neutral-200 rounded-xl p-5">
              <h2 className="font-extrabold text-neutral-900 text-sm">{section.title}</h2>
              <p className="text-sm text-neutral-600 leading-relaxed mt-2">{section.body}</p>
              {section.bullets && (
                <ul className="mt-3 space-y-2 text-sm text-neutral-600">
                  {section.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />{bullet}</li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>

        {page.action && (
          <div className="border-t border-neutral-200 bg-neutral-50 px-6 py-5 sm:px-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-extrabold text-sm text-neutral-900">Ready to get started?</h2>
              <p className="text-xs text-neutral-500 mt-1">Create your ShelterHub seller account and begin setting up your store.</p>
            </div>
            <button onClick={() => onOpenAuth(page.action?.tab)} className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-xs px-4 py-2.5 rounded-lg">
              {page.action.label}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
