## 🎯 EXECUTIVE SUMMARY

**Stato attuale**: Progetto Lab/Academy con backend solido ma frontend frammentato e hardcode critico  
**Obiettivo finale**: Applicazione production-ready scalabile con architettura pulita  
**Stakeholder**: Team interno + investitori potenziali (TIM, Ernest Young)

---

## 📊 PRIORITIZZAZIONE PROBLEMI (dal più semplice al più difficile)

### 🟢 **LIVELLO 1: Quick Wins** (1-2 ore ciascuno)
*Problemi facili da risolvere con alto impatto immediato*

#### 1.1 🔴 **CRITICO** - Rimuovere credenziali hardcoded
**File**: `co2_o2_calculator.py`
**Problema**:
```python
# DATABASE_URL = \"postgresql://postgres:postgres@165.22.75.145:15432/co2app\"
```
**Soluzione**:
- ✅ Già commentato, ma va rimosso completamente
- Verificare che tutte le credenziali usino `.env`
- Aggiungere `.env.example` per documentazione

**Impatto**: Sicurezza critica - esposizione credenziali  
**Tempo stimato**: 30 minuti  
**Difficoltà**: 🟢 Facile

---

#### 1.2 🔴 **CRITICO** - Fix path marketplace_dist
**File**: `BackEnd/app/main.py` (righe 37-38)
**Problema**:
```python
app.mount(\"/marketplace\", StaticFiles(directory=\"marketplace_dist\"), name=\"marketplace\")
app.mount(\"/assets\", StaticFiles(directory=\"marketplace_dist/assets\"), name=\"assets\")
```
**Soluzione**:
```python
app.mount(\"/marketplace\", StaticFiles(directory=\"airvana-marketplace/dist\"), name=\"marketplace\")
app.mount(\"/assets\", StaticFiles(directory=\"airvana-marketplace/dist/assets\"), name=\"assets\")
```
**Azioni aggiuntive**:
- Eliminare cartella `marketplace_dist` dalla root
- Documentare nel README il flusso di build

**Impatto**: Developer Experience - elimina copia manuale file  
**Tempo stimato**: 15 minuti  
**Difficoltà**: 🟢 Facile  
**Status**: ✅ **GIÀ CORRETTO**

---

#### 1.3 🟡 **IMPORTANTE** - Documentazione mancante
**File**: `README.md`, docstrings varie
**Problema**:
- Funzioni senza docstring
- Setup instructions incomplete
- Architettura non documentata

**Soluzione**:
```python
async def get_species_distribution_by_plot(plot_id: int, db: AsyncSession) -> dict:
    \"\"\"
    Recupera la distribuzione delle specie per un terreno specifico.
    
    Args:
        plot_id: ID del terreno
        db: Sessione database asincrona
        
    Returns:
        dict: {species_name: percentage, ...}
        
    Raises:
        HTTPException: Se plot non trovato
    \"\"\"
```

**Checklist**:
- [ ] Aggiungere docstring a tutte le funzioni pubbliche
- [ ] Creare `ARCHITECTURE.md` con diagrammi
- [ ] Aggiornare README con setup completo
- [ ] Documentare API endpoints (Swagger già presente in FastAPI)

**Impatto**: Manutenibilità e onboarding nuovi dev  
**Tempo stimato**: 3 ore  
**Difficoltà**: 🟢 Facile

---

### 🟡 **LIVELLO 2: Medium Fixes** (3-6 ore ciascuno)
*Problemi che richiedono refactoring ma con impatto significativo*

#### 2.1 🔴 **CRITICO** - Hardcoded user_id=41
**File**: `BackEnd/app/routes.py` (riga 707)
**Problema**:
```python
new_plot = Plot(
    user_id=41,  # ⚠️ HARDCODED - grave problema sicurezza
    name=plot_data.get(\"name\"),
    ...
)
```

**Soluzione** (3 step):

**Step 1**: Aggiungere middleware autenticazione
```python
# BackEnd/app/middleware/auth.py
async def require_auth(request: Request):
    token = request.cookies.get(\"access_token\") or request.headers.get(\"Authorization\")
    if not token:
        raise HTTPException(status_code=401, detail=\"Non autenticato\")
    return decode_access_token(token)
```

**Step 2**: Modificare route per usare utente autenticato
```python
@router.post(\"/api/plots\")
async def create_plot(
    plot_data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)  # ← Dependency injection
):
    new_plot = Plot(
        user_id=current_user[\"id\"],  # ✅ Utente autenticato
        name=plot_data.get(\"name\"),
        ...
    )
```

**Step 3**: Aggiungere test
```python
def test_create_plot_without_auth():
    response = client.post(\"/api/plots\", json={\"name\": \"Test\"})
    assert response.status_code == 401

def test_create_plot_with_auth():
    token = get_test_token(user_id=1)
    response = client.post(
        \"/api/plots\",
        json={\"name\": \"Test\"},
        headers={\"Authorization\": f\"Bearer {token}\"}
    )
    assert response.status_code == 200
    assert response.json()[\"user_id\"] == 1  # Verifica utente corretto
```

**Impatto**: Sicurezza critica - prevenire accesso non autorizzato  
**Tempo stimato**: 4 ore  
**Difficoltà**: 🟡 Media

---

#### 2.2 🔴 **CRITICO** - Potenziale SQL Injection
**File**: `BackEnd/app/utils.py`
**Problema**: Query con string formatting invece di prepared statements

**Soluzione**:

**Prima** (❌ Vulnerabile):
```python
query = f\"SELECT * FROM plots WHERE user_id = {user_id}\"
result = await db.execute(query)
```

**Dopo** (✅ Sicuro):
```python
from sqlalchemy import select
query = select(Plot).where(Plot.user_id == user_id)
result = await db.execute(query)
```

**Checklist**:
- [ ] Audit completo di tutte le query SQL
- [ ] Convertire tutte le query a SQLAlchemy ORM
- [ ] Aggiungere test con payload injection
- [ ] Documentare best practices nel CONTRIBUTING.md

