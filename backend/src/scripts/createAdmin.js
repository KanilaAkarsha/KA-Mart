// Usage: ADMIN_EMAIL=you@x.com ADMIN_PASSWORD='long-password' npm run create-admin
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
(async () => {
  const { ADMIN_EMAIL: email, ADMIN_PASSWORD: pw } = process.env;
  if (!email || !pw || pw.length < 10)
    throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD (10+ chars)");
  await mongoose.connect(process.env.MONGODB_URI);
  await User.create({
    name: "Admin",
    email,
    passwordHash: await bcrypt.hash(pw, 12),
    role: "admin",
  });
  console.log("Admin created");
  process.exit(0);
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
