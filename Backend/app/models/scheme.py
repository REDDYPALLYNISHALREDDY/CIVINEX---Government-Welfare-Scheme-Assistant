
from datetime import datetime
from typing import Any

from sqlalchemy import (
    Boolean,
    DateTime,
    Integer,
    JSON,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship, Mapped

from app.core.database import Base


class Scheme(Base):
    __tablename__ = "schemes"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )
    scheme_code: Mapped[str | None] = mapped_column(
        String(100),
        unique=True,
        nullable=True,
    )
    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    government_level: Mapped[str] = mapped_column(
        String(30),
        default="central",
        nullable=False,
    )
    state: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        index=True,
    )
    category: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        index=True,
    )
    official_url: Mapped[str | None] = mapped_column(
        String(2048),
        nullable=True,
    )
    
    eligibility_rules: Mapped[dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
    )

    benefits: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    documents: Mapped[list["Document"]] = relationship(
        back_populates="scheme",
        cascade="all, delete-orphan",
    )
