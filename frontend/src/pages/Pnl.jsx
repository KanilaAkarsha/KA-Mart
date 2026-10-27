import { useEffect, useState } from "react";
import api, { errMsg } from "../api";
import { rs, presets } from "../utils";
export default function Pnl() {
  const P = presets();
  const [r, setR] = useState(P["This month"]);
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    api
      .get(`/reports/pnl?from=${r[0]}&to=${r[1]}`)
      .then((x) => setD(x.data))
      .catch((e) => setErr(errMsg(e)));
  }, [r]);
  const rows = d && [
    ["Gross sales", d.grossSales],
    ["− Discounts", -d.discounts],
    ["− Sales returns", -d.salesReturns],
    ["Net sales", d.netSales, 1],
    ["− Cost of goods sold", -d.cogs],
    ["Gross profit", d.grossProfit, 1],
    ["− Operating expenses", -d.opex],
    ["Net operating profit", d.netOperating, 1],
    ["Net profit", d.netProfit, 1],
  ];
  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex flex-wrap gap-2 items-center">
        <h1 className="text-2xl font-bold text-navy mr-auto">Profit & Loss</h1>
        {Object.entries(P).map(([k, v]) => (
          <button
            key={k}
            className={r === v ? "btn" : "btn-ghost"}
            onClick={() => setR(v)}
          >
            {k}
          </button>
        ))}
      </div>
      {err && <div className="text-red-600 text-sm">{err}</div>}
      <div className="card">
        {rows
          ? rows.map(([l, v, b]) => (
              <div
                key={l}
                className={`flex justify-between py-1.5 border-b border-slate-100 text-sm ${b ? "font-bold text-navy" : ""}`}
              >
                <span>{l}</span>
                <span>{rs(v)}</span>
              </div>
            ))
          : "Loading…"}
      </div>
      <p className="text-xs text-slate-500">
        Cost of goods sold counts only stock actually sold (weighted average).
        Purchases that remain unsold sit in inventory. Cancelled sales,
        transfers and owner money are excluded.
      </p>
    </div>
  );
}
