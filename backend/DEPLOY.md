Production deployment notes

This project includes a simple Express + MongoDB backend.

Recommendations:

1. Use a managed MongoDB (Atlas) and set `MONGO_URI` in `.env`.
2. Set `JWT_SECRET` to a strong secret in `.env`.
3. Use `pm2` or a process manager to run `node server.js`.
4. For uploads, use a storage volume or prefer S3 in production — replace multer storage accordingly.
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
