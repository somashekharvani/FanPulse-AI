# FanPulse AI: Data Privacy Shield

This document explains the privacy-by-design principles, tracking limits, and user consent controls in FanPulse AI.

---

## 1. Zero CCTV & Biometrics Policy
FanPulse AI explicitly prohibits the use of biometric and facial-recognition capabilities:
- **No Face Recognition**: Crowd density and gate wait times are measured using generic infrared counters and head-count telemetry. No identifying image data is captured.
- **Privacy-Safe Volunteer Matching**: Lost child alerts (e.g. child lost in Food Court) match coordinates and locations manually entered by parents. The system does not scan the crowd via CCTV video streams.

---

## 2. Granular User Consent Manager
Inside the Fan Companion portal (`/fan`), users have access to a dedicated **Consent Manager Panel**:
- **Granular Controls**: Toggles to allow/deny storing match history, preference logs, accessibility needs, and GPS navigation locations.
- **Right to Download**: Click **"Download My Data Profile"** to instantly export a local copy of all personal metadata stored in the local SQLite engine.
- **Right to be Forgotten**: Click **"Wipe Profile Data"** to execute a total SQL delete, completely flushing all references, preference vectors, and logged data from the database.

---

## 3. Location Sharing Opt-in
- **Strictly Opt-In**: GPS coordinates sharing is fully disabled by default. It is only activated after creating a travel group inside the **FanPulse Match Day Companion AI**.
- **Offline Fallback**: Users can toggle "Simulate Offline" at any time. When active, location broadcasts are immediately paused, keeping coordinate telemetry completely local.
