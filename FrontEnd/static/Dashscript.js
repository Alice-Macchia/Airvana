// 📊 DASHBOARD SCRIPT V3 - Refactored & Clean
// ============================================

// 🌟 ISTANZE GLOBALI CONDIVISE
window.lineChartInstance = null;
window.heatmapInstance = null;
window.speciesChartInstance = null;

// 📦 DATI GLOBALI
let currentUserId = null;
let currentPlotId = null;
let selectedSpecies = null;
let originalHourlyData = [];
let aggregatedTotalData = [];
let currentPlotData = null; // Dati del terreno corrente (area, nome, ecc)

// 🚀 INIZIALIZZAZIONE DASHBOARD
window.addEventListener("DOMContentLoaded", async () => {
  console.log("🌿 Airvana Dashboard - Inizializzazione...");
  
  // 1. Recupera user_id
  currentUserId = document.body.dataset.userId;
  if (!currentUserId) {
    alert('Errore: user_id non trovato.');
    return;
  }
  
  // 2. Setup navbar sticky e hamburger menu
  setupNavbar();
  
  // 3. Carica terreni utente
  await loadUserTerreni();
  
  // 4. Setup PDF export
  setupPdfExport();
  
  // 5. Inizializza vista compatta come default
  initializeCompactView();
});

// Setup navbar
function setupNavbar() {
  const navbar = document.querySelector('.navbar');
  const navLinks = document.getElementById('navLinks');
  const hamburger = document.getElementById('hamburger');

  if (navbar) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    });
  }

  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      navLinks.classList.toggle('active');
    });

    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        if (navLinks.classList.contains('active')) {
          navLinks.classList.remove('active');
        }
      });
    });
  }
}

// ========== CARICAMENTO TERRENI ==========
async function loadUserTerreni() {
  try {
    console.log('📂 Caricamento terreni per user:', currentUserId);
    const response = await fetch(`/debug/user/${currentUserId}/plots`);
    console.log('📂 Response status:', response.status);
    const data = await response.json();
    console.log('📂 Data received:', data);
    const terreni = data.plots || [];
    console.log('📂 Terreni trovati:', terreni.length);
    
    if (terreni.length === 0) {
      console.warn('⚠️ Nessun terreno trovato');
      showEmptyState();
      return;
    }
    
    // Popola selector
    console.log('📂 Popolamento selector...');
    populateTerrenoSelector(terreni);
    
    // Carica il primo terreno
    console.log('📂 Caricamento primo terreno:', terreni[0].id);
    await loadTerreno(terreni[0].id);
    console.log('✅ Inizializzazione completata!');
    
  } catch (err) {
    console.error('❌ Errore caricamento terreni:', err);
    console.error('❌ Stack:', err.stack);
    showError('Errore nel caricamento dei terreni');
  }
}

function populateTerrenoSelector(terreni) {
  const select = document.getElementById('terrenoSelector');
  if (!select) return;
  
  // Popola dropdown
  select.innerHTML = terreni.map(t => 
    `<option value="${t.id}">${t.name || `Terreno ${t.id}`}</option>`
  ).join('');
  
  select.onchange = async (e) => {
    await selectTerreno(parseInt(e.target.value));
  };
  
  // Popola indicators (barrette minimali stile Databricks)
  const indicatorsContainer = document.getElementById('terrenoButtonsGrid');
  if (indicatorsContainer) {
    indicatorsContainer.innerHTML = terreni.map(t => {
      const isActive = t.id === terreni[0].id;
      return `
        <div class="terreno-indicator ${isActive ? 'active' : ''}" 
             data-terreno-id="${t.id}" 
             onclick="selectTerreno(${t.id})"
             title="${t.name || `Terreno ${t.id}`}"
             style="cursor: pointer; width: 4px; height: 32px; background: ${isActive ? '#023E8A' : '#d1d5db'}; border-radius: 2px; transition: all 0.2s;">
        </div>
      `;
    }).join('');
  }
}

// ========== SISTEMA DI CACHE ==========
const CACHE_VERSION = 'v1';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 ore

function getCacheKey(plotId, dataType) {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return `airvana_${CACHE_VERSION}_${plotId}_${dataType}_${today}`;
}

function getFromCache(plotId, dataType) {
  try {
    const key = getCacheKey(plotId, dataType);
    const cached = sessionStorage.getItem(key);
    if (cached) {
      const data = JSON.parse(cached);
      console.log(`💾 Cache HIT: ${dataType} per plot ${plotId}`);
      return data;
    }
  } catch (err) {
    console.warn('⚠️ Errore lettura cache:', err);
  }
  return null;
}

