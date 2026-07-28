from __future__ import annotations

import pytest

from app.services import averias_import_service


def test_rejects_workbook_over_size_limit():
    oversized = b"x" * (averias_import_service.MAX_WORKBOOK_BYTES + 1)
    with pytest.raises(ValueError, match="limite"):
        averias_import_service.validate_workbook_payload(oversized, "reporte.xlsx")


def test_rejects_non_workbook_upload():
    with pytest.raises(ValueError, match="Formato"):
        averias_import_service.validate_workbook_payload(b"not a workbook", "reporte.exe")
