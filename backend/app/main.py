from typing import List
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import init_db, SessionLocal
from app.models.models import Incident
from app.services.simulator import simulator
from app.routers import auth, venue, chat, incidents, tasks, audit, ticket, global_ops

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Generative AI stadium-operations platform for FIFA World Cup 2026",
    version="1.0.0"
)

# Set CORS origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_origin_regex="https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Router Modules
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(venue.router, prefix=settings.API_V1_STR)
app.include_router(chat.router, prefix=settings.API_V1_STR)
app.include_router(incidents.router, prefix=settings.API_V1_STR)
app.include_router(tasks.router, prefix=settings.API_V1_STR)
app.include_router(audit.router, prefix=settings.API_V1_STR)
app.include_router(ticket.router, prefix=settings.API_V1_STR)
app.include_router(global_ops.router, prefix=settings.API_V1_STR)

# --- WebSocket Real-Time Connection Manager ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        # Send initial data immediately
        initial_state = simulator.get_state()
        initial_payload = await self.build_payload(initial_state)
        await websocket.send_json(initial_payload)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, payload: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(payload)
            except Exception:
                # Handle dead connections silently; they will be cleaned up on disconnect
                pass

    async def build_payload(self, state: dict) -> dict:
        db = SessionLocal()
        try:
            # Query approved and active incidents to send along with telemetry
            active_incidents = db.query(Incident).filter(
                Incident.status.in_(["approved", "dispatched"])
            ).all()
            
            incidents_data = [
                {
                    "id": inc.id,
                    "title": inc.title,
                    "description": inc.description,
                    "location": inc.location,
                    "severity": inc.severity,
                    "status": inc.status,
                    "assigned_volunteer_id": inc.assigned_volunteer_id
                }
                for inc in active_incidents
            ]
            
            return {
                "type": "stadium_update",
                "venue_state": state,
                "incidents": incidents_data
            }
        finally:
            db.close()

manager = ConnectionManager()

# Link the simulator's broadcast function to our WebSocket manager
async def on_simulator_update(new_state: dict):
    payload = await manager.build_payload(new_state)
    await manager.broadcast(payload)

# Register callbacks and start/stop the simulator on application hooks
@app.on_event("startup")
async def startup_event():
    # Create DB tables if they do not exist
    init_db()
    
    # Register event bus subscribers for Agent Memory
    from app.services.agents.memory import agent_memory
    from app.services.event_bus import event_bus
    event_bus.subscribe("TelemetryUpdated", lambda data: agent_memory.add_event("TelemetryUpdated", data))
    event_bus.subscribe("IncidentCreated", lambda data: agent_memory.add_event("IncidentCreated", data))

    # Register websocket broadcast callback in simulator
    simulator.subscribe(on_simulator_update)
    
    # Launch background simulator loop
    await simulator.start()

@app.on_event("shutdown")
async def shutdown_event():
    # Clean up background tasks
    await simulator.stop()

# WebSocket Endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive, listen for any messages from client (if any)
            data = await websocket.receive_text()
            # In our case, we don't expect command inputs over WS, but we handle echo just in case
            await websocket.send_json({"type": "ack", "message": "alive"})
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)
