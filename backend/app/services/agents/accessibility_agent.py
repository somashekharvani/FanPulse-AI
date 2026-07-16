from typing import Dict, Any
from app.services.world_model import world_model

class AccessibilityAgent:
    def __init__(self):
        self.name = "Accessibility Agent"

    def get_accessibility_plan(self, wheelchair_mode: bool, low_vision_mode: bool, hearing_assistance: bool) -> Dict[str, Any]:
        state = world_model.get_current_state()
        
        nudge = "Accessibility services set to standard."
        recommendation = "Provide standard signage navigation instructions."
        why = "No accessibility profiles activated in user settings."
        confidence = "99%"
        
        if wheelchair_mode:
            nudge = "Wheelchair routing enabled. Directing user to Ramp Gate C2."
            recommendation = "Open Ramp Gate C2, sync elevator dispatch codes, and verify clear accessible lanes."
            why = "User has active wheelchair accessibility requirement."
            confidence = "98%"
        elif low_vision_mode:
            nudge = "Low vision mode active. High contrast styling and text-to-speech navigation recommended."
            recommendation = "Enable high-contrast display overlays and trigger audio guidance prompts at checkpoints."
            why = "User profile set to high contrast and low vision mode."
            confidence = "97%"
            
        return {
            "nudge": nudge,
            "recommendation": recommendation,
            "why": why,
            "confidence": confidence,
            "confidence_factors": {
                "wheelchair_mode": wheelchair_mode,
                "low_vision_mode": low_vision_mode,
                "hearing_assistance": hearing_assistance
            },
            "is_ai": True
        }
