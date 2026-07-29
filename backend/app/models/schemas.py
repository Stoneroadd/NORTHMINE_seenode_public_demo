from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


UserRole = Literal["admin", "supervisor", "operador", "viewer"]


def _normalize_optional_email(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip().lower()
    return normalized or None


def _validate_email(value: str | None) -> str | None:
    normalized = _normalize_optional_email(value)
    if normalized and ("@" not in normalized or "." not in normalized.rsplit("@", 1)[-1]):
        raise ValueError("Email invalido")
    return normalized


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=80)
    password: str = Field(min_length=1, max_length=120)
    mfa_code: str | None = None


class MFAVerifyRequest(BaseModel):
    code: str = Field(min_length=1, max_length=10)


class MFASetupResponse(BaseModel):
    secret: str
    qr_base64: str
    backup_codes: list[str]


class EnableMFARequest(BaseModel):
    code: str = Field(min_length=1, max_length=10)


class DisableMFARequest(BaseModel):
    username: str = Field(min_length=1, max_length=80)


class LoginResponse(BaseModel):
    user_id: str
    username: str
    nombre: str
    rol: Literal["admin", "supervisor", "operador", "viewer"]
    faena: str
    empresa: str
    access_token: str
    token_type: str = "bearer"
    expires_in: int | None = None
    modo: Literal["demo", "sql"] = "demo"
    sql_disponible: bool = False
    is_demo: bool = False


class UserPublic(BaseModel):
    id: str
    username: str
    full_name: str
    email: str | None = None
    role: UserRole
    is_active: bool
    is_demo: bool
    created_at: str
    updated_at: str
    last_login_at: str | None = None
    faena: str = "Rajo DES"
    empresa: str = "NORTHMINE"


class UserListResponse(BaseModel):
    count: int
    items: list[UserPublic]


class UserCreateRequest(BaseModel):
    username: str = Field(min_length=3, max_length=80, pattern=r"^[a-zA-Z0-9_.-]+$")
    full_name: str = Field(min_length=2, max_length=120)
    email: str | None = Field(default=None, max_length=120)
    password: str = Field(min_length=10, max_length=128)
    role: UserRole
    is_active: bool = True
    faena: str = Field(default="Rajo DES", min_length=1, max_length=120)
    empresa: str = Field(default="NORTHMINE", min_length=1, max_length=120)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str | None) -> str | None:
        return _validate_email(value)


class UserUpdateRequest(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=120)
    email: str | None = Field(default=None, max_length=120)
    faena: str | None = Field(default=None, min_length=1, max_length=120)
    empresa: str | None = Field(default=None, min_length=1, max_length=120)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str | None) -> str | None:
        return _validate_email(value)


class UserRoleUpdateRequest(BaseModel):
    role: UserRole


class UserPasswordResetRequest(BaseModel):
    new_password: str = Field(min_length=10, max_length=128)


class UserStatusUpdateRequest(BaseModel):
    is_active: bool


class SystemStatus(BaseModel):
    app: str
    mode: str
    sql_available: bool
    data_source: str
    generated_at: str


class SummaryResponse(BaseModel):
    source: str
    mode: str
    generated_at: str
    period: dict[str, Any]
    kpis: dict[str, Any]
    daily: list[dict[str, Any]]
    hourly_shift: list[dict[str, Any]]
    top_loaders: list[dict[str, Any]]
    top_trucks: list[dict[str, Any]]
    destinations: list[dict[str, Any]]
    phase_breakdown: list[dict[str, Any]]
    current_shift: dict[str, Any]


class ListResponse(BaseModel):
    source: str
    count: int
    items: list[dict[str, Any]]


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=10, max_length=128)


class SecurityMetricsResponse(BaseModel):
    blocked_ips: list[str] = []
    failed_logins_last_hour: int = 0
    active_sessions: int = 0
    audit_log_size_mb: float = 0.0
    most_active_user: str | None = None
    suspicious_activity: bool = False


class OperationalBaseModel(BaseModel):
    model_config = {"extra": "allow"}


class ProductionSummary(OperationalBaseModel):
    source: str
    kpis: dict[str, Any]
    generated_at: str | None = None


class DailyProductionItem(OperationalBaseModel):
    fecha: str
    plan: int
    real: int
    diferencia: int
    cumplimiento: float


class HourlyProductionItem(OperationalBaseModel):
    hora: int
    toneladas: int
    ciclos: int


class CurrentShiftSummary(OperationalBaseModel):
    source: str
    fecha: str
    turno: str
    toneladas_turno: int
    meta_turno: int
    cumplimiento_pct: float
    ciclos: int
    generated_at: str


class LoadingUnitPerformance(OperationalBaseModel):
    carguio_id: str
    modelo: str | None = None
    toneladas: int
    ciclos: int
    rendimiento_tph: float | None = None
    estado: str | None = None


class CaexRankingItem(OperationalBaseModel):
    caex_id: str
    modelo: str | None = None
    toneladas: int
    ciclos: int
    estado: str | None = None


class CaexModelSummary(OperationalBaseModel):
    modelo: str
    equipos: int


class CycleTimeItem(OperationalBaseModel):
    caex_id: str
    modelo: str | None = None
    avg_cycle_min: float


class RouteDistanceItem(OperationalBaseModel):
    origin: str
    destination: str
    toneladas: int
    ciclos: int
    distance_km: float
    avg_distance_km: float | None = None


class DistanceSummary(OperationalBaseModel):
    source: str
    total_distance_km: float
    avg_distance_per_cycle_km: float
    count: int
    items: list[dict[str, Any]]
    routes: list[RouteDistanceItem] = []
    generated_at: str


class AveriaSummary(OperationalBaseModel):
    source: str
    active_breakdowns: int
    inactive_equipment: int
    maintenance_equipment: int
    critical_alerts: int
    high_alerts: int = 0
    generated_at: str


class ActiveBreakdownItem(OperationalBaseModel):
    id: str
    equipment_id: str
    model: str | None = None
    status: str
    severity: str
    started_at: str | None = None
    last_activity: str | None = None
    duration_min: int
    description: str
    recommendation: str | None = None


class AerialFileItem(OperationalBaseModel):
    file_name: str
    extension: str
    size_mb: float
    updated_at: str
    status: str


class AerialStatus(OperationalBaseModel):
    source: str
    status: str
    faena: str
    latest_file: AerialFileItem | None = None
    files_count: int
    viewer_status: str
    heavy_tif_loaded: bool
    equipment_counts: dict[str, int]
    generated_at: str
