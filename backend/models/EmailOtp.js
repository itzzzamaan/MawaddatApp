const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// One document per (email, purpose). Persisted in MongoDB (not process memory) so
// OTPs survive Render restarts, free-tier spin-downs and multiple instances.
const EmailOtpSchema = new Schema({
  email: { type: String, required: true },
  purpose: { type: String, enum: ['signup', 'password-reset'], required: true },
  // HMAC of the OTP; null once the OTP has been used.
  otpHash: { type: String, default: null },
  expiresAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
  verifiedAt: { type: Date, default: null },
  // sha256 of the one-time session token issued after a successful OTP check.
  sessionHash: { type: String, default: null, index: true },
  sessionExpiresAt: { type: Date, default: null },
  lastSentAt: { type: Date, required: true },
  sendWindowStart: { type: Date, required: true },
  sendCount: { type: Number, default: 1 },
  // Signup payload; the password is stored only as a bcrypt hash.
  name: String,
  passwordHash: String,
  // Placeholder for an unknown account so rate limits and responses look identical.
  decoy: { type: Boolean, default: false },
  purgeAt: { type: Date, required: true },
});

EmailOtpSchema.index({ email: 1, purpose: 1 }, { unique: true });
EmailOtpSchema.index({ purgeAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('EmailOtp', EmailOtpSchema);
