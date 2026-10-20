const express = require('express'); const { z } = require('zod');
const { Supplier, Customer } = require('../models/Party'); const { Purchase, Sale, Ledger } = require('../models/Trade'); const F = require('../services/financeService');
const wrap = (f) => (q, s, n) => f(q, s, n).catch(n); const id = z.string().length(24);
const body = z.object({ name: z.string().min(1), phone: z.string().optional(), address: z.string().optional(), notes: z.string().optional() });
function crud(Model, kind) {
  const r = express.Router();
  r.get('/', wrap(async (req, res) => {
    const list = await Model.find(req.query.q ? { name: new RegExp(req.query.q, 'i') } : {}).lean();
    const docs = kind === 'supplier' ? await Purchase.find({ deleted: { $ne: true } }).lean() : await Sale.find({ status: { $ne: 'cancelled' } }).lean();
    res.json(list.map((p) => { const mine = docs.filter((d) => String(d[kind]) === String(p._id)); const total = mine.reduce((a, d) => a + d.total, 0), paid = mine.reduce((a, d) => a + d.paid, 0);
      return { ...p, total, paid, outstanding: total - paid }; }));
  }));
  r.post('/', wrap(async (req, res) => res.status(201).json(await Model.create(body.parse(req.body)))));
  r.put('/:id', wrap(async (req, res) => res.json(await Model.findByIdAndUpdate(req.params.id, body.partial().parse(req.body), { new: true }))));
  r.get('/:id/statement', wrap(async (req, res) => { // documents plus the payments recorded against them
    const docs = await (kind === 'supplier' ? Purchase : Sale).find({ [kind]: req.params.id, deleted: { $ne: true } }).sort('date').lean();
    const refs = docs.map((d) => d.number || d.invoice); const pay = await Ledger.find({ ref: { $in: refs } }).sort('date').lean();
    res.json({ documents: docs, payments: pay, outstanding: docs.filter((d) => d.status !== 'cancelled').reduce((a, d) => a + d.total - d.paid, 0) });
  }));
  return r;
}
exports.suppliers = crud(Supplier, 'supplier'); exports.customers = crud(Customer, 'customer');
exports.suppliers.post('/purchases/:id/payments', wrap(async (req, res) => res.json(await F.payPurchase(req.params.id,
  { ...z.object({ amount: z.number().int().positive(), account: id, method: z.string().optional() }).parse(req.body), key: req.headers['idempotency-key'] }))));
