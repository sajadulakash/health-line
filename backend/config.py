from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    APP_NAME: str = "Health Line"
    DEBUG: bool = True
    DATABASE_URL: str
    ASYNC_DATABASE_URL: str
    UPLOAD_DIR: str = "uploads/images"

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
