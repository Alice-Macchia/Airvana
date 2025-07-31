document.addEventListener('DOMContentLoaded', () => {
    const map = initMap();
    const ui = initUI();
    setupDrawing(map, ui);
    setupSpeciesForm(ui);
});

function initMap() {
    const bounds = L.latLngBounds(L.latLng(35, 6), L.latLng(47, 19));
    const map = L.map('map', {
        center: [41.9028, 12.4964],
        zoom: 6,
        minZoom: 5,
        maxBounds: bounds,
        maxBoundsViscosity: 1.0
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
    }).addTo(map);
    return map;
}

function initUI() {
    return {
        speciesSection: document.querySelector('.species-section'),
        chartsSection: document.querySelector('.charts-section'),
        speciesForm: document.getElementById('speciesForm'),
        speciesInputsDiv: document.getElementById('speciesInputs'),
        addSpeciesButton: document.getElementById('addSpecies'),
        drawingInstructions: document.getElementById('drawingInstructions'),
        doneBtn: document.getElementById('doneDrawing'),
        clearBtn: document.getElementById('clearMap'),
        editBtn: document.getElementById('editPolygon'),
        speciesCount: 1
    };
}

function setupDrawing(map, ui) {
    const drawnItems = new L.FeatureGroup().addTo(map);
    let currentPolygon = null;
    let isDrawing = true;

    const isInItaly = (lat, lng) => {
        const R = 6371;
        const dLat = (lat - 41.9028) * Math.PI / 180;
        const dLng = (lng - 12.4964) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat * Math.PI / 180) * Math.cos(41.9028 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) <= 800;
    };

    map.on('click', e => {
        if (!isDrawing) return;
        if (!isInItaly(e.latlng.lat, e.latlng.lng)) {
            ui.drawingInstructions.textContent = '⚠️ Disegna entro i confini italiani.';
            ui.drawingInstructions.classList.add('error');
            return;
        }
        ui.drawingInstructions.textContent = 'Doppio clic o "Fatto" per chiudere la forma.';
        ui.drawingInstructions.classList.remove('error');

        if (!currentPolygon) {
            currentPolygon = L.polygon([e.latlng], { color: 'green', weight: 2 }).addTo(drawnItems);
        } else {
            const points = currentPolygon.getLatLngs()[0];
            points.push(e.latlng);
            currentPolygon.setLatLngs(points);
        }

        if (currentPolygon.getLatLngs()[0].length >= 3) {
            ui.doneBtn.classList.remove('disabled');
        }
    });

    map.on('dblclick', () => {
        if (!isDrawing || !currentPolygon || currentPolygon.getLatLngs()[0].length < 3) return;
        const points = currentPolygon.getLatLngs()[0];
        points.push(points[0]);
        currentPolygon.setLatLngs(points);
        ui.doneBtn.click();
    });

    ui.doneBtn.addEventListener('click', () => {
        if (ui.doneBtn.classList.contains('disabled')) return;
        isDrawing = false;
        map.off('click');
        map.off('dblclick');
        ui.speciesSection.classList.remove('hidden');
        ui.editBtn.classList.remove('hidden');
        ui.chartsSection.classList.add('hidden');
        ui.drawingInstructions.textContent = 'Confine disegnato.';
    });

    ui.clearBtn.addEventListener('click', () => {
        drawnItems.clearLayers();
        currentPolygon = null;
        isDrawing = true;
        map.on('click');
        map.on('dblclick');
        ui.doneBtn.classList.add('disabled');
        ui.editBtn.classList.add('hidden');
        ui.speciesSection.classList.add('hidden');
        ui.chartsSection.classList.add('hidden');
        ui.speciesInputsDiv.innerHTML = getInitialSpeciesInputHTML();
        ui.speciesCount = 1;
    });

    ui.editBtn.addEventListener('click', () => {
        drawnItems.clearLayers();
        currentPolygon = null;
        isDrawing = true;
        map.on('click');
        map.on('dblclick');
        ui.doneBtn.classList.add('disabled');
        ui.editBtn.classList.add('hidden');
        ui.speciesSection.classList.add('hidden');
        ui.chartsSection.classList.add('hidden');
        ui.speciesInputsDiv.innerHTML = getInitialSpeciesInputHTML();
        ui.speciesCount = 1;
    });

    function getInitialSpeciesInputHTML() {
        return `
        <div class="species-input-group">
            <label for="plantSpecies1">Specie Vegetale:</label>
            <input type="text" id="plantSpecies1" class="plant-species-input" placeholder="Es: Quercia" required>
            <label for="plantSurface1">Superficie (m²):</label>
            <input type="number" id="plantSurface1" class="plant-surface-input" min="1" value="1" required>
        </div>`;
    }
}

