# FanPulse AI: Database Schema

This document details the relational database schema used in the SQLite core database (`fanpulse.db`).

---

## Entity-Relationship Layout

### 1. `users` Table
Stores authentication profiles and role permissions.

| Column | Type | Constraints | Description |
| --- | --- | --- | --- |
| `id` | INTEGER | Primary Key, Autoincrement | Unique record ID |
| `email` | VARCHAR(128) | Unique, Index, Not Null | Account email address |
| `hashed_password` | VARCHAR(256) | Not Null | Password bcrypt hash |
| `role` | VARCHAR(32) | Not Null | Access Role: `organizer`, `volunteer`, `security`, `fan` |
| `mfa_enabled` | BOOLEAN | Default: `False` | Organizer TOTP validator flag |
| `mfa_secret` | VARCHAR(64) | Nullable | TOTP seed string |
| `preferences_consented` | BOOLEAN | Default: `False` | Opt-in privacy consent flag |

### 2. `stadium_configs` Table
Dynamic configurations for stadium parameters.

| Column | Type | Constraints | Description |
| --- | --- | --- | --- |
| `id` | INTEGER | Primary Key, Autoincrement | Unique config ID |
| `city` | VARCHAR(64) | Unique, Not Null | Host City name (e.g. `Dallas`, `Toronto`) |
| `stadium_name` | VARCHAR(128) | Not Null | Venue name (e.g. `AT&T Stadium`) |
| `capacity` | INTEGER | Not Null | Venue passenger limit |

### 3. `audit_logs` Table
Immutable log database to ensure security and situational audits.

| Column | Type | Constraints | Description |
| --- | --- | --- | --- |
| `id` | INTEGER | Primary Key, Autoincrement | Log ID |
| `timestamp` | DATETIME | Default: `CURRENT_TIMESTAMP` | Action time |
| `actor` | VARCHAR(128) | Not Null | Operator email/service name |
| `action` | VARCHAR(128) | Not Null | Log action tag (e.g. `ALARM_TRIGGERED`) |
| `details` | TEXT | Nullable | JSON metadata string |
