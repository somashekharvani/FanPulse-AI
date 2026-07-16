# FanPulse AI: System Design Specifications

This document describes the design patterns, event flows, and coordination mechanisms in the FanPulse AI Operating System.

---

## 1. Real-Time Event Bus & Broadcast Flow
To support dynamic synchronization, the backend manages an in-memory event-driven broadcaster loop:
1. **Telemetry Simulator**: Runs a background task ticking every second, adjusting crowd capacities, gate queue lengths, and rain probabilities.
2. **WebSocket Publisher**: Whenever telemetry values adjust, the server publishes a JSON payload (`stadium_update`) to all connected client sessions at `/ws`.
3. **Safety Broadcaster (Human-In-The-Loop)**:
   - When a simulation spikes, the AI creates a draft incident alert.
   - The alert remains hidden from public feeds until the Organizer approves it.
   - Upon clicking **Approve & Broadcast**, the event bus sends an urgent payload (`stadium_alert`) to immediately re-route fans.

---

## 2. Multi-Agent Reasoning Pipeline
When a user asks a query or a crisis is simulated, the Agent Orchestrator manages a structured execution chain:
```
Observe ➔ Understand ➔ Predict ➔ Reason ➔ Recommend ➔ Approve ➔ Execute ➔ Success
```

Each step logs:
- **Agents Involved**: Array of contributing AI agent names.
- **Confidence Rating**: Percentage representing calculation certainty.
- **Why Log**: Plain-text rationale grounded in the World Model telemetry.
- **Multilingual Translation**: Grounded in standard translations to support 12 languages.

---

## 3. Privacy-Safe Group Tracking
Unlike standard crowd trackers, FanPulse Connect AI uses a strict privacy-first model:
- **No Biometric Scanning**: Zero facial recognition database lookups.
- **No CCTV Tracking**: Zero raw video feeds processed for personal identification.
- **Opt-In Location Coordinates**: Location sharing is strictly GPS-based and is only active after the user clicks the "Create Group" consent toggle.
- **Local Fallback Offline Mode**: When simulated internet connectivity is disabled, location sharing is fully paused, and the client displays locally cached seat directions and security frequencies.
