const r = require("express").Router();
const { z } = require("zod");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { adminOnly } = require("../middleware/auth");

r.post("/", adminOnly, async (req, res, next) => {
  try {
    const data = z
      .object({
        name: z.string().trim().min(1).max(100),
        email: z.string().email(),
        password: z.string().min(10),
      })
      .parse(req.body);
    const user = await User.create({
      name: data.name,
      email: data.email,
      passwordHash: await bcrypt.hash(data.password, 12),
      role: "staff",
      cashierAccess: true,
    });
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      cashierAccess: user.cashierAccess,
    });
  } catch (e) {
    next(e);
  }
});

r.get("/", adminOnly, async (_, res, next) => {
  try {
    res.json(
      await User.find({}, "name email role cashierAccess")
        .sort("name")
        .lean(),
    );
  } catch (e) {
    next(e);
  }
});

r.put(
  "/:id([0-9a-f]{24})",
  adminOnly,
  async (req, res, next) => {
    try {
      const data = z.object({ cashierAccess: z.boolean() }).parse(req.body);
      const user = await User.findOneAndUpdate(
        { _id: req.params.id, role: "staff" },
        data,
        { new: true, projection: "name email role cashierAccess" },
      ).lean();
      if (!user) return res.status(404).json({ error: "Staff user not found" });
      res.json(user);
    } catch (e) {
      next(e);
    }
  },
);

r.delete("/:id([0-9a-f]{24})", adminOnly, async (req, res, next) => {
  try {
    const user = await User.findOneAndDelete({
      _id: req.params.id,
      role: "staff",
    });
    if (!user) return res.status(404).json({ error: "Cashier not found" });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

module.exports = r;
