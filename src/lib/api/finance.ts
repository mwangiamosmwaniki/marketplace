import { apiRequest } from "./client";

export type FinanceSummary = {
  gross_merchandise_value: number;
  total_commissions: number;
  clearing_balance: number;
  escrow_reserve: number;
  disbursed_payouts: number;
  vat_liability_estimated: number;
  active_currency: string;
  computed_at: string;
};

export type FinanceLedgerEntry = {
  id: string;
  transaction_number: string;
  type: string;
  reference_id: string;
  description: string;
  status: string;
  posted_at: string;
};

export function getFinanceSummary() {
  return apiRequest<FinanceSummary>("/finance/reports");
}

export function getFinanceLedger() {
  return apiRequest<{ data: FinanceLedgerEntry[] }>("/finance/ledger");
}
