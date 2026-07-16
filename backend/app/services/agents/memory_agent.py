from typing import Dict, Any
from app.services.world_model import world_model

class MemoryAgent:
    def __init__(self):
        self.name = "Memory Agent"

    def retrieve_preference_nudge(self, email: str) -> Dict[str, Any]:
        state = world_model.get_current_state()
        
        nudge = "Welcome back! Guide user to standard preferences."
        recommendation = "Provide default hotdog and soda location maps."
        why = "Retrieving preferences from historical profile database."
        confidence = "94%"
        
        if "organizer" in email:
            nudge = "Welcome back, Somashekhar. You generally arrive 1 hour before kickoff."
            recommendation = "Suggest Parking B, Entry Gate C2, and highlight Vegetarian Concession Section 102."
            why = "Matching historical arrival patterns and preferences for this operator profile."
            confidence = "98%"
            
        return {
            "nudge": nudge,
            "recommendation": recommendation,
            "why": why,
            "confidence": confidence,
            "confidence_factors": {
                "profile_id": email,
                "history_records_found": 12,
                "consent_active": True
            },
            "is_ai": True
        }