function saveToCache(plotId, dataType, data) {
  try {
    const key = getCacheKey(plotId, dataType);
    sessionStorage.setItem(key, JSON.stringify(data));
    console.log(`💾 Cache SAVE: ${dataType} per plot ${plotId}`);
  } catch (err) {
    console.warn('⚠️ Errore salvataggio cache:', err);
    // Se sessionStorage è pieno, pulisci cache vecchie
    cleanOldCache();
  }
}

function cleanOldCache() {
  const today = new Date().toISOString().split('T')[0];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key?.startsWith('airvana_') && !key.includes(today)) {
      sessionStorage.removeItem(key);
      console.log(`🗑️ Cache rimossa: ${key}`);
    }
  }
}

// ========== CARICAMENTO DATI TERRENO CON CACHE ==========
async function loadTerreno(plotId) {
  try {
    console.log(`🌍 Caricamento terreno ${plotId}...`);
    const startTime = performance.now();
    
    currentPlotId = plotId;
    selectedSpecies = null; // Reset filtro
    
    showLoaders();
    
    // 1. Fetch dati terreno (area, nome, ecc) - NO CACHE (dati piccoli)
    await fetchPlotInfo(plotId);
    
    // 2. Controlla cache per dati meteo
    let meteoData = getFromCache(plotId, 'meteo');
    if (!meteoData) {
      await fetchAndSaveMeteo(plotId);
      meteoData = await fetchMainChartsData(plotId);
      saveToCache(plotId, 'meteo', meteoData);
    }
    
    // 3. Disegna grafici principali con dati in cache
    drawMainChartsFromData(meteoData);
    
    // 4. Controlla cache per dati species
    let speciesData = getFromCache(plotId, 'species');
    if (!speciesData) {
      speciesData = await fetchSpeciesData(plotId);
      saveToCache(plotId, 'species', speciesData);
    }
    
    // 5. Disegna species chart con dati in cache
    await drawSpeciesChartFromData(speciesData);
    
    const loadTime = ((performance.now() - startTime) / 1000).toFixed(2);
    console.log(`⚡ Terreno ${plotId} caricato in ${loadTime}s`);
    
    setTimeout(() => {
      hideLoaders();
    }, 300);
    
    console.log(`✅ Terreno ${plotId} caricato con successo`);
    
  } catch (err) {
    console.error(`❌ Errore caricamento terreno ${plotId}:`, err);
    console.error('❌ Stack trace:', err.stack);
    showError('Errore nel caricamento dei dati');
    hideLoaders();
  }
}

// ========== FETCH DATI ==========
async function fetchPlotInfo(plotId) {
  console.log('🔍 [1/4] Fetch plot info...');
  try {
    const response = await fetch(`/api/users/me/plots`);
    const plots = await response.json();
    currentPlotData = plots.find(p => p.id === plotId);
    
    if (currentPlotData) {
      console.log('✅ Plot info trovato:', currentPlotData);
      // Le cards verranno aggiornate da updateDynamicCards() quando arrivano i dati meteo
    } else {
      console.warn('⚠️ Plot info non trovato per ID:', plotId);
    }
  } catch (err) {
    console.error('❌ Errore fetch plot info:', err);
  }
}

async function fetchAndSaveMeteo(plotId) {
  console.log('🔍 [2/4] Trigger salvataggio meteo...');
  try {
    const response = await fetch(`/get_open_meteo/${plotId}`, { method: 'POST' });
    if (!response.ok) throw new Error('Errore fetch meteo');
    await response.json();
    console.log('✅ [2/4] Meteo salvato nel DB');
  } catch (err) {
    console.error('❌ Errore fetch meteo:', err);
    throw err;
  }
}

// Nuova funzione per fetch dati senza rendering
async function fetchMainChartsData(plotId) {
  const response = await fetch(`/get_open_meteo/${plotId}`, { method: 'POST' });
  if (!response.ok) throw new Error('Errore fetch CO2/O2');
  const data = await response.json();
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('Nessun dato ricevuto');
  }
  return data;
}

// Nuova funzione per rendering con dati già pronti
function drawMainChartsFromData(data) {
  console.log(`📊 Rendering con ${data.length} dati orari`);
  updateMeteoTable(data);
  drawLineChart(data);
  drawHeatmap(data);
}

// Funzione legacy per compatibilità
async function fetchAndDrawMainCharts(plotId) {
  console.log('🔍 [3/4] Fetch dati CO2/O2 aggregati...');
  const data = await fetchMainChartsData(plotId);
  drawMainChartsFromData(data);
  console.log('✅ [3/4] Main charts completati');
}

// Nuova funzione per fetch species senza rendering
async function fetchSpeciesData(plotId) {
  const response = await fetch(`/co2_by_species/${plotId}`, { method: 'POST' });
  if (!response.ok) throw new Error(`Errore ${response.status}`);
  return await response.json();
}

