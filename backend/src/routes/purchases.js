const r = require("express").Router();
const { z } = require("zod");
const { Purchase } = require("../models/Trade");
const {
  createPurchase,
  deletePurchase,
} = require("../services/purchaseService");
const { adminOnly } = require("../middleware/auth");
const rateLimit = require("express-rate-limit");
const { sniff, MIME, upload } = require("../lib/files");
const {
  extractBill,
  parseBillJson,
  matchBill,
} = require("../services/billScanner");
const Product = require("../models/Product");
const { Supplier } = require("../models/Party");
const wrap = (f) => (q, s, n) => f(q, s, n).catch(n);
const id = z.string().length(24);
const m = z.number().int().min(0);
const body = z.object({
  supplier: id,
  account: id.optional(),
  date: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
  notes: z.string().optional(),
  lines: z
    .array(
      z.object({ product: id, qty: z.number().int().positive(), unitPrice: m }),
    )
    .min(1),
  discount: m.optional(),
  extraCosts: m.optional(),
  paid: m.optional(),
  method: z.string().optional(),
  billNumber: z.string().max(40).optional(),
  allowDuplicate: z.boolean().optional(),
});
r.post(
  "/scan-bill",
  rateLimit({ windowMs: 60000, max: 10 }),
  upload(5).single("bill"),
  wrap(async (req, res) => {
    // photo/PDF in, editable suggestions out; nothing is saved
    if (!req.file) throw new Error("No file");
    const ext = sniff(req.file.buffer);
    if (!ext) throw new Error("Upload a JPG, PNG, WebP or PDF of the bill");
    const parsed = parseBillJson(await extractBill(req.file.buffer, MIME[ext]));
    const out = matchBill(
      parsed,
      await Product.find({ active: true }).lean(),
      await Supplier.find().lean(),
    );
    if (out.billNumber && out.supplier) {
      const d = await Purchase.findOne({
        supplier: out.supplier.id,
        billNumber: out.billNumber,
        deleted: { $ne: true },
      }).lean();
      if (d) out.duplicateOf = { number: d.number, date: d.date };
    }
    res.json(out);
  }),
);
const path = require("path"),
  fs = require("fs"),
  crypto = require("crypto");
const PRIV = path.join(__dirname, "../../private-uploads");
r.post(
  "/:id([0-9a-f]{24})/bill",
  upload(5).single("bill"),
  wrap(async (req, res) => {
    // keep the bill photo/PDF with the purchase (private, login required)
    if (!req.file) throw new Error("No file");
    const ext = sniff(req.file.buffer);
    if (!ext) throw new Error("Only JPG, PNG, WebP or PDF files are allowed");
    const p = await Purchase.findById(req.params.id);
    if (!p) throw new Error("Purchase not found");
    fs.mkdirSync(PRIV, { recursive: true });
    const name = `bill-${crypto.randomBytes(16).toString("hex")}.${ext}`;
    fs.writeFileSync(path.join(PRIV, name), req.file.buffer);
    if (p.billFile) fs.rm(path.join(PRIV, path.basename(p.billFile)), () => {});
    p.billFile = name;
    await p.save();
    res.json({ ok: true });
  }),
);
r.get(
  "/:id([0-9a-f]{24})/bill",
  wrap(async (req, res) => {
    const p = await Purchase.findById(req.params.id);
    if (!p?.billFile) return res.status(404).json({ error: "No bill saved" });
    res.set({
      "X-Content-Type-Options": "nosniff",
      "Content-Type": MIME[path.extname(p.billFile).slice(1)],
      "Content-Disposition": "inline",
    });
    res.sendFile(path.join(PRIV, path.basename(p.billFile)));
  }),
);
r.get(
  "/",
  wrap(async (req, res) =>
    res.json(
      await Purchase.find(
        req.query.include === "deleted" ? {} : { deleted: { $ne: true } },
      )
        .populate("supplier", "name")
        .sort("-date")
        .limit(200),
    ),
  ),
);
r.post(
  "/",
  wrap(async (req, res) =>
    res.status(201).json(
      await createPurchase(body.parse(req.body), {
        key: req.headers["idempotency-key"],
      }),
    ),
  ),
);
r.put(
  "/:id([0-9a-f]{24})",
  wrap(async (req, res) =>
    res.json(
      await Purchase.findByIdAndUpdate(
        req.params.id,
        z
          .object({
            notes: z.string(),
            dueDate: z.coerce.date(),
            date: z.coerce.date(),
          })
          .partial()
          .parse(req.body),
        { new: true },
      ),
    ),
  ),
);
r.delete(
  "/:id([0-9a-f]{24})",
  adminOnly,
  wrap(async (req, res) =>
    res.json(
      await deletePurchase(
        req.params.id,
        z.string().max(200).optional().parse(req.body?.reason),
      ),
    ),
  ),
);
module.exports = r;
