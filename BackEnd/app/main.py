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
app.mount("/marketplace", StaticFiles(directory="airvana-marketplace/dist"), name="marketplace")
app.mount("/assets", StaticFiles(directory="airvana-marketplace/dist/assets"), name="assets")

templates = Jinja2Templates(directory="FrontEnd/templates")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:8000", "http://localhost:8000", "http://localhost:5173", "http://165.22.75.145:8001"],
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
        print(f"DEBUG: User data from token: {user}")
        # Controlla che le chiavi necessarie siano presenti nel payload
        required_keys = ["username"] #forse non serve, non viene utilizzata
        if "id" in user:
            # Usa l'ID numerico mappato se disponibile
            user_id = user["id"]
            print(f"DEBUG: Using id: {user_id}")
        elif "google_id" in user:
            # Fallback al google_id se l'ID non è disponibile
            user_id = user["google_id"]
            print(f"DEBUG: Using google_id: {user_id}")
        else:
            print(f"DEBUG: No id or google_id found in user data")
            raise HTTPException(
                status_code=400,
                detail="Dati utente mancanti nel token"
            )

        print(f"DEBUG: Rendering dashboard template for user_id: {user_id}")
        return templates.TemplateResponse("index.html", {
            "request": request,
            "user_id": user_id,
            "username": user.get("name", user.get("username", "User")),
            "user_email": user.get("mail", user.get("email", ""))
        })
    except Exception as e:
        print(f"Errore nel caricamento della dashboard: {e}")
        import traceback
        traceback.print_exc()
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

