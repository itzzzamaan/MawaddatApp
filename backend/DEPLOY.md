Production deployment notes

This project includes a simple Express + MongoDB backend.

## Deploying the backend to Vercel

Set the Vercel project root directory to `backend`. Vercel detects the exported
Express app in `app.js`. Add these environment variables in the Vercel project
settings for every environment you deploy:

- `MONGO_URI`: the MongoDB Atlas connection string
- `JWT_SECRET`: a long, random signing secret
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM` if signup
  and password-reset verification emails should be delivered

After adding or changing `MONGO_URI`, redeploy the backend so the deployment
receives the setting. In MongoDB Atlas, verify the database user/password and
that the cluster's Network Access rules permit connections from the Vercel
deployment. Prefer Vercel static outbound IPs or another restricted allowlist
over opening the database to all IP addresses.

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
