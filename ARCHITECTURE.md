# System Architecture Document
## Ballot.io — General Purpose Online Voting System

**Version:** 1.0  
**Date:** July 2026  
**Status:** Approved

---

## 1. Architectural Overview

Ballot.io follows a **three-tier client-server architecture** with a clear separation between the presentation layer, application layer, and data layer. The system is designed to be stateless at the API level, enabling horizontal scaling, and relies on the database as the single authoritative source of truth for all application state.

```
┌──────────────────────────────────────────────────────┐
│                    CLIENT LAYER                       │
│   React SPA (Vite)  —  Hosted on Vercel (CDN/Edge)  │
└────────────────────┬─────────────────────────────────┘
                     │ HTTPS / REST (JSON)
                     │ Cookie: JWT (httpOnly)
┌────────────────────▼─────────────────────────────────┐
│                  APPLICATION LAYER                    │
│   Node.js 20 + Express 4  —  Railway / Render        │
│   Middleware: Auth, Rate Limit, CORS, Helmet          │
│   Modules: Auth, Polls, Votes, Results, Admin         │
│   Background: Status Transition Cron Job              │
└────────────────────┬─────────────────────────────────┘
                     │ node-postgres (pg)
                     │ Parameterised SQL
┌────────────────────▼─────────────────────────────────┐
│                    DATA LAYER                         │
│   PostgreSQL 15  —  Supabase / Railway Postgres       │
│   Tables: users, polls, poll_options, votes,          │
│           audit_log                                   │
│   Daily backups, connection pooling (max 20)          │
└──────────────────────────────────────────────────────┘
```

---

## 2. Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| Frontend Framework | React 18 (functional + hooks) | Component model, ecosystem, SPA routing |
| Frontend Build | Vite 5 | Fast HMR, tree-shaking, small bundles |
| Frontend Styling | Tailwind CSS | Utility-first, responsive, no runtime overhead |
| Frontend Charts | Recharts | Composable React-native bar/pie charts |
| Frontend Routing | React Router v6 | Declarative nested routing, loader pattern |
| API Runtime | Node.js 20 LTS | Stable, async I/O, large ecosystem |
| API Framework | Express 4 | Mature, minimal, wide middleware support |
| Authentication | JWT (RS256) + httpOnly cookies | Stateless, XSS-resistant, CSRF-mitigated |
| Password Hashing | bcrypt (cost 12) | Industry standard, adaptive cost |
| Input Validation | Zod | Schema-first, TypeScript-compatible |
| Database | PostgreSQL 15 | ACID, relational integrity, JSON support |
| DB Access | node-postgres (pg) | Parameterised queries, connection pooling |
| DB Migrations | node-pg-migrate | Version-controlled schema changes |
| HTTP Security | Helmet.js | Sets all recommended security headers |
| Rate Limiting | express-rate-limit | Per-IP throttling on auth/API routes |
| CORS | cors (npm) | Whitelist-only origin configuration |
| Logging | Morgan (HTTP) + Winston (app) | Structured JSON logs for observability |
| Testing (API) | Jest + Supertest | Unit and integration test coverage |
| Testing (UI) | Vitest + React Testing Library | Component and user-flow tests |
| CI/CD | GitHub Actions | Automated lint, test, build, deploy on push |
| Frontend Hosting | Vercel | CDN, HTTPS, Preview Deployments |
| API Hosting | Railway | Docker-based, easy Postgres add-on |
| Monitoring | UptimeRobot | Uptime alerts within 5 minutes |

---

## 3. Frontend Architecture

### 3.1 Directory Structure
```
src/
├── api/              # Typed fetch wrappers for every API endpoint
├── components/
│   ├── ui/           # Atomic: Button, Input, Badge, Card, Modal
│   ├── polls/        # PollCard, PollForm, PollList, OptionBar
│   ├── results/      # ResultsChart, WinnerBanner
│   ├── auth/         # LoginForm, RegisterForm
│   └── admin/        # StatCard, PollTable, AdminNav
├── pages/            # Route-level components (React Router)
│   ├── HomePage.jsx
│   ├── PollsPage.jsx
│   ├── PollDetailPage.jsx
│   ├── VotePage.jsx
│   ├── ResultsPage.jsx
│   ├── LoginPage.jsx
│   ├── RegisterPage.jsx
│   └── AdminDashboardPage.jsx
├── context/          # AuthContext (user state, login/logout)
├── hooks/            # useAuth, usePoll, useVote, useResults
├── utils/            # formatPercent, formatDate, cn (classnames)
└── main.jsx          # Vite entry point, Router, Context providers
```

