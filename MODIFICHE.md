# 📋 Piano di Lavoro e Refactoring Airvana

Ciao Team!

Questo documento elenca le prossime modifiche da apportare al progetto. È organizzato per priorità.

---

## 🎯 Sprint 1: Obiettivi Immediati (Revisione)

### ✅ 1. Rimuovere `print` di debug dal Backend (FATTO)
*   **Stato**: **COMPLETATO**. Non ci sono più `print()` nel codice del backend. Ottimo lavoro!

### ✅ 2. Migliorare l'Error Handling (FATTO)
*   **Stato**: **COMPLETATO**. Il codice usa `try...except` in molti punti critici, rendendo l'app più robusta.

### 3. Estrarre Costanti Hardcoded (FATTO)
*   **Stato**: **COMPLETATO** (03/11/2025).
*   ✅ **BUG CRITICO RISOLTO**: Nel file `BackEnd/app/routes.py` alla riga 840, la funzione `save_plot` salvava i terreni con `user_id=41` fisso. **Ora usa correttamente l'ID dell'utente autenticato dal token JWT.**
*   **Cosa è stato fatto**: Sostituito `user_id=41` con `user_id=user["id"]` dove `user` viene ottenuto tramite `Depends(get_current_user)` che estrae l'utente dal token JWT.

### ✅ 4. Aggiungere Docstring alle Funzioni Principali (FATTO)
*   **Stato**: **COMPLETATO**. Aggiunte docstring a tutte le funzioni principali in `co2_o2_calculator.py`, `utils.py`, e `main.py`.

---

## 🚀 Sprint 2: Prossimi Passi (Confermati)

Questi task rimangono validi e sono da affrontare dopo aver completato lo Sprint 1.

### ✅ 5. Audit e Correzione SQL Injection (FATTO)
*   **Stato**: **COMPLETATO**.
*   **Cosa è stato fatto**: Ho analizzato il codice del backend alla ricerca di possibili vulnerabilità di SQL injection. La ricerca si è concentrata su query costruite con f-string o altre concatenazioni di stringhe. Le query trovate, che usano la funzione `text()` di SQLAlchemy, sono già parametrizzate e quindi sicure. Non sono state trovate altre query vulnerabili. Il codice è risultato sicuro da questo punto di vista.

### ✅ 6. Implementare Cache per l'API Meteo (FATTO)
*   **Stato**: **COMPLETATO**.
*   **Cosa è stato fatto**: Ho modificato la funzione `fetch_and_save_weather_day` in `get_meteo.py` per implementare una cache di 12 ore. Prima di effettuare una chiamata all'API di Open-Meteo, la funzione controlla l'timestamp dell'ultimo dato meteo salvato per il terreno. Se il dato è più recente di 12 ore, la chiamata API viene saltata, riducendo il numero di richieste e prevenendo il superamento dei limiti del piano gratuito.

---

## 📚 Piano a Lungo Termine (Da discutere insieme)

Questi sono i grandi progetti per il futuro, che richiederanno più pianificazione.

*   **Unificazione del Frontend in React**
    *   **Obiettivo**: Eliminare la frammentazione tra pagine in HTML/JS e React per avere un'unica codebase, più facile da manutenere e sviluppare.
    *   **Prossimo passo**: Iniziare a migrare la pagina di Login.

*   **Creazione di una Suite di Test Automatici**
    *   **Obiettivo**: Scrivere test che verifichino le funzionalità critiche. Questo ci darà la sicurezza di poter modificare il codice senza rompere nulla.
    *   **Prossimo passo**: Scrivere un primo test per la funzione di calcolo della CO2.

*   **Setup di un Sistema di Monitoring**
    *   **Obiettivo**: Essere avvisati automaticamente se l'applicazione ha un errore in produzione, senza aspettare la segnalazione di un utente.
    *   **Prossimo passo**: Integrare un servizio base come Sentry (ha un piano gratuito).

---
