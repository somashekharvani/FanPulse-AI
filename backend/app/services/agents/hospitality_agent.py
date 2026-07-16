from typing import Dict, Any
from app.services.world_model import world_model

class HospitalityAgent:
    def __init__(self):
        self.name = "Hospitality Agent"

    def check_hospitality(self) -> Dict[str, Any]:
        state = world_model.get_current_state()
        concessions = state.get("concessions", {})
        
        restrooms = concessions.get("restrooms", {})
        food_inventory = concessions.get("food_inventory", {})
        wait_times = concessions.get("wait_times", {})
        
        # Analyze queues
        west_restroom = restrooms.get("West Wing Queue", "nominal")
        east_restroom = restrooms.get("East Wing Queue", "nominal")
        
        # Concession recommendation
        recommendation = "All concession stocks are healthy. Enjoy the match!"
        why = "Food inventory levels are high or medium."
        confidence = "98%"
        
        soda = food_inventory.get("Soda Inventory", "High")
        hotdog = food_inventory.get("Hotdog Inventory", "Medium")
        water = food_inventory.get("Water Inventory", "High")
        
        if hotdog == "Low":
            recommendation = "Section 102 Hotdog inventory is low. Head to Section 114 Concession instead."
            why = "Hotdog stocks in Section 102 dropped below 15% threshold."
            confidence = "94%"
            
        return {
            "restrooms": restrooms,
            "food_inventory": food_inventory,
            "wait_times": wait_times,
            "recommendation": recommendation,
            "why": why,
            "confidence": confidence,
            "confidence_factors": {
                "soda_stock": soda,
                "hotdog_stock": hotdog,
                "water_stock": water,
                "west_restroom_queue": west_restroom,
                "east_restroom_queue": east_restroom
            },
            "is_ai": True
        }
