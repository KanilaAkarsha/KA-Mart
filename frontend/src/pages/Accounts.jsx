import { useEffect, useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import api, { errMsg } from "../api";
import { toMinor, rs } from "../utils";
import DataPage from "../components/DataPage";
import { AccountDelete } from "../components/Extras";

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({ from: "", to: "", amount: "" });
  const [message, setMessage] = useState("");
  const [bad, setBad] = useState(false);
  const load = () => api.get("/accounts").then((r) => setAccounts(r.data));
  useEffect(() => {
    load();
  }, []);
  const transfer = async (e) => {
    e.preventDefault();
    setMessage("");
    try {
      await api.post("/accounts/transfer", {
        from: form.from,
        to: form.to,
        amount: toMinor(form.amount),
      });
      setForm({ from: "", to: "", amount: "" });
      setBad(false);
      setMessage("Transfer recorded");
      load();
    } catch (x) {
      setBad(true);
      setMessage(errMsg(x));
    }
  };
  return (
    <div className="space-y-4">
      {message && (
        <div
          className={bad ? "text-sm text-red-600" : "text-sm text-green-700"}
        >
          {message}
        </div>
      )}
      <div className="card">
        <div className="font-semibold text-navy mb-3">
          Send money between accounts
        </div>
        <form
          onSubmit={transfer}
          className="grid sm:grid-cols-4 gap-3 items-end"
        >
          <label className="block">
            <span className="lbl">From account</span>
            <select
              className="input"
              value={form.from}
              onChange={(e) => setForm({ ...form, from: e.target.value })}
              required
            >
              <option value="">Select…</option>
              {accounts.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.name} ({rs(a.balance)})
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="lbl">To account</span>
            <select
              className="input"
              value={form.to}
              onChange={(e) => setForm({ ...form, to: e.target.value })}
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
          <label className="block">
            <span className="lbl">Amount (Rs.)</span>
            <input
              className="input"
              type="number"
              min="0.01"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
            />
          </label>
          <button className="btn">
            <ArrowLeftRight size={16} /> Transfer
          </button>
        </form>
      </div>
      <DataPage
        title="Accounts"
        endpoint="/accounts"
        search={false}
        columns={[
          { key: "name", label: "Account" },
          { key: "type", label: "Type" },
          {
            key: "opening",
            label: "Opening",
            total: "money",
            render: (r) => rs(r.opening),
          },
          {
            key: "balance",
            label: "Current balance",
            total: "money",
            render: (r) => rs(r.balance),
          },
        ]}
        fields={[
          { name: "name", label: "Name" },
          {
            name: "type",
            label: "Type",
            type: "select",
            static: ["cash", "bank", "mobile", "other"].map((v) => ({
              value: v,
              label: v,
            })),
          },
          { name: "opening", label: "Opening balance (Rs.)", type: "money" },
        ]}
        rowActions={(r, reload, show) => (
          <AccountDelete row={r} reload={reload} show={show} />
        )}
      />
    </div>
  );
}
