# ADR-004 — Wenco safety boundary

Status: Accepted contract; environment verification pending. A dedicated DB principal with SELECT-only grants on allowlisted views is the primary control. NORTHMINE never silently mutates Wenco. See `../WENCO_READ_ONLY_SECURITY_CONTRACT.md`.
