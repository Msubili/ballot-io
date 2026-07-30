# System Requirements Specification (SRS)
## Ballot.io — General Purpose Online Voting System

**Version:** 1.0  
**Date:** July 2026  
**Standard:** IEEE 830-1998 Adapted  
**Status:** Baseline

---

## 1. Introduction

### 1.1 Purpose
This document specifies the complete functional and non-functional requirements for Ballot.io. It serves as the contractual baseline between stakeholders and the development team and is used as the primary input to system design, implementation, and testing.

### 1.2 Scope
Ballot.io is a full-stack web application comprising:
- A RESTful HTTP API (Node.js / Express)
- A PostgreSQL relational database
- A React single-page application (SPA) frontend
- A CI/CD pipeline (GitHub Actions) targeting cloud hosting (Vercel + Railway/Supabase)

### 1.3 Definitions
| Term | Definition |
|---|---|
| Poll | A question with between 2 and 8 selectable options presented to voters |
| Election | A poll categorised specifically as a formal competitive vote |
| Vote | A single authenticated user's selection of one option in one poll |
| Admin | A user account with elevated platform management privileges |
| JWT | JSON Web Token used for stateless session authentication |
| SPA | Single-Page Application — all routing handled client-side |
| WCAG | Web Content Accessibility Guidelines |
| CSRF | Cross-Site Request Forgery — an attack vector mitigated by SameSite cookies |

### 1.4 References
- OWASP Top Ten 2021
- WCAG 2.1 Level AA
- RFC 7519 (JWT)
- PostgreSQL 15 Documentation
- Express.js 4.x Documentation

---

## 2. System Overview

Ballot.io operates as a three-tier web application:

```
Browser (React SPA)  ←→  REST API (Node/Express)  ←→  PostgreSQL DB
```

The frontend communicates exclusively with the API over HTTPS. The API validates all requests, enforces business rules, and persists data to PostgreSQL. No business logic lives in the frontend; the frontend is a presentation and interaction layer only.

---

## 3. Functional Requirements

### 3.1 Authentication Subsystem

#### 3.1.1 User Registration
- **SRS-AUTH-001:** The system shall accept a POST request to `/api/auth/register` with body fields: `name` (string, required), `email` (string, required, unique), `password` (string, required, min 8 characters).
- **SRS-AUTH-002:** The system shall validate email format using RFC 5322 syntax rules.
- **SRS-AUTH-003:** The system shall reject registration if the email already exists in the `users` table, returning HTTP 409 Conflict.
- **SRS-AUTH-004:** The system shall hash passwords using bcrypt with a cost factor of ≥ 12 before storage.
- **SRS-AUTH-005:** On successful registration, the system shall return HTTP 201 Created with a JWT session cookie set (httpOnly, Secure, SameSite=Strict, Max-Age = 86400).
- **SRS-AUTH-006:** The system shall assign the role `voter` to all newly registered users by default.

#### 3.1.2 User Login
- **SRS-AUTH-007:** The system shall accept a POST request to `/api/auth/login` with `email` and `password`.
- **SRS-AUTH-008:** On credential mismatch, the system shall return HTTP 401 Unauthorised with the message "Invalid email or password" (no field-level specificity).
- **SRS-AUTH-009:** On successful login, the system shall return HTTP 200 OK with a refreshed JWT session cookie.

#### 3.1.3 Session Management
- **SRS-AUTH-010:** Protected API routes shall validate the JWT from the cookie on every request.
- **SRS-AUTH-011:** Expired or tampered JWTs shall result in HTTP 401 Unauthorised.
- **SRS-AUTH-012:** The system shall provide a POST `/api/auth/logout` endpoint that instructs the browser to clear the session cookie (Set-Cookie with Max-Age=0).

### 3.2 Poll Management Subsystem

