const crypto = require('crypto');
const EmailOtp = require('../models/EmailOtp');

const OTP_TTL_MS = 10 * 60 * 1000;
const SESSION_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const SEND_WINDOW_MS = 60 * 60 * 1000;
const MAX_SENDS_PER_WINDOW = 5;
const MAX_ATTEMPTS = 5;

const otpError = (code, status, message, extra = {}) =>
  Object.assign(new Error(message), { code, status, ...extra });

const secret = () => process.env.OTP_SECRET || process.env.JWT_SECRET || 'change_this_secret';

const generateOtp = () => crypto.randomInt(100000, 1000000).toString();

const hashOtp = (email, purpose, otp) =>
  crypto.createHmac('sha256', secret()).update(`${purpose}:${email}:${otp}`).digest('hex');

const hashSession = (token) => crypto.createHash('sha256').update(token).digest('hex');

const safeEqualHex = (a, b) => {
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};

// Creates/replaces the OTP for (email, purpose), enforcing the resend cooldown and
// hourly send cap. Returns the plaintext OTP so the caller can email it.
const issueOtp = async ({ email, purpose, name, passwordHash, decoy = false }) => {
  const now = Date.now();
  const existing = await EmailOtp.findOne({ email, purpose });

  let sendCount = 1;
  let sendWindowStart = new Date(now);
  if (existing) {
    const sinceLast = now - existing.lastSentAt.getTime();
    if (sinceLast < RESEND_COOLDOWN_MS) {
      const retryAfter = Math.ceil((RESEND_COOLDOWN_MS - sinceLast) / 1000);
      throw otpError('OTP_COOLDOWN', 429, `Please wait ${retryAfter}s before requesting another code.`, {
        retryAfter,
      });
    }
    if (now - existing.sendWindowStart.getTime() < SEND_WINDOW_MS) {
      if (existing.sendCount >= MAX_SENDS_PER_WINDOW) {
        throw otpError('OTP_RATE_LIMITED', 429, 'Too many codes requested. Try again in an hour.');
      }
      sendCount = existing.sendCount + 1;
      sendWindowStart = existing.sendWindowStart;
    }
  }

  const otp = generateOtp();
  await EmailOtp.findOneAndUpdate(
    { email, purpose },
    {
      $set: {
        otpHash: decoy ? crypto.randomBytes(32).toString('hex') : hashOtp(email, purpose, otp),
        expiresAt: new Date(now + OTP_TTL_MS),
        attempts: 0,
        verifiedAt: null,
        sessionHash: null,
        sessionExpiresAt: null,
        lastSentAt: new Date(now),
        sendWindowStart,
        sendCount,
        name,
        passwordHash,
        decoy,
        purgeAt: new Date(now + SEND_WINDOW_MS + OTP_TTL_MS),
      },
    },
    { upsert: true, setDefaultsOnInsert: true },
  );

  return { otp, expiresInSeconds: OTP_TTL_MS / 1000, resendAfterSeconds: RESEND_COOLDOWN_MS / 1000 };
};

// Used when the email could not be delivered so the user can retry immediately.
const discardOtp = (email, purpose) => EmailOtp.deleteOne({ email, purpose });

// Checks the OTP. Wrong guesses burn an attempt; a correct OTP is consumed and
// exchanged for a one-time session token (signup token / password-reset token).
const verifyOtp = async ({ email, purpose, otp }) => {
  const now = Date.now();
  const record = await EmailOtp.findOneAndUpdate(
    { email, purpose, otpHash: { $ne: null }, attempts: { $lt: MAX_ATTEMPTS } },
    { $inc: { attempts: 1 } },
    { new: true },
  );

  if (!record) {
    const existing = await EmailOtp.findOne({ email, purpose });
    if (!existing) {
      throw otpError('OTP_NOT_FOUND', 400, 'No active code for this email. Request a new code.');
    }
    if (!existing.otpHash) {
      throw otpError('OTP_ALREADY_USED', 400, 'This code was already used. Request a new code.');
    }
    throw otpError('OTP_TOO_MANY_ATTEMPTS', 429, 'Too many attempts. Request a new code.');
  }

  if (record.expiresAt.getTime() < now) {
    throw otpError('OTP_EXPIRED', 410, 'OTP expired. Please request a new one.');
  }

  if (record.decoy || !safeEqualHex(record.otpHash, hashOtp(email, purpose, otp))) {
    throw otpError('OTP_INVALID', 400, 'Invalid OTP. Please check the code and try again.');
  }

  const sessionToken = crypto.randomBytes(32).toString('hex');
  const consumed = await EmailOtp.findOneAndUpdate(
    { _id: record._id, otpHash: record.otpHash },
    {
      $set: {
        otpHash: null,
        verifiedAt: new Date(now),
        sessionHash: hashSession(sessionToken),
        sessionExpiresAt: new Date(now + SESSION_TTL_MS),
        purgeAt: new Date(now + SESSION_TTL_MS + SEND_WINDOW_MS),
      },
    },
  );
  if (!consumed) {
    throw otpError('OTP_ALREADY_USED', 400, 'This code was already used. Request a new code.');
  }

  return { sessionToken };
};

// Atomically redeems a session token so it can be used exactly once.
const consumeSession = async ({ purpose, sessionToken, email }) => {
  if (typeof sessionToken !== 'string' || sessionToken.length < 32 || sessionToken.length > 256) {
    return null;
  }
  const filter = {
    purpose,
    sessionHash: hashSession(sessionToken),
    sessionExpiresAt: { $gt: new Date() },
  };
  if (email) filter.email = email;
  return EmailOtp.findOneAndDelete(filter);
};

// Small in-memory per-IP limiter to blunt mass sending (per-email limits live in issueOtp).
const createIpLimiter = ({ windowMs, max, enforceInTests = false }) => {
  const hits = new Map();
  return (req, res, next) => {
    // Every supertest request shares one IP, which would trip the limit across unrelated tests.
    if (process.env.NODE_ENV === 'test' && !enforceInTests) return next();
    const now = Date.now();
    const key = req.ip || 'unknown';
    const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);
    if (recent.length >= max) {
      return res.status(429).json({ message: 'Too many requests. Please try again later.' });
    }
    recent.push(now);
    hits.set(key, recent);
    if (hits.size > 5000) {
      for (const [ip, times] of hits) {
        if (times.every((t) => now - t >= windowMs)) hits.delete(ip);
      }
    }
    return next();
  };
};

// The plaintext OTP is returned to the client only for local development/tests.
const shouldExposeOtp = () =>
  process.env.NODE_ENV === 'test' || process.env.EXPOSE_DEV_OTP === 'true';

module.exports = {
  issueOtp,
  discardOtp,
  verifyOtp,
  consumeSession,
  createIpLimiter,
  shouldExposeOtp,
};
