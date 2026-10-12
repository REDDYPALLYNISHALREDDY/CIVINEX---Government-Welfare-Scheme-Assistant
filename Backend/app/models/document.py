
from datetime import datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )
    scheme_id: Mapped[int] = mapped_column(
        ForeignKey("schemes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    uploaded_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    original_filename: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    storage_path: Mapped[str] = mapped_column(
        String(1024),
        nullable=False,
    )
    source_url: Mapped[str | None] = mapped_column(
        String(2048),
        nullable=True,
    )
    document_version: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )
    processing_status: Mapped[str] = mapped_column(
        String(30),
        default="pending",
        nullable=False,
    )
    extracted_text: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    scheme: Mapped["Scheme"] = relationship(
        back_populates="documents",
    )
    uploaded_by: Mapped["User | None"] = relationship(
        back_populates="documents",
        foreign_keys=[uploaded_by_user_id],
    )
