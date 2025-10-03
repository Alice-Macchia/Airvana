from fastapi import FastAPI, Request, Query, Depends, HTTPException, Cookie
from fastapi.responses import HTMLResponse, RedirectResponse, FileResponse
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
from BackEnd.app.models import Base, Plot, PlotSpecies, Species
from BackEnd.app.routes import router
from BackEnd.app.auth import router as auth_router

from BackEnd.app.schemas import (SaveCoordinatesRequest, SaveCoordinatesResponse, ClassificaRequest, ClassificaResponse, EsportaRequest, EsportaResponse)
from BackEnd.app.utils import (inserisci_terreno, mostra_classifica, Esporta, get_species_distribution_by_plot)
from BackEnd.app.co2_o2_calculator import (calculate_co2_o2_hourly, get_coefficients_from_db, get_weather_data_from_db, get_species_from_db, aggiorna_weatherdata_con_assorbimenti)
from BackEnd.app.get_meteo import fetch_and_save_weather_day
from BackEnd.app.auth import get_current_user
from BackEnd.app.database import get_db
from BackEnd.app.get_all_plots import get_all_plots_coords

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

# Marketplace React - Mount dei file statici
app.mount("/marketplace", StaticFiles(directory="marketplace_dist"), name="marketplace")
app.mount("/assets", StaticFiles(directory="marketplace_dist/assets"), name="assets")

templates = Jinja2Templates(directory="FrontEnd/templates")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:8000", "http://localhost:8000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
app.include_router(auth_router)


@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Database pronto")

@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    return templates.TemplateResponse("homepagedefinitiva.html", {"request": request})

@app.get("/logout")
async def logout():
    response = RedirectResponse(url="/")
    response.delete_cookie("access_token")
    return response


def decode_token(token: str):
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=403, detail="Token non valido")

@app.get("/dashboard", response_class=HTMLResponse)
async def dashboard(request: Request, user=Depends(get_current_user)):
    try:
        print(f"Dati utente: {user}")
        print("Caricamento dati per la dashboard...")

        # Controlla che le chiavi necessarie siano presenti nel payload
        required_keys = ["name"]
        if "id" in user:
            # Usa l'ID numerico mappato se disponibile
            user_id = user["id"]
        elif "google_id" in user:
            # Fallback al google_id se l'ID non è disponibile
            user_id = user["google_id"]
        else:
            raise HTTPException(
                status_code=400,
                detail="Dati utente mancanti nel token"
            )

        return templates.TemplateResponse("index.html", {
            "request": request,
            "user_id": user_id,
            "username": user["name"],
            "user_email": user.get("email", "")
        })
    except Exception as e:
        print(f"Errore nel caricamento della dashboard: {e}")
        raise HTTPException(status_code=500, detail="Errore nel caricamento della dashboard")

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
        species = await get_species_from_db(db, plot_id)
        
        # --- NUOVO CONTROLLO: Verifica se ci sono specie associate al terreno ---
        if not species:
            raise HTTPException(
                status_code=404, 
                detail=f"Nessuna specie di pianta trovata per il terreno {plot_id}. Impossibile calcolare CO₂/O₂."
            )
        
        centroid_point = to_shape(plot.centroid)
        lat, lon = centroid_point.y, centroid_point.x
        print(f"📍 Coordinate per plot {plot_id}: Lat={lat}, Lon={lon}")

        # --- 2. Scarica e salva i dati meteo ---
        success = await fetch_and_save_weather_day(db, plot_id, lat, lon)
        if not success:
            raise HTTPException(status_code=502, detail="Errore durante il recupero dei dati da Open-Meteo.")
        print(f"✅ Dati meteo per plot {plot_id} salvati.")

        # --- 3. Esegui i calcoli CO2/O2 ---
        oggi = datetime.today().strftime("%Y-%m-%d")
        print(f"📅 Eseguo calcoli CO2/O2 per plot {plot_id} per il giorno {oggi}...")
        
         # Questa funzione aggiornerà gli stessi oggetti WeatherData nella stessa sessione
        await aggiorna_weatherdata_con_assorbimenti(db, plot_id, oggi)
        
        # Ora facciamo il commit di TUTTE le operazioni (INSERT + UPDATE)
        await db.commit()
        print(f"✅ Commit eseguito. Dati meteo e CO2/O2 salvati per plot {plot_id}.")


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
    print(f"➡️ Inizio calcolo_co2 per plot_id={plot_id}")
    print(f"🧪 Utente: {user}")

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
        coefs = await get_coefficients_from_db(db, plot_id)
        
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



