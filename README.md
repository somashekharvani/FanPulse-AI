# FanPulse AI — FIFA World Cup 2026 Stadium Operations Console

### 🚀 [Live Website Demo](https://fan-pulse-ai-pxvy.vercel.app/) | [Live API Service](https://fan-pulse-ai-hk1b.vercel.app/api/v1/global/stats)

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](file:///e:/FanPulse%20AI/LICENSE)
[![NextJS](https://img.shields.io/badge/Frontend-Next.js-black?logo=next.js)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.11%2B-blue?logo=python)](https://python.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5%2B-blue?logo=typescript)](https://typescriptlang.org)
[![Websockets](https://img.shields.io/badge/RealTime-Websockets-orange)](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
[![Docker](https://img.shields.io/badge/Docker-Supported-blue?logo=docker)](https://docker.com)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%20%7C%20SQLite-blue?logo=postgresql)](https://postgresql.org)
[![AI Powered](https://img.shields.io/badge/AI-Grounded%20Agents-purple)](file:///e:/FanPulse%20AI/ARCHITECTURE.md#cooperating-multi-agent-system)
[![FIFA World Cup 2026](https://img.shields.io/badge/FIFA-World%20Cup%202026-red)](https://fifa.com)
[![Accessibility Ready](https://img.shields.io/badge/Accessibility-WCAG%202.1%20AA-brightgreen)](file:///e:/FanPulse%20AI/ACCESSIBILITY.md)

FanPulse AI is a Generative AI stadium-operations and crowd-safety management platform tailored for the FIFA World Cup 2026. It integrates real-time telemetry simulations, role-based dashboards, a 3D Digital Twin, and grounded conversational AI.

---

## Features

- **3D Digital Twin & Global Globe**: Built with Three.js (`react-three-fiber`) to visualize stadium hotspots and all 16 FIFA host cities.
- **FanPulse Match Day Companion AI**: 4-tabbed panel including Group Connect coordinate sync, GPS radar maps, battery alerts, child volunteer rescue (privacy secure), smart meeting points, and download memories.
- **Explainable Multi-Agent Core**: 10 specialized agents collaborating under an orchestrator with complete transparency logs.
- **Organizer, Volunteer, and Security Portals**: Operations checklists, active logs, and situational dispatches.
- **AI Crisis Commander**: Simulation modes (heavy rain warning, lost child rescue, medical emergencies) with human-in-the-loop validation gates.
- **Built-in Accessibility state manager**: High contrast color schemes, voice synthesis, custom fonts, and ramp/step-free route selection.

---

## Architectural Design Overview

FanPulse AI splits responsibility cleanly between a responsive frontend and a secure, time-series telemetry backend:
1. **Next.js Frontend (`/frontend`)**: Next.js App Router built with TypeScript, Tailwind CSS, Framer Motion, and Three.js.
2. **FastAPI Backend (`/backend`)**: FastAPI, SQLAlchemy ORM (PostgreSQL & SQLite fallback), Websocket gateways (`/ws`), and JWT-based session checks.

For a detailed structural guide, read the [Architecture Overview](file:///e:/FanPulse%20AI/ARCHITECTURE.md).

---

## Installation & Setup

Ensure you have **Node.js (v20+)** and **Python (3.11+)** installed.

### 1. Backend Setup
1. Navigate to `/backend`.
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On Linux/macOS:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Copy the config template and create your environment variables:
   ```bash
   cp .env.example .env
   ```
5. Start the FastAPI server:
   ```bash
   python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```

### 2. Frontend Setup
1. Navigate to `/frontend`.
2. Install npm packages:
   ```bash
   npm install
   ```
3. Copy the environment variables:
   ```bash
   cp .env.example .env.local
   ```
4. Start the Next.js development server:
   ```bash
   npm run dev
   ```
5. Open your browser and navigate to `http://localhost:3000`.

---

## Quick-Access Evaluation Credentials
For staging and rapid checking, the database pre-seeds default credentials. Select your role on the home landing portal and click **Quick Access (Demo Mode)** or register manually:

- **Organizer / Command Center:** `organizer@fanpulse.ai` (MFA Code: `123456`)
- **Volunteer Responder:** `volunteer@fanpulse.ai`
- **Security Dispatcher:** `security@fanpulse.ai`
- **Fan Companion:** `fan@fanpulse.ai`
*Password for all: `Demo@2026`*

---

## The "One Demo" End-to-End Walkthrough

To demonstrate the full-stack real-time updates and safety guidelines, run this scenario:

1. **Portal Setup:** Open two separate browser tabs side-by-side:
   - **Tab 1:** Navigate to `http://localhost:3000/fan` (Select *Quick Access* to log in as a Fan).
   - **Tab 2:** Navigate to `http://localhost:3000/organizer` (Select *Quick Access* to log in as an Organizer).
2. **Trigger Congestion:** On the **Organizer Tab**, click the blue **"Simulate Gate Congestion"** button on the top-right command header.
3. **Telemetry Spikes:** On the Organizer screen, notice:
   - Gate C's waiting time spikes to **48 minutes** and occupancy rises in the telemetry list.
   - The **3D Digital Twin** reflects the change: Gate C's status cylinder flashes warning-red, and Zone 1 (East entrance) turns red on the capacity heatmap.
   - The **Safety Broadcast Approvals** workspace lists a new draft alert: *"Gate C Overcrowding Warning: AI Vision detected crowd surge..."*
4. **Human-in-the-Loop Safeguard:** Shift back to the **Fan Tab**. Observe that **no alerts** have popped up yet. The public is protected from unverified system alarms.
5. **Approve Alert:** On the **Organizer Tab**, click **"Approve & Broadcast Alert"** on the warning card.
6. **Real-time Synchronization:** Instantly, on the **Fan Tab**:
   - A critical red safety banner pops up at the top: *"STADIUM ALERT: Gate C Overcrowding Warning..."*
   - A proactive nudge toast slides in: *"PROACTIVE NUDGE: Gate C is congested... Alternate Gate C2 is open."*
   - The interactive SVG entry map redraws the route to bypass Gate C and guides the fan through Gate C2 instead. If the Fan clicks **Quiet Route (Ramp)** on the floating accessibility menu, the path highlights the stairs-free ramps around Gate C2.

---

## API Documentation

The backend exposes a full swagger schema at `http://127.0.0.1:8000/docs` (when running locally).
For a static index of REST endpoints and Websocket payloads, read the [API Documentation](file:///e:/FanPulse%20AI/API_DOCUMENTATION.md).

---

## Deployment & Docker

FanPulse AI is production-ready and fully deployable:
- **Vercel & Render**: Use the included [render.yaml Blueprint](file:///e:/FanPulse%20AI/render.yaml) for one-click setup.
- **Docker**: Build and run both backend and frontend using the root [docker-compose.yml](file:///e:/FanPulse%20AI/docker-compose.yml).
  ```bash
  docker-compose up --build
  ```

For a comprehensive guide, read the [Deployment Guide](file:///e:/FanPulse%20AI/DEPLOYMENT.md).

---

## Testing

Backend test suites are powered by `pytest` and can be run using:
```bash
cd backend
python -m pytest
```
For more information about frontend type checking and compilation, view the [Testing Guide](file:///e:/FanPulse%20AI/TESTING_GUIDE.md).

---

## License

This project is licensed under the MIT License - see the [LICENSE](file:///e:/FanPulse%20AI/LICENSE) file for details.
