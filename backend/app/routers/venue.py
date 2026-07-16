import datetime
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core import auth
from app.core.config import settings
from app.core.database import get_db
from app.models.models import VenueState, AuditLog
from app.models.schemas import VenueStateResponse
from app.services.simulator import simulator
from app.services.world_model import world_model
from app.services.agents.orchestrator import orchestrator

router = APIRouter(prefix="/venue", tags=["venue"])

@router.get("/config")
def get_venue_config():
    """Retrieve dynamic flagship stadium details from settings configuration."""
    return {
        "stadium": settings.FLAGSHIP_VENUE_NAME,
        "city": settings.FLAGSHIP_STADIUM
    }

@router.get("/state")
def get_current_state():
    """Retrieve the live in-memory telemetry state of the stadium from WorldModel."""
    return world_model.get_current_state()

@router.get("/history", response_model=List[VenueStateResponse])
def get_state_history(db: Session = Depends(get_db)):
    """Fetch time-series records of simulated sensor states (last 50)."""
    records = db.query(VenueState).order_by(VenueState.timestamp.desc()).limit(50).all()
    return records

@router.post("/simulate-congestion")
async def trigger_congestion(
    db: Session = Depends(get_db), 
    current_user = Depends(auth.RoleChecker(allowed_roles=["organizer"]))
):
    """
    Simulate overcrowding at Gate C.
    This executes the 'One Demo' E2E flow. Restricted to Organizer/Admin.
    """
    try:
        results = await simulator.trigger_congestion_flow(db)
        return {
            "status": "success",
            "message": "Congestion event simulated successfully.",
            "data": results
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to execute congestion simulation: {e}"
        )

@router.get("/forecast")
def get_crowd_forecast():
    """Predictive crowd forecast mapping current queues to future bottlenecks."""
    state = world_model.get_current_state()
    gates = state.get("gate_status", {})
    
    forecasts = []
    for name, info in gates.items():
        q_len = info.get("queue_length", 0)
        status_str = info.get("status", "open")
        
        if status_str == "closed":
            continue
            
        if q_len >= 80:
            forecasts.append({
                "gate": name,
                "status": "Critical Congestion",
                "message": f"{name} is at {q_len}% utilization. Recommend opening reserve gate Gate C2 immediately to balance traffic.",
                "severity": "critical"
            })
        elif q_len >= 30:
            forecasts.append({
                "gate": name,
                "status": "High Queue Volume",
                "message": f"{name} wait times are escalating (~{info.get('wait_time_min')} mins). Guide fans to alternative paths.",
                "severity": "warning"
            })
            
    if not forecasts:
        forecasts.append({
            "gate": "All Gates",
            "status": "Nominal",
            "message": "Stadia entry queues operating smoothly. No bottlenecks predicted in the next 15 minutes.",
            "severity": "info"
        })
        
    return {
        "timestamp": datetime.datetime.utcnow(),
        "predictions": forecasts
    }

@router.get("/forecast-state")
def get_forecast_state(
    current_user = Depends(auth.RoleChecker(allowed_roles=["organizer"]))
):
    """Retrieve the generated 30-minute forecasted state. Restricted to Organizer."""
    return world_model.get_forecast_state()

@router.post("/simulate-forecast")
async def trigger_forecast(
    db: Session = Depends(get_db),
    current_user = Depends(auth.RoleChecker(allowed_roles=["organizer"]))
):
    """
    Project stadium operations 30 minutes in the future.
    Uses the PredictionAgent to populate forecast_state. Restricted to Organizer.
    """
    try:
        # Generate the forecast
        forecast_result = await orchestrator.prediction_agent.generate_30m_forecast()
        
        # Log this forecast generation event
        audit = AuditLog(
            performed_by=current_user.email,
            action="forecast_simulated",
            details="Generated 30-minute forward operational forecast projection."
        )
        db.add(audit)
        db.commit()
        
        return {
            "status": "success",
            "message": "Operational forecast generated successfully.",
            "data": forecast_result
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate operational forecast: {e}"
        )

@router.get("/situation-report")
def get_situation_report(current_user = Depends(auth.RoleChecker(allowed_roles=["organizer"]))):
    """Generate a high-level summary report for stadium operators using SitrepAgent."""
    try:
        sitrep_result = orchestrator.sitrep_agent.compile_report()
        return sitrep_result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate situation report: {e}"
        )

@router.get("/health")
def get_health():
    """Retrieve operational health metrics for the Organizer Health dashboard."""
    # Test DB status
    db_status = "Healthy"
    try:
        from app.core.database import SessionLocal
        db = SessionLocal()
        db.close()
    except Exception:
        db_status = "Degraded"
        
    # Get active WebSocket connection counts from main manager (runtime import)
    try:
        from app.main import manager
        ws_count = len(manager.active_connections)
    except Exception:
        ws_count = 0

    return {
        "status": "Healthy",
        "timestamp": datetime.datetime.utcnow(),
        "database": db_status,
        "simulator": "Active" if simulator.is_running else "Inactive",
        "websocket_connections": ws_count,
        "ai_service": "Grounded Fallback Engine" if not settings.GEMINI_API_KEY else "Gemini API Active"
    }