#### 3.2.1 Poll Creation
- **SRS-POLL-001:** The system shall accept POST `/api/polls` (Admin role required) with: `title` (string, max 120 chars), `description` (string, max 500 chars), `category` (enum: General | Election | Community | Corporate), `status` (enum: Upcoming | Live | Closed), `start_date` (ISO 8601 datetime), `end_date` (ISO 8601 datetime), `options` (array, min 2, max 8 strings, each max 100 chars).
- **SRS-POLL-002:** The system shall validate that `end_date` > `start_date`, returning HTTP 422 if violated.
- **SRS-POLL-003:** Options array shall be validated for minimum 2 and maximum 8 entries; duplicates within the same poll shall be rejected.
- **SRS-POLL-004:** On successful creation, the system shall return HTTP 201 with the full poll object including its generated UUID.

#### 3.2.2 Poll Retrieval
- **SRS-POLL-005:** GET `/api/polls` shall return all polls (authenticated users only), ordered by created_at descending, with pagination (default limit 20, max 100).
- **SRS-POLL-006:** GET `/api/polls?status=live` shall filter results to Live polls only.
- **SRS-POLL-007:** GET `/api/polls/:id` shall return a single poll with its options and aggregate vote counts per option.
- **SRS-POLL-008:** The system shall include a boolean field `user_has_voted` in the poll detail response for the authenticated user.

#### 3.2.3 Poll Status Lifecycle
- **SRS-POLL-009:** A background job (cron, interval ≤ 60 seconds) shall automatically transition polls from Upcoming → Live when `start_date` ≤ now, and from Live → Closed when `end_date` < now.
- **SRS-POLL-010:** Manual status overrides by admin are permitted via PATCH `/api/polls/:id`.

#### 3.2.4 Poll Deletion
- **SRS-POLL-011:** DELETE `/api/polls/:id` (Admin only) shall permanently remove the poll and all associated votes.
- **SRS-POLL-012:** Every deletion shall create an entry in the `audit_log` table recording: poll_id, poll_title (snapshot), admin_user_id, timestamp, action = 'DELETE_POLL'.

### 3.3 Voting Subsystem

- **SRS-VOTE-001:** POST `/api/polls/:id/vote` (Authenticated voter) shall accept body: `{ "option_id": "<uuid>" }`.
- **SRS-VOTE-002:** The system shall verify that the poll status is Live before recording a vote; Upcoming or Closed polls shall return HTTP 403 Forbidden.
- **SRS-VOTE-003:** The system shall enforce a unique constraint on (poll_id, user_id) in the `votes` table.
- **SRS-VOTE-004:** Duplicate vote attempts shall return HTTP 409 Conflict with message "You have already voted in this poll."
- **SRS-VOTE-005:** The vote shall be committed atomically; partial writes must not occur.
- **SRS-VOTE-006:** On success, the system shall return HTTP 201 Created with the vote record and updated poll results.
- **SRS-VOTE-007:** The voter's identity shall not be included in results API responses (anonymity preservation).

### 3.4 Results Subsystem

- **SRS-RES-001:** GET `/api/polls/:id/results` shall return: poll metadata, each option with vote_count and percentage (rounded to 2 decimal places), total_votes.
- **SRS-RES-002:** For Closed polls, the response shall include a `winner` field identifying the option(s) with the highest vote count. In a tie, all tied options are listed.
- **SRS-RES-003:** The results endpoint shall be accessible to all authenticated users regardless of their vote status.

### 3.5 Administration Subsystem

- **SRS-ADMIN-001:** GET `/api/admin/stats` (Admin only) shall return: total_polls, live_polls, total_votes, completed_elections.
- **SRS-ADMIN-002:** GET `/api/admin/polls` (Admin only) shall return all polls with management metadata (creator, vote count, status) — no pagination cap for admin views.
- **SRS-ADMIN-003:** All admin endpoints shall return HTTP 403 Forbidden for non-Admin authenticated users.

---

## 4. Non-Functional Requirements

### 4.1 Performance
- **SRS-NFR-PERF-001:** API p95 response time shall be < 500ms under 100 concurrent users.
- **SRS-NFR-PERF-002:** Frontend initial page load (LCP) shall be < 2.5s on a 10 Mbps connection.
- **SRS-NFR-PERF-003:** Results polling shall not cause perceptible UI jank; updates shall be handled off the main thread.

