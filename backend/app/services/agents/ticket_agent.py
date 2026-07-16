from typing import Dict, Any
from app.services.world_model import world_model

class TicketAgent:
    def __init__(self):
        self.name = "Ticket Agent"

    def analyze_ticket_data(self, ocr_text: str, user_profile: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parses raw OCR ticket text and generates personalized routing.
        """
        # Parse fields with simple regex/heuristics from ocr_text
        text = ocr_text.lower()
        
        match_name = "FIFA World Cup 2026: Host vs Visitor"
        if "dallas" in text or "toronto" in text:
            match_name = "FIFA World Cup: Dallas vs Toronto"
        elif "mexico" in text or "atlanta" in text:
            match_name = "FIFA World Cup: Mexico vs Atlanta"
            
        gate = "Gate A"
        if "gate b" in text:
            gate = "Gate B"
        elif "gate c" in text:
            gate = "Gate C"
        elif "gate c2" in text:
            gate = "Gate C2"

        section = "100"
        for word in text.split():
            if word.isdigit() and len(word) == 3:
                section = word
                break
                
        row = "A"
        if "row" in text:
            idx = text.find("row")
            row_sub = text[idx:idx+8].replace("row", "").strip()
            if row_sub:
                row = row_sub.split()[0].upper().strip(",.-")
                
        seat = "1"
        if "seat" in text:
            idx = text.find("seat")
            seat_sub = text[idx:idx+8].replace("seat", "").strip()
            if seat_sub:
                seat = seat_sub.split()[0].upper().strip(",.-")

        is_vip = "vip" in text or "suite" in text or "hospitality" in text
        is_accessible = "accessible" in text or "wheelchair" in text or "step-free" in text or "ramp" in text

        # Core logic: check active queues from WorldModel
        state = world_model.get_current_state()
        gates = state.get("gate_status", {})
        
        assigned_gate_info = gates.get(gate, {"wait_time_min": 0, "queue_length": 0})
        assigned_wait = assigned_gate_info.get("wait_time_min", 0)

        recommended_gate = gate
        why_explanation = f"Assigned {gate} has a nominal wait time of {assigned_wait} minutes."
        confidence_score = 98

        # If assigned gate is highly congested, recommend another gate
        if assigned_wait > 15:
            # Look for adjacent/backup gate
            alt_gate = "Gate C2" if "Gate C" in gate else "Gate A"
            alt_info = gates.get(alt_gate, {"wait_time_min": 0, "status": "open"})
            if alt_info.get("status") == "open" and alt_info.get("wait_time_min", 0) < assigned_wait:
                recommended_gate = alt_gate
                why_explanation = (
                    f"Assigned {gate} wait time is {assigned_wait} min due to queue surge, "
                    f"whereas backup {alt_gate} has {alt_info.get('wait_time_min')} min wait."
                )
                confidence_score = 92
        
        # Calculate walking route details
        walk_min = 6 if recommended_gate == gate else 10
        est_arrival = f"{walk_min + recommended_gate_wait(recommended_gate, gates)} minutes"

        confidence_factors = {
            "assigned_gate_wait": f"{assigned_wait} min",
            "recommended_gate_wait": f"{gates.get(recommended_gate, {}).get('wait_time_min', 0)} min",
            "weather_condition": state.get("weather_transit", {}).get("conditions", "Clear"),
            "accessibility_applied": "Ramps mapped" if is_accessible else "Standard paths mapped"
        }

        return {
            "ticket_details": {
                "match": match_name,
                "assigned_gate": gate,
                "section": section,
                "row": row,
                "seat": seat,
                "vip": is_vip,
                "accessibility": "Step-free" if is_accessible else "Standard"
            },
            "recommendation": {
                "gate": recommended_gate,
                "walking_route": f"Proceed from transit loop to {recommended_gate}, follow path and enter at Section {section}.",
                "estimated_arrival_before_kickoff": est_arrival,
                "why": why_explanation,
                "confidence": f"{confidence_score}%",
                "confidence_factors": confidence_factors,
                "is_ai": True
            }
        }

def recommended_gate_wait(gate_name: str, gates: dict) -> int:
    return gates.get(gate_name, {}).get("wait_time_min", 0)
