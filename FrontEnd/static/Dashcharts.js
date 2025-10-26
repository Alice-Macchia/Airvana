

// 🌟 ISTANZA GLOBALE WATERFALL (le altre sono in dashscript.js)
window.waterfallChartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    const navbar = document.querySelector('.navbar');
    const navLinks = document.getElementById('navLinks');
    const hamburger = document.getElementById('hamburger');

    // Funzione per la navbar sticky
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // Toggle del menu hamburger per mobile
    hamburger.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });

    // Chiudi il menu hamburger quando si clicca su un link (utile per mobile)
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            if (navLinks.classList.contains('active')) {
                navLinks.classList.remove('active');
            }
        });
    });
});

// ========== RIMOZIONE VALORI HARDCODED ==========
// Valori ora gestiti dinamicamente in Dashscript.js tramite updateDynamicCards()

// Funzione helper per nascondere loader
function hideLoaders() {
    document.querySelectorAll('.loading-overlay, .loading-spinner').forEach(el => {
        el.style.display = 'none';
        el.classList.add('hidden');
    });
}

// Nascondi i loader iniziali dopo breve delay
setTimeout(() => {
    hideLoaders();
}, 1000);

// ========== GESTIONE TERRENI ==========
let currentTerrenoId = null;

// Carica lista terreni e popola dropdown + indicators
async function loadTerreni() {
    try {
        // Usa l'endpoint che restituisce dati dettagliati (area, specie, etc)
        const response = await fetch('/api/users/me/plots');
        if (!response.ok) throw new Error('Errore nel caricamento dei terreni');
        
        const terreni = await response.json();
        
        if (!terreni || terreni.length === 0) {
            console.warn('Nessun terreno trovato per questo utente');
            document.getElementById('terrenoSelector').innerHTML = 
                '<option>Nessun terreno disponibile</option>';
            document.getElementById('terrenoButtonsGrid').innerHTML = 
                '<div class="text-xs text-gray-400">Nessun terreno</div>';
            return;
        }
        
        // Popola il dropdown
        const selector = document.getElementById('terrenoSelector');
        selector.innerHTML = terreni.map(t => 
            `<option value="${t.id}">${t.name || `Terreno ${t.id}`}</option>`
        ).join('');
        
        // Popola gli indicators minimal (barrette stile Databricks)
        const indicatorsContainer = document.getElementById('terrenoButtonsGrid');
        indicatorsContainer.innerHTML = terreni.map(t => {
            return `
                <div class="terreno-indicator" 
                        data-terreno-id="${t.id}" 
                        data-name="${t.name || `Terreno ${t.id}`}"
                        onclick="selectTerreno(${t.id})"
                        title="${t.name || `Terreno ${t.id}`}">
                    <span class="terreno-label">${t.name || `Terreno ${t.id}`}</span>
                </div>
            `;
        }).join('');
        
        // Seleziona il primo terreno automaticamente
        if (terreni.length > 0) {
            selectTerreno(terreni[0].id);
        }
    } catch (error) {
        console.error('❌ Errore nel caricamento dei terreni:', error);
        document.getElementById('terrenoSelector').innerHTML = 
            '<option>Errore nel caricamento</option>';
        document.getElementById('terrenoButtonsGrid').innerHTML = 
            '<div class="text-xs text-red-500">Errore</div>';
    }
}

// Seleziona un terreno (chiamato sia dal dropdown che dagli indicators)
async function selectTerreno(terrenoId) {
    if (currentTerrenoId === terrenoId) return; // Già selezionato
    
    currentTerrenoId = terrenoId;
    
    // Aggiorna UI
    document.getElementById('terrenoSelector').value = terrenoId;
    
    // Aggiorna classi attive sugli indicators
    document.querySelectorAll('.terreno-indicator').forEach(indicator => {
        if (parseInt(indicator.dataset.terrenoId) === terrenoId) {
            indicator.classList.add('active');
        } else {
            indicator.classList.remove('active');
        }
    });
    
    // ✅ Usa la nuova funzione globale da Dashscript.js
    if (window.loadTerreno) {
        await window.loadTerreno(terrenoId);
    } else {
        console.error("❌ window.loadTerreno non disponibile");
    }
}

// Funzione per ricaricare i dati
async function refreshData() {
    if (!currentTerrenoId) {
        console.warn('⚠️ Nessun terreno selezionato');
        return;
    }
    
    console.log(`🔄 Ricarico dati per terreno ${currentTerrenoId}`);
    
    // Mostra loader
    showLoaders();
    
    try {
        // Prima chiama meteo, poi CO2/O2
        const meteoResponse = await fetch(`/weather/${currentTerrenoId}`, {
            method: "POST",
            credentials: 'include'
        });
        
        if (!meteoResponse.ok) {
            const errorData = await meteoResponse.json().catch(() => ({}));
            throw new Error(errorData.detail || "Errore nel fetch meteo");
        }
        
        console.log("☁️ Meteo salvato correttamente.");
        
        // ✅ Usa la nuova funzione globale da Dashscript.js
        if (window.loadTerreno) {
            await window.loadTerreno(currentTerrenoId);
        } else {
            console.error("❌ window.loadTerreno non disponibile");
        }
        
    } catch (error) {
        console.error("❌ Errore nel refresh dei dati:", error);
        alert(`⚠️ ${error.message}\n\nPossibili cause:\n- Il terreno non ha specie associate\n- Dati meteo non disponibili\n- Problema di connessione`);
    } finally {
        hideLoaders();
    }
}

