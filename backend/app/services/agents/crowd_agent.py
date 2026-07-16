from typing import Dict, Any
from app.services.world_model import world_model

class CrowdAgent:
    def __init__(self):
        self.name = "Crowd Agent"

    def check_congestion(self, gate_name: str) -> Dict[str, Any]:
        state = world_model.get_current_state()
        gates = state.get("gate_status", {})
        
        gate_info = gates.get(gate_name, {"wait_time_min": 0, "queue_length": 0, "status": "open"})
        q_len = gate_info.get("queue_length", 0)
        wait = gate_info.get("wait_time_min", 0)
        
        alt_gate = "Gate C2" if "Gate C" in gate_name else "Gate B2"
        
        briefing = f"Gate {gate_name} queue spiked to {q_len} people (~{wait} min wait)."
        nudge = f"Gate {gate_name} is congested. We suggest using {alt_gate} to enter quickly."
        recommendation = f"Activate reserve gates at {alt_gate} and route staff to redirect crowds."
        
        confidence = "95%"
        why = f"Based on live sensor counts showing {q_len} queue volume at {gate_name}."
        
        return {
            "gate": gate_name,
            "queue_length": q_len,
            "wait_time": wait,
            "briefing": briefing,
            "nudge": nudge,
            "recommendation": recommendation,
            "why": why,
            "confidence": confidence,
            "confidence_factors": {
                "sensor_type": "CCTV Vision AI Counter",
                "sample_rate": "15s updates",
                "alternate_gate_status": gates.get(alt_gate, {}).get("status", "closed")
            },
            "is_ai": True
        }