// Nuova funzione per rendering species con dati pronti
async function drawSpeciesChartFromData(data) {
  const { totals, hourly } = data;
  if (!totals || totals.length === 0) {
    console.warn('⚠️ Nessuna specie trovata');
    return;
  }
  originalHourlyData = hourly;
  aggregatedTotalData = aggregateDataByDatetime(hourly);
  window.currentHourlyData = hourly; // 💾 Salva per filtri e zoom
  await drawSpeciesChart(totals, hourly);
}

// Funzione legacy per compatibilità
async function fetchAndDrawSpeciesChart(plotId) {
  console.log('🔍 [4/4] Fetch species breakdown...');
  const data = await fetchSpeciesData(plotId);
  await drawSpeciesChartFromData(data);
  console.log('✅ [4/4] Species chart completato');
}
    
async function fetchAndDrawSpeciesChart(plotId) {
  console.log('🔍 [4/4] Fetch species breakdown...');
  try {
    console.log('🌳 Calling /co2_by_species/' + plotId);
    const response = await fetch(`/co2_by_species/${plotId}`, { method: 'POST' });
    console.log('🌳 Response status:', response.status);
    if (!response.ok) throw new Error(`Errore ${response.status}`);
    
    const data = await response.json();
    console.log('🌳 Data received:', data);
    const { totals, hourly } = data;
    
    if (!totals || totals.length === 0) {
      console.warn('⚠️ Nessuna specie trovata');
      return;
    }
    
    // Salva dati globali
    originalHourlyData = hourly;
    aggregatedTotalData = aggregateDataByDatetime(hourly);
    window.currentHourlyData = hourly; // 💾 Salva per filtri e zoom
    
    console.log(`📥 Ricevute ${totals.length} specie, ${hourly.length} record orari`);
    
    // Disegna species chart
    console.log('🎨 Disegno species chart...');
    await drawSpeciesChart(totals, hourly);
    
    console.log('✅ [4/4] Species chart completato');
    
  } catch (err) {
    console.error('❌ Errore fetch species:', err);
    console.error('❌ Stack:', err.stack);
  }
}

// ========== AGGIORNAMENTO UI ==========
// updateSummaryCards rimossa - ora le cards sono create dinamicamente da updateDynamicCards

function updateDynamicCards(data) {
  console.log('📋 updateDynamicCards chiamata con', data?.length, 'record');
  if (!data || data.length === 0) return;
  
  // Calcola totali giornalieri
  const totalCO2 = data.reduce((sum, d) => sum + (d.co2_kg_hour || 0), 0);
  const totalO2 = data.reduce((sum, d) => sum + (d.o2_kg_hour || 0), 0);
  const totalRain = data.reduce((sum, d) => sum + (d.precipitazioni_mm || 0), 0);
  
  // Min/Max temperatura
  const temps = data.map(d => d.temperatura_c || 0).filter(t => t > 0);
  const minTemp = Math.min(...temps);
  const maxTemp = Math.max(...temps);
  
  console.log('📊 Valori calcolati:', { totalCO2, totalO2, minTemp, maxTemp, totalRain });
  
  // Crea o aggiorna le cards dinamicamente
  const container = document.getElementById('summaryCards');
  if (!container) {
    console.error('❌ Container summaryCards non trovato!');
    return;
  }
  
  // HTML delle cards
  container.innerHTML = `
    <div class="bg-white border border-gray-200 rounded p-3">
      <h3 class="text-xs text-gray-500 mb-1">Area Terreno</h3>
      <p class="text-lg font-semibold">${currentPlotData?.area?.toFixed(0) || '--'} m²</p>
    </div>
    <div class="bg-white border border-gray-200 rounded p-3">
      <h3 class="text-xs text-gray-500 mb-1">CO₂ Totale</h3>
      <p class="text-lg font-semibold text-blue-600">${totalCO2.toFixed(1)} kg/giorno</p>
    </div>
    <div class="bg-white border border-gray-200 rounded p-3">
      <h3 class="text-xs text-gray-500 mb-1">O₂ Totale</h3>
      <p class="text-lg font-semibold text-green-600">${totalO2.toFixed(1)} kg/giorno</p>
    </div>
    <div class="bg-white border border-gray-200 rounded p-3">
      <h3 class="text-xs text-gray-500 mb-1">Pioggia</h3>
      <p class="text-lg font-semibold">${totalRain.toFixed(1)} mm</p>
    </div>
    <div class="bg-white border border-gray-200 rounded p-3">
      <h3 class="text-xs text-gray-500 mb-1">Temperatura</h3>
      <p class="text-lg font-semibold">${maxTemp.toFixed(1)}°C / ${minTemp.toFixed(1)}°C</p>
    </div>
  `;
  
  console.log('✅ Cards aggiornate con successo!');
}

