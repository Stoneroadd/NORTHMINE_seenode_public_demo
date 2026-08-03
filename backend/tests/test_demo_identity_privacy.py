from dataclasses import replace

from app.core.config import get_settings
from app.services.user_repository import SQLiteUserRepository


def test_existing_demo_identity_is_migrated_without_touching_real_users(tmp_path):
    repository = SQLiteUserRepository(tmp_path / "users.db")
    repository.init_schema()
    demo_user = repository.create_user(
        "demo",
        "demo",
        full_name="Demo Ejecutivo",
        role="admin",
        is_demo=True,
        faena="Rajo DES",
        empresa="NORTHMINE",
    )
    real_user = repository.create_user(
        "real-operator",
        "RealPass-2026!",
        full_name="Operador Real",
        role="operador",
        is_demo=False,
        faena="Faena Privada",
        empresa="Cliente Privado",
    )
    demo_settings = replace(
        get_settings(),
        environment="demo",
        mode="demo",
        demo_mode=True,
        data_mode="DEMO",
        allow_demo_login=True,
    )

    repository.ensure_demo_admin_if_demo(demo_settings)

    updated_demo = repository.get_by_id(demo_user.id)
    untouched_real = repository.get_by_id(real_user.id)
    assert updated_demo is not None
    assert updated_demo.full_name == "Mina Chile Demo"
    assert updated_demo.faena == "FAENA SINTETICA"
    assert updated_demo.empresa == "NORTHMINE DEMO"
    assert untouched_real is not None
    assert untouched_real.full_name == "Operador Real"
    assert untouched_real.faena == "Faena Privada"
    assert untouched_real.empresa == "Cliente Privado"
