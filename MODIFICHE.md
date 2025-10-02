# 📋 PIANO DI REFACTORING AIRVANA

> **Ultimo aggiornamento**: 02/10/2025  
> **Target**: Team junior - Guida pratica per migliorare il progetto

---

## 🎯 OBIETTIVO

Preparare Airvana per presentazione a TIM/Ernest Young e scalabilità futura.

**Problema attuale**: Backend solido ma con hardcode pericolosi e frontend frammentato  
**Obiettivo**: App production-ready, sicura e scalabile

---

## 📊 PROBLEMI PRIORITIZZATI (dal più semplice al più difficile)

---

### 🟢 **LIVELLO 1: Quick Wins** (1-3 ore totali)

#### **1. Fix path marketplace - RISOLTO ✅**
**Dove**: `BackEnd/app/main.py` righe 37-38

**Perché era un problema**:
- Backend leggeva da `marketplace_dist` (cartella che non dovrebbe esistere)
- Dovevi copiare manualmente i file dopo ogni build
- Workflow lento e prone-error

**Cosa abbiamo fatto**:
Cambiato path per puntare direttamente a `airvana-marketplace/dist`

**Risultato**: Ora `npm run build` → file subito disponibili ✅

---

#### **2. Credenziali hardcoded - RISOLTO ✅**
**Dove**: `co2_o2_calculator.py`

**Perché era un problema**:
- Password database visibili nel codice
- Se carichi su GitHub → chiunque può accedere al database
- **Rischio**: Data breach, database cancellato, credenziali rubate

**Cosa hai fatto**:
Rimosso completamente la riga commentata

**Risultato**: Tutte le credenziali ora in `.env` (file gitignored) ✅

---

#### **3. Documentazione mancante**
**Dove**: Funzioni senza spiegazioni

**Perché è un problema**:
- Nessuno capisce cosa fa il codice
- Difficile per nuovi dev (o voi tra 3 mesi)
- Tempo perso a decifrare logica

**Esempio problema**:
```python
async def get_species_distribution_by_plot(plot_id: int, db: AsyncSession):
    # Che fa? Quali parametri servono? Cosa ritorna?
    ...
```

**Cosa fare**:
Aggiungere docstring (descrizione) alle funzioni principali

**Esempio soluzione**:
```python
async def get_species_distribution_by_plot(plot_id: int, db: AsyncSession) -> dict:
    """
    Calcola la percentuale di ogni specie presente in un terreno.
    
    Args:
        plot_id: ID del terreno da analizzare
        db: Connessione database asincrona
        
    Returns:
        {"Pino": 60, "Quercia": 40} # Percentuali
        
    Raises:
        HTTPException(404): Se il terreno non esiste
    """
```

**Priorità**: Media - aiuta manutenibilità  
**Tempo stimato**: 2-3 ore per le funzioni principali

---

### 🟡 **LIVELLO 2: Problemi di Sicurezza** (4-6 ore totali)

#### **4. Hardcoded user_id=41 - CRITICO 🔴**
**Dove**: `BackEnd/app/routes.py` riga 707

**Il codice problematico**:
```python
new_plot = Plot(
    user_id=41,  # ⚠️ SEMPRE LO STESSO UTENTE
    name=plot_data.get("name"),
    ...
)
```

**Perché è GRAVE**:
1. **Chiunque può salvare terreni come se fosse l'utente 41**
2. Se l'utente 41 non esiste → crash
3. Tutti i terreni finiscono sullo stesso utente
4. **Scenario reale**: Utente A crea terreno → salva su utente 41 → Utente B vede terreni di A

**Perché succede**:
Probabilmente durante sviluppo usavate sempre l'utente 41 per testare, e poi è rimasto hardcoded.

**Cosa fare**:
Usare l'utente che ha effettivamente fatto login

**Soluzione**:
```python
@router.post("/api/plots")
async def create_plot(
    plot_data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)  # ← Prende utente loggato
):
    new_plot = Plot(
        user_id=current_user["id"],  # ✅ Utente corretto
        name=plot_data.get("name"),
        ...
    )
```

**Come verificare che funziona**:
1. Login come User A → crea terreno → salva
2. Login come User B → crea terreno → salva
3. Ogni utente vede SOLO i propri terreni

**Priorità**: CRITICA - blocca uso multi-utente  
**Tempo stimato**: 4 ore

---

#### **5. SQL Injection potenziale**
**Dove**: Query database con stringhe

**Perché è un problema**:
Se costruisci query SQL con stringhe, un hacker può "iniettare" codice SQL e leggere/cancellare tutto il database.

**Esempio vulnerabile**:
```python
# ❌ PERICOLOSO
query = f"SELECT * FROM plots WHERE user_id = {user_id}"
```

Se qualcuno passa `user_id = "1 OR 1=1"` → la query diventa:
```sql
SELECT * FROM plots WHERE user_id = 1 OR 1=1
```
Risultato: ritorna TUTTI i terreni di TUTTI gli utenti!

