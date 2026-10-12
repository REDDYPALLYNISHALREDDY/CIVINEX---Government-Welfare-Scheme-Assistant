
from datetime import datetime, timedelta, timezone

from jose import jwt
from pwdlib import PasswordHash

from app.core.config import get_settings


password_hash = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(
    plain_password: str,
    hashed_password: str,
) -> bool:
    return password_hash.verify(
        plain_password,
        hashed_password,
    )


def create_access_token(subject: str) -> str:
    settings = get_settings()

    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )

    return jwt.encode(
        {"sub": subject, "exp": expires_at},
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )
