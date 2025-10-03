// Variabili globali per la mappa
let mainMap;
let drawnItems;
let mainDrawnItems;
let addressMarker; // Marker per l'indirizzo cercato
let currentTerrenoId = null;
let selectedTerrenoId = null;
let draftTerreno = null;
let drawControl = null;

// Variabili globali per i dati dell'utente (da popolare al DOMContentLoaded)
let currentUserId = null;
let currentUserEmail = "test@example.com"; // Valore di default per il testing

const stilePoligono = {
    color: "#2e7d32",
    weight: 3,
    opacity: 1,
    fillColor: "#81c784",
    fillOpacity: 0.5
};

const selectedStilePoligono = {
    color: "#007bff",
    weight: 4,
    opacity: 1,
    fillColor: "#66b3ff",
    fillOpacity: 0.7
};

let terreni = [];      // Questo array conterrà tutti i terreni gestiti
let co2Chart;

const ALL_SPECIES_NAMES = [
    "Abete bianco", "Abete rosso", "Acero", "Anguria", "Barbabietola", "Betulla",
    "Castagno", "Cavolo", "Cetriolo", "Ciliegio", "Cipresso", "Erba medica",
    "Eucalipto", "Fagiolo", "Faggio", "Fragola", "Frassino", "Girasole", "Grano",
    "Larice", "Lattuga", "Mais", "Melanzana", "Melone", "Nocciolo", "Olmo",
    "Patata", "Peperone", "Pino", "Pisello", "Pioppo", "Pomodoro", "Quercia",
    "Riso", "Salice", "Soia", "Tiglio", "Ulivo", "Zucchina"
];

// --- Inizio Funzioni JavaScript ---

function initializeMainMap() {
    if (mainMap) {
        mainMap.remove();
    }
    mainMap = L.map('main-map-container').setView([42.5, 12.5], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: 'Map data © OpenStreetMap contributors'
    }).addTo(mainMap);

    mainDrawnItems = new L.FeatureGroup();
    mainMap.addLayer(mainDrawnItems);

    drawControl = new L.Control.Draw({
        draw: {
            polygon: {
                allowIntersection: false,
                showArea: true,
                shapeOptions: stilePoligono
            },
            polyline: false,
            rectangle: false,
            circle: false,
            marker: false,
            circlemarker: false
        },
        edit: {featureGroup: mainDrawnItems}
    });
    mainMap.addControl(drawControl);

    mainMap.on(L.Draw.Event.CREATED, onMapPolygonCreated);
    mainMap.on(L.Draw.Event.EDITED, onMapLayerEdited);
    mainMap.on(L.Draw.Event.DELETED, onMapLayerDeleted);
}

function calcolaArea(poligono) {
    const area = L.GeometryUtil.geodesicArea(poligono.getLatLngs()[0]);
    return (area / 10000).toFixed(2);
}

function calcolaPerimetro(poligono) {
    let perimetro = 0;
    const latlngs = poligono.getLatLngs()[0];
    for (let i = 0; i < latlngs.length; i++) {
        if (i === 0) continue;
        perimetro += latlngs[i].distanceTo(latlngs[i - 1]);
    }
    perimetro += latlngs[latlngs.length - 1].distanceTo(latlngs[0]);
    return perimetro.toFixed(2);
}

const co2Rates = {
    quercia: 21.5,
    pino: 17.2,
    mais: 2.4,
    faggio: 19.0,
    betulla: 18.1,
    castagno: 22.3,
    acero: 16.5,
    olmo: 14.2,
    pioppo: 23.8,
    cipresso: 15.6,
    larice: 20.0,
    'abete rosso': 18.8, // Nota: nomi con spazi devono essere stringhe
    'abete bianco': 19.5, // Nota: nomi con spazi devono essere stringhe
    salice: 12.7,
    eucalipto: 25.0,
    tiglio: 17.4,
    frassino: 16.8,
    nocciolo: 13.6,
    ciliegio: 14.4,
    ulivo: 11.5,
    grano: 1.7,
    riso: 2.1,
    soia: 2.0,
    girasole: 2.2,
    barbabietola: 2.8,
    patata: 1.9,
    pomodoro: 1.6,
    lattuga: 0.8,
    cavolo: 1.3,
    zucchina: 1.5,
    melanzana: 1.4,
    peperone: 1.4,
    fagiolo: 1.2,
    pisello: 1.0,
    cetriolo: 1.3,
    anguria: 2.5,
    melone: 2.3,
    fragola: 0.9,
    'erba medica': 3.0, // Nota: nomi con spazi devono essere stringhe
    default: 15 // Mantieni un default se una specie non è nella lista
};

function stimaCO2(speciesArray, area_ha) {
    let totalCo2 = 0;
    const DENSITA_IMPLICITA_PER_M2 = 0.01;; //////////////////

    speciesArray.forEach(s => {
        const specieKey = s.name.toLowerCase();
        const rate = co2Rates[specieKey] || co2Rates.default;
        const quantityInM2 = s.quantity;

        if (typeof quantityInM2 === 'number' && quantityInM2 > 0) {
            // Calcola il numero di "unità di stima" (es. piante) basato sulla densità
            const numeroUnitaStima = quantityInM2 * DENSITA_IMPLICITA_PER_M2;
            totalCo2 += rate * numeroUnitaStima;
        }
    });
    return totalCo2.toFixed(2);
}

function onMapPolygonCreated(e) {
    console.log('onMapPolygonCreated chiamata con:', e);
    console.log('draftTerreno:', draftTerreno);
    console.log('selectedTerrenoId:', selectedTerrenoId);
    
    // Permetti il disegno se c'è un terreno in bozza O un terreno selezionato
    if (!draftTerreno && !selectedTerrenoId) {
        showCustomAlert("Aggiungi prima un nome per il terreno prima di disegnare sulla mappa.");
        mainDrawnItems.removeLayer(e.layer); // Rimuove il layer disegnato se nessun terreno è attivo
        return;
    }

    // Usa il terreno in bozza se presente, altrimenti cerca nell'array terreni
    const activeTerreno = draftTerreno || terreni.find(t => t.id === selectedTerrenoId);
    console.log('activeTerreno:', activeTerreno);
    
    if (activeTerreno) {
        // Se esiste già un layer per questo terreno, lo rimuove prima di aggiungere il nuovo
        if (activeTerreno.leafletLayer) {
            console.log('Rimuovo layer esistente per:', activeTerreno.name);
            mainDrawnItems.removeLayer(activeTerreno.leafletLayer);
        }
        
        // Assegna il nuovo layer al terreno
        activeTerreno.leafletLayer = e.layer;
        console.log('Layer assegnato al terreno:', activeTerreno.name);
        
        // Applica lo stile selezionato (blu)
        activeTerreno.leafletLayer.setStyle(selectedStilePoligono);
        console.log('Stile applicato al layer');
        
        // Aggiungi il layer alla mappa
        mainDrawnItems.addLayer(activeTerreno.leafletLayer);
        console.log('Layer aggiunto a mainDrawnItems');
        
        // Forza il refresh della mappa
        mainMap.invalidateSize();

        // Aggiorna le coordinate del terreno
        activeTerreno.coordinate = activeTerreno.leafletLayer.getLatLngs()[0].map(latlng => ({
            lat: latlng.lat,
            long: latlng.lng
        }));
        console.log('Coordinate aggiornate:', activeTerreno.coordinate);

        // Calcola e aggiorna area e perimetro
        activeTerreno.area_ha = parseFloat(calcolaArea(activeTerreno.leafletLayer));
        activeTerreno.perimetro_m = parseFloat(calcolaPerimetro(activeTerreno.leafletLayer));
        console.log('Area e perimetro calcolati:', activeTerreno.area_ha, activeTerreno.perimetro_m);

        // Aggiorna i campi di input nel pannello dei dettagli
        const areaInput = document.getElementById("area");
        const perimetroInput = document.getElementById("perimetro");
        if (areaInput) areaInput.value = `${activeTerreno.area_ha} ha`;
        if (perimetroInput) perimetroInput.value = `${activeTerreno.perimetro_m} m`;

        // Mostra popup sulla mappa e messaggio all'utente
        activeTerreno.leafletLayer.bindPopup(`Area: ${activeTerreno.area_ha} ha<br>Perimetro: ${activeTerreno.perimetro_m} m`).openPopup();
        
        // Messaggio diverso per terreni in bozza vs salvati
        if (draftTerreno) {
            showCustomAlert(`Poligono disegnato per il terreno in bozza "${activeTerreno.name}". Ora puoi aggiungere specie e cliccare 'Salva dati terreno'.`);
        } else {
            showCustomAlert(`Poligono disegnato per "${activeTerreno.name}". Clicca 'Salva dati terreno' per aggiornare.`);
        }
        
        // Mostra le sezioni coordinate e vertici
        const coordinatesSection = document.getElementById('coordinates-section');
        const polygonVerticesSection = document.getElementById('polygon-vertices-section');
        if (coordinatesSection) coordinatesSection.style.display = 'flex';
        if (polygonVerticesSection) polygonVerticesSection.style.display = 'block';

        // Aggiorna indirizzo, coordinate del centroide e vertici
        updateAddressAndCoordinates();
        displayPolygonVertices(activeTerreno.coordinate);
        updateDashboard(); // Aggiorna il dashboard generale
        
        console.log('Poligono creato con successo per:', activeTerreno.name);
    } else {
        console.error('Nessun terreno attivo trovato');
    }
}

function onMapLayerEdited(e) {
    e.layers.eachLayer(layer => {
        // Cerca il terreno sia nell'array terreni che nella bozza
        let terreno = terreni.find(t => t.leafletLayer && L.Util.stamp(t.leafletLayer) === L.Util.stamp(layer));
        if (!terreno && draftTerreno && draftTerreno.leafletLayer && L.Util.stamp(draftTerreno.leafletLayer) === L.Util.stamp(layer)) {
            terreno = draftTerreno;
        }
        
        if (terreno) {
            // Aggiorna le coordinate del terreno
            terreno.coordinate = layer.getLatLngs()[0].map(latlng => ({
                lat: latlng.lat,
                long: latlng.lng
            }));

            // Ricalcola area e perimetro
            terreno.area_ha = parseFloat(calcolaArea(layer));
            terreno.perimetro_m = parseFloat(calcolaPerimetro(layer));

            // Se il terreno modificato è quello attualmente attivo, aggiorna i campi di input
            if ((draftTerreno && draftTerreno.id === terreno.id) || selectedTerrenoId === terreno.id) {
                document.getElementById("area").value = `${terreno.area_ha} ha`;
                document.getElementById("perimetro").value = `${terreno.perimetro_m} m`;
            }

            // Aggiorna popup sulla mappa e messaggio all'utente
            layer.bindPopup(`Area: ${terreno.area_ha} ha<br>Perimetro: ${terreno.perimetro_m} m`).openPopup();
            
            // Messaggio diverso per terreni in bozza vs salvati
            if (draftTerreno && draftTerreno.id === terreno.id) {
                showCustomAlert(`Poligono per il terreno in bozza "${terreno.name}" modificato. Clicca 'Salva dati terreno' per salvare definitivamente.`);
            } else {
                showCustomAlert(`Poligono per "${terreno.name}" modificato. Clicca 'Salva dati terreno' per aggiornare.`);
            }
            
            updateAddressAndCoordinates(); // Aggiorna centroide/indirizzo
            displayPolygonVertices(terreno.coordinate); // Aggiorna visualizzazione vertici
            updateDashboard(); // Aggiorna il dashboard generale
        }
    });
}

function onMapLayerDeleted(e) {
    e.layers.eachLayer(layer => {
        // Cerca il terreno sia nell'array terreni che nella bozza
        let terreno = terreni.find(t => t.leafletLayer && L.Util.stamp(t.leafletLayer) === L.Util.stamp(layer));
        if (!terreno && draftTerreno && draftTerreno.leafletLayer && L.Util.stamp(draftTerreno.leafletLayer) === L.Util.stamp(layer)) {
            terreno = draftTerreno;
        }
        
        if (terreno) {
            // Rimuove il riferimento al layer e resetta i dati geometrici
            terreno.leafletLayer = null;
            terreno.coordinate = [];
            terreno.area_ha = 0;
            terreno.perimetro_m = 0;

            // Se il terreno eliminato era quello attualmente attivo, resetta i campi di input
            if ((draftTerreno && draftTerreno.id === terreno.id) || selectedTerrenoId === terreno.id) {
                document.getElementById("area").value = "Disegna sulla mappa";
                document.getElementById("perimetro").value = "Disegna sulla mappa";
            }
            
            // Messaggio diverso per terreni in bozza vs salvati
            if (draftTerreno && draftTerreno.id === terreno.id) {
                showCustomAlert(`Poligono per il terreno in bozza "${terreno.name}" eliminato. Clicca 'Salva dati terreno' per salvare definitivamente.`);
            } else {
                showCustomAlert(`Poligono per "${terreno.name}" eliminato. Clicca 'Salva dati terreno' per aggiornare.`);
            }
            
            // Resetta visualizzazione coordinate e vertici
            document.getElementById("centroid-display").textContent = "Centroide: N/A";
            document.getElementById("vertices-display").innerHTML = "Nessun poligono selezionato o disegnato.";
            document.getElementById('polygon-vertices-section').style.display = 'none';
            updateDashboard(); // Aggiorna il dashboard generale
        }
    });
}

function displayPolygonVertices(coordinates) {
    const verticesDisplay = document.getElementById('vertices-display');
    verticesDisplay.innerHTML = ''; // Pulisce i vertici precedenti

    if (!coordinates || coordinates.length === 0) {
        verticesDisplay.innerHTML = 'Nessun poligono selezionato o disegnato.';
        return;
    }

    const ul = document.createElement('ul');
    ul.style.listStyle = 'none'; // Rimuove i bullet points di default
    ul.style.padding = '0';      // Rimuove il padding di default
    ul.style.maxHeight = '200px';// Limita l'altezza e aggiunge scroll se necessario
    ul.style.overflowY = 'auto';

    coordinates.forEach((coord, index) => {
        const li = document.createElement('li');
        li.textContent = `Vertice ${index + 1}: Latitudine ${coord.lat.toFixed(6)}, Longitudine ${coord.long.toFixed(6)}`;
        li.style.marginBottom = '5px'; // Spaziatura tra i vertici
        ul.appendChild(li);
    });
    verticesDisplay.appendChild(ul);
}


function renderTerreniList() {
    console.log('renderTerreniList chiamata - mostra solo il terreno in bozza nella sidebar');
    
    const terrenoList = document.getElementById('terreno-list');
    if (!terrenoList) {
        console.log('Elemento terreno-list non trovato');
        return;
    }
    
    // Pulisce la lista esistente
    terrenoList.innerHTML = '';
    
    // Mostra solo il terreno in bozza (se presente)
    if (draftTerreno) {
        const li = document.createElement('li');
        li.id = `terreno-item-${draftTerreno.id}`;
        li.className = 'terreno-item current';
        
        // Mostra il nome del terreno in bozza con icone per modifica/elimina
        li.innerHTML = `
            <span class="terreno-name">${draftTerreno.name}</span>
            <div class="terreno-actions">
                <button onclick="editDraftTerrenoName()" class="action-button edit" title="Modifica nome">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button onclick="deleteDraftTerreno()" class="action-button delete" title="Elimina">
                     <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `;
        
        terrenoList.appendChild(li);
    }
    
    // Nasconde i pannelli dei dettagli se non ci sono terreni in bozza
    if (!draftTerreno) {
        document.getElementById('selected-terrain-details').style.display = 'none';
        document.getElementById('coordinates-section').style.display = 'none';
        document.getElementById('polygon-vertices-section').style.display = 'none';
        // NON pulire i layer dalla mappa qui - permette al poligono di rimanere visibile
        // if (mainDrawnItems) {
        //     mainDrawnItems.clearLayers(); // Pulisce anche i layer dalla mappa
        // }
        return;
    }

    // Mostra i pannelli solo se c'è un terreno in bozza
    document.getElementById('selected-terrain-details').style.display = 'flex';
    document.getElementById('coordinates-section').style.display = 'flex';
    
    if (draftTerreno.leafletLayer) {
        document.getElementById('polygon-vertices-section').style.display = 'block';
    } else {
        document.getElementById('polygon-vertices-section').style.display = 'none';
    }
}

function addTerreno() {
    const input = document.getElementById('terreno-name-input');
    let newName = input.value.trim();

    if (!newName) {
        showCustomAlert('Inserisci un nome per il nuovo terreno.');
        return;
    }

    // Gestisce nomi duplicati aggiungendo un contatore
    let counter = 1;
    let originalName = newName;
    while (terreni.some(t => t.name === newName)) {
        newName = `${originalName} (${counter})`;
        counter++;
    }
    
    // Crea il terreno in bozza (non ancora salvato)
    draftTerreno = {
        id: Date.now(), // ID univoco basato sul timestamp
        name: newName,
        species: [],
        area_ha: 0,
        perimetro_m: 0,
        co2_kg_annuo: 0,
        coordinate: [],
        leafletLayer: null // Nessun layer sulla mappa all'inizio
    };

    input.value = ''; // Pulisce l'input
    
    // Aggiorna i campi di input e mostra i pannelli dei dettagli
    document.getElementById("current-terrain-name").textContent = draftTerreno.name;
    document.getElementById("area").value = 'Disegna sulla mappa';
    document.getElementById("perimetro").value = 'Disegna sulla mappa';
    
    // Mostra i pannelli dei dettagli
    document.getElementById('selected-terrain-details').style.display = 'flex';
    document.getElementById('coordinates-section').style.display = 'flex';
    document.getElementById('polygon-vertices-section').style.display = 'none';
    
    // Pulisce la lista delle specie e gli input
    renderSpeciesListForSelectedTerrain();
    document.getElementById("new-species-name-input").value = "";
    document.getElementById("new-species-quantity-input").value = "";
    
    // Aggiorna solo la sidebar per mostrare il terreno in bozza
    renderTerreniList();
    
    // NON aggiorna la tabella del secondo menu (solo dopo il salvataggio)
    // NON salva nel database (solo dopo "Salva dati terreno")
    
    showCustomAlert(`Terreno "${newName}" aggiunto in bozza. Ora puoi disegnarlo sulla mappa e aggiungere le specie. Clicca "Salva dati terreno" per salvarlo definitivamente.`);
}

function selectTerreno(id) {
    // Se c'è un terreno in bozza, non permettere la selezione di altri terreni
    if (draftTerreno) {
        showCustomAlert("Completa prima il terreno in bozza. Clicca 'Salva dati terreno' o elimina il terreno in bozza.");
        return;
    }
    
    // Deseleziona il terreno precedentemente selezionato (stile e classe CSS)
    if (selectedTerrenoId) {
        const prevSelectedTerreno = terreni.find(t => t.id === selectedTerrenoId);
        if (prevSelectedTerreno && prevSelectedTerreno.leafletLayer) {
            prevSelectedTerreno.leafletLayer.setStyle(stilePoligono); // Ripristina stile normale
        }
        const prevSelectedLi = document.getElementById(`terreno-item-${selectedTerrenoId}`);
        if (prevSelectedLi) {
            prevSelectedLi.classList.remove('selected');
        }
    }

    selectedTerrenoId = id; // Imposta il nuovo ID selezionato

    // Evidenzia il nuovo terreno selezionato nella lista
    const newSelectedLi = document.getElementById(`terreno-item-${selectedTerrenoId}`);
    if (newSelectedLi) {
        newSelectedLi.classList.add('selected');
    }

    clearAddressMarker(); // Pulisce il marker di ricerca indirizzo

    const terreno = terreni.find(t => t.id === id);
    if (terreno) {
        // Aggiorna i dettagli nel pannello laterale
        document.getElementById("current-terrain-name").textContent = terreno.name;
        document.getElementById("area").value = terreno.area_ha > 0 ? `${terreno.area_ha} ha` : 'Disegna sulla mappa';
        document.getElementById("perimetro").value = terreno.perimetro_m > 0 ? `${terreno.perimetro_m} m` : 'Disegna sulla mappa';

        renderSpeciesListForSelectedTerrain(); // Aggiorna la lista delle specie per questo terreno
        document.getElementById("new-species-name-input").value = ""; // Pulisce input aggiunta specie
        document.getElementById("new-species-quantity-input").value = "";

        // Mostra i pannelli dei dettagli
        document.getElementById('selected-terrain-details').style.display = 'flex';
        document.getElementById('coordinates-section').style.display = 'flex';

        // Gestisce la visualizzazione del poligono sulla mappa
        if (terreno.leafletLayer) {
            terreno.leafletLayer.setStyle(selectedStilePoligono); // Applica stile selezionato
            mainMap.fitBounds(terreno.leafletLayer.getBounds(), { padding: [20, 20], maxZoom: 16 }); // Centra la mappa sul poligono
            updateAddressAndCoordinates(); // Aggiorna centroide/indirizzo
            displayPolygonVertices(terreno.coordinate); // Mostra i vertici
            document.getElementById('polygon-vertices-section').style.display = 'block';
        } else {
            // Se non c'è un poligono, resetta i display relativi
            document.getElementById("centroid-display").textContent = "Centroide: N/A";
            document.getElementById("vertices-display").innerHTML = "Nessun poligono selezionato o disegnato.";
            document.getElementById('polygon-vertices-section').style.display = 'none';
        }
        mainMap.invalidateSize(); // Forza Leaflet a ricalcolare le dimensioni della mappa (utile se era nascosta)
        updateDashboard(); // Aggiorna il dashboard generale
    }
}

