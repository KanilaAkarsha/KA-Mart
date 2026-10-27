const r = require("express").Router();
const {
  Sale,
  Purchase,
  Expense,
  Return,
  Account,
  Ledger,
  StockMovement,
} = require("../models/Trade");
const Product = require("../models/Product");
const { Supplier, Customer } = require("../models/Party");
const A = require("../lib/accounting");
const wrap = (f) => (q, s, n) => f(q, s, n).catch(n);
const day = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" })
    : "";
const win = (q) =>
  q.from || q.to
    ? {
        date: {
          ...(q.from && { $gte: new Date(`${q.from}T00:00:00+05:30`) }),
          ...(q.to && { $lte: new Date(`${q.to}T23:59:59.999+05:30`) }),
        },
      }
    : {};
const C = (...a) =>
  a.map(([key, label, money]) => ({ key, label, money: !!money }));
const live = (q) => ({ ...win(q), status: { $ne: "cancelled" } });
async function lineStats(q, keyFn) {
  // line-level revenue/cost (before invoice-level discount), grouped by keyFn(sale, line, product)
  const prods = Object.fromEntries(
    (await Product.find().lean()).map((p) => [String(p._id), p]),
  );
  const g = {};
  for (const s of await Sale.find(live(q)).lean())
    for (const l of s.lines) {
      const k = keyFn(s, l, prods[String(l.product)] || {}) || "Uncategorised";
      const x = (g[k] ||= { name: k, qty: 0, revenue: 0, cogs: 0 });
      x.qty += l.qty;
      x.revenue += l.qty * l.unitPrice;
      x.cogs += l.cogs;
    }
  return Object.values(g)
    .map((x) => ({ ...x, profit: x.revenue - x.cogs }))
    .sort((a, b) => b.profit - a.profit);
}
const stat = (label) =>
  C(
    ["name", label],
    ["qty", "Units"],
    ["revenue", "Revenue", 1],
    ["cogs", "Cost of goods", 1],
    ["profit", "Gross profit", 1],
  );
