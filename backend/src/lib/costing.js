// Weighted-average inventory costing. stock = { qty, totalCost } (minor units).
const { allocate } = require("./money");

// Landed cost: subtotal - discount + extra costs, spread across lines by value.
function landedPurchase({ lines, discount = 0, extraCosts = 0 }) {
  const values = lines.map((l) => l.qty * l.unitPrice);
  const subtotal = values.reduce((a, b) => a + b, 0);
  const net = allocate(-discount, values).map((d) => d); // negative shares
  const extra = allocate(extraCosts, values);
  const landedLines = lines.map((l, i) => {
    const landed = values[i] + net[i] + extra[i];
    return { ...l, landedTotal: landed, landedUnit: landed / l.qty };
  });
  return {
    subtotal,
    total: subtotal - discount + extraCosts,
    lines: landedLines,
  };
}

const avgCost = (s) => (s.qty ? s.totalCost / s.qty : 0);

function receiveStock(stock, qty, landedTotal) {
  return { qty: stock.qty + qty, totalCost: stock.totalCost + landedTotal };
}

// Returns COGS at current average cost; blocks negative stock unless allowed.
function issueStock(stock, qty, { allowNegative = false } = {}) {
  if (qty > stock.qty && !allowNegative) throw new Error("Insufficient stock");
  const cogs = Math.round(avgCost(stock) * qty);
  return {
    cogs,
    stock: { qty: stock.qty - qty, totalCost: stock.totalCost - cogs },
  };
}

// Customer return: restock at the original COGS so the average stays honest.
function restoreStock(stock, qty, cogs) {
  return { qty: stock.qty + qty, totalCost: stock.totalCost + cogs };
}
module.exports = {
  landedPurchase,
  avgCost,
  receiveStock,
  issueStock,
  restoreStock,
};
