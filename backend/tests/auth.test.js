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
  it('should login test admin', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'test1234' });

    expect([200, 201]).toContain(res.statusCode);
    expect(res.body).toHaveProperty('token');
  });
});