### 3.2 State Management
- **Authentication state:** React Context (`AuthContext`) — user object, isLoading, login/logout functions.
- **Server state:** Direct `fetch` calls inside hooks with local `useState`. No Redux or external state manager in v1.0; React Query may be introduced in v1.1 for caching.
- **No client-side vote storage:** All vote integrity enforced server-side.

### 3.3 Routing and Guards
```
/                   → HomePage (public, redirects authenticated users to /polls)
/register           → RegisterPage (public)
/login              → LoginPage (public)
/polls              → PollsPage (protected)
/polls/:id          → PollDetailPage (protected)
/polls/:id/vote     → VotePage (protected, live polls only)
/polls/:id/results  → ResultsPage (protected)
/admin              → AdminDashboardPage (protected, admin role only)
```

Protected routes wrap children with an `<AuthGuard>` component; admin routes additionally wrap with `<AdminGuard>`.

---

## 4. API Architecture

### 4.1 Directory Structure
```
src/
├── routes/
│   ├── auth.routes.js      # POST /register, /login, /logout
│   ├── polls.routes.js     # CRUD /polls, /polls/:id
│   ├── votes.routes.js     # POST /polls/:id/vote
│   ├── results.routes.js   # GET /polls/:id/results
│   └── admin.routes.js     # GET /admin/stats, /admin/polls
├── controllers/
│   ├── auth.controller.js
│   ├── polls.controller.js
│   ├── votes.controller.js
│   ├── results.controller.js
│   └── admin.controller.js
├── middleware/
│   ├── authenticate.js     # JWT validation
│   ├── requireAdmin.js     # Role check
│   ├── validate.js         # Zod schema validation
│   └── rateLimiter.js      # express-rate-limit configs
├── services/
│   ├── auth.service.js     # bcrypt, JWT sign/verify
│   ├── polls.service.js    # SQL query logic
│   ├── votes.service.js    # Vote commit + integrity
│   └── results.service.js  # Aggregation queries
├── db/
│   ├── pool.js             # pg Pool singleton
│   └── migrations/         # node-pg-migrate files
├── jobs/
│   └── statusTransition.js # Cron: Upcoming→Live→Closed
├── utils/
│   └── logger.js           # Winston configuration
└── app.js                  # Express app setup
```

### 4.2 Middleware Stack (applied globally)
```
Request
  → Helmet (security headers)
  → cors (origin whitelist)
  → express.json() (body parsing)
  → morgan (HTTP access log)
  → rateLimiter (per-route)
  → authenticate (JWT, on protected routes)
  → requireAdmin (on admin routes)
  → validate(schema) (on write routes)
  → controller
  → errorHandler (global)
Response
```

### 4.3 Error Handling
A single global `errorHandler` middleware catches all thrown errors and formats them as:
```json
{
  "error": {
    "code": "POLL_NOT_FOUND",
    "message": "The requested poll does not exist.",
    "status": 404
  }
}
```
No stack traces are exposed in production responses.

---

## 5. Database Architecture

See `DATABASE_SCHEMA.md` for the complete DDL.

### 5.1 Core Tables
- `users` — accounts, roles, hashed passwords
- `polls` — poll definitions, lifecycle metadata
- `poll_options` — the selectable options per poll
- `votes` — individual vote records (anonymous: links user to option, not to answer text)
- `audit_log` — immutable event log for admin actions

### 5.2 Key Design Decisions
- **UUID primary keys** throughout (no sequential integer IDs exposed to clients) to prevent enumeration attacks.
- **Unique constraint** on `(poll_id, user_id)` in `votes` enforces one-vote-per-user at the database level, independent of API logic.
- **Soft deletes not used** for votes (GDPR simplicity); polls use hard delete with audit log capture.
- **Vote counts computed via aggregation query**, not a denormalised counter, to maintain integrity under concurrent writes.