function editTerrenoName(id) {
    const terreno = terreni.find(t => t.id === id);
    if (!terreno) return;

    showCustomPrompt(`Modifica nome per "${terreno.name}":`, terreno.name, (newName) => {
        if (newName !== null && newName.trim() !== '' && newName.trim() !== terreno.name) {
            terreno.name = newName.trim();
            if (selectedTerrenoId === id) { // Se il terreno modificato è quello selezionato
                document.getElementById("current-terrain-name").textContent = terreno.name; // Aggiorna il nome nel pannello
            }
            renderTerreniList(); // Aggiorna la sidebar del primo menu
            updateTerreniTable(); // Aggiorna la tabella riepilogativa
            updateAllLayerPopups(); // Aggiorna i popup sulla mappa
            
            // Salva nel database
            saveTerreniToDatabase();
        }
    });
}

function deleteTerreno(id) {
    showCustomConfirm('Sei sicuro di voler eliminare questo terreno?', (confirmed) => {
        if (!confirmed) {
            return;
        }

        const index = terreni.findIndex(t => t.id === id);
        if (index > -1) {
            const terrainToDelete = terreni[index];
            // Rimuove il layer dalla mappa se esiste
            if (terrainToDelete.leafletLayer) {
                mainDrawnItems.removeLayer(terrainToDelete.leafletLayer);
            }
            terreni.splice(index, 1); // Rimuove il terreno dall'array

            // Se il terreno eliminato era quello selezionato
            if (selectedTerrenoId === id) {
                selectedTerrenoId = null;
                if (terreni.length > 0) {
                    selectTerreno(terreni[0].id); // Seleziona il primo terreno rimanente
                } else {
                    // Se non ci sono più terreni, resetta l'interfaccia
                    document.getElementById('selected-terrain-details').style.display = 'none';
                    document.getElementById('coordinates-section').style.display = 'none';
                    document.getElementById('polygon-vertices-section').style.display = 'none';
                    document.getElementById("current-terrain-name").textContent = "";
                    document.getElementById("area").value = "Disegna sulla mappa";
                    document.getElementById("perimetro").value = "Disegna sulla mappa";
                    document.getElementById("vertices-display").innerHTML = "Nessun poligono selezionato o disegnato.";
                    renderSpeciesListForSelectedTerrain(); // Pulisce la lista specie
                    if (mainDrawnItems) {
                        mainDrawnItems.clearLayers(); // Pulisce tutti i layer dalla mappa
                    }
                }
            }
            renderTerreniList(); // Aggiorna la sidebar del primo menu
            updateTerreniTable(); // Aggiorna la tabella
            updateDashboard(); // Aggiorna il dashboard
            
            // Salva nel database
            saveTerreniToDatabase();

            // Pulisce la ricerca indirizzo se non ci sono terreni o nessuno è selezionato
            if (terreni.length === 0 || selectedTerrenoId === null) {
                clearAddressMarkerAndInput();
            }
        }
    });
}

function renderSpeciesListForSelectedTerrain() {
    const speciesListUl = document.getElementById('species-list-for-selected-terrain');
    speciesListUl.innerHTML = ''; // Pulisce la lista precedente
    
    // Usa il terreno in bozza se presente, altrimenti cerca nell'array terreni
    const selectedTerreno = draftTerreno || terreni.find(t => t.id === selectedTerrenoId);

    if (!selectedTerreno || selectedTerreno.species.length === 0) {
        speciesListUl.innerHTML = '<li style="text-align: center; color: var(--text-color); opacity: 0.7;">Nessuna specie aggiunta.</li>';
        return;
    }

    selectedTerreno.species.forEach((s, index) => {
        const li = document.createElement('li');
        li.classList.add('species-item');
        li.innerHTML = `
            <span>${s.name} (${s.quantity} m²)</span>
            <div class="species-item-actions">
                <button onclick="editSpeciesInSelectedTerrain(${index})"><i class="fas fa-edit"></i></button>
                <button onclick="deleteSpeciesFromSelectedTerrain(${index})"><i class="fas fa-trash"></i></button>
            </div>
        `;
        speciesListUl.appendChild(li);
    });
}

// --- MODIFICATA QUESTA FUNZIONE ---
function addSpeciesToSelectedTerrain() {
    const newSpeciesNameInput = document.getElementById('new-species-name-input');
    const newSpeciesQuantityInput = document.getElementById('new-species-quantity-input');

    const enteredName = newSpeciesNameInput.value.trim(); // Nome inserito dall'utente
    const quantity = newSpeciesQuantityInput.value.trim();

    if (!enteredName) {
        showCustomAlert("Inserisci il nome della specie.");
        return;
    }

    // Validazione: controlla se il nome inserito (ignorando maiuscole/minuscole) è presente in ALL_SPECIES_NAMES
    // e ottieni il nome con la formattazione corretta.
    const correctlyCasedName = ALL_SPECIES_NAMES.find(
        validName => validName.toLowerCase() === enteredName.toLowerCase()
    );

    if (!correctlyCasedName) {
        // Se il nome non è trovato nella lista dei nomi validi
        showCustomAlert("Nome specie non valido. Assicurati che il nome inserito sia presente nell'elenco dei suggerimenti.");
        newSpeciesNameInput.focus(); // Rimetti il focus sull'input per la correzione
        return; // Interrompi l'esecuzione
    }

    // Se il nome è valido (correctlyCasedName non è undefined), procedi


    let quantityValue;
    const rawQuantity = newSpeciesQuantityInput.value;
    if (rawQuantity.trim() === '') {
        showCustomAlert("La quantità (n) è obbligatoria."); newSpeciesQuantityInput.focus(); return;
    }
    quantityValue = parseInt(rawQuantity, 10);
    if (isNaN(quantityValue) || quantityValue < 0 || quantityValue !== parseInt(rawQuantity)) { // Valida intero non negativo
        showCustomAlert("Inserisci un valore numerico valido (intero, non negativo) per n.");
        newSpeciesQuantityInput.value = ""; newSpeciesQuantityInput.focus(); return;
    }



    if (!selectedTerrenoId && !draftTerreno) {
        showCustomAlert("Seleziona un terreno prima di aggiungere specie.");
        return;
    }

    // Usa il terreno in bozza se presente, altrimenti cerca nell'array terreni
    const selectedTerreno = draftTerreno || terreni.find(t => t.id === selectedTerrenoId);
    if (selectedTerreno) {
        // Usa il nome con la formattazione corretta dalla lista ALL_SPECIES_NAMES
        selectedTerreno.species.push({ name: correctlyCasedName, quantity: quantityValue });

        newSpeciesNameInput.value = ''; // Pulisce l'input del nome specie
        newSpeciesQuantityInput.value = ''; // Pulisce l'input della quantità
        const suggestionsContainer = document.getElementById('species-suggestions-dropdown');
        if(suggestionsContainer) { // Nasconde e pulisce i suggerimenti
            suggestionsContainer.style.display = 'none';
            suggestionsContainer.innerHTML = '';
        }
        
        // Aggiorna la UI
        if (draftTerreno) {
            // Se è un terreno in bozza, aggiorna solo la sidebar
            renderTerreniList();
            // Aggiorna anche la lista delle specie per mostrare la nuova specie aggiunta
            renderSpeciesListForSelectedTerrain();
        } else {
            // Se è un terreno salvato, aggiorna la lista delle specie
            renderSpeciesListForSelectedTerrain();
        }
        
        updateDashboard();
        
        // Messaggio diverso per terreni in bozza vs salvati
        if (draftTerreno) {
            showCustomAlert(`Specie "${correctlyCasedName}" aggiunta al terreno in bozza "${selectedTerreno.name}". Clicca "Salva dati terreno" per salvarlo definitivamente.`);
        } else {
            showCustomAlert(`Specie "${correctlyCasedName}" aggiunta al terreno "${selectedTerreno.name}". Ricorda di cliccare 'Salva dati terreno' per salvare le modifiche.`);
        }
    }
}
// --- FINE MODIFICA ---

function editSpeciesInSelectedTerrain(index) {
    // Usa il terreno in bozza se presente, altrimenti cerca nell'array terreni
    const selectedTerreno = draftTerreno || terreni.find(t => t.id === selectedTerrenoId);
    if (!selectedTerreno || !selectedTerreno.species[index]) return;

    const currentSpecies = selectedTerreno.species[index];

    showCustomPrompt(`Modifica nome specie per "${selectedTerreno.name}":`, currentSpecies.name, (newName) => {
        if (newName === null) return; // Utente ha annullato

        // Validazione del nuovo nome
        const newCorrectlyCasedName = ALL_SPECIES_NAMES.find(
            validName => validName.toLowerCase() === newName.trim().toLowerCase()
        );

        if (!newCorrectlyCasedName && newName.trim() !== '') { // Se il nome è stato cambiato ma non è valido
             showCustomAlert("Nome specie non valido per la modifica. Assicurati che il nome inserito sia presente nell'elenco dei suggerimenti.");
             return;
        }
        // Usa il nome validato, o l'originale se l'input era vuoto (e l'utente non ha annullato).
        // o se il nome non è stato modificato.
        const nameToUse = newCorrectlyCasedName || (newName.trim() === '' ? currentSpecies.name : newName.trim());


        showCustomPrompt(`Modifica quantità (m²) per "${nameToUse}":`, currentSpecies.quantity, (newQuantity) => {
            if (newQuantity === null) return; // Utente ha annullato

            if (nameToUse.trim() !== '') {
                selectedTerreno.species[index] = { name: nameToUse, quantity: newQuantity.trim() };
                
                // Aggiorna la UI
                if (draftTerreno) {
                    // Se è un terreno in bozza, aggiorna solo la sidebar
                    renderTerreniList();
                    // Aggiorna anche la lista delle specie per mostrare la nuova specie aggiunta
                    renderSpeciesListForSelectedTerrain();
                } else {
                    // Se è un terreno salvato, aggiorna la lista delle specie
                    renderSpeciesListForSelectedTerrain();
                }
                
                updateDashboard();
                
                // Messaggio diverso per terreni in bozza vs salvati
                if (draftTerreno) {
                    showCustomAlert(`Specie modificata per il terreno in bozza "${selectedTerreno.name}". Clicca "Salva dati terreno" per salvare definitivamente.`);
                } else {
                    showCustomAlert(`Specie modificata per "${selectedTerreno.name}". Ricorda di cliccare 'Salva dati terreno'.`);
                }
            } else {
                showCustomAlert("Il nome della specie non può essere vuoto."); // Non dovrebbe succedere con la logica sopra
            }
        });
    });
}

