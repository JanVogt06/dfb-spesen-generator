"""
Encryption Modul - Verschluesselung fuer DFB-Credentials
Nutzt Fernet (symmetrische Verschluesselung)
"""
import os
from cryptography.fernet import Fernet


def get_encryption_key() -> bytes:
    """
    Holt Encryption Key aus .env.

    Returns:
        Encryption Key als bytes
    """
    key = os.getenv("ENCRYPTION_KEY")
    if not key:
        raise ValueError(
            "ENCRYPTION_KEY muss in .env gesetzt sein! "
            "Generiere einen mit: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
        )
    return key.encode()


def encrypt_credential(plaintext: str) -> str:
    """
    Verschluesselt einen String (z.B. Passwort).

    Args:
        plaintext: Klartext

    Returns:
        Verschluesselter String (base64)
    """
    if not plaintext:
        return ""

    key = get_encryption_key()
    fernet = Fernet(key)

    encrypted = fernet.encrypt(plaintext.encode())
    return encrypted.decode()


def decrypt_credential(encrypted: str) -> str:
    """
    Entschluesselt einen String.

    Args:
        encrypted: Verschluesselter String (base64)

    Returns:
        Klartext
    """
    if not encrypted:
        return ""

    key = get_encryption_key()
    fernet = Fernet(key)

    decrypted = fernet.decrypt(encrypted.encode())
    return decrypted.decode()