---

## 6. Security Architecture

### 6.1 Authentication Flow
```
1. User submits credentials → POST /api/auth/login
2. API validates credentials against bcrypt hash in DB
3. API signs JWT (RS256, 24h expiry) with private key
4. API responds with Set-Cookie: token=<jwt>; HttpOnly; Secure; SameSite=Strict; Path=/
5. Browser sends cookie automatically on all subsequent same-origin requests
6. API middleware verifies JWT signature with public key on every protected request
7. On logout: API responds with Set-Cookie: token=; Max-Age=0 (cookie cleared)
```

### 6.2 Vote Integrity
```
1. Authenticated user submits option_id → POST /api/polls/:id/vote
2. API checks poll status = Live (else 403)
3. API begins DB transaction
4. INSERT INTO votes (poll_id, option_id, user_id) — DB enforces UNIQUE(poll_id, user_id)
5. If duplicate key violation → rollback → 409 Conflict
6. If success → commit → 201 Created
```

### 6.3 Threat Mitigations
| Threat | Mitigation |
|---|---|
| XSS | httpOnly cookies; CSP header; React's JSX escaping |
| CSRF | SameSite=Strict cookie; CORS origin whitelist |
| SQL Injection | Parameterised queries exclusively (no string interpolation) |
| Brute Force | Rate limiting on /auth/login (20 req/min per IP) |
| Session Hijacking | HTTPS only; Short JWT expiry (24h); Secure cookie flag |
| Enumeration | UUID IDs; generic error messages; no user existence leakage |
| Privilege Escalation | Role checked server-side on every admin request |

---

## 7. CI/CD Pipeline

```
GitHub Push to main
  → Trigger: GitHub Actions workflow
  → Job 1: Lint (ESLint Airbnb)
  → Job 2: Test (Jest, Vitest — must pass 100%)
  → Job 3: Build (Vite production build)
  → Job 4: Deploy API (Railway: Docker build + deploy)
  → Job 5: Deploy Frontend (Vercel: CDN publish)
  → Job 6: Smoke Test (curl health check against production URL)
  → Notify: Slack/email on failure
```

Every PR triggers Jobs 1–3 only (no deploy). Merges to `main` trigger full pipeline.

---

## 8. Deployment Architecture

```
                      ┌─────────────┐
                      │  GitHub     │
                      │  Repository │
                      └──────┬──────┘
                             │ CI/CD (GitHub Actions)
              ┌──────────────┼──────────────┐
              │                             │
    ┌─────────▼──────────┐     ┌────────────▼──────────┐
    │  Vercel (Frontend)  │     │  Railway (API)         │
    │  CDN + Edge         │     │  Docker container      │
    │  HTTPS auto         │     │  PORT=3001             │
    │  ballot.io (domain) │     │  api.ballot.io          │
    └────────────────────┘     └────────────┬──────────┘
                                            │ Private network
                                 ┌──────────▼──────────┐
                                 │  Railway Postgres     │
                                 │  PostgreSQL 15        │
                                 │  Daily backups        │
                                 └──────────────────────┘
```

---

## 9. Observability

| Signal | Tool | Configuration |
|---|---|---|
| Uptime | UptimeRobot | Check every 5 min; alert < 5 min downtime |
| HTTP Logs | Morgan → stdout | JSON format; collected by Railway log drain |
| App Logs | Winston | INFO/WARN/ERROR levels; structured JSON |
| Error Tracking | Sentry (free tier) | Uncaught exceptions + React error boundaries |
| DB Metrics | Railway built-in | CPU, RAM, connection count |

---

## 10. Future Architecture Considerations

- **WebSockets (v1.1):** Replace results polling with Socket.io for push-based real-time updates.
- **Redis (v1.2):** Session revocation list; rate limit state shared across API instances.
- **E2E Cryptography (v2.0):** Homomorphic vote tallying; zero-knowledge proof of vote inclusion.
- **Mobile (v2.0):** React Native app sharing API layer and auth system.
- **i18n (v1.1):** `react-i18next` for English, Swahili, French.
