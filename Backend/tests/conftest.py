
import pytest

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.main import app
from app.models.user import User
from app.core.security import hash_password, create_access_token

# SQLite is used only for automated tests.
# The application continues to use PostgreSQL.
test_engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(
    bind=test_engine,
    class_=Session,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
)


@pytest.fixture()
def db_session():
    Base.metadata.create_all(bind=test_engine)

    with TestingSessionLocal() as session:
        yield session

    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture()
def client(db_session):
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.clear()


@pytest.fixture()
def citizen_user(db_session):
    user = User(
        full_name="Test Citizen",
        email="citizen@example.com",
        password_hash=hash_password("TestPassword123!"),
        role="citizen",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture()
def admin_user(db_session):
    user = User(
        full_name="Test Administrator",
        email="admin@example.com",
        password_hash=hash_password("AdminPassword123!"),
        role="admin",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture()
def citizen_token(citizen_user):
    return create_access_token(subject=str(citizen_user.id))


@pytest.fixture()
def admin_token(admin_user):
    return create_access_token(subject=str(admin_user.id))


@pytest.fixture()
def citizen_headers(citizen_token):
    return {"Authorization": f"Bearer {citizen_token}"}


@pytest.fixture()
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}
