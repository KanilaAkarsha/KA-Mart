const r = require('express').Router();
const bcrypt = require('bcryptjs'); const jwt = require('jsonwebtoken'); const { z } = require('zod');
const User = require('../models/User'); const { auth } = require('../middleware/auth');
const wrap = (f) => (q, s, n) => f(q, s, n).catch(n);
r.post('/login', wrap(async (req, res) => {
  const { email, password } = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(req.body);
  const u = await User.findOne({ email });
  if (!u || !(await bcrypt.compare(password, u.passwordHash))) return res.status(401).json({ error: 'Invalid credentials' });
  res.json({ token: jwt.sign({ id: u._id, role: u.role }, process.env.JWT_SECRET, { expiresIn: '8h' }), user: { name: u.name, role: u.role } });
}));
r.post('/change-password', auth, wrap(async (req, res) => {
  const { current, next } = z.object({ current: z.string(), next: z.string().min(10) }).parse(req.body);
  const u = await User.findById(req.user.id);
  if (!(await bcrypt.compare(current, u.passwordHash))) return res.status(400).json({ error: 'Wrong current password' });
  u.passwordHash = await bcrypt.hash(next, 12); await u.save(); res.json({ ok: true });
}));
module.exports = r;
