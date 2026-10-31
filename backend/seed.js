const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const { connectToDatabase } = require('./database');

const DEFAULT_EMAIL = (process.env.ADMIN_EMAIL || 'admin@test.com').trim().toLowerCase();
const DEFAULT_PASSWORD = process.env.ADMIN_PASSWORD || 'test1234';

const seedAdmin = async () => {
  await connectToDatabase();
  try {
    const existing = await Admin.findOne({ email: DEFAULT_EMAIL });
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    if (existing) {
      existing.password = passwordHash;
      existing.name = existing.name || 'Test Admin';
      await existing.save();
      console.log('Updated admin account.');
    } else {
      const admin = new Admin({ email: DEFAULT_EMAIL, password: passwordHash, name: 'Test Admin' });
      await admin.save();
      console.log('Created admin account.');
    }
  } catch (error) {
    console.error('Seed error:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
};

if (require.main === module) {
  seedAdmin().catch(() => {
    process.exitCode = 1;
  });
}

module.exports = { seedAdmin };
