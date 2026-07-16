# FanPulse AI: System Architecture

This document describes the architectural layout and design patterns of FanPulse AI - The Global Agentic AI Stadium Operating System for FIFA World Cup 2026.

---

## High-Level System Layout

```
                        ┌────────────────────────┐
                        │      Next.js App       │
                        │       (Frontend)       │
                        └───────────┬────────────┘
                                    │ HTTP / WebSockets
                                    ▼
                        ┌────────────────────────┐
                        │    FastAPI Service     │
                        │       (Backend)       │
                        └───────────┬────────────┘
                                    │ SQLAlchemy ORM
                                    ▼
                        ┌────────────────────────┐
                        │  SQLite Database Core  │
                        │     (fanpulse.db)      │
                        └────────────────────────┘
```

---

## Backend Framework (`/backend`)
- **FastAPI Core**: Handles high-performance asynchronous endpoints, routing, dependency injections, and rate-limiting.
- **WebSocket Gateway (`/ws`)**: Live broadcaster module pushes simulated gate capacities, queues, weather coordinates, and crisis situations to all connected clients in real time.
- **SQLAlchemy & SQLite database**: Local `fanpulse.db` stores user records, hashed password hashes, granular preferences, and simulated logs.
- **Shared World Model**: A state management layer maintaining synchronized telemetry parameters across different stadiums.

---

## Frontend Framework (`/frontend`)
- **Next.js & App Router**: Structured React page tree compiled under TypeScript strict mode.
- **3D Viewport Engines**:
  - `Three.js` via `react-three-fiber` and `@react-three/drei` for rendering interactive 3D stadium hotspots and the 3D Global Earth Globe.
- **Accessibility Provider (`/context/AccessibilityContext`)**: Global state manager driving text size variables, high contrast rules, screen narration synthesizers, and ramp-friendly routing indicators.

---

## Cooperating Multi-Agent System
- **Agent Orchestrator**: Parses inputs and directs requests to specialized agent classes:
  1. `Navigation AI`: Step-free navigation, ramp coordinates, and safety escape pathways.
  2. `Crowd AI`: Gate queues and concessions wait times.
  3. `Traffic AI`: Parking lot occupancy rates and external delays.
  4. `Prediction AI`: Anticipates congestion risks and storm trajectories.
  5. `Hospitality AI`: Recommends concessions.
  6. `Medical AI`: Dispatches medical support coordinates.
  7. `Accessibility AI`: Enforces step-free routing.
  8. `Volunteer AI`: Assigns volunteer priorities.
  9. `Memory AI`: Tracks user preferences.
  10. `Translation AI`: Standardizes translations across 12 languages.
