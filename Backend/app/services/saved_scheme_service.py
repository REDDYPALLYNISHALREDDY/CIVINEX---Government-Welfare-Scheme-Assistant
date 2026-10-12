
from sqlalchemy.orm import Session

from app.models.saved_scheme import SavedScheme
from app.models.scheme import Scheme


def list_saved_schemes(
    db: Session,
    user_id: int,
) -> list[dict]:
    rows = (
        db.query(SavedScheme, Scheme)
        .join(Scheme, SavedScheme.scheme_id == Scheme.id)
        .filter(SavedScheme.user_id == user_id)
        .order_by(SavedScheme.created_at.desc())
        .all()
    )

    return [
        {
            "id": saved.id,
            "scheme_id": scheme.id,
            "created_at": saved.created_at,
            "name": scheme.name,
            "scheme_code": scheme.scheme_code,
            "description": scheme.description,
            "government_level": scheme.government_level,
            "state": scheme.state,
            "category": scheme.category,
            "official_url": scheme.official_url,
            "benefits": scheme.benefits,
        }
        for saved, scheme in rows
    ]


def save_scheme(
    db: Session,
    user_id: int,
    scheme_id: int,
) -> SavedScheme:
    saved = SavedScheme(
        user_id=user_id,
        scheme_id=scheme_id,
    )
    db.add(saved)
    db.commit()
    db.refresh(saved)
    return saved


def remove_saved_scheme(
    db: Session,
    user_id: int,
    scheme_id: int,
) -> bool:
    saved = (
        db.query(SavedScheme)
        .filter(
            SavedScheme.user_id == user_id,
            SavedScheme.scheme_id == scheme_id,
        )
        .first()
    )

    if saved is None:
        return False

    db.delete(saved)
    db.commit()
    return True
