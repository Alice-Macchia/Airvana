from jose import JWTError, jwt
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Depends, Security, Request, Form, Cookie
from fastapi.responses import RedirectResponse
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
import requests
import hashlib

###
# Carica le variabili da .env
load_dotenv()

####

# Leggi le variabili da ambiente
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

# Google OAuth
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI")

# DEBUG: controlla che SECRET_KEY sia correttamente letta
print("DEBUG SECRET_KEY:", repr(SECRET_KEY))

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


async def get_current_user(request: Request):
    """
    Dipendenza per ottenere l'utente corrente dal token nel cookie.
    Protegge le rotte richiedendo un token valido.
    """
    # 1. Prova a estrarre il token dal cookie 'access_token'
    token = request.cookies.get("access_token")
    
    # 2. Se il cookie non esiste, l'utente non è autorizzato
    if not token:
        raise HTTPException(
            status_code=401, 
            detail="Non autorizzato: token mancante",
            headers={"WWW-Authenticate": "Bearer"},
        )   
    
     # 3. Prova a decodificare il token
    payload = decode_access_token(token)
    
    # Log del token e del payload per debug
    print("Token ricevuto:", token)
    print("Payload decodificato:", payload)

    # 4. Se il token non è valido o scaduto, la decodifica fallisce
    if not payload:
        raise HTTPException(
            status_code=401, 
            detail="Token non valido o scaduto",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    # 5. Se tutto è andato a buon fine, restituisce i dati dell'utente (payload)
    return payload


# Router per l'autenticazione
router = APIRouter()

@router.get("/auth/google")
async def google_login():
    """Reindirizza a Google per l'autenticazione"""
    google_auth_url = (
        f"https://accounts.google.com/o/oauth2/auth?"
        f"client_id={GOOGLE_CLIENT_ID}&"
        f"redirect_uri={GOOGLE_REDIRECT_URI}&"
        f"scope=openid email profile&"
        f"response_type=code&"
        f"access_type=offline"
    )
    return {"auth_url": google_auth_url}

@router.get("/auth/google/callback")
async def google_callback(code: str, request: Request):
    """Gestisce il callback da Google"""
    try:
        # Scambia il codice per un token
        token_url = "https://oauth2.googleapis.com/token"
        token_data = {
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": GOOGLE_REDIRECT_URI,
        }
        
        token_response = requests.post(token_url, data=token_data)
        token_json = token_response.json()
        
        # Verifica il token ID
        id_info = id_token.verify_oauth2_token(
            token_json["id_token"], 
            google_requests.Request(), 
            GOOGLE_CLIENT_ID
        )
        
        # Estrai informazioni utente
        user_email = id_info.get("email")
        user_name = id_info.get("name")
        google_id = id_info.get("sub")
        
        # Crea un ID numerico univoco basato sul google_id
        # Crea un hash del google_id e prendi i primi 8 caratteri per avere un numero
        google_hash = hashlib.md5(google_id.encode()).hexdigest()[:8]
        numeric_id = int(google_hash, 16) % 1000000  # Limita a 6 cifre per evitare overflow
        
        print(f"🆔 Google ID: {google_id} mappato a numeric ID: {numeric_id}")
        # Assicura che l'utente esista nella tabella users (upsert)
        from .database import SessionLocal
        from .models import User
        from sqlalchemy import select

        async with SessionLocal() as db:
            result = await db.execute(select(User).where(User.id == numeric_id))
            user_record = result.scalar_one_or_none()
            if not user_record:
                # Crea nuovo utente Google
                new_user = User(id=numeric_id, email=user_email, password="", user_type="google")
                db.add(new_user)
                await db.commit()
        
        # Crea il token JWT per l'utente
        user_data = {
            "email": user_email,
            "name": user_name,
            "google_id": google_id,
            "id": numeric_id,  # Usa l'ID numerico derivato dal google_id
            "login_type": "google"
        }
        
        access_token = create_access_token(data=user_data)
        
        # Imposta il cookie e reindirizza alla dashboard
        response = RedirectResponse(url="/dashboard")
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            secure=False,  # True in produzione
            samesite="lax"
        )
        
        return response
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Errore autenticazione Google: {str(e)}")

