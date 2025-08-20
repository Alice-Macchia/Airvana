// 📊 DASHBOARD SCRIPT V2 - CO2/O2 Line Chart + Meteo Table + Heatmap

let lineChartInstance = null;
let heatmapInstance = null;

// 🚀 Avvia tutto al caricamento della pagina
window.addEventListener("DOMContentLoaded", () => {
  console.log("🌿 Airvana Dashboard pronta");
    // Prima chiami meteo, POI CO2/O2
  fetch("/get_open_meteo/1", {
    method: "POST"
  })
    .then(res => {
      if (!res.ok) throw new Error("Errore nel fetch meteo");
      return res.json();
    })
    .then(data => {
      console.log("☁️ Meteo salvato correttamente.");
      fetchAndDraw(1);
    })

    .catch(err => {
      console.error("❌ Errore nella catena meteo->CO2:", err);
    });

  // --- INIZIO LOGICO REPORT PDF (MODIFICATO) ---
  const exportBtn = document.getElementById("exportPdfBtn");
    exportBtn.addEventListener("click", async (event) => {
      event.preventDefault();
      try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
      
        // --- 1. Intestazione ---
        const terrainName = "Report Terreno 1"; // DA MODIFICARE PER ORA NON DINAMICO
        const reportDate = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(19);
        doc.text(terrainName, 15, 20);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.text(`Report del ${reportDate}`, 15, 26);

        // --- 2. NUOVO: Tabella Riepilogo Dati ---
        doc.setFontSize(14);
        doc.text('Riepilogo Dati', 15, 55);

        // Card di riepilogo dall'HTML
        // const summaryCards = document.querySelectorAll('.summary-card'); // Aggiungi questa classe ai div delle card per una selezione robusta
        const summaryBody = [];
        document.querySelectorAll('section.mt-4 .bg-white').forEach(card => {
            const label = card.querySelector('h3').innerText;
            const value = card.querySelector('p').innerText;
            summaryBody.push([label, value]);
        });

        doc.autoTable({
            head: [['Parametro', 'Valore']],
            body: summaryBody,
            startY: 61,
            margin: { left: 15 },
            tableWidth: 180, // Larghezza fissa per allineamento
            styles: { fontSize: 9, cellPadding: 2 },
            headStyles: { fillColor: [75, 85, 99], textColor: 255, fontSize: 10 }
        });

        // Posizione Y per gli elementi successivi, calcolata dinamicamente
        let nextElementY = doc.lastAutoTable.finalY + 30;
      
        // --- 3. Grafico a Linee CO2/O2 ---
        if (lineChartInstance) {
          
          const lineImgData = lineChartInstance.getDataURL({
            type: 'png', pixelRatio: 2, backgroundColor: '#fff'
          });
          
          // doc.setFontSize(14);
          // doc.text('Assorbimento CO2 e Emissione O2', 15, nextElementY);
          
          const imgProps = doc.getImageProperties(lineImgData);
          const pdfWidth = 190; // Larghezza ridotta per i margini
          const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
          
          doc.addImage(lineImgData, 'PNG', 15, nextElementY + 7, pdfWidth, pdfHeight);
          nextElementY += pdfHeight + 20; // Aggiorna Y per la tabella
        }

        doc.addPage(); // nuova pagina per tabella
       
        // --- 4. Tabella Dati Orari ---
        const meteoTable = document.getElementById('meteoTableBody');
        if (meteoTable && meteoTable.rows.length > 0) {
            doc.setFontSize(14);
            doc.text(`Dati Orari`, 15, 20);
            
            const head = [['Ora', 'Prec(mm)', 'Temp(°C)', 'Rad', 'Umid', 'CO₂(kg/h)', 'O₂(kg/h)']];
            const body = Array.from(meteoTable.rows).map(row => Array.from(row.cells).map(cell => cell.innerText));
            
            doc.autoTable({
                head: head, 
                body: body, 
                startY: 27,
                margin: { left: 15 },
                tableWidth: 180,
                styles: { fontSize: 7, cellPadding: 1.5 },
                headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 8 }
            });
        }
      
        // --- Salvataggio PDF ---
        doc.save(`${terrainName.replace(/ /g, '_')}_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      
      } catch (error) {
        console.error("Errore durante la creazione del PDF:", error);
        alert("Si è verificato un errore durante l'esportazione del PDF.");
      }
    });
    // --- FINE CODICE ESPORTAZIONE PDF ---
});

// 📦 Load CO2/O2 data from FastAPI and launch the 3 renders
async function fetchAndDraw(plot_id) {
  try {
    const resMeteo = await fetch(`/get_open_meteo/${plot_id}`, { method: "POST" });
    if (!resMeteo.ok) throw new Error("❌ Errore nel fetch meteo/CO₂: " + resMeteo.statusText);
    
    const data = await resMeteo.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error("❌ Nessun dato ricevuto");

    console.log("📥 Dati ricevuti:", data);
    updateMeteoTable(data);
    drawEChartsLine(data);
    drawHeatmap(data);

  } catch (error) {
    console.error("❌ Errore nel fetch dei dati:", error);
  }
}

// 📋 Tabella meteo
function updateMeteoTable(data) {
  const tbody = document.getElementById("meteoTableBody");
  tbody.innerHTML = "";

  data.forEach(row => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.datetime}</td>
      <td>${row.precipitazioni_mm ?? "-"}</td>
      <td>${row.temperatura_c ?? "-"}</td>
      <td>${row.radiazione ?? "-"}</td>
      <td>${row.umidita ?? "-"}</td>
      <td>${row.co2_kg_hour?.toFixed(2) ?? "-"}</td>
      <td>${row.o2_kg_hour?.toFixed(2) ?? "-"}</td>
    `;
    tbody.appendChild(tr);
  });

  const last = data[data.length - 1];
  document.getElementById("co2Display").textContent = `CO₂: ${last?.co2_kg_hour?.toFixed(2) ?? "--"} kg/h`;
  document.getElementById("o2Display").textContent = `O₂: ${last?.o2_kg_hour?.toFixed(2) ?? "--"} kg/h`;
}

// 📈 Line Chart CO₂/O₂
function drawEChartsLine(data) {
  lineChartInstance = echarts.init(document.getElementById("lineChart"));
  const times = data.map(d => d.datetime.split(' ')[1].substring(0,5));
  const co2 = data.map(d => d.co2_kg_hour);
  const o2 = data.map(d => d.o2_kg_hour);

  const option = {
    title: { text: "Assorbimento CO₂ / Emissione O₂", left: "center" },
    tooltip: { trigger: "axis" },
    legend: { data: ["CO₂", "O₂"], bottom: 0 },
    xAxis: { type: "category", data: times },
    yAxis: { type: "value", name: "kg/h" },
    series: [
      { name: "CO₂", type: "line", smooth: true, data: co2, lineStyle: { color: "#0077B6" }},
      { name: "O₂", type: "line", smooth: true, data: o2, lineStyle: { color: "#00C49A" }}
    ]
  };
  lineChartInstance.setOption(option);
}

// 🔥 Heatmap meteo + CO₂/O₂
function drawHeatmap(data) {
  heatmapInstance = echarts.init(document.getElementById("heatmapChart"));
  const variables = ["precipitazioni_mm", "temperatura_c", "radiazione", "umidita", "co2_kg_hour", "o2_kg_hour"];
  const labels = ["Precipitazioni", "Temp (°C)", "Radiazione", "Umidità", "CO₂", "O₂"];
  const hours = data.map(d => d.datetime);
  const heatData = [];

  variables.forEach((v, rowIdx) => {
    data.forEach((d, colIdx) => {
      heatData.push([colIdx, rowIdx, d[v] ?? 0]);
    });
  });

  heatmapInstance.setOption({
    tooltip: {
      position: 'top',
      formatter: p => `${labels[p.value[1]]} @ ${hours[p.value[0]]}: <b>${p.value[2].toFixed(2)}</b>`
    },
    grid: { height: '80%', top: '10%', left: '10%', right: '5%'},
    xAxis: { type: 'category', data: hours, splitArea: { show: true }, axisLabel: { fontSize: 10, rotate: 45 }},
    yAxis: { type: 'category', data: labels, splitArea: { show: true }},
    visualMap: {
      min: 0,
      max: Math.max(...heatData.map(h => h[2])) || 1,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '0%'
    },
    series: [{
      name: 'Heatmap', type: 'heatmap', data: heatData, label: { show: false },
      emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.5)' }}
    }]
  });
}