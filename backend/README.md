Mawaddat Backend

Quick start:

1. Install dependencies

```bash
cd backend
npm install
```

2. Copy `.env.example` to `.env` and set `MONGO_URI` to your MongoDB connection
   string and `JWT_SECRET` to a strong secret. The backend does not fall back
   to a database when `MONGO_URI` is missing.

For local development with MongoDB running on the same computer, set
`MONGO_URI=mongodb://127.0.0.1:27017/mawaddat` in `backend/.env`. The mobile app
uses the local machine's LAN address from the root `.env`; keep the phone and
computer on the same Wi-Fi network and update `EXPO_PUBLIC_API_URL` if that
address changes.

3. Seed test admin:

```bash
npm run seed
```

Default test admin: email `admin@test.com` password `test1234`.

4. Start server:

```bash
npm run dev
```

5. Add sample poets, posts, and events to the configured MongoDB database
   (safe to run more than once; existing records are not overwritten):

```bash
npm run seed:content
```

API endpoints:
- POST /api/auth/login  { email, password }
- GET /api/events
- POST /api/events (auth + form-data image)
- GET/PUT/DELETE /api/events/:id
- Similar endpoints for /api/poets and /api/homefeeds
- /api/carousels manages homepage hero banners; /api/promotions manages
  post-sign-in splash promotions. Promotion changes require admin authentication.

Uploaded images are stored in MongoDB and served at `/uploads/`; existing files
in `uploads/` are still served as static assets.

For Vercel deployments, see [DEPLOY.md](./DEPLOY.md) for the required backend
environment variables and health check.
