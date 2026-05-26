"""Application settings (pydantic-settings; no magic strings, invariant 5)."""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://kronos:kronos@localhost:5432/kronos"
    redis_url: str = "redis://localhost:6379/0"
    api_secret_key: str = "change_me_to_a_long_random_string"
    cors_origins: str = "http://localhost:3000"
    ml_service_url: str = "http://localhost:8001"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
