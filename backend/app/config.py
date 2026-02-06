"""
Configuration settings for PayMeJunior backend
"""
import os
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # API Keys
    anthropic_api_key: str = ""

    # Supabase
    supabase_url: str = ""
    supabase_key: str = ""

    # App settings
    app_name: str = "PayMeJunior API"
    debug: bool = False

    # CORS
    cors_origins: list[str] = ["*"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()
