from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core import auth
from app.core.database import get_db
from app.models.models import Incident, User, AuditLog
from app.models.schemas import IncidentCreate, IncidentResponse, IncidentUpdate
from app.services.simulator import simulator

router = APIRouter(prefix="/incidents", tags=["incidents"])

@router.post("/", response_model=IncidentResponse, status_code=status.HTTP_201_CREATED)
def create_incident(
    incident_in: IncidentCreate,
    current_user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submit an incident report.
    Available to all authenticated roles. Fans and systems require review.
    """
    # Safe defaults: systems/fans cannot bypass safety-review
    initial_status = "reported"
    if current_user.role in ["security", "organizer"]:
        initial_status = "approved"  # Auto-approve trusted staff reports
        
    new_incident = Incident(
        title=incident_in.title,
        description=incident_in.description,
        location=incident_in.location,
        severity=incident_in.severity,
        status=initial_status,
        reporter_role=current_user.role
    )
    db.add(new_incident)
    db.commit()
    db.refresh(new_incident)
    
    # Audit log entry
    audit = AuditLog(
        performed_by=current_user.email,
        action="incident_reported",
        details=f"Incident ID {new_incident.id} ({new_incident.title}) reported at {new_incident.location}. Status: {initial_status}"
    )
    db.add(audit)
    db.commit()
    
    return new_incident

@router.get("/", response_model=List[IncidentResponse])
def list_incidents(
    current_user: User = Depends(auth.RoleChecker(allowed_roles=["volunteer", "security", "organizer"])),
    db: Session = Depends(get_db)
):
    """List all incidents. Restricted to staff roles."""
    return db.query(Incident).order_by(Incident.created_at.desc()).all()

@router.put("/{incident_id}", response_model=IncidentResponse)
async def update_incident(
    incident_id: int,
    incident_update: IncidentUpdate,
    current_user: User = Depends(auth.RoleChecker(allowed_roles=["security", "organizer"])),
    db: Session = Depends(get_db)
):
    """
    Update incident status or assign volunteer.
    Restricted to Security and Organizer roles.
    Implements Human-in-the-Loop approval for public-facing alerts.
    """
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident not found"
        )
        
    old_status = incident.status
    
    if incident_update.status:
        incident.status = incident_update.status
        
    if incident_update.assigned_volunteer_id is not None:
        # Check if volunteer exists
        volunteer = db.query(User).filter(User.id == incident_update.assigned_volunteer_id).first()
        if not volunteer or volunteer.role != "volunteer":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Assigned ID is not a valid volunteer."
            )
        incident.assigned_volunteer_id = incident_update.assigned_volunteer_id
        incident.status = "dispatched"
        
    db.add(incident)
    db.commit()
    db.refresh(incident)
    
    # Trigger audit logging and real-time broadcasts
    if old_status != incident.status:
        audit = AuditLog(
            performed_by=current_user.email,
            action="incident_status_updated",
            details=f"Incident ID {incident.id} status changed from '{old_status}' to '{incident.status}'"
        )
        db.add(audit)
        db.commit()
        
        # Real-time WebSocket broadcast trigger to update active dashboards
        await simulator.broadcast()
        
    return incident