function deleteSpeciesFromSelectedTerrain(index) {
    showCustomConfirm('Sei sicuro di voler eliminare questa specie?', (confirmed) => {
        if (!confirmed) return;

        // Usa il terreno in bozza se presente, altrimenti cerca nell'array terreni
        const selectedTerreno = draftTerreno || terreni.find(t => t.id === selectedTerrenoId);
        if (selectedTerreno && selectedTerreno.species[index]) {
            selectedTerreno.species.splice(index, 1);
            
            // Aggiorna la UI
            if (draftTerreno) {
                // Se è un terreno in bozza, aggiorna solo la sidebar
                renderTerreniList();
                // Aggiorna anche la lista delle specie per mostrare la nuova specie aggiunta
                renderSpeciesListForSelectedTerrain();
            } else {
                // Se è un terreno salvato, aggiorna la lista delle specie
                renderSpeciesListForSelectedTerrain();
            }
            
            // Messaggio diverso per terreni in bozza vs salvati
            if (draftTerreno) {
                showCustomAlert(`Specie eliminata dal terreno in bozza "${selectedTerreno.name}". Clicca "Salva dati terreno" per salvare definitivamente.`);
            } else {
                showCustomAlert(`Specie eliminata dal terreno "${selectedTerreno.name}". Ricorda di cliccare 'Salva dati terreno'.`);
            }
        }
    });
}

function deleteTerrenoFromTable(id) {
    showCustomConfirm('Sei sicuro di voler eliminare questo terreno?', (confirmed) => {
        if (!confirmed) return;

        console.log(`Tentativo di eliminazione terreno ID ${id} dal database...`);

        fetch('/delete-terrain', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ terrain_id: id })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Errore durante l'eliminazione: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            console.log(`✅ Terreno ID ${id} eliminato con successo:`, data.message);

            // Mostra popup di successo
            showCustomAlert("Eliminato con successo!");

            // Aggiorna dataset locale della tabella
           // plots = plots.filter(t => t.id !== id);

            // Aggiorna la tabella
           // updateTerreniTable();

           loadTerreniFromDatabase(); // se esiste

        })
        .catch(error => {
            console.error("❌ Errore durante l'eliminazione:", error);
            showCustomAlert("Errore durante l'eliminazione!");
        });
    });
}

// In Aggiungi_Terreno_script.js

// In Aggiungi_Terreno_script.js

async function saveData() {
    console.log('saveData chiamata');
    console.log('draftTerreno:', draftTerreno);
    console.log('currentUserId:', currentUserId);
    
    // Mostra SUBITO il modal di caricamento
    showLoadingModal('Verifica dei dati in corso...');
    let isSuccess = false; // Variabile per tracciare il successo dell'operazione

    try {
        // --- 1. Controlli di validazione ---
        if (!draftTerreno) {
            throw new Error("Nessun terreno in bozza da salvare.");
        }
        
        console.log('Terreno in bozza trovato:', draftTerreno.name);
        
        if (!draftTerreno.coordinate || draftTerreno.coordinate.length < 3) {
            throw new Error("Disegna un poligono valido sulla mappa prima di salvare.");
        }
        
        console.log('Coordinate valide trovate:', draftTerreno.coordinate.length);
        
        const centroidDisplay = document.getElementById("centroid-display");
        if (!centroidDisplay) {
            throw new Error("Elemento centroid-display non trovato.");
        }
        
        const centroidText = centroidDisplay.textContent;
        console.log('Testo centroid:', centroidText);
        
        const centroidMatch = centroidText.match(/Lat ([\d.-]+), Lon ([\d.-]+)/);
        if (!centroidMatch) {
            throw new Error("Impossibile salvare. Il centroide non è disponibile.");
        }
        
        console.log('Centroide estratto:', centroidMatch[1], centroidMatch[2]);

        // --- 2. Sposta il terreno dalla bozza all'array principale ---
        const terrenoToSave = { ...draftTerreno }; // Copia il terreno
        terreni.push(terrenoToSave); // Aggiungi all'array principale
        
        // --- 3. Prepara i dati per il salvataggio delle coordinate ---
        showLoadingModal('Salvataggio coordinate e meteo...');
        const centroidCoords = { lat: parseFloat(centroidMatch[1]), long: parseFloat(centroidMatch[2]) };
        const dataToSend = {
            idutente: parseInt(currentUserId),
            terrainName: terrenoToSave.name,
            species: terrenoToSave.species.map(s => ({ name: s.name, quantity: parseFloat(s.quantity) })),
            centroid: centroidCoords,
            vertices: terrenoToSave.coordinate.map(v => ({ lat: v.lat, long: v.long })),
            created_at: new Date().toISOString()
        };

        // --- 4. Salva le coordinate ---
        const coordResponse = await fetch('/save-coordinates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataToSend)
        });
        
        if (!coordResponse.ok) {
            const errorText = await coordResponse.text();
            throw new Error(`Errore salvataggio coordinate: ${coordResponse.status} - ${errorText}`);
        }
        
        const coordResult = await coordResponse.json();
        
        // --- 5. Scarica meteo e calcola ---
        showLoadingModal('Download dati meteo e calcoli...');
        const newTerrainId = coordResult.terrain_id;
        const meteoResponse = await fetch(`/get_open_meteo/${newTerrainId}`, { method: 'POST' });
        if (!meteoResponse.ok) {
            const meteoErrorText = await meteoResponse.text();
            throw new Error(`Errore richiesta meteo/calcoli: ${meteoResponse.status} - ${meteoErrorText}`);
        }
        await meteoResponse.json();
        
        // --- 6. Pulisci la bozza e aggiorna l'UI ---
        draftTerreno = null; // Rimuovi il terreno dalla bozza
        renderTerreniList(); // Aggiorna la sidebar
        updateTerreniTable(); // Aggiorna la tabella del secondo menu
        
        // --- 7. Se arriviamo qui, tutto è andato a buon fine ---
        isSuccess = true; // Imposta il flag di successo

    } catch (error) {
        // In caso di qualsiasi errore, mostra subito un alert
        showCustomAlert(`Operazione fallita: ${error.message}`);
        console.error('Errore durante il processo di salvataggio:', error);
    } finally {
        // Questo blocco viene eseguito SEMPRE, sia dopo il successo che dopo l'errore
        // Nasconde il modal di caricamento
        hideLoadingModal();
    }

    // --- 8. Mostra il messaggio di successo FINALE, solo se l'operazione è riuscita ---
    if (isSuccess) {
        showCustomAlert('Terreno salvato con successo! Ora appare nella tabella "I MIEI TERRENI".');

        // Aggiungi il link per andare alla dashboard
        const resultContainer = document.getElementById('save-result-container');
        if (resultContainer) {
            resultContainer.innerHTML = '';
            const link = document.createElement('a');
            link.href = '/dashboard';
            link.textContent = 'Ottimo! Vai alla Dashboard per vedere i risultati';
            link.className = 'btn-success'; // Applica uno stile per renderlo più visibile
            resultContainer.appendChild(link);
        }
    }
}

function clearAddressMarker() {
    if (addressMarker) {
        mainMap.removeLayer(addressMarker);
        addressMarker = null;
    }
}

function clearAddressMarkerAndInput() {
    clearAddressMarker();
    document.getElementById('indirizzo_search_sidebar').value = '';
}

