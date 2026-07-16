import time
from collections import defaultdict
from typing import Dict, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core import auth
from app.core.database import get_db
from app.models.models import User, AuditLog
from app.models.schemas import ChatRequest, ChatResponse, VolunteerCopilotRequest, VolunteerCopilotResponse
from app.services.ai_service import AIService
from app.services.simulator import simulator
from app.services.agents.orchestrator import orchestrator

router = APIRouter(prefix="/chat", tags=["chat"])

# In-memory sliding-window rate limiter
CHAT_RATE_LIMITS = defaultdict(list)

def enforce_chat_rate_limit(user_email: str, max_reqs: int = 15, window_sec: int = 60):
    now = time.time()
    # Remove logs older than window
    CHAT_RATE_LIMITS[user_email] = [t for t in CHAT_RATE_LIMITS[user_email] if now - t < window_sec]
    if len(CHAT_RATE_LIMITS[user_email]) >= max_reqs:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many chat queries. Please wait a moment before sending another message."
        )
    CHAT_RATE_LIMITS[user_email].append(now)

@router.post("/companion", response_model=ChatResponse)
def chat_companion(
    request: ChatRequest, 
    current_user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Grounded Fan Chat Companion.
    Provides answers about stadium status, navigation routes, gate queue times,
    and transit based entirely on current live state data.
    """
    # Rate Limit
    enforce_chat_rate_limit(current_user.email, max_reqs=10, window_sec=60)
    
    # Fetch active stadium state
    venue_state = simulator.get_state()
    
    # Check if we should personalize response (Consent check)
    user_state = venue_state.copy()
    if not current_user.preferences_consented:
        # Strip personalized information or logs if they didn't consent
        user_state["user_profile"] = "anonymous"
    else:
        user_state["user_profile"] = {
            "email": current_user.email,
            "role": current_user.role,
            "preferences": "personalized_routing_enabled"
        }
    
    # Invoke grounding service
    history_dicts = [{"role": msg.role, "content": msg.content} for msg in request.history]
    
    try:
        # Route companion chats through the Orchestrator
        response_data = orchestrator.process_companion_chat(
            email=current_user.email,
            message=request.message,
            history=history_dicts,
            language=request.language
        )
        
        # Check if there are active approved critical alerts to append
        # (This implements human-in-the-loop broadcast notifications)
        from app.models.models import Incident
        active_alert = db.query(Incident).filter(
            Incident.status == "approved",  # Approved by organizer
            Incident.severity == "critical"
        ).order_by(Incident.created_at.desc()).first()
        
        alert_text = None
        if active_alert:
            alert_text = f"CRITICAL SECURITY ALERT: {active_alert.title} - {active_alert.description}"
            
        return ChatResponse(
            response=response_data.get("response", "Could not complete request."),
            why=response_data.get("why"),
            confidence=response_data.get("confidence"),
            confidence_factors=response_data.get("confidence_factors"),
            suggested_actions=response_data.get("suggested_actions", []),
            alert_triggered=alert_text,
            is_ai=True
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI service error: {e}"
        )

@router.post("/copilot", response_model=VolunteerCopilotResponse)
def chat_copilot(
    request: VolunteerCopilotRequest, 
    current_user: User = Depends(auth.RoleChecker(allowed_roles=["volunteer", "organizer"])),
    db: Session = Depends(get_db)
):
    """
    Volunteer Copilot advisor.
    Helps volunteers assess situational issues, gives them verbal scripts,
    and returns appropriate coordinator contacts or team channels.
    """
    # Rate Limit
    enforce_chat_rate_limit(current_user.email, max_reqs=15, window_sec=60)
    
    venue_state = simulator.get_state()
    history_dicts = [{"role": msg.role, "content": msg.content} for msg in request.history]
    
    try:
        copilot_data = AIService.get_copilot_response(
            message=request.message,
            history=history_dicts,
            venue_state=venue_state
        )
        
        # Log to Audit Log if they reported a potential emergency escalation
        msg_lower = request.message.lower()
        if any(w in msg_lower for w in ["fight", "injured", "medical", "collapse", "fire", "smoke"]):
            audit = AuditLog(
                performed_by=current_user.email,
                action="copilot_escalation_queried",
                details=f"Volunteer reported issue: '{request.message[:100]}...'. AI recommended: {copilot_data.get('escalation_path')}"
            )
            db.add(audit)
            db.commit()
            
        return VolunteerCopilotResponse(
            response=copilot_data.get("response"),
            script=copilot_data.get("script"),
            escalation_path=copilot_data.get("escalation_path"),
            is_ai=True
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI Copilot service error: {e}"
        )
