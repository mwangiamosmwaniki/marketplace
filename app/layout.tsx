import type { Metadata } from "next";
import "../src/index.css";

export const metadata: Metadata = {
  title: "ShelterHub",
  description:
    "Kenya's leading multi-vendor e-commerce marketplace platform featuring Customer Storefront, Seller Center, Admin Control Hub, M-Pesa payments, order splitting, and RESTful APIs.",
  openGraph: {
    title: "ShelterHub",
    description:
      "Kenya's leading multi-vendor e-commerce marketplace platform featuring Customer Storefront, Seller Center, Admin Control Hub, M-Pesa payments, order splitting, and RESTful APIs.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