function goToLocationSidebar() {
    const indirizzo = document.getElementById("indirizzo_search_sidebar").value.trim();
    if (!indirizzo) {
        showCustomAlert("Inserisci un indirizzo valido.");
        return;
    }

    clearAddressMarker(); // Rimuove marker precedenti

    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(indirizzo)}&accept-language=it`)
        .then(response => response.json())
        .then(data => {
            if (data.length === 0) {
                showCustomAlert("Indirizzo non trovato.");
                return;
            }
            const lat = data[0].lat;
            const lon = data[0].lon;

            mainMap.setView([lat, lon], 16); // Centra la mappa sull'indirizzo

            // Aggiunge un marker
            markerIndirizzo = L.marker([lat, lon]).addTo(mainMap)
                .bindPopup("Indirizzo trovato: " + indirizzo)
                .openPopup();
        })
        .catch(error => {
            showCustomAlert("Errore nella ricerca dell'indirizzo.");
            console.error(error);
            clearAddressMarker(); // Pulisce il marker in caso di errore
        });
}

function calculateAndDisplayCentroid(polygonLayer) {
    console.log('calculateAndDisplayCentroid chiamata con:', polygonLayer);
    
    if (typeof turf === 'undefined') {
        console.error("Errore calculateAndDisplayCentroid: La libreria Turf.js non è caricata.");
        const centroidDisplay = document.getElementById("centroid-display");
        if (centroidDisplay) {
            centroidDisplay.textContent = "Centroide: Errore (Turf.js non caricato).";
        }
        return;
    }

    if (!polygonLayer || !polygonLayer.getLatLngs) {
        console.warn("calculateAndDisplayCentroid: Nessun layer poligono valido fornito.");
        const centroidDisplay = document.getElementById("centroid-display");
        if (centroidDisplay) {
            centroidDisplay.textContent = "Centroide: N/A";
        }
        return;
    }

    const latlngsOuterRing = polygonLayer.getLatLngs()[0]; // Prende l'anello esterno del poligono
    console.log('Coordinate del poligono:', latlngsOuterRing);
    
    if (!Array.isArray(latlngsOuterRing) || latlngsOuterRing.length < 3) { // Un poligono valido ha almeno 3 vertici
         console.warn("calculateAndDisplayCentroid: Coordinate del poligono insufficienti.");
         const centroidDisplay = document.getElementById("centroid-display");
         if (centroidDisplay) {
             centroidDisplay.textContent = "Centroide: N/A (poligono non valido).";
         }
         return;
    }

    // Turf.js richiede che il primo e l'ultimo punto di un anello poligonale siano identici
    let geoJsonCoords = latlngsOuterRing.map(l => [l.lng, l.lat]); // Converte in formato [lon, lat]
    if (!latlngsOuterRing[0].equals(latlngsOuterRing[latlngsOuterRing.length - 1])) {
        geoJsonCoords.push(geoJsonCoords[0]); // Chiude il poligono se non lo è
    }
    
    console.log('Coordinate GeoJSON:', geoJsonCoords);

    if (geoJsonCoords.length < 4) { // Dopo la chiusura, un poligono valido ha almeno 4 coordinate (3 uniche + 1 ripetuta)
        console.warn("calculateAndDisplayCentroid: Poligono non valido anche dopo il tentativo di chiusura.");
        const centroidDisplay = document.getElementById("centroid-display");
        if (centroidDisplay) {
            centroidDisplay.textContent = "Centroide: N/A (poligono troppo piccolo).";
        }
        return;
    }

    try {
        const turfPolygon = turf.polygon([geoJsonCoords]); // Crea un poligono Turf
        const centroid = turf.centroid(turfPolygon); // Calcola il centroide
        const centroidCoords = centroid.geometry.coordinates;
        const centroidLat = centroidCoords[1].toFixed(6); // Latitudine
        const centroidLon = centroidCoords[0].toFixed(6); // Longitudine
        
        console.log('Centroide calcolato:', centroidLat, centroidLon);
        
        const centroidDisplay = document.getElementById("centroid-display");
        if (centroidDisplay) {
            centroidDisplay.textContent = `Centroide: Lat ${centroidLat}, Lon ${centroidLon}`;
            console.log('Elemento centroid-display aggiornato con:', centroidDisplay.textContent);
        } else {
            console.error('Elemento centroid-display non trovato!');
        }
    } catch (error) {
        console.error("calculateAndDisplayCentroid: Errore critico nel calcolo del centroide:", error);
        const centroidDisplay = document.getElementById("centroid-display");
        if (centroidDisplay) {
            centroidDisplay.textContent = "Centroide: Errore nel calcolo (vedi console).";
        }
    }
}
//
function updateAddressAndCoordinates() {
    // Prima controlla se c'è un terreno in bozza
    let terreno = null;
    if (draftTerreno && draftTerreno.leafletLayer) {
        terreno = draftTerreno;
    } else {
        // Altrimenti cerca nei terreni salvati
        terreno = terreni.find(t => t.id === selectedTerrenoId);
    }
    
    if (terreno && terreno.leafletLayer) {
        const polygon = terreno.leafletLayer;
        calculateAndDisplayCentroid(polygon); // Calcola e mostra il centroide

        // Tenta la geocodifica inversa usando il centroide (se Turf è disponibile e il poligono è valido)
        if (typeof turf !== 'undefined' && polygon.getLatLngs().length > 0 && polygon.getLatLngs()[0].length >= 3) {
            const latlngsForAddress = polygon.getLatLngs()[0];
            let geoJsonCoordsForAddress = latlngsForAddress.map(l => [l.lng, l.lat]);
            if (!latlngsForAddress[0].equals(latlngsForAddress[latlngsForAddress.length - 1])) {
                geoJsonCoordsForAddress.push(geoJsonCoordsForAddress[0]);
            }
        //---------------------------------------------------------------------------------------------------------------
            if (geoJsonCoordsForAddress.length >= 4) {
                try {
                    const turfPolygonForAddress = turf.polygon([geoJsonCoordsForAddress]);
                    const centroidForAddress = turf.centroid(turfPolygonForAddress);
                    const centroidCoordsForAddress = centroidForAddress.geometry.coordinates;

                    // Non c'è più un elemento 'address-display', quindi questa parte potrebbe essere rimossa o adattata
                    // se si vuole mostrare l'indirizzo da qualche altra parte.
                    reverseGeocode(centroidCoordsForAddress[1], centroidCoordsForAddress[0])
                        .then(address => { /* console.log("Indirizzo geocodificato:", address); */ })
                        .catch(error => { console.error("Errore di geocodifica inversa:", error); });
                } catch (e) {
                    console.error("Errore nel calcolo del centroide per la geocodifica indirizzo:", e);
                }
            }
        } else {
            console.warn("Turf.js non disponibile o poligono non valido per geocodifica inversa.");
        }
    } else {
        // Se non c'è un terreno attivo o non ha un layer, resetta il display del centroide
        const centroidDisplay = document.getElementById("centroid-display");
        if (centroidDisplay) {
            centroidDisplay.textContent = "Centroide: N/A";
        }
    }
}

async function reverseGeocode(lat, lng) {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=it`);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.display_name || "Indirizzo non trovato.";
}


function updateAllMapLayers() {
    // Controllo di sicurezza: verifica che mainDrawnItems sia inizializzato
    if (!mainDrawnItems) {
        console.warn('mainDrawnItems non è ancora inizializzato, saltando updateAllMapLayers');
        return;
    }
    
    mainDrawnItems.clearLayers(); // Pulisce tutti i layer disegnati
    
    // Prima aggiungi il layer del terreno in bozza (se presente)
    if (draftTerreno && draftTerreno.leafletLayer) {
        console.log('Aggiungendo layer del draftTerreno alla mappa:', draftTerreno.name);
        draftTerreno.leafletLayer.setStyle(selectedStilePoligono); // Stile blu per il terreno in bozza
        mainDrawnItems.addLayer(draftTerreno.leafletLayer);
    }
    
    // Poi aggiungi i layer dei terreni salvati
    terreni.forEach(t => {
        if (t.leafletLayer) { // Se il terreno ha un layer associato
            // Applica lo stile in base a se è selezionato o meno
            t.leafletLayer.setStyle(t.id === selectedTerrenoId ? selectedStilePoligono : stilePoligono);
            mainDrawnItems.addLayer(t.leafletLayer); // Aggiunge il layer alla mappa
            // Aggiorna il contenuto del popup
            const popupContent = `<strong>Nome:</strong> ${t.name}<br>` +
                                 `<strong>Specie:</strong> ${t.species.map(s => `${s.name} (${s.quantity})`).join(', ') || 'N/A'}<br>` +
                                 `<strong>Area:</strong> ${t.area_ha} ha<br>` +
                                 `<strong>Perimetro:</strong> ${t.perimetro_m} m<br>` +
                                 `<strong>Stima CO₂:</strong> ${t.co2_kg_annuo} kg/anno`;
            t.leafletLayer.bindPopup(popupContent);
        }
    });

    // Adatta la vista della mappa ai layer presenti
    if (mainDrawnItems.getLayers().length > 0) {
        const selectedTerrenoObj = terreni.find(t => t.id === selectedTerrenoId && t.leafletLayer);
        if (selectedTerrenoId && selectedTerrenoObj) {
            // Se un terreno è selezionato e ha un layer, centra su quello
            mainMap.fitBounds(selectedTerrenoObj.leafletLayer.getBounds(), { padding: [20, 20], maxZoom: 16 });
        } else if (draftTerreno && draftTerreno.leafletLayer) {
            // Se c'è un terreno in bozza, centra su quello
            mainMap.fitBounds(draftTerreno.leafletLayer.getBounds(), { padding: [20, 20], maxZoom: 16 });
        } else {
            // Altrimenti, centra su tutti i layer disegnati
            mainMap.fitBounds(mainDrawnItems.getBounds(), { padding: [20, 20] });
        }
    }
}

function updateAllLayerPopups() {
    terreni.forEach(t => {
        if (t.leafletLayer) {
            const popupContent = `<strong>Nome:</strong> ${t.name}<br>` +
                                 `<strong>Specie:</strong> ${t.species.map(s => `${s.name} (${s.quantity})`).join(', ') || 'N/A'}<br>` +
                                 `<strong>Area:</strong> ${t.area_ha} ha<br>` +
                                 `<strong>CO₂:</strong> ${t.co2_kg_annuo} kg/anno`;
            t.leafletLayer.bindPopup(popupContent);
        }
    });
}

