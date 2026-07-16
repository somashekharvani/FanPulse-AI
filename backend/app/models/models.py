import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="fan", nullable=False)  # fan, volunteer, organizer, security
    
    # Security/Privacy
    mfa_secret = Column(String, nullable=True)
    mfa_enabled = Column(Boolean, default=False, nullable=False)
    preferences_consented = Column(Boolean, default=False, nullable=False)  # Privacy compliance toggle
    
    # Digital Passport Profile Details
    ticket_info = Column(JSON, nullable=True)
    language_preference = Column(String, default="en", nullable=False)
    accessibility_needs = Column(String, default="standard", nullable=False)
    emergency_contact = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    # Relationships
    assigned_incidents = relationship("Incident", back_populates="assigned_volunteer", foreign_keys="Incident.assigned_volunteer_id")
    tasks = relationship("Task", back_populates="volunteer")


class VenueState(Base):
    __tablename__ = "venue_states"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True, nullable=False)
    
    # Store dynamic stadium states as JSON objects
    gate_status = Column(JSON, nullable=False)
    zone_occupancy = Column(JSON, nullable=False)
    concessions = Column(JSON, nullable=False)
    weather_transit = Column(JSON, nullable=False)


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    location = Column(String, nullable=False)  # e.g., "Gate C", "Zone A"
    severity = Column(String, default="medium", nullable=False)  # low, medium, high, critical
    status = Column(String, default="reported", nullable=False)  # reported, approved, dispatched, resolved
    reporter_role = Column(String, nullable=False)  # fan, volunteer, security, system
    
    assigned_volunteer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)

    # Relationships
    assigned_volunteer = relationship("User", back_populates="assigned_incidents", foreign_keys=[assigned_volunteer_id])


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    volunteer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    status = Column(String, default="pending", nullable=False)  # pending, in_progress, completed
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    # Relationships
    volunteer = relationship("User", back_populates="tasks")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True, nullable=False)
    performed_by = Column(String, nullable=False)  # User email or system
    action = Column(String, nullable=False)  # login, mfa_verify, alert_approved, simulation_run, etc.
    details = Column(String, nullable=False)
