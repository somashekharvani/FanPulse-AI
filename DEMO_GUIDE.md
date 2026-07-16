# FanPulse AI: E2E Demo & Judging Presentation Guide

This guide walks through the exact 8-minute presentation scenario to show off FanPulse AI during hackathon judging.

---

## 1. Preparation
1. Open two browser windows side-by-side:
   - **Left Window**: `http://localhost:3000/fan` (Select *Quick Access* to log in as Fan Somashekhar).
   - **Right Window**: `http://localhost:3000/organizer` (Select *Quick Access* to log in as Organizer).

---

## 2. Walkthrough Flow

### Phase 1: Core Operations (2 Mins)
- **Ticket Parsing**: Show that Somashekhar's Match Ticket was scanned and automatically unlocked seating in **Section 104**.
- **Local Companion**: Ask the AI companion a question (e.g. *"Where is my seat?"*). Note the grounding logs showing Why and Confidence.
- **Explainable AI**: Toggle the telemetry console to demonstrate transparency.

### Phase 2: Connect AI & Human Intelligence (3 Mins)
- **Connect AI**: In the Fan window, select the **Group Connect** tab. Toggle **Create Group** to link coordinates for Somashekhar, Rahul, John, Maria, Robert. Show the Stadium Mini Map.
- **Smart Meeting Point AI**: Switch to **Group Navigation** to show walking times to FC-03.
- **Assistance / Lost Child**: Toggle **Simulate Low Battery** or file a **Lost Child Volunteer Search** for Aarav (7 Years). Observe how the system dispatches volunteers without CCTV.
- **AI SOS Button**: Trigger the SOS alert and notice the volunteer dispatch ETA countdown.

### Phase 3: Global Command Operations (3 Mins)
- **Command Center**: Navigate to `/global` to view all 16 host cities and the rotating 3D World Globe.
- **Autopilot Sim**: Return to the Organizer dashboard. Select **Demo Mode** and click **Start Autopilot Demo**.
- **Crisis Resolution**: Watch the crisis commander flow process through:
  `Observe ➔ Understand ➔ Predict ➔ Reason ➔ Recommend ➔ Approve ➔ Execute ➔ Success`
- **Global Impact Summary**: Show the final splash screen summarizing the averted crisis, composite scores, and thank-you credits.
