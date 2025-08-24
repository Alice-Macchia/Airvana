// Test di caricamento JavaScript
alert('JavaScript caricato correttamente!');

// Variabile per lo stato di registrazione e per i dati di localizzazione
let isRegistering = false;
let currentView = 'login'; // 'login', 'registerChoice', 'registerUser', 'registerCompany'
let locationData = {};
let currentDropdownFocusIndex = -1; // Indice per la navigazione da tastiera nella dropdown attiva

// Definizioni SVG per le icone mostra/nascondi password
const showPasswordSVG = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
const hidePasswordSVG = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';

/**
 * Carica i dati di province e comuni dal file JSON.
 * In caso di errore, imposta un fallback e avvisa l'utente.
 */
async function loadLocationData() {
    try {
        const response = await fetch('static/province_comuni.json');
        if (!response.ok) {
            throw new Error(`Errore HTTP: ${response.status} ${response.statusText}`);
        }
        locationData = await response.json();
        // Rimuove una potenziale chiave vuota dai dati caricati
        if (locationData.hasOwnProperty("")) {
            delete locationData[""];
        }
        console.log("Dati di localizzazione caricati.");
    }
    catch (error) {
        console.error("Errore nel caricamento del file JSON Province_Comuni:", error);
        locationData = {"Italia": ["Dato non disponibile"]};
        // Utilizzo di un messaggio personalizzato invece di alert()
        showMessage("Non è stato possibile caricare i dati di province e comuni. Alcune funzionalità potrebbero non essere disponibili.");
    }
}

/**
 * Mostra un messaggio all'utente.
 * @param {string} message - Il messaggio da visualizzare.
 */
function showMessage(message) {
    const messageBox = document.createElement('div');
    messageBox.classList.add('message-box');
    messageBox.innerHTML = `
        <p>${message}</p>
        <button class="message-box-close">OK</button>
    `;
    document.body.appendChild(messageBox);

    messageBox.querySelector('.message-box-close').addEventListener('click', () => {
        document.body.removeChild(messageBox);
    });
}

/**
 * Aggiorna la visualizzazione del container di autenticazione e del wrapper dei form di registrazione.
 */
function updateAuthContainerView() {
    const container = document.getElementById('authContainer');
    const registerContent = document.getElementById('registerContent');
    const registerPanelWrapper = document.getElementById('registerPanelWrapper');

    // Reset delle classi principali del container
    container.classList.remove('shifted');

    // Reset delle classi del wrapper dei pannelli di registrazione
    registerPanelWrapper.classList.remove('show-choice', 'show-user-form', 'show-company-form', 'show-agro-form');

    if (currentView === 'login') {
        // Nessuna classe 'shifted' per il login
        registerContent.innerHTML = `
            <h2>Iscriviti</h2>
            <p>Per accedere all'area riservata del portale occorre registrarsi qui:</p>
            <button class="btn-register" id="toggleRegisterButton">Registrati!</button>
        `;
    document.getElementById('toggleRegisterButton')
        ?.addEventListener('click', toggleAuthView);
    } else if (currentView === 'registerChoice') {
        container.classList.add('shifted'); // Attiva lo shift principale
        registerPanelWrapper.classList.add('show-choice'); // Mostra la scelta nel wrapper
        registerContent.innerHTML = `
            <h2>Benvenuto</h2>
            <p>Se hai già un account, puoi accedere direttamente utilizzando i tuoi dati:</p>
            <button class="btn-register" id="toggleRegisterButton">Accedi</button>
        `;
    document.getElementById('toggleRegisterButton')
        ?.addEventListener('click', toggleAuthView);
    } else if (currentView === 'registerUser') {
        container.classList.add('shifted'); // Mantieni lo shift principale
        registerPanelWrapper.classList.add('show-user-form'); // Mostra il form utente nel wrapper
        registerContent.innerHTML = `
            <h2>Benvenuto</h2>
            <p>Se hai già un account, puoi accedere direttamente utilizzando i tuoi dati:</p>
            <button class="btn-register" id="toggleRegisterButton">Accedi</button>
        `;
    document.getElementById('toggleRegisterButton')
        ?.addEventListener('click', toggleAuthView);
    } else if (currentView === 'registerCompany') {
        container.classList.add('shifted'); // Mantieni lo shift principale
        registerPanelWrapper.classList.add('show-company-form'); // Mostra il form azienda nel wrapper
        registerContent.innerHTML = `
            <h2>Benvenuto</h2>
            <p>Se hai già un account, puoi accedere direttamente utilizzando i tuoi dati:</p>
            <button class="btn-register" id="toggleRegisterButton">Accedi</button>
        `;
    document.getElementById('toggleRegisterButton')
        ?.addEventListener('click', toggleAuthView);
    } else if (currentView === 'registerAgro') {
        container.classList.add('shifted'); // Mantieni lo shift principale
        registerPanelWrapper.classList.add('show-agro-form'); // Mostra il form agronomo nel wrapper
        registerContent.innerHTML = `
            <h2>Benvenuto</h2>
            <p>Se hai già un account, puoi accedere direttamente utilizzando i tuoi dati:</p>
            <button class="btn-register" id="toggleRegisterButton">Accedi</button>
    `;
    
    // Ri-assegna l'event listener al nuovo bottone creato dinamicamente
    //document.getElementById('toggleRegisterButton').addEventListener('click', toggleAuthView);
    document.getElementById('toggleRegisterButton')
        ?.addEventListener('click', toggleAuthView);
    }
}
/**
 * Gestisce il cambio di visualizzazione tra form di login e registrazione.
 */
