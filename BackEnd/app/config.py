"""
Configurazione centralizzata dell'applicazione Airvana.

Tutte le variabili d'ambiente vengono caricate e validate qui.
Usare `from app.config import settings` per accedere alle configurazioni.
"""

import os
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """
    Configurazioni dell'applicazione caricate da variabili d'ambiente.

    Tutte le variabili devono essere definite nel file .env
    (vedere .env.example per riferimento).
    """

    # Database
    DATABASE_URL: str
    DATABASE_URL_SYNC: Optional[str] = None
    DATABASE_URL_geo_station: Optional[str] = None

    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Google OAuth
    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: str
    GOOGLE_REDIRECT_URI: str

    # CORS - Lista di origini separate da virgola
    # Esempio: "http://localhost:3000,http://localhost:5173"
    ALLOWED_ORIGINS: str = "http://localhost:8000,http://127.0.0.1:8000"

    # Environment
    ENVIRONMENT: str = "development"  # development, production, test

    # Application Configuration
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    DEBUG: bool = False

    # Email Configuration
    SMTP_SERVER: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    EMAIL_USERNAME: str = "your-email@gmail.com"
    EMAIL_PASSWORD: str = "your-app-password"

    # External APIs
    WEATHER_API_KEY: str = "your-weather-api-key"

    # Production Settings
    PRODUCTION_URL: str = "http://165.22.75.145:8001"

    # Database individual parameters
    DB_HOST: str = "165.22.75.145"
    DB_USER: str = "postgres"
    DB_PASS: str = "airvana"
    DB_NAME: str = "co2app"
    DB_PORT: str = "15432"

    # Python path
    PYTHONPATH: str = "./BackEnd"

    class Config:
        env_file = ".env"
        case_sensitive = True

    def get_allowed_origins_list(self) -> list[str]:
        """
        Converte la stringa ALLOWED_ORIGINS in una lista.

        Returns:
            list: Lista di URL permessi per CORS

        Example:
            >>> settings.get_allowed_origins_list()
            ['http://localhost:3000', 'http://localhost:5173']
        """
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]


# Istanza globale delle settings
# Importare con: from app.config import settings
settings = Settings()
