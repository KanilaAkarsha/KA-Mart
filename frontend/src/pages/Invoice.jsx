import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api";
import { rs, ymd } from "../utils";
export default function Invoice() {
  const { id } = useParams();
  const [s, setS] = useState(null);
  const [b, setB] = useState({});
  useEffect(() => {
    api.get(`/sales/${id}`).then((r) => setS(r.data));
    api.get("/settings").then((r) => setB(r.data));
  }, [id]);
  if (!s) return <div className="p-6">Loading…</div>;
  return (
    <div className="max-w-2xl mx-auto bg-white p-8 my-4 border">
      <div className="no-print flex gap-2 mb-4">
        <button className="btn" onClick={() => window.print()}>
          Print / Save as PDF
        </button>
      </div>
      <div className="flex justify-between">
        <div>
          <div className="text-2xl font-bold text-navy">
            {b.businessName || "KA Mart"}
          </div>
          <div className="text-xs text-slate-500">
            Your One Stop Shopping Store
          </div>
          <div className="text-sm">
            {b.address}
            <br />
            {b.phone} {b.whatsapp && `· WhatsApp ${b.whatsapp}`}
          </div>
        </div>
        <div className="text-right">
          <div className="font-bold">INVOICE {s.invoice}</div>
          <div className="text-sm">{ymd(s.date)}</div>
          {s.status === "cancelled" && (
            <div className="text-red-600 font-bold">CANCELLED</div>
          )}
        </div>
      </div>
      <div className="my-4 text-sm">
        Bill to: <b>{s.customerName || "Customer"}</b> {s.customerPhone}
      </div>
      <table className="w-full">
        <thead>
          <tr>
            {["Item", "Qty", "Unit price", "Amount"].map((h) => (
              <th key={h} className="th">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {s.lines.map((l, i) => (
            <tr key={i}>
              <td className="td">{l.product?.name}</td>
              <td className="td">{l.qty}</td>
              <td className="td">{rs(l.unitPrice)}</td>
              <td className="td">{rs(l.qty * l.unitPrice)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="text-sm text-right mt-3 space-y-1">
        <div>Subtotal {rs(s.subtotal)}</div>
        {!!s.discount && <div>Discount −{rs(s.discount)}</div>}
        {!!s.charges && <div>Delivery / charges {rs(s.charges)}</div>}
        <div className="font-bold">Total {rs(s.total)}</div>
        <div>Paid {rs(s.paid)}</div>
        <div className="font-bold">Balance due {rs(s.total - s.paid)}</div>
      </div>
    </div>
  );
}
