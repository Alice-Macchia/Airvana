Questo README.md spiega come installare dipendenze e avviare correttamente il server 
di medusa.js
Per configurarlo correttamente nel tuo sistema segui scrupolosamente tutti i passaggi.


# 🧠 Avvio progetto Medusa Store

Questo progetto è un'istanza Medusa.js pronta all'uso.  
Gira sulla porta `9000` ed è connessa a un database PostgreSQL remoto
Può essere usata come backend per uno storefront o come base per personalizzazioni.

---

## 📦 Requisiti

- Node.js v20
- PowerShell (su Windows) o terminale bash su Linux/macOS  
- Accesso a PostgreSQL su `165.22.75.145:15432`  
- Redis (opzionale in dev, verrà emulato)

---

## 🚀 Setup rapido


Il file .env deve essere già presente.
Verifica che questa variabile punti al database corretto:

medusa-store/.env

DATABASE_URL=postgresql://postgres:airvana@165.22.75.145:15432/medusa_db


Vai con cd sulla cartella medusa-store\airvana-store e installa le dipendenze
cd C:\Users\TUONOME\Desktop\Airvana-main\medusa-store\airvana-store
cd C:\Users\Lorenzo\Desktop\APP\AIRVANA\Airvana-main\medusa-store\airvana_store
Installa le dipendenze

bash
npm install


Avvia il backend
npx medusa develop

# PER ENTRARE ---------------------------------  LOGIN ADMIN 
## {email: admin@airvana.com, password: airvana}

## AVVIARE IL SERVER MEDUSA con npx medusa develop

Apri powershell (amministratore):
poi vai alla directory di installazione del progetto:

es. la mia
cd C:\Users\Lorenzo\Desktop\APP\AIRVANA\Airvana-main\medusa-store\airvana_store
npx medusa develop
## LANCIA MEDUSA
info:    Admin URL → http://localhost:9000/app



L’API sarà disponibile su:
http://localhost:9000/store/products



📂 Struttura
medusa-store/

Backend Medusa.js

Connesso a medusa_db su PostgreSQL remoto

Gira su porta 9000

✅ Test API
Esegui questa chiamata per testare che Medusa risponda:


curl http://localhost:9000/store/products
Dovresti ricevere una lista (vuota se non ci sono prodotti).

💡 Note
Redis viene emulato se non presente in locale

L’interfaccia admin e lo storefront sono separati

Puoi usare psql per ispezionare il DB, oppure PgAdmin

🔐 Credenziali
Per ora il superutente PostgreSQL è:


user: postgres
pass: airvana



# 🌀 Setup e Avvio Frontend

Fatto questo hai avviato correttamente il backend Medusa.js.
che ti da accesso all'area admin dove puoi gestire i tuoi prodotti, i tuoi clienti, le tue vendite, ecc.
le modifiche verranno replicate AUTOMATICAMENTE nel frontend.
Ora per usare il frontend devi installare i pacchetti necessari:

---

## 🚀 Avvio del Frontend

### 🔧 Backend – Medusa API + Admin

Prima di avviare il frontend, è **necessario avviare il backend Medusa** per garantire che le API siano attive e i dati siano disponibili.

1. avvia il backend Medusa:
    come mostrato nei punti precedenti.

🎨 Frontend – Store pubblico (Next.js)
Vai nella cartella del frontend:

partendo da \medusa-store
cd airvana_store-storefront
Installa le dipendenze (solo la prima volta):


# npm install



Avvia il frontend:

# npm run dev
Il frontend sarà visibile su http://localhost:8000.

# 🔗 Configurazioni importanti
.env.local (dentro airvana_store-storefront)
Assicurati che questo file esista e contenga la configurazione corretta per il backend Medusa:

NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9000


medusa-config.js (dentro airvana_store)
# Nel backend, verifica che la configurazione CORS sia corretta:


projectConfig: {
  store_cors: "http://localhost:8000",
  admin_cors: "http://localhost:9000",
}




IMPORTANTE: C'è un errore token che è stato forzato da me per generare la chiave
perciò andrà sistemata, non create un nuovo user usate quello già esistente



🧠 Cosa potete fare sul backend di Medusa
Ciao team! 👋
Il backend Medusa è pronto e funzionante, collegato a un database PostgreSQL.

🎛️ Interfaccia Admin → http://localhost:9000/app


Accedete con queste credenziali:
Email: admin@airvana.com
Password: airvana

Qui potete:
✅ Creare e gestire prodotti
👥 Gestire utenti e ordini
🏷️ Aggiungere regioni, tasse, metodi di pagamento (come Stripe)
📦 Controllare lo stock, i prezzi e la disponibilità
🛍️ Storefront pubblico → http://localhost:8000


È il sito e-commerce pubblico (Next.js) collegato a Medusa.
Ogni modifica fatta nell’admin viene riflessa qui, ad esempio:

Se aggiungete un prodotto nell’admin → appare nel catalogo
Se create una regione con una valuta → il prezzo si adatta

⚠️ Cosa aspettarsi
Il sistema è attivo in locale, non ancora in produzione
È connesso a un PostgreSQL remoto, quindi i dati sono persistenti
Stiamo lavorando per integrare autenticazione Keycloak con ruoli come:

AVVIO DEI KEYCLOAK(CON DOCKER):

docker run -p 8080:8080 -e KEYCLOAK_ADMIN=admin -e KEYCLOAK_ADMIN_PASSWORD=admin quay.io/keycloak/keycloak:24.0.3 start-dev


- Agronomo forestale

- Agricoltore

- Azienda compratrice





## --------------------STARTER CODE-----------------------------------------------------------

# RECAP

# Installa le dipendenze  BACKEND    ---> cambia la directory con quella reale locale
cd C:\Users\TUONOME\Desktop\Airvana-main\medusa-store\airvana-store
npm install
npx medusa develop


# Installa le dipendenze  FRONTEND    ---> cambia la directory con quella reale locale

cd C:\Users\TUONOME\Desktop\Airvana-main\medusa-store\airvana-store\airvana_store-storefront
Installa le dipendenze (solo la prima volta):
npm install
npm run dev


# STARTING  (esempio)

backend
cd C:\Users\Lorenzo\Desktop\APP\AIRVANA\Airvana-main\medusa-store\airvana_store
npx medusa develop



frontend
cd C:\Users\Lorenzo\Desktop\APP\AIRVANA\Airvana-main\medusa-store\airvana_store-storefront
npm run dev