**Impatto**: Sicurezza critica - prevenire data breach  
**Tempo stimato**: 5 ore  
**Difficoltà**: 🟡 Media  
**Status**: ⚠️ **PARZIALMENTE CORRETTO** - serve audit completo

---

#### 2.3 🟡 **IMPORTANTE** - Gestione errori inadeguata
**File**: Tutti i routes
**Problema**: Errori non gestiti, crash improvvisi

**Soluzione**: Creare exception handlers centralizzati

```python
# BackEnd/app/exceptions.py
class AirvanaException(Exception):
    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code

class PlotNotFoundException(AirvanaException):
    def __init__(self, plot_id: int):
        super().__init__(f\"Plot {plot_id} non trovato\", 404)

class UnauthorizedException(AirvanaException):
    def __init__(self):
        super().__init__(\"Non autenticato\", 401)

# BackEnd/app/main.py
from fastapi import Request, status
from fastapi.responses import JSONResponse

@app.exception_handler(AirvanaException)
async def airvana_exception_handler(request: Request, exc: AirvanaException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            \"error\": exc.message,
            \"timestamp\": datetime.now().isoformat()
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    # Log dell'errore
    logger.error(f\"Unhandled exception: {exc}\", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={\"error\": \"Errore interno del server\"}
    )
```

**Uso nelle route**:
```python
@router.get(\"/api/plots/{plot_id}\")
async def get_plot(plot_id: int, db: AsyncSession = Depends(get_db)):
    plot = await db.get(Plot, plot_id)
    if not plot:
        raise PlotNotFoundException(plot_id)  # ← Gestione pulita
    return plot
```

**Impatto**: Stabilità e debugging  
**Tempo stimato**: 4 ore  
**Difficoltà**: 🟡 Media

---

#### 2.4 🟡 **IMPORTANTE** - Validazione dati incompleta
**File**: `BackEnd/app/schemas.py` e routes vari
**Problema**: Dati non validati all'ingresso

**Soluzione**: Estendere Pydantic models

```python
# BackEnd/app/schemas.py
from pydantic import BaseModel, validator, Field
from typing import List, Optional

class PlotCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=100)
    area_mq: float = Field(..., gt=0, le=1000000)  # Max 100 ettari
    coordinates: List[dict] = Field(..., min_items=3)
    
    @validator('name')
    def validate_name(cls, v):
        if not v.strip():
            raise ValueError('Nome non può essere vuoto')
        if any(char in v for char in ['<', '>', '&']):
            raise ValueError('Nome contiene caratteri non validi')
        return v.strip()
    
    @validator('coordinates')
    def validate_polygon(cls, v):
        if len(v) < 3:
            raise ValueError('Poligono deve avere almeno 3 punti')
        # Verifica che sia un poligono chiuso
        if v[0] != v[-1]:
            v.append(v[0])
        return v

class SpeciesCreate(BaseModel):
    species_id: int = Field(..., gt=0)
    count: int = Field(..., ge=1, le=10000)
    
    @validator('count')
    def validate_count(cls, v):
        if v <= 0:
            raise ValueError('Numero alberi deve essere positivo')
        return v
```

**Aggiungere validation middleware**:
```python
from fastapi import Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            \"error\": \"Dati non validi\",
            \"details\": exc.errors()
        }
    )
```

**Impatto**: Data integrity e sicurezza  
**Tempo stimato**: 6 ore  
**Difficoltà**: 🟡 Media

---

### 🟠 **LIVELLO 3: Complex Refactoring** (1-2 giorni ciascuno)
*Problemi architetturali che richiedono refactoring significativo*

#### 3.1 🔴 **CRITICO** - Scalabilità API Meteo
**File**: `BackEnd/app/get_meteo.py`
**Problema**: 
- Chiamate API meteo on-demand = 500+ chiamate/giorno con crescita utenti
- Nessuna cache
- Rate limiting non gestito

**Soluzione Completa** (Architecture Change):

**Fase 1**: Implementare Redis caching (2 ore)
```python
# BackEnd/app/cache.py
import redis.asyncio as redis
from typing import Optional
import json

class WeatherCache:
    def __init__(self):
        self.redis = redis.from_url(\"redis://localhost:6379\")
    
    async def get_weather(self, lat: float, lon: float, date: str) -> Optional[dict]:
        \"\"\"Recupera dati meteo dalla cache\"\"\"
        key = f\"weather:{lat:.2f}:{lon:.2f}:{date}\"
        data = await self.redis.get(key)
        return json.loads(data) if data else None
    
    async def set_weather(self, lat: float, lon: float, date: str, data: dict):
        \"\"\"Salva dati meteo in cache (TTL 24h)\"\"\"
        key = f\"weather:{lat:.2f}:{lon:.2f}:{date}\"
        await self.redis.setex(key, 86400, json.dumps(data))  # 24h TTL

# BackEnd/app/get_meteo.py
async def fetch_weather_with_cache(lat: float, lon: float, date: str):
    cache = WeatherCache()
    
    # 1. Check cache
    cached = await cache.get_weather(lat, lon, date)
    if cached:
        logger.info(f\"Cache HIT per {lat},{lon},{date}\")
        return cached
    
    # 2. Fetch from API
    data = await fetch_from_openweather_api(lat, lon, date)
    
    # 3. Save to cache
    await cache.set_weather(lat, lon, date, data)
    
    return data
```

**Fase 2**: Raggruppamento coordinate (arrotondamento intelligente) (3 ore)
```python
def round_coordinates(lat: float, lon: float, precision: int = 2) -> tuple:
    \"\"\"
    Arrotonda coordinate per raggruppare richieste simili.
    precision=2 → ~1km accuracy
    precision=1 → ~10km accuracy
    \"\"\"
    return (round(lat, precision), round(lon, precision))

# Esempio d'uso
lat, lon = 41.8902, 12.4922  # Roma esatta
rounded = round_coordinates(lat, lon, precision=1)  # (41.9, 12.5)
# Tutti i terreni entro ~10km useranno gli stessi dati meteo
```

