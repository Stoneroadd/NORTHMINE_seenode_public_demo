# Resource Authorization Model

Every resource decision follows:

```text
authenticated identity
  -> authoritative tenant
  -> authorized site
  -> explicit permission
  -> resource ownership/scope
```

Direct IDs are locators, not authorization. Repository methods should evolve from `get(id)` to scoped forms such as `get(id, tenant_id, site_id)` so enforcement occurs in the query as well as the route. Until then, `require_resource_scope` is mandatory immediately after load and before disclosure/mutation.

Rules:

- Scope equality is normalized but exact; missing scope is not wildcard.
- Owner-only resources additionally match the authenticated identity.
- Admin is scoped unless an explicit platform permission exists.
- Denials use 404 for direct resources and are audit-loggable without sensitive payloads.
- Export, version history, WebSocket subscription and AI tool calls are resources too.
- Authorization is re-evaluated on each request/session creation; browser state is not trusted.

P0 review found BOLA patterns in investigation execute/GET/UI-step mutation, legacy copilot tasks, report/handover/task direct operations and admin user operations. Route guards now cover these paths; owner filters protect legacy lists. Repository-level scoped-query refactoring and a complete authorization matrix remain required before production multi-tenancy.
