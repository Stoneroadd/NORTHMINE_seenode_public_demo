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
