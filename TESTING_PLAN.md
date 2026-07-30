# Testing Plan
## Ballot.io — General Purpose Online Voting System

**Version:** 1.0  
**Date:** July 2026

---

## 1. Testing Strategy

Ballot.io uses a four-layer testing approach:

| Layer | Tool | Coverage Target | Scope |
|---|---|---|---|
| Unit | Jest (API), Vitest (Frontend) | ≥ 80% | Individual functions, services, components |
| Integration | Jest + Supertest | All API routes | Route handler + DB interaction |
| End-to-End | Playwright | All user journeys | Full browser flows |
| Security | Manual + OWASP ZAP | All auth routes | Auth bypass, injection, CSRF |

---

## 2. Test Environment

- **Development:** SQLite in-memory (unit tests) / PostgreSQL test DB (integration)
- **CI:** PostgreSQL 15 in GitHub Actions service container
- **Staging:** Mirrors production; used for E2E and smoke tests

---

## 3. Unit Test Cases

### 3.1 Auth Service (`auth.service.test.js`)

| Test ID | Description | Input | Expected |
|---|---|---|---|
| U-AUTH-01 | Hash password with bcrypt | "Password123!" | Returns 60-char hash, not equal to input |
| U-AUTH-02 | Verify correct password | Hash + "Password123!" | Returns `true` |
| U-AUTH-03 | Reject wrong password | Hash + "wrongpassword" | Returns `false` |
| U-AUTH-04 | Sign JWT for user | User object | Returns string with 3 dot-separated parts |
| U-AUTH-05 | Verify valid JWT | Valid token | Returns decoded payload with user id and role |
| U-AUTH-06 | Reject expired JWT | Token with past exp | Throws `TokenExpiredError` |
| U-AUTH-07 | Reject tampered JWT | Token with modified payload | Throws `JsonWebTokenError` |

### 3.2 Poll Service (`polls.service.test.js`)

| Test ID | Description | Expected |
|---|---|---|
| U-POLL-01 | Validate poll with 2 options | Passes validation |
| U-POLL-02 | Validate poll with 8 options | Passes validation |
| U-POLL-03 | Reject poll with 1 option | Throws VALIDATION_ERROR |
| U-POLL-04 | Reject poll with 9 options | Throws VALIDATION_ERROR |
| U-POLL-05 | Reject end_date before start_date | Throws VALIDATION_ERROR |
| U-POLL-06 | Accept equal start and end date | Throws VALIDATION_ERROR (must be after) |
| U-POLL-07 | Reject duplicate option text in same poll | Throws VALIDATION_ERROR |

### 3.3 Results Service (`results.service.test.js`)

| Test ID | Description | Expected |
|---|---|---|
| U-RES-01 | Calculate percentages for 3 options | Each % is correct, sum = 100 |
| U-RES-02 | Handle poll with 0 votes | All percentages are 0, no division error |
| U-RES-03 | Identify single winner | Correct winner object returned |
| U-RES-04 | Handle tied winners | Array of tied options returned |
| U-RES-05 | No winner field for Live poll | `winner` is null |

---

## 4. Integration Test Cases

All integration tests use Supertest against the Express app with a test PostgreSQL database, seeded with known data.

### 4.1 Authentication Routes

| Test ID | Route | Input | Expected HTTP | Expected Body |
|---|---|---|---|---|
| I-AUTH-01 | POST /api/auth/register | Valid new user | 201 | User object, session cookie set |
| I-AUTH-02 | POST /api/auth/register | Duplicate email | 409 | EMAIL_TAKEN error |
| I-AUTH-03 | POST /api/auth/register | Missing password | 422 | VALIDATION_ERROR |
| I-AUTH-04 | POST /api/auth/register | Password < 8 chars | 422 | VALIDATION_ERROR |
| I-AUTH-05 | POST /api/auth/login | Correct credentials | 200 | User object, session cookie |
| I-AUTH-06 | POST /api/auth/login | Wrong password | 401 | INVALID_CREDENTIALS |
| I-AUTH-07 | POST /api/auth/login | Unknown email | 401 | INVALID_CREDENTIALS (no leakage) |
| I-AUTH-08 | POST /api/auth/logout | Valid session | 204 | Cookie cleared |
| I-AUTH-09 | GET /api/auth/me | Valid session | 200 | Current user object |
| I-AUTH-10 | GET /api/auth/me | No session | 401 | UNAUTHORIZED |

