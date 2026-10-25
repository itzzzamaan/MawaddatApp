const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const pendingOtps = new Map();

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

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

const sendOtpEmail = async (email, otp) => {
  const transporter = getTransporter();

  if (!transporter) {
    console.log(`OTP for ${email}: ${otp}`);
    return { devMode: true, message: 'SMTP not configured; OTP was logged to the server console.' };
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER || 'isak36228@gmail.com',
    to: email,
    subject: 'Your Mawaddat signup OTP',
    html: `
      <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
        <h2 style="margin-bottom: 12px;">Your verification code</h2>
        <p>Use the code below to complete your signup.</p>
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
  const emailInput = String(req.body?.email || '').trim().toLowerCase();
  const passwordInput = req.body?.password;

  console.log('ADMIN LOGIN ATTEMPT:', { email: emailInput, passwordLength: passwordInput ? String(passwordInput).length : 0 });

  const admin = await Admin.findOne({ email: emailInput });
  console.log('ADMIN LOOKUP RESULT:', !!admin, admin ? admin.email : null);

  if (!admin) return res.status(401).json({ message: 'Invalid credentials' });

  const ok = await bcrypt.compare(passwordInput, admin.password);
  console.log('ADMIN PASSWORD CHECK:', ok);

  if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

  const token = jwt.sign({ id: admin._id, email: admin.email, role: 'admin' }, process.env.JWT_SECRET || 'change_this_secret', { expiresIn: '7d' });
  console.log('ADMIN LOGIN SUCCESS:', admin.email);
  res.json({ token, admin: { email: admin.email, name: admin.name } });
});

module.exports = router;
