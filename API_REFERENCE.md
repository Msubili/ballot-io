# API Reference
## Ballot.io REST API v1

**Base URL (Production):** `https://api.ballot.io`  
**Base URL (Development):** `http://localhost:3001`  
**Content-Type:** `application/json`  
**Authentication:** JWT via `Cookie: token=<jwt>` (set on login; httpOnly)

---

## Authentication

All protected endpoints require a valid session cookie set after login. Pass `credentials: 'include'` in frontend `fetch` calls.

---

## 1. Auth Endpoints

### POST `/api/auth/register`

Register a new voter account.

**Request body:**
```json
{
  "name": "Joel Mwangi",
  "email": "joel@example.com",
  "password": "MyPassword123!"
}
```

**Responses:**

`201 Created` — Registration successful.
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Joel Mwangi",
    "email": "joel@example.com",
    "role": "voter",
    "created_at": "2026-07-25T10:00:00Z"
  }
}
```
Sets `Set-Cookie: token=<jwt>; HttpOnly; Secure; SameSite=Strict; Max-Age=86400`

`409 Conflict` — Email already in use.
```json
{ "error": { "code": "EMAIL_TAKEN", "message": "An account with this email already exists.", "status": 409 } }
```

`422 Unprocessable Entity` — Validation failure.
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Password must be at least 8 characters.", "status": 422, "fields": { "password": "Too short" } } }
```

---

### POST `/api/auth/login`

Authenticate an existing user.

**Request body:**
```json
{ "email": "joel@example.com", "password": "MyPassword123!" }
```

**Responses:**

