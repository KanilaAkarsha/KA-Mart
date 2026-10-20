// All money is stored as integer minor units (1 Rs. = 100). No floats in storage.
const toMinor = (rs) => Math.round(Number(rs) * 100);
const fmt = (minor) =>
  'Rs. ' + (minor / 100).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// Split `total` across weights using largest-remainder so parts sum exactly.
function allocate(total, weights) {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (!sum) return weights.map(() => 0);
  const raw = weights.map((w) => (total * w) / sum);
  const out = raw.map(Math.floor);
  let left = total - out.reduce((a, b) => a + b, 0);
  raw.map((r, i) => [r - out[i], i]).sort((a, b) => b[0] - a[0])
    .forEach(([, i]) => { if (left-- > 0) out[i]++; });
  return out;
}
module.exports = { toMinor, fmt, allocate };