function setCardValue(elementId, value) {
  const el = document.getElementById(elementId);
  console.log(`📋 setCardValue(${elementId}, ${value}) - element:`, el);
  if (el) {
    el.textContent = value;
    console.log(`✅ Card ${elementId} aggiornata`);
  } else {
    console.warn(`⚠️ Elemento ${elementId} non trovato!`);
  }
}

function updateMeteoTable(data) {
  const tbody = document.getElementById("meteoTableBody");
  if (!tbody) return;
  
  tbody.innerHTML = data.map(row => `
    <tr>
      <td>${row.datetime}</td>
      <td>${row.precipitazioni_mm?.toFixed(2) ?? "-"}</td>
      <td>${row.temperatura_c?.toFixed(1) ?? "-"}</td>
      <td>${row.radiazione?.toFixed(0) ?? "-"}</td>
      <td>${row.umidita?.toFixed(0) ?? "-"}</td>
      <td>${row.co2_kg_hour?.toFixed(2) ?? "-"}</td>
      <td>${row.o2_kg_hour?.toFixed(2) ?? "-"}</td>
    </tr>
  `).join('');
  
  // Aggiorna display CO2/O2
  const last = data[data.length - 1];
  document.getElementById("co2Display").textContent = 
    `CO₂: ${last?.co2_kg_hour?.toFixed(2) ?? "--"} kg/h`;
  document.getElementById("o2Display").textContent = 
    `O₂: ${last?.o2_kg_hour?.toFixed(2) ?? "--"} kg/h`;
  
  // Aggiorna cards dinamiche
  updateDynamicCards(data);
}

// ========== GRAFICI ==========
function drawLineChart(data) {
  if (!window.lineChartInstance) {
    const chartDom = document.getElementById("lineChart");
    if (!chartDom) return;
    window.lineChartInstance = echarts.init(chartDom);
  }
  
  const times = data.map(d => d.datetime.split(' ')[1].substring(0, 5));
  const co2 = data.map(d => d.co2_kg_hour || 0);
  const o2 = data.map(d => d.o2_kg_hour || 0);

  // 💾 Salva i valori massimi per lo zoom Y
  window.originalMaxCO2 = Math.max(...co2, 0.1);
  window.originalMaxO2 = Math.max(...o2, 0.1);
  window.originalMaxValue = Math.max(window.originalMaxCO2, window.originalMaxO2);

  window.lineChartInstance.setOption({
    title: { text: "Assorbimento CO₂ / Emissione O₂", left: "center" },
    tooltip: { trigger: "axis" },
    legend: { data: ["CO₂", "O₂"], bottom: 0 },
    xAxis: { type: "category", data: times },
    yAxis: { 
      type: "value", 
      name: "kg/h", 
      min: 0,
      max: Math.ceil(window.originalMaxValue * 1.1) // Margine 10%
    },
    series: [
      { name: "CO₂", type: "line", smooth: true, data: co2, lineStyle: { color: "#0077B6" }},
      { name: "O₂", type: "line", smooth: true, data: o2, lineStyle: { color: "#00C49A" }}
    ]
  });
  
  // 🎚️ INIZIALIZZA ZOOM Y SLIDER
  initializeYZoomSlider();
}

function drawHeatmap(data) {
  if (!window.heatmapInstance) {
    const chartDom = document.getElementById("heatmapChart");
    if (!chartDom) return;
    window.heatmapInstance = echarts.init(chartDom);
  }
  
  const variables = ["precipitazioni_mm", "temperatura_c", "radiazione", "umidita", "co2_kg_hour", "o2_kg_hour"];
  const labels = ["Precipitazioni", "Temp (°C)", "Radiazione", "Umidità", "CO₂", "O₂"];
  const hours = data.map(d => d.datetime);
  const heatData = [];

  variables.forEach((v, rowIdx) => {
    data.forEach((d, colIdx) => {
      heatData.push([colIdx, rowIdx, d[v] ?? 0]);
    });
  });

  window.heatmapInstance.setOption({
    tooltip: {
      position: 'top',
      formatter: p => `${labels[p.value[1]]} @ ${hours[p.value[0]]}: <b>${p.value[2].toFixed(2)}</b>`
    },
    grid: { height: '80%', top: '10%', left: '10%', right: '5%'},
    xAxis: { 
      type: 'category', 
      data: hours, 
      splitArea: { show: true }, 
      axisLabel: { fontSize: 10, rotate: 45 }
    },
    yAxis: { type: 'category', data: labels, splitArea: { show: true }},
    visualMap: {
      min: 0,
      max: Math.max(...heatData.map(h => h[2]), 1),
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
      emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.5)' }}
    }]
  });
}

