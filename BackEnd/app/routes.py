from fastapi import APIRouter, HTTPException, Depends, Security, Request, Form, status
from fastapi.responses import HTMLResponse, RedirectResponse
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from geoalchemy2.shape import to_shape
from .models import Plot, PlotSpecies, Species
from .database import get_db
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.exc import IntegrityError
from BackEnd.app.auth import create_access_token, decode_access_token, get_current_user
from BackEnd.app.schemas import UserCreate, UserLogin, UserInsert, RenamePlotRequest, DeletePlotRequest, FarmerBase, SocietyBase, AgronomistCreate, AgronomistOut, FarmerCreate, AgronomistBase, FarmerRegistration, SocietyRegistration, AgronomistRegistration, TerrainUpdateRequest, TerrainDeleteRequest, SpeciesUpdateRequest, SpeciesDeleteRequest, TerrainUpdateResponse, TerrainDeleteResponse, TerrainCoordinatesUpdateRequest
from BackEnd.app.models import User, Farmer, Society, PlotInfo, Plot, Agronomist, Species, PlotSpecies
from BackEnd.app.security import hash_password, verify_password
from BackEnd.app.database import SessionLocal
from BackEnd.app.get_meteo import fetch_and_save_weather_day, fetch_weather_week
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, JSONResponse
from BackEnd.app.utils import aggiorna_nome_plot, elimina_plot
from BackEnd.app.database import SessionLocal
from typing import List
from pydantic import BaseModel
from shapely.wkb import loads
from shapely.geometry import Polygon
from sqlalchemy import func


# router = APIRouter()
router = APIRouter()
security = HTTPBearer()  # definisce il tipo di security scheme Bearer
templates = Jinja2Templates(directory="FrontEnd/templates")


async def get_db():
    async_session = SessionLocal()
    try:
        yield async_session
    finally:
        if async_session:
            await async_session.close()

