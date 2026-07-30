# Deployment Guide
## Ballot.io — General Purpose Online Voting System

**Version:** 1.0  
**Date:** July 2026  
**Target Platforms:** Vercel (Frontend) + Railway (API + PostgreSQL)

---

## 1. Prerequisites

- GitHub repository with the Ballot.io monorepo
- Vercel account (free tier sufficient for prototype)
- Railway account (free tier or Hobby plan)
- Custom domain (optional; both platforms provide default subdomains)
- `openssl` installed locally (for JWT key pair generation)

---

## 2. Pre-Deployment Checklist

Before first deployment, complete all of the following:

- [ ] All tests pass: `npm test` in both `/api` and `/frontend`
- [ ] Lint is clean: `npm run lint` in both
- [ ] `NODE_ENV=production` environment variables documented
- [ ] JWT RS256 key pair generated (see Section 4)
- [ ] No secrets committed to Git (check with `git log --all -- '*.env'`)
- [ ] Admin seed user credentials noted and changed from defaults
- [ ] Database migration files verified: `npm run db:status`

---

## 3. Database Setup (Railway PostgreSQL)

### 3.1 Create a Railway Project

1. Log in at [railway.app](https://railway.app)
2. Click **New Project** → **Provision PostgreSQL**
3. Railway creates a PostgreSQL 15 instance automatically
4. From the Postgres service, click **Connect** → copy the `DATABASE_URL` (format: `postgresql://postgres:password@host:port/railway`)

### 3.2 Run Migrations Against Production

```bash
# From your local machine with the production DATABASE_URL
DATABASE_URL="postgresql://..." npm run db:migrate

# Verify migration state
DATABASE_URL="postgresql://..." npm run db:status
```

### 3.3 Seed the Admin User

```bash
DATABASE_URL="postgresql://..." npm run db:seed:admin
```

This script inserts the first admin account. Update the password immediately after first login.

---

## 4. JWT Key Pair Generation

Generate once; store private key as an environment secret, public key can be stored in the repo (it is not secret).

```bash
mkdir -p api/keys
openssl genrsa -out api/keys/private.pem 2048
openssl rsa -in api/keys/private.pem -pubout -out api/keys/public.pem

# Convert to single-line format for environment variables (replace newlines with \n)
# Store the private key in Railway as JWT_PRIVATE_KEY
# Store the public key in Railway as JWT_PUBLIC_KEY
```

**Never commit `private.pem` to Git.** Add to `.gitignore`:
```
api/keys/private.pem
```

---

## 5. API Deployment (Railway)

### 5.1 Add API Service to Railway Project

1. In your Railway project, click **New Service** → **GitHub Repo**
2. Select the `ballot-io` repository
3. Set the **Root Directory** to `/api`
4. Railway auto-detects Node.js and runs `npm start`

### 5.2 Set Environment Variables in Railway

Navigate to your API service → **Variables** tab → add:

```
NODE_ENV=production
PORT=3001
DATABASE_URL=<from step 3.1>
JWT_PRIVATE_KEY=<contents of private.pem, newlines as \n>
JWT_PUBLIC_KEY=<contents of public.pem, newlines as \n>
JWT_EXPIRY=86400
ALLOWED_ORIGIN=https://ballot-io.vercel.app
```

### 5.3 Configure Start Command

In Railway service settings → **Deploy** tab → Start Command:
```
node src/app.js
```

### 5.4 Generate Railway Domain

Railway → API service → **Settings** → **Domains** → Generate Domain.  
Note the URL (e.g. `ballot-io-api.up.railway.app`).

---

## 6. Frontend Deployment (Vercel)

### 6.1 Import Repository to Vercel

1. Log in at [vercel.com](https://vercel.com)
2. Click **New Project** → Import `ballot-io` from GitHub
3. Set **Root Directory** to `frontend`
4. Framework Preset: **Vite**
5. Build Command: `npm run build`
6. Output Directory: `dist`

### 6.2 Set Environment Variables in Vercel

Vercel project → **Settings** → **Environment Variables**:

```
VITE_API_BASE_URL=https://ballot-io-api.up.railway.app/api
```

Set for **Production**, **Preview**, and **Development** (use `http://localhost:3001/api` for Development).

### 6.3 Deploy

Click **Deploy**. Vercel builds and deploys automatically.  
Note your production URL (e.g. `ballot-io.vercel.app`).

---

## 7. Connect API CORS to Frontend URL

Update the Railway environment variable `ALLOWED_ORIGIN` with the actual Vercel URL:

```
ALLOWED_ORIGIN=https://ballot-io.vercel.app
```

Railway auto-restarts the service when variables change.

---

## 8. Custom Domain (Optional)

### Frontend (Vercel)
Vercel → Domains → Add `ballot.io` → follow DNS instructions (add CNAME/A record at registrar).

### API (Railway)
Railway → Service → Settings → Custom Domain → add `api.ballot.io` → follow DNS instructions.

Update `ALLOWED_ORIGIN` to `https://ballot.io` after domain is active.

---

## 9. CI/CD Pipeline Setup (GitHub Actions)

Create `.github/workflows/deploy.yml`:

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: ballot_io_test
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready
          --health-interval 10s

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: |
            api/package-lock.json
            frontend/package-lock.json

      - name: Install API dependencies
        run: cd api && npm ci

      - name: Lint API
        run: cd api && npm run lint

      - name: Run API migrations (test DB)
        run: cd api && npm run db:migrate
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/ballot_io_test

      - name: Run API tests
        run: cd api && npm test -- --coverage
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/ballot_io_test
          NODE_ENV: test

      - name: Install Frontend dependencies
        run: cd frontend && npm ci

      - name: Lint Frontend
        run: cd frontend && npm run lint

      - name: Run Frontend tests
        run: cd frontend && npm test

      - name: Build Frontend
        run: cd frontend && npm run build
        env:
          VITE_API_BASE_URL: https://api.ballot.io/api

  deploy:
    needs: lint-and-test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy API to Railway
        uses: bervProject/railway-deploy@v1.2.0
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
          service: ballot-io-api

      - name: Deploy Frontend to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
          working-directory: frontend

      - name: Smoke Test
        run: |
          sleep 30
          curl -f https://api.ballot.io/api/health || exit 1
          echo "Smoke test passed"
```

### Add Secrets to GitHub Repository
`Settings` → `Secrets and variables` → `Actions`:
- `RAILWAY_TOKEN` (from Railway account settings)
- `VERCEL_TOKEN` (from Vercel account settings)
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

---

## 10. Health Check Endpoint

Add to the API (`src/routes/health.routes.js`):

```javascript
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
```

This endpoint is used by the CI smoke test, uptime monitoring, and Railway's health check.

---

## 11. Uptime Monitoring (UptimeRobot)

1. Create a free account at [uptimerobot.com](https://uptimerobot.com)
2. Add a new monitor:
   - **Type:** HTTP(s)
   - **URL:** `https://api.ballot.io/api/health`
   - **Check interval:** 5 minutes
3. Add alert contact (email/SMS) — notify within 5 minutes of downtime

---

## 12. Go-Live Checklist

Execute these steps in order on the first production release:

- [ ] **Phase 1:** Run database migrations on production DB
- [ ] **Phase 2:** Seed admin account and verify login
- [ ] **Phase 3:** Verify DNS and HTTPS working for both domains
- [ ] **Phase 4:** Smoke test all 5 modules:
  - [ ] Register a new user
  - [ ] Create a test poll (admin)
  - [ ] Cast a vote on the test poll
  - [ ] View real-time results
  - [ ] View admin dashboard stats
- [ ] **Phase 5:** Soft launch — invite 5–10 known users; collect feedback
- [ ] **Phase 6:** Resolve any critical defects before full rollout
- [ ] **Phase 7:** Enable UptimeRobot monitoring
- [ ] **Phase 8:** Tag the release: `git tag v1.0.0 && git push --tags`

---

## 13. Rollback Procedure

If a critical defect is found post-deployment:

```bash
# Find the last stable release tag
git log --oneline --tags

# Revert Railway API to previous commit
# In Railway: Deployments tab → previous deployment → Redeploy

# Revert Vercel frontend to previous deployment
# In Vercel: Deployments tab → previous deployment → Promote to Production

# Or use Git (if CI/CD is configured):
git checkout v0.9.9
git push origin main --force   # Use with caution; prefer Railway/Vercel UI rollback
```

---

## 14. Post-Deployment Maintenance

| Task | Frequency | Owner |
|---|---|---|
| Review error logs (Railway) | Weekly | Developer |
| Check coverage reports | Per PR | Developer |
| Dependency security audit (`npm audit`) | Quarterly | Developer |
| Database backup verification | Monthly | Developer |
| UptimeRobot report review | Monthly | Developer |
| SSL certificate renewal | Auto (Let's Encrypt via Vercel/Railway) | Platform |
