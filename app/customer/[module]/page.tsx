"use client";

import { useParams } from "next/navigation";
import App from "../../../src/App";

const tabs = {
  orders: "orders",
  wishlist: "wishlist",
  addresses: "addresses",
  returns: "returns",
  payments: "payments",
  security: "security",
} as const;

export default function CustomerModulePage() {
  const params = useParams<{ module: string }>();
  const tab = tabs[params.module as keyof typeof tabs];

  return (
    <App initialView="customer" initialCustomerTab={tab || "orders"} />
  );
}
