const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const { auth } = require("./middleware/auth");
const { notFound, errorHandler } = require("./middleware/error");
const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(
  "/uploads",
  (req, res, next) => {
    res.set("X-Content-Type-Options", "nosniff");
    next();
  },
  express.static(require("path").join(__dirname, "../uploads"), {
    index: false,
    dotfiles: "deny",
  }),
);
app.use(
  "/api/auth",
  rateLimit({ windowMs: 15 * 60 * 1000, max: 30 }),
  require("./routes/auth"),
);
app.get("/api/health", (_, res) => res.json({ ok: true }));
app.use("/api/products", auth, require("./routes/products"));
app.use("/api/purchases", auth, require("./routes/purchases"));
app.use("/api/sales", auth, require("./routes/sales"));
app.use("/api/reports", auth, require("./routes/insights"));
app.use("/api/reports", auth, require("./routes/reportsExtra"));
app.use("/api/suppliers", auth, require("./routes/parties").suppliers);
app.use("/api/customers", auth, require("./routes/parties").customers);
app.use("/api", auth, require("./routes/finance"));
app.use(notFound, errorHandler);
module.exports = app;
