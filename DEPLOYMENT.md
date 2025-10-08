# 🚀 Istruzioni Deploy Airvana

## Setup Server DigitalOcean

### 1. Crea file .env
```bash
cp .env.example .env
nano .env
```

### 2. Inserisci i valori (da WhatsApp):
- `GOOGLE_CLIENT_ID=...`
- `GOOGLE_CLIENT_SECRET=...` 
- `SECRET_KEY=...`
- `DATABASE_URL=...`

### 3. Deploy
```bash
git pull origin main
docker-compose down
docker-compose up --build -d
```

### 4. Controlla
```bash
docker ps
```

**Importante:** Non committare mai il file `.env`!