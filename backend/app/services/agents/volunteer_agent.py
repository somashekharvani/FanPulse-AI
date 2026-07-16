from typing import Dict, Any
from app.services.world_model import world_model

class VolunteerAgent:
    def __init__(self):
        self.name = "Volunteer Agent"

    def schedule_volunteer_dispatch(self, sector: str, severity: str) -> Dict[str, Any]:
        state = world_model.get_current_state()
        
        nudge = f"Dispatching volunteer assistants to {sector}."
        recommendation = f"Route nearest available Hospitality and Gate staff to {sector} to support."
        why = f"Increased activity or incident reported in {sector} requires human-in-the-loop coordination."
        confidence = "95%"
        
        return {
            "nudge": nudge,
            "recommendation": recommendation,
            "why": why,
            "confidence": confidence,
            "confidence_factors": {
                "sector": sector,
                "severity": severity,
                "active_volunteers": 126
            },
            "is_ai": True
        }
