
from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "Government Welfare Scheme Assistant"
    APP_VERSION: str = "0.1.0"
    ENVIRONMENT: str = "development"
    API_V1_PREFIX: str = "/api/v1"
    CORS_ORIGINS: str = "http://localhost:5173"

    DATABASE_URL: str = Field(
        ...,
        description="PostgreSQL connection URL",
        repr=False,
    )

    JWT_SECRET_KEY: str = Field(repr=False)
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Protected primary administrator
    PRIMARY_ADMIN_EMAIL: str = ""
    PRIMARY_ADMIN_NAME: str = "JanSahay Primary Administrator"
    PRIMARY_ADMIN_PASSWORD: str = Field(
        default="",
        repr=False,
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @property
    def cors_origins_list(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.CORS_ORIGINS.split(",")
            if origin.strip()
        ]

    @property
    def primary_admin_email_normalized(self) -> str:
        return self.PRIMARY_ADMIN_EMAIL.strip().lower()


@lru_cache
def get_settings() -> Settings:
    return Settings()
