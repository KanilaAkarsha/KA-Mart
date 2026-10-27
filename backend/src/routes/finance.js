const r = require('express').Router(); const { z } = require('zod');
const { Account, Ledger, Expense, Sale, Settings } = require('../models/Trade'); const F = require('../services/financeService'); const { accountBalance } = require('../lib/accounting');
const path = require('path'), fs = require('fs'), crypto = require('crypto'); const { sniff, MIME, upload } = require('../lib/files'); const PRIV = path.join(__dirname, '../../private-uploads');
const { adminOnly } = require('../middleware/auth');
const wrap = (f) => (q, s, n) => f(q, s, n).catch(n); const id = z.string().length(24); const amt = z.number().int().positive(); const key = (q) => q.headers['idempotency-key'];
r.get('/accounts', wrap(async (req, res) => { const tx = await Ledger.find().lean();
  res.json((await Account.find(req.query.include === 'archived' ? {} : { archived: { $ne: true } }).lean()).map((a) => ({ ...a, balance: accountBalance(a.opening, tx.filter((t) => String(t.account) === String(a._id))) }))); }));
r.post('/accounts', wrap(async (req, res) => res.status(201).json(await Account.create(z.object({ name: z.string().min(1), type: z.enum(['cash', 'bank', 'mobile', 'other']), opening: z.number().int().default(0) }).parse(req.body)))));
r.delete('/accounts/:id([0-9a-f]{24})', adminOnly, wrap(async (req, res) => { // no history: removed. With history: archived once its balance is zero, so records and past reports stay correct
  const a = await Account.findById(req.params.id); if (!a) throw new Error('Account not found'); const tx = await Ledger.find({ account: a._id }).lean();
  if (!tx.length) { await a.deleteOne(); return res.json({ deleted: true }); }
  const bal = accountBalance(a.opening, tx); if (bal !== 0) throw new Error(`This account still holds Rs. ${(bal / 100).toLocaleString('en-LK', { minimumFractionDigits: 2 })}. Move it to another account (Transfer) or record an owner withdrawal first, then delete it.`);
  a.archived = true; await a.save(); res.json({ archived: true }); }));
r.get('/accounts/:id/transactions', wrap(async (req, res) => res.json(await Ledger.find({ account: req.params.id }).sort('-date').limit(500))));
r.post('/accounts/transfer', wrap(async (req, res) => res.json(await F.transfer({ ...z.object({ from: id, to: id, amount: amt }).parse(req.body), key: key(req) }))));
r.post('/accounts/entry', wrap(async (req, res) => { const b = z.object({ account: id, amount: amt, type: z.enum(['owner_contribution', 'owner_withdrawal', 'other_income', 'supplier_refund']), date: z.coerce.date().optional() }).parse(req.body);
  res.status(201).json(await Ledger.create({ ...b, ref: 'manual', key: key(req) && `ent:${key(req)}` })); }));
r.get('/expenses', wrap(async (req, res) => res.json(await Expense.find().sort('-date').limit(500))));
r.post('/expenses', wrap(async (req, res) => res.status(201).json(await F.createExpense(z.object({ date: z.coerce.date().optional(), category: z.string(), description: z.string().optional(), related: z.string().max(60).optional(), amount: amt, account: id }).parse(req.body), key(req)))));
r.post('/sales/:id/returns', wrap(async (req, res) => res.status(201).json(await F.processReturn(req.params.id, z.object({ lines: z.array(z.object({ product: id, qty: z.number().int().positive() })).min(1), restock: z.boolean().default(true), account: id, reason: z.string().optional() }).parse(req.body)))));
r.put('/expenses/:id', wrap(async (req, res) => res.json(await F.updateExpense(req.params.id, z.object({ date: z.coerce.date(), category: z.string(), description: z.string(), related: z.string().max(60), amount: amt, account: id }).partial().parse(req.body)))));
r.put('/accounts/:id', wrap(async (req, res) => res.json(await Account.findByIdAndUpdate(req.params.id, z.object({ name: z.string().min(1), type: z.enum(['cash', 'bank', 'mobile', 'other']), opening: z.number().int() }).partial().parse(req.body), { new: true }))));
r.post('/expenses/:id([0-9a-f]{24})/receipt', upload(3).single('receipt'), wrap(async (req, res) => { // images or PDF, checked by content, stored outside the public folder
  if (!req.file) throw new Error('No file'); const ext = sniff(req.file.buffer); if (!ext) throw new Error('Only JPG, PNG, WebP or PDF files are allowed');
  const e = await Expense.findById(req.params.id); if (!e) throw new Error('Expense not found'); fs.mkdirSync(PRIV, { recursive: true });
  const name = `${crypto.randomBytes(16).toString('hex')}.${ext}`; fs.writeFileSync(path.join(PRIV, name), req.file.buffer);
  if (e.receipt) fs.rm(path.join(PRIV, path.basename(e.receipt)), () => {}); e.receipt = name; await e.save(); res.json(e); }));
r.get('/expenses/:id([0-9a-f]{24})/receipt', wrap(async (req, res) => { const e = await Expense.findById(req.params.id); if (!e?.receipt) return res.status(404).json({ error: 'No receipt' });
  res.set({ 'X-Content-Type-Options': 'nosniff', 'Content-Type': MIME[path.extname(e.receipt).slice(1)], 'Content-Disposition': 'inline' }); res.sendFile(path.join(PRIV, path.basename(e.receipt))); }));
r.get('/settings', wrap(async (req, res) => res.json(await Settings.findByIdAndUpdate('main', {}, { upsert: true, new: true, setDefaultsOnInsert: true }))));
const list = z.array(z.string().trim().min(1).max(60)).max(50).transform((a) => [...new Set(a)]);
r.put('/settings', wrap(async (req, res) => res.json(await Settings.findByIdAndUpdate('main', z.object({ businessName: z.string().min(1), address: z.string(), phone: z.string(), whatsapp: z.string(),
  lowStockDefault: z.number().int().min(0), expenseCategories: list, productCategories: list, paymentMethods: list, salesChannels: list }).partial().parse(req.body), { upsert: true, new: true }))));
module.exports = r;