async function drawSpeciesChart(totals, hourly) {
  // Aspetta che il DOM sia pronto
  await new Promise(resolve => {
    if (document.readyState === 'complete') {
      resolve();
    } else {
      window.addEventListener('load', resolve, { once: true });
    }
  });
  
  const chartDom = document.getElementById('speciesChart');
  if (!chartDom) {
    console.error('❌ Container speciesChart non trovato');
    return;
  }
  
  // Verifica dimensioni
  if (chartDom.offsetWidth === 0) {
    chartDom.style.minHeight = '400px';
  }
  
  // Inizializza chart
  if (!window.speciesChartInstance) {
    if (typeof echarts === 'undefined') {
      console.error('❌ ECharts non caricato');
      return;
    }
    window.speciesChartInstance = echarts.init(chartDom);
  }
  
  const speciesNames = totals.map(s => s.species);
  const co2Values = totals.map(s => s.total_co2_kg);
  const o2Values = totals.map(s => s.total_o2_kg);

  const option = {
    title: {
      text: 'Assorbimento CO₂ per Specie',
      subtext: 'Clicca su una barra per filtrare i grafici',
      left: 'center',
      textStyle: { fontSize: 14, color: '#666' },
      subtextStyle: { fontSize: 11, color: '#999' }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: function (params) {
        const species = params[0].axisValue;
        const co2 = params[0].value;
        const o2 = params[1]?.value || 0;
        return `<strong>${species}</strong><br/>
                <span style="color: #023E8A">⬇ CO₂: ${co2.toFixed(2)} kg/giorno</span><br/>
                <span style="color: #00a651">⬆ O₂: ${o2.toFixed(2)} kg/giorno</span><br/>
                <em style="color: #999; font-size: 10px;">Click per filtrare</em>`;
      }
    },
    legend: {
      data: ['CO₂ Assorbita', 'O₂ Prodotto'],
      bottom: 5
    },
    grid: {
      left: '8%',
      right: '5%',
      bottom: '15%',
      top: '25%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: speciesNames,
      axisLabel: { rotate: -30, fontSize: 10, interval: 0 }
    },
    yAxis: {
      type: 'value',
      name: 'kg totali/giorno'
    },
    series: [
      {
        name: 'CO₂ Assorbita',
        type: 'bar',
        data: co2Values,
        itemStyle: {
          color: function(params) {
            const isSelected = selectedSpecies === speciesNames[params.dataIndex];
            const hasSelection = selectedSpecies !== null;
            
            if (hasSelection && !isSelected) {
              // Specie non selezionata -> trasparente
              return 'rgba(2, 62, 138, 0.25)'; // #023E8A con opacity 0.25
            } else if (isSelected) {
              // Specie selezionata -> colore intenso
              return '#01305F';
            } else {
              // Nessuna selezione -> colore normale
              return '#023E8A';
            }
          }
        },
        barWidth: '35%'
      },
      {
        name: 'O₂ Prodotto',
        type: 'bar',
        data: o2Values,
        itemStyle: {
          color: function(params) {
            const isSelected = selectedSpecies === speciesNames[params.dataIndex];
            const hasSelection = selectedSpecies !== null;
            
            if (hasSelection && !isSelected) {
              // Specie non selezionata -> trasparente
              return 'rgba(0, 166, 81, 0.25)'; // #00a651 con opacity 0.25
            } else if (isSelected) {
              // Specie selezionata -> colore intenso
              return '#00853f';
            } else {
              // Nessuna selezione -> colore normale
              return '#00a651';
            }
          }
        },
        barWidth: '35%'
      }
    ]
  };

  // ⚡ EVENTO CLICK: Filtra gli altri grafici con trasparenza
  window.speciesChartInstance.off('click'); // Rimuovi listener precedenti
  window.speciesChartInstance.on('click', function (params) {
    if (params.componentType === 'series') {
      const clickedSpecies = speciesNames[params.dataIndex];
      
      // Toggle selezione
      if (selectedSpecies === clickedSpecies) {
        selectedSpecies = null; // Deseleziona
        console.log('🔄 Filtro rimosso - mostra tutti i dati');
      } else {
        selectedSpecies = clickedSpecies;
        console.log(`🌳 Filtro attivo: ${selectedSpecies}`);
      }

      // Aggiorna il grafico delle specie (evidenzia selezione)
      window.speciesChartInstance.setOption(option);

      // 🔥 FILTRA GLI ALTRI GRAFICI
      filterChartsBySpecies(hourly, selectedSpecies);
      
      // Aggiorna l'indicatore del filtro
      updateSpeciesFilterIndicator(selectedSpecies);
    }
  });

  // ⚡ CLICK FUORI: Rimuovi filtro quando si clicca fuori dal grafico
  const speciesContainer = document.getElementById('speciesChart').parentElement;
  if (speciesContainer && !speciesContainer._clickOutsideAdded) {
    document.addEventListener('click', function(event) {
      const isInsideChart = speciesContainer.contains(event.target);
      const isFilterButton = event.target.closest('#clearSpeciesFilter');
      
      if (!isInsideChart && !isFilterButton && selectedSpecies) {
        selectedSpecies = null;
        console.log('🔄 Filtro rimosso - click fuori dal grafico');
        
        // Aggiorna tutti i grafici
        window.speciesChartInstance.setOption(option);
        filterChartsBySpecies(hourly, null);
        updateSpeciesFilterIndicator(null);
      }
    });
    speciesContainer._clickOutsideAdded = true; // Evita duplicati
  }

  window.speciesChartInstance.setOption(option);
  console.log(`✅ Species chart renderizzato: ${totals.length} specie`);
}

