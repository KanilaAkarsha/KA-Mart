export const rs = (minor = 0) =>
  "Rs. " +
  (minor / 100).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
export const isNum = (label = "") =>
  /price|total|paid|received|outstanding|amount|balance|cost|sales|profit|opening|qty|stock|units|student|avg|revenue|due$/i.test(
    label,
  );
export const imgUrl = (p) =>
  p
    ? (import.meta.env.VITE_API_URL || "/api").replace(/\/api\/?$/, "") + p
    : "";
export const toMinor = (v) => Math.round(Number(v || 0) * 100);
export const ymd = (d) =>
  new Date(d).toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" });
export const presets = () => {
  const t = new Date(),
    d = (n) => {
      const x = new Date(t);
      x.setDate(x.getDate() + n);
      return ymd(x);
    };
  const first = new Date(t.getFullYear(), t.getMonth(), 1),
    lastPrev = new Date(t.getFullYear(), t.getMonth(), 0),
    firstPrev = new Date(t.getFullYear(), t.getMonth() - 1, 1);
  return {
    Today: [d(0), d(0)],
    Yesterday: [d(-1), d(-1)],
    "Last 7 days": [d(-6), d(0)],
    "This month": [ymd(first), d(0)],
    "Last month": [ymd(firstPrev), ymd(lastPrev)],
    "This year": [`${t.getFullYear()}-01-01`, d(0)],
  };
};

// Phone photos are often 5-10 MB: shrink to ~2000px JPEG before upload (faster, avoids the size limit). PDFs pass through untouched.
export async function shrinkImage(file, max = 2000) {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k);
    c.height = Math.round(bmp.height * k);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.85));
    return blob && blob.size < file.size
      ? new File([blob], "bill.jpg", { type: "image/jpeg" })
      : file;
  } catch {
    return file;
  }
}
