from fastapi import FastAPI, Request, Query, Depends, HTTPException, Cookie
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from jose import JWTError, jwt
from datetime import date, datetime
import pandas as pd
import os
from dotenv import load_dotenv
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from geoalchemy2.shape import to_shape
from BackEnd.app.models import Base, Plot
from BackEnd.app.routes import router
from BackEnd.app.schemas import (SaveCoordinatesRequest, SaveCoordinatesResponse, ClassificaRequest, ClassificaResponse, EsportaRequest, EsportaResponse)
from BackEnd.app.utils import (inserisci_terreno, mostra_classifica, Esporta, get_species_distribution_by_plot)
from BackEnd.app.co2_o2_calculator import (calculate_co2_o2_hourly, get_coefficients_from_db, get_weather_data_from_db, get_species_from_db, aggiorna_weatherdata_con_assorbimenti)
from BackEnd.app.get_meteo import fetch_and_save_weather_day
from BackEnd.app.auth import get_current_user
from BackEnd.app.database import SessionLocal, get_db
from fastapi.concurrency import run_in_threadpool

# .env
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")

# ENGINE ASYNC
engine = create_async_engine(DATABASE_URL, echo=False)

# FastAPI
app = FastAPI()
app.mount("/static", StaticFiles(directory="FrontEnd/static"), name="static")
templates = Jinja2Templates(directory="FrontEnd/templates")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:8000", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Database pronto")

@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    return templates.TemplateResponse("homepagedefinitiva.html", {"request": request})

@router.get("/logout")
async def logout():
    response = RedirectResponse(url="/logreg")
    response.delete_cookie("access_token")
    return response


def decode_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=403, detail="Token non valido")

@app.get("/dashboard", response_class=HTMLResponse)
async def dashboard(request: Request, user=Depends(get_current_user)):
    return templates.TemplateResponse("index.html", {
        "request": request,
        "user_id": user["id"],
        "username": user["username"]
    })

@app.post("/save-coordinates", response_model=SaveCoordinatesResponse)
async def inserisci_coordinate(payload: SaveCoordinatesRequest):
    return await inserisci_terreno(payload)

@app.get("/classifica", response_model=ClassificaResponse)
async def get_classifica(payload: ClassificaRequest):
    return await mostra_classifica(payload)

@app.get("/esporta", response_model=EsportaResponse)
async def esporta_pdf(payload: EsportaRequest):
    return await Esporta(payload)

@app.get("/demo", response_class=HTMLResponse)
async def demo(request: Request):
    return templates.TemplateResponse("demo.html", {"request": request})


@app.post("/get_open_meteo/{plot_id}")
async def get_open_meteo(plot_id: int, db: AsyncSession = Depends(get_db)):
    # Aggiungiamo un blocco try/except più specifico
    try:
        # --- 1. Recupera il plot e le coordinate ---
        result = await db.execute(select(Plot).where(Plot.id == plot_id))
        plot = result.scalar_one_or_none()
        if not plot:
            raise HTTPException(status_code=404, detail=f"Plot con ID {plot_id} non trovato.")
        
        centroid_point = to_shape(plot.centroid)
        lat, lon = centroid_point.y, centroid_point.x
        print(f"📍 Coordinate per plot {plot_id}: Lat={lat}, Lon={lon}")

        # --- 2. Scarica e salva i dati meteo ---
        success = await run_in_threadpool(fetch_and_save_weather_day, plot_id, lat, lon)
        if not success:
            raise HTTPException(status_code=502, detail="Errore durante il recupero dei dati da Open-Meteo.")
        print(f"✅ Dati meteo per plot {plot_id} salvati.")

        # --- 3. Esegui i calcoli CO2/O2 ---
        oggi = datetime.today().strftime("%Y-%m-%d")
        print(f"📅 Eseguo calcoli CO2/O2 per plot {plot_id} per il giorno {oggi}...")
        
        species = await get_species_from_db(db, plot_id)
        
        # --- NUOVO CONTROLLO: Verifica se ci sono specie associate al terreno ---
        if not species:
            raise HTTPException(
                status_code=404, 
                detail=f"Nessuna specie di pianta trovata per il terreno {plot_id}. Impossibile calcolare CO₂/O₂."
            )

        weather = await get_weather_data_from_db(db, plot_id, oggi)
        coefs = await get_coefficients_from_db(db)
        results = calculate_co2_o2_hourly(species, weather, coefs)

        # Controllo migliorato
        if not weather:
             raise HTTPException(status_code=404, detail="Dati meteo per oggi non trovati nel DB.")

        # --- 4. Formatta e restituisci i risultati ---
        df = pd.DataFrame(results)
        df_group = df.groupby("datetime")[["co2_kg_hour", "o2_kg_hour"]].sum().reset_index()
        df_group["datetime"] = df_group["datetime"].apply(lambda x: x.strftime("%Y-%m-%d %H:%M:%S"))

        weather_map = {w["datetime"].strftime("%Y-%m-%d %H:%M:%S"): w for w in weather}

        out = []
        for row in df_group.to_dict(orient="records"):
            meteo = weather_map.get(row["datetime"], {})
            row["precipitazioni_mm"] = meteo.get("precipitation")
            row["temperatura_c"]     = meteo.get("temperature")
            row["radiazione"]        = meteo.get("radiation")
            row["umidita"]           = meteo.get("humidity")
            out.append(row)
        
        print(f"✅ Calcoli completati. Restituisco {len(out)} righe di dati.")
        return out

    # --- NUOVA GESTIONE ECCEZIONI: Cattura prima HTTPException e poi le altre ---
    except HTTPException:
        # Se l'eccezione è già una HTTPException (come i nostri 404), 
        # la rilanciamo così com'è, senza mascherarla.
        raise
    except Exception as e:
        # Per tutti gli altri errori imprevisti, solleviamo un 500.
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Errore interno imprevisto del server: {str(e)}")

