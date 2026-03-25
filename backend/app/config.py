from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str = "postgresql://tavola:tavola123@localhost:5432/tavolaperfetta"
    gemini_api_key: str = ""

    # Supabase
    supabase_url: str = ""
    supabase_jwt_secret: str = ""

    # CORS
    frontend_url: str = "http://localhost:3000"

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()