@router.get("/api/plots/{plot_id}/summary")
async def get_plot_summary(plot_id: int, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Restituisce metriche sintetiche per popolare le schede della dashboard.
    Metriche calcolate sull'insieme dei dati meteo disponibili per il plot:
      - name: nome del terreno
      - co2_totale: somma total_co2_absorption
      - o2_totale: somma total_o2_production
      - pioggia_media: media precipitation
      - temp_max_min: stringa "max/min" temperatura
    """
    try:
        plot_result = await db.execute(select(Plot).where(Plot.id == plot_id, Plot.user_id == user.get("id")))
        plot = plot_result.scalar_one_or_none()
        if not plot:
            raise HTTPException(status_code=404, detail="Terreno non trovato o non autorizzato")

        from .models import WeatherData
        weather_q = await db.execute(
            select(
                func.coalesce(func.sum(WeatherData.total_co2_absorption), 0),
                func.coalesce(func.sum(WeatherData.total_o2_production), 0),
                func.coalesce(func.avg(WeatherData.precipitation), 0),
                func.coalesce(func.max(WeatherData.temperature), 0),
                func.coalesce(func.min(WeatherData.temperature), 0)
            ).where(WeatherData.plot_id == plot_id)
        )
        weather_data = weather_q.first()
        if not weather_data:
            # Nessun dato meteo disponibile, restituisci valori di default
            co2_tot, o2_tot, pioggia_media, t_max, t_min = 0, 0, 0, None, None
        else:
            co2_tot, o2_tot, pioggia_media, t_max, t_min = weather_data

        return {
            "plot_id": plot_id,
            "name": plot.name,
            "co2_totale": round(co2_tot, 2),
            "o2_totale": round(o2_tot, 2),
            "pioggia_media": round(pioggia_media, 2),
            "temp_max_min": f"{round(t_max,1)}/{round(t_min,1)}" if t_max is not None and t_min is not None else "--/--"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore interno del server: {str(e)}")
            
@router.get("/logreg", response_class=HTMLResponse)
async def root(request: Request):
    """
    Root endpoint that handles user authentication and redirection.

    Checks if user has a valid JWT token in cookies and redirects to dashboard
    if authenticated, otherwise serves the login page.

    Args:
        request: FastAPI request object

    Returns:
        RedirectResponse: To dashboard if authenticated
        HTMLResponse: Login page if not authenticated
    """
    token = request.cookies.get("access_token")
    if token:
        # Prova a decodificare il token
        from BackEnd.app.auth import decode_access_token
        payload = decode_access_token(token)
        if payload:
            # Token valido, reindirizza alla dashboard
            return RedirectResponse(url="/dashboard")
    
    # Nessun token o token non valido, mostra la pagina di login
    return templates.TemplateResponse("login_main.html", {"request": request})

    
@router.post("/register")
async def register_user(data: dict, db: AsyncSession = Depends(get_db)):
    """
    Unified registration endpoint for all user types (farmer, society, agronomist).
    
    Args:
        data: Registration data containing user_type and profile details
        db: Database session
        
    Returns:
        dict: Success message
        
    Raises:
        HTTPException: If email already exists, invalid user_type, or registration fails
    """
    try:
        user_data = data.get("user", {})
        user_type = user_data.get("user_type")
        
        if user_type not in ["farmer", "society", "agronomist"]:
            raise HTTPException(status_code=400, detail="Tipo utente non valido. Deve essere: farmer, society, o agronomist")
        
        # 1. Controllo esistenza email
        result = await db.execute(select(User).where(User.email == user_data.get("email")))
        if result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Email già usata")
        
        # 2. Crea l'utente base
        user = User(
            email=user_data.get("email"),
            password=hash_password(user_data.get("password")),
            user_type=user_type
        )
        db.add(user)
        await db.flush()
        
        # 3. Crea il profilo specifico in base al user_type
        if user_type == "farmer":
            farmer_data = data.get("farmer", {})
            farmer = Farmer(
                user_id=user.id,
                username=farmer_data.get("username"),
                first_name=farmer_data.get("first_name"),
                last_name=farmer_data.get("last_name"),
                cod_fis=farmer_data.get("cod_fis"),
                farm_name=farmer_data.get("farm_name"),
                phone_number=farmer_data.get("phone_number"),
                province=farmer_data.get("province"),
                city=farmer_data.get("city"),
                address=farmer_data.get("address")
            )
            db.add(farmer)
            
        elif user_type == "society":
            society_data = data.get("society", {})
            society = Society(
                user_id=user.id,
                username=society_data.get("username"),
                ragione_sociale=society_data.get("ragione_sociale"),
                sede_legale=society_data.get("sede_legale"),
                partita_iva=society_data.get("partita_iva"),
                province=society_data.get("province"),
                city=society_data.get("city")
            )
            db.add(society)
            
        elif user_type == "agronomist":
            agronomist_data = data.get("agronomist", {})
            agronomist = Agronomist(
                user_id=user.id,
                albo_number=agronomist_data.get("albo_number"),
                specialization=agronomist_data.get("specialization")
            )
            db.add(agronomist)
        
        await db.commit()
        return {"message": "Registrazione completata", "user_type": user_type}
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Errore durante la registrazione: {str(e)}")


@router.post("/login", response_class=HTMLResponse)
async def login(
    request: Request,
    loginEmail: str = Form(...),
    loginPassword: str = Form(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Authenticate user with email and password.
    
    Args:
        request: FastAPI request object
        loginEmail: User's email address
        loginPassword: User's password
        db: Database session
    
    Returns:
        HTMLResponse: Login success page with JWT token cookie
        
    Raises:
        HTTPException: If credentials are invalid
    """
    result = await db.execute(select(User).where(User.email == loginEmail))
    db_user = result.scalar_one_or_none()

    if not db_user or not verify_password(loginPassword, db_user.password):
        raise HTTPException(status_code=401, detail="Credenziali non valide")
    
    #-----------------------------#
    username = None
    # Cerca in Farmer
    person_result = await db.execute(select(Farmer).where(Farmer.user_id == db_user.id))
    person = person_result.scalar_one_or_none()
    if person:
        username = person.username
    else:
        # Se non è una persona, cerca in Society
        society_result = await db.execute(select(Society).where(Society.user_id == db_user.id))
        society = society_result.scalar_one_or_none()
        if society:
            username = society.username

    # Se non si trova un username, usa l'email come fallback
    if not username:
        username = db_user.email
    #-----------------------------#
    
    # token = create_access_token({"id": db_user.id, "mail": db_user.email})
    # print("🔑 Token creato:", token)

    # --- MODIFICA TOKEN: Aggiungi l'username al payload ---
    token_payload = {"id": db_user.id, "mail": db_user.email, "username": username}
    token = create_access_token(token_payload)

    response = JSONResponse(content={"message": "Login OK"})
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        max_age=1800,
        secure=False,
        samesite="lax"
    )
    return response

