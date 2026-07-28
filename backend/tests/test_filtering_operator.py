from __future__ import annotations

from app.services.filtering import _operator_for_record, build_filter_catalog


def test_operator_for_record_prefers_real_caex_operator():
    assert _operator_for_record({"operador_caex": "MARIA LOPEZ"}) == "MARIA LOPEZ"


def test_operator_for_record_falls_back_to_loader_operator():
    assert _operator_for_record({"operador_pala": "PEDRO SOTO"}) == "PEDRO SOTO"


def test_operator_for_record_returns_none_without_real_data():
    # HU-11.4: sin dato real, no se inventa un nombre (antes fabricaba uno
    # via hash del caex_id).
    assert _operator_for_record({"caex_id": "CA0001"}) is None


def test_filter_catalog_uses_real_wenco_operator_options():
    catalog = build_filter_catalog(
        {
            "source": "wenco-sql-live",
            "cycles": [
                {
                    "caex_id": "CA0413",
                    "carguio_id": "EX3600",
                    "camion_modelo": "KOM980E-5",
                    "pala_modelo": "KOMPC5500",
                    "operador_caex": "CLAUDIO ANDRES ROJAS MOYANO",
                    "operador_caex_badge": "B001",
                }
            ],
        }
    )

    assert catalog["operators"] == [{"value": "B001", "label": "CLAUDIO ANDRES ROJAS MOYANO (B001)"}]
