# Demo Access Persistence

## Repository Selection

Demo access requests use the `DemoAccessRepository` protocol with two
implementations:

- `SQLiteDemoAccessRepository` for local development and tests.
- `PostgreSQLDemoAccessRepository` for durable hosted environments.

The database remains isolated from:

- NORTHMINE operational data
- audit storage
- authentication users
- SQL/WENCO connectors

Configuration:

- `NORTHMINE_DEMO_ACCESS_DATABASE_URL`: preferred PostgreSQL connection URL.
- `DATABASE_URL`: PostgreSQL fallback used when the namespaced variable is
  absent.
- `NORTHMINE_DEMO_ACCESS_DB`: absolute or repository-relative SQLite path,
  local development only.
- `NORTHMINE_DEMO_ACCESS_REQUIRE_DURABLE`: fail closed when PostgreSQL is not
  configured. Defaults to `true` in production. The hosted public-demo
  launcher also enables it by default on Linux.
- `NORTHMINE_DEMO_ACCESS_FINGERPRINT_KEY`: at least 32 random characters used
  to create non-reversible daily duplicate fingerprints. Durable mode remains
  unavailable when this key is absent, ephemeral, or too short.
- `NORTHMINE_DEMO_ACCESS_POOL_MIN_SIZE`: PostgreSQL pool minimum, default `1`.
- `NORTHMINE_DEMO_ACCESS_POOL_MAX_SIZE`: PostgreSQL pool maximum, default `4`.
- `NORTHMINE_DEMO_ACCESS_POOL_TIMEOUT_SECONDS`: acquisition timeout, default
  `5`.
- `NORTHMINE_DEMO_ACCESS_CONNECT_TIMEOUT_SECONDS`: connection timeout,
  default `5`.

Connection URLs are consumed only by the backend and must never be placed in
frontend variables, logs, screenshots, or committed files.

## Seenode Boundary

The current Seenode documentation does not establish that a web service's
local filesystem is durable across rebuilds or replacement instances.

The Linux public-demo launcher therefore requires PostgreSQL for demo-access
requests. If neither namespaced nor standard `DATABASE_URL` is present:

- the landing and protected application continue to start;
- `POST /api/demo-access/requests` returns HTTP `503`;
- the UI states that the request was not stored;
- `/health` reports degraded demo-access persistence.

SQLite remains available when durable storage is not required, which is the
default for local development and tests. Never describe SQLite in the web
service filesystem as durable lead storage.

No external database, provider account, connection string, or credential is
included in this branch.

## Schema And Migration

PostgreSQL initialization explicitly creates:

- `northmine_demo_access_schema`, with schema version `1`;
- `demo_access_requests`;
- an index on `(status, created_at DESC)`;
- an index on normalized email;
- a unique constraint on the HMAC request fingerprint.

Initialization accepts schema version `1` only and fails closed on an unknown
version. Future changes must add explicit versioned migrations instead of
silently rewriting existing data.

## Privacy Production Blockers

Before commercial deployment, the owner must define:

- the legal identity of the data controller;
- a permanent privacy contact channel;
- a retention period;
- a deletion or anonymization procedure.

## Review And Access

Approval changes the request status only. It does not:

- create a NORTHMINE user
- generate an invitation
- send email
- copy the request into the authentication database

Account provisioning remains a separate administrator action until an
invitation workflow is reviewed and implemented.
