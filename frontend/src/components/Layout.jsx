import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Boxes,
  ShoppingCart,
  Receipt,
  Users,
  Truck,
  Wallet,
  Landmark,
  HandCoins,
  TrendingUp,
  ClipboardCheck,
  ArrowLeftRight,
  FileBarChart,
  Settings,
  Scale,
  LogOut,
  Menu,
} from "lucide-react";
const nav = [
  ["/", "Dashboard", LayoutDashboard],
  ["/products", "Products", Package],
  ["/inventory", "Inventory", Boxes],
  ["/purchases", "Purchases", ShoppingCart],
  ["/sales", "Sales", Receipt],
  ["/customers", "Customers", Users],
  ["/suppliers", "Suppliers", Truck],
  ["/payables", "Payables & Receivables", Scale],
  ["/expenses", "Expenses", Wallet],
  ["/accounts", "Accounts", Landmark],
  ["/loans", "Loans", HandCoins],
  ["/cashflow", "Cash Flow", ArrowLeftRight],
  ["/pnl", "Profit & Loss", TrendingUp],
  ["/reports", "Reports", FileBarChart],
  ["/closing", "Daily Closing", ClipboardCheck],
  ["/settings", "Settings", Settings],
];
const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem("kam_user") || "{}");
  } catch {
    return {};
  }
};
export default function Layout() {
  const [open, setOpen] = useState(false);
  const go = useNavigate();
  const isStaff = getUser().role === "staff";
  return (
    <div className="min-h-screen md:flex">
      <aside
        className={`${open ? "block" : "hidden"} md:block w-full md:w-60 bg-navy text-white md:min-h-screen shrink-0`}
      >
        <div className="p-5">
          <div className="text-xl font-bold tracking-wide">
            KA <span className="text-green-400">MART</span>
          </div>
          <div className="text-xs text-slate-300">
            Your One Stop Shopping Store
          </div>
        </div>
        <nav className="px-2 space-y-1">
          {nav
            .filter(
              ([to]) => !isStaff || ["/", "/products", "/sales"].includes(to),
            )
            .map(([to, label, Icon]) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${isActive ? "bg-brand text-white" : "text-slate-200 hover:bg-white/10"}`
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
        </nav>
        <button
          onClick={() => {
            localStorage.removeItem("kam_token");
            localStorage.removeItem("kam_user");
            go("/login");
          }}
          className="m-4 flex items-center gap-2 text-sm text-slate-300 hover:text-white"
        >
          <LogOut size={16} />
          Log out
        </button>
      </aside>
      <div className="flex-1 min-w-0">
        <div className="md:hidden bg-white border-b p-3 no-print">
          <button onClick={() => setOpen(!open)}>
            <Menu />
          </button>
        </div>
        <main className="p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
