const { Ledger, Expense, Sale, Return, StockMovement, Purchase } = require('../models/Trade');
const Product = require('../models/Product');
const { inTx, payStatus } = require('./tx');
exports.transfer = ({ from, to, amount, key }) => inTx(async (s) => { // not income, not expense
  if (String(from) === String(to)) throw new Error('Same account');
  await Ledger.create([{ account: from, type: 'transfer_out', amount, ref: 'transfer', key: key && `${key}:o` }, { account: to, type: 'transfer_in', amount, ref: 'transfer', key: key && `${key}:i` }], { session: s, ordered: true });
  return { ok: true };
});
exports.createExpense = (b, key) => inTx(async (s) => {
  const [e] = await Expense.create([b], { session: s });
  await Ledger.create([{ account: b.account, type: 'expense', amount: b.amount, ref: String(e._id), date: b.date, key: key && `exp:${key}` }], { session: s }); return e;
});
exports.payPurchase = (id, { amount, account, key, method }) => inTx(async (s) => {
  const p = await Purchase.findById(id).session(s); if (!p || p.deleted || p.paid + amount > p.total) throw new Error('Invalid payment amount');
  await Ledger.create([{ account, type: 'supplier_payment', method, amount, ref: p.number, key: key && `spay:${key}` }], { session: s });
  p.paid += amount; p.status = payStatus(p.total, p.paid); await p.save({ session: s }); return p;
});
exports.processReturn = (saleId, { lines, restock = true, account, reason }) => inTx(async (s) => {
  const sale = await Sale.findById(saleId).session(s); if (!sale || sale.status === 'cancelled') throw new Error('Sale not returnable');
  const prior = await Return.find({ sale: saleId }).session(s); let refundValue = 0, restockedCogs = 0; const out = [];
  for (const r of lines) {
    const l = sale.lines.find((x) => String(x.product) === String(r.product)); if (!l) throw new Error('Product not on sale');
    const done = prior.flatMap((p) => p.lines).filter((x) => String(x.product) === String(r.product)).reduce((a, x) => a + x.qty, 0);
    if (done + r.qty > l.qty) throw new Error('Return exceeds sold quantity');
    const value = r.qty * l.unitPrice, cogs = Math.round((l.cogs / l.qty) * r.qty); refundValue += value; out.push({ product: r.product, qty: r.qty, value, cogs });
    if (restock) { restockedCogs += cogs; await Product.updateOne({ _id: r.product }, { $inc: { qty: r.qty, totalCost: cogs } }, { session: s });
      await StockMovement.create([{ product: r.product, type: 'return', qty: r.qty, unitCost: Math.round(cogs / r.qty), ref: sale.invoice }], { session: s }); }
  }
  const [ret] = await Return.create([{ sale: saleId, invoice: sale.invoice, lines: out, refundValue, restockedCogs, restock, reason }], { session: s });
  const refund = Math.min(refundValue, sale.paid); // only refund cash actually received; rest reduces what the customer owes
  if (refund > 0) await Ledger.create([{ account, type: 'customer_refund', amount: refund, ref: sale.invoice }], { session: s });
  sale.paid -= refund; sale.total -= refundValue; sale.paymentStatus = payStatus(sale.total, sale.paid); await sale.save({ session: s }); return ret;
});

exports.updateExpense = (id, b) => inTx(async (s) => { // history stays: old posting is reversed, new one is added
  const e = await Expense.findById(id).session(s); if (!e) throw new Error('Expense not found');
  const changed = (b.amount != null && b.amount !== e.amount) || (b.account && String(b.account) !== String(e.account)) || (b.date && +new Date(b.date) !== +e.date);
  if (changed) {
    const old = await Ledger.findOne({ ref: String(e._id), type: 'expense' }).sort('-createdAt').session(s);
    if (old) await Ledger.create([{ account: old.account, type: 'expense_reversal', amount: old.amount, ref: String(e._id) }], { session: s });
    await Ledger.create([{ account: b.account || e.account, type: 'expense', amount: b.amount ?? e.amount, ref: String(e._id), date: b.date || e.date }], { session: s });
  }
  Object.assign(e, b); await e.save({ session: s }); return e;
});
