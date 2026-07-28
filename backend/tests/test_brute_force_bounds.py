from __future__ import annotations

from app.core import brute_force


def test_success_removes_local_brute_force_state():
    ip = "198.51.100.10"
    brute_force.record_failure(ip)
    brute_force.record_success(ip)

    assert ip not in brute_force._failed_attempts
    assert ip not in brute_force._blocked_until
    assert ip not in brute_force._last_seen


def test_tracking_ip_count_is_bounded():
    brute_force._failed_attempts.clear()
    brute_force._blocked_until.clear()
    brute_force._last_seen.clear()

    for index in range(brute_force.MAX_TRACKED_IPS + 1):
        brute_force.record_failure(f"198.18.{index // 256}.{index % 256}")

    assert len(brute_force._last_seen) == brute_force.MAX_TRACKED_IPS
    assert len(brute_force._failed_attempts) <= brute_force.MAX_TRACKED_IPS