const REPORTS = {
  sales: async (q) => ({
    columns: C(
      ["invoice", "Invoice"],
      ["date", "Date"],
      ["customerName", "Customer"],
      ["channel", "Channel"],
      ["total", "Total", 1],
      ["paid", "Paid", 1],
      ["status", "Status"],
    ),
    rows: (await Sale.find(win(q)).sort("date").lean()).map((s) => ({
      ...s,
      date: day(s.date),
    })),
  }),
  purchases: async (q) => ({
    columns: C(
      ["number", "Purchase"],
      ["date", "Date"],
      ["supplierName", "Supplier"],
      ["total", "Total", 1],
      ["paid", "Paid", 1],
      ["status", "Status"],
    ),
    rows: (
      await Purchase.find({ ...win(q), deleted: { $ne: true } })
        .populate("supplier", "name")
        .sort("date")
        .lean()
    ).map((p) => ({ ...p, date: day(p.date), supplierName: p.supplier?.name })),
  }),
  expenses: async (q) => ({
    columns: C(
      ["date", "Date"],
      ["category", "Category"],
      ["description", "Description"],
      ["amount", "Amount", 1],
    ),
    rows: (await Expense.find(win(q)).sort("date").lean()).map((e) => ({
      ...e,
      date: day(e.date),
    })),
  }),
  inventory: async () => ({
    columns: C(
      ["sku", "SKU"],
      ["name", "Product"],
      ["qty", "Qty"],
      ["avgCost", "Avg cost", 1],
      ["value", "Inventory cost", 1],
      ["potential", "Potential sales", 1],
    ),
    rows: (await Product.find().lean()).map((p) => ({
      ...p,
      avgCost: p.qty ? Math.round(p.totalCost / p.qty) : 0,
      value: p.totalCost,
      potential: p.qty * p.sellingPrice,
    })),
  }),
  "stock-movements": async (q) => {
    const n = Object.fromEntries(
      (await Product.find().lean()).map((p) => [String(p._id), p.name]),
    );
    return {
      columns: C(
        ["date", "Date"],
        ["product", "Product"],
        ["type", "Type"],
        ["qty", "Qty"],
        ["unitCost", "Unit cost", 1],
        ["note", "Reason / reference"],
      ),
      rows: (await StockMovement.find(win(q)).sort("date").lean()).map((m) => ({
        ...m,
        date: day(m.date),
        product: n[String(m.product)],
        note: m.reason || m.ref,
      })),
    };
  },
  "supplier-balances": async () => {
    const p = await Purchase.find({ deleted: { $ne: true } }).lean();
    return {
      columns: C(
        ["name", "Supplier"],
        ["total", "Purchases", 1],
        ["paid", "Paid", 1],
        ["outstanding", "Outstanding", 1],
      ),
      rows: (await Supplier.find().lean()).map((s) => {
        const m = p.filter((x) => String(x.supplier) === String(s._id));
        const total = m.reduce((a, x) => a + x.total, 0),
          paid = m.reduce((a, x) => a + x.paid, 0);
        return { name: s.name, total, paid, outstanding: total - paid };
      }),
    };
  },
  "customer-balances": async () => {
    const p = await Sale.find({ status: { $ne: "cancelled" } }).lean();
    return {
      columns: C(
        ["name", "Customer"],
        ["total", "Sales", 1],
        ["paid", "Received", 1],
        ["outstanding", "Outstanding", 1],
      ),
      rows: (await Customer.find().lean()).map((s) => {
        const m = p.filter((x) => String(x.customer) === String(s._id));
        const total = m.reduce((a, x) => a + x.total, 0),
          paid = m.reduce((a, x) => a + x.paid, 0);
        return { name: s.name, total, paid, outstanding: total - paid };
      }),
    };
  },
  cashflow: async (q) => {
    const t = await Ledger.find(win(q)).lean();
    const g = {};
    t.filter((x) => !x.reversed).forEach((x) => {
      const o = (g[x.type] ||= {
        type: x.type,
        amount: 0,
        direction:
          A.accountBalance(0, [{ type: x.type, amount: 1 }]) > 0 ? "In" : "Out",
      });
      o.amount += x.amount;
    });
    return {
      columns: C(
        ["type", "Transaction type"],
        ["direction", "Direction"],
        ["amount", "Amount", 1],
      ),
      rows: Object.values(g),
      note: "Transfers net to zero across your accounts and are not income or expense.",
    };
  },
  accounts: async () => {
    const tx = await Ledger.find().lean();
    return {
      columns: C(
        ["name", "Account"],
        ["type", "Type"],
        ["opening", "Opening", 1],
        ["balance", "Balance", 1],
      ),
      rows: (await Account.find({ archived: { $ne: true } }).lean()).map(
        (a) => ({
          ...a,
          balance: A.accountBalance(
            a.opening,
            tx.filter((t) => String(t.account) === String(a._id)),
          ),
        }),
      ),
    };
  },
  "best-sellers": async (q) => ({
    columns: stat("Product"),
    rows: (await lineStats(q, (s, l, p) => p.name)).sort(
      (a, b) => b.qty - a.qty,
    ),
  }),
  "by-product": async (q) => ({
    columns: stat("Product"),
    rows: await lineStats(q, (s, l, p) => p.name),
  }),
  "by-category": async (q) => ({
    columns: stat("Category"),
    rows: await lineStats(q, (s, l, p) => p.category),
  }),
  "by-channel": async (q) => ({
    columns: stat("Channel"),
    rows: await lineStats(q, (s) => s.channel),
  }),
  "slow-moving": async (q) => {
    const since = new Date(
      q.from ? `${q.from}T00:00:00+05:30` : Date.now() - 30 * 864e5,
    );
    const last = {};
    (await Sale.find({ status: { $ne: "cancelled" } }).lean()).forEach((s) =>
      s.lines.forEach((l) => {
        if (!last[l.product] || s.date > last[l.product])
          last[l.product] = s.date;
      }),
    );
    return {
      columns: C(
        ["name", "Product"],
        ["qty", "In stock"],
        ["value", "Inventory cost", 1],
        ["lastSale", "Last sale"],
      ),
      rows: (await Product.find({ qty: { $gt: 0 } }).lean())
        .filter((p) => !last[p._id] || last[p._id] < since)
        .map((p) => ({
          name: p.name,
          qty: p.qty,
          value: p.totalCost,
          lastSale: day(last[p._id]) || "never",
        })),
      note: `No sales since ${day(since)}.`,
    };
  },
  monthly: async (q) => {
    const f = win(q);
    const [sales, ex, ret] = await Promise.all([
      Sale.find(f).lean(),
      Expense.find(f).lean(),
      Return.find(f).lean(),
    ]);
    const months = [
      ...new Set([...sales, ...ex, ...ret].map((x) => day(x.date).slice(0, 7))),
    ].sort();
    const m = (a, k) => a.filter((x) => day(x.date).startsWith(k));
    return {
      columns: C(
        ["month", "Month"],
        ["netSales", "Net sales", 1],
        ["cogs", "Cost of goods", 1],
        ["grossProfit", "Gross profit", 1],
        ["opex", "Operating expenses", 1],
        ["netProfit", "Net profit", 1],
      ),
      rows: months.map((k) => ({
        month: k,
        ...A.profitAndLoss({
          sales: m(sales, k),
          expenses: m(ex, k),
          returns: m(ret, k),
        }),
      })),
    };
  },
};
const csv = (d) =>
  [
    d.columns.map((c) => c.label).join(","),
    ...d.rows.map((x) =>
      d.columns
        .map((c) => {
          const v = c.money
            ? ((x[c.key] || 0) / 100).toFixed(2)
            : (x[c.key] ?? "");
          return `"${String(v).replace(/"/g, '""')}"`;
        })
        .join(","),
    ),
  ].join("\n");
r.get("/names", (req, res) => res.json(Object.keys(REPORTS)));
r.get(
  "/:name",
  wrap(async (req, res) => {
    const fn = REPORTS[req.params.name];
    if (!fn) return res.status(404).json({ error: "Unknown report" });
    const d = await fn(req.query);
    if (req.query.format === "csv") {
      res.type("text/csv").attachment(`${req.params.name}.csv`);
      return res.send(csv(d));
    }
    res.json(d);
  }),
);
module.exports = r;
