// Daily closing: expected cash = opening + inflows - outflows. Types map to the closing sheet lines.
const GROUPS = {
  cashSales: ["sale_receipt"],
  customerPayments: ["customer_payment"],
  supplierPayments: ["supplier_payment"],
  expenses: ["expense"],
  refunds: ["customer_refund"],
  otherIncome: [
    "other_income",
    "owner_contribution",
    "supplier_refund",
    "transfer_in",
    "deposit",
    "loan_received",
    "loan_collection",
  ],
  otherOutflows: [
    "owner_withdrawal",
    "transfer_out",
    "withdrawal",
    "loan_given",
    "loan_repayment",
  ],
};
const INFLOW = ["cashSales", "customerPayments", "otherIncome"];
function expectedClosing({ opening, txns, actual }) {
  const b = Object.fromEntries(
    Object.keys(GROUPS).map((k) => [
      k,
      txns
        .filter((t) => !t.reversed && GROUPS[k].includes(t.type))
        .reduce((a, t) => a + t.amount, 0),
    ]),
  );
  b.expenses -= txns
    .filter((t) => !t.reversed && t.type === "expense_reversal")
    .reduce((a, t) => a + t.amount, 0); // edited expenses net out
  const expected =
    opening +
    INFLOW.reduce((a, k) => a + b[k], 0) -
    Object.keys(b)
      .filter((k) => !INFLOW.includes(k))
      .reduce((a, k) => a + b[k], 0);
  return {
    opening,
    ...b,
    expected,
    ...(actual != null && { actual, difference: actual - expected }),
  };
}
module.exports = { expectedClosing };
