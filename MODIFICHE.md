# 📋 Piano di Lavoro e Refactoring Airvana

Ciao Team!

Questo documento elenca le prossime modifiche da apportare al progetto. È organizzato per priorità.

**AGGIORNAMENTO (03/11/2025):** Ho controllato lo stato dello Sprint 1. Ecco il riassunto:

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

### ❌ 4. Aggiungere Docstring alle Funzioni Principali (DA FARE)
*   **Stato**: **NON COMPLETATO**. Come sospettavi, mancano ancora molte docstring.
*   **Cosa fare**: Aggiungere una spiegazione (`"""..."""`) alle funzioni che ne sono sprovviste, specialmente in:
    *   `co2_o2_calculator.py`
    *   `utils.py`
    *   `main.py` (alcune funzioni)
*   **Priorità**: Media. Facciamolo dopo aver corretto il bug del `user_id`.

---

## 🚀 Sprint 2: Prossimi Passi (Confermati)

Questi task rimangono validi e sono da affrontare dopo aver completato lo Sprint 1.

### 5. Audit e Correzione SQL Injection (Priorità: CRITICA)
*   **Perché è un problema?** È la falla di sicurezza più grave. Query SQL costruite con f-string sono vulnerabili ad attacchi che possono leggere o cancellare l'intero database.
*   **Cosa fare?**
    1.  Cercare tutte le query al database costruite con stringhe formattate.
    2.  Convertirle per usare l'ORM di SQLAlchemy in modo parametrizzato, che è sicuro di default.
*   **Tempo stimato**: 3-4 ore.

### 6. Implementare Cache per l'API Meteo (Priorità: ALTA)
*   **Perché è un problema?** Supereremo rapidamente il limite di chiamate gratuite dell'API meteo, bloccando una funzionalità chiave dell'app.
*   **Cosa fare?** Creare un meccanismo di cache semplice: prima di chiamare l'API, controllare se abbiamo già un dato recente (es. < 12 ore) per quella località in una tabella del nostro database. Se sì, usare quello. Altrimenti, chiamare l'API e salvare il risultato.
*   **Tempo stimato**: 2 giorni.

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