**Fase 3**: Cron Job per pre-fetch (4 ore)
```python
# BackEnd/app/tasks/weather_prefetch.py
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select

async def prefetch_weather_for_all_plots():
    \"\"\"
    Eseguito ogni giorno alle 06:00
    Pre-fetch meteo per tutti i terreni attivi
    \"\"\"
    logger.info(\"🌤️ Inizio pre-fetch meteo giornaliero\")
    
    async with SessionLocal() as db:
        # 1. Recupera tutti i terreni unici (raggruppati per coordinate)
        plots = await db.execute(
            select(Plot.latitude, Plot.longitude)
            .distinct()
        )
        
        unique_coords = plots.scalars().all()
        logger.info(f\"📍 Trovate {len(unique_coords)} coordinate uniche\")
        
        # 2. Fetch meteo per oggi
        today = date.today()
        for lat, lon in unique_coords:
            try:
                await fetch_weather_with_cache(lat, lon, today.isoformat())
                await asyncio.sleep(1)  # Rate limiting: 1 req/sec
            except Exception as e:
                logger.error(f\"Errore fetch {lat},{lon}: {e}\")
        
        logger.info(\"✅ Pre-fetch completato\")

# BackEnd/app/main.py
@app.on_event(\"startup\")
async def startup_scheduler():
    scheduler = AsyncIOScheduler()
    scheduler.add_job(
        prefetch_weather_for_all_plots,
        'cron',
        hour=6,
        minute=0
    )
    scheduler.start()
    logger.info(\"⏰ Scheduler meteo attivato (06:00 daily)\")
```

**Fase 4**: Fallback e monitoring (2 ore)
```python
from prometheus_client import Counter, Histogram

# Metriche
weather_api_calls = Counter('weather_api_calls_total', 'API calls', ['status'])
weather_api_latency = Histogram('weather_api_latency_seconds', 'API latency')

async def fetch_weather_with_fallback(lat: float, lon: float, date: str):
    with weather_api_latency.time():
        try:
            data = await fetch_weather_with_cache(lat, lon, date)
            weather_api_calls.labels(status='success').inc()
            return data
        except RateLimitError:
            weather_api_calls.labels(status='rate_limit').inc()
            # Fallback: usa dati meteo precedenti
            previous_date = (datetime.fromisoformat(date) - timedelta(days=1)).date()
            return await fetch_weather_with_cache(lat, lon, previous_date.isoformat())
        except Exception as e:
            weather_api_calls.labels(status='error').inc()
            logger.error(f\"Errore critico meteo: {e}\")
            raise
```

**Risultato atteso**:
- **Prima**: 500 chiamate/giorno = rate limit OpenWeather (1000/mese gratis)
- **Dopo**: ~50 chiamate/giorno (90% cache hit) = scalabile a migliaia di utenti

**Impatto**: Scalabilità critica - limiti API evitati  
**Tempo stimato**: 11 ore (1.5 giorni)  
**Difficoltà**: 🟠 Complessa

---

#### 3.2 🟡 **IMPORTANTE** - Migrazione Frontend: HTML → React
**File**: `FrontEnd/templates/*.html` → `airvana-marketplace/src`
**Problema**:
- Dashboard in vanilla HTML/JS
- Marketplace in React
- Duplicazione codice
- Build process frammentato

**Soluzione**: Migrazione incrementale React

**Strategia**: Non tutto-o-niente, ma progressive migration

**Fase 1**: Setup monorepo (1 giorno)
```
Airvana/
├── backend/              # FastAPI
├── frontend/             # React App (tutto il frontend qui)
│   ├── public/
│   │   └── legacy/       # HTML vecchi temporaneamente
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard/
│   │   │   ├── Marketplace/
│   │   │   └── Auth/
│   │   ├── components/   # Componenti condivisi
│   │   ├── hooks/
│   │   ├── services/     # API calls
│   │   └── utils/
│   ├── package.json
│   └── vite.config.js
├── shared/               # Utilities condivise
└── docker-compose.yml
```

**Fase 2**: Migrazione prioritizzata (2 settimane)

**Week 1** - Core Components
```javascript
// src/components/shared/
├── Navbar.jsx         // Navbar unificata
├── Footer.jsx
├── AuthButton.jsx
├── LoadingSpinner.jsx
└── ErrorBoundary.jsx

// src/services/api.js - API Client unificato
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor per JWT
api.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

**Week 2** - Migrazione pagine (priority order)
1. **Login/Register** (più semplice) → 1 giorno
2. **Marketplace** (già React) → solo cleanup → 2 ore
3. **Dashboard** (più complessa: Chart.js, Leaflet) → 3 giorni

**Esempio migrazione Dashboard**:
```jsx
// src/pages/Dashboard/Dashboard.jsx
import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon } from 'react-leaflet';
import { Line } from 'react-chartjs-2';
import api from '../../services/api';

