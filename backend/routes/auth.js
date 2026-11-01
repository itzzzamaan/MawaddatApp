const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { Buffer } = require('node:buffer');
const { OAuth2Client } = require('google-auth-library');
const firebaseAuth = require('firebase-admin/auth');
const firebaseAdmin = require('../firebaseAdmin');
const googleOAuthClient = new OAuth2Client();

const pendingOtps = new Map();
const pendingPasswordResets = new Map();
const passwordResetTokens = new Map();

const generateOtp = () => crypto.randomInt(100000, 1000000).toString();

const getOtpMessage = (email, otp, purpose) => {
  const isPasswordReset = purpose === 'password-reset';
  return {
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
};

const sendOtpWithResend = async (email, otp, purpose) => {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.SMTP_FROM,
      ...getOtpMessage(email, otp, purpose),
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const error = new Error('Email provider rejected the OTP message.');
    error.code = 'EMAIL_PROVIDER_REJECTED';
    error.status = response.status;
    throw error;
  }
};

const getTransporter = () => {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS?.replace(/\s/g, '');

  if (!user || !pass) {
    const error = new Error('SMTP_USER and SMTP_PASS must be configured.');
    error.code = 'SMTP_NOT_CONFIGURED';
    throw error;
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    const error = new Error('SMTP_PORT must be a valid port number.');
    error.code = 'SMTP_INVALID_PORT';
    throw error;
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
  if (process.env.RESEND_API_KEY) {
    if (!process.env.SMTP_FROM) {
      const error = new Error('SMTP_FROM must be a verified sender address when using Resend.');
      error.code = 'EMAIL_SENDER_NOT_CONFIGURED';
      throw error;
    }

    await sendOtpWithResend(email, otp, purpose);
    return { message: 'OTP email sent successfully.' };
  }

  const transporter = getTransporter();
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      ...getOtpMessage(email, otp, purpose),
    });
    return { message: 'OTP email sent successfully.' };
  } finally {
    transporter.close();
  }
};

const getOtpDeliveryError = (error) => {
  const code = error.code || error.name || 'UnknownError';
  console.error('OTP email delivery failed:', code);

  if (code === 'SMTP_NOT_CONFIGURED' || code === 'SMTP_INVALID_PORT' || code === 'EMAIL_SENDER_NOT_CONFIGURED') {
    return {
      status: 503,
      message: 'Email delivery is not configured correctly on the backend.',
    };
  }

  if (code === 'ETIMEDOUT' || code === 'ESOCKET' || code === 'ECONNECTION' || code === 'ECONNREFUSED') {
    return {
      status: 503,
      message: 'The backend cannot reach its SMTP server. If hosted on Render Free, use an HTTPS email provider or a plan that allows SMTP.',
    };
  }

  return {
    status: 502,
    message: 'Unable to send the verification email. Check the backend email-provider settings and logs.',
  };
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
    await sendOtpEmail(email, otp, 'password-reset');
    pendingPasswordResets.set(email, {
      otpHash: crypto.createHash('sha256').update(otp).digest('hex'),
      createdAt: Date.now(),
      attempts: 0,
    });

    return res.status(200).json({
      message: 'If an account exists for that email, a verification code has been sent.',
      otp: process.env.NODE_ENV !== 'production' ? otp : undefined,
    });
  } catch (err) {
    const deliveryError = getOtpDeliveryError(err);
    return res.status(deliveryError.status).json({ message: deliveryError.message });
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
    const emailResult = await sendOtpEmail(normalizedEmail, otp);
    setPendingSignup(normalizedEmail, { name, email: normalizedEmail, password, otp });

    return res.status(200).json({
      message: emailResult.message,
      otp: process.env.NODE_ENV !== 'production' ? otp : undefined,
    });
  } catch (err) {
    const deliveryError = getOtpDeliveryError(err);
    return res.status(deliveryError.status).json({ message: deliveryError.message });
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

    if (!user.password) {
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

router.post('/google', async (req, res) => {
  const audience =
    process.env.GOOGLE_WEB_CLIENT_ID ||
    '929703402001-ntnpeoe05rnmdmie89qtq1dojq3sdlsc.apps.googleusercontent.com';
  const idToken = req.body?.idToken;

  if (!audience) {
    return res.status(503).json({
      message: 'Google sign-in is not configured on the backend.',
    });
  }
  if (typeof idToken !== 'string' || idToken.length === 0 || idToken.length > 10000) {
    return res.status(400).json({ message: 'A valid Google ID token is required.' });
  }

  let payload;
  try {
    const ticket = await googleOAuthClient.verifyIdToken({
      idToken,
      audience,
    });
    payload = ticket.getPayload();
  } catch (error) {
    const code = error.code || error.name || 'UnknownError';
    console.error('Google ID token verification failed:', code);
    const unavailableCodes = new Set([
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'EAI_AGAIN',
    ]);
    return res.status(unavailableCodes.has(code) ? 503 : 401).json({
      message: unavailableCodes.has(code)
        ? 'Google sign-in verification is temporarily unavailable.'
        : 'Google sign-in token is invalid or expired.',
    });
  }

  if (
    !payload?.sub ||
    !payload.email ||
    payload.email_verified !== true
  ) {
    return res.status(401).json({
      message: 'Google must verify your email before you can sign in.',
    });
  }

  try {
    const normalizedEmail = normalizeEmail(payload.email);
    let user = await User.findOne({ googleId: payload.sub });

    if (user && user.email !== normalizedEmail) {
      const emailOwner = await User.findOne({ email: normalizedEmail });
      if (emailOwner && String(emailOwner._id) !== String(user._id)) {
        return res.status(409).json({
          message: 'This Google account email is already associated with another account.',
        });
      }
      user.email = normalizedEmail;
    }

    if (!user) {
      user = await User.findOne({ email: normalizedEmail });
      if (user?.googleId && user.googleId !== payload.sub) {
        return res.status(409).json({
          message: 'This email is already linked to a different Google account.',
        });
      }
    }

    if (!user) {
      user = new User({
        name: String(payload.name || payload.given_name || normalizedEmail.split('@')[0]).trim(),
        email: normalizedEmail,
        googleId: payload.sub,
        imageUri: payload.picture,
      });
    } else {
      user.googleId = payload.sub;
      if (!user.name && payload.name) user.name = payload.name;
      if (!user.imageUri && payload.picture) user.imageUri = payload.picture;
    }

    await user.save();

    const token = jwt.sign(
      { id: user._id, email: user.email, role: 'user' },
      process.env.JWT_SECRET || 'change_this_secret',
      { expiresIn: '7d' },
    );

    return res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        imageUri:
          user.imageUri ||
          'https://www.iconpacks.net/icons/2/free-user-icon-3296-thumb.png',
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: 'An account already exists for this Google identity. Please try again.',
      });
    }

    console.error('Google user sign-in failed:', error.name || 'UnknownError');
    return res.status(500).json({ message: 'Unable to sign in with Google right now.' });
  }
});

