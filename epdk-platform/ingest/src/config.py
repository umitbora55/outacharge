import os
from dataclasses import dataclass

@dataclass
class Config:
    database_dsn: str = os.getenv(
        'DATABASE_DSN',
        'postgresql://postgres:postgres123@localhost:5432/epdk_charging_stations'
    )

def load_config():
    return Config()
