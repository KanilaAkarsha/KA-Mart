const test = require('node:test');
const assert = require('node:assert/strict');
const { toMinor: m, fmt } = require('../src/lib/money');
const C = require('../src/lib/costing');
const A = require('../src/lib/accounting');

const sale = (price, cogs, extra = {}) => ({ subtotal: m(price), cogs: m(cogs), status: 'confirmed', ...extra });
const op = (n) => ({ type: 'operating', amount: m(n) });

test('format money', () => assert.equal(fmt(m(1250)), 'Rs. 1,250.00'));

test('CASE 1 normal sale', () => {
  const r = A.profitAndLoss({ sales: [sale(799, 290)], expenses: [op(50)] });
  assert.equal(r.grossProfit, m(509)); assert.equal(r.netProfit, m(459));
});
test('CASE 2 student sale', () => {
  const r = A.profitAndLoss({ sales: [sale(599, 290)], expenses: [op(50)] });
  assert.equal(r.grossProfit, m(309)); assert.equal(r.netProfit, m(259));
});
test('CASE 3 credit sale: cash 300, owed 499', () => {
  assert.equal(A.outstanding(m(799), [m(300)]), m(499));
  const cash = A.accountBalance(0, [{ type: 'sale_receipt', amount: m(300) }]);
  assert.equal(cash, m(300));
  assert.equal(A.paymentStatus(m(799), m(300)), 'partial');
});
test('CASE 4 landed cost and weighted average', () => {
  const p = C.landedPurchase({ lines: [{ qty: 10, unitPrice: m(290) }], extraCosts: m(200) });
  assert.equal(p.total, m(3100));
  const s = C.receiveStock({ qty: 0, totalCost: 0 }, 10, p.total);
  assert.equal(C.avgCost(s), m(310));
});
test('CASE 5 remaining inventory', () => {
  let s = C.receiveStock({ qty: 0, totalCost: 0 }, 10, m(2900));
  const out = C.issueStock(s, 2); s = out.stock;
  const r = A.profitAndLoss({ sales: [{ subtotal: m(1598), cogs: out.cogs, status: 'confirmed' }] });
  assert.equal(r.netSales, m(1598)); assert.equal(r.cogs, m(580)); assert.equal(r.grossProfit, m(1018));
  assert.equal(A.inventoryValue([s]), m(2320));
});
test('weighted average across two purchase prices', () => {
  let s = C.receiveStock({ qty: 0, totalCost: 0 }, 10, m(2900));
  s = C.receiveStock(s, 10, m(3500));
  assert.equal(C.avgCost(s), m(320));
});
test('allocated landed costs sum exactly', () => {
  const p = C.landedPurchase({ lines: [{ qty: 3, unitPrice: 100 }, { qty: 7, unitPrice: 333 }], discount: 101, extraCosts: 77 });
  assert.equal(p.lines.reduce((a, l) => a + l.landedTotal, 0), p.total);
});
test('stock cannot go negative unless allowed', () => {
  const s = { qty: 1, totalCost: m(290) };
  assert.throws(() => C.issueStock(s, 2), /Insufficient/);
  assert.equal(C.issueStock(s, 2, { allowNegative: true }).stock.qty, -1);
});
test('partial payments settle a supplier purchase', () => {
  const pays = [m(1000), m(1000)];
  assert.equal(A.outstanding(m(3100), pays), m(1100));
  assert.equal(A.paymentStatus(m(3100), m(3100)), 'paid');
});
test('transfers and owner money do not touch profit', () => {
  const before = A.profitAndLoss({ sales: [sale(799, 290)] });
  // owner draw / transfer exist only in ledger, never in expenses of type operating
  const after = A.profitAndLoss({ sales: [sale(799, 290)], expenses: [{ type: 'owner_withdrawal', amount: m(5000) }] });
  assert.deepEqual(before, after);
  const cash = A.accountBalance(m(1000), [
    { type: 'transfer_out', amount: m(400) }, { type: 'owner_contribution', amount: m(200) }]);
  assert.equal(cash, m(800));
});
test('cancelled sale is not revenue; return reverses revenue and cost', () => {
  const r0 = A.profitAndLoss({ sales: [sale(799, 290, { status: 'cancelled' })] });
  assert.equal(r0.netSales, 0);
  const r1 = A.profitAndLoss({ sales: [sale(799, 290)], returns: [{ refundValue: m(799), restockedCogs: m(290) }] });
  assert.equal(r1.grossProfit, 0);
  const s = C.restoreStock({ qty: 9, totalCost: m(2610) }, 1, m(290));
  assert.equal(s.qty, 10); assert.equal(s.totalCost, m(2900));
});
test('stock adjustment (damaged) lowers inventory value at average cost', () => {
  const out = C.issueStock({ qty: 10, totalCost: m(2900) }, 1);
  assert.equal(out.cogs, m(290)); assert.equal(out.stock.totalCost, m(2610));
});

const { expectedClosing } = require('../src/lib/closing');
test('daily closing: expected cash, difference, transfers separate from income', () => {
  const c = expectedClosing({ opening: m(1000), actual: m(1300), txns: [
    { type: 'sale_receipt', amount: m(799) }, { type: 'customer_payment', amount: m(300) }, { type: 'supplier_payment', amount: m(500) },
    { type: 'expense', amount: m(50) }, { type: 'customer_refund', amount: m(100) }, { type: 'transfer_out', amount: m(200) }] });
  assert.equal(c.expected, m(1249)); assert.equal(c.difference, m(51));
});
test('partial return restocks and reverses only the returned part', () => {
  const r = A.profitAndLoss({ sales: [{ subtotal: m(1598), cogs: m(580), status: 'confirmed' }], returns: [{ refundValue: m(799), restockedCogs: m(290) }] });
  assert.equal(r.netSales, m(799)); assert.equal(r.grossProfit, m(509));
});

test('edited expense: reversal nets out of closing expenses and restores balance', () => {
  const t = [{ type: 'expense', amount: m(50) }, { type: 'expense_reversal', amount: m(50) }, { type: 'expense', amount: m(80) }];
  assert.equal(expectedClosing({ opening: m(1000), txns: t }).expenses, m(80));
  assert.equal(A.accountBalance(m(1000), t), m(920));
});
