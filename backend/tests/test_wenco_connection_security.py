from __future__ import annotations

from app.services.wenco_data import _connection_string


def test_wenco_connection_encrypts_and_validates_certificate():
    connection = _connection_string(
        {
            "driver": "ODBC Driver 18 for SQL Server",
            "server": "wenco.internal",
            "database": "WENCO",
            "user": "reader",
            "password": "secret",
            "trust_server_certificate": "no",
        }
    )
    assert "Encrypt=yes;" in connection
    assert "TrustServerCertificate=no;" in connection
