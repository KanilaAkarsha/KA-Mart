import { useEffect, useState } from "react";
import api, { errMsg } from "../api";
import { rs } from "../utils";

export default function StaffDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api
      .get("/reports/dashboard")
      .then((r) => setData(r.data))
      .catch((e) => setError(errMsg(e)));
  }, []);
  if (error) return <div className="text-sm text-red-600">{error}</div>;
  if (!data) return <div>Loading…</div>;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-navy">Sales Dashboard</h1>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="card">
          <div className="text-xs text-slate-500">Sales today</div>
          <div className="text-xl font-bold text-navy">
            {rs(data.salesToday)}
          </div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-500">Sales in period</div>
          <div className="text-xl font-bold text-navy">{rs(data.revenue)}</div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-500">Products</div>
          <div className="text-xl font-bold text-navy">
            {data.totalProducts}
          </div>
        </div>
      </div>
      <div className="card">
        <div className="font-semibold text-navy mb-2">Low stock</div>
        {!data.lowStock.length ? (
          <div className="text-sm text-slate-500">No low-stock products.</div>
        ) : (
          data.lowStock.map((p) => (
            <div key={p._id} className="text-sm">
              {p.name} — {p.qty} left
            </div>
          ))
        )}
      </div>
    </div>
  );
}
