import { Role } from "../types";

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: ["*"],
  product_admin: [
    "products.view",
    "products.create",
    "products.edit",
    "products.approve",
    "categories.manage",
    "brands.manage",
    "reports.view",
  ],
  seller_admin: [
    "users.view",
    "sellers.view",
    "sellers.approve",
    "sellers.suspend",
    "kyc.verify",
    "reports.view",
  ],
  finance_admin: [
    "finance.dashboard.view",
    "orders.view_financial",
    "payments.view",
    "payments.reconcile",
    "refunds.view",
    "refunds.approve",
    "refunds.reject",
    "refunds.process",
    "payouts.view",
    "payouts.approve",
    "payouts.hold",
    "payouts.reject",
    "payouts.process",
    "ledger.view",
    "ledger.adjust",
    "reports.view",
    "reports.export",
  ],
  logistics_admin: [
    "orders.view",
    "orders.dispatch",
    "delivery.zones",
    "delivery.track",
    "reports.view",
  ],
  marketing_admin: [
    "marketing.coupons",
    "marketing.promotions",
    "reports.view",
  ],
  support_admin: ["users.view", "orders.view", "support.manage"],
  seller: [
    "products.manage",
    "orders.fulfill",
    "payouts.request",
    "inventory.manage",
  ],
  customer: [
    "orders.view",
    "orders.create",
    "reviews.create",
    "wishlist.manage",
  ],
};

export const hasPermission = (role: Role | undefined, permission: string) => {
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes("*") || permissions.includes(permission);
};

export const hasAnyPermission = (
  role: Role | undefined,
  permissions: string[],
) => permissions.some((permission) => hasPermission(role, permission));

export const hasAllPermissions = (
  role: Role | undefined,
  permissions: string[],
) => permissions.every((permission) => hasPermission(role, permission));

export const isFinanceAdmin = (role: Role | undefined) =>
  role === "finance_admin";

export const isGeneralAdmin = (role: Role | undefined) =>
  [
    "super_admin",
    "product_admin",
    "seller_admin",
    "logistics_admin",
    "marketing_admin",
    "support_admin",
  ].includes(role || "");

export const FINANCE_NAV = [
  { label: "Dashboard", section: "overview", group: "Overview" },
  { label: "Orders", section: "orders", group: "Transactions" },
  { label: "Payments", section: "payments", group: "Transactions" },
  { label: "Refunds", section: "refunds", group: "Transactions" },
  { label: "Payouts", section: "payouts", group: "Settlements" },
  { label: "Reconciliation", section: "reconciliation", group: "Settlements" },
  { label: "Ledger", section: "ledger", group: "Accounting" },
  { label: "Reports", section: "reports", group: "Reporting" },
] as const;