function setupSpeciesForm(ui) {
    ui.addSpeciesButton.addEventListener('click', () => {
        ui.speciesCount++;
        const group = document.createElement('div');
        group.classList.add('species-input-group');
        group.innerHTML = `
            <label for="plantSpecies${ui.speciesCount}">Specie Vegetale:</label>
            <input type="text" id="plantSpecies${ui.speciesCount}" class="plant-species-input" placeholder="Es: Olivo" required>
            <label for="plantSurface${ui.speciesCount}">Superficie (m²):</label>
            <input type="number" id="plantSurface${ui.speciesCount}" class="plant-surface-input" min="1" value="1" required>
        `;
        ui.speciesInputsDiv.appendChild(group);
    });

    ui.speciesForm.addEventListener('submit', e => {
        e.preventDefault();
        const species = document.querySelectorAll('.plant-species-input');
        const surfaces = document.querySelectorAll('.plant-surface-input');
        const data = {};
        species.forEach((s, i) => {
            const name = s.value.trim();
            const value = parseInt(surfaces[i].value, 10) || 0;
            if (name && value > 0) {
                data[name] = (data[name] || 0) + value;
            }
        });
        ui.chartsSection.classList.remove('hidden');
        updateCharts(data);
    });
}

function updateCharts(plants) {
    const ctxWeather = document.getElementById('weatherChart');
    const ctxEco = document.getElementById('ecoChart');
    const ctxPie = document.getElementById('speciesPieChart');

    const dates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        return d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric' });
    });

    const temps = dates.map(() => (15 + Math.random() * 15).toFixed(1));
    const rain = dates.map(() => (Math.random() * 10).toFixed(1));
    const wind = dates.map(() => (Math.random() * 20).toFixed(1));
    const co2 = dates.map(() => (Math.random() * 50).toFixed(2));
    const o2 = dates.map(() => (Math.random() * 80).toFixed(2));

    new Chart(ctxWeather, {
        type: 'bar',
        data: {
            labels: dates,
            datasets: [
                { label: 'Temp (°C)', data: temps, backgroundColor: '#fb7185' },
                { label: 'Pioggia (mm)', data: rain, backgroundColor: '#38bdf8' },
                { label: 'Vento (km/h)', data: wind, backgroundColor: '#facc15' }
            ]
        },
        options: { responsive: true, plugins: { legend: { position: 'top' } } }
    });

    new Chart(ctxEco, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [
                { label: 'CO2 (kg)', data: co2, borderColor: '#ef4444', fill: true },
                { label: 'O2 (kg)', data: o2, borderColor: '#10b981', fill: true }
            ]
        },
        options: { responsive: true, plugins: { legend: { position: 'top' } } }
    });

    const pieLabels = Object.keys(plants);
    const pieValues = Object.values(plants);
    const pieColors = pieLabels.map(() => '#' + Math.floor(Math.random() * 16777215).toString(16));

    new Chart(ctxPie, {
        type: 'pie',
        data: {
            labels: pieLabels.length ? pieLabels : ['Nessuna specie inserita'],
            datasets: [{
                data: pieValues.length ? pieValues : [1],
                backgroundColor: pieColors.length ? pieColors : ['#d1d5db']
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
