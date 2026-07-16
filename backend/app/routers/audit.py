from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core import auth
from app.core.database import get_db
from app.models.models import AuditLog
from app.models.schemas import AuditLogResponse

router = APIRouter(prefix="/audit", tags=["audit"])

@router.get("/", response_model=List[AuditLogResponse])
def get_audit_logs(
    current_user = Depends(auth.RoleChecker(allowed_roles=["organizer"])),
    db: Session = Depends(get_db)
):
    """Retrieve all system audit logs. Restricted to Organizer/Admin accounts."""
    return db.query(AuditLog).order_by(AuditLog.timestamp.desc()).all()
