# 🌿 Airvana Marketplace

Il marketplace React per l'acquisto di crediti CO₂ da terreni certificati.

## 🚀 Setup e Build

### Prerequisiti
- Node.js (versione 16 o superiore)
- npm o yarn
- Python 3.8+ (per il backend FastAPI)

### Build Automatico
```bash
# Build del marketplace React
python build_marketplace.py
```

### Build Manuale
```bash
# Entra nella cartella del progetto React
cd airvana-marketplace

# Installa le dipendenze
npm install

# Build del progetto
npm run build

# Sposta la cartella dist nella root del progetto
mv dist ../marketplace_dist
```

## 🏃‍♂️ Avvio del Server

### Backend FastAPI
```bash
# Avvia il server FastAPI
uvicorn BackEnd.app.main:app --reload --host 0.0.0.0 --port 8000
```

### Accesso al Marketplace
Una volta avviato il server, il marketplace sarà disponibile su:
- **URL**: `http://localhost:8000/marketplace`
- **Route**: `/marketplace`

## 📁 Struttura dei File

```
├── airvana-marketplace/          # Progetto React
│   ├── src/
│   │   ├── Marketplace.jsx      # Componente principale
│   │   ├── TerrenoCard.jsx      # Card dei terreni
│   │   └── Marketplace.css      # Stili
│   └── package.json
├── marketplace_dist/             # Build del marketplace (generato)
│   ├── index.html
│   ├── assets/
│   └── ...
├── BackEnd/app/main.py          # Server FastAPI
└── build_marketplace.py         # Script di build
```

## 🔧 Configurazione FastAPI

Il server FastAPI è configurato per:

1. **Mount dei file statici**: `/marketplace` → `marketplace_dist/`
2. **Route fallback**: Qualsiasi route `/marketplace/*` carica `index.html`
3. **CORS**: Configurato per permettere richieste dal frontend

### Esempi di Route
- `GET /marketplace` → Carica `index.html`
- `GET /marketplace/terreni` → Carica `index.html` (routing React)
- `GET /marketplace/assets/...` → File statici (CSS, JS, immagini)

## 🎨 Funzionalità del Marketplace

### Caratteristiche
- ✅ **Responsive Design**: Ottimizzato per tutti i dispositivi
- ✅ **Fallback Immagini**: Gestione errori di caricamento
- ✅ **Animazioni Fluide**: Transizioni e hover effects
- ✅ **Carrello**: Aggiunta/rimozione terreni
- ✅ **Dettagli Terreni**: Modal con informazioni complete

### Componenti Principali
- **Marketplace.jsx**: Layout principale e gestione stato
- **TerrenoCard.jsx**: Card individuale per ogni terreno
- **Checkout.jsx**: Processo di acquisto
- **TerrenoDetail.jsx**: Dettagli completi del terreno

## 🛠️ Sviluppo

### Modifiche al Frontend
```bash
cd airvana-marketplace
npm run dev  # Sviluppo locale
```

### Rebuild dopo modifiche
```bash
python build_marketplace.py
```

### Hot Reload (Sviluppo)
Per sviluppo locale senza rebuild:
```bash
cd airvana-marketplace
npm run dev
# Accesso su http://localhost:5173
```

## 🐛 Troubleshooting

### Problemi Comuni

1. **Build fallisce**
   ```bash
   # Verifica Node.js
   node --version
   npm --version
   
   # Pulisci cache
   cd airvana-marketplace
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **File statici non trovati**
   ```bash
   # Verifica che marketplace_dist esista
   ls -la marketplace_dist/
   
   # Rebuild se necessario
   python build_marketplace.py
   ```

3. **CORS errors**
   - Verifica che il middleware CORS sia configurato in `main.py`
   - Controlla che gli origins siano corretti

### Log del Server
```bash
# Avvia con log dettagliati
uvicorn BackEnd.app.main:app --reload --log-level debug
```

## 📝 Note Tecniche

- **Routing**: React Router gestisce il routing lato client
- **Stato**: useState per gestione carrello e modals
- **Stili**: CSS custom con variabili CSS per coerenza
- **API**: Preparato per integrazione con backend (endpoint da implementare)

## 🔄 Aggiornamenti

Per aggiornare il marketplace:
1. Modifica i file in `airvana-marketplace/src/`
2. Esegui `python build_marketplace.py`
3. Riavvia il server FastAPI se necessario

---

**🎯 Obiettivo**: Marketplace funzionale e responsive per l'acquisto di crediti CO₂ da terreni certificati Airvana. 