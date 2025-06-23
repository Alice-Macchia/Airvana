import requests
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os
from dotenv import load_dotenv
from BackEnd.app.models import WeatherData
from BackEnd.app.parte_finale_connect_db import recupero_coords_geocentroide
from BackEnd.app.co2_o2_calculator import aggiorna_weatherdata_con_assorbimenti

# ✅ Carica solo il file locale con connessione SINCRONA
load_dotenv(dotenv_path=".env.local")

# === COORDINATE DEL PLOT PRINCIPALE ===
coords = list(recupero_coords_geocentroide().values())  # {'plot_id': 1, 'latitudine': ..., 'longitudine': ...}
plot_id = coords[0]
latitude = coords[1]
longitude = coords[2]

oggi = datetime.today().strftime("%Y-%m-%d")

print("📍 Coordinate plot:", plot_id, latitude, longitude)

# === FETCH METEO E SALVATAGGIO ===
def fetch_and_save_weather_day(plot_id, lat, lon):
    DATABASE_URL = os.getenv("DATABASE_URL_SYNC")

    print("📡 Connettendo a:", DATABASE_URL)

    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()

    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": "temperature_2m,relative_humidity_2m,precipitation,shortwave_radiation",
        "forecast_days": "1",
        "timezone": "auto"
    }

    response = requests.get(url, params=params)

    if response.status_code != 200:
        print(f"❌ Errore nella richiesta meteo: {response.status_code}")
        return False

    hourly = response.json().get("hourly", {})
    if not hourly.get("time"):
        print("❌ Nessun dato orario ricevuto")
        return False

    count = 0
    for i in range(len(hourly["time"])):
        timestamp = datetime.fromisoformat(hourly["time"][i])

        existing = session.query(WeatherData).filter_by(plot_id=plot_id, date_time=timestamp).first()
        if existing:
            print(f"⚠️ Dato già presente per ora {timestamp}, skip")
            continue

        weather = WeatherData(
            plot_id=plot_id,
            date_time=timestamp,
            temperature=hourly["temperature_2m"][i],
            humidity=hourly["relative_humidity_2m"][i],
            precipitation=hourly["precipitation"][i],
            solar_radiation=hourly["shortwave_radiation"][i],
            total_co2_absorption=0,
            total_o2_production=0
        )
        session.add(weather)
        count += 1

    session.commit()
    session.close()
    print(f"✅ Salvate {count} righe meteo nuove per il plot {plot_id}")
    return True


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
fetch_and_save_weather_day(plot_id, latitude, longitude)
aggiorna_weatherdata_con_assorbimenti(plot_id, oggi)
print("✅ Meteo e CO₂/O₂ aggiornati con successo.")
