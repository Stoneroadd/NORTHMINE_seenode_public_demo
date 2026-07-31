# Demo Access Persistence

## Current Adapter

Demo access requests use `SQLiteDemoAccessRepository` behind the
`DemoAccessRepository` protocol. The database is isolated from:

- NORTHMINE operational data
- audit storage
- authentication users
- SQL/WENCO connectors

Configuration:

- `NORTHMINE_DEMO_ACCESS_DB`: absolute or repository-relative SQLite path.
- `NORTHMINE_DEMO_ACCESS_FINGERPRINT_KEY`: at least 32 random characters used
  to create non-reversible daily duplicate fingerprints.

## Seenode Boundary

The current Seenode documentation does not state that a web service's local
filesystem is durable across rebuilds or replacement instances. The startup
script therefore defaults to `/tmp/northmine_demo_access.db` on Linux only as
a process-local demo fallback.

Do not describe this fallback as durable lead storage.

Before commercial use, configure one of:

1. A verified persistent mount and set `NORTHMINE_DEMO_ACCESS_DB` to that path.
2. A new repository adapter backed by a managed persistent database.

No external database credentials or provider-specific configuration are
included in this branch.

## Review And Access

Approval changes the request status only. It does not:

- create a NORTHMINE user
- generate an invitation
- send email
- copy the request into the authentication database

Account provisioning remains a separate administrator action until an
invitation workflow is reviewed and implemented.
