# Deployment Guide — Older Brother Team

## Build

```bash
npm run build
# Outputs:
#   dist/public/   ← React frontend (static files)
#   dist/index.js  ← Express backend (Node.js bundle)
```

## Run (production)

```bash
npm start
# or: NODE_ENV=production node dist/index.js
```

Requires environment variables:
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — Secret for admin JWT tokens (min 32 chars)
- `YAHOO_EMAIL_PASSWORD` *(optional)* — For contact-form email delivery

---

## Hosting options

### Replit (current)
Works out of the box. Deploy with the **Publish** button.

### VPS / cPanel with Node.js support
1. Upload the entire project (or just `dist/`) to your server.
2. Run `npm install --production` then `npm start`.
3. Point Nginx/Apache to port 5000 (see `nginx.conf`).

### cPanel Shared Hosting (Node.js App)
1. In cPanel → **Setup Node.js App**, set:
   - Application root: project folder
   - Application startup file: `dist/index.js`
   - Node version: 18+
2. Set environment variables in cPanel.
3. Run `npm install` via terminal.

### Netlify (static frontend only — no admin backend)
The `client/public/_redirects` file handles SPA routing automatically.
```
Build command:  npm run build
Publish dir:    dist/public
```
> **Note:** The admin panel and contact-form API require the Node.js backend.
> Use Netlify Functions or a separate backend host for full functionality.

### Vercel
`vercel.json` is already configured at the project root.
```bash
vercel --prod
```
The Express server runs as a Vercel Serverless Function.

### Apache / LiteSpeed / cPanel Static
`client/public/.htaccess` (copied to `dist/public/.htaccess` during build) handles:
- SPA route fallback (`RewriteRule ^ index.html`)
- Static asset caching
- Gzip compression

### Nginx
See `nginx.conf` for a reference configuration.

---

## File inventory (deployment-relevant)

| File | Purpose |
|------|---------|
| `dist/public/` | Built React app — serve statically |
| `dist/index.js` | Built Express server |
| `dist/public/_redirects` | Netlify SPA routing |
| `dist/public/.htaccess` | Apache/LiteSpeed SPA routing |
| `dist/public/404.html` | Static-host 404 → SPA redirect |
| `vercel.json` | Vercel routing config |
| `nginx.conf` | Nginx reference config |