@router.get("/inserisciterreno", response_class=HTMLResponse)
async def inserisciterreno(request: Request, user: dict = Depends(get_current_user)):
    """
    Questa rotta ora è protetta. 
    'user' conterrà il payload del token (es. {'id': 1, 'mail': 'test@test.com'}).
    """
    # Ora puoi passare i dati dell'utente al template
    return templates.TemplateResponse("Aggiungi_Terreno_index.html", {
        "request": request,
        "user_id": user.get("id"),
        "email": user.get("username")
    })

@router.post("/weather/{plot_id}")
async def fetch_weather(plot_id: int, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    try:
        # Verifica che il plot appartenga all'utente
        user_id = user.get("id") or user.get("google_id")
        plot_query = select(Plot).where(Plot.id == plot_id, Plot.user_id == user_id)
        plot_result = await db.execute(plot_query)
        plot = plot_result.scalar_one_or_none()

        if not plot:
            raise HTTPException(status_code=404, detail=f"Plot {plot_id} non trovato o non autorizzato.")

        # Ottieni le coordinate del plot
        if not plot.centroid:
            raise HTTPException(status_code=400, detail=f"Plot {plot_id} non ha coordinate definite.")

        centroid_point = to_shape(plot.centroid)
        lat, lon = centroid_point.y, centroid_point.x

        # Salva i dati meteo
        success = await fetch_and_save_weather_day(db, plot_id, lat, lon)
        if not success:
            raise HTTPException(status_code=500, detail=f"Errore nel salvataggio dei dati meteo per plot {plot_id}.")

        return {"detail": "Dati meteo salvati con successo."}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Errore in fetch_weather per plot {plot_id}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Errore durante il recupero dei dati meteo: {str(e)}")

@router.get("/profilo", response_class=HTMLResponse)
async def profilo_utente(request: Request, user: dict = Depends(get_current_user)):
    """
    Mostra la pagina del profilo utente
    """
    return templates.TemplateResponse("schedaUtente.html", {"request": request})

@router.get("/api/user/profile")
async def get_user_profile(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """
    Get complete user profile data including user info and associated entities.

    Args:
        user: Authenticated user data from JWT token
        db: Database session

    Returns:
        dict: User profile data with farmer/society/agronomist details

    Raises:
        HTTPException: If user profile cannot be retrieved
    """
    try:
        user_id = user["id"]
        user_type = user.get("user_type", "farmer")
        
        # Query per recuperare l'utente base
        user_query = select(User).where(User.id == user_id)
        user_result = await db.execute(user_query)
        user_obj = user_result.scalar_one_or_none()
        
        if not user_obj:
            raise HTTPException(status_code=404, detail="Utente non trovato")
        
        # Recupera i dati specifici in base al tipo di utente
        profile_data = {
            "id": user_obj.id,
            "email": user_obj.email,
            "user_type": user_obj.user_type,
            "created_at": user_obj.created_at.isoformat() if hasattr(user_obj, 'created_at') and user_obj.created_at else None
        }
        
        # Recupera dati da tabella Farmer
        if user_type == "farmer":
            farmer_query = select(Farmer).where(Farmer.user_id == user_id)
            farmer_result = await db.execute(farmer_query)
            farmer = farmer_result.scalar_one_or_none()
            
            if farmer:
                profile_data.update({
                    "username": farmer.username,
                    "first_name": farmer.first_name,
                    "last_name": farmer.last_name,
                    "cod_fis": farmer.cod_fis,
                    "farm_name": farmer.farm_name,
                    "phone_number": farmer.phone_number,
                    "province": farmer.province,
                    "city": farmer.city,
                    "address": farmer.address
                })
        
        # Recupera dati da tabella Society
        elif user_type == "society":
            society_query = select(Society).where(Society.user_id == user_id)
            society_result = await db.execute(society_query)
            society = society_result.scalar_one_or_none()
            
            if society:
                profile_data.update({
                    "username": society.username,
                    "first_name": society.ragione_sociale,
                    "last_name": "",
                    "cod_fis": society.p_iva,
                    "farm_name": society.ragione_sociale,
                    "phone_number": society.phone_number,
                    "province": society.province,
                    "city": society.city,
                    "address": society.address
                })
        
        # Recupera dati da tabella Agronomist
        elif user_type == "agronomist":
            agro_query = select(Agronomist).where(Agronomist.user_id == user_id)
            agro_result = await db.execute(agro_query)
            agro = agro_result.scalar_one_or_none()
            
            if agro:
                profile_data.update({
                    "username": agro.username,
                    "first_name": agro.first_name,
                    "last_name": agro.last_name,
                    "cod_fis": agro.cod_fis,
                    "farm_name": agro.nome_studio if hasattr(agro, 'nome_studio') else None,
                    "phone_number": agro.phone_number if hasattr(agro, 'phone_number') else None,
                    "province": agro.province if hasattr(agro, 'province') else None,
                    "city": agro.city if hasattr(agro, 'city') else None,
                    "address": agro.address if hasattr(agro, 'address') else None
                })
        
        # Conta i terreni dell'utente
        plots_query = select(Plot).where(Plot.user_id == user_id)
        plots_result = await db.execute(plots_query)
        plots = plots_result.scalars().all()
        profile_data["terreno_count"] = len(plots)
        
        # Calcola area totale (se disponibile)
        total_area = 0
        for plot in plots:
            if plot.geom:
                try:
                    geom_wkb = plot.geom.data
                    shapely_geom = loads(geom_wkb)
                    if isinstance(shapely_geom, Polygon):
                        area_m2 = shapely_geom.area * 111320 * 111320  # Approssimazione
                        total_area += area_m2 / 10000  # Converti in ettari
                except:
                    pass
        
        profile_data["total_area"] = round(total_area, 2)
        
        return profile_data
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Errore nel recupero profilo: {str(e)}")

@router.get("/get-user-terreni/{user_id}")
async def get_user_terreni(user_id: int, db: AsyncSession = Depends(get_db)):
    """
    Restituisce i terreni dell'utente specificato nel formato richiesto dal frontend.
    Questa rotta è specifica per il frontend e restituisce dati più dettagliati.
    """
    try:
        # Verifica che l'utente esista
        user_query = select(User).where(User.id == user_id)
        user_result = await db.execute(user_query)
        user = user_result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(status_code=404, detail="Utente non trovato")
        
        # Recupera i terreni dell'utente con le specie caricate in anticipo
        from sqlalchemy.orm import selectinload
        plots_query = select(Plot).options(
            selectinload(Plot.species_associations).selectinload(PlotSpecies.species)
        ).where(Plot.user_id == user_id)
        
        plots_result = await db.execute(plots_query)
        plots = plots_result.scalars().all()
        
        if not plots:
            return []
        
        # Prepara i dati nel formato richiesto dal frontend
        terreni_data = []
        
        for plot in plots:
            # Calcola l'area del poligono se disponibile
            area_ha = 0
            perimetro_m = 0
            vertices = []
            
            if plot.geom:
                try:
                    # Converti la geometria WKB in un oggetto Shapely
                    geom_wkb = plot.geom.data
                    shapely_geom = loads(geom_wkb)
                    
                    if isinstance(shapely_geom, Polygon):
                        # Converti le coordinate da gradi a metri per calcoli accurati
                        from pyproj import Transformer
                        
                        # Crea un transformer per convertire da WGS84 a UTM
                        # Trova la zona UTM appropriata basandosi sul centroide
                        centroid_coords = list(shapely_geom.centroid.coords)[0]
                        lon, lat = centroid_coords
                        
                        # Calcola la zona UTM (semplificato per l'Italia)
                        utm_zone = int((lon + 180) / 6) + 1
                        utm_epsg = 32600 + utm_zone  # EPSG per UTM Nord
                        
                        transformer = Transformer.from_crs("EPSG:4326", f"EPSG:{utm_epsg}", always_xy=True)
                        
                        # Converti le coordinate del poligono in UTM
                        utm_coords = []
                        for coord in shapely_geom.exterior.coords:
                            x, y = transformer.transform(coord[0], coord[1])
                            utm_coords.append((x, y))
                        
                        # Crea un nuovo poligono in coordinate UTM
                        from shapely.geometry import Polygon as ShapelyPolygon
                        utm_polygon = ShapelyPolygon(utm_coords)
                        
                        # Calcola area in m² e converti in ettari
                        area_m2 = utm_polygon.area
                        area_ha = area_m2 / 10000
                        
                        # Calcola perimetro in metri
                        perimetro_m = utm_polygon.length
                        
                        # Estrai i vertici del poligono (mantieni le coordinate originali in gradi)
                        coords = list(shapely_geom.exterior.coords)
                        for coord in coords:
                            vertices.append({
                                "lat": coord[1],  # latitudine
                                "long": coord[0]  # longitudine
                            })
                except Exception as e:
                    pass
            
            # Recupera le specie associate al terreno (ora caricate in anticipo)
            species_data = []
            try:
                if hasattr(plot, 'species_associations') and plot.species_associations:
                    for ps in plot.species_associations:
                        try:
                            # Le specie sono già caricate, non serve fare query aggiuntive
                            if hasattr(ps, 'species') and ps.species:
                                species_data.append({
                                    "name": ps.species.name,
                                    "quantity": ps.surface_area,
                                    "co2_absorption_rate": ps.species.co2_absorption_rate or 0
                                })
                        except Exception as e:
                            continue
            except Exception as e:
                pass
            
            terreno = {
                "id": plot.id,
                "terrain_name": plot.name or f"Terreno {plot.id}",
                "species": species_data,
                "area_ha": round(area_ha, 2),
                "perimetro_m": round(perimetro_m, 2),
                "vertices": vertices
            }
            
            terreni_data.append(terreno)
        
        return terreni_data
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Errore interno del server: {str(e)}")


# ===== NUOVE ROTTE PER AGGIORNAMENTO/ELIMINAZIONE TERRAIN =====

@router.put("/update-terrain", response_model=TerrainUpdateResponse)
async def update_terrain(request: TerrainUpdateRequest, db: AsyncSession = Depends(get_db)):
    """Aggiorna un terreno esistente (nome e/o specie)"""
    try:
        # Verifica che il terreno esista e appartenga all'utente
        plot_query = select(Plot).where(Plot.id == request.terrain_id)
        plot_result = await db.execute(plot_query)
        plot = plot_result.scalar_one_or_none()
        
        if not plot:
            raise HTTPException(status_code=404, detail="Terreno non trovato")
        
        # Aggiorna il nome se fornito
        if request.terrain_name is not None:
            plot.name = request.terrain_name
        
        # Aggiorna le specie se fornite
        if request.species is not None:
            # Rimuovi le specie esistenti
            existing_species_query = select(PlotSpecies).where(PlotSpecies.plot_id == request.terrain_id)
            existing_species_result = await db.execute(existing_species_query)
            existing_species = existing_species_result.scalars().all()
            
            for ps in existing_species:
                await db.delete(ps)
            
            # Aggiungi le nuove specie
            for species_data in request.species:
                # Trova la specie nel database
                species_query = select(Species).where(Species.name == species_data.name)
                species_result = await db.execute(species_query)
                species = species_result.scalar_one_or_none()
                
                if species:
                    plot_species = PlotSpecies(
                        plot_id=request.terrain_id,
                        species_id=species.id,
                        surface_area=species_data.quantity
                    )
                    db.add(plot_species)
        
        await db.commit()
        
        # Restituisci i dati aggiornati
        updated_terrain = {
            "id": plot.id,
            "name": plot.name,
            "species": request.species if request.species else []
        }
        
        return TerrainUpdateResponse(
            message="Terreno aggiornato con successo",
            updated_terrain=updated_terrain
        )
        
    except Exception as e:
        await db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Errore interno del server: {str(e)}")


@router.delete("/delete-terrain", response_model=TerrainDeleteResponse)
async def delete_terrain(request: TerrainDeleteRequest, db: AsyncSession = Depends(get_db)):
    """
    Delete a terrain and all its associated species and data.

    Args:
        request: TerrainDeleteRequest containing terrain_id
        db: Database session

    Returns:
        dict: Success message

    Raises:
        HTTPException: If terrain not found or deletion fails
    """
    try:
        # Verifica che il terreno esista
        plot_query = select(Plot).where(Plot.id == request.terrain_id)
        plot_result = await db.execute(plot_query)
        plot = plot_result.scalar_one_or_none()
        
        if not plot:
            raise HTTPException(status_code=404, detail="Terreno non trovato")
        
        # Rimuovi prima le associazioni con le specie
        species_associations_query = select(PlotSpecies).where(PlotSpecies.plot_id == request.terrain_id)
        species_associations_result = await db.execute(species_associations_query)
        species_associations = species_associations_result.scalars().all()
        
        for ps in species_associations:
            await db.delete(ps)
        
        # Rimuovi il terreno
        await db.delete(plot)
        
        await db.commit()
        
        return TerrainDeleteResponse(
            message="Terreno eliminato con successo"
        )
        
    except Exception as e:
        await db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Errore interno del server: {str(e)}")


@router.put("/update-species", response_model=TerrainUpdateResponse)
async def update_species(request: SpeciesUpdateRequest, db: AsyncSession = Depends(get_db)):
    """
    Update a single species entry for a terrain plot.

    Args:
        request: SpeciesUpdateRequest containing terrain_id, species_id, and updated data
        db: Database session

    Returns:
        dict: Success message with updated species data

    Raises:
        HTTPException: If species association not found or update fails
    """
    try:
        # Verifica che l'associazione specie-terreno esista
        plot_species_query = select(PlotSpecies).where(
            PlotSpecies.plot_id == request.terrain_id,
            PlotSpecies.id == request.species_id
        )
        plot_species_result = await db.execute(plot_species_query)
        plot_species = plot_species_result.scalar_one_or_none()
        
        if not plot_species:
            raise HTTPException(status_code=404, detail="Associazione specie-terreno non trovata")
        
        # Aggiorna la specie se fornita
        if request.name is not None:
            species_query = select(Species).where(Species.name == request.name)
            species_result = await db.execute(species_query)
            species = species_result.scalar_one_or_none()
            
            if not species:
                raise HTTPException(status_code=400, detail="Specie non valida")
            
            plot_species.species_id = species.id
        
        # Aggiorna la quantità se fornita
        if request.quantity is not None:
            plot_species.surface_area = request.quantity
        
        await db.commit()
        
        # Restituisci i dati aggiornati
        updated_terrain = {
            "id": request.terrain_id,
            "species_updated": True
        }
        
        return TerrainUpdateResponse(
            message="Specie aggiornata con successo",
            updated_terrain=updated_terrain
        )
        
    except Exception as e:
        await db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Errore interno del server: {str(e)}")


@router.put("/update-terrain-coordinates", response_model=TerrainUpdateResponse)
async def update_terrain_coordinates(request: TerrainCoordinatesUpdateRequest, db: AsyncSession = Depends(get_db)):
    """
    Update the geographical coordinates of an existing terrain plot.

    Args:
        request: TerrainCoordinatesUpdateRequest containing terrain_id and new coordinates
        db: Database session

    Returns:
        dict: Success message

    Raises:
        HTTPException: If terrain not found or coordinates update fails
    """
    try:
        # Verifica che il terreno esista
        plot_query = select(Plot).where(Plot.id == request.terrain_id)
        plot_result = await db.execute(plot_query)
        plot = plot_result.scalar_one_or_none()
        
        if not plot:
            raise HTTPException(status_code=404, detail="Terreno non trovato")
        
        # Aggiorna la geometria del poligono
        from shapely.geometry import Polygon, Point
        from geoalchemy2.shape import from_shape
        
        polygon = Polygon([(v.long, v.lat) for v in request.vertices])
        point = Point(request.centroid.long, request.centroid.lat)
        
        plot.geom = from_shape(polygon, srid=4326)
        plot.centroid = from_shape(point, srid=4326)
        
        await db.commit()
        
        # Restituisci i dati aggiornati
        updated_terrain = {
            "id": plot.id,
            "coordinates_updated": True,
            "area": polygon.area,
            "perimeter": polygon.length
        }
        
        return TerrainUpdateResponse(
            message="Coordinate del terreno aggiornate con successo",
            updated_terrain=updated_terrain
        )
        
    except Exception as e:
        await db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Errore interno del server: {str(e)}")


@router.delete("/delete-species", response_model=TerrainDeleteResponse)
async def delete_species(request: SpeciesDeleteRequest, db: AsyncSession = Depends(get_db)):
    """
    Delete a single species association from a terrain plot.

    Args:
        request: SpeciesDeleteRequest containing terrain_id and species_id
        db: Database session

    Returns:
        dict: Success message

    Raises:
        HTTPException: If species association not found or deletion fails
    """
    try:
        # Verifica che l'associazione specie-terreno esista
        plot_species_query = select(PlotSpecies).where(
            PlotSpecies.plot_id == request.terrain_id,
            PlotSpecies.id == request.species_id
        )
        plot_species_result = await db.execute(plot_species_query)
        plot_species = plot_species_result.scalar_one_or_none()
        
        if not plot_species:
            raise HTTPException(status_code=404, detail="Associazione specie-terreno non trovata")
        
        # Elimina l'associazione
        await db.delete(plot_species)
        
        await db.commit()
        
        return TerrainDeleteResponse(
            message="Specie eliminata con successo"
        )
        
    except Exception as e:
        await db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Errore interno del server: {str(e)}")


# === ROUTE PER SALVARE PLOT ===
@router.post("/save-plot")
async def save_plot(plot_data: dict, db: AsyncSession = Depends(get_db)):
    """Salva un nuovo plot nel database"""
    try:
        # Crea un nuovo plot
        new_plot = Plot(
            user_id=41,  # Per ora hardcoded, poi useremo l'utente autenticato
            name=plot_data.get("name"),
            geom=None,  # Per ora None, poi aggiungeremo la geometria
            created_at=datetime.now()
        )
        
        db.add(new_plot)
        await db.flush()  # Per ottenere l'ID
        
        # Aggiungi le specie se presenti
        if plot_data.get("species"):
            for species_info in plot_data["species"]:
                # Trova o crea la specie
                species_query = select(Species).where(Species.name == species_info["name"])
                species_result = await db.execute(species_query)
                species = species_result.scalar_one_or_none()
                
                if not species:
                    species = Species(name=species_info["name"])
                    db.add(species)
                    await db.flush()
                
                # Crea l'associazione plot-specie
                plot_species = PlotSpecies(
                    plot_id=new_plot.id,
                    species_id=species.id,
                    surface_area=species_info["quantity"]
                )
                db.add(plot_species)
        
        await db.commit()
        
        return {"success": True, "plot_id": new_plot.id, "message": "Plot salvato con successo"}
        
    except Exception as e:
        await db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Errore nel salvataggio: {str(e)}")