const { Schema, model } = require("mongoose");
module.exports = model(
  "User",
  new Schema(
    {
      name: { type: String, required: true },
      email: { type: String, required: true, unique: true, lowercase: true },
      passwordHash: { type: String, required: true },
      role: { type: String, enum: ["admin", "staff"], default: "staff" },
    },
    { timestamps: true },
  ),
);
