
// === FUNZIONI GLOBALI PER DATA E FETCH ===
async function dataOggi() {
  const oggi = new Date();
  const yyyy = oggi.getFullYear();
  const mm = String(oggi.getMonth() + 1).padStart(2, '0');
  const dd = String(oggi.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Carica dati CO2/O2 dal backend e aggiorna grafico
async function caricaDatiCO2O2(plotId = 1, giorno = "2025-05-29") {
  try {
    const url = `http://165.22.75.145:5000/calcola_co2/${plotId}?giorno=${giorno}`;
    const response = await fetch(url);
    const dati = await response.json();

    console.log("CO2/O2 dati ricevuti:", dati);

    aggiornaGraficoLine(dati);

    // Popola tabella meteo (aggiungibile qui)
    popolaTabellaMeteo(dati);
  } catch (error) {
    alert("Errore nel caricamento dati CO2/O2");
    console.error(error);
  }
}


// Funzione per la Pie Chart
function creaPieChart(datiPiante) {
  const ctxPie = document.getElementById('pieChart')?.getContext('2d');
  if (!ctxPie) return;
  // CHIAMA destroy() SOLO se esiste davvero una chart e ha la funzione!
  if (window.pieChart && typeof window.pieChart.destroy === "function") {
    window.pieChart.destroy();
  }
  window.pieChart = new Chart(ctxPie, {
    type: 'pie',
    data: {
      labels: datiPiante.map(d => d.categoria),
      datasets: [{
        label: 'Specie',
        data: datiPiante.map(d => d.valore),
        backgroundColor: [
          '#FF6384', '#36A2EB', '#FFCE56', '#8AFF33', '#AA33FF'
        ]
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}

// Dati di esempio
const datiPianteEsempio = [
  { categoria: "Querce", valore: 45 },
  { categoria: "Pini", valore: 27 },
  { categoria: "Betulle", valore: 13 },
  { categoria: "Olmi", valore: 7 },
  { categoria: "Altro", valore: 11 }
];

async function aggiornaGraficoLine(dati) {
  const labels = dati.map(row => row.datetime.slice(11, 16)); // "HH:MM"
  const co2 = dati.map(row => row.co2_kg_hour);
  const o2  = dati.map(row => row.o2_kg_hour);

  if (window.lineChart) {
    window.lineChart.data.labels = labels;
    window.lineChart.data.datasets[0].data = co2;
    window.lineChart.data.datasets[1].data = o2;
    window.lineChart.update();

    // Aggiorna display valori finali
    document.getElementById('co2Display').textContent = `CO₂: ${co2[co2.length - 1]} kg`;
    document.getElementById('o2Display').textContent = `O₂: ${o2[o2.length - 1]} kg`;
  }
}

// Popola la tabella meteo
async function popolaTabellaMeteo(dati) {
  const tbody = document.getElementById('meteoTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  dati.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.datetime.slice(11, 16)}</td>
      <td>${row.precipitazioni_mm || '--'}</td>
      <td>${row.temperatura_c || '--'}</td>
      <td>${row.radiazione || '--'}</td>
      <td>${row.umidita || '--'}</td>
      <td>${row.co2_kg_hour || '--'}</td>
      <td>${row.o2_kg_hour || '--'}</td>
    `;
    tbody.appendChild(tr);
  });
}

// === GESTIONE UI E GRAFICI ===
window.addEventListener('DOMContentLoaded', () => {
  console.log("Dashboard JS pronto!");

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
  dataOggi().then(date => caricaDatiCO2O2(1, date));


  // Gestione bottoni terreno: aggiorna grafico con dati diversi se cliccato
  document.querySelectorAll('#terrainButtons button').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('#terrainButtons button').forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      const plotId = button.getAttribute('data-terreno');
      caricaDatiCO2O2(plotId, dataOggi());
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
