# ADR-002 — Tenant/site scoping

Status: Accepted for P0. Request scope is reconstructed from the server user repository; tenant/site IDs supplied by clients are filters only after authorization. Missing scope is not wildcard and admin is scoped by default. See `../TENANT_SITE_SECURITY_MODEL.md`.
