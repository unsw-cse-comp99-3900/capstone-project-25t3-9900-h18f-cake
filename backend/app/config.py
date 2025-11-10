# backend/app/config.py
from pathlib import Path
from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # basic setting
    app_env: str = Field(default="dev", alias="APP_ENV")
    secret_key: str = Field(..., alias="SECRET_KEY")
    access_token_expire_minutes: int = Field(default=120, alias="ACCESS_TOKEN_EXPIRE_MINUTES")

    # ---------- db setting ----------
    sqlalchemy_dsn: str = Field(default="sqlite:///./db/dev.db", alias="SQLALCHEMY_DSN")
    postgres_user: str | None = Field(default=None, alias="POSTGRES_USER")
    postgres_password: str | None = Field(default=None, alias="POSTGRES_PASSWORD")
    postgres_db: str | None = Field(default=None, alias="POSTGRES_DB")
    postgres_host: str = Field(default="localhost", alias="POSTGRES_HOST")
    postgres_port: int = Field(default=5432, alias="POSTGRES_PORT")

    # ---------- AI / OpenAI setting ----------
    openai_api_key: str | None = Field(default=None, alias="OPENAI_API_KEY")

    # ---------- upload setting ----------
    upload_root: Path = Field(default=Path("uploads"), alias="UPLOAD_ROOT")
    max_upload_mb: int = Field(default=50, alias="MAX_UPLOAD_MB")
    allowed_extensions: str = Field(default="pdf,doc,docx,txt", alias="ALLOWED_EXTENSIONS")

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
    }

    @property
    def UPLOAD_ROOT(self) -> Path:
        return self.upload_root.resolve()

settings = Settings()

settings.UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
