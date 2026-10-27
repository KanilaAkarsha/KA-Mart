const { Purchase, Ledger, StockMovement } = require("../models/Trade");
const Product = require("../models/Product");
const { landedPurchase } = require("../lib/costing");
const { inTx, nextNo, payStatus } = require("./tx");
exports.createPurchase = async (b, o = {}) => {
  if (b.billNumber && !b.allowDuplicate) {
    const dup = await Purchase.findOne({
      supplier: b.supplier,
      billNumber: b.billNumber,
      deleted: { $ne: true },
    });
    if (dup) {
      const e = new Error(
        `Bill ${b.billNumber} was already recorded for this supplier as ${dup.number}.`,
      );
      e.status = 409;
      throw e;
    }
  }
  return create(b, o);
};
const create = (b, { key } = {}) =>
  inTx(async (s) => {
    const calc = landedPurchase({
      lines: b.lines,
      discount: b.discount,
      extraCosts: b.extraCosts,
    });
    const number = await nextNo("purchase", "PUR", s);
    const [p] = await Purchase.create(
      [
        {
          ...b,
          number,
          subtotal: calc.subtotal,
          total: calc.total,
          paid: b.paid || 0,
          status: payStatus(calc.total, b.paid || 0),
          lines: calc.lines.map((l) => ({
            product: l.product,
            qty: l.qty,
            unitPrice: l.unitPrice,
            landedTotal: l.landedTotal,
          })),
        },
      ],
      { session: s },
    );
    for (const l of calc.lines) {
      // transport goes into inventory cost, never into expenses (no double counting)
      await Product.updateOne(
        { _id: l.product },
        { $inc: { qty: l.qty, totalCost: l.landedTotal } },
        { session: s },
      );
      await StockMovement.create(
        [
          {
            product: l.product,
            type: "purchase",
            qty: l.qty,
            unitCost: Math.round(l.landedUnit),
            ref: number,
          },
        ],
        { session: s },
      );
    }
    if (b.paid > 0)
      await Ledger.create(
        [
          {
            account: b.account,
            type: "supplier_payment",
            method: b.method,
            amount: b.paid,
            ref: number,
            key: key && `pur:${key}`,
          },
        ],
        { session: s },
      );
    return p;
  });

// "Delete" = void with audit trail: stock removed at its landed cost, payments refunded through the ledger, record kept but excluded from all totals.
exports.deletePurchase = (id, reason) =>
  inTx(async (s) => {
    const p = await Purchase.findById(id).session(s);
    if (!p) throw new Error("Purchase not found");
    if (p.deleted) throw new Error("Purchase is already deleted");
    for (const l of p.lines) {
      const used = await StockMovement.countDocuments({
        product: l.product,
        type: { $in: ["sale", "adjustment", "return", "cancel"] },
        date: { $gt: p.createdAt },
      }).session(s);
      const prod = await Product.findById(l.product).session(s);
      if (used || !prod || prod.qty < l.qty)
        throw new Error(
          "Cannot delete: stock from this purchase has already been sold, returned or adjusted. Use a stock adjustment instead.",
        );
    }
    for (const l of p.lines) {
      await Product.updateOne(
        { _id: l.product },
        { $inc: { qty: -l.qty, totalCost: -l.landedTotal } },
        { session: s },
      );
      await StockMovement.create(
        [
          {
            product: l.product,
            type: "purchase_void",
            qty: -l.qty,
            unitCost: Math.round(l.landedTotal / l.qty),
            ref: p.number,
            reason,
          },
        ],
        { session: s },
      );
    }
    const pays = await Ledger.find({
      ref: p.number,
      type: "supplier_payment",
    }).session(s);
    for (const x of pays)
      await Ledger.create(
        [
          {
            account: x.account,
            type: "supplier_refund",
            amount: x.amount,
            ref: p.number,
            method: x.method,
          },
        ],
        { session: s },
      );
    Object.assign(p, {
      deleted: true,
      deletedAt: new Date(),
      deleteReason: reason,
      status: "deleted",
    });
    await p.save({ session: s });
    return p;
  });
