# task_runner.py
import os
from datetime import datetime
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from BackEnd.app.get_all_plots import get_all_plots_coords
from BackEnd.app.get_meteo import fetch_and_save_weather_day
from BackEnd.app.co2_o2_calculator import aggiorna_weatherdata_con_assorbimenti
from dotenv import load_dotenv

load_dotenv(".env")
DATABASE_URL = os.getenv("DATABASE_URL")
today = datetime.today().strftime("%Y-%m-%d")

engine = create_async_engine(DATABASE_URL)
Session = async_sessionmaker(engine, expire_on_commit=False)

import asyncio

async def run_meteo_pipeline():
    async with Session() as session:
        plots = await get_all_plots_coords(session)
        for plot in plots:
            plot_id = plot["plot_id"]
            lat = plot["lat"]
            lon = plot["lon"]
            print(f"📍 Plot {plot_id} | {lat}, {lon}")

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

if __name__ == "__main__":
    asyncio.run(run_meteo_pipeline())
