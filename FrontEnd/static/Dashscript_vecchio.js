let myLineChart = null;

async function dataOggi() {
  const oggi = new Date();
  const yyyy = oggi.getFullYear();
  const mm = String(oggi.getMonth() + 1).padStart(2, '0');
  const dd = String(oggi.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Carica dati CO2/O2 dal backend e aggiorna grafico
// async function caricaDatiCO2O2(plotId, giorno = null) {
//   if (!giorno) {
//     giorno = await dataOggi();
//   }
//   try {
//     const url = `/calcola_co2/${plotId}?giorno=${giorno}`;
//     const response = await fetch(url);

//     if (!response.ok) {
//       // Gestisce errori come 404 (terreno non trovato) o 401 (non autorizzato)
//       const errorData = await response.json();
//       throw new Error(errorData.detail || `Errore ${response.status}`);
//     }

//     const dati = await response.json();

//     console.log(`Dati CO2/O2 ricevuti per il plot ${plotId}:`, dati);

//     if (Array.isArray(dati) && dati.length > 0) {
//       aggiornaGraficoLine(dati);
//       popolaTabellaMeteo(dati);
//     } else {
//       console.warn("⚠️ Il backend ha restituito un oggetto, non una lista di dati:", dati);
//       alert("Nessun dato disponibile per oggi.");
//     }
//   } catch (error) {
//     console.error(`Errore nel caricamento dati per il terreno ${plotId}:`, error);
//     alert(`Impossibile caricare i dati per il terreno ${plotId}: ${error.message}`);
//   }
// }

async function caricaDatiCO2O2(plotId, giorno) {
    try {
        const response = await fetch(`calcola_co2/${plotId}?giorno=${giorno}`);

        if (!response.ok) {
            // Gestisce errori HTTP come 404 o 500
            const errorText = await response.text(); // Ottieni più dettagli dal corpo della risposta, se disponibili
            throw new Error(`${response.status}: ${response.statusText}. ${errorText}`);
        }

        const data = await response.json();

        if (!data || data.length === 0) {
            // Gestisce il caso in cui non ci sono dati per il giorno specificato
            console.warn(`Nessun dato CO₂/O₂ trovato per il terreno ${plotId} il ${giorno}`);
            
            // Potresti mostrare un messaggio all'utente sulla dashboard qui
            // e potenzialmente pulire il grafico.
            if (myLineChart) {
                myLineChart.destroy();
                myLineChart = null;
            }
            // Mostra un messaggio all'utente nell'interfaccia
            document.getElementById('chart-container').innerHTML = '<p>Nessun dato disponibile per la data selezionata.</p>';
            return;
        }

        // Se i dati sono caricati con successo, disegna il grafico
        renderChart(data); // Una nuova funzione per gestire il disegno del grafico

    } catch (error) {
        console.error(`Errore nel caricamento dati per il terreno ${plotId}:`, error);
        // Mostra un messaggio di errore all'utente
        if (myLineChart) {
            myLineChart.destroy();
            myLineChart = null;
        }
        document.getElementById('chart-container').innerHTML = '<p>Si è verificato un errore durante il caricamento dei dati. Si prega di riprovare.</p>';
    }
}

function renderChart(data) {
    // Assicurati che il contenitore del grafico sia visibile e contenga il canvas
    // Questo ricrea il canvas nel caso sia stato rimosso
    document.getElementById('chart-container').innerHTML = '<canvas id="lineChart"></canvas>';
    const ctx = document.getElementById('lineChart').getContext('2d');

    if (myLineChart) {
        myLineChart.destroy();
    }

    // Estrai etichette e dati dal tuo oggetto 'data'
    const labels = data.map(d => d.timestamp); // Adatta in base alla struttura dei tuoi dati
    const co2Data = data.map(d => d.co2);       // Adatta in base alla struttura dei tuoi dati

    myLineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'CO₂',
                data: co2Data,
                // ... altre proprietà del dataset
            }]
        },
        options: { /* ... */ }
    });
}

function aggiornaGraficoLine(dati) {
  if (!window.lineChart) return;
  const labels = dati.map(row => row.datetime?.slice(11, 16) || '--');
  const co2 = dati.map(row => Number(row.co2_kg_hour) || 0);
  const o2 = dati.map(row => Number(row.o2_kg_hour) || 0);

  window.lineChart.data.labels = labels;
  window.lineChart.data.datasets[0].data = co2;
  window.lineChart.data.datasets[1].data = o2;
  window.lineChart.update();
}
//   const labels = dati.map(row => row.datetime?.slice(11, 16) || '--');
//   const co2 = dati.map(row => Number(row.co2_kg_hour) || 0);
//   const o2 = dati.map(row => Number(row.o2_kg_hour) || 0);

