import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api";
import { rs, ymd } from "../utils";

const expiry = (date, months) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
};

export default function Warranty() {
  const { id } = useParams();
  const [sale, setSale] = useState(null);
  const [business, setBusiness] = useState({});

  useEffect(() => {
    api.get(`/sales/${id}`).then((r) => setSale(r.data));
    api.get("/settings").then((r) => setBusiness(r.data));
  }, [id]);

  const items = useMemo(
    () =>
      sale?.lines.map((line) => ({
        ...line,
        months: Number(line.product?.warrantyMonths || 0),
      })) || [],
    [sale],
  );

  if (!sale) return <div className="p-6">Loading…</div>;
  return (
    <div className="max-w-2xl mx-auto bg-white p-8 my-4 border">
      <div className="no-print flex gap-2 mb-4">
        <button className="btn" onClick={() => window.print()}>
          Print warranty / Save as PDF
        </button>
      </div>
      <div className="flex justify-between gap-4">
        <div>
          <div className="text-2xl font-bold text-navy">
            {business.businessName || "KA Mart"}
          </div>
          <div className="text-xs text-slate-500">
            Your One Stop Shopping Store
          </div>
          <div className="text-sm">
            {business.address}
            <br />
            {business.phone}
          </div>
        </div>
        <div className="text-right">
          <div className="font-bold">WARRANTY CERTIFICATE</div>
          <div className="text-sm">Invoice {sale.invoice}</div>
          <div className="text-sm">{ymd(sale.date)}</div>
        </div>
      </div>
      <div className="my-5 text-sm">
        Customer: <b>{sale.customerName || "Customer"}</b>
        {sale.customerPhone && ` · ${sale.customerPhone}`}
      </div>
      <table className="w-full">
        <thead>
          <tr>
            {["Product", "SKU", "Qty", "Warranty", "Valid until"].map((h) => (
              <th key={h} className="th">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((line, i) => {
            const end = line.months ? expiry(sale.date, line.months) : null;
            return (
              <tr key={i}>
                <td className="td">
                  {line.product?.name || "Product"}
                  {line.product?.brand && (
                    <div className="text-xs text-slate-500">
                      {line.product.brand}
                    </div>
                  )}
                </td>
                <td className="td">{line.product?.sku || "—"}</td>
                <td className="td">{line.qty}</td>
                <td className="td">
                  {line.months ? `${line.months} month${line.months === 1 ? "" : "s"}` : "Not specified"}
                </td>
                <td className="td">{end ? ymd(end) : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="mt-6 border-t pt-4 text-sm space-y-2">
        <div className="font-semibold">Warranty terms</div>
        <p>
          Warranty applies only to products with a stated warranty period
          above and begins on the invoice date. Keep this certificate and the
          original bill for any claim.
        </p>
        <p>
          Warranty excludes physical damage, liquid damage, misuse, normal
          wear, and unauthorised repair. Assessment is required before repair
          or replacement.
        </p>
        <div className="text-right pt-6">Total paid: {rs(sale.paid)}</div>
      </div>
    </div>
  );
}
