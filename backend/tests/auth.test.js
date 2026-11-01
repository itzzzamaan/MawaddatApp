const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');
const { connectToDatabase } = require('../database');
const User = require('../models/User');
const bcrypt = require('bcrypt');
const { OAuth2Client } = require('google-auth-library');
const firebaseAuth = require('firebase-admin/auth');
const firebaseAdmin = require('../firebaseAdmin');

beforeAll(async () => {
  await connectToDatabase();
});

afterAll(async () => {
  await mongoose.disconnect();
});

describe('Auth', () => {
  it('should send signup OTP through the configured HTTPS email provider', async () => {
    const originalFetch = global.fetch;
    const originalApiKey = process.env.RESEND_API_KEY;
    const originalFrom = process.env.SMTP_FROM;
    const originalSmtpUser = process.env.SMTP_USER;
    const originalSmtpPassword = process.env.SMTP_PASS;
    let requestUrl;
    let requestBody;

    process.env.RESEND_API_KEY = 'test-resend-key';
    process.env.SMTP_FROM = 'Mawaddat <otp@example.com>';
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    global.fetch = async (url, options) => {
      requestUrl = url;
      requestBody = JSON.parse(options.body);
      return { ok: true, status: 200 };
    };

    try {
      const email = `otp-provider-${Date.now()}@example.com`;
      const res = await request(app)
        .post('/api/auth/send-signup-otp')
        .send({ name: 'OTP Provider Test', email, password: 'test-password' });

      expect(res.statusCode).toBe(200);
      expect(requestUrl).toBe('https://api.resend.com/emails');
      expect(requestBody.from).toBe('Mawaddat <otp@example.com>');
      expect(requestBody.to).toBe(email);
      expect(requestBody.html).toContain(res.body.otp);
    } finally {
      global.fetch = originalFetch;
      if (originalApiKey === undefined) delete process.env.RESEND_API_KEY;
      else process.env.RESEND_API_KEY = originalApiKey;
      if (originalFrom === undefined) delete process.env.SMTP_FROM;
      else process.env.SMTP_FROM = originalFrom;
      if (originalSmtpUser === undefined) delete process.env.SMTP_USER;
      else process.env.SMTP_USER = originalSmtpUser;
      if (originalSmtpPassword === undefined) delete process.env.SMTP_PASS;
      else process.env.SMTP_PASS = originalSmtpPassword;
    }
  });

  it('should report missing SMTP configuration instead of claiming an OTP was sent', async () => {
    const originalUser = process.env.SMTP_USER;
    const originalPassword = process.env.SMTP_PASS;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;

    try {
      const res = await request(app)
        .post('/api/auth/send-signup-otp')
        .send({
          name: 'OTP Configuration Test',
          email: `otp-config-${Date.now()}@example.com`,
          password: 'test-password',
        });

      expect(res.statusCode).toBe(503);
      expect(res.body.message).toMatch(/Email delivery is not configured/);
      expect(res.body).not.toHaveProperty('otp');
    } finally {
      if (originalUser === undefined) delete process.env.SMTP_USER;
      else process.env.SMTP_USER = originalUser;
      if (originalPassword === undefined) delete process.env.SMTP_PASS;
      else process.env.SMTP_PASS = originalPassword;
    }
  });

  it('should require email and password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({});

    expect(res.statusCode).toBe(400);
    expect(res.body).not.toHaveProperty('token');
  });

  it('should verify Firebase ID tokens and persist an email-verified user', async () => {
    const originalGetFirebaseAdminApp = firebaseAdmin.getFirebaseAdminApp;
    const originalGetAuth = firebaseAuth.getAuth;
    const firebaseUid = `firebase-test-${Date.now()}`;
    const email = `firebase-test-${Date.now()}@example.com`;
    firebaseAdmin.getFirebaseAdminApp = () => ({});
    firebaseAuth.getAuth = () => ({
      verifyIdToken: async (idToken, checkRevoked) => {
        expect(idToken).toBe('valid-firebase-token');
        expect(checkRevoked).toBe(true);
        return {
          uid: firebaseUid,
          email,
          email_verified: true,
          name: 'Firebase Test User',
          picture: 'https://example.com/firebase-avatar.png',
        };
      },
    });

    try {
      const res = await request(app)
        .post('/api/auth/firebase')
        .send({ idToken: 'valid-firebase-token' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.email).toBe(email);

      const user = await User.findOne({ firebaseUid });
      expect(user).not.toBeNull();
      expect(user.password).toBeUndefined();
      expect(user.name).toBe('Firebase Test User');
    } finally {
      await User.deleteOne({ firebaseUid });
      firebaseAuth.getAuth = originalGetAuth;
      firebaseAdmin.getFirebaseAdminApp = originalGetFirebaseAdminApp;
    }
  });

  it('should reject Firebase accounts with an unverified email', async () => {
    const originalGetFirebaseAdminApp = firebaseAdmin.getFirebaseAdminApp;
    const originalGetAuth = firebaseAuth.getAuth;
    firebaseAdmin.getFirebaseAdminApp = () => ({});
    firebaseAuth.getAuth = () => ({
      verifyIdToken: async () => ({
        uid: `firebase-unverified-${Date.now()}`,
        email: `firebase-unverified-${Date.now()}@example.com`,
        email_verified: false,
      }),
    });

    try {
      const res = await request(app)
        .post('/api/auth/firebase')
        .send({ idToken: 'valid-firebase-token' });
      expect(res.statusCode).toBe(401);
      expect(res.body).not.toHaveProperty('token');
    } finally {
      firebaseAuth.getAuth = originalGetAuth;
      firebaseAdmin.getFirebaseAdminApp = originalGetFirebaseAdminApp;
    }
  });

  it('should reject an incorrect admin password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'wrong-password' });

    expect(res.statusCode).toBe(401);
    expect(res.body).not.toHaveProperty('token');
  });

  it('should login test admin', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'test1234' });

    expect([200, 201]).toContain(res.statusCode);
    expect(res.body).toHaveProperty('token');
  });

  it('should verify Google identity and persist a passwordless user', async () => {
    const previousAudience = process.env.GOOGLE_WEB_CLIENT_ID;
    const originalVerify = OAuth2Client.prototype.verifyIdToken;
    const googleId = `google-test-${Date.now()}`;
    const email = `google-test-${Date.now()}@example.com`;
    process.env.GOOGLE_WEB_CLIENT_ID = 'web-client-id.apps.googleusercontent.com';
    OAuth2Client.prototype.verifyIdToken = async ({ idToken, audience }) => {
      expect(idToken).toBe('valid-google-token');
      expect(audience).toBe(process.env.GOOGLE_WEB_CLIENT_ID);
      return {
        getPayload: () => ({
          sub: googleId,
          email,
          email_verified: true,
          name: 'Google Test User',
          picture: 'https://example.com/avatar.png',
        }),
      };
    };

    try {
      const res = await request(app)
        .post('/api/auth/google')
        .send({ idToken: 'valid-google-token' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.email).toBe(email);

      const user = await User.findOne({ googleId });
      expect(user).not.toBeNull();
      expect(user.password).toBeUndefined();
      expect(user.name).toBe('Google Test User');
    } finally {
      await User.deleteOne({ googleId });
      OAuth2Client.prototype.verifyIdToken = originalVerify;
      if (previousAudience === undefined) delete process.env.GOOGLE_WEB_CLIENT_ID;
      else process.env.GOOGLE_WEB_CLIENT_ID = previousAudience;
    }
  });

  it('should not accept Google accounts with an unverified email', async () => {
    const previousAudience = process.env.GOOGLE_WEB_CLIENT_ID;
    const originalVerify = OAuth2Client.prototype.verifyIdToken;
    process.env.GOOGLE_WEB_CLIENT_ID = 'web-client-id.apps.googleusercontent.com';
    OAuth2Client.prototype.verifyIdToken = async () => ({
      getPayload: () => ({
        sub: `unverified-${Date.now()}`,
        email: `unverified-${Date.now()}@example.com`,
        email_verified: false,
      }),
    });

    try {
      const res = await request(app)
        .post('/api/auth/google')
        .send({ idToken: 'valid-token-with-unverified-email' });
      expect(res.statusCode).toBe(401);
      expect(res.body).not.toHaveProperty('token');
    } finally {
      OAuth2Client.prototype.verifyIdToken = originalVerify;
      if (previousAudience === undefined) delete process.env.GOOGLE_WEB_CLIENT_ID;
      else process.env.GOOGLE_WEB_CLIENT_ID = previousAudience;
    }
  });

  it('should link a verified Google identity to the matching password account', async () => {
    const previousAudience = process.env.GOOGLE_WEB_CLIENT_ID;
    const originalVerify = OAuth2Client.prototype.verifyIdToken;
    const googleId = `google-link-${Date.now()}`;
    const email = `google-link-${Date.now()}@example.com`;
    const password = 'existing-password';
    const passwordHash = await bcrypt.hash(password, 10);
    await User.create({ name: 'Existing Account', email, password: passwordHash });
    process.env.GOOGLE_WEB_CLIENT_ID = 'web-client-id.apps.googleusercontent.com';
    OAuth2Client.prototype.verifyIdToken = async () => ({
      getPayload: () => ({
        sub: googleId,
        email,
        email_verified: true,
        name: 'Google Profile Name',
      }),
    });

    try {
      const res = await request(app)
        .post('/api/auth/google')
        .send({ idToken: 'valid-google-token' });

      expect(res.statusCode).toBe(200);
      const user = await User.findOne({ email });
      expect(user.googleId).toBe(googleId);
      expect(user.password).toBe(passwordHash);

      const passwordLogin = await request(app)
        .post('/api/auth/user-login')
        .send({ email, password });
      expect(passwordLogin.statusCode).toBe(200);
    } finally {
      await User.deleteOne({ email });
      OAuth2Client.prototype.verifyIdToken = originalVerify;
      if (previousAudience === undefined) delete process.env.GOOGLE_WEB_CLIENT_ID;
      else process.env.GOOGLE_WEB_CLIENT_ID = previousAudience;
    }
  });
});
