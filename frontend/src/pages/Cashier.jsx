import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api, { errMsg } from "../api";
import { rs, ymd } from "../utils";

const IN = new Set(["sale_receipt", "customer_payment", "transfer_in"]);
const OUT = new Set([
  "expense",
  "expense_reversal",
  "supplier_payment",
  "transfer_out",
  "customer_refund",
  "supplier_refund",
]);

export default function Cashier() {
  const [accounts, setAccounts] = useState([]);
  const [accountId, setAccountId] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState("");
  const today = ymd(new Date());

  useEffect(() => {
    api
      .get("/accounts")
      .then((r) => {
        const cash = r.data.filter((a) => a.type === "cash");
        const available = cash.length ? cash : r.data;
        setAccounts(available);
        setAccountId(available[0]?._id || "");
      })
      .catch((e) => setError(errMsg(e)));
  }, []);

  useEffect(() => {
    if (!accountId) return;
    api
      .get(`/accounts/${accountId}/transactions`)
      .then((r) => setTransactions(r.data))
      .catch((e) => setError(errMsg(e)));
  }, [accountId]);

  const account = accounts.find((a) => a._id === accountId);
  const todayTransactions = useMemo(
    () => transactions.filter((t) => ymd(t.date) === today),
    [transactions, today],
  );
  const total = (types) =>
    todayTransactions
      .filter((t) => types.has(t.type))
      .reduce((sum, t) => sum + t.amount, 0);
  const cashIn = total(IN);
  const cashOut = total(OUT);

  return (
    <div className="space-y-4">
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-navy mr-auto">Cashier account</h1>
        <Link className="btn" to="/sales">
          Open sales billing
        </Link>
      </div>
      <div className="card">
        <label className="block max-w-sm">
          <span className="lbl">Cashier account</span>
          <select
            className="input"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
          >
            {!accounts.length && <option value="">No accounts available</option>}
            {accounts.map((a) => (
              <option key={a._id} value={a._id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="card">
          <div className="text-xs text-slate-500">Current balance</div>
          <div className="text-xl font-bold text-navy">
            {rs(account?.balance || 0)}
          </div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-500">Cash in today</div>
          <div className="text-xl font-bold text-green-700">{rs(cashIn)}</div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-500">Cash out today</div>
          <div className="text-xl font-bold text-red-600">{rs(cashOut)}</div>
        </div>
      </div>
      <div className="card overflow-x-auto p-0">
        <div className="p-4 font-semibold text-navy">
          Today’s cashier transactions
        </div>
        <table className="w-full">
          <thead>
            <tr>
              {["Time", "Type", "Reference", "Amount"].map((h) => (
                <th key={h} className={`th ${h === "Amount" ? "num" : ""}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!todayTransactions.length && (
              <tr>
                <td className="td text-slate-500" colSpan={4}>
                  No transactions today.
                </td>
              </tr>
            )}
            {todayTransactions.map((t) => (
              <tr key={t._id}>
                <td className="td">{new Date(t.date).toLocaleTimeString()}</td>
                <td className="td capitalize">{t.type.replaceAll("_", " ")}</td>
                <td className="td">{t.ref || "—"}</td>
                <td className={`td num ${IN.has(t.type) ? "text-green-700" : "text-red-600"}`}>
                  {IN.has(t.type) ? "+" : "-"}{rs(t.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
