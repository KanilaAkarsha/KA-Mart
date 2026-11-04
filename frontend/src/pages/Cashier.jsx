import { useEffect, useState } from "react";
import api, { errMsg } from "../api";

const blank = { name: "", email: "", password: "" };

export default function Cashier() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(blank);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = () =>
    api
      .get("/users")
      .then((r) => setUsers(r.data.filter((u) => u.role === "staff")))
      .catch((e) => setError(errMsg(e)));
  useEffect(() => {
    load();
  }, []);

  const create = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      await api.post("/users", form);
      setForm(blank);
      setMessage("Cashier created");
      load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const toggle = async (user) => {
    try {
      const r = await api.put(`/users/${user._id}`, {
        cashierAccess: user.cashierAccess === false,
      });
      setUsers((all) => all.map((x) => (x._id === r.data._id ? r.data : x)));
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const remove = async (user) => {
    if (!window.confirm(`Delete cashier "${user.name}"?`)) return;
    try {
      await api.delete(`/users/${user._id}`);
      setUsers((all) => all.filter((x) => x._id !== user._id));
      setMessage("Cashier deleted");
    } catch (e) {
      setError(errMsg(e));
    }
  };

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold text-navy">Cashiers</h1>
      {error && <div className="text-sm text-red-600">{error}</div>}
      {message && <div className="text-sm text-green-700">{message}</div>}
      <form className="card space-y-3" onSubmit={create}>
        <div className="font-semibold">Create cashier</div>
        <div className="grid sm:grid-cols-3 gap-3">
          <label>
            <span className="lbl">Name</span>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </label>
          <label>
            <span className="lbl">Email</span>
            <input
              className="input"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </label>
          <label>
            <span className="lbl">Password (10+ characters)</span>
            <input
              className="input"
              type="password"
              minLength={10}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </label>
        </div>
        <button className="btn">Create cashier</button>
      </form>
      <div className="card overflow-x-auto p-0">
        <div className="p-4 font-semibold text-navy">Cashier users</div>
        <table className="w-full">
          <thead>
            <tr>
              {["Name", "Email", "Access", "Actions"].map((h) => (
                <th key={h} className="th">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!users.length && (
              <tr>
                <td className="td text-slate-500" colSpan={4}>
                  No cashiers created.
                </td>
              </tr>
            )}
            {users.map((user) => (
              <tr key={user._id}>
                <td className="td">{user.name}</td>
                <td className="td">{user.email}</td>
                <td className="td">
                  {user.cashierAccess === false ? "Disabled" : "Enabled"}
                </td>
                <td className="td">
                  <button className="btn-ghost mr-1" onClick={() => toggle(user)}>
                    {user.cashierAccess === false ? "Enable" : "Disable"}
                  </button>
                  <button
                    className="btn-ghost text-red-600"
                    onClick={() => remove(user)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
