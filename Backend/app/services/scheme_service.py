
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.scheme import Scheme
from app.schemas.scheme import SchemeCreate


def list_schemes(
    db: Session,
    search: str | None = None,
    government_level: str | None = None,
    state: str | None = None,
    skip: int = 0,
    limit: int = 20,
) -> list[Scheme]:
    statement = select(Scheme).where(Scheme.is_active.is_(True))

    if search:
        term = f"%{search.strip()}%"
        statement = statement.where(
            or_(
                Scheme.name.ilike(term),
                Scheme.scheme_code.ilike(term),
                Scheme.description.ilike(term),
            )
        )

    if government_level:
        statement = statement.where(
            Scheme.government_level == government_level.lower()
        )

    
    if state:
        statement = statement.where(
            Scheme.state.ilike(f"%{state.strip()}%")
        )


    statement = statement.order_by(Scheme.name, Scheme.id)
    statement = statement.offset(skip).limit(limit)

    return list(db.scalars(statement).all())


def get_scheme_by_id(
    db: Session,
    scheme_id: int,
) -> Scheme | None:
    statement = select(Scheme).where(
        Scheme.id == scheme_id,
        Scheme.is_active.is_(True),
    )
    return db.scalar(statement)


def create_scheme(
    db: Session,
    payload: SchemeCreate,
) -> Scheme:
    scheme_data = payload.model_dump()

    # Pydantic's HttpUrl is converted to a plain string for the database.
    if scheme_data["official_url"] is not None:
        scheme_data["official_url"] = str(
            scheme_data["official_url"]
        )

    if scheme_data["scheme_code"] is not None:
        scheme_data["scheme_code"] = (
            scheme_data["scheme_code"].strip() or None
        )

    scheme = Scheme(**scheme_data)
    db.add(scheme)

    try:
        db.commit()
        db.refresh(scheme)
        return scheme
    except IntegrityError:
        db.rollback()
        raise