**Soluzione sicura**:
```python
# ✅ SICURO - SQLAlchemy gestisce l'escape
from sqlalchemy import select
query = select(Plot).where(Plot.user_id == user_id)
result = await db.execute(query)
```

**Cosa fare**:
1. Cercare tutte le query con `f"SELECT` o string formatting
2. Convertirle a SQLAlchemy ORM (già lo usate per i models)

**Priorità**: ALTA - prevenire attacchi  
**Tempo stimato**: 3-4 ore per audit completo

---

### 🟠 **LIVELLO 3: Scalabilità** (1-2 settimane)

#### **6. Troppi call API meteo - CRITICO per crescita 🔴**

**Il problema**:
- Ogni volta che calcoli CO2 → chiamata API meteo
- OpenWeatherMap FREE: 1000 chiamate/mese
- Con 10 utenti x 5 terreni x 2 volte/giorno = **300 chiamate/giorno** = 9000/mese
- **Risultato**: Sfondate il limite in 3 giorni!

**Perché succede**:
Logica attuale: "Ho bisogno meteo? → Chiamo API". Non c'è memoria/cache.

**Scenario reale che rompe tutto**:
1. Luca apre dashboard → fetch meteo Roma (chiamata 1)
2. Luca refresha pagina → fetch meteo Roma ANCORA (chiamata 2)
3. Maria apre dashboard Roma → fetch meteo Roma ANCORA (chiamata 3)
4. Ripeti per 10 utenti → 100+ chiamate/giorno per la stessa città!

**Soluzione: Cache + Pre-fetch**

**Fase 1: Cache con Redis** (evita chiamate duplicate)
```python
# Prima di chiamare API meteo, controlla cache
cached_weather = redis.get(f"weather:roma:2025-10-02")
if cached_weather:
    return cached_weather  # ✅ Riusa dato
else:
    weather = call_api()  # Solo se non in cache
    redis.set(f"weather:roma:2025-10-02", weather, expire=86400)  # Salva 24h
```

**Fase 2: Cron Job mattutino** (pre-carica dati)
Invece di aspettare che utenti chiedano dati meteo, alle 6:00 ogni mattina:
1. Prendi tutte le coordinate dei terreni
2. Raggruppa coordinate simili (Roma = 41.9, 12.5)
3. Fetch meteo per ogni gruppo
4. Salva in cache

**Risultato**: 
- Utenti trovano dati già pronti (più veloce)
- Da 9000 chiamate/mese → 200 chiamate/mese (una per città al giorno)

**Alternativa senza Redis** (più semplice ma meno efficiente):
Salva dati meteo in database con timestamp, riusa se < 24h.

**Priorità**: ALTA - necessario per scalare oltre 20 utenti  
**Tempo stimato**: 1 settimana con Redis, 2 giorni senza Redis

---

#### **7. Frontend frammentato: HTML + React**

**Il problema**:
- Dashboard = Vanilla HTML/JS
- Marketplace = React
- Stili diversi, codice duplicato, build process incasinato

**Perché è un problema**:
1. **Manutenzione doppia**: Cambi navbar → devi cambiarla in 2 posti
2. **Inconsistenza UI**: Bottoni diversi tra dashboard e marketplace
3. **Confusione dev**: "Dove modifico questa pagina?"

**Scenario che frustra**:
Vuoi aggiungere una funzione "Logout" → devi implementarla:
- In `demo.html` (vanilla JS)
- In `Marketplace.jsx` (React)
- Con stili CSS diversi
- Con logiche diverse
→ Lavoro x2, bug x2

**Soluzione: Tutto in React** (migrazione progressiva)

**Step consigliati**:
1. **Week 1**: Crea componenti React condivisi (Navbar, Footer, AuthButton)
2. **Week 2**: Migra pagina Login (la più semplice)
3. **Week 3**: Migra Dashboard (la più complessa)

**Risultato finale**:
```
frontend/
├── src/
│   ├── components/  # Navbar, Footer (condivisi)
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   ├── Marketplace.jsx
│   │   └── Login.jsx
│   └── services/
│       └── api.js  # Chiamate backend (condiviso)
```

**Vantaggi**:
- ✅ Un solo posto per modifiche
- ✅ Componenti riusabili
- ✅ Build unificato
- ✅ Stile consistente

**Priorità**: MEDIA - migliora manutenibilità ma non blocca funzionalità  
**Tempo stimato**: 2-3 settimane (graduale)

---

### 🔴 **LIVELLO 4: Professional** (1 mese+)

#### **8. Zero test = Bug in produzione**

**Il problema**:
Non avete test → non sapete se il codice funziona finché non lo provate manualmente.

**Scenario che rompe tutto**:
1. Modifichi funzione calcolo CO2
2. Committa e pusha
3. **Scopri dopo 1 settimana** che hai rotto i calcoli per tutti
4. Utenti hanno dati sbagliati → perdita credibilità

