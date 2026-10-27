import { useEffect, useState } from "react";
import api, { errMsg } from "../api";
import { useToast } from "../components/DataPage";
const LISTS = [
  ["expenseCategories", "Expense categories"],
  ["productCategories", "Product categories"],
  ["paymentMethods", "Payment methods"],
  ["salesChannels", "Sales channels"],
];
const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem("kam_user") || "{}");
  } catch {
    return {};
  }
};
export default function Settings() {
  const [s, setS] = useState(null);
  const [txt, setTxt] = useState({});
  const [pw, setPw] = useState({ current: "", next: "" });
  const [toast, show] = useToast();
  const isAdmin = getUser().role === "admin";
  useEffect(() => {
    api.get("/settings").then((r) => {
      setS(r.data);
      setTxt(
        Object.fromEntries(
          LISTS.map(([k]) => [k, (r.data[k] || []).join("\n")]),
        ),
      );
    });
  }, []);
  const save = async (e) => {
    e.preventDefault();
    const lists = Object.fromEntries(
      LISTS.map(([k]) => [
        k,
        txt[k]
          .split("\n")
          .map((x) => x.trim())
          .filter(Boolean),
      ]),
    );
    try {
      const r = await api.put("/settings", {
        businessName: s.businessName,
        address: s.address || "",
        phone: s.phone || "",
        whatsapp: s.whatsapp || "",
        lowStockDefault: Number(s.lowStockDefault ?? 5),
        ...(isAdmin
          ? { sessionTimeoutHours: Number(s.sessionTimeoutHours ?? 2) }
          : {}),
        ...lists,
      });
      setS(r.data);
      show("Settings saved");
    } catch (x) {
      show(errMsg(x), true);
    }
  };
  const change = async (e) => {
    e.preventDefault();
    try {
      await api.post("/auth/change-password", pw);
      show("Password changed");
      setPw({ current: "", next: "" });
    } catch (x) {
      show(errMsg(x), true);
    }
  };
  if (!s) return <div>Loading…</div>;
  const F = (k, l, type = "text") => (
    <label className="block">
      <span className="lbl">{l}</span>
      <input
        className="input"
        type={type}
        value={s[k] ?? ""}
        onChange={(e) => setS({ ...s, [k]: e.target.value })}
      />
    </label>
  );
  return (
    <div className="max-w-3xl space-y-4">
      {toast}
      <h1 className="text-2xl font-bold text-navy">Settings</h1>
      <form onSubmit={save} className="space-y-4">
        <div className="card space-y-3">
          <div className="font-semibold">Business (shown on invoices)</div>
          <div className="grid sm:grid-cols-2 gap-3">
            {F("businessName", "Business name")}
            {F("phone", "Phone")}
            {F("whatsapp", "WhatsApp")}
            {F("lowStockDefault", "Default low-stock level", "number")}
          </div>
          {F("address", "Address")}
          {isAdmin ? (
            <div className="grid sm:grid-cols-2 gap-3">
              {F("sessionTimeoutHours", "Session timeout (hours)", "number")}
            </div>
          ) : null}
          {isAdmin ? (
            <p className="text-xs text-slate-500">
              Admin setting. Users are logged out when their login session
              expires. This applies to new logins.
            </p>
          ) : null}
          <div className="text-xs text-slate-500">
            Currency LKR · Timezone Asia/Colombo · Money format Rs. 1,250.00
          </div>
        </div>
        <div className="card space-y-3">
          <div className="font-semibold">Lists used in forms</div>
          <p className="text-xs text-slate-500">
            One item per line. These fill the dropdowns on Products, Expenses,
            Sales and payments.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {LISTS.map(([k, l]) => (
              <label key={k} className="block">
                <span className="lbl">{l}</span>
                <textarea
                  rows={6}
                  className="input"
                  value={txt[k] || ""}
                  onChange={(e) => setTxt({ ...txt, [k]: e.target.value })}
                />
              </label>
            ))}
          </div>
        </div>
        <button className="btn">Save settings</button>
      </form>
      <form onSubmit={change} className="card space-y-3">
        <div className="font-semibold">Change password</div>
        <div className="grid sm:grid-cols-2 gap-3">
          <input
            className="input"
            type="password"
            placeholder="Current password"
            value={pw.current}
            onChange={(e) => setPw({ ...pw, current: e.target.value })}
            required
          />
          <input
            className="input"
            type="password"
            placeholder="New password (10+ characters)"
            minLength={10}
            value={pw.next}
            onChange={(e) => setPw({ ...pw, next: e.target.value })}
            required
          />
        </div>
        <button className="btn">Change password</button>
      </form>
    </div>
  );
}
