# AIRVANA - GUIDA RAPIDA PRE-INVESTITORI

**Ultimo aggiornamento**: 01/11/2025
**Tempo necessario**: 5 minuti

---

## STATO ATTUALE

###  Già Fatto (non toccare nulla)
- Sistema multi-utente funzionante
- Logging professionale attivo
- Configurazioni in `.env` (sicuro)
- Backend pulito senza print pericolosi

### =Ë Da Fare (solo 1 cosa)
- Installare 1 pacchetto Python mancante

---

# UNICA COSA DA FARE

## Installa pacchetto mancante

**Apri terminale e copia-incolla questi comandi UNO ALLA VOLTA**:

### Windows:
```bash
cd BackEnd
venv\Scripts\activate
pip install pydantic-settings==2.7.2
```

### Mac/Linux:
```bash
cd BackEnd
source venv/bin/activate
pip install pydantic-settings==2.7.2
```

**Come sapere se ha funzionato**:
- L'ultimo comando finisce con "Successfully installed pydantic-settings-2.7.2"
- Nessun errore rosso

---

# VERIFICA CHE TUTTO FUNZIONI

## Test Rapido (3 minuti)

1. **Avvia il backend**:
   ```bash
   cd BackEnd
   uvicorn app.main:app --reload
   ```

    **Funziona se**: Vedi "Application startup complete"
   L **Non funziona se**: Vedi errori rossi

2. **Testa nel browser**:
   - Vai su: http://localhost:8000
   - Fai login con Google
   - Crea un terreno
   - Controlla che vedi solo i tuoi terreni

3. **Controlla console browser**:
   - Premi F12
   - Vai su "Console"
   -  Nessun errore rosso = tutto ok
   - L Errori rossi = c'è un problema

---

# SE QUALCOSA NON FUNZIONA

## Errore: "No module named 'pydantic_settings'"
**Hai fatto**: Probabilmente hai saltato l'installazione
**Soluzione**: Torna sopra e esegui: `pip install pydantic-settings==2.7.2`

## Errore: "venv non trovato" o "comando non riconosciuto"
**Hai fatto**: Non hai l'ambiente virtuale attivo
**Soluzione**:
- Windows: `BackEnd\venv\Scripts\activate`
- Mac/Linux: `source BackEnd/venv/bin/activate`
- Devi vedere `(venv)` all'inizio della riga nel terminale

## Errore: "SECRET_KEY not found" o "DATABASE_URL not found"
**Hai fatto**: File `.env` non trovato o vuoto
**Soluzione**:
1. Controlla che esista `BackEnd/.env`
2. Apri il file e controlla che abbia tutti i dati
3. Se è vuoto, chiedi a chi ha il file .env compilato

## Backend parte ma login Google non funziona
**Problema**: Credenziali Google sbagliate
**Soluzione**:
1. Apri `BackEnd/.env`
2. Controlla `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`
3. Devono essere quelli veri da Google Cloud Console

## Backend non parte - Errore database
**Problema**: PostgreSQL non è avviato oppure credenziali sbagliate
**Soluzione**:
1. Avvia PostgreSQL
2. Controlla `DATABASE_URL` nel file `.env`
3. Verifica username, password, nome database

## Pagina bianca nel browser
**Problema**: CORS o frontend non compilato
**Soluzione**:
1. Controlla che nel file `.env` ci sia: `ALLOWED_ORIGINS=http://localhost:8000,http://127.0.0.1:8000`
2. Se usi il marketplace React, controlla che sia compilato: `cd airvana-marketplace && npm run build`

---

# CHECKLIST PRE-DEMO INVESTITORI

Prima di mostrare l'app, verifica:

## Setup
- [ ] `pip install pydantic-settings` eseguito con successo
- [ ] File `.env` presente in `BackEnd/` con tutti i dati
- [ ] PostgreSQL avviato e funzionante
- [ ] Backend parte senza errori: `uvicorn app.main:app --reload`

## Test Funzionali (2 minuti)
- [ ] Login con Google funziona
- [ ] Puoi creare un nuovo terreno
- [ ] Vedi i tuoi terreni nella dashboard
- [ ] Console browser (F12) senza errori rossi

## Durante la Demo
- [ ] Non mostrare il terminale (ha dati sensibili nei log)
- [ ] Se crasha, riavvia il backend (non panico)
- [ ] Tieni aperto il file `.env` in caso serva cambiare qualcosa
- [ ] Prepara 2-3 account Google diversi per mostrare il multi-utente

---

# DOMANDE FREQUENTI

**D: Ho bisogno di fare altro oltre a `pip install`?**
R: No. Abbiamo già fatto tutto il resto (logging, config, rimozione print).

**D: Posso committare il file .env su Git?**
R: **ASSOLUTAMENTE NO**. Il file .env è già in .gitignore. Mai e poi mai su GitHub.

**D: Dove prendo le credenziali Google OAuth?**
R: Google Cloud Console ’ APIs & Services ’ Credentials. Se non ce le hai, chiedi a chi le ha create.

**D: Quanto tempo ho per fare tutto?**
R: 5 minuti. È solo un `pip install`.

**D: E se durante la demo va tutto storto?**
R: Abbiamo tolto i problemi più gravi (print, hardcode, crash evidenti). Se va storto è solo sfortuna.

**D: Devo studiare il codice?**
R: No. Basta che funzioni. Se chiedono spiegazioni tecniche, rispondi che è "backend FastAPI con PostgreSQL e calcoli CO2 scientifici".

---

# COSA ABBIAMO GIÀ SISTEMATO (per tua informazione)

Questi problemi sono **già risolti**, non devi fare nulla:

1.  **Print() pericolosi**: Rimossi tutti, ora usa logger professionale
2.  **Configurazione hardcodata**: Tutto in `.env`
3.  **Google OAuth esposto**: Ora in `.env` (sicuro)
4.  **CORS hardcodato**: Ora configurabile da `.env`
5.  **Database credenziali**: Tutto in `.env`
6.  **Logging**: Sistema professionale con file log (BackEnd/logs/)
7.  **Multi-utente**: Ogni utente vede solo i suoi terreni

---

# IN CASO DI EMERGENZA

Se proprio non funziona e la demo è tra poco:

1. **Piano B**: Usa il server in produzione (se c'è)
2. **Piano C**: Mostra video/screenshot preparati prima
3. **Piano D**: Racconta la demo invece di farla live

Ma se segui questa guida, non dovrebbe servire.

---

**Ricorda**:
- Fai solo il `pip install`
- Verifica che il backend parta
- Testa login + crea terreno
- Sei pronto

**Tempo totale**: 5 minuti di installazione + 2 minuti di test = 7 minuti

**Non inventare**, **non improvvisare**, **non modificare nulla** che non sia scritto qui.
