import os
from pathlib import Path
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent.parent
PROJECT_ROOT = BASE_DIR.parent

class Settings(BaseModel):
    PROJECT_NAME: str = "IntelliNet"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "intellinet-dev-super-secret-key-academic-2026-xyz789")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 # 24 hours
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        f"sqlite:///{BASE_DIR}/intellinet.db"
    )
    
    # Paths
    BASE_DIR: Path = BASE_DIR
    PROJECT_ROOT: Path = PROJECT_ROOT
    DATASETS_DIR: Path = PROJECT_ROOT / "datasets"
    MODELS_DIR: Path = PROJECT_ROOT / "artifacts" / "models"
    EVALUATION_DIR: Path = PROJECT_ROOT / "artifacts" / "evaluation"
    
    # Congestion thresholds (configurable defaults)
    LATENCY_THRESHOLD_MEDIUM: float = 40.0   # ms
    LATENCY_THRESHOLD_HIGH: float = 80.0     # ms
    LATENCY_THRESHOLD_CRITICAL: float = 150.0 # ms
    
    PACKET_LOSS_THRESHOLD_MEDIUM: float = 0.5  # %
    PACKET_LOSS_THRESHOLD_HIGH: float = 2.0    # %
    PACKET_LOSS_THRESHOLD_CRITICAL: float = 5.0 # %
    
    BANDWIDTH_THRESHOLD_MEDIUM: float = 50.0   # %
    BANDWIDTH_THRESHOLD_HIGH: float = 75.0     # %
    BANDWIDTH_THRESHOLD_CRITICAL: float = 90.0 # %

    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ]

settings = Settings()

# Ensure critical directories exist
settings.DATASETS_DIR.mkdir(parents=True, exist_ok=True)
(settings.DATASETS_DIR / "intrusion").mkdir(parents=True, exist_ok=True)
(settings.DATASETS_DIR / "congestion").mkdir(parents=True, exist_ok=True)
settings.MODELS_DIR.mkdir(parents=True, exist_ok=True)
settings.EVALUATION_DIR.mkdir(parents=True, exist_ok=True)
