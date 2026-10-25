const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/mawaddat');
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
