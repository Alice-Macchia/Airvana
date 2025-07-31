// 📊 DASHBOARD SCRIPT V2 - CO2/O2 Line Chart + Meteo Table + Heatmap

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
});

// 📦 Carica dati CO2/O2 da FastAPI e lancia i 3 render
async function fetchAndDraw(plot_id) {
  try {
    // 🔁 1. Chiamata a POST per calcolare meteo + co2/o2
    const resMeteo = await fetch(`/get_open_meteo/${plot_id}`, {
      method: "POST"
    });

    if (!resMeteo.ok) {
      throw new Error("❌ Errore nel fetch meteo/CO₂: " + resMeteo.statusText);
    }

    const data = await resMeteo.json();
    console.log("📥 Dati ricevuti:", data);

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("❌ Nessun dato ricevuto");
    }

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
  const chart = echarts.init(document.getElementById("lineChart"));
  const times = data.map(d => d.datetime);
  const co2 = data.map(d => d.co2_kg_hour);
  const o2 = data.map(d => d.o2_kg_hour);

  const option = {
    title: { text: "Assorbimento CO₂ / Emissione O₂", left: "center" },
    tooltip: { trigger: "axis" },
    legend: { data: ["CO₂", "O₂"], bottom: 0 },
    xAxis: { type: "category", data: times },
    yAxis: { type: "value", name: "kg/h" },
    series: [
      {
        name: "CO₂",
        type: "line",
        smooth: true,
        data: co2,
        lineStyle: { color: "#0077B6" }
      },
      {
        name: "O₂",
        type: "line",
        smooth: true,
        data: o2,
        lineStyle: { color: "#00C49A" }
      }
    ]
  };

  chart.setOption(option);
}

// 🔥 Heatmap meteo + CO₂/O₂
function drawHeatmap(data) {
  const chart = echarts.init(document.getElementById("heatmapChart"));
  const variables = ["precipitazioni_mm", "temperatura_c", "radiazione", "umidita", "co2_kg_hour", "o2_kg_hour"];
  const labels = ["Precipitazioni", "Temp (°C)", "Radiazione", "Umidità", "CO₂", "O₂"];
  const hours = data.map(d => d.datetime);
  const heatData = [];

  variables.forEach((v, rowIdx) => {
    data.forEach((d, colIdx) => {
      heatData.push([colIdx, rowIdx, d[v] ?? 0]);
    });
  });

  chart.setOption({
    tooltip: {
      position: 'top',
      formatter: p => `${labels[p.value[1]]} @ ${hours[p.value[0]]}: <b>${p.value[2]}</b>`
    },
    grid: {
      height: '80%',
      top: '10%',
      left: '10%',
      right: '5%'
    },
    xAxis: {
      type: 'category',
      data: hours,
      splitArea: { show: true },
      axisLabel: { fontSize: 10, rotate: 45 }
    },
    yAxis: {
      type: 'category',
      data: labels,
      splitArea: { show: true }
    },
    visualMap: {
      min: 0,
      max: Math.max(...heatData.map(h => h[2])) || 1,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '0%'
    },
    series: [{
      name: 'Heatmap',
      type: 'heatmap',
      data: heatData,
      label: { show: false },
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }]
  });
}