function toggleAuthView() {
    isRegistering = !isRegistering;

    if (isRegistering) {
        currentView = 'registerChoice'; // Passa alla scelta del tipo di registrazione
    } else {
        currentView = 'login'; // Torna al login
    }
    updateAuthContainerView();
}

/**
 * Funzioni per mostrare i form specifici di registrazione.
 */
function showUserRegistrationForm() {
    currentView = 'registerUser';
    updateAuthContainerView();
}

function showCompanyRegistrationForm() {
    currentView = 'registerCompany';
    updateAuthContainerView();
}

function showAgroRegistrationForm() {
    currentView = 'registerAgro';
    updateAuthContainerView();
}

/**
 * Funzioni per tornare alla scelta del tipo di registrazione.
 */
function backToRegisterChoice() {
    currentView = 'registerChoice';
    updateAuthContainerView();
}

/**
 * Evidenzia un item nella dropdown per la navigazione da tastiera.
 * @param {HTMLElement} dropdownElement - L'elemento della dropdown.
 */
function highlightDropdownItem(dropdownElement) {
    const items = dropdownElement.getElementsByClassName('custom-dropdown-item');
    if (!items.length) return;

    // Rimuove l'highlight da tutti gli item
    for (let i = 0; i < items.length; i++) {
        items[i].classList.remove('highlighted');
    }

    // Gestisce i limiti dell'indice
    if (currentDropdownFocusIndex >= items.length) currentDropdownFocusIndex = 0;
    if (currentDropdownFocusIndex < 0) currentDropdownFocusIndex = items.length - 1;

    // Aggiunge l'highlight all'item corrente e lo scrolla in vista
    if (items[currentDropdownFocusIndex]) {
        items[currentDropdownFocusIndex].classList.add('highlighted');
        // scrollIntoView per assicurare che l'item sia visibile
        items[currentDropdownFocusIndex].scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
}

/**
 * Crea un elemento (item) per la dropdown.
 * @param {string} item - Il testo dell'item.
 * @param {HTMLElement} inputElement - L'elemento input associato.
 * @param {HTMLElement} dropdownElement - L'elemento dropdown.
 * @param {Function} onSelectItemCallback - La funzione da chiamare quando un item è selezionato.
 * @returns {HTMLElement} L'elemento div creato per l'item.
 */
function createDropdownItem(item, inputElement, dropdownElement, onSelectItemCallback) {
    const itemDiv = document.createElement('div');
    itemDiv.classList.add('custom-dropdown-item');
    itemDiv.textContent = item;

    // Usa 'mousedown' per gestire la selezione prima che l'input perda il focus (evento 'blur')
    itemDiv.addEventListener('mousedown', (event) => {
        event.preventDefault(); // Previene la perdita di focus dall'input
        onSelectItemCallback(item); // Esegue la funzione di callback per la selezione
        hideCustomDropdown(dropdownElement);
        currentDropdownFocusIndex = -1; // Resetta l'indice di focus della tastiera
    });
    return itemDiv;
}

/**
 * Popola una dropdown personalizzata con dati filtrati.
 * Mostra la dropdown solo se c'è input e ci sono risultati.
 */
function populateCustomDropdown(inputElement, dropdownElement, dataArray, onSelectItemCallback) {
    dropdownElement.innerHTML = '';
    const inputValue = inputElement.value.toLowerCase().trim();
    currentDropdownFocusIndex = -1; // Resetta l'indice ad ogni ripopolamento

    if (!Array.isArray(dataArray)) {
         console.warn("populateCustomDropdown: dataArray non è un array.", dataArray);
         hideCustomDropdown(dropdownElement);
         return;
    }

    // Filtra i dati solo se l'utente ha digitato qualcosa
    if (inputValue.length > 0) {
        const filteredData = dataArray.filter(item =>
            typeof item === 'string' && item.toLowerCase().startsWith(inputValue) // Filtro "inizia con"
        );

        if (filteredData.length > 0) {
            // Mostra al massimo 10 risultati per migliorare performance e UX
            filteredData.slice(0, 10).forEach(item => {
                dropdownElement.appendChild(createDropdownItem(item, inputElement, dropdownElement, onSelectItemCallback));
            });
            dropdownElement.classList.add('active'); // Mostra la dropdown
        } else {
            hideCustomDropdown(dropdownElement); // Nascondi se non ci sono risultati filtrati
        }
    } else {
        hideCustomDropdown(dropdownElement); // Nascondi se l'input è vuoto
    }
}

/**
 * Nasconde una dropdown personalizzata e resetta l'indice di navigazione.
 */
function hideCustomDropdown(dropdownElement) {
    if (dropdownElement) {
        dropdownElement.classList.remove('active');
    }
    currentDropdownFocusIndex = -1; // Resetta l'indice quando la dropdown si nasconde
}

/**
 * Aggiorna la dropdown delle province in base all'input dell'utente.
 * Gestisce l'abilitazione/disabilitazione del campo città.
 * @param {string} provinceInputId - ID dell'input provincia.
 * @param {string} provinceDropdownId - ID della dropdown provincia.
 * @param {string} cityInputId - ID dell'input città.
 * @param {string} cityDropdownId - ID della dropdown città.
 */
function updateLocationDropdowns(provinceInputId, provinceDropdownId, cityInputId, cityDropdownId) {
    const provinceInput = document.getElementById(provinceInputId);
    const cityInput = document.getElementById(cityInputId);
    const provinceDropdown = document.getElementById(provinceDropdownId);
    const cityDropdown = document.getElementById(cityDropdownId);

    if (!provinceInput || !cityInput || !provinceDropdown || !cityDropdown) {
        console.error(`Elementi non trovati per gli ID: ${provinceInputId}, ${cityInputId}, ${provinceDropdownId}, ${cityDropdownId}`);
        return;
    }

    if (Object.keys(locationData).length === 0) {
         console.warn("Dati di localizzazione non ancora caricati o vuoti per province.");
         hideCustomDropdown(provinceDropdown);
         return;
    }

    const provinceKeys = Object.keys(locationData).sort();
    populateCustomDropdown(provinceInput, provinceDropdown, provinceKeys, (selectedProvince) => {
        provinceInput.value = selectedProvince;
        cityInput.value = '';
        cityInput.disabled = false;
        cityInput.placeholder = "Digita e seleziona una città";
        hideCustomDropdown(provinceDropdown);
        cityDropdown.innerHTML = '';
    });

    if (!locationData[provinceInput.value]) {
        cityInput.value = '';
        cityInput.disabled = true;
        cityInput.placeholder = "Seleziona prima una provincia valida";
        hideCustomDropdown(cityDropdown);
        cityDropdown.innerHTML = '';
    }

    // Listener per la città
    const updateCityDropdown = () => {
        if (cityInput.disabled) {
            hideCustomDropdown(cityDropdown);
            return;
        }

        const selectedProvince = provinceInput.value;
        if (!locationData[selectedProvince]) {
            console.warn(`Nessuna città trovata per la provincia "${selectedProvince}" o provincia non valida.`);
            hideCustomDropdown(cityDropdown);
            return;
        }

        cityInput.placeholder = "Digita e seleziona una città";

        const citiesForProvince = locationData[selectedProvince] || [];
        populateCustomDropdown(cityInput, cityDropdown, citiesForProvince.sort(), (selectedCity) => {
            cityInput.value = selectedCity;
            hideCustomDropdown(cityDropdown);
        });
    };

    // Rimuovi i listener esistenti per evitare duplicati prima di aggiungerli
    cityInput.removeEventListener('input', updateCityDropdown);
    cityInput.addEventListener('input', updateCityDropdown);

    // Rimuovi i listener esistenti per evitare duplicati
    cityInput.removeEventListener('blur', () => {});
    cityInput.addEventListener('blur', () => setTimeout(() => {
         if (!cityDropdown.matches(':hover') &&
            (!document.activeElement || !document.activeElement.classList.contains('custom-dropdown-item'))) {
            hideCustomDropdown(cityDropdown);
        }
    }, 200));

    // Rimuovi i listener esistenti per evitare duplicati
    cityInput.removeEventListener('keydown', () => {});
    cityInput.addEventListener('keydown', (e) => handleDropdownKeyDown(e, cityInput, cityDropdown));
}


/**
 * Gestisce la navigazione da tastiera (frecce, Invio, Escape) per le dropdown.
 * @param {Event} event - L'evento keydown.
 * @param {HTMLElement} inputElement - L'elemento input associato alla dropdown.
 * @param {HTMLElement} dropdownElement - L'elemento della dropdown.
 */
function handleDropdownKeyDown(event, inputElement, dropdownElement) {
    // Prosegui solo se la dropdown è attiva (visibile)
    if (!dropdownElement.classList.contains('active')) return;

    const items = dropdownElement.getElementsByClassName('custom-dropdown-item');
    if (!items.length) return; // Nessun item nella dropdown

    switch (event.key) {
        case 'ArrowDown':
            event.preventDefault(); // Previene lo scroll della pagina
            currentDropdownFocusIndex++;
            highlightDropdownItem(dropdownElement);
            break;
        case 'ArrowUp':
            event.preventDefault(); // Previene lo scroll della pagina
            currentDropdownFocusIndex--;
            highlightDropdownItem(dropdownElement);
            break;
        case 'Enter':
            event.preventDefault();
            // Se un item è evidenziato, simula un mousedown per selezionarlo
            if (currentDropdownFocusIndex > -1 && items[currentDropdownFocusIndex]) {
                items[currentDropdownFocusIndex].dispatchEvent(new Event('mousedown'));
            }
            break;
        case 'Escape':
            event.preventDefault();
            hideCustomDropdown(dropdownElement); // Nascondi la dropdown
            break;
    }
}


/**
 * Alterna la visibilità di un campo password e la relativa icona.
 */
function togglePasswordVisibility(inputId, toggleId) {
    console.log('togglePasswordVisibility chiamata con:', inputId, toggleId); // Debug
    const passwordInput = document.getElementById(inputId);
    const toggleIcon = document.getElementById(toggleId);
    console.log('Elementi trovati:', { passwordInput, toggleIcon }); // Debug
    
    if (!passwordInput || !toggleIcon) {
        console.error('Elementi mancanti per togglePasswordVisibility'); // Debug
        return;
    }

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.innerHTML = showPasswordSVG;
        console.log('Password ora visibile'); // Debug
    } else {
        passwordInput.type = 'password';
        toggleIcon.innerHTML = hidePasswordSVG;
        console.log('Password ora nascosta'); // Debug
    }
}

