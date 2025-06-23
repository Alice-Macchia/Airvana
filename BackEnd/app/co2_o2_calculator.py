import os
import psycopg2
from datetime import datetime
from typing import List, Dict, Any
from collections import defaultdict
from dotenv import load_dotenv
import pandas as pd

DATABASE_URL = "postgresql://postgres:postgres@165.22.75.145:15432/co2app"
print("Mi connetto a:", DATABASE_URL)
conn = psycopg2.connect(
    host=os.getenv("DB_HOST", "165.22.75.145"),
    user=os.getenv("DB_USER", "postgres"),
    password=os.getenv("DB_PASS", "postgres"),
    dbname=os.getenv("DB_NAME", "co2app"),
    port=int(os.getenv("DB_PORT", "15432"))   # <-- Importante il cast a int!
)

def get_coefficients_from_db() -> Dict[str, Dict[str, float]]:
    cursor = conn.cursor()
    cursor.execute("SELECT name, co2_absorption_rate, o2_production_rate FROM species;")
    rows = cursor.fetchall()
    cursor.close()
    return {
        row[0].lower(): {
            "co2": row[1],
            "o2": row[2]
        } for row in rows
    }

def get_weather_data_from_db(plot_id, date):
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    cursor.execute("""
        SELECT date_time, temperature, humidity, precipitation, solar_radiation
        FROM weather_data
        WHERE plot_id = %s AND date_time::date = %s
        ORDER BY date_time ASC;
    """, (plot_id, date))
    rows = cursor.fetchall()
    cursor.close()
    conn.close()  # <-- chiudi SEMPRE!
    return [{
        "datetime": row[0],
        "temperature": row[1],
        "humidity": row[2],
        "precipitation": row[3],
        "radiation": row[4]
    } for row in rows]

def get_species_from_db(plot_id: int) -> List[Dict[str, Any]]:
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    cursor.execute("""
        SELECT s.name, ps.surface_area
        FROM plot_species ps
        JOIN species s ON ps.species_id = s.id
        WHERE ps.plot_id = %s
    """, (plot_id,))
    rows = cursor.fetchall()
    cursor.close()
    return [
        {"species": row[0].lower(), "area_m2": row[1]}
        for row in rows
        if row[1] is not None and row[1] > 0
    ]


def calculate_co2_o2_hourly(plants: List[Dict[str, Any]], hourly_weather: List[Dict[str, Any]], coefficients: Dict[str, Dict[str, float]]) -> List[Dict[str, Any]]:
    """
    Calcola co2/o2 per ogni specie e ogni ora.
    Restituisce una lista di dict, uno per ogni ora e specie.
    """
    results = []
    for plant in plants:
        species = plant.get("species", "").lower()
        area = plant.get("area_m2", 0)

        if species not in coefficients:
            print(f"⚠️ Coefficienti mancanti per '{species}'")
            continue

        co2_factor = coefficients[species]["co2"]
        o2_factor = coefficients[species]["o2"]

        for hour in hourly_weather:
            radiation = hour.get("radiation", 0)
            temperature = hour.get("temperature", 20)
            humidity = hour.get("humidity", 60)
            datetime_hour = hour.get("datetime")   # per stampare l'orario

            rad_factor = min(radiation / 800, 1.0)
            temp_factor = min(temperature / 25, 1.0)
            hum_factor = min(humidity / 60, 1.0)

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

def aggiorna_weatherdata_con_assorbimenti(plot_id: int, giorno: str):
    weather = get_weather_data_from_db(plot_id, giorno)
    species = get_species_from_db(plot_id)
    coefficients = get_coefficients_from_db()

    results = calculate_co2_o2_hourly(species, weather, coefficients)
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()

    for r in results:
        cursor.execute("""
            UPDATE weather_data
            SET total_co2_absorption = %s,
                total_o2_production = %s
            WHERE plot_id = %s AND date_time = %s
        """, (r["co2_kg_hour"], r["o2_kg_hour"], plot_id, r["datetime"]))

    conn.commit()
    cursor.close()
    conn.close()
    print("✅ Dati CO₂/O₂ aggiornati nel DB.")



def calcola_totale_orario(user_plants, weather, coefficients):
    results = calculate_co2_o2_hourly(user_plants, weather, coefficients)
    df = pd.DataFrame(results)
    # Raggruppa per ora e somma CO2/O2 tra tutte le specie
    df_group = df.groupby("datetime")[["co2_kg_hour", "o2_kg_hour"]].sum().reset_index()
    # Converti in lista di dict per l'API/JS
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

    
if __name__ == "__main__":
    coefficients = get_coefficients_from_db()
    # METTI LA DATA REALE CHE VEDI NELLA QUERY!
    data_giusta = "2025-05-28"
    weather = get_weather_data_from_db(1, data_giusta)
    user_plants = get_species_from_db(1)


    results = calculate_co2_o2_hourly(user_plants, weather, coefficients)
    results = convert_datetime_to_str(results)
    df = pd.DataFrame(results)
    print("\nRisultato in DataFrame:")
    pd.set_option('display.max_rows', None)  # Mostra tutte le righe
    pd.set_option('display.max_columns', None)  # Mostra tutte le colonne (se servono)
    df.to_json("co2_o2_results.json", orient="records", indent=4)
    print(df.to_json(orient="records", indent=4))
