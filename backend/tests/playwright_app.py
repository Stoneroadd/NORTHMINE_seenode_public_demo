"""Test-only ASGI entrypoint for browser suites.

Playwright creates a fresh browser context for every test. A complete responsive
matrix therefore performs many valid demo logins from the same loopback address
and would exercise the production brute-force rate rather than the UI under
test. This entrypoint disables SlowAPI only in the explicitly isolated browser
test process; the production ``app.main:app`` entrypoint is unchanged.
"""

from __future__ import annotations

import os

if os.getenv("NORTHMINE_PLAYWRIGHT", "").lower() != "true":
    raise RuntimeError("The Playwright ASGI entrypoint requires NORTHMINE_PLAYWRIGHT=true")

if os.getenv("ENVIRONMENT", "").lower() not in {"demo", "testing"}:
    raise RuntimeError("The Playwright ASGI entrypoint is restricted to demo/testing")

from app.core.rate_limit import limiter
from app.main import app

limiter.enabled = False
