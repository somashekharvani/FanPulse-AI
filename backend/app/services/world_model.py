from typing import Dict, Any

class StadiumWorldModel:
    def __init__(self):
        # The single source of truth for the active stadium telemetry
        self._current_state: Dict[str, Any] = {
            "gate_status": {
                "Gate A": {"status": "open", "queue_length": 15, "throughput_per_min": 8, "wait_time_min": 6},
                "Gate B": {"status": "open", "queue_length": 25, "throughput_per_min": 6, "wait_time_min": 12},
                "Gate C": {"status": "open", "queue_length": 10, "throughput_per_min": 10, "wait_time_min": 3},
                "Gate C2": {"status": "closed", "queue_length": 0, "throughput_per_min": 0, "wait_time_min": 0}
            },
            "zone_occupancy": {
                "Zone 1 (East entrance)": {"occupancy_pct": 40},
                "Zone 2 (Concourse North)": {"occupancy_pct": 55},
                "Zone 3 (East stands)": {"occupancy_pct": 70},
                "Zone 4 (West stands)": {"occupancy_pct": 65},
                "Zone 5 (South entrance)": {"occupancy_pct": 25}
            },
            "concessions": {
                "restrooms": {
                    "West Wing Queue": "nominal",
                    "East Wing Queue": "nominal"
                },
                "food_inventory": {
                    "Soda Inventory": "High",
                    "Hotdog Inventory": "Medium",
                    "Water Inventory": "High"
                },
                "wait_times": {
                    "Section 102 Concession": 4,
                    "Section 114 Concession": 8
                }
            },
            "weather_transit": {
                "temp_f": 74,
                "conditions": "Clear",
                "train_wait_min": 5
            },
            "parking": {
                "Lot A": {"occupancy_pct": 65, "total_spots": 500, "status": "available"},
                "Lot B": {"occupancy_pct": 82, "total_spots": 700, "status": "available"},
                "Lot C": {"occupancy_pct": 92, "total_spots": 450, "status": "filling_fast", "prediction_full_min": 11}
            }
        }
        # In-memory separation of current vs forecast
        self._forecast_state: Dict[str, Any] = {}

    def get_current_state(self) -> Dict[str, Any]:
        return self._current_state

    def update_current_state(self, updates: Dict[str, Any]):
        for key, value in updates.items():
            if key in self._current_state and isinstance(self._current_state[key], dict) and isinstance(value, dict):
                # Perform a nested dictionary merge for top-level keys
                for sub_key, sub_val in value.items():
                    if sub_key in self._current_state[key] and isinstance(self._current_state[key][sub_key], dict) and isinstance(sub_val, dict):
                        self._current_state[key][sub_key].update(sub_val)
                    else:
                        self._current_state[key][sub_key] = sub_val
            else:
                self._current_state[key] = value

    def get_forecast_state(self) -> Dict[str, Any]:
        return self._forecast_state

    def update_forecast_state(self, forecast: Dict[str, Any]):
        self._forecast_state = forecast

# Singleton World Model instance
world_model = StadiumWorldModel()
