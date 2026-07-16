import re
from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, EmailStr, Field, field_validator

# --- User Schemas ---
class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str
    role: str = "fan"  # fan, volunteer, organizer, security

    @field_validator("password")
    def validate_password_strength(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long.")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter.")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter.")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit.")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
            raise ValueError("Password must contain at least one special character.")
        return v

    @field_validator("role")
    def validate_role_type(cls, v):
        valid_roles = ["fan", "volunteer", "organizer", "security"]
        if v not in valid_roles:
            raise ValueError(f"Role must be one of {valid_roles}")
        return v

class UserLogin(UserBase):
    password: str
    mfa_code: Optional[str] = None

class UserConsent(BaseModel):
    consent: bool

class UserResponse(UserBase):
    id: int
    role: str
    mfa_enabled: bool
    preferences_consented: bool
    created_at: datetime

    class Config:
        from_attributes = True

# --- Auth Token Schemas ---
class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: str
    email: str
    mfa_required: bool = False

class TokenRefreshRequest(BaseModel):
    refresh_token: str

class MfaSetupResponse(BaseModel):
    secret: str
    otpauth_url: str
    qr_code_mock: str  # text representation or mock link

class MfaVerifyRequest(BaseModel):
    code: str

# --- Venue State / Telemetry Schemas ---
class VenueStateResponse(BaseModel):
    id: int
    timestamp: datetime
    gate_status: Dict[str, Any]
    zone_occupancy: Dict[str, Any]
    concessions: Dict[str, Any]
    weather_transit: Dict[str, Any]

    class Config:
        from_attributes = True

# --- Incident Schemas ---
class IncidentBase(BaseModel):
    title: str
    description: str
    location: str
    severity: str = "medium"  # low, medium, high, critical

    @field_validator("severity")
    def validate_severity(cls, v):
        if v not in ["low", "medium", "high", "critical"]:
            raise ValueError("Severity must be low, medium, high, or critical")
        return v

class IncidentCreate(IncidentBase):
    pass

class IncidentUpdate(BaseModel):
    status: Optional[str] = None  # reported, approved, dispatched, resolved
    assigned_volunteer_id: Optional[int] = None

class IncidentResponse(IncidentBase):
    id: int
    status: str
    reporter_role: str
    assigned_volunteer_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# --- Task Schemas ---
class TaskCreate(BaseModel):
    volunteer_id: int
    title: str
    description: str

class TaskUpdate(BaseModel):
    status: str  # pending, in_progress, completed

class TaskResponse(BaseModel):
    id: int
    volunteer_id: int
    title: str
    description: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

# --- Chat Schemas ---
class ChatMessage(BaseModel):
    role: str  # user, assistant
    content: str

class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []
    language: str = "en"  # en, es, fr, pt, ar

class ChatResponse(BaseModel):
    response: str
    why: Optional[str] = None
    confidence: Optional[str] = None
    confidence_factors: Optional[Dict[str, str]] = None
    suggested_actions: List[str] = []
    alert_triggered: Optional[str] = None
    is_ai: bool = True

class VolunteerCopilotRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []

class VolunteerCopilotResponse(BaseModel):
    response: str
    script: str
    escalation_path: str
    is_ai: bool = True

# --- Audit Log Schemas ---
class AuditLogResponse(BaseModel):
    id: int
    timestamp: datetime
    performed_by: str
    action: str
    details: str

    class Config:
        from_attributes = True