### 4.2 Poll Routes

| Test ID | Route | Auth | Expected HTTP | Notes |
|---|---|---|---|---|
| I-POLL-01 | GET /api/polls | Voter | 200 | List with pagination |
| I-POLL-02 | GET /api/polls?status=Live | Voter | 200 | Only Live polls in results |
| I-POLL-03 | GET /api/polls | None | 401 | UNAUTHORIZED |
| I-POLL-04 | GET /api/polls/:id | Voter | 200 | Poll with options, user_has_voted=false |
| I-POLL-05 | GET /api/polls/:id (after voting) | Voter | 200 | user_has_voted=true |
| I-POLL-06 | GET /api/polls/nonexistent | Voter | 404 | POLL_NOT_FOUND |
| I-POLL-07 | POST /api/polls | Admin | 201 | Poll created with options |
| I-POLL-08 | POST /api/polls | Voter | 403 | FORBIDDEN |
| I-POLL-09 | POST /api/polls | None | 401 | UNAUTHORIZED |
| I-POLL-10 | POST /api/polls (invalid dates) | Admin | 422 | VALIDATION_ERROR |
| I-POLL-11 | DELETE /api/polls/:id | Admin | 204 | Poll gone, audit log entry exists |
| I-POLL-12 | DELETE /api/polls/:id | Voter | 403 | FORBIDDEN |

### 4.3 Vote Routes

| Test ID | Route | Input | Expected HTTP | Notes |
|---|---|---|---|---|
| I-VOTE-01 | POST /api/polls/:id/vote | Valid option, Live poll | 201 | Vote recorded, results returned |
| I-VOTE-02 | POST /api/polls/:id/vote (second time) | Same user, same poll | 409 | ALREADY_VOTED |
| I-VOTE-03 | POST /api/polls/:id/vote | Upcoming poll | 403 | POLL_NOT_LIVE |
| I-VOTE-04 | POST /api/polls/:id/vote | Closed poll | 403 | POLL_NOT_LIVE |
| I-VOTE-05 | POST /api/polls/:id/vote | Invalid option_id | 404 | OPTION_NOT_FOUND |
| I-VOTE-06 | POST /api/polls/:id/vote | No auth | 401 | UNAUTHORIZED |

### 4.4 Admin Routes

| Test ID | Route | Auth | Expected HTTP |
|---|---|---|---|
| I-ADMIN-01 | GET /api/admin/stats | Admin | 200 |
| I-ADMIN-02 | GET /api/admin/stats | Voter | 403 |
| I-ADMIN-03 | GET /api/admin/polls | Admin | 200 |
| I-ADMIN-04 | GET /api/admin/polls | Voter | 403 |

---

## 5. End-to-End Test Cases (Playwright)

### 5.1 Voter User Journey

| Test ID | Flow | Steps | Expected Outcome |
|---|---|---|---|
| E2E-01 | Full registration and login | Register → auto-redirect → view polls | Polls page visible with user's name |
| E2E-02 | Cast a vote | Login → select Live poll → pick option → submit | Confirmation message shown |
| E2E-03 | View results after voting | Post-vote confirmation → click View Results | Results chart shown with user's option highlighted |
| E2E-04 | Prevent double vote | Login (already voted) → open same poll | "Vote" button is disabled; "Already voted" message |
| E2E-05 | Browse polls by category | Click Community filter tab | Only Community polls shown |
| E2E-06 | Logout | Click Logout | Redirect to login; /polls inaccessible |