// Aggiorna badge filtro specie
function updateFilterBadge(species) {
  const badge = document.getElementById('speciesFilterBadge');
  const clearBtn = document.getElementById('clearSpeciesFilter');
  
  if (species) {
    if (badge) badge.textContent = species;
    if (clearBtn) clearBtn.classList.remove('hidden');
  } else {
    if (badge) badge.textContent = 'Tutte le specie';
    if (clearBtn) clearBtn.classList.add('hidden');
  }
}

// 🏷️ INDICATORE FILTRO ATTIVO
function updateSpeciesFilterIndicator(species) {
  let indicator = document.getElementById('speciesFilterIndicator');
  
  if (species) {
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'speciesFilterIndicator';
      indicator.style.cssText = `
        position: absolute; top: 10px; right: 10px; z-index: 1000;
        background: rgba(0,0,0,0.8); color: white; padding: 8px 12px;
        border-radius: 15px; font-size: 12px; font-weight: bold;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      `;
      const speciesContainer = document.getElementById('speciesChart');
      if (speciesContainer) {
        speciesContainer.style.position = 'relative';
        speciesContainer.appendChild(indicator);
      }
    }
    indicator.innerHTML = `🌳 Filtro: ${species} <span style="margin-left:8px;cursor:pointer;opacity:0.7;" onclick="clearSpeciesFilter()">✖</span>`;
    indicator.style.display = 'block';
  } else if (indicator) {
    indicator.style.display = 'none';
  }
}

// 🧹 RIMUOVI FILTRO SPECIE
function clearSpeciesFilter() {
  selectedSpecies = null;
  console.log('🔄 Filtro rimosso - pulsante X');
  
  if (window.speciesChartInstance) {
    const option = window.speciesChartInstance.getOption();
    window.speciesChartInstance.setOption(option);
  }
  
  if (window.currentHourlyData) {
    filterChartsBySpecies(window.currentHourlyData, null);
  }
  
  updateSpeciesFilterIndicator(null);
  updateFilterBadge(null);
}

// Funzione per rimuovere il filtro (chiamata dal pulsante)
function clearSpeciesFilter() {
  selectedSpecies = null;
  updateFilterBadge(null);
  
  // Ridisegna il grafico species
  if (window.speciesChartInstance) {
    window.speciesChartInstance.setOption({
      series: [{
        itemStyle: { color: '#023E8A' }
      }, {
        itemStyle: { color: '#00a651' }
      }]
    });
  }
  
  // Ripristina dati aggregati
  filterChartsBySpecies(originalHourlyData, null);
}

// ========== FILTRI ==========
function filterChartsBySpecies(hourlyData, species) {
  if (!hourlyData) return;
  
  let filteredData;
  if (species) {
    // Filtra per specie selezionata
    filteredData = hourlyData.filter(row => row.species === species);
    console.log(`🔍 Filtro: ${species} → ${filteredData.length} record`);
  } else {
    // Aggrega tutte le specie
    filteredData = aggregateDataByDatetime(hourlyData);
    console.log('🔄 Mostrando tutti i dati aggregati');
  }
  
  filteredData.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
  
  // Aggiorna tutti i componenti
  updateMeteoTable(filteredData);
  updateLineChartFiltered(filteredData);
  drawHeatmap(filteredData);
}

