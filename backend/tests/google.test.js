const request = require('supertest');
const mongoose = require('mongoose');
const { OAuth2Client } = require('google-auth-library');
const firebaseAuth = require('firebase-admin/auth');
const app = require('../app');
const { connectToDatabase } = require('../database');
const User = require('../models/User');
const firebaseAdmin = require('../firebaseAdmin');

const originalVerify = OAuth2Client.prototype.verifyIdToken;
const originalGetAuth = firebaseAuth.getAuth;
const originalGetFirebaseAdminApp = firebaseAdmin.getFirebaseAdminApp;

const uniqueEmail = (label) => `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;

const mockGoogle = (payload) => {
  OAuth2Client.prototype.verifyIdToken = async () => ({
    getPayload: () => ({ email_verified: true, name: 'Google Person', ...payload }),
  });
};

beforeAll(async () => {
  await connectToDatabase();
});

afterAll(async () => {
  await mongoose.disconnect();
});

afterEach(() => {
  OAuth2Client.prototype.verifyIdToken = originalVerify;
  firebaseAuth.getAuth = originalGetAuth;
  firebaseAdmin.getFirebaseAdminApp = originalGetFirebaseAdminApp;
});

describe('Google sign-in (backend /api/auth/google)', () => {
  it('creates a user on first sign-in and reuses it on the next one', async () => {
    const email = uniqueEmail('google-first');
    const sub = `sub-${Date.now()}-a`;
    mockGoogle({ sub, email });

    const first = await request(app).post('/api/auth/google').send({ idToken: 'token' });
    expect(first.statusCode).toBe(200);
    expect(first.body.token).toBeTruthy();

    const second = await request(app).post('/api/auth/google').send({ idToken: 'token' });
    expect(second.statusCode).toBe(200);
    expect(second.body.user.id).toBe(first.body.user.id);
    expect(await User.countDocuments({ email })).toBe(1);
  });

  it('links to an existing email/password account without duplicating or changing it', async () => {
    const email = uniqueEmail('google-link');
    const existing = await User.create({ name: 'Existing', email, password: 'bcrypt-hash' });
    mockGoogle({ sub: `sub-${Date.now()}-b`, email });

    const res = await request(app).post('/api/auth/google').send({ idToken: 'token' });
    expect(res.statusCode).toBe(200);
    expect(res.body.user.id).toBe(String(existing._id));

    const after = await User.findById(existing._id);
    expect(after.password).toBe('bcrypt-hash');
    expect(after.name).toBe('Existing');
    expect(await User.countDocuments({ email })).toBe(1);
  });

  it('rejects a missing token and an invalid token', async () => {
    const missing = await request(app).post('/api/auth/google').send({});
    expect(missing.statusCode).toBe(400);

    OAuth2Client.prototype.verifyIdToken = async () => {
      throw Object.assign(new Error('Wrong recipient'), { code: 'INVALID' });
    };
    const invalid = await request(app).post('/api/auth/google').send({ idToken: 'bad' });
    expect(invalid.statusCode).toBe(401);
    expect(invalid.body).not.toHaveProperty('token');
  });

  it('reports Google being unreachable as a temporary failure', async () => {
    OAuth2Client.prototype.verifyIdToken = async () => {
      throw Object.assign(new Error('offline'), { code: 'ENOTFOUND' });
    };
    const res = await request(app).post('/api/auth/google').send({ idToken: 'token' });
    expect(res.statusCode).toBe(503);
  });

  it('refuses a Google account whose email is not verified', async () => {
    mockGoogle({ sub: `sub-${Date.now()}-c`, email: uniqueEmail('google-unverified'), email_verified: false });
    const res = await request(app).post('/api/auth/google').send({ idToken: 'token' });
    expect(res.statusCode).toBe(401);
  });
});

describe('Firebase Google sign-in (backend /api/auth/firebase)', () => {
  it('does not duplicate the user when the same Firebase account signs in again', async () => {
    const email = uniqueEmail('firebase-repeat');
    const uid = `uid-${Date.now()}`;
    firebaseAdmin.getFirebaseAdminApp = () => ({});
    firebaseAuth.getAuth = () => ({
      verifyIdToken: async () => ({ uid, email, email_verified: true, name: 'Fire User' }),
    });

    const first = await request(app).post('/api/auth/firebase').send({ idToken: 'token' });
    const second = await request(app).post('/api/auth/firebase').send({ idToken: 'token' });
    expect(first.statusCode).toBe(200);
    expect(second.body.user.id).toBe(first.body.user.id);
    expect(await User.countDocuments({ email })).toBe(1);
  });

  it('lets a user who signed in with Google through Firebase later use the Google fallback without a duplicate', async () => {
    const email = uniqueEmail('both-paths');
    firebaseAdmin.getFirebaseAdminApp = () => ({});
    firebaseAuth.getAuth = () => ({
      verifyIdToken: async () => ({ uid: `uid-${Date.now()}`, email, email_verified: true }),
    });
    const viaFirebase = await request(app).post('/api/auth/firebase').send({ idToken: 'token' });

    mockGoogle({ sub: `sub-${Date.now()}-d`, email });
    const viaGoogle = await request(app).post('/api/auth/google').send({ idToken: 'token' });

    expect(viaGoogle.body.user.id).toBe(viaFirebase.body.user.id);
    expect(await User.countDocuments({ email })).toBe(1);
  });

  it('answers 503 (not a crash) when the backend has no Firebase Admin credentials', async () => {
    delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    delete process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const res = await request(app).post('/api/auth/firebase').send({ idToken: 'token' });
    expect(res.statusCode).toBe(503);
  });
});
