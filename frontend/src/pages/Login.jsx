import { useState } from 'react'; import { useNavigate } from 'react-router-dom'; import api, { errMsg } from '../api';
export default function Login() { const [f, set] = useState({ email: '', password: '' }); const [err, setErr] = useState(''); const go = useNavigate();
  const submit = async (e) => { e.preventDefault(); try { const r = await api.post('/auth/login', f); localStorage.setItem('kam_token', r.data.token); go('/'); } catch (x) { setErr(errMsg(x)); } };
  return (<div className="min-h-screen flex items-center justify-center bg-surface p-4"><form onSubmit={submit} className="card w-full max-w-sm space-y-3">
    <div className="text-center"><div className="text-2xl font-bold text-navy">KA <span className="text-brand">MART</span></div><div className="text-xs text-slate-500">Your One Stop Shopping Store</div></div>
    {err && <div className="text-sm text-red-600">{err}</div>}
    <input className="input" type="email" placeholder="Email" value={f.email} onChange={(e) => set({ ...f, email: e.target.value })} required />
    <input className="input" type="password" placeholder="Password" value={f.password} onChange={(e) => set({ ...f, password: e.target.value })} required /><button className="btn w-full justify-center">Sign in</button></form></div>); }