function esportaDati() {
    if (terreni.length === 0) {
        showCustomAlert("Nessun terreno salvato da esportare.");
        return;
    }
    const dati = terreni.map(t => ({
        nome: t.name,
        specie_dettagli: t.species,
        area_ha: t.area_ha,
        perimetro_m: t.perimetro_m,
        assorbimento_CO2_annuo_kg: t.co2_kg_annuo,
        coordinate: t.coordinate || [] // Assicura che 'coordinate' sia sempre un array
    }));
    const blob = new Blob([JSON.stringify(dati, null, 2)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dati_terreni_airvana.json"; // Nome file più descrittivo
    document.body.appendChild(a); // Necessario per Firefox
    a.click();
    document.body.removeChild(a); // Pulisce
    URL.revokeObjectURL(url);
    showCustomAlert("Dati esportati con successo!");
}

function applicaFiltro() {
    const filtro = document.getElementById("filtro-specie").value.trim().toLowerCase();
    if (!filtro) {
        showCustomAlert("Inserisci una specie per filtrare.");
        return;
    }
    mainDrawnItems.eachLayer(layer => {
        const terreno = terreni.find(t => t.leafletLayer && L.Util.stamp(t.leafletLayer) === L.Util.stamp(layer));
        // Controlla se il terreno esiste e se almeno una delle sue specie include il testo del filtro
        if (terreno && terreno.species.some(s => s.name.toLowerCase().includes(filtro))) {
            layer.setStyle(terreno.id === selectedTerrenoId ? selectedStilePoligono : stilePoligono); // Mostra normalmente
        } else {
            layer.setStyle({fillOpacity: 0, opacity: 0}); // Nasconde il layer
        }
    });
}

function resetFiltro() {
    // Ripristina lo stile di tutti i layer
    mainDrawnItems.eachLayer(layer => {
        const terreno = terreni.find(t => t.leafletLayer && L.Util.stamp(t.leafletLayer) === L.Util.stamp(layer));
        if (terreno) {
            layer.setStyle(terreno.id === selectedTerrenoId ? selectedStilePoligono : stilePoligono);
        }
    });
    document.getElementById("filtro-specie").value = ""; // Pulisce l'input del filtro
}

function updateDashboard() {
    console.log('updateDashboard chiamata');
    console.log('draftTerreno:', draftTerreno);
    console.log('selectedTerrenoId:', selectedTerrenoId);
    console.log('terreni.length:', terreni.length);
    
    // Calcola l'area totale di tutti i terreni
    let totalArea = 0;
    let totalCo2 = 0;
    
    // Calcola i totali dai terreni salvati
    terreni.forEach(t => {
        totalArea += parseFloat(t.area_ha || 0);
        totalCo2 += parseFloat(t.co2_kg_annuo || 0);
    });
    
    // Se c'è un terreno in bozza, aggiungi anche quello ai totali
    if (draftTerreno) {
        totalArea += parseFloat(draftTerreno.area_ha || 0);
        // Per il CO2 del draftTerreno, calcola in base alle specie
        if (draftTerreno.species && draftTerreno.species.length > 0) {
            draftTerreno.species.forEach(s => {
                const specieKey = s.name.toLowerCase();
                const rate = co2Rates[specieKey] || co2Rates.default;
                const quantityInM2 = parseFloat(s.quantity || 0);
                const DENSITA_IMPLICITA_PER_M2 = 0.01;
                const numeroUnitaStima = quantityInM2 * DENSITA_IMPLICITA_PER_M2;
                totalCo2 += rate * numeroUnitaStima;
            });
        }
    }

    // Mostra i dati del terreno SELEZIONATO nel riepilogo "CO2 Assorbita Totale" e "Area Totale"
    // Questo comportamento potrebbe essere rivisto se si vuole il totale di TUTTI i terreni.
    // Per ora, il nome "Riepilogo Terreno" suggerisce i dati del terreno corrente.
    const selectedTerreno = terreni.find(t => t.id === selectedTerrenoId);
    const areaForDisplay = selectedTerreno ? parseFloat(selectedTerreno.area_ha || 0).toFixed(2) : '0.00';
    const co2ForDisplay = selectedTerreno ? parseFloat(selectedTerreno.co2_kg_annuo || 0).toFixed(2) : '0.00';

    document.getElementById("total-area").textContent = areaForDisplay; // Area del terreno selezionato
    document.getElementById("total-co2").textContent = co2ForDisplay;   // CO2 del terreno selezionato

    updateTerreniTable(); // Aggiorna la tabella di tutti i terreni
    updateCO2Chart();     // Aggiorna il grafico CO2 (basato su tutti i terreni)
    
    // Controllo di sicurezza: verifica che la mappa sia inizializzata prima di aggiornare i layer
    if (mainMap && mainDrawnItems) {
        updateAllMapLayers(); // Aggiorna tutti i layer sulla mappa
    } else {
        console.warn('Mappa non ancora inizializzata, saltando updateAllMapLayers');
    }
}

function updateTerreniTable() {
    console.log('updateTerreniTable chiamata');
    console.log('Array terreni in updateTerreniTable:', terreni);
    
    const tableBody = document.querySelector("#terreni-table tbody");
    if (!tableBody) {
        console.error('Elemento #terreni-table tbody non trovato!');
        return;
    }
    
    tableBody.innerHTML = ''; // Pulisce la tabella
    if (terreni.length === 0) {
        const row = tableBody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 4;
        cell.textContent = 'Nessun terreno registrato.';
        cell.style.textAlign = 'center';
        cell.style.color = '#888';
        return;
    }
    console.log(`Creando ${terreni.length} righe per la tabella`);
    terreni.forEach((t, index) => {
        console.log(`Creando riga ${index + 1} per terreno:`, t);
        const row = tableBody.insertRow();
        const cell1 = row.insertCell();
        cell1.textContent = t.name;
        cell1.setAttribute('data-label', 'Nome Terreno'); // Per responsività CSS
        
        const cell2 = row.insertCell();
        console.log(`Terreno ${t.name}:`, t.species); // Debug
        const speciesText = t.species && t.species.length > 0 
            ? t.species.map(s => `${s.name} (${s.quantity}m²)`).join(', ')
            : 'N/A';
        console.log(`Testo specie per ${t.name}:`, speciesText);
        cell2.textContent = speciesText;
        cell2.setAttribute('data-label', 'Specie');
        
        const cell3 = row.insertCell();
        cell3.textContent = parseFloat(t.area_ha || 0).toFixed(2); // Formatta a 2 decimali
        cell3.setAttribute('data-label', 'Area (ha)');
        
        // Colonna Azioni con pulsanti Modifica ed Elimina terreno
        const cell4 = row.insertCell();
        cell4.setAttribute('data-label', 'Azioni');
        cell4.innerHTML = `
            <div class="action-buttons">
                <button class="action-button edit" onclick="editTerrenoName('${t.id}')" title="Modifica terreno">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button class="action-button delete" onclick="deleteTerrenoFromTable('${t.id}')" title="Elimina terreno">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `;
    });
    
    console.log('Tabella aggiornata completata');
}

function updateCO2Chart() {
    const speciesData = {}; 
    const DENSITA_IMPLICITA_PER_M2 = 0.01; // Stessa assunzione di densità

    terreni.forEach(t => { 
        t.species.forEach(s => { // s.quantity è ora un numero (m²)
            const specieNameOriginal = s.name; 
            const specieKey = s.name.toLowerCase();
            const rate = co2Rates[specieKey] || co2Rates.default;
            const quantityInM2 = s.quantity;

            if (!specieNameOriginal) return;
            if (!speciesData[specieNameOriginal]) {
                speciesData[specieNameOriginal] = 0;
            }
            
            if (typeof quantityInM2 === 'number' && quantityInM2 > 0) {
                const numeroUnitaStima = quantityInM2 * DENSITA_IMPLICITA_PER_M2;
                speciesData[specieNameOriginal] += rate * numeroUnitaStima;
            }
        });
    });

    const labels = Object.keys(speciesData);
    const data = Object.values(speciesData).map(val => parseFloat(val.toFixed(2))); // Arrotonda i valori finali

    if (co2Chart) {
        co2Chart.destroy(); // Distrugge il grafico precedente se esiste
    }

    const ctx = document.getElementById('co2Chart').getContext('2d');
    co2Chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'CO₂ Assorbita (kg/anno)',
                data: data,
                backgroundColor: [ // Array di colori per le barre
                    'rgba(40, 167, 69, 0.7)', 'rgba(0, 123, 255, 0.7)',
                    'rgba(255, 193, 7, 0.7)', 'rgba(220, 53, 69, 0.7)',
                    'rgba(108, 117, 125, 0.7)', 'rgba(23, 162, 184, 0.7)',
                    'rgba(253, 126, 20, 0.7)', 'rgba(102, 16, 242, 0.7)'
                ],
                borderColor: [ // Array di colori per i bordi delle barre
                    'rgba(40, 167, 69, 1)', 'rgba(0, 123, 255, 1)',
                    'rgba(255, 193, 7, 1)', 'rgba(220, 53, 69, 1)',
                    'rgba(108, 117, 125, 1)', 'rgba(23, 162, 184, 1)',
                    'rgba(253, 126, 20, 1)', 'rgba(102, 16, 242, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, title: { display: true, text: 'CO₂ Assorbita (kg/anno)'}},
                x: { title: { display: true, text: 'Specie Vegetale' }}
            },
            plugins: { legend: { display: false }, title: { display: true, text: 'Assorbimento di CO₂ per Specie (Tutti i Terreni)' }}
        }
    });
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('hidden');
    // Forza il ricalcolo delle dimensioni della mappa e del grafico dopo l'animazione della sidebar
    setTimeout(() => {
        if (mainMap) { mainMap.invalidateSize(); }
        if (co2Chart && co2Chart.ctx) { // Verifica che co2Chart e il suo contesto esistano
             // updateCO2Chart(); // Potrebbe essere meglio chiamare resize se il chart non deve essere ridisegnato da zero
             co2Chart.resize();
        }
    }, 300); // Durata dell'animazione CSS
}

function useCadastralData() {
    showCustomAlert("Funzione 'Utilizza dati catastali' ancora da implementare.");
}

// --- Funzioni per Modali Personalizzati (Alert, Confirm, Prompt) ---
function createModal(type, message, defaultValue = '', callback = null) {
    const existingModal = document.getElementById('custom-modal');
    if (existingModal) { existingModal.remove(); } // Rimuove modali precedenti

    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'custom-modal';
    modalOverlay.style.cssText = `position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.6); display: flex; justify-content: center; align-items: center; z-index: 10000;`;
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `background-color: white; padding: 25px; border-radius: 10px; box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3); max-width: 400px; width: 90%; text-align: center; font-family: 'Roboto', sans-serif; color: var(--text-color); position: relative;`;
    
    const closeButton = document.createElement('button'); // Bottone chiusura
    closeButton.innerHTML = '&times;';
    closeButton.style.cssText = `position: absolute; top: 10px; right: 10px; background: none; border: none; font-size: 1.5em; cursor: pointer; color: #aaa; width: 30px; height: 30px; padding: 0; line-height: 1;`;
    closeButton.onclick = () => {
        document.body.removeChild(modalOverlay);
        if (callback && (type === 'prompt' || type === 'confirm')) { callback(type === 'prompt' ? null : false); } // Chiudendo, prompt ritorna null, confirm false
    };
    modalContent.appendChild(closeButton);

    const messagePara = document.createElement('p');
    messagePara.textContent = message;
    messagePara.style.cssText = `margin-bottom: 20px; font-size: 1.1em; line-height: 1.4; padding-top: 10px;`; // Aggiunto padding-top
    modalContent.appendChild(messagePara);

    if (type === 'prompt') {
        const input = document.createElement('input');
        input.type = 'text'; input.value = defaultValue;
        input.style.cssText = `width: calc(100% - 20px); padding: 10px; margin-bottom: 15px; border: 1px solid var(--border-color); border-radius: 5px; font-size: 1em;`;
        modalContent.appendChild(input);
        const confirmBtn = document.createElement('button'); confirmBtn.textContent = 'OK';
        confirmBtn.style.cssText = `background-color: var(--primary-blue); color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; font-size: 1em; margin-right: 10px; width: auto;`;
        confirmBtn.onclick = () => { document.body.removeChild(modalOverlay); if (callback) callback(input.value); };
        modalContent.appendChild(confirmBtn);
        const cancelBtn = document.createElement('button'); cancelBtn.textContent = 'Annulla';
        cancelBtn.style.cssText = `background-color: #ccc; color: var(--text-color); padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; font-size: 1em; width: auto;`;
        cancelBtn.onclick = () => { document.body.removeChild(modalOverlay); if (callback) callback(null); };
        modalContent.appendChild(cancelBtn);
        input.focus(); // Focus automatico sull'input
    } else if (type === 'confirm') {
        const confirmBtn = document.createElement('button'); confirmBtn.textContent = 'Sì';
        confirmBtn.style.cssText = `background-color: var(--primary-green); color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; font-size: 1em; margin-right: 10px; width: auto;`;
        confirmBtn.onclick = () => { document.body.removeChild(modalOverlay); if (callback) callback(true); };
        modalContent.appendChild(confirmBtn);
        const cancelBtn = document.createElement('button'); cancelBtn.textContent = 'No';
        cancelBtn.style.cssText = `background-color: #ccc; color: var(--text-color); padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; font-size: 1em; width: auto;`;
        cancelBtn.onclick = () => { document.body.removeChild(modalOverlay); if (callback) callback(false); };
        modalContent.appendChild(cancelBtn);
    } else { // 'alert'
        const okBtn = document.createElement('button'); okBtn.textContent = 'OK';
        okBtn.style.cssText = `background-color: var(--primary-blue); color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; font-size: 1em; width: auto;`;
        okBtn.onclick = () => { document.body.removeChild(modalOverlay); if (callback) callback(); };
        modalContent.appendChild(okBtn);
    }
    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);
}

