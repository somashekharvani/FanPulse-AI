# Workspace Customization Rules: Deployment Requirements

These guidelines enforce deployment readiness across environments for FanPulse AI.

## Deployment Requirements

FanPulse AI must be deployable using:
- Vercel
- Render
- Railway
- Docker
- Local Development

The project MUST support:
- localhost execution
- cloud deployment
- docker deployment
- production deployment

### Frontend Configuration
- Vercel Ready: Standard Next.js builds.

### Backend Configuration
- Render Ready: Configuration scripts for FastAPI.
- Railway Ready: Standard environments integration.

### Database Integration
- PostgreSQL database support.
- SQLite fallback when connection string is missing or invalid.

### Demo Stability
- The core demo MUST work using localhost, simulated telemetry, websocket services, and mock AI recommendations.
- No external API keys (such as live Gemini credentials) shall be required for the complete demo flow.
- Deployment configuration files must be included inside the repository.
