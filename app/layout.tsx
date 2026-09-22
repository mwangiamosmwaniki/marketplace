import type { Metadata } from "next";
import "../src/index.css";

export const metadata: Metadata = {
  title: "KESALES Marketplace",
  description: "Kenya's multi-vendor marketplace",
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
