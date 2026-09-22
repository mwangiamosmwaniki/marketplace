"use client";

import { useParams } from "next/navigation";
import App from "../../../src/App";

const tabs = {
  users: "users",
  roles: "roles",
  security: "security",
  audit: "audit",
  system: "system",
  sellers: "sellers",
  catalog: "catalog",
  orders: "orders",
  marketing: "coupons",
  logistics: "logistics",
  settings: "settings",
} as const;

type AdminModule = keyof typeof tabs;

export default function AdminModulePage() {
  const params = useParams<{ module: string }>();
  const module = params.module as AdminModule;
  const tab = tabs[module];

  return <App initialView="admin" initialAdminTab={tab || "analytics"} />;
}
