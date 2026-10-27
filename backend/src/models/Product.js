const { Schema, model } = require("mongoose");
const P = new Schema(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, unique: true },
    category: String,
    brand: String,
    compatibility: String,
    description: String,
    supplier: { type: Schema.Types.ObjectId, ref: "Supplier" },
    sellingPrice: {
      type: Number,
      required: true,
      min: 0,
      validate: Number.isInteger,
    },
    studentPrice: { type: Number, min: 0 }, // minor units
    qty: { type: Number, default: 0 },
    totalCost: { type: Number, default: 0 }, // weighted-average pool
    minStock: { type: Number, default: 5 },
    active: { type: Boolean, default: true },
    image: String,
  },
  { timestamps: true },
);
P.index({ name: 1 });
module.exports = model("Product", P);
