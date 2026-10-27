import { useEffect, useState } from "react";
import {
  Statement,
  InventoryActions,
  ProductImage,
  ReceiptButtons,
} from "./components/Extras";
import Reports from "./pages/Reports";
import Payables from "./pages/Payables";
import Settings from "./pages/Settings";
import Invoice from "./pages/Invoice";
import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import DataPage from "./components/DataPage";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import TradePage from "./pages/TradePage";
import Pnl from "./pages/Pnl";
import Closing from "./pages/Closing";
import Accounts from "./pages/Accounts";
import Loans from "./pages/Loans";
import StaffDashboard from "./pages/StaffDashboard";
import { rs, ymd, imgUrl } from "./utils";
const tokenExpiry = (token) => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
};
const Guard = ({ children }) => {
  const [expired, setExpired] = useState(false);
  const token = localStorage.getItem("kam_token");
  useEffect(() => {
    if (!token) return undefined;
    const expiry = tokenExpiry(token);
    if (!expiry) return undefined;
    const expire = () => {
      localStorage.removeItem("kam_token");
      localStorage.removeItem("kam_user");
      setExpired(true);
    };
    const currentUser = () => {
      try {
        return JSON.parse(localStorage.getItem("kam_user") || "{}");
      } catch {
        return {};
      }
    };
    const delay = expiry - Date.now();
    if (delay <= 0) {
      expire();
      return undefined;
    }
    const timer = setTimeout(expire, delay);
    return () => clearTimeout(timer);
  }, [token]);
  return token && !expired ? children : <Navigate to="/login" replace />;
};
const party = [
  { key: "name", label: "Name" },
  { key: "phone", label: "Phone" },
  { key: "total", label: "Total", total: "money", render: (r) => rs(r.total) },
  { key: "paid", label: "Paid", total: "money", render: (r) => rs(r.paid) },
  {
    key: "outstanding",
    label: "Outstanding",
    total: "money",
    render: (r) => rs(r.outstanding),
  },
];
const pf = [
  { name: "name", label: "Name" },
  { name: "phone", label: "Phone" },
  { name: "address", label: "Address" },
  { name: "notes", label: "Notes" },
];
export default function App() {
  const staff = currentUser().role === "staff";
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/invoice/:id"
        element={
          <Guard>
            <Invoice />
          </Guard>
        }
      />
      <Route
        element={
          <Guard>
            <Layout />
          </Guard>
        }
      >
        <Route index element={staff ? <StaffDashboard /> : <Dashboard />} />
        <Route
          path="products"
          element={
            <DataPage
              title="Products"
              endpoint="/products"
              columns={[
                {
                  key: "image",
                  label: "Photo",
                  render: (r) =>
                    r.image ? (
                      <img
                        src={imgUrl(r.image)}
                        alt=""
                        className="h-9 w-9 rounded object-cover border"
                      />
                    ) : (
                      <span className="text-slate-300">—</span>
                    ),
                },
                { key: "sku", label: "SKU" },
                { key: "name", label: "Name" },
                { key: "category", label: "Category" },
                {
                  key: "sellingPrice",
                  label: "Price",
                  render: (r) => rs(r.sellingPrice),
                },
                {
                  key: "studentPrice",
                  label: "Student",
                  render: (r) => (r.studentPrice ? rs(r.studentPrice) : "—"),
                },
                { key: "qty", label: "Stock", total: "int" },
              ]}
              fields={
                staff
                  ? []
                  : [
                      { name: "name", label: "Name" },
                      { name: "sku", label: "SKU" },
                      {
                        name: "category",
                        label: "Category",
                        type: "select",
                        setting: "productCategories",
                      },
                      { name: "brand", label: "Brand" },
                      { name: "compatibility", label: "Model / compatibility" },
                      {
                        name: "sellingPrice",
                        label: "Selling price (Rs.)",
                        type: "money",
                      },
                      {
                        name: "studentPrice",
                        label: "Student price (Rs.)",
                        type: "money",
                      },
                      {
                        name: "minStock",
                        label: "Low-stock alert at",
                        type: "number",
                      },
                    ]
              }
              rowActions={
                !staff &&
                ((r, load, show) => (
                  <ProductImage row={r} reload={load} show={show} />
                ))
              }
            />
          }
        />
        <Route
          path="inventory"
          element={
            <DataPage
              readOnly
              title="Inventory"
              endpoint="/products"
              columns={[
                { key: "name", label: "Product" },
                {
                  key: "qty",
                  label: "Qty",
                  total: "int",
                  render: (r) =>
                    r.qty <= r.minStock ? (
                      <span className="text-red-600 font-semibold">
                        {r.qty} (low)
                      </span>
                    ) : (
                      r.qty
                    ),
                },
                {
                  key: "avgCost",
                  label: "Avg cost",
                  render: (r) => rs(r.avgCost),
                },
                {
                  key: "inventoryCost",
                  label: "Inventory cost",
                  total: "money",
                  render: (r) => rs(r.inventoryCost),
                },
                {
                  key: "potentialSales",
                  label: "Potential sales",
                  total: "money",
                  render: (r) => rs(r.potentialSales),
                },
                {
                  key: "potentialProfit",
                  label: "Potential profit (estimate)",
                  total: "money",
                  render: (r) => rs(r.potentialProfit),
                },
              ]}
              fields={[]}
              rowActions={(r, load, show) => (
                <InventoryActions row={r} reload={load} show={show} />
              )}
            />
          }
        />
        {!staff && (
          <Route path="purchases" element={<TradePage kind="purchases" />} />
        )}
        <Route
          path="sales"
          element={<TradePage kind="sales" staff={staff} />}
        />
        <Route
          path="customers"
          element={
            <DataPage
              title="Customers"
              endpoint="/customers"
              columns={party}
              fields={pf}
              rowActions={(r) => <Statement kind="customers" row={r} />}
            />
          }
        />
        <Route
          path="suppliers"
          element={
            <DataPage
              title="Suppliers"
              endpoint="/suppliers"
              columns={party}
              fields={pf}
              rowActions={(r) => <Statement kind="suppliers" row={r} />}
            />
          }
        />
        <Route
          path="expenses"
          element={
            <DataPage
              title="Expenses"
              endpoint="/expenses"
              search={false}
              columns={[
                { key: "date", label: "Date", render: (r) => ymd(r.date) },
                { key: "category", label: "Category" },
                { key: "description", label: "Description" },
                { key: "related", label: "Related" },
                {
                  key: "amount",
                  label: "Amount",
                  total: "money",
                  render: (r) => rs(r.amount),
                },
              ]}
              fields={[
                {
                  name: "category",
                  label: "Category",
                  type: "select",
                  setting: "expenseCategories",
                },
                { name: "description", label: "Description" },
                { name: "amount", label: "Amount (Rs.)", type: "money" },
                {
                  name: "account",
                  label: "Paid from",
                  type: "select",
                  endpoint: "/accounts",
                },
                {
                  name: "related",
                  label: "Related sale / purchase no. (optional)",
                },
                { name: "date", label: "Date", type: "date" },
              ]}
              rowActions={(r, load, show) => (
                <ReceiptButtons row={r} reload={load} show={show} />
              )}
            />
          }
        />
        {!staff && <Route path="accounts" element={<Accounts />} />}
        {!staff && <Route path="loans" element={<Loans />} />}
        <Route path="payables" element={<Payables />} />
        <Route path="reports" element={<Reports />} />
        <Route path="cashflow" element={<Reports fixed="cashflow" />} />
        {!staff && <Route path="settings" element={<Settings />} />}
        {!staff && <Route path="pnl" element={<Pnl />} />}
        {!staff && <Route path="closing" element={<Closing />} />}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
