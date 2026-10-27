// Pure business formulas. Cancelled sales are excluded everywhere.
const live = (sales) => sales.filter((s) => s.status !== "cancelled");

function profitAndLoss({
  sales = [],
  returns = [],
  expenses = [],
  otherIncome = 0,
  otherExpense = 0,
}) {
  const ok = live(sales);
  const grossSales = ok.reduce((a, s) => a + s.subtotal + (s.charges || 0), 0);
  const discounts = ok.reduce((a, s) => a + (s.discount || 0), 0);
  const salesReturns = returns.reduce((a, r) => a + r.refundValue, 0);
  const netSales = grossSales - discounts - salesReturns;
  const cogsSold = ok.reduce((a, s) => a + s.cogs, 0);
  const cogsReturned = returns.reduce((a, r) => a + (r.restockedCogs || 0), 0);
  const cogs = cogsSold - cogsReturned;
  const grossProfit = netSales - cogs;
  // Only operating expenses count; transfers/owner draws never reach here.
  const opex = expenses
    .filter((e) => e.type === "operating")
    .reduce((a, e) => a + e.amount, 0);
  const netOperating = grossProfit - opex;
  return {
    grossSales,
    discounts,
    salesReturns,
    netSales,
    cogs,
    grossProfit,
    opex,
    netOperating,
    netProfit: netOperating + otherIncome - otherExpense,
  };
}

const outstanding = (total, payments) =>
  total - payments.reduce((a, p) => a + p, 0);
const paymentStatus = (total, paid) =>
  paid <= 0 ? "unpaid" : paid >= total ? "paid" : "partial";

// Ledger types: in = receipt, out = payment, transfer_in/out never affect P&L.
const IN = [
  "sale_receipt",
  "customer_payment",
  "supplier_refund",
  "deposit",
  "owner_contribution",
  "transfer_in",
  "other_income",
  "expense_reversal",
  "loan_received",
  "loan_collection",
];
function accountBalance(opening, txns) {
  return txns
    .filter((t) => !t.reversed)
    .reduce(
      (b, t) => (IN.includes(t.type) ? b + t.amount : b - t.amount),
      opening,
    );
}
const inventoryValue = (stocks) => stocks.reduce((a, s) => a + s.totalCost, 0);
module.exports = {
  profitAndLoss,
  outstanding,
  paymentStatus,
  accountBalance,
  inventoryValue,
};
