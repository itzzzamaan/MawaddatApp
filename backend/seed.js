require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Admin = require('./models/Admin');

const DEFAULT_EMAIL = (process.env.ADMIN_EMAIL || 'admin@test.com').trim().toLowerCase();
const DEFAULT_PASSWORD = process.env.ADMIN_PASSWORD || 'test1234';

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/mawaddat').then(async () => {
  try {
    const existing = await Admin.findOne({ email: DEFAULT_EMAIL });
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    if (existing) {
      existing.password = passwordHash;
      existing.name = existing.name || 'Test Admin';
      await existing.save();
      console.log('Updated admin credentials:', DEFAULT_EMAIL, 'password:', DEFAULT_PASSWORD);
    } else {
      const admin = new Admin({ email: DEFAULT_EMAIL, password: passwordHash, name: 'Test Admin' });
      await admin.save();
      console.log('Created admin:', DEFAULT_EMAIL, 'password:', DEFAULT_PASSWORD);
    }

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
