from fastapi import APIRouter, HTTPException, Depends, Security, Request, Form, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.exc import IntegrityError
from BackEnd.app.auth import create_access_token, decode_access_token, get_current_user
from BackEnd.app.schemas import UserCreate, UserLogin, UserInsert, RenamePlotRequest, DeletePlotRequest, FarmerBase, SocietyBase, AgronomistCreate, AgronomistOut, FarmerCreate, AgronomistBase, FarmerRegistration, SocietyRegistration, AgronomistRegistration
from BackEnd.app.models import User, Farmer, Society, PlotInfo, Plot, Agronomist
from BackEnd.app.security import hash_password, verify_password
from BackEnd.app.database import get_async_session

from BackEnd.app.get_meteo import fetch_and_save_weather_day, fetch_weather_week
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, JSONResponse
from BackEnd.app.utils import aggiorna_nome_plot, elimina_plot
from typing import List
from pydantic import BaseModel


# router = APIRouter()
router = APIRouter()
security = HTTPBearer()  # definisce il tipo di security scheme Bearer
templates = Jinja2Templates(directory="FrontEnd/templates")


async def get_db():
    async_session = get_async_session
    try:
        yield async_session
    finally:
        if async_session:
            await async_session.close()
            
@router.get("/logreg", response_class=HTMLResponse)
async def root(request: Request):
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