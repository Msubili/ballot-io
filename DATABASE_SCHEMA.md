# Database Schema
## Ballot.io — General Purpose Online Voting System

**Version:** 1.0  
**Database:** PostgreSQL 15  
**Date:** July 2026

---

## 1. Schema Overview

```
users ──────────────────────────────┐
  │                                 │
  │ (creator_id)                    │ (user_id)
  ▼                                 ▼
polls ────────────────────────── votes
  │                                 │
  │ (poll_id)                       │ (option_id)
  ▼                                 │
poll_options ◄───────────────────── ┘

audit_log (standalone event log)
```

---

## 2. Full DDL (Migration Script)

```sql
-- ============================================================
-- BALLOT.IO DATABASE SCHEMA — v1.0
-- PostgreSQL 15
-- Run via: node-pg-migrate or psql -f schema.sql
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLE: users
-- ============================================================
CREATE TABLE users (
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(120)  NOT NULL,
    email         VARCHAR(254)  NOT NULL UNIQUE,
    password_hash VARCHAR(72)   NOT NULL,          -- bcrypt output max 72 bytes
    role          VARCHAR(20)   NOT NULL DEFAULT 'voter'
                                CHECK (role IN ('voter', 'admin')),
    is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role  ON users(role);

-- ============================================================
-- TABLE: polls
-- ============================================================
CREATE TABLE polls (
    id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id   UUID          NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    title        VARCHAR(120)  NOT NULL,
    description  VARCHAR(500),
    category     VARCHAR(20)   NOT NULL
                               CHECK (category IN ('General','Election','Community','Corporate')),
    status       VARCHAR(20)   NOT NULL DEFAULT 'Upcoming'
                               CHECK (status IN ('Upcoming','Live','Closed')),
    start_date   TIMESTAMPTZ   NOT NULL,
    end_date     TIMESTAMPTZ   NOT NULL,
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_dates CHECK (end_date > start_date)
);

CREATE INDEX idx_polls_status     ON polls(status);
CREATE INDEX idx_polls_category   ON polls(category);
CREATE INDEX idx_polls_creator    ON polls(creator_id);
CREATE INDEX idx_polls_start_date ON polls(start_date);
CREATE INDEX idx_polls_end_date   ON polls(end_date);

-- ============================================================
-- TABLE: poll_options
-- ============================================================
CREATE TABLE poll_options (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id     UUID         NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    option_text VARCHAR(100) NOT NULL,
    position    SMALLINT     NOT NULL,   -- display order, 1-indexed
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_position CHECK (position BETWEEN 1 AND 8),
    UNIQUE (poll_id, position),
    UNIQUE (poll_id, option_text)        -- no duplicate options within a poll
);

CREATE INDEX idx_poll_options_poll_id ON poll_options(poll_id);

-- ============================================================
-- TABLE: votes
-- ============================================================
CREATE TABLE votes (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id     UUID        NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    option_id   UUID        NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cast_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (poll_id, user_id)            -- ONE VOTE PER USER PER POLL (enforced at DB level)
);

CREATE INDEX idx_votes_poll_id   ON votes(poll_id);
CREATE INDEX idx_votes_option_id ON votes(option_id);
CREATE INDEX idx_votes_user_id   ON votes(user_id);
CREATE INDEX idx_votes_cast_at   ON votes(cast_at);

-- ============================================================
-- TABLE: audit_log
-- ============================================================
CREATE TABLE audit_log (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id     UUID         REFERENCES users(id) ON DELETE SET NULL,
    action       VARCHAR(50)  NOT NULL,  -- e.g. 'DELETE_POLL', 'CREATE_POLL', 'CHANGE_ROLE'
    entity_type  VARCHAR(50)  NOT NULL,  -- e.g. 'poll', 'user'
    entity_id    UUID,                   -- NULL if entity was deleted
    entity_label VARCHAR(200),           -- snapshot of name/title at time of action
    metadata     JSONB,                  -- any extra context (old values, IP, etc.)
    occurred_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_log_actor      ON audit_log(actor_id);
CREATE INDEX idx_audit_log_action     ON audit_log(action);
CREATE INDEX idx_audit_log_entity     ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_occurred   ON audit_log(occurred_at DESC);

-- ============================================================
-- FUNCTION: auto-update updated_at columns
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_polls_updated_at
    BEFORE UPDATE ON polls
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- FUNCTION: auto-transition poll status by date
-- Called by the Node.js cron job via SQL, or can be scheduled
-- as a pg_cron job directly in the database.
-- ============================================================
CREATE OR REPLACE FUNCTION transition_poll_statuses()
RETURNS INTEGER AS $$
DECLARE
    affected INTEGER;
BEGIN
    -- Upcoming → Live
    UPDATE polls
    SET status = 'Live'
    WHERE status = 'Upcoming'
      AND start_date <= NOW();

    -- Live → Closed
    UPDATE polls
    SET status = 'Closed'
    WHERE status = 'Live'
      AND end_date < NOW();

    GET DIAGNOSTICS affected = ROW_COUNT;
    RETURN affected;
END;
$$ LANGUAGE plpgsql;
```

---

## 3. Table Descriptions