router.post('/firebase', async (req, res) => {
  const idToken = req.body?.idToken;
  if (typeof idToken !== 'string' || idToken.length === 0 || idToken.length > 10000) {
    return res.status(400).json({ message: 'A valid Firebase ID token is required.' });
  }

  let decodedToken;
  try {
    const app = firebaseAdmin.getFirebaseAdminApp();
    decodedToken = await firebaseAuth.getAuth(app).verifyIdToken(idToken, true);
  } catch (error) {
    const code = error.code || error.name || 'UnknownError';
    console.error('Firebase ID token verification failed:', code);
    const configurationErrors = new Set([
      'FIREBASE_ADMIN_NOT_CONFIGURED',
      'FIREBASE_ADMIN_INVALID_CONFIGURATION',
      'app/invalid-credential',
      'app/invalid-credential-value',
    ]);
    return res.status(configurationErrors.has(code) ? 503 : 401).json({
      message: configurationErrors.has(code)
        ? 'Firebase sign-in is not configured on the backend.'
        : 'Firebase sign-in token is invalid or expired.',
    });
  }

  if (
    !decodedToken?.uid ||
    !decodedToken.email ||
    decodedToken.email_verified !== true
  ) {
    return res.status(401).json({
      message: 'Verify your email address before signing in to Mawaddat.',
    });
  }

  try {
    const firebaseUid = String(decodedToken.uid);
    const normalizedEmail = normalizeEmail(decodedToken.email);
    const profileName =
      String(decodedToken.name || req.body?.name || '').trim().slice(0, 100) ||
      normalizedEmail.split('@')[0];
    const profileImage =
      decodedToken.picture ||
      (typeof req.body?.imageUri === 'string' &&
      /^https:\/\//i.test(req.body.imageUri)
        ? req.body.imageUri
        : undefined);
    let user = await User.findOne({ firebaseUid });

    if (user && user.email !== normalizedEmail) {
      const emailOwner = await User.findOne({ email: normalizedEmail });
      if (emailOwner && String(emailOwner._id) !== String(user._id)) {
        return res.status(409).json({
          message: 'This email is already associated with another Mawaddat account.',
        });
      }
      user.email = normalizedEmail;
    }

    if (!user) {
      user = await User.findOne({ email: normalizedEmail });
      if (user?.firebaseUid && user.firebaseUid !== firebaseUid) {
        return res.status(409).json({
          message: 'This email is already associated with another Firebase account.',
        });
      }
    }

    if (!user) {
      user = new User({
        name: profileName,
        email: normalizedEmail,
        firebaseUid,
        imageUri: profileImage,
      });
    } else {
      user.firebaseUid = firebaseUid;
      if (!user.name) user.name = profileName;
      if (!user.imageUri && profileImage) user.imageUri = profileImage;
    }

    await user.save();

    const token = jwt.sign(
      { id: user._id, email: user.email, role: 'user' },
      process.env.JWT_SECRET || 'change_this_secret',
      { expiresIn: '7d' },
    );

    return res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        imageUri:
          user.imageUri ||
          'https://www.iconpacks.net/icons/2/free-user-icon-3296-thumb.png',
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: 'This Firebase account is already linked to a Mawaddat user.',
      });
    }

    console.error('Firebase user sign-in failed:', error.name || 'UnknownError');
    return res.status(500).json({ message: 'Unable to sign in with Firebase right now.' });
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
