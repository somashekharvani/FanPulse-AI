import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.core.database import Base, get_db
from app.core.config import settings
from app.models.models import User, Incident, AuditLog

# Configure a temporary file SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_fanpulse.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Override database session dependency
def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

client = TestClient(app)

def test_user_registration_and_login():
    # 1. Register a new organizer user
    reg_response = client.post(
        f"{settings.API_V1_STR}/auth/register",
        json={
            "email": "organizer@test.com",
            "password": "TestPassword123!",
            "role": "organizer"
        }
    )
    assert reg_response.status_code == 201
    assert reg_response.json()["email"] == "organizer@test.com"
    assert reg_response.json()["role"] == "organizer"
    
    # 2. Login to retrieve token
    login_response = client.post(
        f"{settings.API_V1_STR}/auth/login",
        json={
            "email": "organizer@test.com",
            "password": "TestPassword123!"
        }
    )
    assert login_response.status_code == 200
    assert "access_token" in login_response.json()
    assert login_response.json()["role"] == "organizer"

def test_rbac_protection():
    # 1. Register a fan user
    client.post(
        f"{settings.API_V1_STR}/auth/register",
        json={
            "email": "fan@test.com",
            "password": "TestPassword123!",
            "role": "fan"
        }
    )
    
    # 2. Login as fan
    login_res = client.post(
        f"{settings.API_V1_STR}/auth/login",
        json={
            "email": "fan@test.com",
            "password": "TestPassword123!"
        }
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 3. Attempt to trigger congestion simulation (restricted to organizer)
    sim_res = client.post(
        f"{settings.API_V1_STR}/venue/simulate-congestion",
        headers=headers
    )
    assert sim_res.status_code == 403
    assert "forbidden" in sim_res.json()["detail"].lower()

def test_one_demo_flow():
    # 1. Register and login as organizer
    client.post(
        f"{settings.API_V1_STR}/auth/register",
        json={
            "email": "admin@stadium.com",
            "password": "AdminPassword123!",
            "role": "organizer"
        }
    )
    login_res = client.post(
        f"{settings.API_V1_STR}/auth/login",
        json={
            "email": "admin@stadium.com",
            "password": "AdminPassword123!"
        }
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Trigger "Simulate Gate Congestion" flow
    response = client.post(
        f"{settings.API_V1_STR}/venue/simulate-congestion",
        headers=headers
    )
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["status"] == "success"
    assert "incident_id" in res_data["data"]
    assert res_data["data"]["gate_status"]["queue_length"] == 120
    assert res_data["data"]["gate_status"]["wait_time_min"] == 48
    
    # 3. Check that draft incident was added
    db = TestingSessionLocal()
    try:
        incident = db.query(Incident).filter(Incident.id == res_data["data"]["incident_id"]).first()
        assert incident is not None
        assert incident.title == "Gate C Overcrowding Warning"
        assert incident.status == "reported"  # Under review (Human-in-the-loop)
        
        # 4. Check audit log
        audit = db.query(AuditLog).filter(AuditLog.action == "congestion_simulation_triggered").first()
        assert audit is not None
        assert "Gate C" in audit.details
    finally:
        db.close()

def test_venue_endpoints():
    # Register and login as organizer
    client.post(
        f"{settings.API_V1_STR}/auth/register",
        json={
            "email": "organizer_val@test.com",
            "password": "TestPassword123!",
            "role": "organizer"
        }
    )
    login_res = client.post(
        f"{settings.API_V1_STR}/auth/login",
        json={
            "email": "organizer_val@test.com",
            "password": "TestPassword123!"
        }
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Test /config
    config_res = client.get(f"{settings.API_V1_STR}/venue/config")
    assert config_res.status_code == 200
    assert config_res.json()["stadium"] == "AT&T Stadium"
    assert config_res.json()["city"] == "Dallas"

    # 2. Test /health
    health_res = client.get(f"{settings.API_V1_STR}/venue/health")
    assert health_res.status_code == 200
    assert health_res.json()["database"] == "Healthy"

    # 3. Test /simulate-forecast
    forecast_res = client.post(f"{settings.API_V1_STR}/venue/simulate-forecast", headers=headers)
    assert forecast_res.status_code == 200
    assert forecast_res.json()["status"] == "success"
    
    # 4. Test /forecast-state
    forecast_state_res = client.get(f"{settings.API_V1_STR}/venue/forecast-state", headers=headers)
    assert forecast_state_res.status_code == 200
    assert "gate_status" in forecast_state_res.json()

def test_ticket_upload():
    # Register and login as fan
    client.post(
        f"{settings.API_V1_STR}/auth/register",
        json={
            "email": "fan_val@test.com",
            "password": "TestPassword123!",
            "role": "fan"
        }
    )
    login_res = client.post(
        f"{settings.API_V1_STR}/auth/login",
        json={
            "email": "fan_val@test.com",
            "password": "TestPassword123!"
        }
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Prepare mock file
    files = {"ticket_image": ("ticket_gate_b_vip_accessible.png", b"fake image bytes", "image/png")}
    
    ticket_res = client.post(f"{settings.API_V1_STR}/venue/analyze-ticket", headers=headers, files=files)
    assert ticket_res.status_code == 200
    data = ticket_res.json()
    assert data["ticket_details"]["assigned_gate"] == "Gate B"
    assert data["ticket_details"]["vip"] is True
    assert data["ticket_details"]["accessibility"] == "Step-free"
    assert "why" in data["recommendation"]
    assert "confidence" in data["recommendation"]