// Mostra/nascondi loader
function showLoaders() {
    document.querySelectorAll('.loading-spinner').forEach(el => el.style.display = 'inline-block');
}

function hideLoaders() {
    document.querySelectorAll('.loading-spinner').forEach(el => el.style.display = 'none');
}

// Listener per il cambio dal dropdown
document.addEventListener('DOMContentLoaded', () => {
    const selector = document.getElementById('terrenoSelector');
    selector.addEventListener('change', (e) => {
        const terrenoId = parseInt(e.target.value);
        selectTerreno(terrenoId);
    });
    
    // Carica i terreni all'avvio
    loadTerreni();
});

// Funzione helper per ridimensionare tutti i grafici
function resizeAllCharts() {
    console.log('🔄 Resize richiesto...');
    try {
        if (window.lineChartInstance) {
            window.lineChartInstance.resize();
            console.log('📊 Line chart ridimensionato');
        } else {
            console.warn('⚠️ lineChartInstance non ancora inizializzato');
        }
        
        if (window.heatmapInstance) {
            window.heatmapInstance.resize();
            console.log('🔥 Heatmap ridimensionato');
        } else {
            console.warn('⚠️ heatmapInstance non ancora inizializzato');
        }
        
        // Species chart (definito in dashscript.js)
        if (window.speciesChartInstance) {
            window.speciesChartInstance.resize();
            console.log('🌳 Species chart ridimensionato');
        } else {
            console.warn('⚠️ speciesChartInstance non ancora inizializzato');
        }
    } catch (error) {
        console.error('❌ Errore nel ridimensionamento grafici:', error);
    }
}

// Listener per ridimensionamento finestra - assicura che i grafici si adattino
window.addEventListener('resize', () => {
    // Debounce il resize per evitare troppe chiamate
    clearTimeout(window.resizeTimeout);
    window.resizeTimeout = setTimeout(() => {
        resizeAllCharts();
    }, 250);
});

// ========== TOGGLE CHARTS VIEW ==========
let isCompactView = false;

function toggleChartsView() {
    const container = document.getElementById('chartsContainer');
    const btn = document.getElementById('viewToggleBtn');
    const icon = document.getElementById('viewToggleIcon');
    const text = document.getElementById('viewToggleText');
    
    isCompactView = !isCompactView;
    
    if (isCompactView) {
        // Passa a vista compatta fullscreen
        container.classList.remove('charts-normal');
        container.classList.add('charts-compact');
        icon.className = 'fas fa-list';
        text.textContent = 'Vista Normale';
        
        // Compatta anche le summary cards
        compactSummaryCards(true);
    } else {
        // Torna a vista normale
        container.classList.remove('charts-compact');
        container.classList.add('charts-normal');
        icon.className = 'fas fa-th';
        text.textContent = 'Vista Compatta';
        
        // Ripristina summary cards normali
        compactSummaryCards(false);
    }
    
    // 🔧 RESIZE MIGLIORATO - Multiple tentativi ottimizzati per vista quadrata
    // Resize immediato (per feedback visivo rapido)
    setTimeout(() => {
        resizeAllCharts();
    }, 50);
    
    // Resize dopo transizione CSS (300ms) + aspect-ratio processing
    setTimeout(() => {
        resizeAllCharts();
    }, 400);
    
    // Resize finale per assicurare proporzioni quadrate perfette
    setTimeout(() => {
        resizeAllCharts();
    }, 800);
    
    // Resize extra per vista compatta (le proporzioni quadrate richiedono più tempo)
    if (isCompactView) {
        setTimeout(() => {
            resizeAllCharts();
        }, 1200);
    }
}

// Funzione per compattare/espandere le summary cards
function compactSummaryCards(compact) {
    const summarySection = document.querySelector('section.mb-6');
    const summaryContainer = document.getElementById('summaryCards');
    
    if (!summarySection || !summaryContainer) return;
    
    if (compact) {
        // Vista compatta: cards più piccole e meno spazio
        summarySection.style.marginBottom = '8px';
        summaryContainer.style.gap = '6px';
        
        // Riduce padding delle singole cards
        const cards = summaryContainer.querySelectorAll('div');
        cards.forEach(card => {
            card.style.padding = '4px 8px';
            card.style.fontSize = '10px';
        });
    } else {
        // Vista normale: ripristina stili originali
        summarySection.style.marginBottom = '';
        summaryContainer.style.gap = '';
        
        // Ripristina padding delle singole cards
        const cards = summaryContainer.querySelectorAll('div');
        cards.forEach(card => {
            card.style.padding = '';
            card.style.fontSize = '';
        });
    }
}
