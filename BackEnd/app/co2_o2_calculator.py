import os
from datetime import datetime, date
from typing import List, Dict, Any
from collections import defaultdict
from dotenv import load_dotenv
import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, cast, Date
from BackEnd.app.models import Species, WeatherData, PlotSpecies
import psycopg2

# Carica le variabili dal file .env
load_dotenv()

# Usa DATABASE_URL_SYNC dal .env per connessioni psycopg2
DATABASE_URL = os.getenv("DATABASE_URL_SYNC")
print("Mi connetto a:", DATABASE_URL)
conn = psycopg2.connect(
    host=os.getenv("DB_HOST"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASS"),
    dbname=os.getenv("DB_NAME"),
    port=int(os.getenv("DB_PORT"))   # <-- Importante il cast a int!
)


async def get_coefficients_from_db(db: AsyncSession) -> Dict[str, Dict[str, float]]:
    stmt = select(Species.name, Species.co2_absorption_rate, Species.o2_production_rate)
    # Aggiunto 'await' qui
    result = await db.execute(stmt)
    rows = result.fetchall()
    
    return {
        row.name.lower(): {
            "co2": row.co2_absorption_rate,
            "o2": row.o2_production_rate
        } for row in rows
    }



async def get_weather_data_from_db(db: AsyncSession, plot_id: int, day: str) -> List[Dict[str, Any]]:
    target_date = datetime.strptime(day, "%Y-%m-%d").date()

    stmt = (
        select(WeatherData)
        .where(
            WeatherData.plot_id == plot_id,
            cast(WeatherData.date_time, Date) == target_date
        )
        .order_by(WeatherData.date_time.asc())
    )
    
    # Aggiunto 'await' qui
    result = await db.execute(stmt)
    rows = result.scalars().all()

    return [{
        "datetime": row.date_time,
        "temperature": row.temperature,
        "humidity": row.humidity,
        "precipitation": row.precipitation,
        "radiation": row.solar_radiation
    } for row in rows]



async def get_species_from_db(db: AsyncSession, plot_id: int) -> List[Dict[str, Any]]:
    stmt = (
        select(Species.name, PlotSpecies.surface_area)
        .join(Species, PlotSpecies.species_id == Species.id)
        .where(PlotSpecies.plot_id == plot_id)
    )
    
    # Aggiunto 'await' qui
    result = await db.execute(stmt)
    rows = result.fetchall()

    return [
        {"species": row.name.lower(), "area_m2": row.surface_area}
        for row in rows
        if row.surface_area is not None and row.surface_area > 0
    ]


def calculate_co2_o2_hourly(plants: List[Dict[str, Any]], hourly_weather: List[Dict[str, Any]], coefficients: Dict[str, Dict[str, float]]) -> List[Dict[str, Any]]:
    # ... (questa funzione rimane invariata) ...
    results = []
    for plant in plants:
        species = plant.get("species", "").lower()
        area = plant.get("area_m2", 0)

        if species not in coefficients:
            print(f"⚠️ Coefficienti mancanti per '{species}'")
            continue

        co2_factor = coefficients[species].get("co2", 0)
        o2_factor = coefficients[species].get("o2", 0)

        for hour in hourly_weather:
            radiation = hour.get("radiation", 0)
            temperature = hour.get("temperature", 20)
            humidity = hour.get("humidity", 60)
            datetime_hour = hour.get("datetime")

            rad_factor = min(radiation / 800, 1.0) if radiation is not None else 0
            temp_factor = min(temperature / 25, 1.0) if temperature is not None else 0
            hum_factor = min(humidity / 60, 1.0) if humidity is not None else 0

            meteo_factor = rad_factor * temp_factor * hum_factor
            base = area
            co2_hour = base * co2_factor * meteo_factor
            o2_hour = base * o2_factor * meteo_factor

            results.append({
                "species": species,
                "datetime": datetime_hour,
                "co2_kg_hour": round(co2_hour, 5),
                "o2_kg_hour": round(o2_hour, 5)
            })
    return results

async def aggiorna_weatherdata_con_assorbimenti(db: AsyncSession, plot_id: int, giorno: str):
    # Chiama le funzioni 'await'ing per ottenere i risultati
    weather = await get_weather_data_from_db(db, plot_id, giorno)
    species = await get_species_from_db(db, plot_id)
    coefficients = await get_coefficients_from_db(db)

    results = calculate_co2_o2_hourly(species, weather, coefficients)

    for r in results:
        stmt = (
            update(WeatherData)
            .where(WeatherData.plot_id == plot_id, WeatherData.date_time == r["datetime"])
            .values(total_co2_absorption=r["co2_kg_hour"], total_o2_production=r["o2_kg_hour"])
        )
        # Aggiunto 'await' qui
        await db.execute(stmt)

    print(f"✅ Dati CO₂/O₂ pronti per essere aggiornati nel DB per il plot {plot_id}.")


def calcola_totale_orario(user_plants, weather, coefficients):
    results = calculate_co2_o2_hourly(user_plants, weather, coefficients)
    df = pd.DataFrame(results)
    df_group = df.groupby("datetime")[["co2_kg_hour", "o2_kg_hour"]].sum().reset_index()
    orario = df_group.to_dict(orient="records")
    return {"totale_orario": orario}

def convert_datetime_to_str(results):
    for elem in results:
        dt = elem["datetime"]
        if isinstance(dt, (int, float)):
            elem["datetime"] = datetime.fromtimestamp(dt / 1000).strftime("%Y-%m-%d %H:%M:%S")
        elif isinstance(dt, datetime):
            elem["datetime"] = dt.strftime("%Y-%m-%d %H:%M:%S")
    return results

    
# if __name__ == "__main__":
#     coefficients = get_coefficients_from_db()
#     # METTI LA DATA REALE CHE VEDI NELLA QUERY!
#     data_giusta = "2025-05-28"
#     weather = get_weather_data_from_db(1, data_giusta)
#     user_plants = get_species_from_db(1)


    # results = calculate_co2_o2_hourly(user_plants, weather, coefficients)
    # results = convert_datetime_to_str(results)
    # df = pd.DataFrame(results)
    # print("\nRisultato in DataFrame:")
    # pd.set_option('display.max_rows', None)  # Mostra tutte le righe
    # pd.set_option('display.max_columns', None)  # Mostra tutte le colonne (se servono)
    # df.to_json("co2_o2_results.json", orient="records", indent=4)
    # print(df.to_json(orient="records", indent=4))
