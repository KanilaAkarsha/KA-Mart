const { Sale, Ledger, StockMovement } = require('../models/Trade');
const Product = require('../models/Product');
const { issueStock } = require('../lib/costing');
const { inTx, nextNo, payStatus } = require('./tx');
exports.createSale = (b, { key, allowNegative = false } = {}) => inTx(async (s) => {
  let subtotal = 0, cogs = 0; const lines = [];
  for (const l of b.lines) { // unitPrice is chosen per sale; the product's default price is never changed
    const prod = await Product.findById(l.product).session(s);
    if (!prod) throw new Error('Product not found');
    const out = issueStock({ qty: prod.qty, totalCost: prod.totalCost }, l.qty, { allowNegative });
    await Product.updateOne({ _id: prod._id }, { qty: out.stock.qty, totalCost: out.stock.totalCost }, { session: s });
    await StockMovement.create([{ product: prod._id, type: 'sale', qty: -l.qty, unitCost: Math.round(out.cogs / l.qty) }], { session: s });
    subtotal += l.qty * l.unitPrice; cogs += out.cogs; lines.push({ ...l, cogs: out.cogs });
  }
  const total = subtotal - (b.discount || 0) + (b.charges || 0);
  const invoice = await nextNo('invoice', 'INV', s);
  const [sale] = await Sale.create([{ ...b, invoice, lines, subtotal, total, cogs, paid: b.paid || 0, paymentStatus: payStatus(total, b.paid || 0) }], { session: s });
  if (b.paid > 0) await Ledger.create([{ account: b.account, type: 'sale_receipt', method: b.method, amount: b.paid, ref: invoice, key: key && `sale:${key}` }], { session: s });
  return sale;
});
exports.addPayment = (id, { amount, account, key, method }) => inTx(async (s) => {
  const sale = await Sale.findById(id).session(s);
  if (!sale || sale.status === 'cancelled') throw new Error('Sale not payable');
  if (sale.paid + amount > sale.total) throw new Error('Payment exceeds balance');
  await Ledger.create([{ account, type: 'customer_payment', method, amount, ref: sale.invoice, key: key && `pay:${key}` }], { session: s });
  sale.paid += amount; sale.paymentStatus = payStatus(sale.total, sale.paid); await sale.save({ session: s }); return sale;
});
exports.cancelSale = (id) => inTx(async (s) => { // stock restored at original cost; money returned via offsetting ledger entries, nothing deleted
  const sale = await Sale.findById(id).session(s);
  if (!sale || sale.status === 'cancelled') throw new Error('Cannot cancel');
  for (const l of sale.lines) {
    await Product.updateOne({ _id: l.product }, { $inc: { qty: l.qty, totalCost: l.cogs } }, { session: s });
    await StockMovement.create([{ product: l.product, type: 'cancel', qty: l.qty, unitCost: Math.round(l.cogs / l.qty), ref: sale.invoice }], { session: s });
  }
  const rec = await Ledger.find({ ref: sale.invoice, type: { $in: ['sale_receipt', 'customer_payment'] } }).session(s);
  for (const r of rec) await Ledger.create([{ account: r.account, type: 'customer_refund', amount: r.amount, ref: sale.invoice }], { session: s });
  sale.status = 'cancelled'; await sale.save({ session: s }); return sale;
});
