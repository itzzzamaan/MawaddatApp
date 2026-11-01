Mawaddat Backend

Quick start:

1. Install dependencies

```bash
cd backend
npm install
```

2. Copy `.env.example` to `.env` and set `MONGO_URI` to your MongoDB connection
   string, `JWT_SECRET` to a strong secret, `FIREBASE_PROJECT_ID` to your Firebase
   project ID, and configure Firebase Admin credentials with
   `FIREBASE_SERVICE_ACCOUNT_JSON` or `GOOGLE_APPLICATION_CREDENTIALS`. The
   backend does not fall back to a database when `MONGO_URI` is missing.

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
- POST /api/auth/firebase { idToken } verifies a Firebase ID token, requires a
  verified email, creates or links a MongoDB user, and returns a Mawaddat JWT.
- POST /api/auth/google { idToken } verifies a Google ID token and creates or
  links a user record only when Google confirms the email address.
- GET /api/events
- POST /api/events (auth + form-data image)
- GET/PUT/DELETE /api/events/:id
- Similar endpoints for /api/poets and /api/homefeeds
- Admins can assign poet positions 1–20 and post positions 1–50 with
  `PATCH /api/poets/:id/order` and `PATCH /api/homefeeds/:id/order`; items
  without a position stay in newest-first order.
- /api/carousels manages homepage hero banners; /api/promotions manages
  post-sign-in splash promotions. Promotion changes require admin authentication.

Google sign-in uses the Web OAuth client ID configured in the app and backend;
`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` and `GOOGLE_WEB_CLIENT_ID` can override the
provided default for another OAuth project. Android also needs OAuth clients
registered for package `Mawaddat.App` and both development/debug and release
signing-certificate SHA-1 fingerprints, with the updated `google-services.json`;
iOS needs its OAuth client ID, reversed
client ID URL scheme, and updated `GoogleService-Info.plist`. This Credential
Manager flow uses `react-native-nitro-google-signin`, requires a
development/production build, and does not run in Expo Go. The current mobile
app signs Google users into Firebase Auth, then synchronizes the verified Firebase
ID token through `/api/auth/firebase`. Email/password signup and sign-in also use
Firebase Auth; Firebase sends verification and password-reset links directly.
The legacy OTP endpoints remain for older clients but are not used by the current
app.

Uploaded images are stored in MongoDB and served at `/uploads/`; existing files
in `uploads/` are still served as static assets.

For Vercel deployments, see [DEPLOY.md](./DEPLOY.md) for the required backend
environment variables and health check.