**Cosa serve**:
Test automatici che verificano:
- Login funziona ✅
- Creare terreno funziona ✅
- Calcolo CO2 è corretto ✅
- API meteo fallisce → app non crasha ✅

**Esempio test semplice**:
```python
def test_calcolo_co2_pino():
    """Verifica che 10 pini assorbono ~200kg CO2/anno"""
    result = calculate_co2(species="Pino", count=10)
    assert result >= 180 and result <= 220  # Range accettabile
```

**Cosa fare**:
1. Iniziare con 10-15 test per funzioni critiche
2. Ogni bug trovato → aggiungi test che lo previene
3. CI/CD: test automatici prima di ogni deploy

**Priorità**: ALTA per produzione, BASSA per MVP  
**Tempo stimato**: 2-3 settimane per coverage base

---

#### **9. Zero monitoring = Non sai se qualcosa si rompe**

**Il problema**:
Se l'app crasha in produzione, non lo sapete finché un utente non vi scrive.

**Cosa serve**:
- **Logs**: Cosa sta succedendo (ogni azione registrata)
- **Metriche**: Quanti utenti, API lente, errori
- **Alerts**: Email se qualcosa va male

**Tool semplici da iniziare**:
- Logs: `logger.info("User 41 created plot")` → salva in file
- Metrics: Sentry (gratis) → cattura errori automaticamente
- Uptime: UptimeRobot (gratis) → ping ogni 5 min

**Priorità**: MEDIA - essenziale prima di produzione vera  
**Tempo stimato**: 1 settimana per setup base

---

## 🎯 COSA FARE ORA (Priorità per demo investitori)

### **Sprint 1 (Questa settimana - 2 giorni)**
- [ ] Fix hardcoded `user_id=41` → usa utente autenticato
- [ ] Test manuale: 2 utenti diversi, ognuno vede solo i suoi terreni

### **Sprint 2 (Prossima settimana - 3 giorni)**
- [ ] Audit SQL injection → converti query pericolose a SQLAlchemy
- [ ] Aggiungi docstring alle 10 funzioni principali
- [ ] Prepara demo script per presentazione

### **Sprint 3 (Tra 2 settimane - 1 settimana)**
- [ ] Implementa cache meteo (anche semplice: database con timestamp)
- [ ] Test con 20 utenti simulati → verifica non sfondi API limit

### **Dopo demo (se va bene)**
- [ ] Migrazione progressiva a React
- [ ] Test suite base
- [ ] Monitoring produzione

---

## 📋 CHECKLIST DEMO INVESTITORI

Prima della presentazione, verificare:
- [ ] Multi-utente funziona (utenti diversi, terreni separati)
- [ ] Zero credenziali nel codice (tutto in `.env`)
- [ ] API rispondono in <2 secondi
- [ ] Design coerente (stesso stile in tutte le pagine)
- [ ] Zero errori in console browser
- [ ] README aggiornato con istruzioni setup

---

## ❓ FAQ

**Q: Come faccio a testare il fix di user_id=41?**  
A: 
1. Registra 2 utenti (user1@test.com, user2@test.com)
2. Login come user1 → crea terreno "Terreno A"
3. Logout → Login come user2 → crea terreno "Terreno B"
4. Logout → Login come user1 → devi vedere SOLO "Terreno A"

**Q: Redis è obbligatorio per cache meteo?**  
A: No! Alternativa più semplice:
```python
# Salva in database
CREATE TABLE weather_cache (
    location TEXT,
    date DATE,
    data JSONB,
    created_at TIMESTAMP
);

# Prima di API call
cached = db.query(WeatherCache).filter(
    location == "roma",
    date == today,
    created_at > (now - 24h)
).first()
```

**Q: Quanto tempo per fare tutto?**  
A: 
- Minimo per demo sicura: 1 settimana (Sprint 1-2)
- Per app scalabile: 1 mese
- Per app enterprise: 2-3 mesi

**Q: Da dove iniziare se abbiamo poco tempo?**  
A: In ordine:
1. Fix user_id=41 (4h) - **BLOCCA MULTI-UTENTE**
2. SQL injection audit (4h) - **SICUREZZA**
3. Cache meteo base (1 giorno) - **SCALABILITÀ**

---

## 🚨 RED FLAGS da evitare in demo

- ❌ Crash durante la presentazione
- ❌ Mostrare codice con hardcode visibili
- ❌ Terreni di utenti diversi mescolati
- ❌ API meteo che fallisce e blocca tutto
- ❌ "Questo non dovrebbe succedere..." durante demo

---

**Domande?** Chiedete! Meglio chiarire ora che scoprire problemi durante la demo.

**Prossimi passi**: 
1. Leggere questo documento (30 min)
2. Meeting team per assegnare task Sprint 1 (1h)
3. Iniziare! 🚀