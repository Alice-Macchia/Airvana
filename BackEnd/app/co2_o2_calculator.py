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

# Costanti per i calcoli CO2/O2
DEFAULT_TEMPERATURE = 20  # °C
DEFAULT_HUMIDITY = 60     # %
RADIATION_NORMALIZER = 800  # W/m²
TEMPERATURE_NORMALIZER = 25  # °C
HUMIDITY_NORMALIZER = 60    # %

# Usa DATABASE_URL_SYNC dal .env per connessioni psycopg2
DATABASE_URL = os.getenv("DATABASE_URL_SYNC")

# Connessione lazy - verrà creata solo quando serve
conn = None

def get_connection():
    """
    Restituisce una connessione al database PostgreSQL.
    Se una connessione valida esiste già, la riutilizza. Altrimenti, ne crea una nuova
    utilizzando le credenziali definite nelle variabili d'ambiente.

    Raises:
        ValueError: Se la porta del database (DB_PORT) non è configurata.

    Returns:
        psycopg2.connection: Oggetto di connessione al database.
    """
    global conn
    if conn is None or conn.closed:
        db_port = os.getenv("DB_PORT")
        if not db_port:
            raise ValueError("DB_PORT non configurato nelle variabili d'ambiente")

        conn = psycopg2.connect(
            host=os.getenv("DB_HOST"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASS"),
            dbname=os.getenv("DB_NAME"),
            port=int(db_port)
        )
    return conn


async def get_coefficients_from_db(db: AsyncSession) -> Dict[str, Dict[str, float]]:
    """Recupera i coefficienti di assorbimento CO2 e produzione O2 per tutte le specie."""
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
    """Recupera i dati meteo orari per un dato terreno e giorno dal database."""
    target_date = datetime.strptime(day, "%Y-%m-%d").date()

    # Modifica: usa una query più robusta che non dipende dal CAST
    start_of_day = datetime.combine(target_date, datetime.min.time())
    end_of_day = datetime.combine(target_date, datetime.max.time())
    
    stmt = (
        select(WeatherData)
        .where(
            WeatherData.plot_id == plot_id,
            WeatherData.date_time >= start_of_day,
            WeatherData.date_time <= end_of_day
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
    """Recupera le specie e la loro area di superficie per un dato terreno."""
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
    """Calcola l'assorbimento di CO2 e la produzione di O2 oraria per ogni specie.

    Args:
        plants: Lista di piante con specie e area.
        hourly_weather: Dati meteo orari.
        coefficients: Coefficienti di assorbimento/produzione per specie.

    Returns:
        Lista di risultati orari con CO2 e O2 calcolati.
    """
    # ... (questa funzione rimane invariata) ...
    results = []
    for plant in plants:
        species = plant.get("species", "").lower()
        area = plant.get("area_m2", 0)

        if species not in coefficients:
            continue

        co2_factor = coefficients[species].get("co2", 0)
        o2_factor = coefficients[species].get("o2", 0)

        for hour in hourly_weather:
            radiation = hour.get("radiation", 0)
            temperature = hour.get("temperature", DEFAULT_TEMPERATURE)
            humidity = hour.get("humidity", DEFAULT_HUMIDITY)
            datetime_hour = hour.get("datetime")

            rad_factor = min(radiation / RADIATION_NORMALIZER, 1.0) if radiation is not None else 0
            temp_factor = min(temperature / TEMPERATURE_NORMALIZER, 1.0) if temperature is not None else 0
            hum_factor = min(humidity / HUMIDITY_NORMALIZER, 1.0) if humidity is not None else 0

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
    """
    Calcola l'assorbimento orario di CO2 e la produzione di O2 per un dato terreno
    e aggiorna i record corrispondenti nella tabella `weather_data`.

    Il calcolo si basa sui dati delle specie presenti nel terreno, sulle condizioni
    meteo orarie e sui coefficienti di assorbimento/produzione specifici per ogni specie.

    Args:
        db (AsyncSession): La sessione asincrona del database per eseguire le query.
        plot_id (int): L'ID del terreno per cui effettuare il calcolo.
        giorno (str): La data di riferimento nel formato "YYYY-MM-DD".
    """
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


def calcola_totale_orario(user_plants: List[Dict[str, Any]], weather: List[Dict[str, Any]], coefficients: Dict[str, Dict[str, float]]) -> Dict[str, List[Dict[str, Any]]]:
    """
    Aggrega i dati orari di assorbimento CO2 e produzione O2 per tutte le specie di un utente,
    restituendo un totale complessivo per ogni ora.

    Utilizza i risultati di `calculate_co2_o2_hourly` e li raggruppa per timestamp,
    sommando i contributi di tutte le piante.

    Args:
        user_plants (List[Dict[str, Any]]): Lista delle piante dell'utente, con specie e area.
        weather (List[Dict[str, Any]]): Dati meteo orari per il periodo di calcolo.
        coefficients (Dict[str, Dict[str, float]]): Coefficienti di assorbimento/produzione.

    Returns:
        Dict[str, List[Dict[str, Any]]]: Un dizionario contenente la chiave "totale_orario",
        a cui è associata una lista di dizionari, ciascuno con "datetime", "co2_kg_hour" e "o2_kg_hour".
    """
    results = calculate_co2_o2_hourly(user_plants, weather, coefficients)
    df = pd.DataFrame(results)
    df_group = df.groupby("datetime")[["co2_kg_hour", "o2_kg_hour"]].sum().reset_index()
    orario = df_group.to_dict(orient="records")
    return {"totale_orario": orario}

def convert_datetime_to_str(results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Converte i valori `datetime` in stringhe formattate all'interno di una lista di risultati.

    Questa funzione itera su una lista di dizionari e, se trova una chiave "datetime"
    con un oggetto `datetime` o un timestamp numerico, la converte in una stringa
    nel formato "YYYY-MM-DD HH:MM:SS".

    Args:
        results (List[Dict[str, Any]]): Una lista di dizionari, dove alcuni possono
            contenere la chiave "datetime".

    Returns:
        List[Dict[str, Any]]: La stessa lista di dizionari con i valori "datetime" convertiti in stringhe.
    """
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


    # Codice di esempio commentato:
    # results = calculate_co2_o2_hourly(user_plants, weather, coefficients)
    # results = convert_datetime_to_str(results)
    # df = pd.DataFrame(results)
    # pd.set_option('display.max_rows', None)  # Mostra tutte le righe
    # pd.set_option('display.max_columns', None)  # Mostra tutte le colonne (se servono)
    # df.to_json("co2_o2_results.json", orient="records", indent=4)
