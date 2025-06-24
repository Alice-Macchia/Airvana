
async function dataOggi() {
  const oggi = new Date();
  const yyyy = oggi.getFullYear();
  const mm = String(oggi.getMonth() + 1).padStart(2, '0');
  const dd = String(oggi.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Carica dati CO2/O2 dal backend e aggiorna grafico
async function caricaDatiCO2O2(plotId, giorno = null) {
  if (!giorno) {
    giorno = await dataOggi();
  }
  try {
    const url = `/calcola_co2/${plotId}?giorno=${giorno}`;
    const response = await fetch(url);

    if (!response.ok) {
      // Gestisce errori come 404 (terreno non trovato) o 401 (non autorizzato)
      const errorData = await response.json();
      throw new Error(errorData.detail || `Errore ${response.status}`);
    }

    const dati = await response.json();

    console.log(`Dati CO2/O2 ricevuti per il plot ${plotId}:`, dati);

    if (Array.isArray(dati) && dati.length > 0) {
      aggiornaGraficoLine(dati);
      popolaTabellaMeteo(dati);
    } else {
      console.warn("⚠️ Il backend ha restituito un oggetto, non una lista di dati:", dati);
      alert("Nessun dato disponibile per oggi.");
    }
  } catch (error) {
    console.error(`Errore nel caricamento dati per il terreno ${plotId}:`, error);
    alert(`Impossibile caricare i dati per il terreno ${plotId}: ${error.message}`);
  }
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

        // Rende il primo bottone attivo di default
        if (index === 0)
            button.classList.add('active');

        button.addEventListener('click', async () => {
            // Gestione UI bottone attivo
            document.querySelectorAll('#terrainButtons .btn').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            const plotId = button.getAttribute('data-terreno');
            const giorno = await dataOggi();
            console.log(`Bottone terreno ${plotId} cliccato.`);
            caricaDatiCO2O2(plotId, giorno);
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
            const primoPlotId = userPlots[0].id;
            const giorno = await dataOggi();
            console.log(`Carico dati iniziali per il primo terreno dell'utente: ID ${primoPlotId}`);
            await caricaDatiCO2O2(primoPlotId, giorno);
        } else {
            console.log("L'utente non ha terreni. La dashboard è vuota.");
            // Qui potresti nascondere i grafici o mostrare un messaggio
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

// === GESTIONE UI E GRAFICI ===
window.addEventListener('DOMContentLoaded', () => {
  console.log("Dashboard JS pronto!");
  
    // 👇 QUI metti il codice logout:
  document.querySelector('.logout-btn')?.addEventListener('click', () => {
    window.location.href = "/logout";
  });


  // Inizializza Chart.js Line (grafico CO2/O2)
  const ctxLine = document.getElementById('lineChart')?.getContext('2d');
  const initialLabels = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
  window.lineChart = new Chart(ctxLine, {
    type: 'line',
    data: {
      labels: [...initialLabels],
      datasets: [
        {
          label: 'CO₂ (kg)',
          data: Array(24).fill(0),
          borderColor: '#dc3545',
          backgroundColor: 'rgba(220, 53, 69, 0.2)',
          tension: 0.2,
          fill: true
        },
        {
          label: 'O₂ (kg)',
          data: Array(24).fill(0),
          borderColor: '#198754',
          backgroundColor: 'rgba(25, 135, 84, 0.2)',
          tension: 0.2,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: false }
      }
    }
  });

  // Carica i dati reali dal backend appena la pagina è pronta (plot 1, data odierna)
  dataOggi().then(date => {
    console.log("📆 Carico dati per il giorno:", date);  // LOG UTILE
    caricaDatiCO2O2(1, date);
  });



  // Gestione bottoni terreno: aggiorna grafico con dati diversi se cliccato
  document.querySelectorAll('#terrainButtons button').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('#terrainButtons button').forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      const plotId = button.getAttribute('data-terreno');

      dataOggi().then(date => {
        console.log(`📍 Bottone terreno ${plotId} cliccato → data: ${date}`);
        caricaDatiCO2O2(plotId, date);
      });
    });
  });

  // --- ALTRI COMPONENTI UI, TEMA, SIDEBAR, ESPORTAZIONE PDF ecc. ---
  // (puoi aggiungere da qui tutto il resto delle funzionalità UI del tuo file originale)
  // ...vedi file sorgenti per altre logiche personalizzate (filtri, piechart ecc.)

  // Gestione tema
  const themeToggle = document.getElementById('themeToggle');
  const body = document.body;
  const applyTheme = (theme) => {
    body.classList.toggle('dark-theme', theme === 'dark');
    if (themeToggle) themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
  };
  const savedTheme = localStorage.getItem('theme') || 'light';
  applyTheme(savedTheme);
  themeToggle?.addEventListener('click', () => {
    const newTheme = body.classList.contains('dark-theme') ? 'light' : 'dark';
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
  });
  creaPieChart(datiPianteEsempio);
  // Gestione sidebar
  const sidebar = document.getElementById('sidebar');
  const mainContent = document.getElementById('mainContent');
  const toggleSidebarBtn = document.getElementById('toggleSidebar');
  toggleSidebarBtn?.addEventListener('click', () => {
    const isCollapsed = sidebar.classList.toggle('collapsed');
    mainContent.classList.toggle('collapsed', isCollapsed);
    toggleSidebarBtn.textContent = isCollapsed ? '➡️' : '☰';
  });

  // Gestione chat
  const chatBubble = document.getElementById('chatBubble');
  const chatBox = document.getElementById('chatBox');
  chatBubble?.addEventListener('click', () => {
    const isVisible = chatBox.style.display === 'flex';
    chatBox.style.display = isVisible ? 'none' : 'flex';
  });

  // Esportazione PDF
  const exportBtn = document.getElementById('exportLinePDF');
  exportBtn?.addEventListener('click', async () => {
    const jsPDF = window.jspdf.jsPDF;
    const doc = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = doc.internal.pageSize.getWidth() - 20;
    doc.setFont("helvetica", "normal");

    // Pagina 1: Dati Meteo + Grafico a LINEE
    let yOffset = 10;
    doc.setFontSize(18);
    doc.text('1. Dati Meteo Giornata', 10, yOffset);
    yOffset += 10;
    const lineChart = document.querySelectorAll('.chart-canvas')[0];
    if (lineChart) {
      const image = await html2canvas(lineChart, { scale: 2, useCORS: true });
      const imgData = image.toDataURL('image/png');
      doc.addImage(imgData, 'PNG', 10, yOffset, pdfWidth, 100);
    }

    // Pagina 2: Dati CO2/O2 finali (display)
    doc.addPage();
    let coY = 10;
    doc.setFontSize(18);
    doc.text('2. Dati Finali CO₂ e O₂', 10, coY);
    coY += 10;
    const co2Text = document.getElementById('co2Display')?.textContent || 'CO₂: -- kg';
    const o2Text = document.getElementById('o2Display')?.textContent || 'O₂: -- kg';
    doc.setFontSize(12);
    doc.text(`Assorbimento CO₂ finale: ${co2Text.replace('CO₂: ', '')}`, 10, coY);
    coY += 6;
    doc.text(`Emissione O₂ finale: ${o2Text.replace('O₂: ', '')}`, 10, coY);

    // Salva PDF
    doc.save('report_CO2_O2.pdf');
  });
});

// Esportazione canvas (supporto)
window.captureChartCanvas = async (canvasElement) => {
  return await html2canvas(canvasElement, {
    scale: 2,
    useCORS: true
  });
};
