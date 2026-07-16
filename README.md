# FanPulse AI — FIFA World Cup 2026 Stadium Operations Console

FanPulse AI is aGenerative AI stadium-operations and crowd-safety management platform tailored for the FIFA World Cup 2026. It integrates real-time telemetry simulations, role-based dashboards, a 3D Digital Twin, and grounded conversational AI.

---

## Architectural Design Overview

FanPulse AI splits responsibility cleanly between a responsive frontend and a secure, time-series telemetry backend:

1. **FastAPI Backend (`/backend`):**
   - Implements JWT authentication, refresh-token rotation, and multi-factor validation.
   - Manages a background simulation loop modeling stadium gates, zone capacity, concessions queues, and transit frequencies.
   - Grounded `AIService` module integrates Gemini API (`gemini-1.5-flash`) using retrieval-augmented prompting with system instructions isolated for safety. It falls back to a rules-based mock engine if API credentials are omitted.
   - Broadcaster socket (`/ws`) synchronizes the unified telemetry state + active safety incidents to all connected WebSockets in real time.
   - Immutable audit logs capture sensitive security updates.

2. **Next.js Frontend (`/frontend`):**
   - Built with Next.js App Router (TypeScript) and styled using glassmorphic card panels, neon warning alerts, and Framer Motion micro-interactions.
   - Integrates floating Accessibility settings (text scaling, high-contrast, voice reader synthesizers, and ramp/step-free route selection).
   - Unified Role-Based Portals:
     - **Fan:** Telemetry metrics, interactive SVG navigation map, and voice-mic chat companion.
     - **Volunteer:** Assigned tasks checklists, live broadcast alerts, and AI copilot advisor.
     - **Security:** Dispatch dispatcher to file incidents and deploy volunteers.
     - **Organizer:** command dashboard, situation summaries, human-in-loop approvals workspace, and the **3D Digital Twin** built on Three.js (`react-three-fiber`).

---

## Installation & Setup

Ensure you have **Node.js (v20+)** and **Python (3.11+)** installed.

### 1. Backend Setup
1. Open your terminal and navigate to `/backend`.
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
   *(Optional)* Paste your `GEMINI_API_KEY` in `.env` to enable live Gemini prompts. Leave it empty to use the deterministic grounded local mock engine.
5. Start the FastAPI server:
   ```bash
   python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```
   *The database schema (`fanpulse.db`) will automatically seed on startup.*

### 2. Frontend Setup
1. Open a separate terminal and navigate to `/frontend`.
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

- **Organizer / Command Center:** `organizer@fanpulse.com` (MFA Code: `123456`)
- **Volunteer Responder:** `volunteer@fanpulse.com`
- **Security Dispatcher:** `security@fanpulse.com`
- **Fan Companion:** `fan@fanpulse.com`
*Password for all: `Password123!`*

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
