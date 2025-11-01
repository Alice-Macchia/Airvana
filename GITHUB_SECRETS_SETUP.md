# 🔐 Setup GitHub Secrets per GitHub Actions

## Problema Risolto

Il workflow GitHub Actions falliva con l'errore:
```
TypeError: int() argument must be a string, a bytes-like object or a real number, not 'NoneType'
```

Questo perché mancavano le variabili d'ambiente necessarie per la connessione al database.

## ✅ Modifiche Effettuate

### 1. `co2_o2_calculator.py`
- ✅ Implementata connessione "lazy" al database
- ✅ La connessione viene creata solo quando serve, non all'import
- ✅ Gestione errori se le variabili d'ambiente mancano

### 2. `.github/workflows/scheduler.yml`
- ✅ Aggiunte tutte le variabili d'ambiente necessarie nel workflow

## 📋 Secrets da Configurare su GitHub

Devi aggiungere i seguenti secrets nel repository GitHub:

### Come Aggiungere i Secrets:
1. Vai su GitHub: `https://github.com/TUO_USERNAME/Airvana-clone`
2. Vai su **Settings** → **Secrets and variables** → **Actions**
3. Click su **New repository secret**
4. Aggiungi questi secrets uno per uno:

### Lista Secrets Necessari:

| Nome Secret | Descrizione | Esempio |
|-------------|-------------|---------|
| `DATABASE_URL` | URL async del database PostgreSQL | `postgresql+asyncpg://user:pass@host:5432/dbname` |
| `DATABASE_URL_SYNC` | URL sync del database PostgreSQL | `postgresql://user:pass@host:5432/dbname` |
| `DB_HOST` | Host del database | `localhost` o IP server |
| `DB_USER` | Username database | `postgres` |
| `DB_PASS` | Password database | `your_password` |
| `DB_NAME` | Nome database | `co2app` |
| `DB_PORT` | Porta database | `5432` |
| `OPENWEATHER_API_KEY` | API Key OpenWeather | `your_api_key_here` |

### 🔍 Come Trovare i Valori

I valori si trovano nel tuo file `.env` locale:

```bash
# Visualizza il contenuto del .env (da PowerShell/CMD)
type .env

# oppure aprilo con un editor
notepad .env
```

## ⚠️ IMPORTANTE - Sicurezza

- ❌ **NON committare mai il file `.env`** nel repository
- ✅ Il file `.env` è già nel `.gitignore`
- ✅ I secrets di GitHub sono criptati e sicuri
- ✅ Solo i maintainer del repo possono vedere i secrets

## 🧪 Test del Workflow

Dopo aver configurato tutti i secrets:

### 1. Test Manuale
Vai su GitHub → **Actions** → **Scheduler CO2-O2** → **Run workflow**

### 2. Verifica Logs
Controlla i logs per vedere se l'esecuzione è andata a buon fine:
- ✅ Verde = Successo
- ❌ Rosso = Errore (controlla i logs per dettagli)

## 📅 Esecuzione Automatica

Il workflow è configurato per eseguirsi automaticamente:
- **Ogni giorno alle 00:00 UTC** (02:00 ora italiana)
- Può essere eseguito manualmente quando serve

## 🐛 Troubleshooting

### Errore: "DATABASE_URL non configurato"
```
✅ Soluzione: Aggiungi il secret DATABASE_URL su GitHub
```

### Errore: "DB_PORT non configurato"
```
✅ Soluzione: Aggiungi il secret DB_PORT su GitHub (valore: 5432)
```

### Errore: "Connection refused"
```
✅ Verifica che:
   - Il database sia accessibile dall'esterno (firewall)
   - DB_HOST sia l'IP pubblico, non localhost
   - La porta sia aperta (5432)
```

### Il workflow non si avvia automaticamente
```
✅ Verifica che:
   - Il workflow sia abilitato (Actions → Scheduler CO2-O2 → Enable)
   - Il cron sia corretto (attualmente: '0 0 * * *')
```

## 📝 Verifica Configurazione

Dopo aver aggiunto tutti i secrets, puoi verificare che siano stati configurati:

1. Vai su **Settings** → **Secrets and variables** → **Actions**
2. Dovresti vedere tutti gli 8 secrets elencati sopra
3. ⚠️ Non puoi vedere i valori (per sicurezza), solo i nomi

## ✅ Checklist

- [ ] Aggiunti tutti gli 8 secrets su GitHub
- [ ] File `.env` NON committato nel repository
- [ ] Verificato che `.gitignore` contiene `.env`
- [ ] Testato il workflow manualmente
- [ ] Workflow completato con successo (verde)
- [ ] Database accessibile dall'esterno (se necessario)

## 🔗 Link Utili

- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [PostgreSQL Connection Strings](https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING)
- [Cron Expression Generator](https://crontab.guru/)
