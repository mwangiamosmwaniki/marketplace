import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileText,
  Search,
  X,
} from "lucide-react";
import { useMarketplace } from "../../../context/MarketplaceContext";
import { SellerPayoutRequest } from "../../../types";
import { FINANCE_NAV, hasPermission } from "../../../config/permissions";

export type FinanceSection = (typeof FINANCE_NAV)[number]["section"];

const statusLabel = (status: string) => status.replace(/_/g, " ");
const statusClass = (status: string) => {
  if (["approved", "processed", "paid", "completed"].includes(status))
    return "bg-emerald-100 text-emerald-800";
  if (["rejected", "failed", "cancelled"].includes(status))
    return "bg-red-100 text-red-800";
  if (["held", "processing", "under_review"].includes(status))
    return "bg-blue-100 text-blue-800";
  return "bg-amber-100 text-amber-800";
};

export const FinanceAdminPanel: React.FC<{ section?: FinanceSection }> = ({
  section = "overview",
}) => {
  const {
    authUser,
    orders,
    payouts,
    returns,
    ledger,
    formatKSh,
    approvePayout,
    processApprovedPayout,
    rejectPayout,
    updateReturnStatus,
    processReturnRefund,
  } = useMarketplace();
  const canApproveRefunds = hasPermission(authUser?.role, "refunds.approve");
  const canProcessRefunds = hasPermission(authUser?.role, "refunds.process");
  const canApprovePayouts = hasPermission(authUser?.role, "payouts.approve");
  const canProcessPayouts = hasPermission(authUser?.role, "payouts.process");
  const [selectedPayout, setSelectedPayout] =
    useState<SellerPayoutRequest | null>(null);
  const [query, setQuery] = useState("");

  const paymentsReceived = orders
    .filter((order) => order.paymentStatus === "paid")
    .reduce((sum, order) => sum + order.grandTotal, 0);
  const commissions = orders.reduce(
    (sum, order) =>
      sum +
      order.sellerSubOrders.reduce(
        (subTotal, subOrder) => subTotal + subOrder.commissionTotal,
        0,
      ),
    0,
  );
  const refundQueue = returns.filter((item) =>
    ["pending_review", "approved", "item_received"].includes(item.status),
  );
  const payoutQueue = payouts.filter((payout) => payout.status === "pending");
  const exceptions = orders.filter(
    (order) => order.paymentStatus === "paid" && !order.paymentReference,
  );
  const visiblePayouts = useMemo(
    () =>
      payouts.filter((payout) =>
        `${payout.payoutNumber} ${payout.sellerName} ${payout.accountDetails}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [payouts, query],
  );

  return (
    <div className="px-4 py-6 space-y-5 text-xs">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
          Finance administration
        </p>
        <h2 className="text-xl font-black text-neutral-900">
          Finance operations
        </h2>
        <p className="text-neutral-500 mt-1">
          Demo dataset. Balances and provider statuses are not authoritative
          until a backend ledger is connected.
        </p>
      </div>

      {section === "overview" && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              ["Payments received", formatKSh(paymentsReceived)],
              ["Platform commission", formatKSh(commissions)],
              [
                "Seller payable",
                formatKSh(
                  payouts.reduce((sum, payout) => sum + payout.amount, 0),
                ),
              ],
              ["Refunds", String(refundQueue.length)],
              ["Pending reconciliation", String(exceptions.length)],
            ].map(([label, value]) => (
              <div
                key={label}
                className="bg-white border border-neutral-200 rounded-xl p-4"
              >
                <span className="text-neutral-500">{label}</span>
                <strong className="block text-lg mt-1">{value}</strong>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-neutral-200 rounded-xl p-4">
              <h3 className="font-bold text-sm mb-3">Needs attention</h3>
              <div className="space-y-2">
                {[
                  ["Payouts awaiting approval", payoutQueue.length],
                  ["Refunds awaiting review", refundQueue.length],
                  ["Payment exceptions", exceptions.length],
                  ["Held settlements", 0],
                ].map(([label, value]) => (
                  <div
                    key={String(label)}
                    className="w-full flex justify-between p-3 rounded-lg bg-neutral-50"
                  >
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white border border-neutral-200 rounded-xl p-4">
              <h3 className="font-bold text-sm mb-3">Finance data status</h3>
              <div className="space-y-2 text-neutral-600">
                <div className="flex justify-between">
                  <span>Dataset</span>
                  <strong className="text-neutral-900">Demo data</strong>
                </div>
                <div className="flex justify-between">
                  <span>Payment records</span>
                  <strong className="text-neutral-900">{orders.length}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Journal entries</span>
                  <strong className="text-neutral-900">{ledger.length}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Provider reconciliation</span>
                  <strong className="text-amber-700">Not connected</strong>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {section === "payments" && (
        <div className="bg-white border border-neutral-200 rounded-xl overflow-x-auto">
          <div className="p-4 border-b border-neutral-200">
            <h3 className="font-bold text-sm">Payments</h3>
            <p className="text-neutral-500">
              Demo payment records. Provider references are not server-verified.
            </p>
          </div>
          <table className="w-full text-left">
            <thead className="bg-neutral-50 uppercase text-[10px] text-neutral-500">
              <tr>
                <th className="p-3">Order</th>
                <th className="p-3">Provider</th>
                <th className="p-3">Reference</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="p-3 font-mono">{order.orderNumber}</td>
                  <td className="p-3">{order.paymentMethod}</td>
                  <td className="p-3 font-mono">
                    {order.paymentReference || "Unmatched"}
                  </td>
                  <td className="p-3 font-bold">
                    {formatKSh(order.grandTotal)}
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-1 rounded capitalize ${statusClass(order.paymentStatus)}`}
                    >
                      {statusLabel(order.paymentStatus)} · Demo
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {section === "orders" && (
        <div className="bg-white border border-neutral-200 rounded-xl overflow-x-auto">
          <div className="p-4 border-b border-neutral-200">
            <h3 className="font-bold text-sm">Financial order view</h3>
            <p className="text-neutral-500">
              Financial visibility only. Shipping, inventory, and customer
              profile operations are not available here.
            </p>
          </div>
          <table className="w-full text-left">
            <thead className="bg-neutral-50 uppercase text-[10px] text-neutral-500">
              <tr>
                <th className="p-3">Order</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Order total</th>
                <th className="p-3">Payment</th>
                <th className="p-3">Seller split</th>
                <th className="p-3">Commission</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="p-3 font-mono">{order.orderNumber}</td>
                  <td className="p-3">{order.customerName}</td>
                  <td className="p-3 font-bold">
                    {formatKSh(order.grandTotal)}
                  </td>
                  <td className="p-3">{statusLabel(order.paymentStatus)}</td>
                  <td className="p-3">
                    {order.sellerSubOrders.length} sellers
                  </td>
                  <td className="p-3">
                    {formatKSh(
                      order.sellerSubOrders.reduce(
                        (sum, item) => sum + item.commissionTotal,
                        0,
                      ),
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {section === "refunds" && (
        <div className="bg-white border border-neutral-200 rounded-xl overflow-x-auto">
          <div className="p-4 border-b border-neutral-200">
            <h3 className="font-bold text-sm">Refund requests</h3>
          </div>
          <table className="w-full text-left">
            <thead className="bg-neutral-50 uppercase text-[10px] text-neutral-500">
              <tr>
                <th className="p-3">Return</th>
                <th className="p-3">Order / Customer</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Workflow</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {returns.map((item) => (
                <tr key={item.id}>
                  <td className="p-3 font-mono">{item.returnNumber}</td>
                  <td className="p-3">
                    {item.orderNumber}
                    <span className="block text-neutral-500">
                      {item.customerName}
                    </span>
                  </td>
                  <td className="p-3 font-bold">{formatKSh(item.price)}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-1 rounded capitalize ${statusClass(item.status)}`}
                    >
                      {statusLabel(item.status)}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      {item.status === "pending_review" &&
                        canApproveRefunds && (
                          <button
                            onClick={() =>
                              updateReturnStatus(item.id, "approved")
                            }
                            className="text-emerald-700 font-semibold"
                          >
                            Approve
                          </button>
                        )}
                      {item.status === "approved" && canProcessRefunds && (
                        <button
                          onClick={() => processReturnRefund(item.id)}
                          className="text-blue-700 font-semibold"
                        >
                          Process refund
                        </button>
                      )}
                      {!["refunded", "rejected", "cancelled"].includes(
                        item.status,
                      ) && (
                        <button
                          onClick={() =>
                            updateReturnStatus(
                              item.id,
                              "rejected",
                              "Rejected by finance review",
                            )
                          }
                          className="text-red-700 font-semibold"
                        >
                          Reject
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {section === "payouts" && (
        <div className="space-y-3">
          <div className="bg-white border border-neutral-200 rounded-xl p-3 flex items-center gap-2">
            <Search className="w-4 h-4 text-neutral-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search payout, seller or destination"
              className="flex-1 outline-none"
            />
          </div>
          <div className="bg-white border border-neutral-200 rounded-xl overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-neutral-50 uppercase text-[10px] text-neutral-500">
                <tr>
                  <th className="p-3">Payout</th>
                  <th className="p-3">Seller</th>
                  <th className="p-3">Amount available</th>
                  <th className="p-3">Requested</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {visiblePayouts.map((payout) => (
                  <tr key={payout.id}>
                    <td className="p-3 font-mono">{payout.payoutNumber}</td>
                    <td className="p-3">{payout.sellerName}</td>
                    <td className="p-3 font-bold">
                      {formatKSh(payout.amount)}
                    </td>
                    <td className="p-3">
                      {new Date(payout.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-1 rounded capitalize ${statusClass(payout.status)}`}
                      >
                        {payout.status === "processed"
                          ? "paid"
                          : statusLabel(payout.status)}
                      </span>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => setSelectedPayout(payout)}
                        className="text-blue-700 font-semibold"
                      >
                        View details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {section === "ledger" && (
        <div className="bg-white border border-neutral-200 rounded-xl overflow-x-auto">
          <div className="p-4 border-b border-neutral-200">
            <h3 className="font-bold text-sm">Journal entries</h3>
            <p className="text-neutral-500">
              Debit and credit records are displayed for frontend planning.
              Balances will be derived by the backend.
            </p>
          </div>
          <table className="w-full text-left">
            <thead className="bg-neutral-50 uppercase text-[10px] text-neutral-500">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Account</th>
                <th className="p-3">Reference</th>
                <th className="p-3">Debit</th>
                <th className="p-3">Credit</th>
                <th className="p-3">Net</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {ledger.map((entry) => (
                <tr key={entry.id}>
                  <td className="p-3">
                    {new Date(entry.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-3">{entry.type.replace(/_/g, " ")}</td>
                  <td className="p-3 font-mono">{entry.transactionRef}</td>
                  <td className="p-3 text-red-700">{formatKSh(entry.debit)}</td>
                  <td className="p-3 text-emerald-700">
                    {formatKSh(entry.credit)}
                  </td>
                  <td className="p-3 font-bold">
                    {formatKSh(entry.credit - entry.debit)}
                  </td>
                  <td className="p-3">
                    <span className="bg-neutral-100 px-2 py-1 rounded">
                      Recorded in demo dataset
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {section === "reconciliation" && (
        <div className="space-y-3">
          <div className="bg-white border border-neutral-200 rounded-xl p-4">
            <h3 className="font-bold text-sm">Reconciliation workspace</h3>
            <p className="text-neutral-500 mt-1">
              Match marketplace orders to provider payments, journal entries,
              seller liabilities, and payouts.
            </p>
          </div>
          <div className="bg-white border border-neutral-200 rounded-xl overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-neutral-50 uppercase text-[10px] text-neutral-500">
                <tr>
                  <th className="p-3">Order</th>
                  <th className="p-3">Payment</th>
                  <th className="p-3">Journal</th>
                  <th className="p-3">Seller settlement</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="p-3 font-mono">{order.orderNumber}</td>
                    <td className="p-3">
                      {order.paymentReference || "Missing provider reference"}
                    </td>
                    <td className="p-3">
                      {ledger.some(
                        (entry) => entry.orderNumber === order.orderNumber,
                      )
                        ? "Matched"
                        : "Pending"}
                    </td>
                    <td className="p-3">
                      {order.sellerSubOrders.length} seller liabilities
                    </td>
                    <td className="p-3">
                      {order.paymentReference ? (
                        <span className="text-emerald-700">Matched</span>
                      ) : (
                        <span className="text-red-700 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Exception
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {section === "reports" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            ["Revenue", formatKSh(paymentsReceived)],
            [
              "GMV",
              formatKSh(
                orders.reduce((sum, order) => sum + order.grandTotal, 0),
              ),
            ],
            ["Platform commissions", formatKSh(commissions)],
            [
              "Seller settlements",
              formatKSh(
                payouts.reduce((sum, payout) => sum + payout.amount, 0),
              ),
            ],
            [
              "Refunds",
              formatKSh(returns.reduce((sum, item) => sum + item.price, 0)),
            ],
            ["Failed or unmatched payments", String(exceptions.length)],
          ].map(([label, value]) => (
            <div
              key={label}
              className="bg-white border border-neutral-200 rounded-xl p-4"
            >
              <span className="text-neutral-500">{label}</span>
              <strong className="block text-xl mt-1">{value}</strong>
              <span className="text-[11px] text-neutral-400">
                Demo report • backend export pending
              </span>
            </div>
          ))}
        </div>
      )}

      {selectedPayout && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setSelectedPayout(null)}
        >
          <div
            className="bg-white rounded-xl max-w-xl w-full p-5 space-y-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex justify-between">
              <div>
                <h3 className="font-bold text-base">
                  Payout {selectedPayout.payoutNumber}
                </h3>
                <p className="text-neutral-500">
                  {selectedPayout.sellerName} •{" "}
                  {new Date(selectedPayout.createdAt).toLocaleString()}
                </p>
              </div>
              <button onClick={() => setSelectedPayout(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-neutral-500">Amount requested</span>
                <strong className="block text-lg">
                  {formatKSh(selectedPayout.amount)}
                </strong>
              </div>
              <div>
                <span className="text-neutral-500">Destination</span>
                <strong className="block">
                  {selectedPayout.method.toUpperCase()}{" "}
                  {selectedPayout.accountDetails}
                </strong>
              </div>
            </div>
            <div className="border-t border-neutral-100 pt-3">
              <p className="font-semibold">Settlement review</p>
              <p className="text-neutral-500">
                Review eligible earnings, commissions, refunds, holds, and
                previous payouts before approval. Approval does not represent
                confirmed provider disbursement.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              {selectedPayout.status === "pending" && canApprovePayouts && (
                <>
                  <button
                    onClick={() => {
                      rejectPayout(
                        selectedPayout.id,
                        "Held for finance review",
                      );
                      setSelectedPayout(null);
                    }}
                    className="px-3 py-2 bg-amber-100 text-amber-800 rounded font-bold"
                  >
                    Hold / reject
                  </button>
                  <button
                    onClick={() => {
                      approvePayout(selectedPayout.id);
                      setSelectedPayout(null);
                    }}
                    className="px-3 py-2 bg-emerald-600 text-white rounded font-bold"
                  >
                    Approve
                  </button>
                </>
              )}
              {selectedPayout.status === "approved" && canProcessPayouts && (
                <button
                  onClick={() => {
                    processApprovedPayout(selectedPayout.id);
                    setSelectedPayout(null);
                  }}
                  className="px-3 py-2 bg-blue-600 text-white rounded font-bold"
                >
                  Process payout
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
