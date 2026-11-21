require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
(async () => {
  try {
    if (!process.env.MONGODB_URI || !process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD || !process.env.JWT_SECRET) throw new Error('Set MONGODB_URI, ADMIN_EMAIL, ADMIN_PASSWORD and JWT_SECRET in .env first.');
    if (process.env.ADMIN_PASSWORD.length < 12) throw new Error('ADMIN_PASSWORD must be at least 12 characters.');
    await mongoose.connect(process.env.MONGODB_URI);
    const email = process.env.ADMIN_EMAIL.toLowerCase();
    const password = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
    await Admin.findOneAndUpdate({ email }, { email, password, role: 'admin' }, { upsert: true, new: true, setDefaultsOnInsert: true });
    console.log(`Admin account ready: ${email}`);
  } catch (e) { console.error(e.message); process.exitCode = 1; }
  finally { await mongoose.disconnect(); }
})();
