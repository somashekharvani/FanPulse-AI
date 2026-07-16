import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core import auth
from app.core.config import settings
from app.core.database import get_db
from app.models.models import User, AuditLog
from app.models.schemas import (
    UserCreate, UserLogin, UserResponse, Token, TokenRefreshRequest,
    MfaSetupResponse, MfaVerifyRequest, UserConsent
)

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered."
        )
    
    hashed_password = auth.get_password_hash(user_in.password)
    new_user = User(
        email=user_in.email,
        hashed_password=hashed_password,
        role=user_in.role,
        mfa_enabled=False,
        preferences_consented=False
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Audit log
    audit = AuditLog(
        performed_by=new_user.email,
        action="user_registered",
        details=f"Account created successfully with role: {new_user.role}"
    )
    db.add(audit)
    db.commit()
    
    return new_user

@router.post("/login", response_model=Token)
def login(login_in: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_in.email).first()
    if not user or not auth.verify_password(login_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
        
    # Check if MFA is required
    if user.mfa_enabled:
        if not login_in.mfa_code:
            # Inform frontend that MFA code is required
            return Token(
                access_token="",
                refresh_token="",
                role=user.role,
                email=user.email,
                mfa_required=True
            )
        # Verify MFA
        if not auth.verify_mfa_code(user.mfa_secret, login_in.mfa_code):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid MFA verification code"
            )
            
    # Generate tokens
    access_token = auth.create_access_token(data={"sub": user.email, "role": user.role})
    refresh_token = auth.create_refresh_token(data={"sub": user.email})
    
    # Audit log
    audit = AuditLog(
        performed_by=user.email,
        action="user_login",
        details=f"Logged in successfully. MFA verification: {user.mfa_enabled}"
    )
    db.add(audit)
    db.commit()
    
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        role=user.role,
        email=user.email,
        mfa_required=False
    )

@router.post("/login-form", response_model=Token)
def login_form(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """OAuth2 password login form support for Swagger UI."""
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    access_token = auth.create_access_token(data={"sub": user.email, "role": user.role})
    refresh_token = auth.create_refresh_token(data={"sub": user.email})
    
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        role=user.role,
        email=user.email,
        mfa_required=False
    )

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(auth.get_current_user)):
    return current_user

@router.post("/mfa/setup", response_model=MfaSetupResponse)
def setup_mfa(current_user: User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    secret = auth.generate_mfa_secret()
    otpauth_url = auth.get_mfa_totp_uri(secret, current_user.email)
    
    # Temporarily store the secret, it is not enabled yet
    current_user.mfa_secret = secret
    db.add(current_user)
    db.commit()
    
    return MfaSetupResponse(
        secret=secret,
        otpauth_url=otpauth_url,
        qr_code_mock=f"https://api.qrserver.com/v1/create-qr-code/?size=200x200&data={otpauth_url}"
    )

@router.post("/mfa/enable", response_model=UserResponse)
def enable_mfa(verify_in: MfaVerifyRequest, current_user: User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    if not current_user.mfa_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA setup has not been initialized."
        )
        
    if not auth.verify_mfa_code(current_user.mfa_secret, verify_in.code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code is invalid."
        )
        
    current_user.mfa_enabled = True
    db.add(current_user)
    
    # Audit log
    audit = AuditLog(
        performed_by=current_user.email,
        action="mfa_enabled",
        details="MFA security option enabled."
    )
    db.add(audit)
    db.commit()
    db.refresh(current_user)
    
    return current_user

@router.post("/mfa/disable", response_model=UserResponse)
def disable_mfa(current_user: User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    current_user.mfa_enabled = False
    current_user.mfa_secret = None
    db.add(current_user)
    
    # Audit log
    audit = AuditLog(
        performed_by=current_user.email,
        action="mfa_disabled",
        details="MFA security option disabled."
    )
    db.add(audit)
    db.commit()
    db.refresh(current_user)
    
    return current_user

@router.post("/consent", response_model=UserResponse)
def update_consent(consent_in: UserConsent, current_user: User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    current_user.preferences_consented = consent_in.consent
    db.add(current_user)
    
    # Audit log
    audit = AuditLog(
        performed_by=current_user.email,
        action="consent_updated",
        details=f"Personalization preference consent set to: {consent_in.consent}"
    )
    db.add(audit)
    db.commit()
    db.refresh(current_user)
    
    return current_user

@router.post("/refresh", response_model=Token)
def refresh_token(refresh_in: TokenRefreshRequest, db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate refresh token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        from jose import jwt, JWTError
        payload = jwt.decode(refresh_in.refresh_token, settings.SECRET_KEY, algorithms=[auth.ALGORITHM])
        email: str = payload.get("sub")
        token_type: str = payload.get("type")
        if email is None or token_type != "refresh":
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
        
    # Generate new tokens (Rotation)
    access_token = auth.create_access_token(data={"sub": user.email, "role": user.role})
    new_refresh_token = auth.create_refresh_token(data={"sub": user.email})
    
    return Token(
        access_token=access_token,
        refresh_token=new_refresh_token,
        role=user.role,
        email=user.email,
        mfa_required=False
    )