/**
 * Gestisce la sottomissione dei form di login e registrazione.
 */
function handleFormSubmit(event) {
    event.preventDefault(); 
    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries()); 

    if (form.id === 'loginFormReal') {
        console.log('Tentativo di Login:', data);
        //chiamata alla request
        if (data.loginEmail && data.loginPassword) {
           const formData = new FormData();
           formData.append('loginEmail', data.loginEmail);
           formData.append('loginPassword', data.loginPassword);

          // console.log("Payload inviato a /register-person:", payload); 

            fetch('http://localhost:8000/login', {
                method: 'POST',
                body: formData,
                credentials: 'include',  // 🔑 ESSENZIALE per salvare i cookie!
            }).then(res => {
                if (!res.ok) throw new Error("Login fallito");
                    return res.json();
            })
            .then(data => {
                console.log(data.message);
                window.location.href = "/dashboard";
            })
            .catch(err => {
                console.error("Errore:", err);
            });

    // if (form.id === 'loginFormReal') {
    //     console.log('Tentativo di Login:', data);
    //     //chiamata alla request
    //     if (data.loginEmail && data.loginPassword) {
    //        const formData = new FormData();
    //        formData.append('loginEmail', data.loginEmail);
    //        formData.append('loginPassword', data.loginPassword);

    //         fetch('http://localhost:8000/login', {
    //             method: 'POST',
    //             body: formData,
    //         })
    //         .then(res => {
    //             if (res.ok) {
    //                 // ✅ Login riuscito: reindirizza a un'altra pagina
    //                 window.location.href = "/todashboard";  // oppure "/index", se hai quell’endpoint
    //             } else {
    //                 // ❌ Login fallito: mostra l'HTML di errore (opzionale)
    //                 return res.text().then(html => {
    //                     document.body.innerHTML = html;
    //                 });
    //             }
    //         })
    //         .catch(error => {
    //             console.error('Errore fetch login:', error);
    //             showMessage("Errore di connessione col server o credenziali non valide.");
    //         });
        } else {
            showMessage("Per favore, inserisci email e password.");
        }

   /* } else if (form.id === 'registerUserForm') {
        console.log('Tentativo di Registrazione Utente:', data);

        if (data.registerPassword !== data.registerConfermaPassword) {
            showMessage("Le password non corrispondono.");
            return;
        }

        const sessoChecked = document.querySelector('input[name="sesso"]:checked');
        if (!sessoChecked) {
            showMessage("Seleziona il sesso.");
            return;
        }
        data.sesso = sessoChecked.value;

        const selectedProvince = document.getElementById('province').value;
        const selectedCity = document.getElementById('city').value;

        if (!locationData[selectedProvince] || !locationData[selectedProvince].includes(selectedCity)) {
            showMessage("Provincia o Città non valide. Assicurati di selezionarle dalle liste suggerite dopo aver digitare.");
            return;
        }
        data.province = selectedProvince;
        data.city = selectedCity;

        delete data.provinceInput;
        delete data.cityInput;

        showMessage(`Registrazione Utente completata (simulata) con successo!\nNome: ${data.registerNome} ${data.registerCognome}\nEmail: ${data.registerEmail}\nSesso: ${data.sesso}\nTel: ${data.phonePrefix}${data.phoneNumber}\nIndirizzo: ${data.address}, ${data.city} (${data.province})`);
        // Qui andrebbe la vera logica di registrazione utente
    } else if (form.id === 'registerCompanyForm') {
        console.log('Tentativo di Registrazione Azienda:', data);

        if (data.companyPassword !== data.companyConfermaPassword) {
            showMessage("Le password non corrispondono.");
            return;
        }

        const selectedCompanyProvince = document.getElementById('companyProvince').value;
        const selectedCompanyCity = document.getElementById('companyCity').value;

        if (!locationData[selectedCompanyProvince] || !locationData[selectedCompanyProvince].includes(selectedCompanyCity)) {
            showMessage("Provincia o Città della sede legale non valide. Assicurati di selezionarle dalle liste suggerite dopo aver digitato.");
            return;
        }
        data.companyProvince = selectedCompanyProvince;
        data.companyCity = selectedCompanyCity;

        delete data.companyProvinceInput;
        delete data.companyCityInput;
        delete data.codFiscaleAzienda; // Rimuovi il campo Codice Fiscale Azienda

        showMessage(`Registrazione Azienda completata (simulata) con successo!\nRagione Sociale: ${data.companyName}\nPartita IVA: ${data.pIva}\nEmail: ${data.companyEmail}\nTel: ${data.companyPhonePrefix}${data.companyPhoneNumber}\nIndirizzo: ${data.companyAddress}, ${data.companyCity} (${data.companyProvince})`);
        // Qui andrebbe la vera logica di registrazione azienda
    }
}*/
    
} else if (form.id === 'registerUserForm') {
    console.log('Tentativo di Registrazione Utente:', data);

    if (data.registerPassword !== data.registerConfermaPassword) {
        showMessage("Le password non corrispondono.");
        return;
    }

    const selectedProvince = document.getElementById('province').value;
    const selectedCity = document.getElementById('city').value;

    if (!locationData[selectedProvince] || !locationData[selectedProvince].includes(selectedCity)) {
        showMessage("Provincia o Città non valide.");
        return;
    }
    data.province = selectedProvince;
    data.city = selectedCity;

    // Mappa i campi dal form a quelli del backend
    const payload = {
        user: {
        email: data.registerEmail,
        password: data.registerPassword,
        user_type: "farmer"
        },
        farmer: {
        username: data.registerUsername,
        first_name: data.registerNome,
        last_name: data.registerCognome,
        cod_fis: data.registerCodiceFiscale,
        farm_name: data.registerNomeAzienda || null,
        phone_number: data.phoneNumber,
        province: data.province,
        city: data.city,
        address: data.address
        }
    };

    // Chiamata fetch POST JSON
    fetch("http://127.0.0.1:8000/register-farmer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    })
    .then(res => {
        if (!res.ok) throw new Error("Registrazione fallita");
        return res.json();
    })
    .then(data => {
        showMessage("Registrazione completata con successo!");
        // opzionale: redirect o reset form
    })
    .catch(err => {
        showMessage("Errore durante la registrazione: " + err.message);
    });
  } else if (form.id === 'registerCompanyForm') {
    console.log('Tentativo di Registrazione Azienda:', data);

    if (data.companyPassword !== data.companyConfermaPassword) {
        showMessage("Le password non corrispondono.");
        return;
    }

    const selectedCompanyProvince = document.getElementById('companyProvince').value;
    const selectedCompanyCity = document.getElementById('companyCity').value;

    if (!locationData[selectedCompanyProvince] || !locationData[selectedCompanyProvince].includes(selectedCompanyCity)) {
        showMessage("Provincia o Città della sede legale non valide. Assicurati di selezionarle dalle liste suggerite.");
        return;
    }

    // Costruisci il payload con i nomi esatti che il backend aspetta
    const payload = {
        user: {
        email: data.companyEmail,
        password: data.companyPassword,
        user_type: "society"
        },
        society: {
            username: data.companyUsername,            // controlla che l'input abbia id="companyUsername"
            ragione_sociale: data.companyRagioneSociale,
            sede_legale: data.companyAddress,
            partita_iva: data.companyPIVA,
            province: selectedCompanyProvince,
            city: selectedCompanyCity
        }
    };

    fetch("http://localhost:8000/register-society", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    })
    .then(res => {
        if (!res.ok) throw new Error("Registrazione azienda fallita");
        return res.json();
    })
    .then(data => {
        showMessage("Registrazione azienda completata con successo!");
        // opzionale: redirect o reset form
    })
    .catch(err => {
        showMessage("Errore durante la registrazione azienda: " + err.message);
    });
} else if (form.id === 'registerAgroForm') {
    console.log('Tentativo di Registrazione Agronomo Forestale:', data);

    // Costruisci il payload con i nomi esatti che il backend aspetta
    const payload = {
        user: {
        email: data.agroEmail,
        password: data.agroPassword,
        user_type: "agronomist"
        },
        agronomist: {
            albo_number: data.agroNumeroAlbo,
            specialization: data.agroSpecializzazione || null
        }
    };
    console.log("Payload agronomo:", payload);
    fetch("http://localhost:8000/register-agronomist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    })
    .then(res => {
        if (!res.ok) throw new Error("Registrazione agronomo fallita");
        return res.json();
    })
    .then(data => {
        showMessage("Registrazione agronomo completata con successo!");
        // opzionale: redirect o reset form
    })
    .catch(err => {
        showMessage("Errore durante la registrazione agronomo: " + err.message);
    });

    
}
}