function showCustomAlert(message, callback = null) { createModal('alert', message, '', callback); }
function showCustomConfirm(message, callback) { createModal('confirm', message, '', callback); }
function showCustomPrompt(message, defaultValue, callback) { createModal('prompt', message, defaultValue, callback); }
// --- Fine Funzioni Modali ---

function initializeSpeciesAutosuggest() {
    const speciesInput = document.getElementById('new-species-name-input');
    const suggestionsContainer = document.getElementById('species-suggestions-dropdown');

    if (!speciesInput || !suggestionsContainer) {
        console.error("Elementi per l'autosuggest delle specie non trovati nel DOM.");
        return;
    }

    function displaySuggestions(filterText = '') {
        suggestionsContainer.innerHTML = ''; // Pulisci i suggerimenti precedenti
        const lowerFilterText = filterText.toLowerCase().trim();

        const speciesToShow = lowerFilterText === '' ?
            ALL_SPECIES_NAMES : // Mostra tutti se l'input è vuoto
            ALL_SPECIES_NAMES.filter(species => species.toLowerCase().includes(lowerFilterText));

        if (speciesToShow.length > 0) {
            speciesToShow.forEach(species => {
                const suggestionItem = document.createElement('div');
                suggestionItem.classList.add('suggestion-item');
                suggestionItem.textContent = species;
                // Usare mousedown assicura che l'evento si attivi prima del blur dell'input
                suggestionItem.addEventListener('mousedown', function(event) {
                    event.preventDefault(); // Impedisce che l'input perda il focus prima che il valore sia impostato
                    speciesInput.value = species; // Imposta il valore dell'input
                    suggestionsContainer.style.display = 'none'; // Nasconde il contenitore dei suggerimenti
                    suggestionsContainer.innerHTML = ''; // Pulisce per sicurezza
                });
                suggestionsContainer.appendChild(suggestionItem);
            });
            suggestionsContainer.style.display = 'block'; // Mostra il contenitore dei suggerimenti
        } else {
            suggestionsContainer.style.display = 'none'; // Nasconde se non ci sono suggerimenti
        }
    }

    speciesInput.addEventListener('input', function() { // Ad ogni input
        displaySuggestions(this.value);
    });

    speciesInput.addEventListener('focus', function() { // Quando si entra nell'input
        displaySuggestions(this.value); // Mostra suggerimenti basati sul valore attuale (o tutti se vuoto)
    });

    speciesInput.addEventListener('blur', function() { // Quando si esce dall'input
        // Ritarda la chiusura del dropdown per permettere al click (mousedown) sulla suggestion di registrarsi
        setTimeout(() => {
            // Controlla se il mouse è ancora sopra il contenitore dei suggerimenti.
            // Se un elemento è stato cliccato, il mousedown handler lo avrà già nascosto.
            if (!suggestionsContainer.matches(':hover')) {
                 suggestionsContainer.style.display = 'none';
            }
        }, 150); // Un breve ritardo
    });
}

// In Aggiungi_Terreno_script.js, vicino alle altre funzioni createModal...

/**
 * Mostra un modal di caricamento non chiudibile con un messaggio.
 * @param {string} message - Il messaggio da visualizzare.
 */
function showLoadingModal(message) {
    const existingModal = document.getElementById('custom-modal');
    if (existingModal) { existingModal.remove(); } // Rimuove modali precedenti

    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'custom-modal'; // Usiamo lo stesso ID per coerenza
    modalOverlay.style.cssText = `position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.7); display: flex; justify-content: center; align-items: center; z-index: 10000;`;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3); text-align: center; font-family: 'Roboto', sans-serif; color: #333; display: flex; flex-direction: column; align-items: center; gap: 20px;`;
    
    // Aggiungiamo uno spinner per un feedback visivo migliore
    const spinner = document.createElement('div');
    spinner.style.cssText = `border: 4px solid #f3f3f3; border-top: 4px solid var(--primary-blue); border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite;`;


    // Keyframes per l'animazione dello spinner
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
    document.head.appendChild(styleSheet);

    const messagePara = document.createElement('p');
    messagePara.textContent = message;
    messagePara.style.cssText = `font-size: 1.1em; line-height: 1.4; margin: 0;`;
    
    modalContent.appendChild(spinner);
    modalContent.appendChild(messagePara);
    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);
}

/**
 * Rimuove il modal di caricamento dal DOM.
 */
function hideLoadingModal() {
    const existingModal = document.getElementById('custom-modal');
    if (existingModal) {
        existingModal.remove();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Recupera i dati dell'utente dagli attributi data-* del body
    const bodyUserId = document.body.dataset.userId;
    const bodyUserEmail = document.body.dataset.userEmail;
    
    // Usa i dati dal body se disponibili, altrimenti mantieni i valori di default
    if (bodyUserId && bodyUserId !== 'undefined' && bodyUserId !== 'null') {
        currentUserId = bodyUserId;
    }
    if (bodyUserEmail && bodyUserEmail !== 'undefined' && bodyUserEmail !== 'null') {
        currentUserEmail = bodyUserEmail;
    }

    // Log per verifica (puoi rimuoverlo in produzione)
    console.log('User ID caricato:', currentUserId);
    console.log('User Email caricata:', currentUserEmail);

    // console.log('Token caricato dalla pagina:', authToken);
    // Ora puoi usare currentUserId, currentUserEmail (e authToken)
    // per le successive operazioni nel frontend, come inviarli con saveData.

    // Esempio: potresti voler visualizzare l'email dell'utente da qualche parte, tipo nell'header
    // const userProfileNameElement = document.querySelector('.user-profile span');
    // if (userProfileNameElement && currentUserEmail) {
    //     userProfileNameElement.textContent = currentUserEmail; // O il nome utente se lo passi
    // }


    // Il tuo timeout esistente per inizializzare il resto
    // Spostato l'inizializzazione delle funzioni principali all'interno del timeout
    // per assicurare che la mappa e altri elementi siano pronti,
    // specialmente se ci sono dipendenze sulla dimensione del contenitore.

    const userProfileSpan = document.querySelector('header .user-profile span');
    if (userProfileSpan && currentUserEmail) {
        // userProfileSpan.textContent = currentUserEmail; 
    }

    setTimeout(() => {
        // NON inizializzare la mappa qui: verrà inizializzata al primo open del menu
        loadTerreniFromDatabase(); // Carica i terreni dal database
        // renderTerreniList() e updateDashboard() vengono chiamati da loadTerreniFromDatabase()

        // Nasconde i pannelli di dettaglio all'inizio se nessun terreno è selezionato
        // Questo è già gestito da renderTerreniList e selectTerreno, ma può essere una sicurezza.
        if (!selectedTerrenoId) {
            document.getElementById('selected-terrain-details').style.display = 'none';
            document.getElementById('coordinates-section').style.display = 'none';
            document.getElementById('polygon-vertices-section').style.display = 'none';
        }


        // Se ci sono terreni (es. caricati da localStorage o API), seleziona il primo
        // Questa logica andrebbe adattata se i terreni vengono caricati asincronicamente
        if (terreni.length > 0 && !selectedTerrenoId) {
            selectTerreno(terreni[0].id);
        }

        // Listener per la ricerca indirizzo con Invio
        const indirizzoSearchInput = document.getElementById('indirizzo_search_sidebar');
        if (indirizzoSearchInput) {
            indirizzoSearchInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault(); // Impedisce il submit di un form se l'input fosse dentro uno
                    goToLocationSidebar();
                }
            });
        }
        
        initializeSpeciesAutosuggest(); // Inizializza l'autosuggest per le specie

        // Imposta entrambi i menu collassabili chiusi di default
        const collMenu1 = document.getElementById('aggiungi-terreno-menu');
        const collMenu2 = document.getElementById('miei-terreni-menu');
        
        if (collMenu1) { 
            const menuContent1 = collMenu1.querySelector('.menu-content');
            if (menuContent1) {
                menuContent1.classList.remove('open');
                menuContent1.classList.add('hidden');
            }
        }
        
        if (collMenu2) { 
            const menuContent2 = collMenu2.querySelector('.menu-content');
            if (menuContent2) {
                menuContent2.classList.remove('open');
                menuContent2.classList.add('hidden');
            }
        }

    }, 100); // Ridotto il timeout, 1000ms è molto lungo per l'inizializzazione base.
             // Potrebbe essere necessario un timeout più lungo se la mappa ha problemi a caricarsi subito.
});

