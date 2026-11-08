const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const { connectToDatabase } = require('../database');
const User = require('../models/User');
const EmailOtp = require('../models/EmailOtp');
const firebaseAuth = require('firebase-admin/auth');
const firebaseAdmin = require('../firebaseAdmin');

const originalEnv = { ...process.env };
const originalFetch = global.fetch;
let sentEmails;
let providerStatus;

const uniqueEmail = (label) => `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;

// Pulls the 6-digit code out of the email body the fake provider received.
const lastEmailOtp = () => sentEmails[sentEmails.length - 1].html.match(/>\s*(\d{6})\s*</)[1];

beforeAll(async () => {
  await connectToDatabase();
});

afterAll(async () => {
  await mongoose.disconnect();
});

beforeEach(() => {
  sentEmails = [];
  providerStatus = 200;
  process.env.BREVO_API_KEY = 'test-brevo-key';
  process.env.EMAIL_FROM = 'Mawaddat <otp@example.com>';
  process.env.EMAIL_REPLY_TO = 'support@example.com';
  global.fetch = async (url, options) => {
    if (providerStatus !== 200) {
      return {
        ok: false,
        status: providerStatus,
        json: async () => ({ code: 'invalid_parameter', message: 'sender is not validated' }),
      };
    }
    expect(url).toBe('https://api.brevo.com/v3/smtp/email');
    expect(options.headers['api-key']).toBe('test-brevo-key');
    const body = JSON.parse(options.body);
    sentEmails.push({
      to: body.to[0].email,
      from: body.sender.name ? `${body.sender.name} <${body.sender.email}>` : body.sender.email,
      replyTo: body.replyTo?.email,
      subject: body.subject,
      html: body.htmlContent,
    });
    return { ok: true, status: 201, json: async () => ({ messageId: 'message-id' }) };
  };
});

afterEach(() => {
  global.fetch = originalFetch;
  process.env = { ...originalEnv };
});

const startSignup = (email, password = 'correct-horse') =>
  request(app).post('/api/auth/send-signup-otp').send({ name: 'Otp Tester', email, password });

describe('Signup OTP', () => {
  it('emails a 6-digit code and stores only a hash of it', async () => {
    const email = uniqueEmail('signup-send');
    const res = await startSignup(email);

    expect(res.statusCode).toBe(200);
    expect(sentEmails).toHaveLength(1);
    expect(sentEmails[0].to).toBe(email);
    expect(sentEmails[0].from).toBe('Mawaddat <otp@example.com>');
    expect(sentEmails[0].replyTo).toBe('support@example.com');
    expect(lastEmailOtp()).toMatch(/^\d{6}$/);

    const stored = await EmailOtp.findOne({ email, purpose: 'signup' });
    expect(JSON.stringify(stored)).not.toContain(lastEmailOtp());
    expect(stored.passwordHash).not.toContain('correct-horse');
  });

  it('does not return the OTP in the response outside development/test', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.EXPOSE_DEV_OTP;
    const res = await startSignup(uniqueEmail('signup-prod'));

    expect(res.statusCode).toBe(200);
    expect(res.body).not.toHaveProperty('otp');
  });

  it('completes signup with a valid OTP and then logs in', async () => {
    const email = uniqueEmail('signup-ok');
    await startSignup(email);

    const verify = await request(app)
      .post('/api/auth/verify-signup-otp')
      .send({ email, otp: lastEmailOtp() });
    expect(verify.statusCode).toBe(200);
    expect(verify.body.signupToken).toBeTruthy();

    const signup = await request(app)
      .post('/api/auth/signup')
      .send({ email, signupToken: verify.body.signupToken });
    expect(signup.statusCode).toBe(200);
    expect(signup.body.token).toBeTruthy();
    expect(signup.body.user.email).toBe(email);

    const login = await request(app)
      .post('/api/auth/user-login')
      .send({ email, password: 'correct-horse' });
    expect(login.statusCode).toBe(200);
    expect(login.body.token).toBeTruthy();

    const reuse = await request(app)
      .post('/api/auth/signup')
      .send({ email, signupToken: verify.body.signupToken });
    expect(reuse.statusCode).toBe(400);
  });

  it('refuses to create an account without a verified OTP session', async () => {
    const email = uniqueEmail('signup-bypass');
    await startSignup(email);

    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email, password: 'correct-horse', signupToken: 'x'.repeat(64) });
    expect(res.statusCode).toBe(400);
    expect(await User.findOne({ email })).toBeNull();
  });

  it('rejects a wrong OTP', async () => {
    const email = uniqueEmail('signup-wrong');
    await startSignup(email);
    const wrong = lastEmailOtp() === '000000' ? '111111' : '000000';

    const res = await request(app).post('/api/auth/verify-signup-otp').send({ email, otp: wrong });
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('OTP_INVALID');
    expect(res.body).not.toHaveProperty('signupToken');
  });

  it('rejects an expired OTP', async () => {
    const email = uniqueEmail('signup-expired');
    await startSignup(email);
    await EmailOtp.updateOne({ email, purpose: 'signup' }, { expiresAt: new Date(Date.now() - 1000) });

    const res = await request(app)
      .post('/api/auth/verify-signup-otp')
      .send({ email, otp: lastEmailOtp() });
    expect(res.statusCode).toBe(410);
    expect(res.body.code).toBe('OTP_EXPIRED');
  });

  it('rejects an OTP that was already used', async () => {
    const email = uniqueEmail('signup-used');
    await startSignup(email);
    const otp = lastEmailOtp();

    const first = await request(app).post('/api/auth/verify-signup-otp').send({ email, otp });
    expect(first.statusCode).toBe(200);
    const second = await request(app).post('/api/auth/verify-signup-otp').send({ email, otp });
    expect(second.statusCode).toBe(400);
    expect(second.body.code).toBe('OTP_ALREADY_USED');
  });

  it('locks the code after too many wrong attempts, even for the right code', async () => {
    const email = uniqueEmail('signup-lock');
    await startSignup(email);
    const otp = lastEmailOtp();
    const wrong = otp === '000000' ? '111111' : '000000';

    for (let i = 0; i < 5; i += 1) {
      await request(app).post('/api/auth/verify-signup-otp').send({ email, otp: wrong });
    }
    const res = await request(app).post('/api/auth/verify-signup-otp').send({ email, otp });
    expect(res.statusCode).toBe(429);
    expect(res.body.code).toBe('OTP_TOO_MANY_ATTEMPTS');
  });

  it('enforces a resend cooldown, then lets a resend replace the old code', async () => {
    const email = uniqueEmail('signup-resend');
    await startSignup(email);
    const firstOtp = lastEmailOtp();

    const tooSoon = await startSignup(email);
    expect(tooSoon.statusCode).toBe(429);
    expect(tooSoon.body.code).toBe('OTP_COOLDOWN');
    expect(Number(tooSoon.headers['retry-after'])).toBeGreaterThan(0);
    expect(sentEmails).toHaveLength(1);

    await EmailOtp.updateOne({ email, purpose: 'signup' }, { lastSentAt: new Date(Date.now() - 61000) });
    const resend = await startSignup(email);
    expect(resend.statusCode).toBe(200);
    expect(sentEmails).toHaveLength(2);

    const newOtp = lastEmailOtp();
    if (newOtp !== firstOtp) {
      const stale = await request(app).post('/api/auth/verify-signup-otp').send({ email, otp: firstOtp });
      expect(stale.statusCode).toBe(400);
    }
    const fresh = await request(app).post('/api/auth/verify-signup-otp').send({ email, otp: newOtp });
    expect(fresh.statusCode).toBe(200);
  });

  it('caps how many codes can be requested per hour', async () => {
    const email = uniqueEmail('signup-cap');
    for (let i = 0; i < 5; i += 1) {
      const res = await startSignup(email);
      expect(res.statusCode).toBe(200);
      await EmailOtp.updateOne({ email, purpose: 'signup' }, { lastSentAt: new Date(Date.now() - 61000) });
    }
    const res = await startSignup(email);
    expect(res.statusCode).toBe(429);
    expect(res.body.code).toBe('OTP_RATE_LIMITED');
  });

  it('reports an email delivery failure and allows an immediate retry', async () => {
    const email = uniqueEmail('signup-fail');
    providerStatus = 401;
    const errorLog = jest.spyOn(console, 'error').mockImplementation(() => {});

    const failed = await startSignup(email);
    expect(failed.statusCode).toBe(503);
    expect(failed.body).not.toHaveProperty('otp');
    expect(JSON.stringify(failed.body)).not.toContain('test-brevo-key');
    expect(await EmailOtp.findOne({ email, purpose: 'signup' })).toBeNull();
    const logged = JSON.stringify(errorLog.mock.calls);
    expect(logged).toContain('provider_error=invalid_parameter');
    expect(logged).not.toContain('test-brevo-key');
    expect(logged).not.toMatch(/d{6}/);
    errorLog.mockRestore();

    providerStatus = 200;
    const retry = await startSignup(email);
    expect(retry.statusCode).toBe(200);
  });

  it('rejects invalid email, short password and already registered emails', async () => {
    expect((await startSignup('not-an-email')).statusCode).toBe(400);
    expect((await startSignup(uniqueEmail('short'), 'short')).statusCode).toBe(400);

    const taken = uniqueEmail('taken');
    await User.create({ name: 'Existing', email: taken, password: 'hash' });
    const res = await startSignup(taken);
    expect(res.statusCode).toBe(400);
    expect(sentEmails).toHaveLength(0);
  });
});

describe('Forgot password OTP', () => {
  it('resets the password with a valid OTP and rejects the old password', async () => {
    const email = uniqueEmail('reset-ok');
    await User.create({ name: 'Reset User', email, password: 'old-hash' });

    const send = await request(app).post('/api/auth/forgot-password/send-otp').send({ email });
    expect(send.statusCode).toBe(200);
    expect(sentEmails).toHaveLength(1);
    expect(sentEmails[0].subject).toMatch(/Reset your Mawaddat password/);

    const verify = await request(app)
      .post('/api/auth/forgot-password/verify-otp')
      .send({ email, otp: lastEmailOtp() });
    expect(verify.statusCode).toBe(200);

    const reset = await request(app)
      .post('/api/auth/forgot-password/reset')
      .send({ resetToken: verify.body.resetToken, password: 'brand-new-password' });
    expect(reset.statusCode).toBe(200);

    const login = await request(app)
      .post('/api/auth/user-login')
      .send({ email, password: 'brand-new-password' });
    expect(login.statusCode).toBe(200);

    const replay = await request(app)
      .post('/api/auth/forgot-password/reset')
      .send({ resetToken: verify.body.resetToken, password: 'another-password-1' });
    expect(replay.statusCode).toBe(400);
  });

  it('gives the same response for unknown emails without sending anything', async () => {
    const email = uniqueEmail('reset-unknown');
    const res = await request(app).post('/api/auth/forgot-password/send-otp').send({ email });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/If an account exists/);
    expect(res.body).not.toHaveProperty('otp');
    expect(sentEmails).toHaveLength(0);

    const verify = await request(app)
      .post('/api/auth/forgot-password/verify-otp')
      .send({ email, otp: '123456' });
    expect(verify.statusCode).toBe(400);
  });

  it('rejects an expired reset OTP and a weak new password', async () => {
    const email = uniqueEmail('reset-expired');
    await User.create({ name: 'Reset User', email, password: 'old-hash' });
    await request(app).post('/api/auth/forgot-password/send-otp').send({ email });
    await EmailOtp.updateOne({ email, purpose: 'password-reset' }, { expiresAt: new Date(Date.now() - 1000) });

    const verify = await request(app)
      .post('/api/auth/forgot-password/verify-otp')
      .send({ email, otp: lastEmailOtp() });
    expect(verify.statusCode).toBe(410);

    const weak = await request(app)
      .post('/api/auth/forgot-password/reset')
      .send({ resetToken: 'x'.repeat(64), password: 'short' });
    expect(weak.statusCode).toBe(400);
  });

  it('reports delivery failure for a real account', async () => {
    const email = uniqueEmail('reset-fail');
    await User.create({ name: 'Reset User', email, password: 'old-hash' });
    providerStatus = 403;

    const res = await request(app).post('/api/auth/forgot-password/send-otp').send({ email });
    expect(res.statusCode).toBe(503);
  });
});

describe('IP limiter', () => {
  it('blocks an IP after the allowed number of requests', () => {
    const { createIpLimiter } = require('../utils/otp');
    const limiter = createIpLimiter({ windowMs: 60000, max: 2, enforceInTests: true });
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    for (let i = 0; i < 3; i += 1) limiter({ ip: '203.0.113.9' }, res, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(res.status).toHaveBeenCalledWith(429);
    limiter({ ip: '203.0.113.10' }, res, next);
    expect(next).toHaveBeenCalledTimes(3);
  });
});

describe('Firebase ID token handling', () => {
  const originalGetFirebaseAdminApp = firebaseAdmin.getFirebaseAdminApp;
  const originalGetAuth = firebaseAuth.getAuth;

  afterEach(() => {
    firebaseAdmin.getFirebaseAdminApp = originalGetFirebaseAdminApp;
    firebaseAuth.getAuth = originalGetAuth;
  });

  it('rejects a request with a missing Firebase token', async () => {
    const res = await request(app).post('/api/auth/firebase').send({});
    expect(res.statusCode).toBe(400);
  });

  it('rejects an invalid Firebase token', async () => {
    firebaseAdmin.getFirebaseAdminApp = () => ({});
    firebaseAuth.getAuth = () => ({
      verifyIdToken: async () => {
        throw Object.assign(new Error('bad token'), { code: 'auth/argument-error' });
      },
    });

    const res = await request(app).post('/api/auth/firebase').send({ idToken: 'garbage' });
    expect(res.statusCode).toBe(401);
    expect(res.body).not.toHaveProperty('token');
  });

  it('reports a backend without Firebase Admin credentials as a configuration error', async () => {
    delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    delete process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;

    const res = await request(app).post('/api/auth/firebase').send({ idToken: 'some-token' });
    expect(res.statusCode).toBe(503);
    expect(res.body.message).toMatch(/not configured on the backend/);
  });
});
