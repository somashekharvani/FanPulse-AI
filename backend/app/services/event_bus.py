import asyncio
import logging
from typing import Dict, List, Callable, Any

logger = logging.getLogger("fanpulse.event_bus")

class EventBus:
    def __init__(self):
        self._subscribers: Dict[str, List[Callable[[Dict[str, Any]], Any]]] = {}

    def subscribe(self, event_type: str, callback: Callable[[Dict[str, Any]], Any]):
        if event_type not in self._subscribers:
            self._subscribers[event_type] = []
        if callback not in self._subscribers[event_type]:
            self._subscribers[event_type].append(callback)
            logger.info(f"Subscribed callback to event: {event_type}")

    def unsubscribe(self, event_type: str, callback: Callable[[Dict[str, Any]], Any]):
        if event_type in self._subscribers and callback in self._subscribers[event_type]:
            self._subscribers[event_type].remove(callback)
            logger.info(f"Unsubscribed callback from event: {event_type}")

    async def publish(self, event_type: str, data: Dict[str, Any]):
        if event_type not in self._subscribers:
            return
        
        logger.debug(f"Publishing event {event_type}")
        
        # Invoke all subscribers for this event type
        for callback in self._subscribers[event_type]:
            try:
                if asyncio.iscoroutinefunction(callback):
                    await callback(data)
                else:
                    callback(data)
            except Exception as e:
                logger.error(f"Error executing callback for event {event_type}: {e}")

# Singleton Event Bus instance
event_bus = EventBus()
