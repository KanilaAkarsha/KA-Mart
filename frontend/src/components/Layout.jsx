import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Boxes,
  ShoppingCart,
  Receipt,
  Calculator,
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
import BrandLogo from "./BrandLogo";
import { currentUser } from "../utils";
const nav = [
  ["/", "Dashboard", LayoutDashboard],
  ["/products", "Products", Package],
  ["/inventory", "Inventory", Boxes],
  ["/purchases", "Purchases", ShoppingCart],
  ["/sales", "Sales", Receipt],
  ["/cashier", "Cashier", Calculator],
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
export default function Layout() {
  const [open, setOpen] = useState(false);
  const user = currentUser();
  const isStaff = user.role === "staff";
  const cashierAllowed = !isStaff || user.cashierAccess !== false;
  return (
    <div className="min-h-screen md:flex">
      <aside
        className={`${open ? "block" : "hidden"} md:block w-full md:w-60 bg-navy text-white md:min-h-screen shrink-0`}
      >
        <div className="p-5">
          <img
              src="/IMG_0843.PNG"
              alt="KA Mart - Your One Stop Shopping Store"
              className={`w-[190px] h-[60px] object-cover object-center scale-125`}
          />
        </div>
        <nav className="px-2 space-y-1">
          {nav
            .filter(
              ([to]) =>
                !isStaff ||
                ["/", "/products", "/customers", "/settings"].includes(to) ||
                (["/sales"].includes(to) && cashierAllowed) ||
                (to === "/cashier" && !isStaff),
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
            window.location.assign("/login");
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
