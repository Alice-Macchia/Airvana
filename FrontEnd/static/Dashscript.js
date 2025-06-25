
// Variabile globale per l'istanza del grafico, per potervi accedere da più funzioni.
let myLineChart = null;
let pieChart = null;

/**
 * Restituisce la data corrente nel formato YYYY-MM-DD.
 * @returns {Promise<string>} La data formattata.
 */
async function dataOggi() {
  const oggi = new Date();
  const yyyy = oggi.getFullYear();
  const mm = String(oggi.getMonth() + 1).padStart(2, '0');
  const dd = String(oggi.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Funzione principale per caricare i dati dal backend.
 * Contatta il server, gestisce gli errori e, se ha successo,
 * chiama le funzioni per aggiornare il grafico e la tabella.
 * @param {number} plotId - L'ID del terreno da caricare.
 * @param {string} giorno - La data per cui caricare i dati.
 */
async function caricaDatiCO2O2(plotId, giorno) {
    try {
        const response = await fetch(`/calcola_co2/${plotId}?giorno=${giorno}`);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `Errore server: ${response.status}`);
        }

        const data = await response.json();

        if (!data || data.length === 0) {
            console.warn(`Nessun dato CO₂/O₂ trovato per il terreno ${plotId} il ${giorno}`);
            alert("Nessun dato disponibile per la data selezionata.");
            // Pulisce il grafico e la tabella se non ci sono dati
            aggiornaGrafico([]);
            popolaTabellaMeteo([]);
            return;
        }

        // Se i dati sono caricati con successo, aggiorna l'interfaccia
        aggiornaGrafico(data);
        popolaTabellaMeteo(data);

    } catch (error) {
        console.error(`Errore nel caricamento dati per il terreno ${plotId}:`, error);
        alert(`Impossibile caricare i dati: ${error.message}`);
        // Pulisce l'UI anche in caso di errore
        aggiornaGrafico([]);
        popolaTabellaMeteo([]);
    }
}

/**
 * Aggiorna i dati del grafico Chart.js esistente.
 * @param {Array} data - La lista di dati orari proveniente dal backend.
 */
function aggiornaGrafico(data) {
  if (!myLineChart) return;

  // Estrae le etichette (ore) e i valori di CO2/O2 dai dati
  const labels = data.map(row => row.datetime ? new Date(row.datetime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '--');
  const co2Data = data.map(row => Number(row.co2_kg_hour) || 0);
  const o2Data = data.map(row => Number(row.o2_kg_hour) || 0);

  // Aggiorna l'istanza del grafico con i nuovi dati
  myLineChart.data.labels = labels;
  myLineChart.data.datasets[0].data = co2Data;
  myLineChart.data.datasets[1].data = o2Data;
  myLineChart.update();
}

/**
 * Popola la tabella HTML con i dati orari dettagliati.
 * @param {Array} dati - La lista di dati orari.
 */
function popolaTabellaMeteo(dati) {
  const tbody = document.getElementById('meteoTableBody');
  if (!tbody) return;

  tbody.innerHTML = ''; // Pulisce la tabella prima di popolarla
  const format = val => (val !== null && !isNaN(val)) ? Number(val).toFixed(2) : '--';

  dati.forEach(row => {
    const tr = document.createElement('tr');
    const ora = row.datetime ? new Date(row.datetime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '--';
    tr.innerHTML = `
      <td>${ora}</td>
      <td>${format(row.precipitazioni_mm)}</td>
      <td>${format(row.temperatura_c)}</td>
      <td>${format(row.radiazione)}</td>
      <td>${format(row.umidita)}</td>
      <td>${format(row.co2_kg_hour)}</td>
      <td>${format(row.o2_kg_hour)}</td>
    `;
    tbody.appendChild(tr);
  });
}

/**
 * Crea o aggiorna il grafico a torta con la distribuzione delle specie.
 * @param {Array} speciesData - Dati delle specie, es. [{species: 'Quercia', area_m2: 500}, ...]
 */
function creaOAggiornaGraficoTorta(speciesData) {
    const container = document.getElementById('pieChart');
    if (!container) return; // Se il canvas non esiste, non fare nulla

    // Prepara i dati per Chart.js
    const labels = speciesData.map(s => s.species);
    const data = speciesData.map(s => s.area_m2);

    // Se il grafico esiste già, aggiorniamo i suoi dati
    if (pieChart) {
        pieChart.data.labels = labels;
        pieChart.data.datasets[0].data = data;
        pieChart.update();
        return;
    }

    // Se il grafico non esiste, lo creiamo
    const ctx = container.getContext('2d');
    pieChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                label: 'Quantità (m²)',
                data: data,
                backgroundColor: [ // Aggiungi più colori se hai più specie
                    'rgba(255, 99, 132, 0.7)',
                    'rgba(54, 162, 235, 0.7)',
                    'rgba(255, 206, 86, 0.7)',
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(153, 102, 255, 0.7)',
                    'rgba(255, 159, 64, 0.7)'
                ],
                borderColor: 'rgba(255, 255, 255, 0.8)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Ripartizione Specie per Quantità (m²)'
                },
                // Configurazione per mostrare le percentuali
                datalabels: {
                    formatter: (value, ctx) => {
                        let sum = 0;
                        let dataArr = ctx.chart.data.datasets[0].data;
                        dataArr.map(data => {
                            sum += data;
                        });
                        let percentage = (value * 100 / sum).toFixed(1) + '%';
                        return percentage;
                    },
                    color: '#fff',
                    font: {
                        weight: 'bold'
                    }
                }
            }
        },
        // Registriamo il plugin che abbiamo aggiunto
        plugins: [ChartDataLabels]
    });
}

