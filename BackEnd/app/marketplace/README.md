# Marketplace Airvana - Setup e Utilizzo

## 📋 Panoramica

Il modulo marketplace aggiunge funzionalità di e-commerce al sistema Airvana per la vendita di crediti CO₂ e prodotti agricoli.

## 🗂️ Struttura File

```
BackEnd/app/marketplace/
├── __init__.py          # Inizializzazione modulo
├── models.py            # Modelli SQLAlchemy (database)
├── schema.py            # Schema Pydantic (validazione)
├── api_market.py        # Route API REST
├── market_schema.sql    # Schema SQL per database
├── API.md              # Documentazione API
└── README.md           # Questo file
```

## 🚀 Setup Iniziale

### 1. Eseguire lo Schema SQL

Prima di tutto, crea le tabelle del marketplace nel database PostgreSQL:

```bash
# Da PowerShell/CMD nella directory del progetto
psql -U postgres -d co2app -f BackEnd/app/marketplace/market_schema.sql
```

Questo comando creerà:
- ✅ 7 tabelle (categories, products, carts, cart_items, orders, order_items, reviews)
- ✅ Indici per performance
- ✅ Trigger per timestamp automatici
- ✅ Dati di esempio per le categorie

### 2. Verificare l'Installazione

Controlla che le tabelle siano state create correttamente:

```sql
-- Connettiti al database
psql -U postgres -d co2app

-- Lista le tabelle del marketplace
\dt marketplace_*

-- Verifica le categorie di esempio
SELECT * FROM marketplace_categories;
```

### 3. Avviare il Server

```bash
# Dalla directory BackEnd
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## 📡 API Disponibili

Tutte le API sono prefissate con `/marketplace`

### Categorie
- `GET /marketplace/categories` - Lista categorie

### Prodotti
- `GET /marketplace/products` - Lista prodotti (con filtri)
- `GET /marketplace/products/{id}` - Dettaglio prodotto
- `POST /marketplace/products` - Crea prodotto (auth richiesta)
- `PUT /marketplace/products/{id}` - Aggiorna prodotto (auth richiesta)
- `DELETE /marketplace/products/{id}` - Elimina prodotto (auth richiesta)

### Carrello
- `GET /marketplace/cart` - Ottieni carrello (auth richiesta)
- `POST /marketplace/cart/items` - Aggiungi al carrello (auth richiesta)
- `PUT /marketplace/cart/items/{id}` - Aggiorna quantità (auth richiesta)
- `DELETE /marketplace/cart/items/{id}` - Rimuovi dal carrello (auth richiesta)

### Ordini
- `GET /marketplace/orders` - Lista ordini (auth richiesta)
- `GET /marketplace/orders/{id}` - Dettaglio ordine (auth richiesta)
- `POST /marketplace/orders` - Crea ordine (auth richiesta)
- `PUT /marketplace/orders/{id}/status` - Aggiorna status (auth richiesta)

### Recensioni
- `GET /marketplace/products/{id}/reviews` - Recensioni prodotto
- `POST /marketplace/products/{id}/reviews` - Crea recensione (auth richiesta)

## 🧪 Test API

### 1. Visualizza Categorie
```bash
curl http://localhost:8000/marketplace/categories
```

### 2. Crea un Prodotto (richiede autenticazione)
```bash
curl -X POST http://localhost:8000/marketplace/products \
  -H "Content-Type: application/json" \
  -H "Cookie: access_token=YOUR_TOKEN" \
  -d '{
    "name": "Vigneto Toscano",
    "description": "Vigneto biologico certificato",
    "price": 89.00,
    "quantity": 10,
    "unit": "crediti",
    "category_id": 1,
    "images": ["https://example.com/image.jpg"]
  }'
```

### 3. Aggiungi al Carrello
```bash
curl -X POST http://localhost:8000/marketplace/cart/items \
  -H "Content-Type: application/json" \
  -H "Cookie: access_token=YOUR_TOKEN" \
  -d '{
    "product_id": 1,
    "quantity": 2
  }'
```

### 4. Crea Ordine
```bash
curl -X POST http://localhost:8000/marketplace/orders \
  -H "Content-Type: application/json" \
  -H "Cookie: access_token=YOUR_TOKEN" \
  -d '{
    "items": [{"product_id": 1, "quantity": 2}],
    "shipping_address": "Via Roma 123, Milano",
    "payment_method": "carta",
    "notes": "Consegna in orario di lavoro"
  }'
```

## 🔐 Autenticazione

La maggior parte degli endpoint richiede autenticazione. Il sistema usa JWT token salvati nei cookie.

Per testare con autenticazione:
1. Fai login tramite `/login`
2. Il token verrà salvato automaticamente nei cookie
3. Le richieste successive includeranno automaticamente il token

## 📊 Modello Dati

### Prodotto
```python
{
  "id": 1,
  "name": "Vigneto Toscano",
  "description": "Vigneto biologico",
  "price": 89.00,
  "quantity": 10,
  "unit": "crediti",
  "category_id": 1,
  "seller_id": 5,
  "images": ["url1", "url2"],
  "is_active": true
}
```

### Ordine
```python
{
  "id": 1,
  "buyer_id": 3,
  "total_amount": 178.00,
  "status": "pending",
  "shipping_address": "Via Roma 123",
  "payment_method": "carta",
  "items": [
    {
      "product_id": 1,
      "quantity": 2,
      "unit_price": 89.00,
      "subtotal": 178.00
    }
  ]
}
```

## 🎨 Frontend

Il frontend React è già configurato in `airvana-marketplace/`

Per far funzionare il frontend con il backend:

1. **Build del frontend:**
```bash
cd airvana-marketplace
npm install
npm run build
```

2. **I file statici verranno serviti automaticamente** da FastAPI su:
   - http://localhost:8000/marketplace

3. **Configurazione già presente in main.py:**
```python
app.mount("/marketplace", StaticFiles(directory="airvana-marketplace/dist"), name="marketplace")
```

## 🔧 Troubleshooting

### Errore: Tabelle non trovate
```
Esegui: psql -U postgres -d co2app -f BackEnd/app/marketplace/market_schema.sql
```

### Errore: Import non funziona
```
Verifica che __init__.py esista in BackEnd/app/marketplace/
```

### Errore: 401 Unauthorized
```
Assicurati di essere autenticato. Fai login prima di usare le API protette.
```

### Errore: Prodotto non disponibile
```
Controlla che quantity > 0 e is_active = true
```

## 📝 Prossimi Step

1. ✅ Eseguire market_schema.sql
2. ✅ Testare le API base
3. ⬜ Aggiungere prodotti di esempio
4. ⬜ Collegare il frontend React
5. ⬜ Implementare sistema di pagamento
6. ⬜ Aggiungere notifiche email

## 🤝 Contribuire

Per aggiungere nuove funzionalità:
1. Modifica `models.py` per nuovi modelli
2. Aggiorna `schema.py` per validazione
3. Implementa route in `api_market.py`
4. Aggiorna `market_schema.sql` se necessario
5. Documenta in `API.md`

## 📚 Documentazione Completa

Vedi [API.md](./API.md) per la documentazione completa delle API.