@router.get("/api/get_all_plots")
async def get_all_plots(session: AsyncSession = Depends(get_db)):
    plots = await get_all_plots_coords(session)
    return {"data": plots}

@app.get("/api/users/me/plots")
async def get_user_plots(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """
    Ottiene tutti i plot dell'utente corrente con le loro specie
    """
    try:
        user_id = user["id"]
        
        # Query per ottenere tutti i plot dell'utente
        query = select(Plot).where(Plot.user_id == user_id)
        result = await db.execute(query)
        plots = result.scalars().all()
        
        plots_data = []
        for plot in plots:
            # Ottieni le specie per questo plot
            species_query = select(PlotSpecies, Species).join(Species).where(PlotSpecies.plot_id == plot.id)
            species_result = await db.execute(species_query)
            species_data = species_result.all()
            
            # Formatta le specie
            species_list = []
            for plot_species, species in species_data:
                species_list.append({
                    "name": species.name,
                    "quantity": plot_species.surface_area
                })
            
            # Calcola area totale dal poligono se disponibile
            area_ha = 0
            if plot.geom:
                from geoalchemy2.shape import to_shape
                try:
                    shapely_geom = to_shape(plot.geom)
                    area_ha = shapely_geom.area * 111.32 * 111.32 * 0.0001  # Converti in ettari
                except:
                    area_ha = 0
            
            plot_info = {
                "id": plot.id,
                "name": plot.name or f"Terreno {plot.id}",
                "species": species_list,
                "area_ha": round(area_ha, 2),
                "perimetro_m": 0,  # Calcolabile se necessario
                "coordinate": [],  # Coordinate del poligono se necessario
                "created_at": plot.created_at.isoformat() if plot.created_at else None
            }
            plots_data.append(plot_info)
        
        return {"plots": plots_data}
        
    except Exception as e:
        print(f"Errore nel recupero dei plot dell'utente: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Errore nel recupero dei plot")



@app.get("/weather/{plot_id}")
async def get_weather(plot_id: int, giorno: str = Query(...), db: AsyncSession = Depends(get_db)):
    # Ora usiamo await e passiamo la sessione db
    weather_data = await get_weather_data_from_db(db, plot_id, giorno)
    return {"meteo": weather_data}

@app.get("/species/{plot_id}")
async def species_distribution(plot_id: int, db: AsyncSession = Depends(get_db)):
    # Assumendo che la funzione get_species... sia stata corretta per accettare 'db'
    species_data = await get_species_from_db(db, plot_id)
    return {"species": species_data}

@app.get("/api/weather/exists")
async def check_weather_data_exists(plot_id: int, giorno: str = Query(...), db: AsyncSession = Depends(get_db)):
    """
    Verifica in modo efficiente se esistono già dati meteo per un dato terreno e giorno.
    """
    try:
        # --- MODIFICA QUI ---
        # Ora che la funzione è async, la chiamiamo direttamente con await.
        weather_data = await get_weather_data_from_db(db, plot_id, giorno)
        
        if weather_data:
            return {"exists": True}
        else:
            return {"exists": False}
            
    except Exception as e:
        print(f"Errore durante la verifica dell'esistenza dei dati meteo per plot {plot_id}: {e}")
        return {"exists": False}

# Route fallback SOLO per /marketplace e /marketplace/
@app.get("/marketplace", include_in_schema=False)
@app.get("/marketplace/", include_in_schema=False)
async def serve_marketplace_index():
    return FileResponse("marketplace_dist/index.html")