# task_runner.py
import os
from datetime import datetime
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import select
from BackEnd.app.get_all_plots import get_all_plots_coords
from BackEnd.app.get_meteo import fetch_and_save_weather_day
from BackEnd.app.co2_o2_calculator import aggiorna_weatherdata_con_assorbimenti
from BackEnd.app.models import WeatherData
from dotenv import load_dotenv

load_dotenv(".env")
DATABASE_URL = os.getenv("DATABASE_URL")
today = datetime.today().strftime("%Y-%m-%d")

# Debug e validazione
print(f"Mi connetto a: {DATABASE_URL}")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL non configurato! Verifica che i secrets GitHub siano stati impostati correttamente.")

engine = create_async_engine(DATABASE_URL)
Session = async_sessionmaker(engine, expire_on_commit=False)

import asyncio

async def check_existing_data(session, plot_id, date_str):
    """Controlla se esistono già dati meteo per questo plot e questa data"""
    from datetime import datetime
    start_of_day = datetime.strptime(date_str, "%Y-%m-%d")
    end_of_day = start_of_day.replace(hour=23, minute=59, second=59)
    
    result = await session.execute(
        select(WeatherData.id).where(
            WeatherData.plot_id == plot_id,
            WeatherData.date_time >= start_of_day,
            WeatherData.date_time <= end_of_day
        ).limit(1)
    )
    return result.scalar() is not None

async def run_meteo_pipeline():
    async with Session() as session:
        plots = await get_all_plots_coords(session)
        for plot in plots:
            plot_id = plot["plot_id"]
            lat = plot["lat"]
            lon = plot["lon"]
            print(f"📍 Plot {plot_id} | {lat}, {lon}")

            # Controlla se i dati per oggi esistono già
            if await check_existing_data(session, plot_id, today):
                print(f"⏭️  Dati già presenti per plot {plot_id} ({today}) - salto")
                continue

            try:
                ok = await fetch_and_save_weather_day(session, plot_id, lat, lon)
                if ok:
                    await aggiorna_weatherdata_con_assorbimenti(session, plot_id, today)
                    await session.commit()
                    print(f"✅ CO2/O2 aggiornati per plot {plot_id}")
                else:
                    print(f"⚠️ Meteo non aggiornato per plot {plot_id}")
            except Exception as e:
                print(f"❌ Errore per plot {plot_id}: {e}")

# Aggiungi cleanup esplicito
async def cleanup():
    """Chiude tutte le connessioni e risorse"""
    if 'engine' in globals():
        await engine.dispose()
    print("🧹 Cleanup completato")

if __name__ == "__main__":
    try:
        asyncio.run(run_meteo_pipeline())
    finally:
        # Assicurati che il cleanup venga eseguito anche se ci sono errori
        asyncio.run(cleanup())
        print("🏁 Pipeline completata con successo!")
