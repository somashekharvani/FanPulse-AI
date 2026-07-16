import logging
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session

from app.core import auth
from app.core.database import get_db
from app.models.models import User, AuditLog
from app.services.agents.orchestrator import orchestrator

logger = logging.getLogger("fanpulse.ticket")
router = APIRouter(prefix="/venue", tags=["ticket"])

@router.post("/analyze-ticket")
async def analyze_ticket(
    ticket_image: UploadFile = File(...),
    current_user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload and analyze a match ticket.
    Extracts ticket details and generates a personalized journey route.
    """
    # Read file bytes to simulate OCR parsing
    await ticket_image.read()
    filename = ticket_image.filename.lower()
    
    # Establish mock OCR grounding text from filename
    # e.g., "dallas_gate_c_accessible.jpg"
    ocr_text = "Match: Dallas vs Toronto, Gate: Gate C, Section: 104, Row: K, Seat: 15"
    if "vip" in filename:
        ocr_text += " VIP suite access"
    if "gate b" in filename or "gate_b" in filename:
        ocr_text = ocr_text.replace("Gate: Gate C", "Gate: Gate B")
    elif "gate a" in filename or "gate_a" in filename:
        ocr_text = ocr_text.replace("Gate: Gate C", "Gate: Gate A")
    if "accessible" in filename or "ramp" in filename or "step-free" in filename:
        ocr_text += " accessibility step-free ramp access"
        
    try:
        user_profile = {
            "email": current_user.email,
            "accessibility_needs": current_user.accessibility_needs
        }
        # Run agent analysis
        analysis = orchestrator.ticket_agent.analyze_ticket_data(ocr_text, user_profile)
        
        # Save ticket info back to user's Digital Passport profile
        current_user.ticket_info = analysis["ticket_details"]
        db.add(current_user)
        db.commit()
        
        # Write to Immutable Audit Log
        audit = AuditLog(
            performed_by=current_user.email,
            action="ticket_analyzed",
            details=f"Analyzed ticket for {analysis['ticket_details']['match']}. Assigned: {analysis['ticket_details']['assigned_gate']}, Rec: {analysis['recommendation']['gate']}"
        )
        db.add(audit)
        db.commit()
        
        return analysis
    except Exception as e:
        logger.error(f"Failed to analyze ticket: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ticket analyzer failed: {e}"
        )
