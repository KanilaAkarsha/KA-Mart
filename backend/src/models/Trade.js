const { Schema, model } = require("mongoose");
const ref = (r) => ({ type: Schema.Types.ObjectId, ref: r });
exports.Counter = model(
  "Counter",
  new Schema({ _id: String, seq: { type: Number, default: 0 } }),
);
exports.Purchase = model(
  "Purchase",
  new Schema(
    {
      number: { type: String, unique: true },
      supplier: { ...ref("Supplier"), required: true },
      date: { type: Date, default: Date.now },
      lines: [
        {
          product: ref("Product"),
          qty: Number,
          unitPrice: Number,
          landedTotal: Number,
        },
      ],
      subtotal: Number,
      discount: { type: Number, default: 0 },
      extraCosts: { type: Number, default: 0 },
      total: Number,
      paid: { type: Number, default: 0 },
      status: String,
      dueDate: Date,
      notes: String,
      deleted: { type: Boolean, default: false },
      deletedAt: Date,
      deleteReason: String,
      billNumber: String,
      billFile: String,
    },
    { timestamps: true },
  ),
);
exports.Sale = model(
  "Sale",
  new Schema(
    {
      invoice: { type: String, unique: true },
      date: { type: Date, default: Date.now },
      customer: ref("Customer"),
      customerName: String,
      customerPhone: String,
      channel: String,
      lines: [
        {
          product: ref("Product"),
          qty: Number,
          unitPrice: Number,
          cogs: Number,
        },
      ],
      subtotal: Number,
      discount: { type: Number, default: 0 },
      charges: { type: Number, default: 0 },
      total: Number,
      cogs: Number,
      paid: { type: Number, default: 0 },
      status: { type: String, default: "confirmed" },
      paymentStatus: String,
      notes: String,
    },
    { timestamps: true },
  ),
);
exports.Account = model(
  "Account",
  new Schema({
    name: { type: String, unique: true },
    type: String,
    opening: { type: Number, default: 0 },
    archived: { type: Boolean, default: false },
  }),
);
exports.Ledger = model(
  "FinancialTransaction",
  new Schema(
    {
      account: { ...ref("Account"), required: true },
      type: { type: String, required: true },
      amount: { type: Number, required: true, min: 1 },
      date: { type: Date, default: Date.now },
      method: String,
      ref: String,
      reversed: { type: Boolean, default: false },
      key: { type: String, unique: true, sparse: true },
    },
    { timestamps: true },
  ),
); // key = idempotency, blocks duplicate payments
exports.Loan = model(
  "Loan",
  new Schema(
    {
      direction: { type: String, enum: ["borrowed", "lent"], required: true },
      party: { type: String, required: true, trim: true },
      principal: { type: Number, required: true, min: 1 },
      paid: { type: Number, default: 0, min: 0 },
      account: { ...ref("Account"), required: true },
      date: { type: Date, default: Date.now },
      notes: String,
      status: { type: String, enum: ["open", "settled"], default: "open" },
    },
    { timestamps: true },
  ),
);
exports.StockMovement = model(
  "StockMovement",
  new Schema({
    product: ref("Product"),
    type: String,
    qty: Number,
    unitCost: Number,
    reason: String,
    ref: String,
    date: { type: Date, default: Date.now },
  }),
);
exports.Expense = model(
  "Expense",
  new Schema(
    {
      date: { type: Date, default: Date.now },
      category: String,
      description: String,
      amount: Number,
      type: { type: String, default: "operating" },
      account: ref("Account"),
      related: String,
      receipt: String,
    },
    { timestamps: true },
  ),
);
exports.Return = model(
  "Return",
  new Schema(
    {
      sale: ref("Sale"),
      invoice: String,
      lines: [
        { product: ref("Product"), qty: Number, value: Number, cogs: Number },
      ],
      refundValue: Number,
      restockedCogs: { type: Number, default: 0 },
      restock: Boolean,
      reason: String,
      date: { type: Date, default: Date.now },
    },
    { timestamps: true },
  ),
);
exports.DailyClosing = model(
  "DailyClosing",
  new Schema(
    {
      date: { type: String, unique: true },
      expected: Number,
      actual: Number,
      difference: Number,
      explanation: String,
      breakdown: Object,
    },
    { timestamps: true },
  ),
);
exports.Settings = model(
  "BusinessSettings",
  new Schema({
    _id: { type: String, default: "main" },
    businessName: { type: String, default: "KA Mart" },
    address: String,
    phone: String,
    whatsapp: String,
    currency: { type: String, default: "LKR" },
    timezone: { type: String, default: "Asia/Colombo" },
    lowStockDefault: { type: Number, default: 5 },
    invoicePrefix: { type: String, default: "INV" },
    sessionTimeoutHours: { type: Number, default: 2, min: 1, max: 168 },
    expenseCategories: {
      type: [String],
      default: [
        "Transport",
        "Delivery",
        "Packaging",
        "Advertising",
        "Internet and telephone",
        "Platform fees",
        "Supplier travel",
        "Bank charges",
        "Equipment",
        "Rent",
        "Other",
      ],
    },
    productCategories: {
      type: [String],
      default: [
        "Phone covers",
        "Chargers & cables",
        "Earphones",
        "Gadgets",
        "Other accessories",
      ],
    },
    paymentMethods: {
      type: [String],
      default: ["Cash", "Bank transfer", "Card", "Mobile payment"],
    },
    salesChannels: {
      type: [String],
      default: ["Facebook Marketplace", "WhatsApp", "Direct", "Other"],
    },
  }),
);
