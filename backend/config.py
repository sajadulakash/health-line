from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    APP_NAME: str = "Health Line"
    DEBUG: bool = False  # controls SQLAlchemy echo; keep off to avoid logging every query
    DATABASE_URL: str
    ASYNC_DATABASE_URL: str
    UPLOAD_DIR: str = "uploads/images"

    class Config:
        env_file = ".env"
        extra = "ignore"  # .env is shared with the frontend (VITE_* vars)


@lru_cache()
def get_settings() -> Settings:
    return Settings()
