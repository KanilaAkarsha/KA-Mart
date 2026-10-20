const { Schema, model } = require('mongoose');
const f = { name: { type: String, required: true }, phone: String, address: String, notes: String };
exports.Supplier = model('Supplier', new Schema(f, { timestamps: true }));
exports.Customer = model('Customer', new Schema(f, { timestamps: true }));
