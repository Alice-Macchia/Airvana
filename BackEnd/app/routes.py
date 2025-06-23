from fastapi import APIRouter, HTTPException, Depends, Security, Request, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from BackEnd.app.auth import create_access_token, decode_access_token
from BackEnd.app.schemas import UserCreate, UserLogin, UserInsert, RenamePlotRequest, DeletePlotRequest
from BackEnd.app.models import User
from BackEnd.app.security import hash_password, verify_password
from BackEnd.app.database import SessionLocal
from BackEnd.app.get_meteo import fetch_and_save_weather_day, fetch_weather_week
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, JSONResponse
from BackEnd.app.utils import aggiorna_nome_plot, elimina_plot
###############

router = APIRouter()
security = HTTPBearer()  # definisce il tipo di security scheme Bearer
templates = Jinja2Templates(directory="FrontEnd/templates")
async def get_db():
    async with SessionLocal() as session:
        yield session

@router.get("/logreg", response_class=HTMLResponse)
async def root(request: Request):
    return templates.TemplateResponse("login_main.html", {"request": request})

@router.post("/register")
async def register(request: Request,user: UserCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == user.email))
    existing_user = result.scalar_one_or_none()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email già registrata")
    new_user = User(
        email=user.email,
        password=hash_password(user.password)
    )
    db.add(new_user)
    await db.commit()
    return {"message": "Registrazione completata"}


@router.post("/login", response_class=HTMLResponse)
async def login(
    request: Request,
    loginEmail: str = Form(...),
    loginPassword: str = Form(...),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).where(User.email == loginEmail))
    db_user = result.scalar_one_or_none()

    if not db_user or not verify_password(loginPassword, db_user.password):
        raise HTTPException(status_code=401, detail="Credenziali non valide")

    token = create_access_token({"id": db_user.id, "mail": db_user.email})

    # restituisce il token al client invece di restituire la index
    response = JSONResponse(content={"message": "Login OK"})
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,  # importante: impedisce accesso via JS
        max_age=1800,   # 30 minuti (esempio)
        secure=False,   # metti True in produzione (HTTPS)
        samesite="lax"
    )
    return response




@router.get("/inserisciterreno", response_class=HTMLResponse)
async def inserisciterreno(request: Request):
    return templates.TemplateResponse("Aggiungi_Terreno_index.html",{"request":request})

#     id: str = Form(),
#     email: str = Form()
#     ):
#    # data = await request.json()  # <-- JSON manuale
#     # user_id = data.get("id")
#     # email = data.get("email")
        
#     token = create_access_token({"id":id, "mail": email})

#     return templates.TemplateResponse(
#         "Aggiungi_Terreno_index.html",
#         {
#             "request": request,
#             "user_id": id,
#             "email": email,
#             "token": token
#         }
#     )


@router.post("/todashboard", response_class=HTMLResponse)
async def dashboard(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})
#     id: str = Form(...),
#     Email: str = Form(...)
# ):
#     token = create_access_token({"id": id, "email": Email})
#     return templates.TemplateResponse("index.html", {
#         "request": request,
#         "user_id": id,
#         "email": Email,
#         "token": token
#     })

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

#@router.get("/utente-protetto")
#async def protected_route(
#    credentials: HTTPAuthorizationCredentials = Security(security)
#):
#    token = credentials.credentials
#    payload = decode_access_token(token)
#    if not payload:
#        raise HTTPException(status_code=401, detail="Token non valido")
#    return {"message": f"Benvenuto {payload['sub']}!"}