/**
 * Crea dinamicamente i bottoni per ogni terreno dell'utente
 * e associa la logica di caricamento dati al click.
 * @param {Array} plots - La lista dei terreni dell'utente.
 */

function creaBottoniTerreno(plots) {
    const container = document.getElementById('terrainButtons');
    if (!container) return;
    container.innerHTML = ''; // Pulisce i bottoni esistenti

    if (!plots || plots.length === 0) {
        container.innerHTML = '<p>Nessun terreno trovato. Vai su "Aggiungi Terreno" per crearne uno.</p>';
        return;
    }

    plots.forEach((plot, index) => {
        const button = document.createElement('button');
        button.className = 'btn';
        button.textContent = plot.name;
        button.setAttribute('data-terreno', plot.id);

        if (index === 0) button.classList.add('active');

        button.addEventListener('click', async () => {
            document.querySelectorAll('#terrainButtons .btn').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            const plotId = button.getAttribute('data-terreno');
            const originalButtonText = button.textContent;
            button.textContent = 'Verifico...';
            button.disabled = true;

            try {
                const speciesResponse = await fetch(`/species/${plotId}`);
                if (!speciesResponse.ok) throw new Error('Errore nel caricamento dati specie.');
                const speciesResult = await speciesResponse.json();
                creaOAggiornaGraficoTorta(speciesResult.species); // Aggiorna il grafico a torta
               
                const giorno = await dataOggi();
                console.log(`🔎 Verifico dati per il terreno ${plotId} in data ${giorno}...`);
                const checkResponse = await fetch(`/api/weather/exists?plot_id=${plotId}&giorno=${giorno}`);
                if (!checkResponse.ok) throw new Error('Errore di comunicazione col server.');
                
                const checkData = await checkResponse.json();

                if (checkData.exists) {
                    console.log('✅ Dati già presenti. Carico calcoli.');
                    button.textContent = 'Caricamento...';
                    // Questo caso non cambia: chiama /calcola_co2 perché i dati esistono già
                    await caricaDatiCO2O2(plotId, giorno);
                } else {
                    // --- MODIFICA PRINCIPALE IN QUESTO BLOCCO ---
                    console.log('⚠️ Dati non presenti. Scarico e calcolo...');
                    button.textContent = 'Scarico e Calcolo...';
                    
                    // 1. Chiamiamo l'endpoint che fa TUTTO
                    const response = await fetch(`/get_open_meteo/${plotId}`, { method: 'POST' });
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.detail || 'Errore durante il download e calcolo.');
                    }
                    
                    // 2. Il risultato è già il dato finale, non serve una seconda chiamata!
                    const data = await response.json();
                    console.log('✅ Operazione completata. Aggiorno l\'interfaccia.');

                    // 3. Aggiorniamo direttamente grafico e tabella
                    aggiornaGrafico(data);
                    popolaTabellaMeteo(data);
                }
            } catch (error) {
                console.error(`💥 Fallimento per il terreno ${plotId}:`, error);
                alert(`Operazione fallita: ${error.message}`);
                // Pulisce l'UI in caso di errore
                aggiornaGrafico([]);
                popolaTabellaMeteo([]);
            } finally {
                button.textContent = originalButtonText;
                button.disabled = false;
            }
        });
        container.appendChild(button);
    });
}

