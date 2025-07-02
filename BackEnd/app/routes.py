from fastapi import APIRouter, HTTPException, Depends, Security, Request, Form, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.exc import IntegrityError
from BackEnd.app.auth import create_access_token, decode_access_token, get_current_user
from BackEnd.app.schemas import UserCreate, UserLogin, UserInsert, RenamePlotRequest, DeletePlotRequest, FarmerBase, SocietyBase, AgronomistCreate, AgronomistOut
from BackEnd.app.models import User, Farmer, Society, PlotInfo, Plot, Agronomist
from BackEnd.app.security import hash_password, verify_password
from BackEnd.app.database import SessionLocal
from BackEnd.app.get_meteo import fetch_and_save_weather_day, fetch_weather_week
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, JSONResponse
from BackEnd.app.utils import aggiorna_nome_plot, elimina_plot
from BackEnd.app.database import AsyncSessionLocal
from typing import List
from pydantic import BaseModel


# router = APIRouter()
router = APIRouter()
security = HTTPBearer()  # definisce il tipo di security scheme Bearer
templates = Jinja2Templates(directory="FrontEnd/templates")


async def get_db():
    async_session = AsyncSessionLocal()
    try:
        yield async_session
    finally:
        if async_session:
            await async_session.close()
            
@router.get("/logreg", response_class=HTMLResponse)
async def root(request: Request):
    return templates.TemplateResponse("login_main.html", {"request": request})


@router.post("/register-farmer")
async def register_person(person: FarmerBase, db: AsyncSession = Depends(get_db)):
    # 1. Controllo esistenza email
    result = await db.execute(select(Farmer).where(Farmer.email == person.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email già usata")

    # 2. Crea il record in Farmer (senza user_id per ora)
    natural_person = Farmer(
        username=person.username,
        first_name=person.first_name,
        last_name=person.last_name,
        email=person.email,
        password=hash_password(person.password),
        cod_fid=person.cod_fis,
        farm_name= person.farm_name,
        phone_number=person.phone_number,
        province=person.province,
        city=person.city,
        address=person.address
    )
    db.add(Farmer)
    await db.flush()  # Serve per ottenere `Farmer.id`

    # 3. Crea il record in User
    user = User(
        email=person.email,
        password=hash_password(person.password),
    )
    db.add(user)
    await db.flush()

    # 4. Collega `farmer` a `user`
    Farmer.user_id = user.id

    try:
        await db.commit()
        return {"message": "Registrazione completata"}
    except Exception as e:
        await db.rollback()
        print(f"❌ Commit fallito: {e}")
        raise HTTPException(status_code=500, detail="Errore durante la registrazione")

@router.post("/register-society")
async def register_society(data: SocietyBase, db: AsyncSession = Depends(get_db)):
    # Controllo email o partita IVA esistenti
    existing = await db.execute(select(Society).where(Society.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email già registrata")

    # Crea Society
    society = Society(
        username=data.username,
        ragione_sociale=data.ragione_sociale,
        sede_legale=data.sede_legale,
        partita_iva=data.partita_iva,
        email=data.email,
        password=hash_password(data.password),
        province=data.province,
        city=data.city,
    )
    db.add(society)
    await db.flush()

    # Crea User
    user = User(email=data.email, password=hash_password(data.password))
    db.add(user)
    await db.flush()

    # Collega i due
    society.user_id = user.id

    try:
        await db.commit()
        return {"message": "Registrazione società completata"}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail="Errore durante la registrazione")


@router.post("/register-agronomist", status_code=status.HTTP_201_CREATED, response_model=AgronomistOut)
async def register_agronomist(agronomist_data: AgronomistCreate, db: AsyncSession = Depends(get_db)):
    """
    Registra un nuovo utente di tipo Agronomo.
    Questa funzione richiede uno schema AgronomistCreate che includa email e password.
    """
    # 1. Controlla se l'email o il numero di albo esistono già
    user_exists = await db.execute(select(User).where(User.email == agronomist_data.email))
    if user_exists.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Un utente con questa email esiste già.")

    agronomist_exists = await db.execute(select(Agronomist).where(Agronomist.albo_number == agronomist_data.albo_number))
    if agronomist_exists.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Un agronomo con questo numero di albo esiste già.")

    # 2. Crea l'utente e il profilo agronomo
    hashed_pwd = hash_password(agronomist_data.password)
    new_user = User(email=agronomist_data.email, password=hashed_pwd)
    db.add(new_user)

    try:
        await db.flush()
        new_agronomist = Agronomist(
            user_id=new_user.id,
            first_name=agronomist_data.first_name,
            last_name=agronomist_data.last_name,
            codice_fiscale=agronomist_data.codice_fiscale,
            albo_number=agronomist_data.albo_number,
            specialization=agronomist_data.specialization,
            phone_number=agronomist_data.phone_number,
            province=agronomist_data.province,
            city=agronomist_data.city,
            address=agronomist_data.address
        )
        db.add(new_agronomist)
        await db.commit()
        await db.refresh(new_agronomist)
        return new_agronomist

    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Errore durante la registrazione dell'agronomo: {e}")


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