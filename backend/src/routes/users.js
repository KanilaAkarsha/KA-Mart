const r = require("express").Router();
const { z } = require("zod");
const User = require("../models/User");
const { adminOnly } = require("../middleware/auth");

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

module.exports = r;
