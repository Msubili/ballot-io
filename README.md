# 🗳 Ballot.io

**A general-purpose online voting system web application.**

Ballot.io enables organisations, communities, and institutions to create, manage, and participate in secure, transparent digital elections and polls — all within a single, unified web application.

---

## Features

- **User Authentication** — Register, log in, and manage sessions with JWT-based auth
- **Poll Creation** — Create polls with 2–8 options across four categories (General, Election, Community, Corporate)
- **Vote Casting** — Cast votes on live polls with one-vote-per-user enforcement at the database level
- **Real-time Results** — Live bar chart visualisation that updates as votes come in
- **Admin Dashboard** — Platform-wide stats, poll management table, and audit-logged deletions
- **Automatic Status Transitions** — Polls automatically move Upcoming → Live → Closed based on configured dates

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, React Router v6, Recharts |
| API | Node.js 20 LTS, Express 4, JWT (RS256), Zod validation |
| Database | PostgreSQL 15 |
| Security | Helmet, bcrypt, express-rate-limit, httpOnly cookies |
| Testing | Jest, Supertest (API), Vitest, React Testing Library (UI) |
| CI/CD | GitHub Actions → Vercel (frontend) + Railway (API + DB) |

---

## Project Structure

```
ballot-io/
├── frontend/               # React SPA
│   ├── src/
│   │   ├── api/            # Fetch wrappers
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Route-level page components
│   │   ├── context/        # AuthContext
│   │   ├── hooks/          # Custom hooks
│   │   └── utils/          # Helpers
│   ├── public/
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── api/                    # Express REST API
│   ├── src/
│   │   ├── routes/         # Route definitions
│   │   ├── controllers/    # Request handlers
│   │   ├── middleware/     # Auth, validation, rate limiting
│   │   ├── services/       # Business logic
│   │   ├── db/             # Pool + migrations
│   │   └── jobs/           # Status transition cron
│   ├── tests/
│   └── package.json
│
├── docs/                   # All project documentation (this folder)
│   ├── PRD.md
│   ├── SRS.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE_SCHEMA.md
│   ├── DESIGN_SPEC.md
│   ├── API_REFERENCE.md
│   ├── TESTING_PLAN.md
│   └── DEPLOYMENT_GUIDE.md
│
├── .github/workflows/      # CI/CD pipelines
│   ├── ci.yml
│   └── deploy.yml
│
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js 20 LTS
- PostgreSQL 15 (local or cloud — see Supabase / Railway)
- `npm` or `yarn`

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/ballot-io.git
cd ballot-io
```

### 2. Set Up Environment Variables

**API** (`api/.env`):
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/ballot_io

# JWT (generate a key pair: see scripts/gen-keys.sh)
JWT_PRIVATE_KEY_PATH=./keys/private.pem
JWT_PUBLIC_KEY_PATH=./keys/public.pem
JWT_EXPIRY=86400     # 24 hours in seconds

# Server
PORT=3001
NODE_ENV=development

# CORS
ALLOWED_ORIGIN=http://localhost:5173
```

**Frontend** (`frontend/.env`):
```env
VITE_API_BASE_URL=http://localhost:3001/api
```

### 3. Set Up the Database

```bash
cd api

# Create the database
psql -U postgres -c "CREATE DATABASE ballot_io;"

# Run migrations
npm run db:migrate

# Seed development data (optional)
npm run db:seed
```

### 4. Generate JWT Key Pair

```bash
cd api
mkdir -p keys
openssl genrsa -out keys/private.pem 2048
openssl rsa -in keys/private.pem -pubout -out keys/public.pem
```

### 5. Start Development Servers

**API** (runs on `http://localhost:3001`):
```bash
cd api
npm install
npm run dev
```

**Frontend** (runs on `http://localhost:5173`):
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Default Credentials (Development Seed)

| Role | Email | Password |
|---|---|---|
| Admin | admin@ballot.io | Admin1234! |
| Voter | voter@ballot.io | Voter1234! |

**Change these before any production deployment.**

---

## Available Scripts

### API
```bash
npm run dev          # Start with nodemon hot-reload
npm run start        # Production start
npm run test         # Run Jest test suite
npm run test:watch   # Watch mode
npm run test:cov     # Coverage report
npm run db:migrate   # Run pending migrations
npm run db:rollback  # Rollback last migration
npm run db:seed      # Insert development seed data
npm run lint         # ESLint check
```

### Frontend
```bash
npm run dev          # Vite dev server
npm run build        # Production build
npm run preview      # Preview production build locally
npm run test         # Vitest
npm run test:ui      # Vitest UI mode
npm run lint         # ESLint check
```

---

## API Endpoints

Full documentation in `docs/API_REFERENCE.md`. Quick reference:

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout

GET    /api/polls
GET    /api/polls/:id
POST   /api/polls          (Admin)
PATCH  /api/polls/:id      (Admin)
DELETE /api/polls/:id      (Admin)

POST   /api/polls/:id/vote
GET    /api/polls/:id/results

GET    /api/admin/stats    (Admin)
GET    /api/admin/polls    (Admin)
```

---

## Testing

```bash
# All tests
cd api && npm test
cd frontend && npm test

# Coverage (API must reach ≥80%)
cd api && npm run test:cov
```

See `docs/TESTING_PLAN.md` for the full test strategy and test cases.

---

## Deployment

See `docs/DEPLOYMENT_GUIDE.md` for step-by-step production deployment on Vercel + Railway.

Quick summary:
1. Push to `main` branch
2. GitHub Actions runs lint → test → build
3. On success: Vercel deploys frontend, Railway deploys API
4. Smoke test verifies the live endpoints
5. UptimeRobot monitors ongoing availability

---

## Security

- Passwords hashed with bcrypt (cost factor 12)
- JWT signed with RS256 stored in httpOnly, Secure, SameSite=Strict cookies
- Rate limiting on all authentication endpoints (20 req/min per IP)
- CSRF mitigated by SameSite=Strict cookies + CORS origin whitelist
- All SQL queries parameterised (no string interpolation)
- Security headers via Helmet (CSP, X-Frame-Options, etc.)
- Full OWASP Top Ten mitigations documented in ARCHITECTURE.md

**Report security vulnerabilities to:** security@ballot.io

---

## Roadmap

**v1.1**
- Exportable results (CSV, PDF)
- WebSocket real-time results (replace polling)
- i18n: English, Swahili, French

**v2.0**
- Cryptographic E2E vote verification
- React Native mobile apps (iOS + Android)
- WCAG 2.1 Level AA full audit and remediation
- Tamper-evident audit trail reports

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Write tests for your changes
4. Ensure `npm run lint` and `npm test` pass
5. Open a pull request with a description referencing the relevant issue

---

## Licence

MIT Licence — see `LICENSE` file for details.

---

## Acknowledgements

Built as a final-year project at Kabarak University, Department of Computer Science & Information Technology, under the supervision of Dr Francis Komen.
"# ballot-io" 
"# ballot-io" 
