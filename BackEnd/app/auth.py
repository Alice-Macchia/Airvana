from jose import JWTError, jwt
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Depends, Security, Request, Form, Cookie
###
# Carica le variabili da .env
load_dotenv()

####

# Leggi le variabili da ambiente
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

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
    
    # 4. Se il token non è valido o scaduto, la decodifica fallisce
    if not payload:
        raise HTTPException(
            status_code=401, 
            detail="Token non valido o scaduto",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    # 5. Se tutto è andato a buon fine, restituisce i dati dell'utente (payload)
    return payload

