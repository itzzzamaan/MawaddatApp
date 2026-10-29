Mawaddat Backend

Quick start:

1. Install dependencies

```bash
cd backend
npm install
```

2. Copy `.env.example` to `.env` and edit `MONGO_URI` and `JWT_SECRET`.

3. Seed test admin:

```bash
npm run seed
```

Default test admin: email `admin@test.com` password `test1234`.

4. Start server:

```bash
npm run dev
```

API endpoints:
- POST /api/auth/login  { email, password }
- GET /api/events
- POST /api/events (auth + form-data image)
- GET/PUT/DELETE /api/events/:id
- Similar endpoints for /api/poets, /api/homefeeds, /api/carousels

Uploaded images are stored in MongoDB and served at `/uploads/`; existing files
in `uploads/` are still served as static assets.

For Vercel deployments, see [DEPLOY.md](./DEPLOY.md) for the required backend
environment variables and health check.