### 4.2 Security
- **SRS-NFR-SEC-001:** All HTTP communication shall be over TLS 1.2+; HTTP requests shall redirect to HTTPS (301).
- **SRS-NFR-SEC-002:** JWTs shall be signed with RS256 (asymmetric) and stored only in httpOnly cookies.
- **SRS-NFR-SEC-003:** All user-provided string inputs shall be sanitised before storage (strip HTML tags, parameterised queries for all DB operations).
- **SRS-NFR-SEC-004:** The API shall implement rate limiting: 20 requests/minute for auth endpoints; 200 requests/minute for other endpoints per IP.
- **SRS-NFR-SEC-005:** CORS shall be configured to allow only the verified frontend origin.
- **SRS-NFR-SEC-006:** HTTP security headers shall be set: `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`.
- **SRS-NFR-SEC-007:** Passwords shall never be logged or included in API responses.

### 4.3 Availability & Reliability
- **SRS-NFR-AVAIL-001:** Production deployment shall target 99.5% monthly uptime.
- **SRS-NFR-AVAIL-002:** Uptime monitoring (UptimeRobot or equivalent) shall alert within 5 minutes of downtime.
- **SRS-NFR-AVAIL-003:** Database backups shall run daily with 7-day retention.

### 4.4 Scalability
- **SRS-NFR-SCALE-001:** The API layer shall be stateless, enabling horizontal scaling via multiple instances behind a load balancer.
- **SRS-NFR-SCALE-002:** The database connection pool shall be configurable (default: min 2, max 20 connections).

### 4.5 Usability & Accessibility
- **SRS-NFR-UX-001:** All interactive elements shall have accessible labels (ARIA) and be keyboard-navigable.
- **SRS-NFR-UX-002:** Colour contrast ratios shall meet WCAG 2.1 Level AA (≥ 4.5:1 for normal text).
- **SRS-NFR-UX-003:** Error messages shall describe the problem and suggest corrective action.
- **SRS-NFR-UX-004:** The application shall function correctly at viewport widths from 320px to 2560px.

### 4.6 Maintainability
- **SRS-NFR-MAINT-001:** Unit test coverage shall be ≥ 80% for all API route handlers and business logic functions.
- **SRS-NFR-MAINT-002:** All environment-specific configuration (DB URL, JWT secret, etc.) shall be provided via environment variables, never hardcoded.
- **SRS-NFR-MAINT-003:** The codebase shall pass ESLint with the Airbnb rule set (zero errors, warnings documented).

---

## 5. Interface Requirements

### 5.1 API Interface
- Protocol: HTTP/1.1 and HTTP/2 over TLS
- Data format: JSON (`Content-Type: application/json`)
- Authentication: Bearer JWT via `Cookie` header
- Versioning: URL prefix `/api/v1/` from the first breaking change

### 5.2 Database Interface
- Driver: `pg` (node-postgres) with connection pooling
- Migrations: `node-pg-migrate` or `Flyway`; all schema changes in versioned migration files
- No ORM; raw parameterised SQL to maintain query transparency

### 5.3 Frontend–API Interface
- All API calls originate from the React SPA using `fetch` with `credentials: 'include'`
- API base URL injected at build time via environment variable `VITE_API_BASE_URL`

---

## 6. Constraints

- Development timeline: 8 weeks
- Budget: Open-source tooling only (no paid SaaS dependencies in prototype)
- Database: PostgreSQL only (no MongoDB or Firebase)
- Frontend framework: React (functional components + hooks)
- Hosting: Vercel (frontend) + Railway or Supabase (API + database)
- Node.js version: 20 LTS minimum

---

## 7. Acceptance Criteria Summary

| Module | Acceptance Test | Pass Condition |
|---|---|---|
| Auth | Register → Login → Access protected route | 200 OK with user data |
| Auth | Login with wrong password | 401, no session cookie |
| Polls | Create poll with 3 options | Poll appears in GET /api/polls |
| Voting | Cast vote on Live poll | 201, vote_count increments |
| Voting | Cast second vote same poll | 409 Conflict |
| Voting | Vote on Closed poll | 403 Forbidden |
| Results | Fetch results for any poll | Options with correct percentages |
| Admin | Access /api/admin/stats as voter | 403 Forbidden |
| Admin | Delete poll as admin | 204, poll gone from GET /api/polls |
