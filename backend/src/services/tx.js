const mongoose = require("mongoose");
const { Counter } = require("../models/Trade");
exports.inTx = async (fn) => {
  if (process.env.NO_TRANSACTIONS === "1") return fn(null);
  const s = await mongoose.startSession();
  try {
    let r;
    await s.withTransaction(async () => {
      r = await fn(s);
    });
    return r;
  } finally {
    s.endSession();
  }
};
exports.nextNo = async (id, prefix, s) => {
  const c = await Counter.findByIdAndUpdate(
    id,
    { $inc: { seq: 1 } },
    { new: true, upsert: true, session: s },
  );
  return `${prefix}-${String(c.seq).padStart(5, "0")}`;
};
exports.payStatus = require("../lib/accounting").paymentStatus;
