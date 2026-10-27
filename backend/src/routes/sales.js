const r = require("express").Router();
const { z } = require("zod");
const { Sale } = require("../models/Trade");
const S = require("../services/saleService");
const { adminOnly } = require("../middleware/auth");
const wrap = (f) => (q, s, n) => f(q, s, n).catch(n);
const id = z.string().length(24);
const m = z.number().int().min(0);
const body = z.object({
  customer: id.optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  channel: z.string().min(1).default("Direct"),
  account: id.optional(),
  date: z.coerce.date().optional(),
  notes: z.string().optional(),
  lines: z
    .array(
      z.object({ product: id, qty: z.number().int().positive(), unitPrice: m }),
    )
    .min(1),
  discount: m.optional(),
  charges: m.optional(),
  paid: m.optional(),
  method: z.string().optional(),
});
r.get(
  "/",
  wrap(async (req, res) =>
    res.json(
      await Sale.find(req.query.status ? { status: req.query.status } : {})
        .sort("-date")
        .limit(200),
    ),
  ),
);
r.get(
  "/:id([0-9a-f]{24})",
  wrap(async (req, res) =>
    res.json(
      await Sale.findById(req.params.id)
        .populate("lines.product", "name sku")
        .lean(),
    ),
  ),
);
r.post(
  "/",
  wrap(async (req, res) =>
    res.status(201).json(
      await S.createSale(body.parse(req.body), {
        key: req.headers["idempotency-key"],
        allowNegative:
          req.user.role === "admin" && req.query.allowNegative === "1",
      }),
    ),
  ),
);
r.post(
  "/:id/payments",
  wrap(async (req, res) =>
    res.json(
      await S.addPayment(req.params.id, {
        ...z
          .object({
            amount: z.number().int().positive(),
            account: id,
            method: z.string().optional(),
          })
          .parse(req.body),
        key: req.headers["idempotency-key"],
      }),
    ),
  ),
);
r.post(
  "/:id/cancel",
  adminOnly,
  wrap(async (req, res) => res.json(await S.cancelSale(req.params.id))),
);
r.put(
  "/:id([0-9a-f]{24})",
  wrap(async (req, res) =>
    res.json(
      await Sale.findByIdAndUpdate(
        req.params.id,
        z
          .object({
            customerName: z.string(),
            customerPhone: z.string(),
            channel: z.string().min(1),
            notes: z.string(),
            date: z.coerce.date(),
          })
          .partial()
          .parse(req.body),
        { new: true },
      ),
    ),
  ),
);
module.exports = r;