@app.get("/calcola_co2/{plot_id}")
async def calcola_co2(plot_id: int, giorno: str = None, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    print(f"🔍 DEBUG: Iniziando calcolo CO2 per plot_id={plot_id}, user_id={user.get('id')}")
    
    # --- 3. VERIFICA DI PROPRIETÀ ---
    user_id = user["id"]
    query = select(Plot).where(Plot.id == plot_id, Plot.user_id == user_id)
    result = await db.execute(query)
    plot = result.scalar_one_or_none()

    if not plot:
        # Se il plot non esiste O non appartiene all'utente, restituisci un errore.
        # Questo impedisce a un utente di vedere i dati di un altro.
        print(f"❌ DEBUG: Plot {plot_id} non trovato o non appartiene all'utente {user_id}")
        raise HTTPException(
            status_code=404, 
            detail=f"Terreno con ID {plot_id} non trovato o non appartenente all'utente."
        )
    
    print(f"✅ DEBUG: Plot trovato: {plot.name}")
    
    # Se non viene specificato un giorno, usa l'ultima data disponibile nel DB
    if not giorno:
        from sqlalchemy import text
        result = await db.execute(
            text("SELECT MAX(date_time)::date FROM weather_data WHERE plot_id = :plot_id"),
            {"plot_id": plot_id}
        )
        last_date = result.scalar()
        if last_date:
            giorno = last_date.isoformat()
            print(f"📅 DEBUG: Nessun giorno specificato, uso ultima data disponibile: {giorno}")
        else:
            giorno = date.today().isoformat()
            print(f"📅 DEBUG: Nessun dato meteo, uso oggi: {giorno}")
    else:
        print(f"📅 DEBUG: Giorno specificato: {giorno}")
    
    print(f"📅 DEBUG: Giorno finale usato per calcolo: {giorno}")
    
    try:
        print("🔬 DEBUG: Recupero specie...")
        species = await get_species_from_db(db, plot_id)
        print(f"🌱 DEBUG: Specie trovate: {len(species)} - {species}")
        
        print("🌤️ DEBUG: Recupero dati meteo...")
        weather = await get_weather_data_from_db(db, plot_id, giorno)
        print(f"🌤️ DEBUG: Dati meteo trovati: {len(weather)}")
        if len(weather) == 0:
            # Debug: vediamo se ci sono dati meteo per questo plot in generale
            from sqlalchemy import text
            result = await db.execute(text("SELECT COUNT(*) FROM weather_data WHERE plot_id = :plot_id"), {"plot_id": plot_id})
            total_count = result.scalar()
            print(f"🌤️ DEBUG: Totale record meteo per plot {plot_id}: {total_count}")
            
            # Debug: vediamo alcune date disponibili (semplificato)
            try:
                result = await db.execute(text("SELECT date_time FROM weather_data WHERE plot_id = :plot_id ORDER BY date_time DESC LIMIT 3"), {"plot_id": plot_id})
                dates = result.fetchall()
                print(f"🌤️ DEBUG: Ultime date per plot {plot_id}: {[d[0] for d in dates]}")
            except Exception as e:
                print(f"🌤️ DEBUG: Errore query date: {e}")
        
        print("⚙️ DEBUG: Recupero coefficienti...")
        coefs = await get_coefficients_from_db(db)
        print(f"⚙️ DEBUG: Coefficienti trovati: {len(coefs)} - primi 3: {dict(list(coefs.items())[:3])}")
        
        print("🧮 DEBUG: Calcolo CO2/O2...")
        results = calculate_co2_o2_hourly(species, weather, coefs)
        print(f"🧮 DEBUG: Risultati calcolati: {len(results)}")

        if not results:
            print("❌ DEBUG: Nessun risultato dal calcolo")
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

        print(f"✅ DEBUG: Restituzione {len(out)} record")
        return out

    except Exception as e:
        error_msg = f"💥 ERRORE nel calcolo CO2: {str(e)}"
        print(error_msg)
        # Aggiungi questo per vedere il traceback completo nel log
        import traceback
        full_traceback = traceback.format_exc()
        print(full_traceback)
        # Restituisci errore dettagliato al frontend
        raise HTTPException(status_code=500, detail=f"{error_msg}\n\nTraceback:\n{full_traceback}")



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
        return {"exists": False}

# 📊 NUOVO ENDPOINT: CO2/O2 breakdown per specie
@app.post("/co2_by_species/{plot_id}")
async def get_co2_by_species(plot_id: int, db: AsyncSession = Depends(get_db)):
    """
    Restituisce il breakdown di CO₂ e O₂ per ogni specie di pianta nel terreno.
    Utile per grafici interattivi che mostrano il contributo di ogni specie.
    """
    try:
        # Verifica che il plot esista
        result = await db.execute(select(Plot).where(Plot.id == plot_id))
        plot = result.scalar_one_or_none()
        if not plot:
            raise HTTPException(status_code=404, detail=f"Plot {plot_id} non trovato")
        
        # Ottieni specie e dati meteo
        species = await get_species_from_db(db, plot_id)
        if not species:
            raise HTTPException(status_code=404, detail=f"Nessuna specie trovata per plot {plot_id}")
        
        # Usa l'ultima data disponibile nel DB invece di oggi
        from sqlalchemy import text
        result = await db.execute(
            text("SELECT MAX(date_time)::date FROM weather_data WHERE plot_id = :plot_id"),
            {"plot_id": plot_id}
        )
        last_date = result.scalar()
        if last_date:
            giorno = last_date.isoformat()
            print(f"📅 CO2_by_species: uso ultima data disponibile: {giorno}")
        else:
            giorno = datetime.today().strftime("%Y-%m-%d")
            print(f"📅 CO2_by_species: nessun dato meteo, uso oggi: {giorno}")
        
        weather = await get_weather_data_from_db(db, plot_id, giorno)
        if not weather:
            raise HTTPException(status_code=404, detail="Dati meteo non disponibili")
        
        coefs = await get_coefficients_from_db(db)
        
        # Calcola CO2/O2 orari per specie
        results = calculate_co2_o2_hourly(species, weather, coefs)
        df = pd.DataFrame(results)
        
        # Aggrega per specie (somma totale giornaliera)
        species_totals = df.groupby("species")[["co2_kg_hour", "o2_kg_hour"]].sum().reset_index()
        species_totals = species_totals.rename(columns={
            "co2_kg_hour": "total_co2_kg",
            "o2_kg_hour": "total_o2_kg"
        })
        
        # Aggiungi dati meteo all'hourly breakdown
        # Crea un dizionario di lookup per i dati meteo per datetime
        weather_lookup = {w.get("datetime"): w for w in weather}
        
        # Calcola anche il breakdown orario per specie (per filtraggio)
        hourly_by_species = df.groupby(["datetime", "species"])[["co2_kg_hour", "o2_kg_hour"]].sum().reset_index()
        
        # Aggiungi dati meteo a hourly_by_species
        hourly_by_species["precipitazioni_mm"] = hourly_by_species["datetime"].apply(
            lambda x: weather_lookup.get(x, {}).get("precipitation", 0)
        )
        hourly_by_species["temperatura_c"] = hourly_by_species["datetime"].apply(
            lambda x: weather_lookup.get(x, {}).get("temperature", 0)
        )
        hourly_by_species["radiazione"] = hourly_by_species["datetime"].apply(
            lambda x: weather_lookup.get(x, {}).get("radiation", 0)
        )
        hourly_by_species["umidita"] = hourly_by_species["datetime"].apply(
            lambda x: weather_lookup.get(x, {}).get("humidity", 0)
        )
        
        hourly_by_species["datetime"] = hourly_by_species["datetime"].apply(lambda x: x.strftime("%Y-%m-%d %H:%M:%S"))
        
        return {
            "totals": species_totals.to_dict(orient="records"),
            "hourly": hourly_by_species.to_dict(orient="records")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Errore server: {str(e)}")

# Route fallback per marketplace (con e senza trailing slash)
@app.get("/marketplace", include_in_schema=False)
@app.get("/marketplace/", include_in_schema=False)
async def serve_marketplace_index():
    # Serve il file index.html dalla directory dist di airvana-marketplace
    marketplace_path = os.path.join("airvana-marketplace", "dist", "index.html")
    if os.path.exists(marketplace_path):
        return FileResponse(marketplace_path)
    else:
        raise HTTPException(status_code=404, detail="Marketplace non disponibile")