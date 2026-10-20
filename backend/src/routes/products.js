const r = require('express').Router(); const { z } = require('zod');
const Product = require('../models/Product'); const { StockMovement } = require('../models/Trade');
const multer = require('multer'), path = require('path'), fs = require('fs'), crypto = require('crypto');
const up = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024, files: 1 } }); const DIR = path.join(__dirname, '../../uploads');
const sniff = (b) => (b.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])) ? 'jpg' : b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) ? 'png' : b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP' ? 'webp' : null);
const wrap = (f) => (q, s, n) => f(q, s, n).catch(n);
const body = z.object({ name: z.string().min(1), sku: z.string().min(1), sellingPrice: z.number().int().min(0), studentPrice: z.number().int().min(0).optional(),
  category: z.string().optional(), brand: z.string().optional(), compatibility: z.string().optional(), description: z.string().optional(), minStock: z.number().int().min(0).optional() });
r.get('/', wrap(async (req, res) => {
  const { q, category, low, page = 1, limit = 20 } = req.query; const f = {};
  if (q) { const rx = new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'); f.$or = [{ name: rx }, { sku: rx }, { brand: rx }]; }
  if (category) f.category = category;
  let all = await Product.find(f).sort('-createdAt'); if (low) all = all.filter((p) => p.qty <= p.minStock); // portable low-stock filter
  const items = all.slice((page - 1) * limit, page * limit);
  res.json({ items: items.map((p) => ({ ...p.toObject(), avgCost: p.qty ? Math.round(p.totalCost / p.qty) : 0,
    potentialSales: p.qty * p.sellingPrice, inventoryCost: p.totalCost, potentialProfit: p.qty * p.sellingPrice - p.totalCost })), total: all.length });
}));
r.post('/', wrap(async (req, res) => res.status(201).json(await Product.create(body.parse(req.body)))));
r.put('/:id', wrap(async (req, res) => res.json(await Product.findByIdAndUpdate(req.params.id, body.partial().parse(req.body), { new: true }))));
r.post('/:id/adjust', wrap(async (req, res) => { // damaged/lost/found: value moves at average cost
  const { qty, reason } = z.object({ qty: z.number().int().refine((n) => n !== 0), reason: z.string().min(3) }).parse(req.body);
  const p = await Product.findById(req.params.id); if (p.qty + qty < 0) throw new Error('Would make stock negative');
  const cost = Math.round((p.qty ? p.totalCost / p.qty : 0) * qty); p.qty += qty; p.totalCost += cost; await p.save();
  await StockMovement.create({ product: p._id, type: 'adjustment', qty, unitCost: Math.abs(Math.round(cost / qty)), reason }); res.json(p);
}));
r.get('/:id/movements', wrap(async (req, res) => res.json(await StockMovement.find({ product: req.params.id }).sort('-date').limit(200))));
r.post('/:id([0-9a-f]{24})/image', up.single('image'), wrap(async (req, res) => { // type checked by file signature, random name, 2 MB cap
  if (!req.file) throw new Error('No file'); const ext = sniff(req.file.buffer); if (!ext) throw new Error('Only JPG, PNG or WebP images are allowed');
  const p = await Product.findById(req.params.id); if (!p) throw new Error('Product not found'); fs.mkdirSync(DIR, { recursive: true });
  const name = `${crypto.randomBytes(16).toString('hex')}.${ext}`; fs.writeFileSync(path.join(DIR, name), req.file.buffer);
  if (p.image) fs.rm(path.join(DIR, path.basename(p.image)), () => {}); p.image = `/uploads/${name}`; await p.save(); res.json(p); }));
module.exports = r;