export default function Dashboard() {
  const [plots, setPlots] = useState([]);
  const [selectedPlot, setSelectedPlot] = useState(null);
  const [co2Data, setCo2Data] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserPlots();
  }, []);

  const loadUserPlots = async () => {
    try {
      const { data } = await api.get('/plots');
      setPlots(data);
      if (data.length > 0) {
        selectPlot(data[0]);
      }
    } catch (error) {
      console.error('Error loading plots:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectPlot = async (plot) => {
    setSelectedPlot(plot);
    const { data } = await api.get(`/plots/${plot.id}/co2`);
    setCo2Data(data);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className=\"dashboard\">
      <div className=\"dashboard-grid\">
        <PlotSelector plots={plots} onSelect={selectPlot} selected={selectedPlot} />
        <MapView plot={selectedPlot} />
        <CO2Chart data={co2Data} />
        <StatsCards plot={selectedPlot} />
      </div>
    </div>
  );
}
```

**Fase 3**: Routing unificato (2 giorni)
```javascript
// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path=\"/\" element={<Homepage />} />
        <Route path=\"/login\" element={<Login />} />
        <Route path=\"/register\" element={<Register />} />
        <Route path=\"/marketplace\" element={<Marketplace />} />
        
        {/* Protected routes */}
        <Route element={<PrivateRoute />}>
          <Route path=\"/dashboard\" element={<Dashboard />} />
          <Route path=\"/plots/new\" element={<NewPlot />} />
          <Route path=\"/plots/:id\" element={<PlotDetail />} />
        </Route>
        
        {/* Legacy fallback (temporaneo) */}
        <Route path=\"/legacy/*\" element={<LegacyFrame />} />
      </Routes>
    </BrowserRouter>
  );
}
```

**Vantaggi post-migrazione**:
- ✅ Codebase unificato
- ✅ Build process semplificato
- ✅ Componenti riutilizzabili
- ✅ State management centralizzato
- ✅ TypeScript per type safety

**Impatto**: Manutenibilità e developer experience  
**Tempo stimato**: 2-3 settimane  
**Difficoltà**: 🟠 Complessa

---

#### 3.3 🟡 **IMPORTANTE** - Ristrutturazione Backend modulare
**File**: Tutta la struttura `BackEnd/`
**Problema**: 
- File troppo grandi (`routes.py` = 747 righe)
- Logica business mixed con routes
- Test difficili

**Soluzione**: Clean Architecture pattern

**Prima** (❌ Monolitico):
```
BackEnd/
├── app/
│   ├── main.py           # 342 righe
│   ├── routes.py         # 747 righe - TROPPO!
│   ├── models.py
│   ├── schemas.py
│   └── utils.py          # Funzioni sparse
```

**Dopo** (✅ Modulare):
```
BackEnd/
├── app/
│   ├── main.py                    # Solo setup app
│   ├── core/                      # Configurazioni
│   │   ├── config.py
│   │   ├── security.py
│   │   └── database.py
│   ├── models/                    # DB Models
│   │   ├── user.py
│   │   ├── plot.py
│   │   └── species.py
│   ├── schemas/                   # Pydantic
│   │   ├── user.py
│   │   ├── plot.py
│   │   └── responses.py
│   ├── repositories/              # Data access layer
│   │   ├── plot_repository.py
│   │   └── user_repository.py
│   ├── services/                  # Business logic
│   │   ├── plot_service.py
│   │   ├── co2_calculator.py
│   │   └── weather_service.py
│   ├── api/                       # Routes (thin layer)
│   │   ├── plots.py              # ~100 righe
│   │   ├── users.py
│   │   └── marketplace.py
│   ├── middleware/
│   │   ├── auth.py
│   │   └── error_handler.py
│   └── tests/                     # Tests organizzati
│       ├── test_plots.py
│       └── test_co2_calculator.py
```

**Esempio refactoring** (Plot creation):

**Prima** (❌ Tutto in routes.py):
```python
@router.post(\"/api/plots\")
async def create_plot(plot_data: dict, db: AsyncSession = Depends(get_db)):
    # Validazione
    if not plot_data.get(\"name\"):
        raise HTTPException(400, \"Nome richiesto\")
    
    # Business logic
    new_plot = Plot(user_id=41, name=plot_data[\"name\"])
    db.add(new_plot)
    await db.commit()
    
    # Fetch meteo
    weather = await fetch_weather(new_plot.latitude, new_plot.longitude)
    
    # Calcolo CO2
    co2 = calculate_co2(new_plot, weather)
    
    return {\"id\": new_plot.id, \"co2\": co2}
```

**Dopo** (✅ Separazione responsabilità):

```python
# repositories/plot_repository.py
class PlotRepository:
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create(self, plot: Plot) -> Plot:
        self.db.add(plot)
        await self.db.commit()
        await self.db.refresh(plot)
        return plot
    
    async def get_by_user(self, user_id: int) -> List[Plot]:
        result = await self.db.execute(
            select(Plot).where(Plot.user_id == user_id)
        )
        return result.scalars().all()

# services/plot_service.py
class PlotService:
    def __init__(self, plot_repo: PlotRepository, weather_service: WeatherService):
        self.plot_repo = plot_repo
        self.weather_service = weather_service
    
    async def create_plot(self, user_id: int, plot_data: PlotCreate) -> PlotWithCO2:
        `
## 🟡 Problemi di Media Importanza

### 6. Mancanza di validazione dei dati in alcune rotte
**Rischio**: Esposizione a potenziali attacchi e dati inconsistenti.

### 7. Gestione degli errori inadeguata
**Rischio**: Crash dell'applicazione e debug difficoltoso.

### 8. Incongruenza nell'autenticazione
**Rischio**: Accesso non autorizzato a dati sensibili.

### 9. Codice duplicato
**Rischio**: Manutenzione difficoltosa e potenziali inconsistenze.

## 🟢 Miglioramenti Consigliati

### 10. Ristrutturazione della directory
- Separare chiaramente i componenti del backend in moduli distinti
- Creare una struttura più modulare per il frontend

### 11. Standardizzazione della gestione degli errori
- Creare una classe personalizzata per la gestione degli errori
- Implementare logging strutturato

### 12. Miglioramento della documentazione
- Aggiungere docstring alle funzioni
- Creare documentazione API più dettagliata

## 📋 Piano di Azione Prioritario

### Fase 1: Sicurezza Critica (Priorità Assoluta)
1. **Correggere l'hardcoded user_id** - Utilizzare l'utente autenticato
2. **Rimuovere le credenziali hardcoded** - Spostarle in variabili d'ambiente
3. **Uniformare le sessioni database** - Usare sempre le sessioni asincrone
4. **Aggiornare le query SQL** - Usare sempre parametri preparati

### Fase 2: Stabilità e Prestazioni
5. **Implementare validazione dati completa** - Aggiungere Pydantic models per tutte le rotte
6. **Migliorare la gestione degli errori** - Implementare un sistema centralizzato
7. **Rimuovere codice duplicato** - Consolidare funzioni comuni

### Fase 3: Manutenibilità
8. **Ristrutturare la directory** - Organizzazione modulare
9. **Aggiungere documentazione completa** - Docstring e commenti
10. **Implementare logging strutturato** - Tracciamento attività

## 📊 Priorità di Intervento

| Priorità | Problema | Impatto | Complessità | Stima Tempo |
|----------|----------|---------|-------------|-------------|
| 🔴 Alta | Hardcoded user_id | Critico | Bassa | 2h |
| 🔴 Alta | Credenziali hardcoded | Critico | Bassa | 1h |
| 🔴 Alta | SQL Injection | Critico | Media | 3h |
| 🟡 Media | Sessioni database | Alto | Media | 4h |
| 🟡 Media | Validazione dati | Medio | Media | 6h |
| 🟡 Media | Gestione errori | Medio | Media | 5h |
| 🟢 Bassa | Ristrutturazione | Basso | Alta | 8h |
| 🟢 Bassa | Documentazione | Basso | Media | 6h |

## 🛡️ Linee Guida per il Refactoring

1. **Mantenere la compatibilità** - Non rompere le API esistenti
2. **Testare ogni modifica** - Verificare il funzionamento dopo ogni cambiamento
3. **Documentare i cambiamenti** - Aggiornare il README.md
4. **Seguire le best practices** - Utilizzare async/await correttamente
5. **Implementare logging** - Tracciare le operazioni critiche

## 🎯 Obiettivi Finali

1. **Sicurezza**: Eliminare tutti i problemi critici di sicurezza
2. **Stabilità**: Migliorare la gestione degli errori e delle sessioni
3. **Manutenibilità**: Codice più pulito e modulare
4. **Performance**: Ottimizzare le operazioni database
5. **Documentazione**: Codice ben documentato e commentato

POSSIBILI PROBLEMI DI IMPLENTAZIONE JS / REACT E SOLUZIONI

⚠️ Possibili problemi e soluzioni

  1. Gestione della coerenza del design
  Problema: Aspetto diverso tra le diverse parti dell'applicazione
  Soluzione:
   - Creare un design system condiviso
   - Utilizzare gli stessi componenti CSS/UI in tutti i progetti
   - Mantenere una palette di colori e tipografia coerente

  2. Duplicazione del codice
  Problema: Logica ripetuta in vanilla JS e React
  Soluzione:
   - Creare una libreria JavaScript condivisa per funzionalità comuni
   - Utilizzare lo stesso sistema di autenticazione basato su token
   - Standardizzare le chiamate API

  3. Gestione dell'autenticazione
  Problema: Sincronizzazione dello stato di autenticazione tra i diversi frontend
  Soluzione:
   - Utilizzare JWT tokens memorizzati in localStorage/cookies
   - Implementare un sistema SSO (Single Sign-On)
   - Creare utility condivise per la gestione della sessione

  4. Deployment e distribuzione
  Problema: Complessità nella gestione di più applicazioni
  Soluzione:
   - Utilizzare un reverse proxy (Nginx) per instradare le richieste
   - Dockerizzare ogni componente separatamente
   - Implementare CI/CD coordinato

  🛠️ Raccomandazioni specifiche per Airvana

  1. Struttura dei file consigliata

   1 Airvana/
   2 ├── backend/              # FastAPI
   3 ├── frontend-vanilla/     # Sito principale
   4 ├── marketplace-react/    # Marketplace React
   5 ├── shared/               # Librerie condivise
   6 │   ├── auth/
   7 │   ├── api-client/
   8 │   └── utils/
   9 └── nginx/                # Configurazione reverse proxy

  2. Gestione delle API
   - Mantenere API RESTful coerenti
   - Versionare le API se necessario
   - Documentare bene gli endpoint

  3. Autenticazione condivisa

    1 // Esempio di utility condivisa
    2 class AuthManager {
    3   static getToken() {
    4     return localStorage.getItem('access_token') || getCookie('access_token');
    5   }
    6
    7   static setToken(token) {
    8     localStorage.setItem('access_token', token);
    9     setCookie('access_token', token);
   10   }
   11
   12   static logout() {
   13     localStorage.removeItem('access_token');
   14     deleteCookie('access_token');
   15   }
   16 }

  4. Componenti CSS condivisi
   - Creare una libreria CSS comune
   - Utilizzare variabili CSS per colori e dimensioni
   - Condividere componenti UI basilari

  📊 Conclusione

  Questa architettura può funzionare molto bene se gestita correttamente. I vantaggi superano gli svantaggi, specialmente per un'applicazione
  come Airvana che ha esigenze diverse per le varie sezioni:

   - Dashboard e mappe: Vanilla JS per performance e controllo
   - Marketplace: React per interattività e UX avanzata
   - Backend: FastAPI per API veloci e ben documentate

  L'importante è mantenere coerenza nei pattern di progettazione e condividere il più possibile componenti e logiche tra le diverse parti
  dell'applicazione.# 1. Crea plot
        plot = Plot(
            user_id=user_id,
            name=plot_data.name,
            area_mq=plot_data.area_mq,
            coordinates=plot_data.coordinates
        )
        plot = await self.plot_repo.create(plot)
        
        # 2. Fetch meteo
        weather = await self.weather_service.get_weather(
            plot.latitude, 
            plot.longitude
        )
        
        # 3. Calcola CO2
        co2_data = await self.co2_calculator.calculate(plot, weather)
        
        return PlotWithCO2(plot=plot, co2_data=co2_data)

# api/plots.py (THIN - solo routing)
@router.post("/api/plots", response_model=PlotResponse)
async def create_plot(
    plot_data: PlotCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    plot_service = PlotService(
        PlotRepository(db),
        WeatherService()
    )
    
    result = await plot_service.create_plot(current_user.id, plot_data)
    return result
```

**Vantaggi**:
- ✅ Testabilità: Mock facili per repositories/services
- ✅ Riusabilità: Services usabili da CLI/tasks/API
- ✅ Manutenibilità: File <200 righe ciascuno
- ✅ Dependency Injection: Chiara per testing

**Impatto**: Manutenibilità e testabilità  
**Tempo stimato**: 2 settimane  
**Difficoltà**: 🟠 Complessa

---

### 🔴 **LIVELLO 4: Strategic Changes** (1+ mese)
*Cambiamenti architetturali che richiedono pianificazione strategica*

#### 4.1 🟡 **IMPORTANTE** - Sistema di Testing Completo
**File**: Nessun test presente attualmente
**Problema**: Zero code coverage = bugs in produzione

**Soluzione**: Test pyramid completo

```
         /\
        /  \  E2E Tests (5%)
       /____\
      /      \  Integration Tests (15%)
     /________\
    /          \  Unit Tests (80%)
   /____________\
```

**Fase 1**: Setup testing infrastructure (1 giorno)
```python
# pyproject.toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["BackEnd/app/tests"]
python_files = "test_*.py"
python_classes = "Test*"
python_functions = "test_*"

# requirements-dev.txt
pytest==7.4.0
pytest-asyncio==0.21.0
pytest-cov==4.1.0
httpx==0.24.0  # Per test API
faker==19.2.0  # Dati fake
factory-boy==3.2.1  # Factories per models

# BackEnd/app/tests/conftest.py
import pytest
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from httpx import AsyncClient
from BackEnd.app.main import app
from BackEnd.app.models import Base

# Database di test (in-memory SQLite)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

@pytest.fixture
async def test_db():
    engine = create_async_engine(TEST_DATABASE_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    
    async with async_session() as session:
        yield session
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()

@pytest.fixture
async def client():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

@pytest.fixture
def mock_user():
    return {
        "id": 1,
        "username": "test_user",
        "email": "test@example.com"
    }
```

**Fase 2**: Unit tests (1 settimana)
```python
# tests/unit/test_co2_calculator.py
import pytest
from BackEnd.app.co2_o2_calculator import calculate_co2_o2_hourly
from BackEnd.app.models import Species

class TestCO2Calculator:
    @pytest.mark.asyncio
    async def test_calculate_co2_pine_tree(self):
        """Test calcolo CO2 per pino"""
        species_data = {
            "species_name": "Pino",
            "absorption_rate": 20.0,  # kg/anno
            "o2_production_rate": 15.0
        }
        
        weather_data = {
            "temperature": 20.0,
            "humidity": 60.0,
            "precipitation": 0.0
        }
        
        result = await calculate_co2_o2_hourly(
            species_data, 
            weather_data,
            count=10  # 10 alberi
        )
        
        assert result["co2_absorbed"] > 0
        assert result["o2_produced"] > 0
        assert result["co2_absorbed"] == pytest.approx(20.0 * 10 / 365 / 24, rel=0.1)
    
    @pytest.mark.asyncio
    async def test_calculate_co2_extreme_cold(self):
        """Test calcolo con temperature estreme (fotosintesi ridotta)"""
        species_data = {"species_name": "Quercia", "absorption_rate": 25.0}
        weather_data = {"temperature": -10.0, "humidity": 80.0}
        
        result = await calculate_co2_o2_hourly(species_data, weather_data, count=5)
        
        # Con freddo estremo, assorbimento dovrebbe essere ridotto
        normal_rate = 25.0 * 5 / 365 / 24
        assert result["co2_absorbed"] < normal_rate * 0.5  # <50% del normale

# tests/unit/test_plot_service.py
import pytest
from unittest.mock import AsyncMock, Mock
from BackEnd.app.services.plot_service import PlotService
from BackEnd.app.schemas import PlotCreate

class TestPlotService:
    @pytest.mark.asyncio
    async def test_create_plot_success(self, mock_user):
        # Setup mocks
        mock_repo = AsyncMock()
        mock_repo.create.return_value = Mock(id=1, name="Test Plot")
        
        mock_weather = AsyncMock()
        mock_weather.get_weather.return_value = {"temperature": 20.0}
        
        service = PlotService(mock_repo, mock_weather)
        
        # Execute
        plot_data = PlotCreate(name="Test Plot", area_mq=100)
        result = await service.create_plot(mock_user["id"], plot_data)
        
        # Assert
        assert result.plot.id == 1
        mock_repo.create.assert_called_once()
        mock_weather.get_weather.assert_called_once()
```

**Fase 3**: Integration tests (1 settimana)
```python
# tests/integration/test_plot_api.py
import pytest
from httpx import AsyncClient

class TestPlotAPI:
    @pytest.mark.asyncio
    async def test_create_plot_authenticated(self, client: AsyncClient, test_db):
        # 1. Register user
        register_response = await client.post("/register", json={
            "username": "testuser",
            "email": "test@test.com",
            "password": "Test123!"
        })
        assert register_response.status_code == 200
        
        # 2. Login
        login_response = await client.post("/login", json={
            "email": "test@test.com",
            "password": "Test123!"
        })
        token = login_response.json()["access_token"]
        
        # 3. Create plot
        plot_response = await client.post(
            "/api/plots",
            json={
                "name": "My Plot",
                "area_mq": 1000,
                "coordinates": [
                    {"lat": 41.9, "lon": 12.5},
                    {"lat": 41.91, "lon": 12.5},
                    {"lat": 41.91, "lon": 12.51},
                    {"lat": 41.9, "lon": 12.5}
                ]
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert plot_response.status_code == 200
        data = plot_response.json()
        assert data["name"] == "My Plot"
        assert "id" in data
        assert "co2_data" in data
    
    @pytest.mark.asyncio
    async def test_create_plot_unauthenticated_fails(self, client: AsyncClient):
        response = await client.post("/api/plots", json={"name": "Plot"})
        assert response.status_code == 401
```

**Fase 4**: E2E tests con Playwright (3 giorni)
```javascript
// tests/e2e/dashboard.spec.js
import { test, expect } from '@playwright/test';

test.describe('Dashboard Flow', () => {
  test('user can create and view plot', async ({ page }) => {
    // 1. Login
    await page.goto('http://localhost:8000/login');
    await page.fill('[name="email"]', 'test@test.com');
    await page.fill('[name="password"]', 'Test123!');
    await page.click('button[type="submit"]');
    
    // 2. Navigate to dashboard
    await expect(page).toHaveURL('/dashboard');
    
    // 3. Create new plot
    await page.click('button:has-text("Nuovo Terreno")');
    await page.fill('[name="plot-name"]', 'Test Plot E2E');
    
    // 4. Draw on map (simulate clicks)
    const map = page.locator('#map');
    await map.click({ position: { x: 100, y: 100 } });
    await map.click({ position: { x: 200, y: 100 } });
    await map.click({ position: { x: 200, y: 200 } });
    await map.click({ position: { x: 100, y: 200 } });
    
    // 5. Save
    await page.click('button:has-text("Salva")');
    
    // 6. Verify plot appears in list
    await expect(page.locator('text=Test Plot E2E')).toBeVisible();
    
    // 7. Verify CO2 chart loads
    await expect(page.locator('canvas.co2-chart')).toBeVisible();
  });
});
```

**Fase 5**: CI/CD con GitHub Actions (1 giorno)
```yaml
# .github/workflows/tests.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgis/postgis:14-3.2
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install -r requirements-dev.txt
      
      - name: Run unit tests
        run: |
          pytest tests/unit --cov=BackEnd/app --cov-report=xml
      
      - name: Run integration tests
        run: |
          pytest tests/integration
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage.xml
      
      - name: Run E2E tests
        run: |
          npm install
          npx playwright install
          npx playwright test
```

**Target Coverage**:
- Unit Tests: 80%+ coverage
- Integration Tests: Critical paths coperte
- E2E Tests: Happy paths utente

**Impatto**: Qualità del codice e confidence nei deploy  
**Tempo stimato**: 3 settimane  
**Difficoltà**: 🔴 Complessa

---

#### 4.2 🟡 **IMPORTANTE** - Monitoring e Observability
**Problema**: Zero visibilità su produzione
**Soluzione**: Stack completo monitoring

**Stack proposto**:
- **Logs**: Structured logging (JSON) + ELK/Loki
- **Metrics**: Prometheus + Grafana
- **Tracing**: OpenTelemetry
- **Errors**: Sentry
- **Uptime**: UptimeRobot

**Implementazione**:

```python
# BackEnd/app/observability/logging.py
import logging
import json
from datetime import datetime

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno
        }
        
        # Aggiungi context se presente
        if hasattr(record, 'user_id'):
            log_data['user_id'] = record.user_id
        if hasattr(record, 'request_id'):
            log_data['request_id'] = record.request_id
        
        return json.dumps(log_data)

# Setup logger
logger = logging.getLogger("airvana")
handler = logging.StreamHandler()
handler.setFormatter(JSONFormatter())
logger.addHandler(handler)
logger.setLevel(logging.INFO)

# BackEnd/app/middleware/request_logger.py
import uuid
from fastapi import Request
import time

@app.middleware("http")
async def log_requests(request: Request, call_next):
    request_id = str(uuid.uuid4())
    start_time = time.time()
    
    # Aggiungi request_id al context
    request.state.request_id = request_id
    
    response = await call_next(request)
    
    duration = time.time() - start_time
    
    logger.info(
        "HTTP Request",
        extra={
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "duration_ms": round(duration * 1000, 2),
            "user_id": getattr(request.state, 'user_id', None)
        }
    )
    
    response.headers["X-Request-ID"] = request_id
    return response

# BackEnd/app/observability/metrics.py
from prometheus_client import Counter, Histogram, Gauge
from prometheus_fastapi_instrumentator import Instrumentator

# Metriche custom
plots_created = Counter('airvana_plots_created_total', 'Plots created')
co2_calculations = Counter('airvana_co2_calculations_total', 'CO2 calculations')
weather_api_calls = Counter('airvana_weather_api_calls_total', 'Weather API calls', ['status'])
active_users = Gauge('airvana_active_users', 'Currently active users')

# Setup Prometheus
instrumentator = Instrumentator()

@app.on_event("startup")
async def startup():
    instrumentator.instrument(app).expose(app, endpoint="/metrics")

# Uso nelle routes
@router.post("/api/plots")
async def create_plot(...):
    plots_created.inc()  # ← Incrementa metrica
    # ... resto del codice

# BackEnd/app/observability/sentry_config.py
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

sentry_sdk.init(
    dsn="https://your-sentry-dsn",
    integrations=[
        FastApiIntegration(),
        SqlalchemyIntegration(),
    ],
    traces_sample_rate=0.1,  # 10% delle transazioni
    environment="production",
    release=os.getenv("GIT_COMMIT", "dev")
)
```

**Grafana Dashboard** (template):
```json
{
  "dashboard": {
    "title": "Airvana Monitoring",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [{
          "expr": "rate(http_requests_total[5m])"
        }]
      },
      {
        "title": "Error Rate",
        "targets": [{
          "expr": "rate(http_requests_total{status=~\"5..\"}[5m])"
        }]
      },
      {
        "title": "CO2 Calculations/hour",
        "targets": [{
          "expr": "rate(airvana_co2_calculations_total[1h])"
        }]
      },
      {
        "title": "Weather API Success Rate",
        "targets": [{
          "expr": "rate(airvana_weather_api_calls_total{status=\"success\"}[5m]) / rate(airvana_weather_api_calls_total[5m])"
        }]
      }
    ]
  }
}
```

**Impatto**: Visibilità produzione e incident response  
**Tempo stimato**: 1 settimana  
**Difficoltà**: 🟠 Media-Complessa

---

## 📅 ROADMAP CONSIGLIATA

### **Sprint 1 (Week 1-2): Security Critical** ⚠️
*Obiettivo: Eliminare vulnerabilità critiche prima di demo investitori*

- [ ] 1.1 Rimuovere credenziali hardcoded (30 min)
- [ ] 1.2 Fix path marketplace_dist (15 min) ✅ FATTO
- [ ] 2.1 Fix hardcoded user_id=41 (4 ore)
- [ ] 2.2 Audit completo SQL injection (5 ore)
- [ ] Code review sicurezza completa

**Deliverable**: Applicazione senza vulnerabilità critiche

---

### **Sprint 2 (Week 3-4): Stabilità & UX**
*Obiettivo: App stabile per demo live con investitori*

- [ ] 2.3 Gestione errori centralizzata (4 ore)
- [ ] 2.4 Validazione dati completa (6 ore)
- [ ] 1.3 Documentazione API (3 ore)
- [ ] Testing manuale E2E completo
- [ ] Preparare demo script per presentazione

**Deliverable**: Demo funzionante end-to-end senza crash

---

### **Sprint 3-4 (Week 5-8): Scalabilità**
*Obiettivo: Preparare l'app per crescita utenti*

- [ ] 3.1 Implementare cache Redis per meteo (Fase 1-2: 5 ore)
- [ ] 3.1 Cron job pre-fetch meteo (Fase 3: 4 ore)
- [ ] 3.1 Monitoring weather API (Fase 4: 2 ore)
- [ ] 4.2 Setup monitoring base (logs + metrics: 3 giorni)

**Deliverable**: App scalabile a 100+ utenti

---

### **Sprint 5-8 (Month 2): Refactoring Architettura**
*Obiettivo: Codebase manutenibile per team in crescita*

- [ ] 3.3 Ristrutturazione backend modulare (2 settimane)
- [ ] 4.1 Test suite completa (3 settimane)
- [ ] 3.2 Migrazione frontend a React (Fase 1-2: 2 settimane)

**Deliverable**: Codebase production-ready per onboarding nuovi dev

---

### **Sprint 9+ (Month 3+): Advanced Features**
*Obiettivo: Funzionalità enterprise per chiudere contratti*

- [ ] 3.2 Migrazione completa frontend (Fase 3)
- [ ] 4.2 Observability completa (Grafana dashboards)
- [ ] API pubbliche per partner/integrazioni
- [ ] Mobile app (React Native)
- [ ] Marketplace blockchain (NFT crediti CO2)?

---

## 🎯 METRICHE DI SUCCESSO

### **Per Presentazione Investitori** (Sprint 1-2)
- [ ] Zero vulnerabilità critiche (scanner Snyk/Bandit)
- [ ] Demo live funzionante senza crash
- [ ] Documentazione API completa (Swagger)
- [ ] < 2s response time su tutte le API
- [ ] Mobile responsive al 100%

### **Per Produzione MVP** (Month 2)
- [ ] 95%+ uptime
- [ ] < 500ms median API response time
- [ ] Scalabilità verificata: 100 utenti simultanei
- [ ] Code coverage >70%
- [ ] Zero hardcode in codebase

### **Per Enterprise** (Month 3+)
- [ ] 99.9% uptime SLA
- [ ] < 200ms P95 latency
- [ ] 10,000+ utenti supportati
- [ ] CI/CD automatizzato
- [ ] Monitoring dashboard completo

---

## 🚨 RISCHI E MITIGAZIONI

### **Rischio Alto**: Scope creep da investitori
**Mitigazione**: 
- Definire MVP features chiaro (documento firmato)
- Agile sprints con demo bi-weekly
- Change request formale per nuove features

### **Rischio Medio**: Team burnout (refactoring lungo)
**Mitigazione**:
- Refactoring incrementale (non big-bang)
- Pair programming per knowledge sharing
- Code freeze prima di demo critiche

### **Rischio Medio**: Breaking changes in migrazione
**Mitigazione**:
- Feature flags per rollback rapido
- Blue-green deployment
- Regression test suite completa

### **Rischio Basso**: Performance meteo API
**Mitigazione**:
- Cache Redis implementato in Sprint 3
- Fallback a dati precedenti se API down
- Monitoring proattivo rate limits

---

## 📚 RISORSE E RIFERIMENTI

### **Best Practices**
- [FastAPI Best Practices](https://github.com/zhanymkanov/fastapi-best-practices)
- [React Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [12 Factor App](https://12factor.net/)

### **Security**
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)

### **Testing**
- [Testing Best Practices](https://testingjavascript.com/)
- [Pytest AsyncIO](https://pytest-asyncio.readthedocs.io/)

### **Monitoring**
- [Prometheus Best Practices](https://prometheus.io/docs/practices/)
- [Grafana Dashboards](https://grafana.com/grafana/dashboards/)

---

## 💡 NOTE FINALI

### **Per il Team**
Questo documento è un **piano vivente** - aggiornalo regolarmente con:
- ✅ Task completati
- 🔄 Task in progress
- ⏸️ Task bloccati (con motivo)
- 📝 Note e learnings

### **Per gli Stakeholder**
La prioritizzazione è **data-driven**:
- 🔴 CRITICO = blocca produzione o demo
- 🟡 IMPORTANTE = impatta scaling o manutenibilità
- 🟢 NICE-TO-HAVE = migliora DX ma non blocca

### **Next Steps Immediati**
1. **Review** questo piano con tutto il team (1 ora)
2. **Prioritize** i primi 3 task da Sprint 1 
3. **Assign** owner per ogni task
4. **Setup** board Kanban (GitHub Projects/Jira)
5. **Schedule** daily standup (15 min/giorno)

---

**Ultimo aggiornamento**: 02/10/2025  
**Owner documento**: Lorenzo  
**Prossima revisione**: Weekly ogni Venerdì

🚀 **Let's build something great!**