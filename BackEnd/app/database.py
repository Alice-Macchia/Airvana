from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from dotenv import load_dotenv
import os

# Carica le variabili d'ambiente
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

# Engine e session async
async_engine = create_async_engine(DATABASE_URL, echo=True)
AsyncSessionLocal = sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# Engine e session sync per moduli che lo richiedono
SessionLocal = async_sessionmaker(bind=async_engine, expire_on_commit=False)

# Dependency async per FastAPI
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
