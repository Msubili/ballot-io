# Product Requirements Document (PRD)
## Ballot.io — General Purpose Online Voting System

**Version:** 1.0  
**Date:** July 2026  
**Author:** Joel Maina Mwangi  
**Status:** Approved for Development

---

## 1. Product Overview

Ballot.io is a general-purpose web-based voting platform designed to serve communities, educational institutions, corporate bodies, and public organisations. It enables authorised administrators to create and manage polls and elections, and authenticated voters to cast votes, view real-time results, and participate in transparent democratic processes — all within a single, unified web application.

The product replaces manual paper-based and fragmented digital approaches (email surveys, social media polls) with a structured, integrity-enforced system that supports multiple use cases including student elections, community decisions, corporate governance votes, and general public polls.

---

## 2. Problem Statement

Many organisations continue to conduct votes and elections through:
- Paper-based manual processes (error-prone, geographically limiting)
- Email polls and social media surveys (no integrity controls, no anonymity)
- Fragmented tools that separate poll creation, user management, and results into different platforms

These approaches result in vote duplication risks, delayed result tallying, lack of transparency, and high administrative overhead. No accessible, free, general-purpose platform unifies all these capabilities.

---

## 3. Goals and Success Metrics

| Goal | Success Metric |
|---|---|
| Enable any organisation to run a credible digital poll | Admin can create and publish a poll in under 3 minutes |
| Enforce one-vote-per-user integrity | Zero duplicate votes recorded in any test scenario |
| Provide transparent real-time results | Results update within 1 second of a vote being cast |
| Support diverse poll types | System handles election, community, corporate, and general categories |
| Minimise admin overhead | Single dashboard surfaces all key platform metrics |
| Secure authentication | All voting routes inaccessible to unauthenticated users |

---

## 4. Target Users

### 4.1 Voters (Primary Users)
Students, community members, employees, and any individual invited to participate in a poll. They need a simple, trustworthy interface that guides them through casting a vote and viewing results.

### 4.2 Poll Creators / Administrators (Secondary Users)
Department officers, event organisers, HR staff, student union officials. They need robust poll creation tools, management capabilities, and a dashboard showing platform health at a glance.

### 4.3 Observers / Public Viewers
Individuals who can view results of published polls without casting a vote. Supports transparency for elections where public accountability is required.

---

## 5. Functional Requirements

### 5.1 Module 1 — User Registration & Authentication
- **FR-1.1:** A visitor can register with a full name, email address, and password.
- **FR-1.2:** The system validates that the email is unique and in valid format.
- **FR-1.3:** Passwords must be a minimum of 8 characters and stored hashed (bcrypt).
- **FR-1.4:** A registered user can log in with their email and password.
- **FR-1.5:** Invalid credentials produce a clear, non-leaking error message.
- **FR-1.6:** Authenticated sessions are maintained via JWT stored in httpOnly, Secure, SameSite=Strict cookies.
- **FR-1.7:** A user can sign out, terminating their session and clearing credentials.
- **FR-1.8:** Unauthenticated users attempting to access voting routes are redirected to login.
- **FR-1.9:** An admin role is distinguished from a standard voter role at the data level.

### 5.2 Module 2 — Poll Creation & Management
- **FR-2.1:** An authenticated user with creator privileges can create a new poll.
- **FR-2.2:** A poll record requires: title, description, category, status, start date, end date, and between 2 and 8 options.
- **FR-2.3:** Poll categories: General, Election, Community, Corporate.
- **FR-2.4:** Poll statuses: Upcoming, Live, Closed.
- **FR-2.5:** The system validates that end date is after start date.
- **FR-2.6:** Options can be dynamically added (up to 8) and removed (minimum 2) during creation.
- **FR-2.7:** An admin can delete any poll via the Admin Dashboard with a confirmation prompt.
- **FR-2.8:** Status transitions (Upcoming → Live → Closed) are driven by start/end date relative to current time, evaluated server-side.

### 5.3 Module 3 — Voting Interface
- **FR-3.1:** All Live polls are displayed to authenticated voters on the home/polls page.
- **FR-3.2:** A voter can select exactly one option per poll and submit their vote.
- **FR-3.3:** The system enforces one-vote-per-user-per-poll at the database/API level.
- **FR-3.4:** Attempting to vote twice on the same poll returns a 409 Conflict response with a user-readable explanation.
- **FR-3.5:** On successful vote submission, a confirmation message is displayed.
- **FR-3.6:** From the confirmation screen, the voter can navigate directly to the results for that poll.
- **FR-3.7:** Upcoming and Closed polls are visible but not votable; voting controls are disabled with explanatory labels.