/**
 * Funzione principale che inizializza la dashboard recuperando i terreni dell'utente.
 */
async function inizializzaDashboard() {
    try {
        const response = await fetch('/api/users/me/plots');
        if (!response.ok) throw new Error("Impossibile recuperare i terreni dell'utente.");
        const userPlots = await response.json();

        creaBottoniTerreno(userPlots);

        if (userPlots.length > 0) {
            const primoBottone = document.querySelector('#terrainButtons .btn');
            if (primoBottone) {
                console.log("Avvio caricamento iniziale per il primo terreno...");
                primoBottone.click(); // Simula il click per avviare il caricamento
            }
        } else {
            console.log("L'utente non ha terreni. La dashboard è vuota.");
            document.getElementById('chart-container').innerHTML = '<p>Nessun terreno da visualizzare. Aggiungine uno per iniziare.</p>';
        }
    } catch (error) {
        console.error("Impossibile inizializzare la dashboard:", error);
        alert("Si è verificato un errore nel caricamento dei dati utente.");
    }
}


// ===================================================================================
//  UNICO BLOCCO DI INIZIALIZZAZIONE QUANDO LA PAGINA È PRONTA
// ===================================================================================
window.addEventListener('DOMContentLoaded', () => {
    console.log("Dashboard JS pronto!");

    // --- 1. Inizializzazione Grafico Vuoto ---
    const ctxLine = document.getElementById('lineChart')?.getContext('2d');
    if (ctxLine) {
        myLineChart = new Chart(ctxLine, {
            type: 'line',
            data: {
                labels: [], // Inizia vuoto, verrà popolato dai dati
                datasets: [{
                    label: 'CO₂ (kg)',
                    data: [],
                    borderColor: '#dc3545',
                    backgroundColor: 'rgba(220, 53, 69, 0.2)',
                    tension: 0.2,
                    fill: true
                }, {
                    label: 'O₂ (kg)',
                    data: [],
                    borderColor: '#198754',
                    backgroundColor: 'rgba(25, 135, 84, 0.2)',
                    tension: 0.2,
                    fill: true
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: false } } }
        });
    }

    // --- 2. Gestione di TUTTA l'Interfaccia Utente (UI) ---
    document.querySelector('.logout-btn')?.addEventListener('click', () => {
        window.location.href = "/logout";
    });

    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        const body = document.body;
        const applyTheme = (theme) => {
            body.classList.toggle('dark-theme', theme === 'dark');
            themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
        };
        const savedTheme = localStorage.getItem('theme') || 'light';
        applyTheme(savedTheme);
        themeToggle.addEventListener('click', () => {
            const newTheme = body.classList.contains('dark-theme') ? 'light' : 'dark';
            localStorage.setItem('theme', newTheme);
            applyTheme(newTheme);
        });
    }
    
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    const toggleSidebarBtn = document.getElementById('toggleSidebar');
    toggleSidebarBtn?.addEventListener('click', () => {
        const isCollapsed = sidebar.classList.toggle('collapsed');
        if(mainContent) mainContent.classList.toggle('collapsed', isCollapsed);
        toggleSidebarBtn.textContent = isCollapsed ? '➡️' : '☰';
    });

    const chatBubble = document.getElementById('chatBubble');
    const chatBox = document.getElementById('chatBox');
    chatBubble?.addEventListener('click', () => {
        const isVisible = chatBox.style.display === 'flex';
        chatBox.style.display = isVisible ? 'none' : 'flex';
    });
    
    const exportBtn = document.getElementById('exportLinePDF');
    exportBtn?.addEventListener('click', async () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const chartCanvas = document.getElementById('lineChart');
        
        doc.setFontSize(18);
        doc.text('Report CO₂/O₂', 10, 15);
        
        if (chartCanvas && myLineChart.data.labels.length > 0) {
            const image = await html2canvas(chartCanvas, { scale: 2 });
            const imgData = image.toDataURL('image/png');
            doc.addImage(imgData, 'PNG', 10, 25, 190, 100);
        } else {
            doc.setFontSize(12);
            doc.text('Nessun dato disponibile per generare il grafico.', 10, 25);
        }
        
        doc.save('report_dashboard.pdf');
    });

    // --- 3. Avvio della logica dinamica per caricare i terreni e i dati ---
    inizializzaDashboard();
});