//   lineChart.data.labels = labels;
//   lineChart.data.datasets[0].data = co2;
//   lineChart.data.datasets[1].data = o2;

//   lineChart.update();
// }

// Popola la tabella meteo
// const format = val => {
//   const num = Number(val);
//   return Number.isFinite(num) ? num.toFixed(2) : '--';
// };
// Esempio: prendi il valore da backend o calcolato
const totaleEmissioniUtente = 1234.56;

// // Aggiorna il box appena la pagina carica
// document.addEventListener('DOMContentLoaded', () => {
//     const logoutBtn = document.querySelector('.logout-btn');
//   logoutBtn?.addEventListener('click', () => {
//     window.location.href = "/logout";
//   });
//   const totalEmissionSection = document.getElementById('totalEmissionSection');
//   if (totalEmissionSection) {
//     totalEmissionSection.textContent = `Totale emissioni utente: ${totaleEmissioniUtente.toFixed(2)} kg CO₂`;
//   }
// });


async function popolaTabellaMeteo(dati) {
  const tbody = document.getElementById('meteoTableBody');
  if (!tbody) return;

  const format = val => (Number.isFinite(Number(val)) ? Number(val).toFixed(2) : '--');
  tbody.innerHTML = '';
  dati.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.datetime?.slice(11, 16) || '--'}</td>
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

// *** NUOVA FUNZIONE per creare i bottoni dei terreni ***
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

        if (index === 0) {
            button.classList.add('active');
        }

        button.addEventListener('click', async () => {
            // Gestione UI bottone attivo
            document.querySelectorAll('#terrainButtons .btn').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            const plotId = button.getAttribute('data-terreno');
            const originalButtonText = button.textContent;

            // Imposta lo stato di caricamento generico
            button.textContent = 'Verifico dati...';
            button.disabled = true;

            try {
                const giorno = await dataOggi();

                // --- FASE 1: Verifica se i dati meteo esistono già ---
                console.log(`🔎 Verifico l'esistenza di dati meteo per il terreno ${plotId} in data ${giorno}...`);
                const checkResponse = await fetch(`/api/weather/exists?plot_id=${plotId}&giorno=${giorno}`);
                if (!checkResponse.ok) {
                    throw new Error('Errore durante la verifica dei dati sul server.');
                }
                const checkData = await checkResponse.json();

                // --- FASE 2: Logica Condizionale ---
                if (checkData.exists) {
                    // CASO A: I dati esistono, procedi direttamente al calcolo
                    console.log('✅ Dati meteo già presenti. Carico direttamente i calcoli.');
                    button.textContent = 'Caricamento calcoli...';
                    await caricaDatiCO2O2(plotId, giorno);

                } else {
                    // CASO B: I dati NON esistono, scaricali prima da Open-Meteo
                    console.log('⚠️ Dati meteo non presenti. Avvio download da Open-Meteo...');
                    button.textContent = 'Scarico dati meteo...';
                    
                    const meteoResponse = await fetch(`/get_open_meteo/${plotId}`, { method: 'POST' });
                    if (!meteoResponse.ok) {
                        const errorData = await meteoResponse.json();
                        throw new Error(errorData.detail || 'Errore durante il download dei dati meteo.');
                    }
                    
                    console.log('✅ Download completato. Avvio calcolo CO₂/O₂...');
                    button.textContent = 'Calcolo CO₂/O₂...';
                    await caricaDatiCO2O2(plotId, giorno);
                }

            } catch (error) {
                console.error(`💥 Fallimento nel processo di caricamento per il terreno ${plotId}:`, error);
                alert(`Impossibile completare l'operazione: ${error.message}`);
            } finally {
                // Ripristina lo stato del bottone in ogni caso (successo o fallimento)
                button.textContent = originalButtonText;
                button.disabled = false;
            }
        });
        container.appendChild(button);
    });
}


