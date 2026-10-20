import axios from 'axios';
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });
api.interceptors.request.use((c) => { const t = localStorage.getItem('kam_token'); if (t) c.headers.Authorization = `Bearer ${t}`; return c; });
api.interceptors.response.use((r) => r, (e) => { if (e.response?.status === 401 && !location.pathname.includes('login')) { localStorage.removeItem('kam_token'); location.href = '/login'; } return Promise.reject(e); });
export const errMsg = (e) => e.response?.data?.details?.map((d) => `${d.path.join('.')}: ${d.message}`).join('; ') || e.response?.data?.error || e.message;
export default api;
