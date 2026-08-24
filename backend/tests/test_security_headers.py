"""SecurityHeadersMiddleware (app/core/security_headers.py).

Regresion puntual: la Etapa 7 agrego captura real de microfono
(getUserMedia) para el Agent Runtime, pero el Permissions-Policy seguia
con `microphone=()` (vacio) desde antes de esa etapa - eso bloquea
getUserMedia para CUALQUIER usuario en CUALQUIER dispositivo, sin ni
siquiera mostrar el dialogo nativo de permiso del navegador. Reportado
por el usuario probando en 4 dispositivos distintos, todos con el mismo
fallo silencioso - la firma tipica de una politica del lado del servidor,
no de una configuracion por-dispositivo.
"""

def test_permissions_policy_allows_microphone_for_this_origin(client):
    response = client.get("/api/health")
    policy = response.headers["permissions-policy"]
    assert "microphone=(self)" in policy


def test_permissions_policy_keeps_unused_capabilities_locked_down(client):
    response = client.get("/api/health")
    policy = response.headers["permissions-policy"]
    for capability in ("geolocation", "camera", "payment", "usb", "bluetooth"):
        assert f"{capability}=()" in policy, f"{capability} deberia seguir deshabilitado - NORTHMINE no lo usa"


def test_public_analytics_csp_is_limited_to_exact_public_origins(client):
    policy = client.get("/").headers["content-security-policy"]
    directives = {
        parts[0]: parts[1:]
        for directive in policy.split(";")
        if (parts := directive.strip().split())
    }

    assert "https://gc.zgo.at" in directives["script-src"]
    assert "https://northmine.goatcounter.com" not in directives["script-src"]
    assert "https://northmine.goatcounter.com" in directives["connect-src"]
    assert "https://northmine.goatcounter.com" in directives["img-src"]
    assert "https://gc.zgo.at" not in directives["connect-src"]
    assert "*.goatcounter.com" not in policy


def test_operational_and_api_routes_do_not_authorize_public_analytics(client):
    for path in ("/operational-flow", "/api/health"):
        policy = client.get(path).headers["content-security-policy"]
        assert "gc.zgo.at" not in policy
        assert "goatcounter.com" not in policy
