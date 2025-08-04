# 🌿 Airvana - Piattaforma di Monitoraggio CO₂

<p align="center">
  <img src="logo_airvana.jpg" alt="Airvana Logo" width="200"/>
</p>

<h4 align="center">
  Piattaforma innovativa per il monitoraggio e la gestione dei crediti di carbonio da terreni agricoli
</h4>

## 📋 Panoramica del Progetto

Airvana è una piattaforma completa che combina **monitoraggio ambientale**, **calcoli CO₂/O₂** e **marketplace di crediti di carbonio**. Il sistema permette agli utenti di:

- **Registrare terreni agricoli** con coordinate geografiche precise
- **Monitorare dati meteorologici** in tempo reale tramite API Open-Meteo
- **Calcolare assorbimento CO₂** e produzione O₂ delle piante
- **Acquistare crediti di carbonio** da terreni certificati
- **Visualizzare classifiche** e statistiche ambientali

## 🏗️ Architettura del Sistema

### Backend (FastAPI + PostgreSQL)
- **Framework**: FastAPI con supporto async/await
- **Database**: PostgreSQL con estensioni PostGIS per dati geografici
- **Autenticazione**: JWT con bcrypt per la sicurezza
- **API**: RESTful con documentazione automatica (Swagger/OpenAPI)
- **CORS**: Configurato per supportare frontend React

### Frontend (React + Vite)
- **Framework**: React 19 con Hooks
- **Build Tool**: Vite per sviluppo veloce
- **Styling**: Bootstrap 5 + CSS personalizzato
- **Icons**: Font Awesome per icone moderne

### Marketplace (React SPA)
- **Applicazione separata** per la vendita di crediti CO₂
- **Carrello dinamico** con gestione stato
- **Modal dettagli** per ogni terreno
- **Checkout completo** con form di pagamento

## 🚀 Funzionalità Principali

### 🌱 Gestione Terreni
- **Registrazione terreni** con coordinate GPS
- **Associazione specie vegetali** per calcoli precisi
- **Visualizzazione mappa** con terreni registrati
- **Dashboard personalizzata** per ogni utente

### 📊 Calcoli CO₂/O₂
- **Algoritmi avanzati** per calcolo assorbimento CO₂
- **Dati meteorologici real-time** da Open-Meteo API
- **Coefficienti dinamici** basati su specie e condizioni
- **Report orari** con dettagli completi

### 🛒 Marketplace Crediti
- **Catalogo terreni certificati** con immagini
- **Sistema carrello** con gestione quantità
- **Checkout sicuro** con validazione dati
- **Responsive design** per mobile e desktop

### 📈 Analisi e Report
- **Classifiche utenti** per assorbimento CO₂
- **Esportazione PDF** dei report
- **Statistiche dettagliate** per ogni terreno
- **Monitoraggio continuo** dei dati

## 🛠️ Tecnologie Utilizzate

### Backend
```
FastAPI==0.115.12
SQLAlchemy==2.0.41
PostgreSQL + PostGIS
GeoAlchemy2==0.17.1
Pandas==2.2.3
Python-Jose==3.4.0
Uvicorn==0.34.2
```

### Frontend
```
React==19.1.0
Vite==7.0.4
Bootstrap==5.3.0
Font Awesome==6.4.0
```

### Database
```
PostgreSQL 13+
PostGIS per dati geografici
AsyncPG per connessioni async
```

## 📁 Struttura del Progetto

```
Airvana/
├── BackEnd/
│   └── app/
│       ├── main.py              # FastAPI app principale
│       ├── models.py            # Modelli SQLAlchemy
│       ├── routes.py            # API endpoints
│       ├── auth.py              # Autenticazione JWT
│       ├── co2_o2_calculator.py # Calcoli CO₂/O₂
│       ├── get_meteo.py         # API Open-Meteo
│       └── utils.py             # Utility functions
├── FrontEnd/
│   ├── templates/               # Template HTML
│   └── static/                  # CSS, JS, immagini
├── airvana-marketplace/         # React marketplace
│   ├── src/
│   │   ├── Marketplace.jsx      # Componente principale
│   │   ├── TerrenoCard.jsx      # Card terreno
│   │   └── components/          # Componenti React
│   └── package.json
├── marketplace_dist/            # Build React marketplace
├── requirements.txt             # Dipendenze Python
└── docker-compose.yml          # Containerizzazione
```

## 🔧 Installazione e Setup

### Prerequisiti
- Python 3.8+
- Node.js 16+
- PostgreSQL 13+ con PostGIS
- Git

### 1. Clona il Repository
```bash
git clone <repository-url>
cd Airvana
```

### 2. Setup Backend
```bash
# Installa dipendenze Python
pip install -r requirements.txt

# Configura variabili ambiente
cp .env.example .env
# Modifica .env con le tue configurazioni
```

### 3. Setup Database
```bash
# Crea database PostgreSQL
createdb airvana_db

# Applica migrazioni
python -c "from BackEnd.app.database import init_db; init_db()"
```












# PER AVVIARE LA PIATTAFORMA (EMMA)
4. Setup Frontend Marketplace
QUESTO SOLO LA PRIMA VOLTA
cd airvana-marketplace
npm install


🚀 Avvio del Sistema
PER AVVIARE IL SERVER SU REACT
cd airvana-marketplace
npm run build



Dalla root del progetto
uvicorn BackEnd.app.main:app --host 0.0.0.0 --port 8000 --reload
















### Accesso alle Applicazioni
- **Backend API**: http://localhost:8000
- **Documentazione API**: http://localhost:8000/docs
- **Frontend principale**: http://localhost:8000
- **Marketplace**: http://localhost:5173
- **Marketplace (servito da backend)**: http://localhost:8000/marketplace

## 🔐 Configurazione Ambiente

Crea un file `.env` nella root del progetto:

```env
DATABASE_URL=postgresql+asyncpg://user:password@localhost/airvana_db
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
```

## 📊 API Endpoints Principali

### Autenticazione
- `POST /login` - Login utente
- `GET /logout` - Logout utente
- `GET /dashboard` - Dashboard protetta

### Gestione Terreni
- `POST /save-coordinates` - Salva nuovo terreno
- `GET /api/get_all_plots` - Lista tutti i terreni
- `GET /calcola_co2/{plot_id}` - Calcola CO₂ per terreno

### Dati Meteorologici
- `POST /get_open_meteo/{plot_id}` - Recupera dati meteo
- `GET /weather/{plot_id}` - Dati meteo per terreno
- `GET /api/weather/exists` - Verifica esistenza dati

### Marketplace
- `GET /marketplace` - SPA React marketplace
- `GET /assets/*` - Asset statici marketplace

## 🤝 Contribuire

1. Fork del repository
2. Crea branch per feature (`git checkout -b feature/nuova-funzionalita`)
3. Commit delle modifiche (`git commit -am 'Aggiunge nuova funzionalità'`)
4. Push del branch (`git push origin feature/nuova-funzionalita`)
5. Crea Pull Request

## 📄 Licenza

Questo progetto è sotto licenza MIT. Vedi il file `LICENSE` per i dettagli.

## 👥 Team

- **Sviluppo Backend**: FastAPI, PostgreSQL, GeoAlchemy2
- **Sviluppo Frontend**: React, Bootstrap, Vite
- **Calcoli Ambientali**: Algoritmi CO₂/O₂ personalizzati
- **Integrazione API**: Open-Meteo per dati meteorologici

---

<p align="center">
  <strong>🌿 Airvana - Innovazione per un futuro sostenibile</strong>
</p>