`200 OK` — Login successful.
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Joel Mwangi",
    "email": "joel@example.com",
    "role": "voter"
  }
}
```
Sets session cookie.

`401 Unauthorised` — Invalid credentials.
```json
{ "error": { "code": "INVALID_CREDENTIALS", "message": "Invalid email or password.", "status": 401 } }
```

---

### POST `/api/auth/logout`

Terminate the current session.

**Auth required:** Yes  
**Response:** `204 No Content` — Clears session cookie.

---

### GET `/api/auth/me`

Get the currently authenticated user.

**Auth required:** Yes

`200 OK`:
```json
{ "user": { "id": "...", "name": "Joel Mwangi", "email": "...", "role": "voter" } }
```

`401 Unauthorised` — No valid session.

---

## 2. Poll Endpoints

### GET `/api/polls`

List all polls (paginated).

**Auth required:** Yes  
**Query params:**
- `status` — filter by `Upcoming` | `Live` | `Closed`
- `category` — filter by `General` | `Election` | `Community` | `Corporate`
- `page` — page number (default: 1)
- `limit` — results per page (default: 20, max: 100)

`200 OK`:
```json
{
  "polls": [
    {
      "id": "abc123...",
      "title": "Student Council President 2025",
      "description": "Vote for your preferred candidate...",
      "category": "Election",
      "status": "Live",
      "start_date": "2026-07-20T08:00:00Z",
      "end_date": "2026-07-30T23:59:59Z",
      "total_votes": 1248,
      "creator": { "id": "...", "name": "Admin User" },
      "created_at": "2026-07-18T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 24,
    "pages": 2
  }
}
```

---

### GET `/api/polls/:id`

Get a single poll with options and vote counts.

**Auth required:** Yes

`200 OK`:
```json
{
  "poll": {
    "id": "abc123...",
    "title": "Student Council President 2025",
    "description": "Vote for your preferred candidate...",
    "category": "Election",
    "status": "Live",
    "start_date": "2026-07-20T08:00:00Z",
    "end_date": "2026-07-30T23:59:59Z",
    "total_votes": 1248,
    "user_has_voted": false,
    "options": [
      { "id": "opt1...", "option_text": "Alice Mwangi", "position": 1, "vote_count": 725, "percentage": 58.09 },
      { "id": "opt2...", "option_text": "Brian Ochieng", "position": 2, "vote_count": 399, "percentage": 31.97 },
      { "id": "opt3...", "option_text": "Carol Njeri", "position": 3, "vote_count": 124, "percentage": 9.94 }
    ]
  }
}
```

`404 Not Found`:
```json
{ "error": { "code": "POLL_NOT_FOUND", "message": "The requested poll does not exist.", "status": 404 } }
```

---

### POST `/api/polls`

Create a new poll.

**Auth required:** Yes (Admin role)

**Request body:**
```json
{
  "title": "Best Open Source Tool 2026",
  "description": "Vote for the most impactful open source project this year.",
  "category": "General",
  "status": "Upcoming",
  "start_date": "2026-08-01T00:00:00Z",
  "end_date": "2026-08-07T23:59:59Z",
  "options": ["VS Code", "Linux", "PostgreSQL", "React"]
}
```

`201 Created` — Returns the created poll object (same shape as GET `/api/polls/:id`).

`403 Forbidden` — Non-admin user.  
`422 Unprocessable Entity` — Validation error (e.g. < 2 options, end_date before start_date).

---

### PATCH `/api/polls/:id`

Update a poll's metadata or status.

**Auth required:** Yes (Admin role)  
**Request body:** Any subset of: `title`, `description`, `category`, `status`, `start_date`, `end_date`

`200 OK` — Returns updated poll.

---

### DELETE `/api/polls/:id`

Permanently delete a poll and all its votes.

**Auth required:** Yes (Admin role)

`204 No Content` — Poll deleted; audit log entry created.

`403 Forbidden` — Non-admin user.  
`404 Not Found` — Poll does not exist.

---

## 3. Vote Endpoints

### POST `/api/polls/:id/vote`

Cast a vote on a live poll.

**Auth required:** Yes

**Request body:**
```json
{ "option_id": "opt1-uuid-here..." }
```

`201 Created`:
```json
{
  "vote": {
    "id": "vote-uuid...",
    "poll_id": "abc123...",
    "option_id": "opt1...",
    "cast_at": "2026-07-25T14:32:00Z"
  },
  "results": { /* same as GET /api/polls/:id/results */ }
}
```

`403 Forbidden` — Poll is not Live (Upcoming or Closed).
```json
{ "error": { "code": "POLL_NOT_LIVE", "message": "Voting is not open for this poll.", "status": 403 } }
```

`404 Not Found` — Poll or option does not exist.

`409 Conflict` — User has already voted.
```json
{ "error": { "code": "ALREADY_VOTED", "message": "You have already voted in this poll.", "status": 409 } }
```

---

## 4. Results Endpoints

### GET `/api/polls/:id/results`

Get aggregated results for a poll.

**Auth required:** Yes

`200 OK`:
```json
{
  "poll_id": "abc123...",
  "poll_title": "Student Council President 2025",
  "status": "Closed",
  "total_votes": 1248,
  "winner": {
    "option_id": "opt1...",
    "option_text": "Alice Mwangi",
    "vote_count": 725,
    "percentage": 58.09
  },
  "options": [
    { "option_id": "opt1...", "option_text": "Alice Mwangi", "position": 1, "vote_count": 725, "percentage": 58.09, "is_winner": true },
    { "option_id": "opt2...", "option_text": "Brian Ochieng", "position": 2, "vote_count": 399, "percentage": 31.97, "is_winner": false },
    { "option_id": "opt3...", "option_text": "Carol Njeri",   "position": 3, "vote_count": 124, "percentage": 9.94,  "is_winner": false }
  ]
}
```

Note: `winner` is `null` for polls that are not Closed. For tied results, `winner` is an array.

---

## 5. Admin Endpoints

All admin endpoints require Admin role. Non-admin requests receive `403 Forbidden`.

### GET `/api/admin/stats`

Get platform-wide KPI statistics.

`200 OK`:
```json
{
  "total_polls": 24,
  "live_polls": 3,
  "total_votes": 8123,
  "completed_elections": 12
}
```

---

### GET `/api/admin/polls`

List all polls with full management metadata (no pagination limit).

`200 OK`:
```json
{
  "polls": [
    {
      "id": "...",
      "title": "Student Council President 2025",
      "category": "Election",
      "status": "Live",
      "total_votes": 1248,
      "creator": { "id": "...", "name": "Admin User" },
      "start_date": "2026-07-20T08:00:00Z",
      "end_date": "2026-07-30T23:59:59Z",
      "created_at": "2026-07-18T12:00:00Z"
    }
  ]
}
```

---

## 6. Error Response Format

All errors follow this structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description.",
    "status": 400,
    "fields": { "fieldName": "Specific field error message" }
  }
}
```

`fields` is only present for `422 Unprocessable Entity` validation errors.

### Error Codes

| Code | HTTP Status | Description |
|---|---|---|
| `VALIDATION_ERROR` | 422 | Request body failed schema validation |
| `INVALID_CREDENTIALS` | 401 | Login email/password mismatch |
| `UNAUTHORIZED` | 401 | No valid session cookie |
| `FORBIDDEN` | 403 | Authenticated but insufficient role |
| `EMAIL_TAKEN` | 409 | Registration email already in use |
| `POLL_NOT_FOUND` | 404 | Poll ID does not exist |
| `OPTION_NOT_FOUND` | 404 | Option ID not valid for this poll |
| `POLL_NOT_LIVE` | 403 | Vote attempted on non-Live poll |
| `ALREADY_VOTED` | 409 | User already has a vote for this poll |
| `RATE_LIMITED` | 429 | Too many requests from this IP |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## 7. Rate Limits

| Endpoint Group | Limit |
|---|---|
| `POST /api/auth/login` | 20 requests / minute per IP |
| `POST /api/auth/register` | 10 requests / minute per IP |
| All other endpoints | 200 requests / minute per IP |

Rate limit headers are included in all responses:
```
X-RateLimit-Limit: 200
X-RateLimit-Remaining: 198
X-RateLimit-Reset: 1722000060
```

`429 Too Many Requests` response when exceeded.