### 5.4 Module 4 — Results Visualisation
- **FR-4.1:** Results are accessible to all authenticated users for any poll.
- **FR-4.2:** Results are displayed as a horizontal bar chart showing each option's percentage share and absolute vote count.
- **FR-4.3:** Results update in real time (polling interval ≤ 5 seconds, or via WebSocket).
- **FR-4.4:** For Closed polls, the winning option is clearly highlighted with a visual winner indicator.
- **FR-4.5:** Total vote count for the poll is displayed prominently.

### 5.5 Module 5 — Administrative Dashboard
- **FR-5.1:** The dashboard is accessible only to users with the Admin role.
- **FR-5.2:** KPI cards display: total polls, live polls, total votes cast, completed elections.
- **FR-5.3:** A full poll management table shows all polls with: title, category, status, vote count, and action buttons.
- **FR-5.4:** Actions available per poll: View Results, Vote (if live), Delete (with confirmation guard).
- **FR-5.5:** Admins can create new polls directly from the dashboard.
- **FR-5.6:** Poll deletion is logged with timestamp and admin user ID for audit purposes.

---

## 6. Non-Functional Requirements

| ID | Requirement | Acceptance Criterion |
|---|---|---|
| NFR-1 | Performance | Page load < 2s on broadband; API responses < 500ms at p95 |
| NFR-2 | Security | HTTPS enforced; JWT in httpOnly cookies; CSRF protection; input sanitisation on all fields |
| NFR-3 | Scalability | Architecture supports horizontal scaling; stateless API layer |
| NFR-4 | Usability | All core tasks completable without training; WCAG 2.1 Level AA compliant |
| NFR-5 | Browser Compatibility | Chrome 90+, Firefox 88+, Edge 90+, Safari 15+ |
| NFR-6 | Responsiveness | Fully functional on screens ≥ 320px wide |
| NFR-7 | Maintainability | Modular codebase; components independently testable; >80% unit test coverage |
| NFR-8 | Availability | 99.5% uptime SLA; downtime alerts within 5 minutes |
| NFR-9 | Data Integrity | Votes are persisted durably; no votes lost on server restart |
| NFR-10 | Auditability | All poll creations, deletions, and vote events logged with timestamps |

---

## 7. Out of Scope (v1.0)

- Cryptographic/end-to-end verifiable voting (E2E)
- Native mobile applications (iOS / Android)
- Multi-language / i18n support
- Geographic access control / geo-fencing
- SMS or email vote notifications
- Ranked-choice or preferential voting formats
- Third-party SSO (Google, Facebook login)
- Exportable results in PDF/CSV format (planned v1.1)

---

## 8. User Stories

### Voter
- As a voter, I want to register with my email so I can access the voting platform.
- As a voter, I want to see all live polls so I know what I can vote on today.
- As a voter, I want to cast my vote with a single click so the process is fast and clear.
- As a voter, I want confirmation after voting so I know my vote was recorded.
- As a voter, I want to view real-time results so I can see the current state of any poll.

### Administrator
- As an admin, I want to create a poll with multiple options so I can run elections for my organisation.
- As an admin, I want to see all polls in a single dashboard so I can monitor platform activity.
- As an admin, I want to delete a poll with a confirmation prompt so I don't accidentally remove live elections.
- As an admin, I want KPI metrics at a glance so I can report on platform usage.

---

## 9. Assumptions and Dependencies

- Users have access to a modern web browser with JavaScript enabled.
- The hosting environment provides HTTPS by default (Vercel/Netlify/Railway).
- A PostgreSQL database instance is provisioned and accessible from the API server.
- Email deliverability (for future password reset) depends on a transactional email provider (e.g., Resend, SendGrid).

---

## 10. Release Milestones

| Milestone | Target | Deliverables |
|---|---|---|
| M1 — Auth & Shell | Week 2 | Registration, Login, Session management, Routing scaffold |
| M2 — Polls & Voting | Week 4 | Poll creation, Poll listing, Vote casting, Integrity constraint |
| M3 — Results & Admin | Week 6 | Results visualisation, Admin dashboard, KPI cards |
| M4 — Hardening & Launch | Week 8 | Security review, E2E tests, CI/CD pipeline, Production deploy |
