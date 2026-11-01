const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');
const { connectToDatabase } = require('../database');

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
});