@app.get("/calcola_co2/{plot_id}")
async def calcola_co2(plot_id: int, giorno: str = None, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    
    # --- 3. VERIFICA DI PROPRIETÀ ---
    user_id = user["id"]
    query = select(Plot).where(Plot.id == plot_id, Plot.user_id == user_id)
    result = await db.execute(query)
    plot = result.scalar_one_or_none()

    if not plot:
        # Se il plot non esiste O non appartiene all'utente, restituisci un errore.
        # Questo impedisce a un utente di vedere i dati di un altro.
        raise HTTPException(
            status_code=404, 
            detail=f"Terreno con ID {plot_id} non trovato o non appartenente all'utente."
        )
    
    giorno = giorno or date.today().isoformat()
    print(f"📅 Calcolo CO2 per plot {plot_id} nel giorno {giorno}")
    try:
        species = await get_species_from_db(db, plot_id)
        weather = await get_weather_data_from_db(db, plot_id, giorno)
        print(f"🌤️ Meteo trovato: {len(weather)} ore")
        coefs = await get_coefficients_from_db(db)
        
        results = calculate_co2_o2_hourly(species, weather, coefs)
        print("📊 Results:", results)

        if not results:
            raise HTTPException(status_code=404, detail="Nessun dato CO₂/O₂ calcolato")

        df = pd.DataFrame(results)
        df_group = df.groupby("datetime")[["co2_kg_hour", "o2_kg_hour"]].sum().reset_index()
        df_group["datetime"] = df_group["datetime"].apply(lambda x: x.strftime("%Y-%m-%d %H:%M:%S"))

        weather_map = {
            w["datetime"].strftime("%Y-%m-%d %H:%M:%S"): w for w in weather
        }

        out = []
        for row in df_group.to_dict(orient="records"):
            meteo = weather_map.get(row["datetime"], {})
            row["precipitazioni_mm"] = meteo.get("precipitation")
            row["temperatura_c"]     = meteo.get("temperature")
            row["radiazione"]        = meteo.get("radiation")
            row["umidita"]           = meteo.get("humidity")
            out.append(row)

        return out

    except Exception as e:
        print(f"💥 ERRORE nel calcolo CO2: {e}")
        # Aggiungi questo per vedere il traceback completo nel log
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/weather/{plot_id}")
def get_weather(plot_id: int, giorno: str = Query(...)):
    return {"meteo": get_weather_data_from_db(plot_id, giorno)}

@app.get("/species/{plot_id}")
def species_distribution(plot_id: int):
    return {"species": get_species_distribution_by_plot(plot_id)}

@app.get("/api/weather/exists")
async def check_weather_data_exists(plot_id: int, giorno: str = Query(...), db: AsyncSession = Depends(get_db)):
    """
    Verifica in modo efficiente se esistono già dati meteo per un dato terreno e giorno.
    Questo endpoint è usato dal frontend per decidere se avviare un nuovo download da Open-Meteo.
    """
    try:
        # Usiamo la funzione esistente per recuperare i dati meteo.
        # È una funzione sincrona, quindi la eseguiamo in un threadpool per non bloccare l'event loop.
        weather_data = await run_in_threadpool(get_weather_data_from_db, plot_id, giorno)
        
        # Se la funzione restituisce una lista con dei dati, significa che esistono.
        if weather_data:
            return {"exists": True}
        else:
            return {"exists": False}
            
    except Exception as e:
        # In caso di qualsiasi errore (es. plot non trovato), consideriamo che i dati non esistano.
        print(f"Errore durante la verifica dell'esistenza dei dati meteo per plot {plot_id}: {e}")
        return {"exists": False}