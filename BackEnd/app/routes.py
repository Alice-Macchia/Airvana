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
            
@router.get("/logreg", response_class=HTMLResponse)
async def root(request: Request):
    # Controlla se l'utente è già autenticato
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

    
@router.post("/register-farmer")
async def register_farmer(data: FarmerRegistration, db: AsyncSession = Depends(get_db)):
     # 1. Controllo esistenza email
    result = await db.execute(select(User).where(User.email == data.user.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email già usata")
    # 2. Crea l'utente base
    user = User(
        email=data.user.email,
        password=hash_password(data.user.password),
        user_type=data.user.user_type
    )
    db.add(user)
    await db.flush()

    # 3. Crea il profilo Farmer
    farmer = Farmer(
        user_id=user.id,
        username=data.farmer.username,
        first_name=data.farmer.first_name,
        last_name=data.farmer.last_name,
        cod_fis=data.farmer.cod_fis,
        farm_name=data.farmer.farm_name,
        phone_number=data.farmer.phone_number,
        province=data.farmer.province,
        city=data.farmer.city,
        address=data.farmer.address
    )
    db.add(farmer)

    try:
        await db.commit()
        return {"message": "Registrazione completata"}
    except Exception as e:
        await db.rollback()
        print(f"❌ Commit fallito: {e}")
        raise HTTPException(status_code=500, detail="Errore durante la registrazione")

@router.post("/register-society")
async def register_farmer(data: SocietyRegistration, db: AsyncSession = Depends(get_db)):
     # 1. Controllo esistenza email
    result = await db.execute(select(User).where(User.email == data.user.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email già usata")
    # 2. Crea l'utente base
    user = User(
        email=data.user.email,
        password=hash_password(data.user.password),
        user_type=data.user.user_type
    )
    db.add(user)
    await db.flush()

    # 3. Crea il profilo Society
    society = Society(
        user_id=user.id,
        username=data.society.username,
        ragione_sociale=data.society.ragione_sociale,
        sede_legale=data.society.sede_legale,
        partita_iva=data.society.partita_iva,
        province=data.society.province,
        city=data.society.city,
    )
    db.add(society)
    
    try:
        await db.commit()
        return {"message": "Registrazione completata"}
    except Exception as e:
        await db.rollback()
        print(f"❌ Commit fallito: {e}")
        raise HTTPException(status_code=500, detail="Errore durante la registrazione")

@router.post("/register-agronomist")
async def register_farmer(data: AgronomistRegistration, db: AsyncSession = Depends(get_db)):
     # 1. Controllo esistenza email
    result = await db.execute(select(User).where(User.email == data.user.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email già usata")
    # 2. Crea l'utente base
    user = User(
        email=data.user.email,
        password=hash_password(data.user.password),
        user_type=data.user.user_type
    )
    db.add(user)
    await db.flush()

    # 3. Crea il profilo Agronomist
    agronomist = Agronomist(
        user_id=user.id,
        albo_number=data.agronomist.albo_number,
        specialization=data.agronomist.specialization,
    )
    db.add(agronomist)

    try:
        await db.commit()
        return {"message": "Registrazione completata"}
    except Exception as e:
        await db.rollback()
        print(f"❌ Commit fallito: {e}")
        raise HTTPException(status_code=500, detail="Errore durante la registrazione")
    

@router.post("/login", response_class=HTMLResponse)
async def login(
    request: Request,
    loginEmail: str = Form(...),
    loginPassword: str = Form(...),
    db: AsyncSession = Depends(get_db)
):
    print("📥 Login ricevuto")
    print("📧 Email:", loginEmail)
    print("🔐 Password:", loginPassword)

    result = await db.execute(select(User).where(User.email == loginEmail))
    db_user = result.scalar_one_or_none()
    print("👤 Utente trovato:", db_user)

    if not db_user or not verify_password(loginPassword, db_user.password):
        print("❌ Password errata o utente non trovato")
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
    print("🔑 Token creato con payload:", token_payload)

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

@router.post("/rename-plot")
async def rename_plot(payload: RenamePlotRequest):
    try:
        return await aggiorna_nome_plot(payload.user_id, payload.old_name, payload.new_name)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/delete-plot")
async def delete_plot(payload: DeletePlotRequest):
    try:
        return await elimina_plot(payload.user_id, payload.plot_name)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/weather/{plot_id}")
async def fetch_weather(plot_id: str):
    success = fetch_and_save_weather_day(plot_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Plot {plot_id} non trovato o errore nella richiesta meteo.")
    return {"detail": "Dati meteo salvati con successo."}

@router.get("/home", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse("homepagedefinitiva.html", {"request": request})

@router.get("/profilo", response_class=HTMLResponse)
async def profilo_utente(request: Request, user: dict = Depends(get_current_user)):
    """
    Mostra la pagina del profilo utente
    """
    return templates.TemplateResponse("schedaUtente.html", {"request": request})

@router.get("/api/user/profile")
async def get_user_profile(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """
    Restituisce i dati del profilo utente completo
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

@router.get("/api/users/me/plots", response_model=List[PlotInfo])
async def get_user_plots(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """
    Restituisce una lista di tutti i terreni (plots)
    appartenenti all'utente attualmente autenticato.
    """
    user_id = user["id"]
    query = select(Plot).where(Plot.user_id == user_id).order_by(Plot.name)
    result = await db.execute(query)
    plots = result.scalars().all()
    
    if not plots:
        return []
        
    return plots

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
            print(f"Nessun terreno trovato per utente {user_id}")
            return []
        
        print(f"Trovati {len(plots)} terreni per utente {user_id}")
        
        # Prepara i dati nel formato richiesto dal frontend
        terreni_data = []
        
        for plot in plots:
            print(f"Elaborazione terreno {plot.id}: {plot.name}")
            
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
                        
                        print(f"  Geometria elaborata: area={area_ha:.2f} ha, perimetro={perimetro_m:.2f} m")
                except Exception as e:
                    print(f"Errore nel calcolo geometria per plot {plot.id}: {e}")
            
            # Recupera le specie associate al terreno (ora caricate in anticipo)
            species_data = []
            try:
                if hasattr(plot, 'species_associations') and plot.species_associations:
                    print(f"  Trovate {len(plot.species_associations)} associazioni specie")
                    for ps in plot.species_associations:
                        try:
                            # Le specie sono già caricate, non serve fare query aggiuntive
                            if hasattr(ps, 'species') and ps.species:
                                species_data.append({
                                    "name": ps.species.name,
                                    "quantity": ps.surface_area,
                                    "co2_absorption_rate": ps.species.co2_absorption_rate or 0
                                })
                                print(f"    Specie: {ps.species.name}, superficie: {ps.surface_area} m²")
                        except Exception as e:
                            print(f"Errore nell'elaborazione specie per plot {plot.id}: {e}")
                            continue
                else:
                    print(f"  Nessuna specie associata trovata")
            except Exception as e:
                print(f"Errore nell'accesso alle associazioni specie per plot {plot.id}: {e}")
            
            terreno = {
                "id": plot.id,
                "terrain_name": plot.name or f"Terreno {plot.id}",
                "species": species_data,
                "area_ha": round(area_ha, 2),
                "perimetro_m": round(perimetro_m, 2),
                "vertices": vertices
            }
            
            terreni_data.append(terreno)
            print(f"  Terreno {plot.id} elaborato con successo")
        
        print(f"Elaborazione completata. Restituisco {len(terreni_data)} terreni per utente {user_id}")
        return terreni_data
        
    except Exception as e:
        print(f"Errore nel recupero terreni per utente {user_id}: {e}")
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
        print(f"Errore nell'aggiornamento del terreno {request.terrain_id}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Errore interno del server: {str(e)}")


@router.delete("/delete-terrain", response_model=TerrainDeleteResponse)
async def delete_terrain(request: TerrainDeleteRequest, db: AsyncSession = Depends(get_db)):
    """Elimina un terreno e tutte le sue associazioni"""
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
        print(f"Errore nell'eliminazione del terreno {request.terrain_id}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Errore interno del server: {str(e)}")


@router.put("/update-species", response_model=TerrainUpdateResponse)
async def update_species(request: SpeciesUpdateRequest, db: AsyncSession = Depends(get_db)):
    """Aggiorna una singola specie di un terreno"""
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
        print(f"Errore nell'aggiornamento della specie per terreno {request.terrain_id}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Errore interno del server: {str(e)}")


@router.put("/update-terrain-coordinates", response_model=TerrainUpdateResponse)
async def update_terrain_coordinates(request: TerrainCoordinatesUpdateRequest, db: AsyncSession = Depends(get_db)):
    """Aggiorna le coordinate di un terreno esistente"""
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
        print(f"Errore nell'aggiornamento delle coordinate per terreno {request.terrain_id}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Errore interno del server: {str(e)}")


@router.delete("/delete-species", response_model=TerrainDeleteResponse)
async def delete_species(request: SpeciesDeleteRequest, db: AsyncSession = Depends(get_db)):
    """Elimina una singola specie da un terreno"""
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
        print(f"Errore nell'eliminazione della specie per terreno {request.terrain_id}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Errore interno del server: {str(e)}")

# === ROUTE DI DEBUG ===
@router.get("/debug/user/{user_id}/plots")
async def debug_get_user_plots(user_id: int, db: AsyncSession = Depends(get_db)):
    """
    Endpoint di debug per ottenere i plot di un utente specifico senza autenticazione
    """
    try:
        print(f"🔍 Debug: Recupero plot per utente {user_id}")
        
        # Query per ottenere tutti i plot dell'utente
        query = select(Plot).where(Plot.user_id == user_id)
        result = await db.execute(query)
        plots = result.scalars().all()
        
        print(f"📊 Trovati {len(plots)} plot per utente {user_id}")
        
        plots_data = []
        for plot in plots:
            print(f"🌱 Elaboro plot {plot.id}: {plot.name}")
            
            # Ottieni le specie per questo plot
            species_query = select(PlotSpecies, Species).join(Species).where(PlotSpecies.plot_id == plot.id)
            species_result = await db.execute(species_query)
            species_data = species_result.all()
            
            print(f"   - Specie trovate: {len(species_data)}")
            
            # Formatta le specie
            species_list = []
            for plot_species, species in species_data:
                species_info = {
                    "name": species.name,
                    "quantity": plot_species.surface_area
                }
                species_list.append(species_info)
                print(f"     * {species.name}: {plot_species.surface_area}m²")
            
            # Calcola area totale dal poligono se disponibile
            area_ha = 0
            if plot.geom:
                try:
                    shapely_geom = to_shape(plot.geom)
                    area_ha = shapely_geom.area * 111.32 * 111.32 * 0.0001  # Converti in ettari
                    print(f"   - Area calcolata: {area_ha:.2f} ha")
                except Exception as geom_error:
                    print(f"   - Errore calcolo area: {geom_error}")
                    area_ha = 0
            
            plot_info = {
                "id": plot.id,
                "name": plot.name or f"Terreno {plot.id}",
                "species": species_list,
                "area_ha": round(area_ha, 2),
                "perimetro_m": 0,
                "coordinate": [],
                "created_at": plot.created_at.isoformat() if plot.created_at else None
            }
            plots_data.append(plot_info)
        
        print(f"✅ Debug completato: {len(plots_data)} plot elaborati")
        return {"plots": plots_data, "debug_info": f"Utente {user_id}, {len(plots_data)} plot trovati"}
        
    except Exception as e:
        print(f"💥 ERRORE DEBUG per utente {user_id}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Errore debug: {str(e)}")


# === ROUTE PER SALVARE PLOT ===
@router.post("/save-plot")
async def save_plot(plot_data: dict, db: AsyncSession = Depends(get_db)):
    """Salva un nuovo plot nel database"""
    try:
        print(f"💾 Salvataggio plot: {plot_data}")
        
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
        print(f"✅ Plot salvato con ID: {new_plot.id}")
        
        return {"success": True, "plot_id": new_plot.id, "message": "Plot salvato con successo"}
        
    except Exception as e:
        await db.rollback()
        print(f"💥 ERRORE nel salvataggio del plot: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Errore nel salvataggio: {str(e)}")