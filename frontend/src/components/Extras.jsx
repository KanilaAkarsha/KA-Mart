import { useState } from 'react'; import api, { errMsg } from '../api'; import { rs, ymd } from '../utils';
export function Modal({ title, onClose, children }) { return <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4"><div className="card w-full max-w-3xl max-h-[90vh] overflow-y-auto"><div className="flex justify-between mb-3"><h2 className="font-bold text-navy">{title}</h2><button className="btn-ghost" onClick={onClose}>Close</button></div>{children}</div></div>; }
export function Statement({ kind, row }) { // customer / supplier statement
  const [d, set] = useState(null); const open = () => api.get(`/${kind}/${row._id}/statement`).then((r) => set(r.data)).catch((e) => alert(errMsg(e)));
  return (<><button className="btn-ghost" onClick={open}>Statement</button>{d && <Modal title={`${row.name} — statement`} onClose={() => set(null)}>
    <div className="text-sm mb-2">Outstanding: <b>{rs(d.outstanding)}</b></div><table className="w-full mb-4"><thead><tr>{['No.', 'Date', 'Total', 'Paid', 'Status'].map((h) => <th key={h} className={`th ${['Total', 'Paid'].includes(h) ? 'num' : ''}`}>{h}</th>)}</tr></thead><tbody>{d.documents.map((x) => <tr key={x._id}><td className="td">{x.invoice || x.number}</td><td className="td">{ymd(x.date)}</td><td className="td num">{rs(x.total)}</td><td className="td num">{rs(x.paid)}</td><td className="td">{x.status === 'cancelled' ? 'cancelled' : x.paymentStatus || x.status}</td></tr>)}</tbody></table>
    <div className="font-semibold text-sm mb-1">Payment history</div>{d.payments.map((p) => <div key={p._id} className="text-sm flex justify-between border-b py-1"><span>{ymd(p.date)} · {p.type.replace('_', ' ')} · {p.ref}</span><span>{rs(p.amount)}</span></div>)}{!d.payments.length && <div className="text-sm text-slate-500">No payments yet.</div>}</Modal>}</>); }
export function InventoryActions({ row, reload, show }) { const [mv, set] = useState(null);
  const adjust = async () => { const q = window.prompt('Quantity change (e.g. -2 for damaged/lost, 3 for found stock):'); if (!q) return; const reason = window.prompt('Reason (damaged, lost, returned, correction…):'); if (!reason) return;
    try { await api.post(`/products/${row._id}/adjust`, { qty: Number(q), reason }); show('Stock adjusted'); reload(); } catch (e) { show(errMsg(e), true); } };
  const hist = () => api.get(`/products/${row._id}/movements`).then((r) => set(r.data));
  return (<><button className="btn-ghost mr-1" onClick={adjust}>Adjust</button><button className="btn-ghost" onClick={hist}>History</button>{mv && <Modal title={`${row.name} — stock movements`} onClose={() => set(null)}><table className="w-full"><thead><tr>{['Date', 'Type', 'Qty', 'Unit cost', 'Note'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead><tbody>
    {mv.map((m) => <tr key={m._id}><td className="td">{ymd(m.date)}</td><td className="td">{m.type}</td><td className="td">{m.qty}</td><td className="td num">{rs(m.unitCost || 0)}</td><td className="td">{m.reason || m.ref || ''}</td></tr>)}</tbody></table></Modal>}</>); }

export function ProductImage({ row, reload, show }) {
  const pick = async (e) => { const file = e.target.files[0]; e.target.value = ''; if (!file) return; const fd = new FormData(); fd.append('image', file);
    try { await api.post(`/products/${row._id}/image`, fd); show('Photo saved'); reload(); } catch (er) { show(errMsg(er), true); } };
  return <label className="btn-ghost cursor-pointer">{row.image ? 'Change photo' : 'Add photo'}<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={pick} /></label>;
}

export function ReceiptButtons({ row, reload, show }) { // receipts are only fetched with the login token
  const view = async () => { try { const r = await api.get(`/expenses/${row._id}/receipt`, { responseType: 'blob' }); window.open(URL.createObjectURL(r.data), '_blank'); } catch (e) { show('Could not open receipt', true); } };
  const pick = async (e) => { const file = e.target.files[0]; e.target.value = ''; if (!file) return; const fd = new FormData(); fd.append('receipt', file);
    try { await api.post(`/expenses/${row._id}/receipt`, fd); show('Receipt saved'); reload(); } catch (er) { show(errMsg(er), true); } };
  return (<>{row.receipt && <button className="btn-ghost" onClick={view}>View receipt</button>}<label className="btn-ghost cursor-pointer">{row.receipt ? 'Replace' : 'Attach receipt'}<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={pick} /></label></>);
}
