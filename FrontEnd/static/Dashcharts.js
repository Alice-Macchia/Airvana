

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

// Simula il caricamento dei dati e nasconde i loader
setTimeout(() => {
    // Nasconde i loader delle cards
    document.getElementById('terrenoValue').innerHTML = '2000m2';
    document.getElementById('co2Value').innerHTML = '245.2 kg';
    document.getElementById('o2Value').innerHTML = '181.4 kg';
    document.getElementById('pioggiaValue').innerHTML = '4.3 mm';
    document.getElementById('tempValue').innerHTML = '28°C / 16°C';
    
    // Nasconde i loader dei display CO₂ e O₂
    document.getElementById('co2Display').innerHTML = 'CO₂: -- kg/h';
    document.getElementById('o2Display').innerHTML = 'O₂: -- kg/h';
    
    // Nasconde il loader del grafico
    const chartLoader = document.getElementById('chartLoader');
    if (chartLoader) chartLoader.classList.add('hidden');
    
    // Nasconde il loader della tabella
    const tableLoader = document.getElementById('tableLoader');
    if (tableLoader) tableLoader.style.display = 'none';
    
    // Nasconde il loader della heatmap
    const heatmapLoader = document.getElementById('heatmapLoader');
    if (heatmapLoader) heatmapLoader.classList.add('hidden');

    // Nasconde il loader del grafico a cascata
    const waterfallLoader = document.getElementById('waterfallLoader');
    if (waterfallLoader) waterfallLoader.classList.add('hidden');

    // Inizializza il grafico a cascata
    initWaterfallChart();
}, 2000); // Simula 2 secondi di caricamento

function initWaterfallChart() {
    const waterfallChartDom = document.getElementById('waterfallChart');
    const waterfallChart = echarts.init(waterfallChartDom);
    
    // Genera dati per l'ultimo mese (30 giorni)
    const generateMonthlyData = () => {
        const data = [];
        const today = new Date();
        
        for (let i = 29; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            
            // Simula variazioni realistiche: più assorbimento nei giorni soleggiati, meno nei giorni piovosi
            let baseValue = 8 + Math.random() * 12; // Base 8-20 kg
            
            // Simula pattern meteorologici
            if (i % 7 === 0 || i % 7 === 6) baseValue *= 0.7; // Weekend meno attivit√†
            if (Math.random() < 0.2) baseValue *= 0.3; // 20% giorni piovosi
            if (Math.random() < 0.1) baseValue *= -0.5; // 10% giorni molto negativi
            
            // Prima entry √® il valore base, le altre sono variazioni
            const value = i === 29 ? baseValue : (Math.random() - 0.5) * 10;
            
            data.push({
                name: i === 0 ? 'Oggi' : 
                        i === 1 ? 'Ieri' : 
                        `${i} giorni fa`,
                date: date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }),
                value: parseFloat(value.toFixed(1))
            });
        }
        return data;
    };
    
    const data = generateMonthlyData();

    let accumulate = 0;
    const chartData = data.map((item, index) => {
        const start = accumulate;
        accumulate += item.value;
        return {
            name: item.name,
            value: [index, start, accumulate],
            itemStyle: {
                color: item.value > 0 ? '#00a651' : '#dc3545' // Verde per aumento, rosso per diminuzione
            }
        };
    });

    const option = {
        title: {
            text: 'kg CO₂ assorbiti',
            left: 'left',
            textStyle: {
                fontSize: 14,
                color: '#666'
            }
        },
        tooltip: {
            trigger: 'axis',
            formatter: function (params) {
                const param = params[0];
                const dataIndex = param.dataIndex;
                const dayInfo = data[dataIndex];
                const change = param.value[2] - param.value[1];
                const total = param.value[2];
                return `${dayInfo.date} (${dayInfo.name})<br/>
                        Variazione: ${change > 0 ? '+' : ''}${change.toFixed(1)} kg<br/>
                        Totale cumulativo: ${total.toFixed(1)} kg`;
            }
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: data.map(item => item.date),
            axisLabel: {
                rotate: -45,
                fontSize: 10,
                interval: 2 // Mostra solo ogni 3° giorno per evitare sovrapposizioni
            }
        },
        yAxis: {
            type: 'value',
            name: 'kg CO₂',
            axisLabel: {
                formatter: '{value} kg'
            }
        },
        series: [
            {
                name: 'Assorbimento CO₂',
                type: 'custom',
                renderItem: function (params, api) {
                    const yValue = api.value(2);
                    const start = api.coord([api.value(0), api.value(1)]);
                    const end = api.coord([api.value(0), api.value(2)]);
                    const height = end[1] - start[1];
                    
                    return {
                        type: 'rect',
                        shape: {
                            x: start[0] - 8,
                            y: start[1],
                            width: 16,
                            height: height
                        },
                        style: api.style()
                    };
                },
                data: chartData,
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowOffsetY: 0,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                }
            }
        ]
    };

    waterfallChart.setOption(option);

    // Responsive
    window.addEventListener('resize', function () {
        waterfallChart.resize();
    });
}

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
    
    // Ricarica i dati per il terreno selezionato
    await refreshData();
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
        const meteoResponse = await fetch(`/get_open_meteo/${currentTerrenoId}`, {
            method: "POST"
        });
        
        if (!meteoResponse.ok) {
            const errorData = await meteoResponse.json().catch(() => ({}));
            throw new Error(errorData.detail || "Errore nel fetch meteo");
        }
        
        console.log("☁️ Meteo salvato correttamente.");
        
        // Ricarica i grafici
        await fetchAndDraw(currentTerrenoId);
        
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
        // Passa a vista compatta 2x2
        container.classList.remove('charts-normal');
        container.classList.add('charts-compact');
        icon.className = 'fas fa-list';
        text.textContent = 'Vista Normale';
    } else {
        // Torna a vista normale
        container.classList.remove('charts-compact');
        container.classList.add('charts-normal');
        icon.className = 'fas fa-th';
        text.textContent = 'Vista Compatta';
    }
    
    // Ridimensiona i grafici per adattarsi al nuovo layout con più tentativi
    // Aspetta che il CSS abbia effetto prima di ridimensionare
    setTimeout(() => {
        resizeAllCharts();
    }, 100);
    
    // Backup resize dopo più tempo per essere sicuri
    setTimeout(() => {
        resizeAllCharts();
    }, 500);
}

// Funzione helper per ridimensionare tutti i grafici
function resizeAllCharts() {
    try {
        if (lineChartInstance) {
            lineChartInstance.resize();
            console.log('📊 Line chart ridimensionato');
        }
        if (heatmapInstance) {
            heatmapInstance.resize();
            console.log('🔥 Heatmap ridimensionato');
        }
        // Il waterfallChart è creato inline quindi non serve resize manuale
    } catch (error) {
        console.error('❌ Errore nel ridimensionamento grafici:', error);
    }
}
