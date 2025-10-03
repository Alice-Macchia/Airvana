// Carica i dati del profilo utente all'avvio
document.addEventListener('DOMContentLoaded', async () => {
    await loadUserProfile();
});

/**
 * Carica i dati del profilo utente dall'API
 */
async function loadUserProfile() {
    try {
        const response = await fetch('/api/user/profile', {
            method: 'GET',
            credentials: 'include' // Importante per inviare i cookie
        });

        if (!response.ok) {
            if (response.status === 401) {
                // Non autenticato, reindirizza al login
                window.location.href = '/logreg';
                return;
            }
            throw new Error(`Errore HTTP: ${response.status}`);
        }

        const data = await response.json();
        populateProfile(data);
    } catch (error) {
        console.error('Errore nel caricamento del profilo:', error);
        alert('Errore nel caricamento dei dati del profilo. Riprova più tardi.');
    }
}

/**
 * Popola i campi della pagina con i dati ricevuti
 */
function populateProfile(data) {
    // Header
    const fullName = `${data.first_name} ${data.last_name}`;
    document.getElementById('user-fullname').textContent = fullName;

    // Badge tipo utente
    const badge = document.getElementById('user-badge');
    const userTypeMap = {
        'farmer': { text: 'Agricoltore', icon: '🌱', class: 'farmer' },
        'society': { text: 'Azienda', icon: '🏢', class: 'society' },
        'agronomist': { text: 'Agronomo', icon: '🍃', class: 'agronomist' }
    };

    const userType = userTypeMap[data.user_type] || { text: 'Utente', icon: '👤', class: '' };
    badge.textContent = `${userType.icon} ${userType.text}`;
    badge.className = `user-badge ${userType.class}`;

    // Informazioni Personali
    document.getElementById('fullname').textContent = fullName;
    document.getElementById('username').textContent = data.username || '-';
    document.getElementById('cod-fis').textContent = data.cod_fis || '-';

    // Mostra nome azienda solo se presente
    if (data.farm_name) {
        document.getElementById('farm-name-container').style.display = 'block';
        document.getElementById('farm-name').textContent = data.farm_name;
    }

    // Contatti
    document.getElementById('email').textContent = data.email || '-';
    document.getElementById('phone').textContent = data.phone_number || '-';

    // Residenza
    document.getElementById('province').textContent = data.province || '-';
    document.getElementById('city').textContent = data.city || '-';
    document.getElementById('address').textContent = data.address || '-';

    // Statistiche
    document.getElementById('terreno-count').textContent = data.terreno_count || 0;
    
    // CO2 totale (se disponibile, altrimenti calcola o mostra 0)
    const totalCO2 = data.total_co2 ? data.total_co2.toFixed(2) : '0.00';
    document.getElementById('total-co2').textContent = `${totalCO2} kg`;

    // Area totale
    const totalArea = data.total_area ? data.total_area.toFixed(2) : '0.00';
    document.getElementById('total-area').textContent = `${totalArea} ha`;

    // Data iscrizione
    if (data.created_at) {
        const date = new Date(data.created_at);
        const formattedDate = date.toLocaleDateString('it-IT', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric' 
        });
        document.getElementById('created-at').textContent = formattedDate;
    } else {
        document.getElementById('created-at').textContent = '-';
    }
}

/**
 * Funzione per modificare il profilo
 */
function editProfile() {
    alert('Funzione "Modifica Profilo" in sviluppo!');
    // TODO: Implementare form di modifica profilo
}

/**
 * Funzione per cambiare password
 */
function changePassword() {
    alert('Funzione "Cambia Password" in sviluppo!');
    // TODO: Implementare form cambio password
}

/**
 * Funzione per confermare eliminazione account
 */
function confirmDelete() {
    const confirmed = confirm(
        '⚠️ ATTENZIONE!\n\n' +
        'Stai per eliminare il tuo account in modo permanente.\n' +
        'Questa azione NON può essere annullata.\n\n' +
        'Tutti i tuoi dati, terreni e statistiche saranno cancellati.\n\n' +
        'Sei sicuro di voler procedere?'
    );

    if (confirmed) {
        const doubleConfirm = confirm(
            'Ultima conferma!\n\n' +
            'Digita OK per eliminare definitivamente il tuo account.'
        );

        if (doubleConfirm) {
            deleteAccount();
        }
    }
}

/**
 * Elimina l'account utente
 */
async function deleteAccount() {
    try {
        const response = await fetch('/api/user/delete', {
            method: 'DELETE',
            credentials: 'include'
        });

        if (response.ok) {
            alert('Account eliminato con successo. Verrai reindirizzato alla home.');
            window.location.href = '/';
        } else {
            throw new Error('Errore nell\'eliminazione dell\'account');
        }
    } catch (error) {
        console.error('Errore:', error);
        alert('Errore nell\'eliminazione dell\'account. Riprova più tardi.');
    }
}
