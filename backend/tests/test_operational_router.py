from app.main import app


def test_operational_router_keeps_public_api_paths_registered():
    paths = {route.path for route in app.routes}

    expected_paths = {
        "/api/cockpit",
        "/api/monthly-target",
        "/api/shift-comparison",
        "/api/profit-optimization",
        "/api/hidden-losses",
        "/api/operational-nlp",
        "/api/dispatcher-advisor",
        "/api/decision-audit",
    }

    assert expected_paths <= paths
