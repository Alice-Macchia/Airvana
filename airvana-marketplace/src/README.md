# 🌿 Airvana Marketplace - Crediti CO₂

Un marketplace React per l'acquisto di crediti di carbonio da terreni agricoli certificati.

## 📁 Struttura del Progetto

```
FrontEnd/store-front/
├── Marketplace.jsx          # Componente principale del marketplace
├── TerrenoCard.jsx          # Componente card per singolo terreno
├── index.html               # Esempio HTML statico
└── README.md               # Questo file
```

## 🚀 Caratteristiche

### ✅ Implementate
- **Griglia responsiva**: 1 colonna su mobile, 3 su desktop
- **Dati statici**: Array con 6 terreni certificati italiani
- **Design Bootstrap 5**: Card stilizzate con ombre e hover effects
- **Componenti separati**: Marketplace e TerrenoCard modulari
- **Alert interattivo**: Conferma aggiunta al carrello
- **Immagini Unsplash**: Foto realistiche dei terreni
- **Calcoli automatici**: Conversione kg CO₂ in tonnellate

### 🔮 Placeholder per API Backend
```javascript
// TODO: Implementare connessione API backend
// const response = await fetch('/api/cart/add', {
//   method: 'POST',
//   headers: { 'Content-Type': 'application/json' },
//   body: JSON.stringify({ terrenoId, userId })
// });
```

## 📊 Dati dei Terreni

Ogni terreno include:
- **Nome**: Es. "Vigneto Toscano - Chianti Classico"
- **CO₂ assorbita**: kg/anno (es. 2,500 kg/anno)
- **Prezzo**: €/anno (es. €89/anno)
- **Descrizione**: Breve descrizione del terreno
- **Immagine**: URL Unsplash per visualizzazione

## 🎨 Styling

### Bootstrap 5
- Card responsive con `shadow-sm` e `hover:shadow-md`
- Badge "Certificato" per ogni terreno
- Alert informativi per l'impatto CO₂
- Bottoni `btn-success` per call-to-action

### Tailwind CSS
- Classi utility per padding e margini
- Transizioni smooth per hover effects
- Layout responsive con grid system

## 🔧 Utilizzo

### 1. Importa i componenti
```javascript
import Marketplace from './store-front/Marketplace';
import TerrenoCard from './store-front/TerrenoCard';
```

### 2. Usa il Marketplace
```javascript
function App() {
  return (
    <div className="App">
      <Marketplace />
    </div>
  );
}
```

### 3. Personalizza i dati
Modifica l'array `terreniData` in `Marketplace.jsx` per aggiungere/rimuovere terreni.

## 🌐 Demo HTML

Il file `index.html` contiene una versione statica del marketplace che puoi aprire direttamente nel browser per vedere il risultato.

## 🔗 Integrazione Backend

Per collegare al backend FastAPI:

1. **Sostituisci i dati statici** con chiamate API
2. **Implementa l'autenticazione** per gli utenti
3. **Aggiungi gestione carrello** con database
4. **Implementa pagamento** con gateway esterni

### Esempio API Endpoint
```python
@app.get("/api/terreni")
async def get_terreni():
    # Query database per terreni certificati
    return {"terreni": terreni_list}

@app.post("/api/cart/add")
async def add_to_cart(terreno_id: int, user_id: int):
    # Aggiungi al carrello utente
    return {"success": True}
```

## 🎯 Prossimi Passi

- [ ] Integrazione con database PostgreSQL
- [ ] Sistema di autenticazione utenti
- [ ] Gestione carrello persistente
- [ ] Gateway di pagamento (Stripe/PayPal)
- [ ] Dashboard utente per tracking crediti
- [ ] Notifiche email per conferme acquisti
- [ ] Sistema di rating e recensioni terreni

## 📱 Responsive Design

- **Mobile**: 1 colonna (col-12)
- **Tablet**: 2 colonne (col-md-6)
- **Desktop**: 3 colonne (col-lg-4)

## 🌱 Impatto Ambientale

Ogni terreno mostra:
- **kg CO₂/anno**: Assorbimento effettivo
- **Tonnellate equivalenti**: Conversione automatica
- **Prezzo per anno**: Costo del credito
- **Certificazione**: Badge di qualità

---

*Sviluppato per Airvana - Piattaforma di crediti CO₂ sostenibili* 🌿 