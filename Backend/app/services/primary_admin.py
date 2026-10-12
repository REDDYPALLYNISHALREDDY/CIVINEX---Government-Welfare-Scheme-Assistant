
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import hash_password
from app.models.user import User


def ensure_primary_admin(db: Session) -> None:
    settings = get_settings()

    email = settings.primary_admin_email_normalized
    password = settings.PRIMARY_ADMIN_PASSWORD

    if not email or not password:
        raise RuntimeError(
            "PRIMARY_ADMIN_EMAIL and "
            "PRIMARY_ADMIN_PASSWORD must be configured."
        )

    if len(password) < 11:
        raise RuntimeError(
            "The primary administrator password must "
            "contain at least 12 characters."
        )

    admin = (
        db.query(User)
        .filter(func.lower(User.email) == email)
        .first()
    )

    if admin is None:
        admin = User(
            full_name=settings.PRIMARY_ADMIN_NAME.strip(),
            email=email,
            password_hash=hash_password(password),
            role="admin",
            is_active=True,
        )
        db.add(admin)
    else:
        # Restore privileges without changing the password.
        admin.role = "admin"
        admin.is_active = True

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