// *** MODIFICA PRINCIPALE: Inizializzazione della Dashboard ***
async function inizializzaDashboard() {
    try {
        // 1. Chiedi al nuovo endpoint quali terreni appartengono all'utente
        const response = await fetch('/api/users/me/plots');
        if (!response.ok) throw new Error("Impossibile recuperare i terreni dell'utente.");
        const userPlots = await response.json();

        // 2. Crea dinamicamente i bottoni per ogni terreno
        creaBottoniTerreno(userPlots);

        // 3. Se ci sono terreni, carica i dati del primo terreno di default
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


// All'avvio della pagina, non caricare più i dati hardcodati,
// ma avvia il processo di inizializzazione dinamico.
window.addEventListener('DOMContentLoaded', () => {
  console.log("Dashboard JS pronto!");

  // Inizializza Chart.js (il tuo codice esistente va bene)
  const ctxLine = document.getElementById('lineChart')?.getContext('2d');
  // ... (tutto il codice di inizializzazione del grafico)

  if (ctxLine) {
        window.lineChart = new Chart(ctxLine, {
            type: 'line',
            data: {
                labels: Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`),
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

    // Gestione Logout
    document.querySelector('.logout-btn')?.addEventListener('click', () => {
        window.location.href = "/logout";
    });

    // Gestione Tema
    const themeToggle = document.getElementById('themeToggle');
    if(themeToggle) {
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
    
  // AVVIA LA NUOVA LOGICA DINAMICA
  inizializzaDashboard();

  // Il resto del tuo codice per il tema, la sidebar, etc. rimane qui
  // ...
});

window.addEventListener('DOMContentLoaded', () => {
    console.log("Dashboard JS pronto!");

    // --- 1. Inizializzazione Grafico Vuoto ---
    const ctxLine = document.getElementById('lineChart')?.getContext('2d');
    if (ctxLine) {
        myLineChart = new Chart(ctxLine, {
            type: 'line',
            data: {
                labels: [], // Inizia con etichette vuote
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
    
    // Gestione Logout
    document.querySelector('.logout-btn')?.addEventListener('click', () => {
        window.location.href = "/logout";
    });

    // Gestione Tema (Dark/Light)
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
    
    // Gestione Sidebar
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent'); // Assicurati che il tuo contenitore principale abbia id="mainContent"
    const toggleSidebarBtn = document.getElementById('toggleSidebar');
    toggleSidebarBtn?.addEventListener('click', () => {
        const isCollapsed = sidebar.classList.toggle('collapsed');
        if(mainContent) mainContent.classList.toggle('collapsed', isCollapsed);
        toggleSidebarBtn.textContent = isCollapsed ? '➡️' : '☰';
    });

    // Gestione Chat
    const chatBubble = document.getElementById('chatBubble');
    const chatBox = document.getElementById('chatBox');
    chatBubble?.addEventListener('click', () => {
        const isVisible = chatBox.style.display === 'flex';
        chatBox.style.display = isVisible ? 'none' : 'flex';
    });
    
    // Gestione Esportazione PDF
    const exportBtn = document.getElementById('exportLinePDF');
    exportBtn?.addEventListener('click', async () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const chartCanvas = document.getElementById('lineChart');
        
        doc.setFontSize(18);
        doc.text('Report CO₂/O₂', 10, 15);
        
        if (chartCanvas) {
            const image = await html2canvas(chartCanvas, { scale: 2 });
            const imgData = image.toDataURL('image/png');
            doc.addImage(imgData, 'PNG', 10, 25, 190, 100);
        }
        
        doc.save('report_dashboard.pdf');
    });

    // --- 3. Avvio della logica dinamica per caricare i terreni e i dati ---
    inizializzaDashboard();
});


// // === GESTIONE UI E GRAFICI ===
// window.addEventListener('DOMContentLoaded', () => {
//   console.log("Dashboard JS pronto!");
  
//     // 👇 QUI metti il codice logout:
//   document.querySelector('.logout-btn')?.addEventListener('click', () => {
//     window.location.href = "/logout";
//   });



//   // Inizializza Chart.js Line (grafico CO2/O2)
//   const ctxLine = document.getElementById('lineChart')?.getContext('2d');

//   if (myLineChart) {
//     myLineChart.destroy();
//   }

//   myLineChart = new Chart(ctx, {
//     type: 'line',
//     data: { /* i tuoi dati qui */ },
//     options: { /* le tue opzioni qui */ }
//   });
//   const initialLabels = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
//   window.lineChart = new Chart(ctxLine, {
//     type: 'line',
//     data: {
//       labels: [...initialLabels],
//       datasets: [
//         {
//           label: 'CO₂ (kg)',
//           data: Array(24).fill(0),
//           borderColor: '#dc3545',
//           backgroundColor: 'rgba(220, 53, 69, 0.2)',
//           tension: 0.2,
//           fill: true
//         },
//         {
//           label: 'O₂ (kg)',
//           data: Array(24).fill(0),
//           borderColor: '#198754',
//           backgroundColor: 'rgba(25, 135, 84, 0.2)',
//           tension: 0.2,
//           fill: true
//         }
//       ]
//     },
//     options: {
//       responsive: true,
//       maintainAspectRatio: false,
//       scales: {
//         y: { beginAtZero: false }
//       }
//     }
//   });

//   // Carica i dati reali dal backend appena la pagina è pronta (plot 1, data odierna)
//   dataOggi().then(date => {
//     console.log("📆 Carico dati per il giorno:", date);  // LOG UTILE
//     caricaDatiCO2O2(1, date);
//   });



//   // Gestione bottoni terreno: aggiorna grafico con dati diversi se cliccato
//   document.querySelectorAll('#terrainButtons button').forEach(button => {
//     button.addEventListener('click', () => {
//       document.querySelectorAll('#terrainButtons button').forEach(btn => btn.classList.remove('active'));
//       button.classList.add('active');
//       const plotId = button.getAttribute('data-terreno');

//       dataOggi().then(date => {
//         console.log(`📍 Bottone terreno ${plotId} cliccato → data: ${date}`);
//         caricaDatiCO2O2(plotId, date);
//       });
//     });
//   });

//   // --- ALTRI COMPONENTI UI, TEMA, SIDEBAR, ESPORTAZIONE PDF ecc. ---
//   // (puoi aggiungere da qui tutto il resto delle funzionalità UI del tuo file originale)
//   // ...vedi file sorgenti per altre logiche personalizzate (filtri, piechart ecc.)

//   // Gestione tema
//   const themeToggle = document.getElementById('themeToggle');
//   const body = document.body;
//   const applyTheme = (theme) => {
//     body.classList.toggle('dark-theme', theme === 'dark');
//     if (themeToggle) themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
//   };
//   const savedTheme = localStorage.getItem('theme') || 'light';
//   applyTheme(savedTheme);
//   themeToggle?.addEventListener('click', () => {
//     const newTheme = body.classList.contains('dark-theme') ? 'light' : 'dark';
//     localStorage.setItem('theme', newTheme);
//     applyTheme(newTheme);
//   });
//   creaPieChart(datiPianteEsempio);
//   // Gestione sidebar
//   const sidebar = document.getElementById('sidebar');
//   const mainContent = document.getElementById('mainContent');
//   const toggleSidebarBtn = document.getElementById('toggleSidebar');
//   toggleSidebarBtn?.addEventListener('click', () => {
//     const isCollapsed = sidebar.classList.toggle('collapsed');
//     mainContent.classList.toggle('collapsed', isCollapsed);
//     toggleSidebarBtn.textContent = isCollapsed ? '➡️' : '☰';
//   });

//   // Gestione chat
//   const chatBubble = document.getElementById('chatBubble');
//   const chatBox = document.getElementById('chatBox');
//   chatBubble?.addEventListener('click', () => {
//     const isVisible = chatBox.style.display === 'flex';
//     chatBox.style.display = isVisible ? 'none' : 'flex';
//   });

//   // Esportazione PDF
//   const exportBtn = document.getElementById('exportLinePDF');
//   exportBtn?.addEventListener('click', async () => {
//     const jsPDF = window.jspdf.jsPDF;
//     const doc = new jsPDF('p', 'mm', 'a4');
//     const pdfWidth = doc.internal.pageSize.getWidth() - 20;
//     doc.setFont("helvetica", "normal");

//     // Pagina 1: Dati Meteo + Grafico a LINEE
//     let yOffset = 10;
//     doc.setFontSize(18);
//     doc.text('1. Dati Meteo Giornata', 10, yOffset);
//     yOffset += 10;
//     const lineChart = document.querySelectorAll('.chart-canvas')[0];
//     if (lineChart) {
//       const image = await html2canvas(lineChart, { scale: 2, useCORS: true });
//       const imgData = image.toDataURL('image/png');
//       doc.addImage(imgData, 'PNG', 10, yOffset, pdfWidth, 100);
//     }

//     // Pagina 2: Dati CO2/O2 finali (display)
//     doc.addPage();
//     let coY = 10;
//     doc.setFontSize(18);
//     doc.text('2. Dati Finali CO₂ e O₂', 10, coY);
//     coY += 10;
//     const co2Text = document.getElementById('co2Display')?.textContent || 'CO₂: -- kg';
//     const o2Text = document.getElementById('o2Display')?.textContent || 'O₂: -- kg';
//     doc.setFontSize(12);
//     doc.text(`Assorbimento CO₂ finale: ${co2Text.replace('CO₂: ', '')}`, 10, coY);
//     coY += 6;
//     doc.text(`Emissione O₂ finale: ${o2Text.replace('O₂: ', '')}`, 10, coY);

//     // Salva PDF
//     doc.save('report_CO2_O2.pdf');
//   });
// });

// // Esportazione canvas (supporto)
// window.captureChartCanvas = async (canvasElement) => {
//   return await html2canvas(canvasElement, {
//     scale: 2,
//     useCORS: true
//   });
// };
