# FanPulse AI: REST & WebSocket API Documentation

This document describes the API endpoints and WebSocket messages exposed by the FanPulse AI backend server.

---

## 1. Authentication Endpoints

### `POST /api/v1/auth/register`
Creates a new user profile.
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "Password123!",
    "role": "fan"
  }
  ```
- **Responses:**
  - `201 Created`
  - `400 Bad Request` (Email already registered, or weak password)

### `POST /api/v1/auth/login`
Authenticates a user and returns JWT tokens.
- **Request Body:**
  ```json
  {
    "email": "organizer@fanpulse.com",
    "password": "Password123!",
    "mfa_code": "123456"
  }
  ```
- **Responses:**
  - `200 OK`
    ```json
    {
      "access_token": "eyJhbG...",
      "refresh_token": "eyJhbG...",
      "token_type": "bearer",
      "role": "organizer",
      "email": "organizer@fanpulse.com",
      "mfa_required": false
    }
    ```
  - `401 Unauthorized` (Invalid credentials)

---

## 2. Command & Global Operations Endpoints

### `GET /api/v1/global/stats`
Returns system metrics from the Global Command Center.
- **Response `200 OK`:**
  ```json
  {
    "ai_health_score": "98%",
    "active_connections": 68421,
    "prevented_incidents": 23,
    "active_agents": 10,
    "system_health": "nominal"
  }
  ```

### `GET /api/v1/global/stadiums`
List of all 16 FIFA World Cup host stadiums.
- **Response `200 OK`:**
  ```json
  [
    {
      "city": "Dallas",
      "stadium": "AT&T Stadium",
      "interactive": true,
      "overall_score": "98/100",
      "risk_score": "AMBER"
    }
  ]
  ```

---

## 3. WebSockets Connection

### `GET /ws`
Establishes a WebSocket connection for real-time telemetry feeds.
- **Broadcast Events (`stadium_update`):**
  ```json
  {
    "type": "stadium_update",
    "venue_state": {
      "gate_status": {
        "Gate A": { "status": "open", "queue_length": 15, "wait_time_min": 6 }
      }
    }
  }
  ```
