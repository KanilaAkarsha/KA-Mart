require("dotenv").config();
const mongoose = require("mongoose");
const app = require("./app"); // loads every model
if (!process.env.JWT_SECRET || !process.env.MONGODB_URI)
  throw new Error("Set MONGODB_URI and JWT_SECRET in .env");
if (
  process.env.NO_TRANSACTIONS === "1" &&
  process.env.NODE_ENV === "production"
)
  throw new Error("NO_TRANSACTIONS must never be used in production");
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => Promise.all(Object.values(mongoose.models).map((m) => m.init()))) // unique indexes must exist before serving traffic
  .then(() =>
    app.listen(process.env.PORT || 5000, () =>
      console.log("KA Mart API running"),
    ),
  )
  .catch((e) => {
    console.error("Startup failed:", e.message);
    process.exit(1);
  });
