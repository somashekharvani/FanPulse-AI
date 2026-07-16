from collections import defaultdict
from typing import List, Dict, Any

class AgentMemory:
    def __init__(self):
        # Maps user_email -> List of chat messages (history)
        self._chat_history: Dict[str, List[Dict[str, str]]] = defaultdict(list)
        # Stores last generated forecasts or predictions
        self._predictions_history: List[Dict[str, Any]] = []
        # Stores recent event logs from event bus
        self._recent_events: List[Dict[str, Any]] = []

    def get_chat_history(self, email: str, limit: int = 10) -> List[Dict[str, str]]:
        return self._chat_history[email][-limit:]

    def add_chat_message(self, email: str, role: str, content: str):
        self._chat_history[email].append({"role": role, "content": content})

    def clear_chat_history(self, email: str):
        if email in self._chat_history:
            del self._chat_history[email]

    def add_prediction(self, prediction: Dict[str, Any]):
        self._predictions_history.append(prediction)
        # Keep only last 10 predictions
        self._predictions_history = self._predictions_history[-10:]

    def get_recent_predictions(self) -> List[Dict[str, Any]]:
        return self._predictions_history

    def add_event(self, event_type: str, data: Dict[str, Any]):
        import datetime
        self._recent_events.append({
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "event_type": event_type, 
            "data": data
        })
        self._recent_events = self._recent_events[-20:]

    def get_recent_events(self) -> List[Dict[str, Any]]:
        return self._recent_events

# Singleton memory instance
agent_memory = AgentMemory()
