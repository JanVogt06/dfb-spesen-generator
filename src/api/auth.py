"""
Authentication Endpoints - Register und Login mit JWT + DFB-Credentials
"""
from fastapi import APIRouter, Depends, Header
from pydantic import BaseModel, EmailStr
from typing import Optional

from db.database import (
    create_user,
    get_user_by_email,
    get_user_by_id,
    update_dfb_credentials,
    get_dfb_credentials
)
from core.security import hash_password, verify_password, create_access_token, decode_access_token
from core.encryption import encrypt_credential, decrypt_credential
from core.errors import (
    AuthenticationError,
    ConflictError,
    ValidationError
)

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
    has_dfb_credentials: bool


class DFBCredentialsRequest(BaseModel):
    """DFB-Credentials Anfrage"""
    dfb_username: str
    dfb_password: str


class DFBCredentialsResponse(BaseModel):
    """DFB-Credentials Antwort"""
    success: bool
    message: str


# ===== Dependency: Get Current User =====

async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    """
    Extrahiert User aus JWT Token.

    Wird als Dependency verwendet: current_user = Depends(get_current_user)
    """
    if not authorization:
        raise AuthenticationError("Token fehlt")

    # Token aus "Bearer TOKEN" extrahieren
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise AuthenticationError("Ungültiges Token-Format")
    except ValueError:
        raise AuthenticationError("Ungültiges Token-Format")

    # Token dekodieren
    user_id = decode_access_token(token)
    if not user_id:
        raise AuthenticationError("Token ungültig oder abgelaufen")

    # User aus DB holen
    user = get_user_by_id(user_id)
    if not user:
        raise AuthenticationError("User nicht gefunden")

    return user


# ===== Endpoints =====

@router.post("/register", response_model=AuthResponse, status_code=201)
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
        raise ConflictError("Email bereits registriert")

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
        raise AuthenticationError("Falsche Email oder Passwort")

    # Pruefe Passwort
    if not verify_password(request.password, user['password_hash']):
        raise AuthenticationError("Falsche Email oder Passwort")

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
    # Pruefe ob User DFB-Credentials gespeichert hat
    dfb_creds = get_dfb_credentials(current_user['id'])

    return UserInfo(
        user_id=current_user['id'],
        email=current_user['email'],
        has_dfb_credentials=dfb_creds is not None
    )


@router.post("/dfb-credentials", response_model=DFBCredentialsResponse)
async def save_dfb_credentials(
    request: DFBCredentialsRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Speichert DFB-Credentials verschluesselt fuer den User.

    Diese Credentials werden automatisch beim Generieren verwendet,
    sodass der User sie nicht jedes Mal eingeben muss.
    """
    user_id = current_user['id']

    # Validierung
    if not request.dfb_username or not request.dfb_password:
        raise ValidationError("DFB Username und Passwort müssen angegeben werden")

    # Verschluesseln
    encrypted_username = encrypt_credential(request.dfb_username)
    encrypted_password = encrypt_credential(request.dfb_password)

    # In DB speichern
    update_dfb_credentials(user_id, encrypted_username, encrypted_password)

    return DFBCredentialsResponse(
        success=True,
        message="DFB-Credentials erfolgreich gespeichert"
    )


@router.get("/dfb-credentials/status")
async def check_dfb_credentials(current_user: dict = Depends(get_current_user)):
    """
    Prueft ob User DFB-Credentials gespeichert hat.
    """
    user_id = current_user['id']
    dfb_creds = get_dfb_credentials(user_id)

    return {
        "has_credentials": dfb_creds is not None,
        "message": "DFB-Credentials gespeichert" if dfb_creds else "Keine DFB-Credentials gespeichert"
    }