// Event listener che si attiva quando il DOM è completamente caricato e parsato.
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM completamente caricato!'); // Debug
    // Carica i dati di localizzazione prima di inizializzare gli altri componenti
    await loadLocationData();

    // Ottieni riferimenti ai form e ai bottoni
    const loginForm = document.getElementById('loginFormReal');
    const registerUserForm = document.getElementById('registerUserForm');
    const registerCompanyForm = document.getElementById('registerCompanyForm');
    const registerAgroForm = document.getElementById('registerAgroForm');

    // Aggiungi event listener per il submit dei form
    if (loginForm) loginForm.addEventListener('submit', handleFormSubmit);
    if (registerUserForm) registerUserForm.addEventListener('submit', handleFormSubmit);
    if (registerCompanyForm) registerCompanyForm.addEventListener('submit', handleFormSubmit);
    if (registerAgroForm) registerAgroForm.addEventListener('submit', handleFormSubmit);
    // Resetta i form all'avvio (opzionale, ma buona pratica)
    if (loginForm) loginForm.reset();
    if (registerUserForm) registerUserForm.reset();
    if (registerCompanyForm) registerCompanyForm.reset();
    if (registerAgroForm) registerAgroForm.reset();   
    // Gestione del bottone per alternare tra login e registrazione
    const toggleButton = document.getElementById('toggleRegisterButton');
    if (toggleButton) toggleButton.addEventListener('click', toggleAuthView);

    // Gestione dei bottoni di scelta del tipo di registrazione
    const registerAsUserButton = document.getElementById('registerAsUserButton');
    const registerAsCompanyButton = document.getElementById('registerAsCompanyButton');
    const registerAsAgroButton = document.getElementById('registerAsAgroButton');
    const backToRegisterToggle = document.getElementById('backToRegisterToggle'); // Questo torna al login
    const backToChoiceUser = document.getElementById('backToChoiceUser'); // Questo torna alla scelta utente/azienda
    const backToChoiceCompany = document.getElementById('backToChoiceCompany'); // Questo torna alla scelta utente/azienda
    const backToChoiceAgro = document.getElementById('backToChoiceAgro');

    if (registerAsUserButton) registerAsUserButton.addEventListener('click', showUserRegistrationForm);
    if (registerAsCompanyButton) registerAsCompanyButton.addEventListener('click', showCompanyRegistrationForm);
    if (registerAsAgroButton) registerAsAgroButton.addEventListener('click', showAgroRegistrationForm);
    if (backToRegisterToggle) backToRegisterToggle.addEventListener('click', toggleAuthView);
    if (backToChoiceUser) backToChoiceUser.addEventListener('click', backToRegisterChoice);
    if (backToChoiceCompany) backToChoiceCompany.addEventListener('click', backToRegisterChoice);
    if (backToChoiceAgro) backToChoiceAgro.addEventListener('click', backToRegisterChoice);

    // Gestione della visibilità delle password per il form di login
    const toggleLoginPasswordEl = document.getElementById('toggleLoginPassword');
    console.log('Elemento toggleLoginPassword trovato:', toggleLoginPasswordEl); // Debug
    if (toggleLoginPasswordEl) {
        toggleLoginPasswordEl.innerHTML = hidePasswordSVG;
        console.log('Icona impostata per toggleLoginPassword'); // Debug
        toggleLoginPasswordEl.addEventListener('click', () => {
            console.log('Click su toggleLoginPassword!'); // Debug
            togglePasswordVisibility('loginPassword', 'toggleLoginPassword');
        });
        console.log('Event listener aggiunto per toggleLoginPassword'); // Debug
    } else {
        console.error('Elemento toggleLoginPassword NON TROVATO!'); // Debug
    }

    // Gestione della visibilità delle password per il form agricoltore
    const toggleRegisterPasswordEl = document.getElementById('toggleRegisterPassword');
    const toggleRegisterConfermaPasswordEl = document.getElementById('toggleRegisterConfermaPassword');

    if (toggleRegisterPasswordEl) {
        toggleRegisterPasswordEl.innerHTML = hidePasswordSVG;
        toggleRegisterPasswordEl.addEventListener('click', () => {
            togglePasswordVisibility('registerPassword', 'toggleRegisterPassword');
        });
    }
    if (toggleRegisterConfermaPasswordEl) {
        toggleRegisterConfermaPasswordEl.innerHTML = hidePasswordSVG;
        toggleRegisterConfermaPasswordEl.addEventListener('click', () => {
            togglePasswordVisibility('registerConfermaPassword', 'toggleRegisterConfermaPassword');
        });
    }

    // Gestione della visibilità delle password per il form azienda
    const toggleCompanyPasswordEl = document.getElementById('toggleCompanyPassword');
    const toggleCompanyConfermaPasswordEl = document.getElementById('toggleCompanyConfermaPassword');

    if (toggleCompanyPasswordEl) {
        toggleCompanyPasswordEl.innerHTML = hidePasswordSVG;
        toggleCompanyPasswordEl.addEventListener('click', () => {
            togglePasswordVisibility('companyPassword', 'toggleCompanyPassword');
        });
    }
    if (toggleCompanyConfermaPasswordEl) {
        toggleCompanyConfermaPasswordEl.innerHTML = hidePasswordSVG;
        toggleCompanyConfermaPasswordEl.addEventListener('click', () => {
            togglePasswordVisibility('companyConfermaPassword', 'toggleCompanyConfermaPassword');
        });
    }

 // Gestione della visibilità delle password per il form azienda
    const toggleAgronomistPasswordEl = document.getElementById('toggleAgronomistPassword');
    const toggleAgroConfermaPasswordEl = document.getElementById('toggleAgroConfermaPassword');

    if (toggleAgronomistPasswordEl) {
        toggleAgronomistPasswordEl.innerHTML = hidePasswordSVG;
        toggleAgronomistPasswordEl.addEventListener('click', () => {
            togglePasswordVisibility('agroPassword', 'toggleAgronomistPassword');
        });
    }
    if (toggleAgroConfermaPasswordEl) {
        toggleAgroConfermaPasswordEl.innerHTML = hidePasswordSVG;
        toggleAgroConfermaPasswordEl.addEventListener('click', () => {
            togglePasswordVisibility('agroConfermaPassword', 'toggleAgroConfermaPassword');
        });
    }    

    // Inizializzazione campo città: disabilitato finché non si sceglie una provincia
    const userCityInput = document.getElementById('city');
    if (userCityInput) {
        userCityInput.disabled = true;
        userCityInput.placeholder = "Seleziona prima una provincia";
    }

    const companyCityInput = document.getElementById('companyCity');
    if (companyCityInput) {
        companyCityInput.disabled = true;
        companyCityInput.placeholder = "Seleziona prima una provincia";
    }

    // Aggiungi listener per le dropdown di provincia/città (utente e azienda)
    const provinceInput = document.getElementById('province');
    if (provinceInput) {
        provinceInput.addEventListener('input', () => updateLocationDropdowns('province', 'provinceDropdown', 'city', 'cityDropdown'));
        provinceInput.addEventListener('blur', () => setTimeout(() => {
            const provinceDropdown = document.getElementById('provinceDropdown');
            if (provinceDropdown && !provinceDropdown.matches(':hover') &&
                (!document.activeElement || !document.activeElement.classList.contains('custom-dropdown-item'))) {
                hideCustomDropdown(provinceDropdown);
            }
        }, 200));
        provinceInput.addEventListener('keydown', (e) => handleDropdownKeyDown(e, provinceInput, document.getElementById('provinceDropdown')));
    }

    const companyProvinceInput = document.getElementById('companyProvince');
    if (companyProvinceInput) {
        companyProvinceInput.addEventListener('input', () => updateLocationDropdowns('companyProvince', 'companyProvinceDropdown', 'companyCity', 'companyCityDropdown'));
        companyProvinceInput.addEventListener('blur', () => setTimeout(() => {
            const companyProvinceDropdown = document.getElementById('companyProvinceDropdown');
            if (companyProvinceDropdown && !companyProvinceDropdown.matches(':hover') &&
                (!document.activeElement || !document.activeElement.classList.contains('custom-dropdown-item'))) {
                hideCustomDropdown(companyProvinceDropdown);
            }
        }, 200));
        companyProvinceInput.addEventListener('keydown', (e) => handleDropdownKeyDown(e, companyProvinceInput, document.getElementById('companyProvinceDropdown')));
    }


    // Inizializza la vista al caricamento della pagina
    updateAuthContainerView();
});