### 3.1 `users`
| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK, default gen_random_uuid() | Unique user identifier |
| name | VARCHAR(120) | NOT NULL | Display name |
| email | VARCHAR(254) | NOT NULL, UNIQUE | Login identifier, RFC 5321 max length |
| password_hash | VARCHAR(72) | NOT NULL | bcrypt hash (never plaintext) |
| role | VARCHAR(20) | CHECK IN ('voter','admin') | Access control role |
| is_active | BOOLEAN | NOT NULL, DEFAULT TRUE | Soft disable without deletion |
| created_at | TIMESTAMPTZ | NOT NULL | Account creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL | Last modification timestamp |

### 3.2 `polls`
| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | Unique poll identifier |
| creator_id | UUID | FK → users.id | Who created the poll |
| title | VARCHAR(120) | NOT NULL | Poll question / title |
| description | VARCHAR(500) | | Optional context text |
| category | VARCHAR(20) | CHECK | General / Election / Community / Corporate |
| status | VARCHAR(20) | CHECK | Upcoming / Live / Closed |
| start_date | TIMESTAMPTZ | NOT NULL | When voting opens |
| end_date | TIMESTAMPTZ | NOT NULL | When voting closes |
| created_at | TIMESTAMPTZ | NOT NULL | Row creation time |
| updated_at | TIMESTAMPTZ | NOT NULL | Last modification time |

### 3.3 `poll_options`
| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | Unique option identifier |
| poll_id | UUID | FK → polls.id CASCADE | Parent poll |
| option_text | VARCHAR(100) | NOT NULL | The selectable answer |
| position | SMALLINT | CHECK 1–8, UNIQUE per poll | Display order |
| created_at | TIMESTAMPTZ | NOT NULL | Row creation time |

### 3.4 `votes`
| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | Unique vote record identifier |
| poll_id | UUID | FK → polls.id CASCADE | Which poll was voted in |
| option_id | UUID | FK → poll_options.id CASCADE | Which option was selected |
| user_id | UUID | FK → users.id CASCADE | Who voted (UNIQUE with poll_id) |
| cast_at | TIMESTAMPTZ | NOT NULL | When the vote was cast |

**Critical constraint:** `UNIQUE (poll_id, user_id)` — this is the database-level enforcement of one-vote-per-user. The API validates this too, but the DB constraint is the final guarantee.

### 3.5 `audit_log`
| Column | Type | Description |
|---|---|---|
| id | UUID | Unique log entry |
| actor_id | UUID | Admin user who performed the action |
| action | VARCHAR(50) | Action code (DELETE_POLL, CREATE_POLL, CHANGE_ROLE) |
| entity_type | VARCHAR(50) | Type of entity affected |
| entity_id | UUID | ID of affected entity (may be NULL after deletion) |
| entity_label | VARCHAR(200) | Snapshot of entity name at time of action |
| metadata | JSONB | Additional context (IP address, before/after values) |
| occurred_at | TIMESTAMPTZ | When the action took place |

---

## 4. Key Queries

### 4.1 Results Aggregation (used by Results API)
```sql
SELECT
    po.id          AS option_id,
    po.option_text,
    po.position,
    COUNT(v.id)    AS vote_count,
    ROUND(
        COUNT(v.id)::NUMERIC / NULLIF(SUM(COUNT(v.id)) OVER (), 0) * 100,
        2
    )              AS percentage
FROM poll_options po
LEFT JOIN votes v ON v.option_id = po.id AND v.poll_id = $1
WHERE po.poll_id = $1
GROUP BY po.id, po.option_text, po.position
ORDER BY po.position;
```

### 4.2 Check If User Has Already Voted
```sql
SELECT EXISTS (
    SELECT 1 FROM votes
    WHERE poll_id = $1 AND user_id = $2
) AS has_voted;
```

### 4.3 Admin Stats
```sql
SELECT
    COUNT(*)                                          AS total_polls,
    COUNT(*) FILTER (WHERE status = 'Live')           AS live_polls,
    COUNT(*) FILTER (WHERE status = 'Closed')         AS completed_elections,
    (SELECT COUNT(*) FROM votes)                      AS total_votes;
```

### 4.4 Status Transition (called by cron job)
```sql
SELECT transition_poll_statuses();
```

---

## 5. Seed Data (Development)

```sql
-- Seed admin user (password: Admin1234!)
INSERT INTO users (name, email, password_hash, role) VALUES
  ('Platform Admin', 'admin@ballot.io',
   '$2b$12$examplehashplaceholderXXXXXXXXXXXXXXXXXXXXXXXXXX', 'admin');

-- Seed sample polls (use script to generate UUIDs)
-- See /scripts/seed.js for full seed script
```

---

## 6. Migration Strategy

All schema changes are managed through numbered migration files in `/src/db/migrations/`:

```
001_create_users.sql
002_create_polls.sql
003_create_poll_options.sql
004_create_votes.sql
005_create_audit_log.sql
006_add_indexes.sql
007_add_triggers.sql
008_add_transition_function.sql
```

Run migrations: `npm run db:migrate`  
Roll back: `npm run db:rollback`  
Check status: `npm run db:status`