function updateLineChartFiltered(data) {
  if (!window.lineChartInstance) return;
  
  const times = data.map(d => d.datetime.split(' ')[1].substring(0, 5));
  const co2 = data.map(d => d.co2_kg_hour || 0);
  const o2 = data.map(d => d.o2_kg_hour || 0);
  
  // 🎚️ Mantieni zoom Y corrente dallo slider
  const currentZoom = parseInt(document.getElementById('yZoomSlider')?.value || 100);
  const zoomFactor = currentZoom / 100;
  
  // Calcola max fisso dai dati totali
  const maxCo2 = Math.max(...aggregatedTotalData.map(d => d.co2_kg_hour), 0.1);
  const maxO2 = Math.max(...aggregatedTotalData.map(d => d.o2_kg_hour), 0.1);
  const baseMaxValue = Math.max(maxCo2, maxO2);
  const zoomedMaxValue = baseMaxValue * zoomFactor;
  
  window.lineChartInstance.setOption({
    xAxis: { data: times },
    yAxis: { 
      min: 0,
      max: Math.ceil(zoomedMaxValue * 1.1) // Applica zoom e margine 10%
    },
    series: [
      { data: co2 },
      { data: o2 }
    ]
  });
  
  console.log(`📊 Line chart filtrato - zoom: ${currentZoom}%, max Y: ${zoomedMaxValue.toFixed(2)}`);
}

// ========== UTILITY ==========
function aggregateDataByDatetime(hourlyData) {
  const aggregated = {};
  hourlyData.forEach(row => {
    if (!aggregated[row.datetime]) {
      aggregated[row.datetime] = {
        datetime: row.datetime,
        co2_kg_hour: 0,
        o2_kg_hour: 0,
        precipitazioni_mm: row.precipitazioni_mm || 0,
        temperatura_c: row.temperatura_c || 0,
        radiazione: row.radiazione || 0,
        umidita: row.umidita || 0
      };
    }
    aggregated[row.datetime].co2_kg_hour += row.co2_kg_hour || 0;
    aggregated[row.datetime].o2_kg_hour += row.o2_kg_hour || 0;
  });
  return Object.values(aggregated);
}

function showLoaders() {
  document.querySelectorAll('.loading-overlay, .loading-spinner').forEach(el => {
    el.style.display = 'flex';
    el.classList.remove('hidden');
  });
}

function hideLoaders() {
  console.log('🔴 hideLoaders() chiamata');
  
  // Nascondi loader generici
  const genericLoaders = document.querySelectorAll('.loading-overlay, .loading-spinner');
  console.log(`🔴 Trovati ${genericLoaders.length} loader generici`);
  genericLoaders.forEach(el => {
    el.style.display = 'none';
    el.classList.add('hidden');
  });
  
  // Nascondi loader specifici per ID
  const loaderIds = ['chartLoader', 'heatmapLoader', 'speciesLoader', 'tableLoader', 'waterfallLoader'];
  loaderIds.forEach(id => {
    const loader = document.getElementById(id);
    if (loader) {
      console.log(`🔴 Nascondo loader: ${id}`);
      loader.style.display = 'none';
      loader.classList.add('hidden');
    } else {
      console.warn(`⚠️ Loader ${id} non trovato`);
    }
  });
  
  console.log('✅ hideLoaders() completata');
}

function showEmptyState() {
  updateMeteoTable([]);
  if (window.lineChartInstance) window.lineChartInstance.clear();
  if (window.heatmapInstance) window.heatmapInstance.clear();
}

function showError(message) {
  alert(`⚠️ ${message}`);
}

