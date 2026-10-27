const r = require("express").Router();
const {
  Sale,
  Purchase,
  Expense,
  Return,
  Account,
  Ledger,
  DailyClosing,
} = require("../models/Trade");
const Product = require("../models/Product");
const A = require("../lib/accounting");
const { expectedClosing } = require("../lib/closing");
const wrap = (f) => (q, s, n) => f(q, s, n).catch(n);
const day = (d) =>
  new Date(d).toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" });
const start = (s) => new Date(`${s}T00:00:00+05:30`);
const end = (s) => new Date(`${s}T23:59:59.999+05:30`);
const rng = (q) => ({
  ...(q.from || q.to
    ? {
        date: {
          ...(q.from && { $gte: start(q.from) }),
          ...(q.to && { $lte: end(q.to) }),
        },
      }
    : {}),
});
r.get(
  "/pnl",
  wrap(async (req, res) => {
    const f = rng(req.query);
    const [sales, expenses, returns] = await Promise.all([
      Sale.find(f).lean(),
      Expense.find(f).lean(),
      Return.find(f).lean(),
    ]);
    res.json(A.profitAndLoss({ sales, expenses, returns }));
  }),
);
r.get(
  "/dashboard",
  wrap(async (req, res) => {
    const f = rng(req.query);
    const today = day(new Date());
    const [sales, allSales, purchases, expenses, returns, accts, tx, prods] =
      await Promise.all([
        Sale.find(f).lean(),
        Sale.find().lean(),
        Purchase.find({ deleted: { $ne: true } }).lean(),
        Expense.find(f).lean(),
        Return.find(f).lean(),
        Account.find().lean(),
        Ledger.find().lean(),
        Product.find().lean(),
      ]);
    const pnl = A.profitAndLoss({ sales, expenses, returns });
    const bal = accts.map((a) => ({
      ...a,
      balance: A.accountBalance(
        a.opening,
        tx.filter((t) => String(t.account) === String(a._id)),
      ),
    }));
    const series = {};
    const bump = (d, k, v) => {
      const s = (series[day(d)] ||= { date: day(d), sales: 0, expenses: 0 });
      s[k] += v;
    };
    sales
      .filter((s) => s.status !== "cancelled")
      .forEach((s) => bump(s.date, "sales", s.total));
    expenses.forEach((e) => bump(e.date, "expenses", e.amount));
    const sold = {};
    sales
      .filter((s) => s.status !== "cancelled")
      .forEach((s) =>
        s.lines.forEach(
          (l) => (sold[l.product] = (sold[l.product] || 0) + l.qty),
        ),
      );
    res.json({
      ...(req.user.role === "staff"
        ? {
            revenue: pnl.netSales,
            totalProducts: prods.length,
            lowStock: prods
              .filter((p) => p.qty <= p.minStock)
              .map((p) => ({ _id: p._id, name: p.name, qty: p.qty })),
            salesToday: allSales
              .filter((s) => s.status !== "cancelled" && day(s.date) === today)
              .reduce((a, s) => a + s.total, 0),
            series: Object.values(series).sort((a, b) =>
              a.date.localeCompare(b.date),
            ),
            bestSellers: Object.entries(sold)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([p, q]) => ({
                name: prods.find((x) => String(x._id) === p)?.name,
                qty: q,
              })),
          }
        : {
            ...pnl,
            revenue: pnl.netSales,
            cashBalance: bal
              .filter((a) => a.type === "cash")
              .reduce((a, b) => a + b.balance, 0),
            bankBalance: bal
              .filter((a) => a.type !== "cash")
              .reduce((a, b) => a + b.balance, 0),
            inventoryValue: A.inventoryValue(prods),
            supplierOutstanding: purchases.reduce(
              (a, p) => a + p.total - p.paid,
              0,
            ),
            customerOutstanding: allSales
              .filter((s) => s.status !== "cancelled")
              .reduce((a, s) => a + s.total - s.paid, 0),
            totalProducts: prods.length,
            lowStock: prods
              .filter((p) => p.qty <= p.minStock)
              .map((p) => ({ _id: p._id, name: p.name, qty: p.qty })),
            salesToday: allSales
              .filter((s) => s.status !== "cancelled" && day(s.date) === today)
              .reduce((a, s) => a + s.total, 0),
            purchasesToday: purchases
              .filter((p) => day(p.date) === today)
              .reduce((a, p) => a + p.total, 0),
            series: Object.values(series).sort((a, b) =>
              a.date.localeCompare(b.date),
            ),
            bestSellers: Object.entries(sold)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([p, q]) => ({
                name: prods.find((x) => String(x._id) === p)?.name,
                qty: q,
              })),
          }),
    });
  }),
);
r.get(
  "/payables",
  wrap(async (req, res) => {
    const now = new Date();
    res.json(
      (
        await Purchase.find({ deleted: { $ne: true } })
          .populate("supplier", "name phone")
          .lean()
      )
        .filter((p) => p.total > p.paid)
        .map((p) => ({
          ...p,
          outstanding: p.total - p.paid,
          overdue: !!p.dueDate && p.dueDate < now,
        })),
    );
  }),
);
r.get(
  "/receivables",
  wrap(async (req, res) =>
    res.json(
      (
        await Sale.find({ status: { $ne: "cancelled" } })
          .populate("customer", "name phone")
          .lean()
      )
        .filter((s) => s.total > s.paid)
        .map((s) => ({ ...s, outstanding: s.total - s.paid })),
    ),
  ),
);
r.get(
  "/closing/:date",
  wrap(async (req, res) => {
    const cash = await Account.find({ type: "cash" }).lean();
    const ids = cash.map((a) => String(a._id));
    const all = (await Ledger.find().lean()).filter((t) =>
      ids.includes(String(t.account)),
    );
    const before = all.filter((t) => t.date < start(req.params.date));
    const today = all.filter(
      (t) => t.date >= start(req.params.date) && t.date <= end(req.params.date),
    );
    const opening = A.accountBalance(
      cash.reduce((a, c) => a + c.opening, 0),
      before,
    );
    const saved = await DailyClosing.findOne({ date: req.params.date });
    res.json({
      ...expectedClosing({ opening, txns: today, actual: saved?.actual }),
      explanation: saved?.explanation,
    });
  }),
);
r.post(
  "/closing/:date",
  wrap(async (req, res) => {
    const c = await (async () => {
      const r2 = await fetchClosing(req);
      return r2;
    })();
    res.json(c);
  }),
);
async function fetchClosing(req) {
  const cash = await Account.find({ type: "cash" }).lean();
  const ids = cash.map((a) => String(a._id));
  const all = (await Ledger.find().lean()).filter((t) =>
    ids.includes(String(t.account)),
  );
  const d = req.params.date;
  const opening = A.accountBalance(
    cash.reduce((a, c) => a + c.opening, 0),
    all.filter((t) => t.date < start(d)),
  );
  const b = expectedClosing({
    opening,
    txns: all.filter((t) => t.date >= start(d) && t.date <= end(d)),
    actual: req.body.actual,
  });
  await DailyClosing.findOneAndUpdate(
    { date: d },
    {
      date: d,
      expected: b.expected,
      actual: b.actual,
      difference: b.difference,
      explanation: req.body.explanation,
      breakdown: b,
    },
    { upsert: true },
  );
  return b;
}
module.exports = r;