// Carica i terreni dal database
async function loadTerreniFromDatabase() {
    try {
        console.log('Tentativo di caricamento terreni dal database...');
        console.log('Caricamento terreni per user ID:', currentUserId);
        const response = await fetch(`http://127.0.0.1:8000/debug/user/${currentUserId}/plots`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Dati ricevuti dal database:', data);
        
        if (data && data.plots && Array.isArray(data.plots) && data.plots.length > 0) {
            // Aggiorna l'array terreni con i dati dal database
            terreni = data.plots.map(plot => ({
                id: plot.id,
                name: plot.name || `Terreno ${plot.id}`,
                species: plot.species || [],
                area_ha: plot.area_ha || 0,
                perimetro_m: plot.perimetro_m || 0,
                coordinate: plot.coordinate || [],
                leafletLayer: null
            }));
            // Aggiorna la UI
            renderTerreniList(); // Aggiorna la sidebar del primo menu
            updateTerreniTable();
            updateDashboard();
            console.log(`Caricati ${terreni.length} terreni dal database:`, terreni);
        } else {
            terreni = [];
            renderTerreniList();
            updateTerreniTable();
            updateDashboard();
            // Mostra messaggio se vuoi: "Nessun terreno registrato"
        }
    } catch (error) {
        console.error('Errore nel caricamento dei terreni dal database:', error);
        // Fallback: salva in localStorage
        saveTerreniToLocalStorage();
    }
}

// Salva i terreni nel database
async function saveTerreniToDatabase() {
    try {
        const response = await fetch('/save-plot', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(terreni)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        console.log('Terreni salvati nel database con successo');
        return true;
    } catch (error) {
        console.error('Errore nel salvataggio dei terreni:', error);
        // Fallback: salva in localStorage
        saveTerreniToLocalStorage();
        return false;
    }
}

// ===== FUNZIONI PER LA GESTIONE DELLE SPECIE =====

// Aggiunge una nuova specie a un terreno
function addSpeciesToTerrain(terrenoId) {
    // Usa il terreno in bozza se presente, altrimenti cerca nell'array terreni
    const terreno = draftTerreno || terreni.find(t => t.id == terrenoId);
    if (!terreno) return;
    
    showCustomPrompt('Nome della nuova specie:', '', (speciesName) => {
        if (speciesName && speciesName.trim() !== '') {
            showCustomPrompt('Quantità (in m²):', '', (quantity) => {
                if (quantity && !isNaN(quantity) && parseFloat(quantity) > 0) {
                    const newSpecies = {
                        name: speciesName.trim(),
                        quantity: parseFloat(quantity)
                    };
                    
                    terreno.species.push(newSpecies);
                    
                    // Aggiorna la UI
                    if (draftTerreno) {
                        // Se è un terreno in bozza, aggiorna solo la sidebar
                        renderTerreniList();
                        // Aggiorna anche la lista delle specie per mostrare la nuova specie aggiunta
                        renderSpeciesListForSelectedTerrain();
                    } else {
                        // Se è un terreno salvato, aggiorna la tabella
                        updateTerreniTable();
                    }
                    updateDashboard();
                    
                    // NON salva nel database se è in bozza (solo dopo "Salva dati terreno")
                    if (!draftTerreno) {
                        saveTerreniToDatabase();
                    }
                    
                    showCustomAlert(`Specie "${speciesName}" aggiunta al terreno "${terreno.name}"`);
                } else {
                    showCustomAlert('Inserisci una quantità valida maggiore di zero.');
                }
            });
        } else {
            showCustomAlert('Inserisci un nome valido per la specie.');
        }
    });
}

// Modifica una specie esistente in un terreno
function editSpeciesInTerrain(terrenoId) {
    // Usa il terreno in bozza se presente, altrimenti cerca nell'array terreni
    const terreno = draftTerreno || terreni.find(t => t.id == terrenoId);
    if (!terreno || terreno.species.length === 0) return;
    
    // Crea una lista delle specie per la selezione
    const speciesList = terreno.species.map((s, index) => `${index + 1}. ${s.name} (${s.quantity}m²)`).join('\n');
    
    showCustomPrompt(`Seleziona il numero della specie da modificare:\n\n${speciesList}`, '', (selection) => {
        const index = parseInt(selection) - 1;
        if (index >= 0 && index < terreno.species.length) {
            const species = terreno.species[index];
            
            showCustomPrompt(`Nuovo nome per "${species.name}":`, species.name, (newName) => {
                if (newName && newName.trim() !== '') {
                    showCustomPrompt(`Nuova quantità per "${newName.trim()}":`, species.quantity.toString(), (newQuantity) => {
                        if (newQuantity && !isNaN(newQuantity) && parseFloat(newQuantity) > 0) {
                            species.name = newName.trim();
                            species.quantity = parseFloat(newQuantity);
                            

                            // Aggiorna la UI
                            if (draftTerreno) {
                                // Se è un terreno in bozza, aggiorna solo la sidebar
                                renderTerreniList();
                                // Aggiorna anche la lista delle specie per mostrare la nuova specie aggiunta
                                renderSpeciesListForSelectedTerrain();
                            } else {
                                // Se è un terreno salvato, aggiorna la tabella
                                updateTerreniTable();
                            }
                            updateDashboard();
                            
                            // NON salva nel database se è in bozza (solo dopo "Salva dati terreno")
                            if (!draftTerreno) {
                                saveTerreniToDatabase();
                            }
                            
                            showCustomAlert(`Specie "${newName}" modificata con successo`);
                        } else {
                            showCustomAlert('Inserisci una quantità valida maggiore di zero.');
                        }
                    });
                } else {
                    showCustomAlert('Inserisci un nome valido per la specie.');
                }
            });
        } else {
            showCustomAlert('Selezione non valida.');
        }
    });
}

// Elimina una specie da un terreno
function deleteSpeciesFromTerrain(terrenoId) {
    // Usa il terreno in bozza se presente, altrimenti cerca nell'array terreni
    const terreno = draftTerreno || terreni.find(t => t.id == terrenoId);
    if (!terreno || terreno.species.length === 0) return;
    
    // Crea una lista delle specie per la selezione
    const speciesList = terreno.species.map((s, index) => `${index + 1}. ${s.name} (${s.quantity}m²)`).join('\n');
    
    showCustomPrompt(`Seleziona il numero della specie da eliminare:\n\n${speciesList}`, '', (selection) => {
        const index = parseInt(selection) - 1;
        if (index >= 0 && index < terreno.species.length) {
            const species = terreno.species[index];
            
            showCustomConfirm(`Sei sicuro di voler eliminare la specie "${species.name}" dal terreno "${terreno.name}"?`, (confirmed) => {
                if (confirmed) {
                    terreno.species.splice(index, 1);
                    
                    // Aggiorna la UI
                    if (draftTerreno) {
                        // Se è un terreno in bozza, aggiorna solo la sidebar
                        renderTerreniList();
                        // Aggiorna anche la lista delle specie per mostrare la nuova specie aggiunta
                        renderSpeciesListForSelectedTerrain();
                    } else {
                        // Se è un terreno salvato, aggiorna la tabella
                        updateTerreniTable();
                    }
                    updateDashboard();
                    
                    // NON salva nel database se è in bozza (solo dopo "Salva dati terreno")
                    if (!draftTerreno) {
                        saveTerreniToDatabase();
                    }
                    
                    showCustomAlert(`Specie "${species.name}" eliminata dal terreno "${terreno.name}"`);
                }
            });
        } else {
            showCustomAlert('Selezione non valida.');
        }
    });
}

// Salva i terreni in localStorage (fallback)
function saveTerreniToLocalStorage() {
    try {
        localStorage.setItem('terreni', JSON.stringify(terreni));
        console.log('Terreni salvati in localStorage');
    } catch (error) {
        console.error('Errore nel salvataggio in localStorage:', error);
    }
}

// Menu collassabile: apertura/chiusura con freccia e comportamento accordion
function toggleCollapsibleMenu(menuId) {
    const menu = document.getElementById(menuId);
    if (!menu) return;
    
    const menuContent = menu.querySelector('.menu-content');
    const arrowIcon = menu.querySelector('.arrow-icon');
    const opening = !menuContent.classList.contains('open');
    
    if (opening) {
        // Comportamento accordion: chiudi tutti gli altri menu prima di aprire questo
        const allMenus = document.querySelectorAll('.collapsible-menu');
        allMenus.forEach(otherMenu => {
            if (otherMenu.id !== menuId) {
                const otherMenuContent = otherMenu.querySelector('.menu-content');
                const otherArrowIcon = otherMenu.querySelector('.arrow-icon');
                
                // Chiudi l'altro menu
                otherMenuContent.classList.remove('open');
                otherMenuContent.classList.add('hidden');
                if (otherArrowIcon) otherArrowIcon.style.transform = 'rotate(45deg)'; // Freccia punta verso destra
            }
        });
        
        // Apre il menu corrente
        menuContent.classList.remove('hidden');
        menuContent.classList.add('open');
        if (arrowIcon) arrowIcon.style.transform = 'rotate(135deg)'; // Freccia punta verso il basso
        
        // Inizializza la mappa al primo open, poi solo invalidate
        setTimeout(() => {
            if (!mainMap) {
                initializeMainMap();
            } else {
                mainMap.invalidateSize();
            }
        }, 300);
    } else {
        // Chiude il menu corrente
        menuContent.classList.remove('open');
        menuContent.classList.add('hidden');
        if (arrowIcon) arrowIcon.style.transform = 'rotate(45deg)'; // Freccia punta verso destra
    }
}

// Funzione per modificare il nome del terreno in bozza
function editDraftTerrenoName() {
    if (!draftTerreno) return;
    
    showCustomPrompt('Nuovo nome per il terreno:', draftTerreno.name, (newName) => {
        if (newName && newName.trim() !== '') {
            draftTerreno.name = newName.trim();
            renderTerreniList(); // Aggiorna la sidebar
            showCustomAlert(`Nome del terreno modificato in "${newName}"`);
        } else {
            showCustomAlert('Inserisci un nome valido per il terreno.');
        }
    });
}

// Funzione per eliminare il terreno in bozza
function deleteDraftTerreno() {
    if (!draftTerreno) return;
    
    showCustomConfirm(`Sei sicuro di voler eliminare il terreno "${draftTerreno.name}"?`, () => {
        draftTerreno = null; // Rimuove il terreno in bozza
        renderTerreniList(); // Aggiorna la sidebar
        showCustomAlert('Terreno in bozza eliminato.');
    });
}

// Funzione helper per aggiornare le coordinate quando si trova un indirizzo
function updateCoordinatesFromAddress(lat, lon) {
    // Aggiorna i campi coordinate se esistono
    const latInput = document.getElementById('latitude');
    const lonInput = document.getElementById('longitude');
    
    if (latInput && lonInput) {
        latInput.value = lat.toFixed(6);
        lonInput.value = lon.toFixed(6);
    }
    
    // Aggiorna anche il draftTerreno se esiste
    if (draftTerreno) {
        draftTerreno.coordinates = [lat, lon];
        console.log('Coordinate aggiornate nel draftTerreno:', draftTerreno.coordinates);
    }
}

// Recupera user_id dal body
document.addEventListener('DOMContentLoaded', () => {
  currentUserId = document.body.dataset.userId;
  if (!currentUserId) {
    alert('Errore: user_id non trovato.');
    return;
  }
  // Altre inizializzazioni se necessarie
});