### 5.2 Admin User Journey

| Test ID | Flow | Steps | Expected Outcome |
|---|---|---|---|
| E2E-07 | Create a poll | Login as admin → Create Poll → fill form → submit | Poll appears on polls page with Upcoming status |
| E2E-08 | View admin dashboard | Login as admin → Admin tab | KPI cards show correct counts |
| E2E-09 | Delete a poll | Dashboard → Delete → confirmation modal → confirm | Poll removed; vote count decremented in stats |
| E2E-10 | Admin can vote on live poll | Dashboard → Vote action on Live poll | Vote recorded, redirected to results |

### 5.3 Security User Journey

| Test ID | Flow | Expected |
|---|---|---|
| E2E-11 | Access /polls without login | Redirect to /login |
| E2E-12 | Access /admin as voter | 403 page |
| E2E-13 | Navigate to /admin as unauthenticated | Redirect to /login |

---

## 6. Security Test Cases

| Test ID | Test | Method | Expected |
|---|---|---|---|
| S-01 | SQL injection in login email | `' OR 1=1 --` as email | 422 validation error, no DB error |
| S-02 | XSS in poll title | `<script>alert(1)</script>` as title | Stored as plain text, rendered escaped |
| S-03 | JWT without signature | Stripped signature | 401 Unauthorised |
| S-04 | JWT with role:admin forged | Modified payload, valid structure | 401 (signature invalid) |
| S-05 | CSRF attempt from different origin | Cross-origin POST to /vote | CORS rejection (403/blocked) |
| S-06 | Brute force login | 21 POST /auth/login in 1 minute | 429 Too Many Requests on 21st |
| S-07 | Access another user's vote | Query votes table by ID | Only own vote accessible; no endpoint leaks others |
| S-08 | Password in API response | Any endpoint returning user | `password_hash` field never present in JSON |
| S-09 | Enumerate user IDs | GET /api/users/1, /2, /3... | 404 (route doesn't exist); UUIDs prevent sequence guessing |

---

## 7. Browser Compatibility Testing

| Browser | Version | All tests pass? |
|---|---|---|
| Chrome | 90+ | ✓ Target |
| Firefox | 88+ | ✓ Target |
| Edge | 90+ | ✓ Target |
| Safari | 15+ | ✓ Target |
| Chrome (Android) | Latest | ✓ Target |
| Safari (iOS) | Latest | ✓ Target |

---

## 8. Performance Testing

| Scenario | Tool | Target |
|---|---|---|
| 100 concurrent GET /api/polls | k6 | p95 < 500ms |
| 50 concurrent POST /api/polls/:id/vote | k6 | Zero duplicate votes; 0 errors |
| Frontend Lighthouse audit | Lighthouse CI | Performance score ≥ 90 |
| Frontend LCP | Lighthouse CI | < 2.5s |

---

## 9. Test Coverage Requirements

- API unit + integration: **≥ 80%** line coverage (enforced in CI)
- All 8 original functional test cases from the project proposal must pass
- CI pipeline fails if any test fails or coverage drops below threshold

---

## 10. Test Data

Development seed includes (see `/api/scripts/seed.js`):
- 1 admin user, 3 voter users
- 6 polls spanning all categories and all statuses
- Pre-seeded votes for closed polls to enable results testing

Functional test poll data matches the original proposal appendix:
- Student Council President 2025 (Election, Live, 1,248 votes)
- Best Addition to Riverside Park (Community, Live, 634 votes)
- Annual Conference Theme 2025 (Corporate, Live, 312 votes)
- Neighbourhood Watch Captain (Election, Upcoming, 0 votes)
- Municipal Budget Priority 2024 (Election, Closed, 4,782 votes)
- Best Open Source Tool 2024 (General, Closed, 2,109 votes)
