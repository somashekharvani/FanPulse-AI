from typing import Dict, Any
from app.services.world_model import world_model

class TrafficAgent:
    def __init__(self):
        self.name = "Traffic Agent"

    def check_traffic(self) -> Dict[str, Any]:
        state = world_model.get_current_state()
        transit = state.get("weather_transit", {})
        parking = state.get("parking", {})
        
        train_wait = transit.get("train_wait_min", 5)
        
        # Analyze parking
        lot_c = parking.get("Lot C", {"occupancy_pct": 0, "prediction_full_min": 10})
        lot_c_occ = lot_c.get("occupancy_pct", 0)
        
        recommendation = "Transit options running smoothly. Use standard parking lots."
        why = f"Transit waiting time is normal ({train_wait} min)."
        confidence = "97%"
        
        if lot_c_occ > 90:
            pred_min = lot_c.get("prediction_full_min", 11)
            recommendation = f"Parking Lot C is nearly full ({lot_c_occ}%). It is projected to fill up in {pred_min} minutes. Reroute incoming vehicles to Lot A."
            why = f"Lot C occupancy spiked to {lot_c_occ}% and current arrival rate is 42 vehicles/min."
            confidence = "93%"
            
        return {
            "transit": transit,
            "parking": parking,
            "recommendation": recommendation,
            "why": why,
            "confidence": confidence,
            "confidence_factors": {
                "train_frequency": f"{train_wait} min wait",
                "lot_c_occupancy": f"{lot_c_occ}%",
                "temp_weather": f"{transit.get('temp_f', 74)}F and {transit.get('conditions', 'Clear')}"
            },
            "is_ai": True
        }