// ========== PDF EXPORT ==========
function setupPdfExport() {
  const exportBtn = document.getElementById("exportPdfBtn");
  if (!exportBtn) return;
  
  exportBtn.addEventListener("click", async (event) => {
    event.preventDefault();
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF('p', 'mm', 'a4');
      
      const terrainName = currentPlotData?.name || `Terreno ${currentPlotId}`;
      const reportDate = new Date().toLocaleDateString('it-IT', { 
        day: '2-digit', month: 'long', year: 'numeric' 
      });
      
      // Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(19);
      doc.text(terrainName, 15, 20);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.text(`Report del ${reportDate}`, 15, 26);

      // Summary cards
      doc.setFontSize(14);
      doc.text('Riepilogo Dati', 15, 55);
      
      const summaryBody = [];
      document.querySelectorAll('section.mt-4 .bg-white').forEach(card => {
        const label = card.querySelector('h3')?.innerText;
        const value = card.querySelector('p')?.innerText;
        if (label && value) summaryBody.push([label, value]);
      });

      doc.autoTable({
        head: [['Parametro', 'Valore']],
        body: summaryBody,
        startY: 61,
        margin: { left: 15 },
        tableWidth: 180,
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [75, 85, 99], textColor: 255, fontSize: 10 }
      });

      let nextY = doc.lastAutoTable.finalY + 30;
      
      // Line chart
      if (window.lineChartInstance) {
        const imgData = window.lineChartInstance.getDataURL({
          type: 'png', pixelRatio: 2, backgroundColor: '#fff'
        });
        const imgProps = doc.getImageProperties(imgData);
        const pdfWidth = 190;
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        doc.addImage(imgData, 'PNG', 15, nextY + 7, pdfWidth, pdfHeight);
      }

      doc.addPage();
      
      // Table
      const meteoTable = document.getElementById('meteoTableBody');
      if (meteoTable && meteoTable.rows.length > 0) {
        doc.setFontSize(14);
        doc.text('Dati Orari', 15, 20);
        
        const head = [['Ora', 'Prec(mm)', 'Temp(°C)', 'Rad', 'Umid', 'CO₂(kg/h)', 'O₂(kg/h)']];
        const body = Array.from(meteoTable.rows).map(row => 
          Array.from(row.cells).map(cell => cell.innerText)
        );
        
        doc.autoTable({
          head, body, startY: 27,
          margin: { left: 15 },
          tableWidth: 180,
          styles: { fontSize: 7, cellPadding: 1.5 },
          headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 8 }
        });
      }
      
      const filename = `${terrainName.replace(/ /g, '_')}_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);
      
    } catch (error) {
      console.error("❌ Errore PDF:", error);
      alert("Errore durante l'esportazione del PDF.");
    }
  });
}

// ========== NAVBAR E UI HELPERS (ex-Dashcharts.js) ==========
window.waterfallChartInstance = null;

// Navbar sticky e hamburger menu (gestito nel DOMContentLoaded principale)
// La logica navbar è stata spostata nel listener principale a riga 18

// ========== FUNZIONI LEGACY DA DASHCHARTS (per compatibilità) ==========

// Seleziona un terreno (chiamato sia dal dropdown che dagli indicators)
async function selectTerreno(terrenoId) {
    if (currentPlotId === terrenoId) return; // Già selezionato
    
    console.log(`🎯 Terreno selezionato: ${terrenoId}`);
    
    // Aggiorna UI
    const selector = document.getElementById('terrenoSelector');
    if (selector) selector.value = terrenoId;
    
    // Aggiorna classi attive sugli indicators
    document.querySelectorAll('.terreno-indicator').forEach(indicator => {
        if (parseInt(indicator.dataset.terrenoId) === terrenoId) {
            indicator.classList.add('active');
        } else {
            indicator.classList.remove('active');
        }
    });
    
    // Usa la funzione principale loadTerreno
    await loadTerreno(terrenoId);
}

// Funzione per ricaricare i dati del terreno corrente
async function refreshData() {
    if (!currentPlotId) {
        console.warn('⚠️ Nessun terreno selezionato');
        return;
    }
    
    console.log(`🔄 Ricarico dati per terreno ${currentPlotId}`);
    try {
        await loadTerreno(currentPlotId);
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

// Listener per il cambio dal dropdown (già gestito in populateTerrenoSelector)
// Rimossa chiamata duplicata a loadTerreni() che causava errori

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
let isCompactView = true; // Default: vista compatta

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

// ========== VISTA COMPATTA WINDOWS STYLE (PERMANENTE) ==========
function initializeCompactView() {
    console.log('🪟 Vista Windows Grid attivata permanentemente');
    // La vista è sempre attiva tramite classe CSS statica
    // Non serve toggle, è lo stile default
}

// 🎚️ INIZIALIZZAZIONE ZOOM Y SLIDER
function initializeYZoomSlider() {
  const slider = document.getElementById('yZoomSlider');
  const valueDisplay = document.getElementById('yZoomValue');
  
  if (!slider || !valueDisplay) return;
  
  // Rimuovi listener precedenti per evitare duplicati
  slider.removeEventListener('input', handleYZoom);
  
  // Aggiungi nuovo listener
  slider.addEventListener('input', handleYZoom);
  
  // Imposta valore iniziale
  valueDisplay.textContent = '100%';
  slider.value = 100;
}

// 🔍 GESTIONE ZOOM Y
function handleYZoom(event) {
  const zoomPercent = parseInt(event.target.value);
  const valueDisplay = document.getElementById('yZoomValue');
  
  if (valueDisplay) {
    valueDisplay.textContent = `${zoomPercent}%`;
  }
  
  // Applica zoom al line chart
  if (window.lineChartInstance && window.originalMaxValue) {
    const zoomFactor = zoomPercent / 100;
    const newMaxValue = window.originalMaxValue * zoomFactor;
    
    window.lineChartInstance.setOption({
      yAxis: {
        min: 0,
        max: Math.ceil(newMaxValue * 1.1) // Mantieni margine 10%
      }
    });
    
    console.log(`🔍 Zoom Y applicato: ${zoomPercent}% (max: ${newMaxValue.toFixed(2)} kg/h)`);
  }
}

// ========== ESPORTA FUNZIONI GLOBALI ==========
window.loadTerreno = loadTerreno; // Per compatibilità con Dashcharts.js
