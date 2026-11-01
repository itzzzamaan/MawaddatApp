Production deployment notes

This project includes a simple Express + MongoDB backend.

## Deploying the backend

The mobile app currently uses the Render backend URL. Values in local
`backend/.env` are not copied to Render or Vercel: configure secrets in the
hosting provider's service settings, then redeploy/restart the service.

### Render

Set `MONGO_URI`, `JWT_SECRET`, `FIREBASE_PROJECT_ID`, and
`FIREBASE_SERVICE_ACCOUNT_JSON` in the backend web service's **Environment**
settings. Put the Firebase service-account JSON in the host's secure environment
setting, not in the repository. The mobile app uses Firebase Authentication for
email verification and password-reset links, so the current app does not depend
on backend SMTP credentials.

### Deploying the backend to Vercel

Set the Vercel project root directory to `backend`. Vercel detects the exported
Express app in `app.js`. Add these environment variables in the Vercel project
settings for every environment you deploy:

- `MONGO_URI`: the MongoDB Atlas connection string
- `JWT_SECRET`: a long, random signing secret
- `FIREBASE_PROJECT_ID`: the Firebase project ID used by the app
- `FIREBASE_SERVICE_ACCOUNT_JSON`: Firebase Admin service-account JSON, stored
  as a secure environment variable

The alternative `GOOGLE_APPLICATION_CREDENTIALS` must point to a service
account file accessible to the deployed process; use the JSON environment
variable for a typical Render or Vercel deployment. Redeploy after changing
these settings. In MongoDB Atlas, verify the database user/password and that the
cluster's Network Access rules permit connections from the deployment. Prefer
restricted allowlists over opening the database to all IP addresses.

The previous SMTP and Resend OTP endpoints are retained for older app builds.
They are not called by the current mobile app; configure the corresponding mail
provider settings only if those legacy endpoints still need to serve clients.

The backend connects to MongoDB when an API request arrives. Confirm deployment
and database connectivity by requesting `/api/health`; a healthy response
includes `"database":"connected"`. Do not commit `.env` files.

Uploaded images are stored in MongoDB rather than the Vercel function filesystem,
so they remain available across deployments and function instances.

Recommendations:

1. Use a managed MongoDB (Atlas) and set `MONGO_URI` in `.env`.
2. Set `JWT_SECRET` to a strong secret in `.env`.
3. Use `pm2` or a process manager to run `node server.js`.
4. For non-Vercel production deployments, the backend can also use persistent object or file storage for uploads.
5. Build steps (example on a Linux server):

```bash
# install
cd backend
npm ci
# seed admin (only once)
node seed.js
# start
NODE_ENV=production node server.js
```

CI/CD: add tests run `npm test` (requires DB available). For production, run migrations (none) and ensure `uploads` folder is writable.

If you prefer a Docker deployment, create a Dockerfile and docker-compose with a MongoDB service or connect to Atlas.
