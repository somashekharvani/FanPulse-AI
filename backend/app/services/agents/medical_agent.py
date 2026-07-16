from typing import Dict, Any
from app.services.world_model import world_model

class MedicalAgent:
    def __init__(self):
        self.name = "Medical Agent"

    def handle_medical_priority(self, location: str, details: str) -> Dict[str, Any]:
        state = world_model.get_current_state()
        
        nudge = f"Medical alert triggered at {location}."
        recommendation = f"Dispatch first-aid responder squad to {location} immediately and open Medical Bay-2."
        why = f"Symptom reporting ({details}) classified as urgent medical request."
        confidence = "96%"
        
        return {
            "nudge": nudge,
            "recommendation": recommendation,
            "why": why,
            "confidence": confidence,
            "confidence_factors": {
                "location": location,
                "urgency_level": "high",
                "nearest_medical_bay": "Medical Bay-2"
            },
            "is_ai": True
        }
