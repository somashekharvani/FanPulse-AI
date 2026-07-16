# FanPulse AI: Security Implementation Policies

This document outlines the security measures, cryptography practices, and compliance protocols built into FanPulse AI.

---

## 1. Authentication & Session Integrity
- **Password Hashing**: Stored passwords are cryptographically salted and hashed using `bcrypt` (rounds = 12).
- **JWT tokens**: Sessions are verified via secure HS256-signed JSON Web Tokens containing sub claims and expiry timestamps.
- **Refresh Token Rotation**: Upon expiry, access tokens are refreshed using rotated refresh tokens. Expired or reused refresh tokens immediately invalidate the entire session to prevent replay attacks.
- **Organizer MFA**: Any account registered with the `organizer` role requires Multi-Factor Authentication via TOTP.

---

## 2. Telemetry Flow Security
- **Event Bus Access Control**: WebSockets require authentication headers. Telemetry modification endpoints are strictly restricted to role-authenticated organizers (`Role = organizer`) and security dispatchers (`Role = security`).
- **Input Sanitization**: All incoming inputs (text prompts, API inputs) are sanitized and validated using Pydantic schemas to prevent SQL injection and cross-site scripting (XSS).

---

## 3. Threat Simulator Controls
- **Human-In-The-Loop**: AI-generated emergency evacuation notifications cannot bypass human operator authorization. Organizers must review and click "Approve" before alerts are signed and broadcasted to fans.
- **Immutable Security Logs**: evens such as `ALERT_APPROVED`, `EVAC_PROTOCOL_ACTIVATED`, and `MFA_FAILED` write directly to an audit database table with write-once/no-modify rules.
