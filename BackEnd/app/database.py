from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import os

# 📦 Carica le variabili d'ambiente
load_dotenv()

# ✅ Connessione SYNC (es. script esterni, utils.py)
DATABASE_URL_SYNC = os.getenv("DATABASE_URL_SYNC")
engine = create_engine(DATABASE_URL_SYNC, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# ✅ Connessione ASYNC (es. FastAPI)
DATABASE_URL = os.getenv("DATABASE_URL")
async_engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(bind=async_engine, class_=AsyncSession, expire_on_commit=False)

# 🧱 Base class per i modelli
Base = declarative_base()

# 🔄 Funzione SINCRONA per dipendenza FastAPI o script
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 🔄 Funzione ASINCRONA per dipendenza FastAPI
@asynccontextmanager
async def get_async_session():
    async with AsyncSessionLocal() as session:
        yield session
