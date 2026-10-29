from pathlib import Path
from typing import List

from pydantic import BaseSettings, Field

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    app_name: str = "KnowNet API"
    secret_key: str = "CHANGE_ME"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    
    database_url: str = "mysql+pymysql://root:@localhost/knownet"
    allowed_origins: List[str] = Field(default_factory=lambda: [
        # SPA dev servers
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5713",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        # Allow any local 10.x.x.x or 192.168.x.x IP manually if needed, but for now we list specific knowns
        "http://10.108.42.136:5173",
        "http://10.108.42.136:8000",
        "http://10.108.42.246:5173",
        "http://10.108.42.246:8000",
        # Static assets served via Apache/XAMPP or file:// origin fallbacks
        "http://localhost",
        "http://localhost",
        "http://127.0.0.1",
    ])
    recordings_dir: str = str(BASE_DIR / "recordings")
    resources_dir: str = str(BASE_DIR / "resources")
    videos_dir: str = str(BASE_DIR / "videos")

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
