import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    def __init__(self):
        self.secret_key = os.getenv("SECRET_KEY", "parking-reservation-secret-key-change-in-production")
        self.algorithm = os.getenv("ALGORITHM", "HS256")
        self.access_token_expire_minutes = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

        self.redis_host = os.getenv("REDIS_HOST", "localhost")
        self.redis_port = int(os.getenv("REDIS_PORT", "6379"))
        self.redis_db = int(os.getenv("REDIS_DB", "0"))
        self.redis_password = os.getenv("REDIS_PASSWORD", "")

        self.reservation_duration_minutes = int(os.getenv("RESERVATION_DURATION_MINUTES", "30"))
        self.parking_grid_rows = int(os.getenv("PARKING_GRID_ROWS", "5"))
        self.parking_grid_cols = int(os.getenv("PARKING_GRID_COLS", "10"))
        self.parking_hourly_rate = float(os.getenv("PARKING_HOURLY_RATE", "10.0"))

        self.database_url = os.getenv("DATABASE_URL", "sqlite:///./parking.db")


settings = Settings()