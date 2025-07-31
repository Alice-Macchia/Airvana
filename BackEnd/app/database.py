from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from dotenv import load_dotenv
import os

# Carica le variabili d'ambiente
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

# Crea l'engine asincrono
async_engine = create_async_engine(DATABASE_URL, echo=True)

# Crea il sessionmaker asincrono
AsyncSessionLocal = async_sessionmaker(bind=async_engine, class_=AsyncSession, expire_on_commit=False)

# Dependency FastAPI per ottenere una sessione asincrona
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
