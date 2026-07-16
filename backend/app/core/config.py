import os
from typing import List, Union
from pydantic import AnyHttpUrl, validator
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "FanPulse AI"
    API_V1_STR: str = "/api/v1"
    
    # Auth configuration
    SECRET_KEY: str = os.getenv("JWT_SECRET", "super-secret-key-for-development-only-replace-in-production")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./fanpulse.db")
    
    # Flagship Stadium Configurations
    FLAGSHIP_STADIUM: str = os.getenv("FLAGSHIP_STADIUM", "Dallas")
    FLAGSHIP_VENUE_NAME: str = os.getenv("FLAGSHIP_VENUE_NAME", "AT&T Stadium")
    
    # AI API Keys
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    
    # MFA Settings
    MFA_ISSUER: str = "FanPulseAI"
    
    # CORS Origins
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
