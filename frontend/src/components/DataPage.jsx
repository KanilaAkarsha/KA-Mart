import { useEffect, useMemo, useState } from 'react'; import { Plus, Search, Pencil } from 'lucide-react'; import api, { errMsg } from '../api'; import { toMinor, isNum, ymd } from '../utils';
export function useToast() { const [t, set] = useState(null); const show = (m, bad) => { set({ m, bad }); setTimeout(() => set(null), 4000); };
  return [t && <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-white text-sm shadow ${t.bad ? 'bg-red-600' : 'bg-brand'}`}>{t.m}</div>, show]; }
export function Field({ f, value, onChange, opts }) {
  if (f.type === 'select') return <select className="input" value={value || ''} onChange={(e) => onChange(e.target.value)}><option value="">Select…</option>{[...(f.static || opts || []), ...(value && !(f.static || opts || []).some((o) => (o.value ?? o._id) === value) ? [{ value, label: value }] : [])].map((o) => <option key={o.value ?? o._id} value={o.value ?? o._id}>{o.label ?? o.name}</option>)}</select>;
  const numeric = f.type === 'money' || f.type === 'number';
  return <input className="input" type={numeric ? 'number' : f.type || 'text'} step={f.type === 'money' ? '0.01' : undefined} min={numeric ? 0 : undefined} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
}
export const useOptions = (fields) => { const [o, set] = useState({}); useEffect(() => { fields.filter((f) => f.setting).forEach((f) => api.get('/settings').then((r) => set((p) => ({ ...p, [f.name]: (r.data[f.setting] || []).map((v) => ({ value: v, label: v })) })))); fields.filter((f) => f.endpoint).forEach((f) => api.get(f.endpoint).then((r) => set((p) => ({ ...p, [f.name]: r.data.items || r.data })))); }, []); return o; };
export default function DataPage({ title, endpoint, columns, fields, search = true, query = '', readOnly, rowActions, editable = true }) {
  const [rows, setRows] = useState([]); const [q, setQ] = useState(''); const [form, setForm] = useState(null); const [loading, setLoading] = useState(true); const [page, setPage] = useState(0); const [sort, setSort] = useState(null);
  const [toast, show] = useToast(); const opts = useOptions(fields || []); const canEdit = editable && !readOnly && fields?.length;
  const load = () => { setLoading(true); api.get(`${endpoint}?${query}${q ? `&q=${encodeURIComponent(q)}` : ''}`).then((r) => setRows(r.data.items || r.data)).catch((e) => show(errMsg(e), true)).finally(() => setLoading(false)); };
  useEffect(load, [endpoint, q]);
  const sorted = useMemo(() => (sort ? [...rows].sort((a, b) => (a[sort] > b[sort] ? 1 : -1)) : rows), [rows, sort]); const pageRows = sorted.slice(page * 15, page * 15 + 15);
  const edit = (r) => setForm({ _id: r._id, ...Object.fromEntries(fields.map((f) => [f.name, r[f.name] == null ? '' : f.type === 'money' ? r[f.name] / 100 : f.type === 'date' ? ymd(r[f.name]) : r[f.name]])) });
  const save = async (e) => { e.preventDefault(); const body = {};
    for (const f of fields) { const v = form[f.name]; if (v === '' || v == null) continue; body[f.name] = f.type === 'money' ? toMinor(v) : f.type === 'number' ? Number(v) : v; }
    try { if (form._id) await api.put(`${endpoint}/${form._id}`, body); else await api.post(endpoint, body, { headers: { 'Idempotency-Key': crypto.randomUUID() } });
      show(form._id ? 'Changes saved' : 'Saved'); setForm(null); load(); } catch (er) { show(errMsg(er), true); } };
  const hasActions = rowActions || canEdit; const span = columns.length + (hasActions ? 1 : 0);
  return (<div>{toast}
    <div className="flex flex-wrap items-center justify-between gap-3 mb-4"><h1 className="text-2xl font-bold text-navy">{title}</h1>
      <div className="flex flex-wrap items-center gap-2">{search && <div className="relative"><Search size={16} className="absolute left-2.5 top-2.5 text-slate-400" /><input className="input pl-8 w-56" placeholder="Search…" value={q} onChange={(e) => { setPage(0); setQ(e.target.value); }} /></div>}
        {!readOnly && fields?.length > 0 && <button className="btn" onClick={() => setForm({})}><Plus size={16} />Add</button>}</div></div>
    <div className="card overflow-x-auto p-0"><table className="w-full"><thead><tr>{columns.map((c) => <th key={c.key} className={`th cursor-pointer select-none ${isNum(c.label) ? 'num' : ''}`} onClick={() => setSort(c.key)}>{c.label}</th>)}{hasActions && <th className="th text-right">Actions</th>}</tr></thead>
      <tbody>{loading ? <tr><td className="td" colSpan={span}>Loading…</td></tr> : !pageRows.length ? <tr><td className="td text-slate-500 text-center py-8" colSpan={span}>Nothing here yet.</td></tr> :
        pageRows.map((r) => <tr key={r._id} className="hover:bg-slate-50">{columns.map((c) => <td key={c.key} className={`td ${isNum(c.label) ? 'num' : ''}`}>{c.render ? c.render(r) : r[c.key]}</td>)}
          {hasActions && <td className="td"><div className="flex flex-wrap justify-end gap-1">{canEdit && <button className="btn-ghost" onClick={() => edit(r)}><Pencil size={14} />Edit</button>}{rowActions && rowActions(r, load, show)}</div></td>}</tr>)}</tbody></table></div>
    <div className="flex items-center justify-between mt-3 text-sm text-slate-500"><span>{rows.length} record{rows.length === 1 ? '' : 's'}</span><div className="flex gap-2"><button className="btn-ghost" disabled={!page} onClick={() => setPage(page - 1)}>Prev</button><button className="btn-ghost" disabled={(page + 1) * 15 >= rows.length} onClick={() => setPage(page + 1)}>Next</button></div></div>
    {form && <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4"><form onSubmit={save} className="card w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-3"><h2 className="font-bold text-navy">{form._id ? 'Edit' : 'New'} {title.replace(/s$/, '')}</h2>
      <div className="grid sm:grid-cols-2 gap-3">{fields.map((f) => <label key={f.name} className={`block ${['description', 'address', 'notes'].includes(f.name) ? 'sm:col-span-2' : ''}`}><span className="lbl">{f.label}</span><Field f={f} opts={opts[f.name]} value={form[f.name]} onChange={(v) => setForm({ ...form, [f.name]: v })} /></label>)}</div>
      {form._id && endpoint.match(/expenses|accounts/) && <p className="text-xs text-slate-500">Changing an amount, account or date keeps history: the old entry is reversed and a corrected one is posted.</p>}
      <div className="flex justify-end gap-2 pt-1"><button type="button" className="btn-ghost" onClick={() => setForm(null)}>Cancel</button><button className="btn">{form._id ? 'Save changes' : 'Save'}</button></div></form></div>}
  </div>);
}
