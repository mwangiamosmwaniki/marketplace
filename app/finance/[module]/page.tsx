"use client";

import { useParams } from "next/navigation";
import App from "../../../src/App";

const sections = {
  overview: "overview",
  dashboard: "overview",
  orders: "orders",
  payments: "payments",
  refunds: "refunds",
  payouts: "payouts",
  ledger: "ledger",
  reconciliation: "reconciliation",
  reports: "reports",
} as const;

export default function FinanceModulePage() {
  const params = useParams<{ module: string }>();
  const section = sections[params.module as keyof typeof sections];

  return (
    <App initialView="finance" initialFinanceSection={section || "overview"} />
  );
}
