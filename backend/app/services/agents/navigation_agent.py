from typing import Dict, Any
from app.services.world_model import world_model

class NavigationAgent:
    def __init__(self):
        self.name = "Navigation Agent"

    def get_route(self, gate: str, section: str, step_free: bool = False) -> Dict[str, Any]:
        state = world_model.get_current_state()
        gates = state.get("gate_status", {})
        
        gate_info = gates.get(gate, {"wait_time_min": 0})
        wait = gate_info.get("wait_time_min", 0)
        
        # Accessibility routing pathing details
        path_steps = []
        if step_free:
            path_steps = [
                f"Enter through {gate} wheelchair-access ramp.",
                "Follow Level 1 ramp to concourse elevator.",
                f"Proceed to Section {section} step-free seating block."
            ]
            why = "Ramp route activated. Stairs bypassed based on user profile preferences."
            confidence = "98%"
        else:
            path_steps = [
                f"Enter through {gate} standard entry turnstiles.",
                "Take Concourse stairs to Level 2.",
                f"Proceed to Section {section} row seats."
            ]
            why = f"Direct route mapped from {gate} to Section {section}."
            confidence = "99%"
            
        return {
            "route_steps": path_steps,
            "accessibility_active": step_free,
            "why": why,
            "confidence": confidence,
            "confidence_factors": {
                "step_free": step_free,
                "gate_wait": f"{wait} min",
                "weather": state.get("weather_transit", {}).get("conditions", "Clear")
            },
            "is_ai": True
        }
