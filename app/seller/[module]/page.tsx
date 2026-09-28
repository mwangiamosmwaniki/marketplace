"use client";

import { useParams } from "next/navigation";
import App from "../../../src/App";

const tabs = {
  dashboard: "dashboard",
  products: "products",
  inventory: "inventory",
  orders: "orders",
  payouts: "payouts",
  verification: "verification",
  settings: "settings",
} as const;

export default function SellerModulePage() {
  const params = useParams<{ module: string }>();
  const tab = tabs[params.module as keyof typeof tabs];

  return <App initialView="seller" initialSellerTab={tab || "dashboard"} />;
}
