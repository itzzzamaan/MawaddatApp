const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../app');
const { connectToDatabase } = require('../database');
const ImageAsset = require('../models/ImageAsset');
const HomeFeed = require('../models/HomeFeed');

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==',
  'base64',
);
const jpeg = Buffer.concat([
  Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]),
  Buffer.from([0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0]),
  Buffer.alloc(40),
  Buffer.from([0xff, 0xd9]),
]);
const webp = Buffer.concat([
  Buffer.from('RIFF'),
  Buffer.from([40, 0, 0, 0]),
  Buffer.from('WEBPVP8 '),
  Buffer.alloc(40),
]);

let adminAuth;

beforeAll(async () => {
  await connectToDatabase();
  const token = jwt.sign(
    { id: 'admin', email: 'admin@example.com', role: 'admin' },
    process.env.JWT_SECRET || 'change_this_secret',
  );
  adminAuth = `Bearer ${token}`;
});

afterAll(async () => {
  await mongoose.disconnect();
});

// Mirrors what the web (Blob) and React Native ({ uri, name, type }) clients send.
const upload = (buffer, filename, type) =>
  request(app)
    .post('/api/uploads')
    .set('Authorization', adminAuth)
    .attach('image', buffer, { filename, contentType: type });

describe('Image uploads (web and mobile)', () => {
  it.each([
    ['web JPEG', jpeg, 'photo.jpg', 'image/jpeg', 'image/jpeg', 'jpg'],
    ['mobile JPEG with an extensionless name', jpeg, '1000012345', 'image/jpeg', 'image/jpeg', 'jpg'],
    ['mobile JPEG labelled image/jpg', jpeg, 'x.jpg', 'image/jpg', 'image/jpeg', 'jpg'],
    ['mobile JPEG with a generic mime type', jpeg, 'x', 'application/octet-stream', 'image/jpeg', 'jpg'],
    ['mobile JPEG with a .heic name', jpeg, 'x.heic', 'image/heic', 'image/jpeg', 'jpg'],
    ['PNG labelled as JPEG', png, 'x.jpg', 'image/jpeg', 'image/png', 'png'],
    ['WebP', webp, 'x.webp', 'image/webp', 'image/webp', 'webp'],
  ])('stores %s and serves it with the real content type', async (_label, buffer, name, type, served, ext) => {
    const res = await upload(buffer, name, type);

    expect(res.statusCode).toBe(200);
    expect(res.body.path).toMatch(new RegExp(`^/uploads/[a-f0-9]{24}\\.${ext}$`));
    expect(res.body.url).toMatch(/^https?:\/\/.+\/uploads\//);

    const image = await request(app).get(res.body.path);
    expect(image.statusCode).toBe(200);
    expect(image.headers['content-type']).toBe(served);
    expect(Buffer.compare(image.body, buffer)).toBe(0);
  });

  it('stores an identical file only once', async () => {
    const data = Buffer.concat([jpeg, Buffer.from(`dedupe-${Date.now()}`)]);
    const first = await upload(data, 'a.jpg', 'image/jpeg');
    const second = await upload(data, 'b.jpg', 'image/jpeg');

    expect(second.body.path).toBe(first.body.path);
    expect(await ImageAsset.countDocuments({ _id: first.body.filename.split('.')[0] })).toBe(1);
  });

  it('rejects a non-image file even when it claims to be a JPEG', async () => {
    const res = await upload(Buffer.from('hello world, definitely not an image'), 'a.jpg', 'image/jpeg');
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/JPG, PNG, and WEBP/);
  });

  it('rejects files larger than 10 MB', async () => {
    const res = await upload(Buffer.concat([jpeg, Buffer.alloc(10 * 1024 * 1024)]), 'big.jpg', 'image/jpeg');
    expect(res.statusCode).toBe(413);
  });

  it('rejects a request without a file, and an unauthenticated request', async () => {
    const empty = await request(app).post('/api/uploads').set('Authorization', adminAuth);
    expect(empty.statusCode).toBe(400);

    const anonymous = await request(app).post('/api/uploads').attach('image', jpeg, 'a.jpg');
    expect(anonymous.statusCode).toBe(401);
  });

  it('still serves legacy images that have no stored hash', async () => {
    const legacy = await ImageAsset.collection.insertOne({
      data: jpeg,
      contentType: 'image/jpeg',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(app).get(`/uploads/${legacy.insertedId}.jpg`);
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('image/jpeg');
  });

  it('saves the permanent /uploads path on the post and serves it to users', async () => {
    const uploaded = await upload(jpeg, '1000012345', 'image/jpeg');
    const created = await request(app)
      .post('/api/homefeeds')
      .set('Authorization', adminAuth)
      .field('poet', 'Test Poet')
      .field('content', JSON.stringify({ roman: 'verse' }))
      .field('image', uploaded.body.path)
      .field('avatar', uploaded.body.path);
    expect(created.statusCode).toBe(200);

    const stored = await HomeFeed.findById(created.body._id).lean();
    expect(stored.image).toBe(uploaded.body.path);
    expect(stored.image).not.toMatch(/^(file|content):/);

    // What an end user's app receives, with no admin token.
    const list = await request(app).get('/api/homefeeds');
    const item = list.body.find((feed) => feed._id === created.body._id);
    expect(item.image).toMatch(/\/uploads\/[a-f0-9]{24}\.jpg$/);
    const image = await request(app).get(new URL(item.image).pathname);
    expect(image.statusCode).toBe(200);
  });
});
