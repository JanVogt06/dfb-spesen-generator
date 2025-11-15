"""
Authentication Endpoints - Register und Login mit JWT
Ganz einfach, nur das Noetigste
"""
from fastapi import APIRouter, HTTPException, status, Depends, Header
from pydantic import BaseModel, EmailStr
from typing import Optional

from db.database import create_user, get_user_by_email, get_user_by_id
from core.security import hash_password, verify_password, create_access_token, decode_access_token

router = APIRouter(prefix="/api/auth", tags=["authentication"])


# ===== Request/Response Models =====

class RegisterRequest(BaseModel):
    """Register-Anfrage"""
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    """Login-Anfrage"""
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    """Auth-Antwort mit Token"""
    access_token: str
    token_type: str = "bearer"
    user_id: int
    email: str


class UserInfo(BaseModel):
    """User-Informationen"""
    user_id: int
    email: str


# ===== Dependency: Get Current User =====

async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    """
    Extrahiert User aus JWT Token.

    Wird als Dependency verwendet: current_user = Depends(get_current_user)
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nicht angemeldet - Token fehlt"
        )

    # Token aus "Bearer TOKEN" extrahieren
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Ungültiges Token-Format"
            )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Ungültiges Token-Format"
        )

    # Token dekodieren
    user_id = decode_access_token(token)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token ungültig oder abgelaufen"
        )

    # User aus DB holen
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User nicht gefunden"
        )

    return user


# ===== Endpoints =====

@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest):
    """
    Registriert neuen User und gibt Token zurueck.

    - Prueft ob Email schon existiert
    - Hasht Passwort sicher
    - Erstellt User in DB
    - Gibt JWT Token zurueck
    """
    # Pruefe ob Email schon existiert
    existing_user = get_user_by_email(request.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email bereits registriert"
        )

    # Hash Passwort
    password_hash = hash_password(request.password)

    # Erstelle User
    user_id = create_user(request.email, password_hash)

    # Erstelle Token
    token = create_access_token(user_id)

    return AuthResponse(
        access_token=token,
        user_id=user_id,
        email=request.email
    )


@router.post("/login", response_model=AuthResponse)
async def login(request: LoginRequest):
    """
    Login mit Email und Passwort, gibt Token zurueck.

    - Findet User in DB
    - Prueft Passwort
    - Gibt JWT Token zurueck
    """
    # Finde User
    user = get_user_by_email(request.email)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Falsche Email oder Passwort"
        )

    # Pruefe Passwort
    if not verify_password(request.password, user['password_hash']):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Falsche Email oder Passwort"
        )

    # Erstelle Token
    token = create_access_token(user['id'])

    return AuthResponse(
        access_token=token,
        user_id=user['id'],
        email=user['email']
    )


@router.get("/me", response_model=UserInfo)
async def get_me(current_user: dict = Depends(get_current_user)):
    """
    Gibt Informationen ueber aktuell eingeloggten User zurueck.
    Benoetigt Token im Authorization Header.
    """
    return UserInfo(
        user_id=current_user['id'],
        email=current_user['email']
    )