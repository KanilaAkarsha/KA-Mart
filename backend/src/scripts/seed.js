// DEV ONLY demo data. Refuses to run in production or on a non-empty database.
require('dotenv').config(); const mongoose = require('mongoose');
const Product = require('../models/Product'); const { Supplier } = require('../models/Party'); const { Account } = require('../models/Trade');
(async () => {
  if (process.env.NODE_ENV === 'production') throw new Error('Never seed production');
  await mongoose.connect(process.env.MONGODB_URI); if (await Product.countDocuments()) throw new Error('Database not empty');
  const s = await Supplier.create({ name: 'Demo Supplier' });
  await Account.create([{ name: 'Cash in hand', type: 'cash', opening: 500000 }, { name: 'Bank', type: 'bank', opening: 0 }]);
  await Product.create({ name: 'iPhone Silicone Back Cover', sku: 'DEMO-001', sellingPrice: 79900, studentPrice: 59900, supplier: s._id, category: 'Covers' });
  console.log('Demo data created (sku DEMO-001)'); process.exit(0);
})().catch((e) => { console.error(e.message); process.exit(1); });
