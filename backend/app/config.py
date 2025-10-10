from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    app_env: str = Field("dev", alias="APP_ENV")
    secret_key: str = Field(..., alias="SECRET_KEY")
    access_token_expire_minutes: int = Field(120, alias="ACCESS_TOKEN_EXPIRE_MINUTES")

    postgres_user: str | None = Field(None, alias="POSTGRES_USER")
    postgres_password: str | None = Field(None, alias="POSTGRES_PASSWORD")
    postgres_db: str | None = Field(None, alias="POSTGRES_DB")
    postgres_host: str = Field("localhost", alias="POSTGRES_HOST")
    postgres_port: int = Field(5432, alias="POSTGRES_PORT")

    upload_dir: str = Field("uploads", alias="UPLOAD_DIR")
    max_upload_mb: int = Field(50, alias="MAX_UPLOAD_MB")
    allowed_extensions: str = Field("pdf,doc,docx,txt", alias="ALLOWED_EXTENSIONS")

    @property
    def sqlalchemy_dsn(self) -> str:
        return "sqlite:///./dev.db"

settings = Settings(_env_file=".env", _env_file_encoding="utf-8")
