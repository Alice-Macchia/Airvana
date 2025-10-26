import asyncio
import os
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import select, text
from BackEnd.app.models import Plot, PlotSpecies, Species, WeatherData

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

async def check_data():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async with AsyncSession(engine) as session:
        print("=== CHECKING DATABASE DATA ===")

        # Check plot 1
        result = await session.execute(select(Plot).where(Plot.id == 1))
        plot = result.scalar_one_or_none()
        print(f'Plot 1 exists: {plot is not None}')
        if plot:
            print(f'  Name: {plot.name}, User ID: {plot.user_id}')

        # Check species for plot 1
        result = await session.execute(select(PlotSpecies).where(PlotSpecies.plot_id == 1))
        species = result.scalars().all()
        print(f'Species associations for plot 1: {len(species)}')
        for s in species:
            print(f'  Species ID: {s.species_id}, Area: {s.surface_area}')

        # Check weather data for plot 1
        result = await session.execute(text("SELECT COUNT(*) FROM weather_data WHERE plot_id = 1"))
        count = result.scalar()
        print(f'Weather data records for plot 1: {count}')

        # Check all species
        result = await session.execute(select(Species))
        all_species = result.scalars().all()
        print(f'Total species in DB: {len(all_species)}')
        for s in all_species[:5]:  # Show first 5
            print(f'  {s.id}: {s.name} - CO2: {s.co2_absorption_rate}, O2: {s.o2_production_rate}')

        # Check users
        result = await session.execute(text("SELECT id, email FROM users"))
        users = result.fetchall()
        print(f'Users in DB: {len(users)}')
        for u in users:
            print(f'  User {u[0]}: {u[1]}')

asyncio.run(check_data())