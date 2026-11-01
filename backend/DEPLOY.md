Production deployment notes

This project includes a simple Express + MongoDB backend.

## Deploying the backend

The mobile app currently uses the Render backend URL. Values in local
`backend/.env` are not copied to Render or Vercel: configure secrets in the
hosting provider's service settings, then redeploy/restart the service.

### Render

Render Free web services block outbound traffic on SMTP ports `25`, `465`, and
`587`. Correct Gmail credentials therefore cannot deliver mail from a Free
service using SMTP.

To keep using Gmail SMTP, use a Render service plan that permits outbound SMTP
and add the following in the backend web service's **Environment** settings:

- `SMTP_HOST=smtp.gmail.com`
- `SMTP_PORT=587`
- `SMTP_USER`: the Gmail account used to send OTP emails
- `SMTP_PASS`: a Google App Password for that account (not its normal password)
- `SMTP_FROM`: the same Gmail address

Alternatively, on Render Free, configure an HTTPS email provider. The backend
supports Resend with these environment variables:

- `RESEND_API_KEY`: a Resend API key
- `SMTP_FROM`: a sender address verified with Resend (typically on a domain you
  control; a Gmail address cannot be used as an unverified sender)

Use the backend's environment settings for other secrets such as `MONGO_URI`
and `JWT_SECRET` as well. If the Render service cannot connect to Gmail SMTP,
use the HTTPS provider option instead. Do not put email credentials in the
mobile app or commit them to the repository. Redeploy after changing settings.

### Deploying the backend to Vercel

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
