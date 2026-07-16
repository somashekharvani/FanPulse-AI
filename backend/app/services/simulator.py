import asyncio
import datetime
import logging
from typing import Dict, Any, Callable, List
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.models import VenueState, Incident, AuditLog
from app.services.ai_service import AIService
from app.services.world_model import world_model
from app.services.event_bus import event_bus

logger = logging.getLogger("fanpulse.simulator")

class StadiumSimulator:
    def __init__(self):
        self.is_running = False
        self._task = None

    def subscribe(self, callback: Callable[[Dict[str, Any]], Any]):
        """Subscribe router WebSockets to state mutations via EventBus."""
        event_bus.subscribe("TelemetryUpdated", callback)

    def unsubscribe(self, callback: Callable[[Dict[str, Any]], Any]):
        event_bus.unsubscribe("TelemetryUpdated", callback)

    async def broadcast(self):
        """Broadcast current state through the EventBus."""
        state = self.get_state()
        await event_bus.publish("TelemetryUpdated", state)

    def get_state(self) -> Dict[str, Any]:
        """Read state directly from the Shared World Model."""
        return world_model.get_current_state()

    def get_forecast_state(self) -> Dict[str, Any]:
        """Read forecast state directly from the Shared World Model."""
        return world_model.get_forecast_state()

    def save_state_to_db(self, db: Session):
        """Save a snapshot of the current state to the database for time-series history."""
        try:
            state = self.get_state()
            state_record = VenueState(
                gate_status=state["gate_status"],
                zone_occupancy=state["zone_occupancy"],
                concessions=state["concessions"],
                weather_transit=state["weather_transit"]
            )
            db.add(state_record)
            db.commit()
            db.refresh(state_record)
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to persist state snapshot: {e}")

    def mutate_state(self):
        """Slightly fluctuate queue lengths, transit times, and zone occupancies to simulate reality."""
        import random
        state = self.get_state()
        
        # Gates fluctuation
        for gate, info in state["gate_status"].items():
            if info["status"] == "open":
                delta = random.choice([-2, -1, 0, 1, 2])
                info["queue_length"] = max(2, info["queue_length"] + delta)
                info["wait_time_min"] = max(1, int(info["queue_length"] * 0.4))
                
        # Zones occupancy fluctuation
        for zone, info in state["zone_occupancy"].items():
            delta = random.choice([-3, -1, 0, 1, 3])
            info["occupancy_pct"] = max(5, min(98, info["occupancy_pct"] + delta))
            
        # Transit times fluctuation
        transit = state["weather_transit"]
        transit["train_wait_min"] = max(2, min(15, transit["train_wait_min"] + random.choice([-1, 0, 1])))

        # Parking lot fluctuation
        if "parking" in state:
            for lot, info in state["parking"].items():
                delta = random.choice([-1, 0, 1])
                info["occupancy_pct"] = max(10, min(100, info["occupancy_pct"] + delta))
                if info["occupancy_pct"] >= 90:
                    info["status"] = "filling_fast"
                    # Countdown prediction
                    info["prediction_full_min"] = max(1, info["prediction_full_min"] - 1 if "prediction_full_min" in info else 10)
                else:
                    info["status"] = "available"
                    info.pop("prediction_full_min", None)

    async def start(self):
        """Starts the background simulator thread loop."""
        self.is_running = True
        self._task = asyncio.create_task(self._run_loop())

    async def stop(self):
        self.is_running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

    async def _run_loop(self):
        while self.is_running:
            try:
                await asyncio.sleep(15)  # Mutate every 15 seconds for responsiveness in demo
                self.mutate_state()
                
                # Save snapshot using a separate DB session
                db = SessionLocal()
                try:
                    self.save_state_to_db(db)
                finally:
                    db.close()
                    
                await self.broadcast()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in simulator run loop: {e}")
                await asyncio.sleep(5)

    async def trigger_congestion_flow(self, db: Session) -> Dict[str, Any]:
        """
        Executes the 'One Demo' flow.
        1. Artificially spikes Gate C queue.
        2. Calculates AI-grounded forecasts/alerts via AIService.
        3. Creates a DRAFT Incident in the DB requiring organizer approval.
        4. Logs to Audit Trail.
        5. Saves state to DB and broadcasts WebSocket updates.
        """
        state = self.get_state()
        # 1. Update Gate C queue status
        state["gate_status"]["Gate C"]["queue_length"] = 120
        state["gate_status"]["Gate C"]["wait_time_min"] = 48
        state["zone_occupancy"]["Zone 1 (East entrance)"]["occupancy_pct"] = 96
        
        # 2. Get AI recommendations (grounded context)
        ai_details = AIService.generate_congestion_alert_details("Gate C", 120, 48)
        
        # 3. Create a DRAFT Incident (Human-in-the-loop alert proposal)
        incident = Incident(
            title="Gate C Overcrowding Warning",
            description=f"AI Vision detected crowd surge at Gate C. {ai_details.get('briefing')}",
            location="Gate C",
            severity="high",
            status="reported",  # Requires organizer approval to change to 'approved'
            reporter_role="system"
        )
        db.add(incident)
        db.commit()
        db.refresh(incident)
        
        # 4. Write Audit Log
        audit = AuditLog(
            performed_by="System (Simulation Mode)",
            action="congestion_simulation_triggered",
            details="Triggered Gate C congestion sequence. Set queue to 120, wait time to 48m. Generated draft Incident ID: " + str(incident.id)
        )
        db.add(audit)
        db.commit()
        
        # Publish IncidentCreated event to EventBus
        await event_bus.publish("IncidentCreated", {
            "incident_id": incident.id,
            "title": incident.title,
            "description": incident.description,
            "location": incident.location
        })
        
        # 5. Persist State and Broadcast
        self.save_state_to_db(db)
        await self.broadcast()
        
        return {
            "incident_id": incident.id,
            "briefing": ai_details.get("briefing"),
            "nudge": ai_details.get("nudge"),
            "recommendation": ai_details.get("recommendation"),
            "gate_status": state["gate_status"]["Gate C"]
        }

# Global Singleton Simulator Instance
simulator = StadiumSimulator()
