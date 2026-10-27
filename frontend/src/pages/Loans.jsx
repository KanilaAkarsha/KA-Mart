import { useEffect, useState } from "react";
import api, { errMsg } from "../api";
import { rs, toMinor, ymd } from "../utils";

export default function Loans() {
  const [loans, setLoans] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [tab, setTab] = useState("borrowed");
  const [form, setForm] = useState({
    party: "",
    principal: "",
    account: "",
    notes: "",
  });
  const [payment, setPayment] = useState(null);
  const [error, setError] = useState("");
  const load = () =>
    Promise.all([api.get("/loans"), api.get("/accounts")]).then(([l, a]) => {
      setLoans(l.data);
      setAccounts(a.data);
    });
  useEffect(() => {
    load();
  }, []);
  const save = async (e) => {
    e.preventDefault();
    try {
      await api.post("/loans", {
        ...form,
        direction: tab,
        principal: toMinor(form.principal),
      });
      setForm({ party: "", principal: "", account: "", notes: "" });
      setError("");
      load();
    } catch (x) {
      setError(errMsg(x));
    }
  };
  const pay = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/loans/${payment.loan._id}/payments`, {
        amount: toMinor(payment.amount),
        account: payment.account,
      });
      setPayment(null);
      setError("");
      load();
    } catch (x) {
      setError(errMsg(x));
    }
  };
  const rows = loans.filter((x) => x.direction === tab);
  return (
    <div className="space-y-4">
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold text-navy mr-auto">Loans</h1>
        {["borrowed", "lent"].map((x) => (
          <button
            key={x}
            className={tab === x ? "btn" : "btn-ghost"}
            onClick={() => setTab(x)}
          >
            {x === "borrowed" ? "Money I borrowed" : "Money I lent"}
          </button>
        ))}
      </div>
      <form
        onSubmit={save}
        className="card grid sm:grid-cols-4 gap-3 items-end"
      >
        <label className="block">
          <span className="lbl">
            {tab === "borrowed" ? "Lender" : "Borrower"}
          </span>
          <input
            className="input"
            value={form.party}
            onChange={(e) => setForm({ ...form, party: e.target.value })}
            required
          />
        </label>
        <label className="block">
          <span className="lbl">Principal (Rs.)</span>
          <input
            className="input"
            type="number"
            min="0.01"
            step="0.01"
            value={form.principal}
            onChange={(e) => setForm({ ...form, principal: e.target.value })}
            required
          />
        </label>
        <label className="block">
          <span className="lbl">Account</span>
          <select
            className="input"
            value={form.account}
            onChange={(e) => setForm({ ...form, account: e.target.value })}
            required
          >
            <option value="">Select…</option>
            {accounts.map((a) => (
              <option key={a._id} value={a._id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <button className="btn">
          Record {tab === "borrowed" ? "borrowing" : "loan"}
        </button>
        <label className="block sm:col-span-4">
          <span className="lbl">Notes</span>
          <input
            className="input"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </label>
      </form>
      <div className="card overflow-x-auto p-0">
        <table className="w-full">
          <thead>
            <tr>
              {[
                "Date",
                tab === "borrowed" ? "Lender" : "Borrower",
                "Principal",
                "Paid",
                "Outstanding",
                "Status",
                "Actions",
              ].map((x) => (
                <th className="th" key={x}>
                  {x}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!rows.length ? (
              <tr>
                <td className="td text-slate-500" colSpan={7}>
                  No loans recorded.
                </td>
              </tr>
            ) : (
              rows.map((x) => (
                <tr key={x._id}>
                  <td className="td">{ymd(x.date)}</td>
                  <td className="td">{x.party}</td>
                  <td className="td num">{rs(x.principal)}</td>
                  <td className="td num">{rs(x.paid)}</td>
                  <td className="td num font-semibold">{rs(x.outstanding)}</td>
                  <td className="td">{x.status}</td>
                  <td className="td">
                    {x.status === "open" && (
                      <button
                        className="btn-ghost"
                        onClick={() =>
                          setPayment({
                            loan: x,
                            amount: "",
                            account: x.account,
                          })
                        }
                      >
                        Record payment
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {payment && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
          <form onSubmit={pay} className="card w-full max-w-md space-y-3">
            <h2 className="font-bold text-navy">
              Record{" "}
              {payment.loan.direction === "borrowed"
                ? "repayment"
                : "collection"}
            </h2>
            <p className="text-sm text-slate-500">
              Outstanding: {rs(payment.loan.outstanding)}
            </p>
            <label className="block">
              <span className="lbl">Amount (Rs.)</span>
              <input
                className="input"
                type="number"
                min="0.01"
                max={payment.loan.outstanding / 100}
                step="0.01"
                value={payment.amount}
                onChange={(e) =>
                  setPayment({ ...payment, amount: e.target.value })
                }
                required
              />
            </label>
            <label className="block">
              <span className="lbl">Account</span>
              <select
                className="input"
                value={payment.account}
                onChange={(e) =>
                  setPayment({ ...payment, account: e.target.value })
                }
                required
              >
                <option value="">Select…</option>
                {accounts.map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setPayment(null)}
              >
                Cancel
              </button>
              <button className="btn">Save payment</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
