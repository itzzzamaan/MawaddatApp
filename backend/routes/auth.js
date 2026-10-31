const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const pendingOtps = new Map();
const pendingPasswordResets = new Map();
const passwordResetTokens = new Map();

const generateOtp = () => crypto.randomInt(100000, 1000000).toString();

const getTransporter = () => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;

  const host = SMTP_HOST || 'smtp.gmail.com';
  const port = Number(SMTP_PORT || 587);
  const user = SMTP_USER || 'isak36228@gmail.com';
  const pass = SMTP_PASS;

  if (!pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
};

const sendOtpEmail = async (email, otp, purpose = 'signup') => {
  const transporter = getTransporter();

  if (!transporter) {
    console.log(`OTP for ${email}: ${otp}`);
    return { devMode: true, message: 'SMTP not configured; OTP was logged to the server console.' };
  }

  const isPasswordReset = purpose === 'password-reset';
  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER || 'isak36228@gmail.com',
    to: email,
    subject: isPasswordReset ? 'Reset your Mawaddat password' : 'Your Mawaddat signup OTP',
    html: `
      <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
        <h2 style="margin-bottom: 12px;">${isPasswordReset ? 'Password reset code' : 'Your verification code'}</h2>
        <p>${isPasswordReset ? 'Use this code to reset your Mawaddat password.' : 'Use the code below to complete your signup.'}</p>
        <div style="font-size: 32px; letter-spacing: 6px; font-weight: 700; margin: 18px 0; padding: 16px 20px; background: #f3f4f6; border-radius: 10px; display: inline-block;">
          ${otp}
        </div>
        <p>This code expires in 10 minutes.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
  return { devMode: false, message: 'OTP email sent successfully.' };
};

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

router.post('/forgot-password/send-otp', async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!email) return res.status(400).json({ message: 'Email is required.' });

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(200).json({
        message: 'If an account exists for that email, a verification code has been sent.',
      });
    }

    const otp = generateOtp();
    const emailResult = await sendOtpEmail(email, otp, 'password-reset');
    pendingPasswordResets.set(email, {
      otpHash: crypto.createHash('sha256').update(otp).digest('hex'),
      createdAt: Date.now(),
      attempts: 0,
    });

    return res.status(200).json({
      message: 'If an account exists for that email, a verification code has been sent.',
      devMode: emailResult.devMode,
      otp: process.env.NODE_ENV !== 'production' ? otp : undefined,
    });
  } catch (err) {
    console.error('Send password reset OTP error:', err);
    return res.status(500).json({ message: 'Unable to send a verification code right now.' });
  }
});

router.post('/forgot-password/verify-otp', async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const otp = String(req.body?.otp || '').trim();
  if (!email || !otp) {
    return res.status(400).json({ message: 'Email and verification code are required.' });
  }

  const pending = pendingPasswordResets.get(email);
  if (!pending || Date.now() - pending.createdAt > 10 * 60 * 1000) {
    pendingPasswordResets.delete(email);
    return res.status(400).json({ message: 'The code is invalid or expired. Request a new code.' });
  }

  if (pending.attempts >= 5) {
    pendingPasswordResets.delete(email);
    return res.status(429).json({ message: 'Too many attempts. Request a new code.' });
  }

  pending.attempts += 1;
  const submittedHash = crypto.createHash('sha256').update(otp).digest();
  const expectedHash = Buffer.from(pending.otpHash, 'hex');
  if (!crypto.timingSafeEqual(submittedHash, expectedHash)) {
    return res.status(400).json({ message: 'The code is invalid or expired. Request a new code.' });
  }

  pendingPasswordResets.delete(email);
  const resetToken = crypto.randomBytes(32).toString('hex');
  passwordResetTokens.set(resetToken, { email, createdAt: Date.now() });
  return res.status(200).json({ message: 'Code verified.', resetToken });
});

router.post('/forgot-password/reset', async (req, res) => {
  try {
    const resetToken = String(req.body?.resetToken || '');
    const password = String(req.body?.password || '');
    if (!resetToken || password.length < 8) {
      return res.status(400).json({ message: 'A verified reset session and password of at least 8 characters are required.' });
    }

    const reset = passwordResetTokens.get(resetToken);
    if (!reset || Date.now() - reset.createdAt > 10 * 60 * 1000) {
      passwordResetTokens.delete(resetToken);
      return res.status(400).json({ message: 'Your reset session expired. Request a new code.' });
    }

    const user = await User.findOne({ email: reset.email });
    if (!user) {
      passwordResetTokens.delete(resetToken);
      return res.status(400).json({ message: 'Unable to reset this account. Request a new code.' });
    }

    user.password = await bcrypt.hash(password, 10);
    await user.save();
    passwordResetTokens.delete(resetToken);
    return res.status(200).json({ message: 'Password updated successfully.' });
  } catch (err) {
    console.error('Password reset error:', err);
    return res.status(500).json({ message: 'Unable to update your password right now.' });
  }
});

const getPendingSignup = (email) => {
  if (!email) return null;
  const key = String(email).trim().toLowerCase();
  return pendingOtps.get(key) || null;
};

const setPendingSignup = (email, data) => {
  if (!email) return;
  pendingOtps.set(String(email).trim().toLowerCase(), {
    ...data,
    createdAt: Date.now(),
  });
};

const deletePendingSignup = (email) => {
  if (!email) return;
  pendingOtps.delete(String(email).trim().toLowerCase());
};

router.post('/send-signup-otp', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const emailExists = await User.findOne({ email: normalizedEmail });

    if (emailExists) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const otp = generateOtp();
    setPendingSignup(normalizedEmail, { name, email: normalizedEmail, password, otp, createdAt: Date.now() });

    const emailResult = await sendOtpEmail(normalizedEmail, otp);

    return res.status(200).json({
      message: emailResult.message,
      devMode: emailResult.devMode,
      otp: process.env.NODE_ENV !== 'production' ? otp : undefined,
    });
  } catch (err) {
    console.error('Send signup OTP error:', err);
    return res.status(500).json({ message: 'Failed to send OTP' });
  }
});

router.post('/verify-signup-otp', async (req, res) => {
  try {
    const { email, otp } = req.body || {};

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const pending = getPendingSignup(normalizedEmail);

    if (!pending) {
      return res.status(400).json({ message: 'No pending signup found for this email. Please request a new OTP.' });
    }

    const expiryMs = 10 * 60 * 1000;
    if (Date.now() - pending.createdAt > expiryMs) {
      deletePendingSignup(normalizedEmail);
      return res.status(410).json({ message: 'OTP expired. Please request a new one.' });
    }

    if (String(pending.otp) !== String(otp)) {
      return res.status(400).json({ message: 'Invalid OTP. Please check the code and try again.' });
    }

    deletePendingSignup(normalizedEmail);
    return res.status(200).json({ message: 'OTP verified successfully.' });
  } catch (err) {
    console.error('Verify signup OTP error:', err);
    return res.status(500).json({ message: 'Failed to verify OTP' });
  }
});

// Signup for regular users
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const normalizedEmail = String(email).trim().toLowerCase();
    const exists = await User.findOne({ email: normalizedEmail });
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    const hash = await bcrypt.hash(password, 10);
    const u = new User({ name, email: normalizedEmail, password: hash });
    await u.save();
    const token = jwt.sign({ id: u._id, email: u.email, role: 'user' }, process.env.JWT_SECRET || 'change_this_secret', { expiresIn: '7d' });
    res.json({ token, user: { id: u._id, name: u.name, email: u.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/user-login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id, email: user.email, role: 'user' }, process.env.JWT_SECRET || 'change_this_secret', { expiresIn: '7d' });
    return res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        imageUri: user.imageUri || 'https://www.iconpacks.net/icons/2/free-user-icon-3296-thumb.png',
      },
    });
  } catch (err) {
    console.error('User login error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = req.body?.password;
    if (!email || typeof password !== 'string' || password.length === 0) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const admin = await Admin.findOne({ email });
    if (!admin || !(await bcrypt.compare(password, admin.password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: admin._id, email: admin.email, role: 'admin' },
      process.env.JWT_SECRET || 'change_this_secret',
      { expiresIn: '7d' },
    );
    return res.json({
      token,
      admin: { email: admin.email, name: admin.name },
    });
  } catch (error) {
    console.error('Admin login failed:', error.name || 'UnknownError');
    return res.status(500).json({ message: 'Unable to sign in right now.' });
  }
});

module.exports = router;
