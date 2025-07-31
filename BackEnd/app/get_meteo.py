import requests
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os
from dotenv import load_dotenv
from BackEnd.app.models import WeatherData
from BackEnd.app.parte_finale_connect_db import recupero_coords_geocentroide
from BackEnd.app.co2_o2_calculator import aggiorna_weatherdata_con_assorbimenti
from sqlalchemy.ext.asyncio import AsyncSession
import asyncio 

# # ✅ Carica solo il file locale con connessione SINCRONA
# load_dotenv(dotenv_path=".env.local")

# === COORDINATE DEL PLOT PRINCIPALE ===
coords = list(recupero_coords_geocentroide().values())  # {'plot_id': 1, 'latitudine': ..., 'longitudine': ...}
plot_id = coords[0]
latitude = coords[1]
longitude = coords[2]

oggi = datetime.today().strftime("%Y-%m-%d")

print("📍 Coordinate plot:", plot_id, latitude, longitude)

# === FETCH METEO E SALVATAGGIO ===
async def fetch_and_save_weather_day(db: AsyncSession, plot_id: int, lat: float, lon: float) -> bool:
    """
    Versione asincrona che riceve la sessione DB da FastAPI.
    """
    print("📡 Chiamata a Open-Meteo...")
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": "temperature_2m,relative_humidity_2m,precipitation,shortwave_radiation",
        "forecast_days": "1",
        "timezone": "auto"
    }
    
    try:
        loop = asyncio.get_running_loop()
        response = await loop.run_in_executor(
            None, 
            lambda: requests.get(url, params=params)
        )
        response.raise_for_status()  # Solleva un errore per status codes >= 400
        
        hourly = response.json().get("hourly", {})
        if not hourly.get("time"):
            print("❌ Nessun dato orario ricevuto da Open-Meteo")
            return False

        count = 0
        for i in range(len(hourly["time"])):
            timestamp = datetime.fromisoformat(hourly["time"][i])

            # Controlla se il dato esiste già usando la sessione async
            stmt = select(WeatherData.id).where(
                WeatherData.plot_id == plot_id,
                WeatherData.date_time == timestamp
            )
            existing = await db.execute(stmt)
            if existing.first():  # ✅ non lancia errore se ci sono più righe
                print(f"⚠️ Dato già presente per ora {timestamp}, skip")
                continue


            weather = WeatherData(
                plot_id=plot_id,
                date_time=timestamp,
                temperature=hourly["temperature_2m"][i],
                humidity=hourly["relative_humidity_2m"][i],
                precipitation=hourly["precipitation"][i],
                solar_radiation=hourly["shortwave_radiation"][i],
                # I valori CO2/O2 vengono inizializzati a 0
                total_co2_absorption=0,
                total_o2_production=0
            )
            db.add(weather)
            count += 1
        
        # Il commit verrà gestito dall'endpoint di FastAPI, 
        # ma possiamo farlo anche qui per essere espliciti se necessario.
        # await db.commit() 
        
        print(f"✅ Aggiunte {count} righe meteo nuove per il plot {plot_id} alla sessione.")
        return True

    except requests.RequestException as e:
        print(f"❌ Errore nella richiesta meteo: {e}")
        return False


# === OPZIONALE: METEO SETTIMANALE ===
def fetch_weather_week(lat, lon):
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "daily": "temperature_2m_mean,relative_humidity_2m_mean,precipitation_sum,shortwave_radiation_sum",
    }

    response = requests.get(url, params=params)

    if response.status_code != 200:
        print(f"❌ Errore nella richiesta meteo: {response.status_code}")
        return False

    daily = response.json()["daily"]
    data = []

    for i in range(len(daily["time"])):
        data.append({
            "date": daily["time"][i],
            "temperature": daily["temperature_2m_mean"][i],
            "humidity": daily["relative_humidity_2m_mean"][i],
            "precipitation": daily["precipitation_sum"][i],
            "radiation": daily["shortwave_radiation_sum"][i]
        })

    print("✅ Dati meteo settimanali ottenuti.")
    return data


# === ESECUZIONE COMPLETA ===
# fetch_and_save_weather_day(plot_id, latitude, longitude)
# aggiorna_weatherdata_con_assorbimenti(plot_id, oggi)
# print("✅ Meteo e CO₂/O₂ aggiornati con successo.")
