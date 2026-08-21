# ADR-003 — Direct-resource authorization

Status: Accepted for P0. IDs locate resources but never authorize them. Composite scope and applicable owner/permission checks occur before disclosure or mutation; cross-scope direct access returns 404. See `../RESOURCE_AUTHORIZATION_MODEL.md`.
