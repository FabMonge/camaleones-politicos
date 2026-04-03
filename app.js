// Variable global y Panel de Configuración Modular
const esMovil = window.innerWidth <= 768;

const CONFIG = {
    archivos: {
        regiones: "Ganadores_elecciones.csv",
        nacion: "Resumen_eleccion_nacion.csv"
    },
    animacion: {
        velocidad: 3000
    },
    colores: {
        defecto: "#eeeeee",
        macro: {
            "ORIENTE": "#0047ab",
            "NORTE": "#E53935",
            "CENTRO": "#4caf50",
            "SUR": "#9b59b6",
            "LIMA Y CALLAO": "#f1c40f"
        }
    }
};

// ===============================================
// BLOQUE 1: MAPA PRINCIPAL INTERACTIVO (FASE 1)
// ===============================================

const map = L.map('map', {
    zoomControl: false, dragging: false, scrollWheelZoom: false,
    doubleClickZoom: false, touchZoom: false, attributionControl: false, zoomSnap: 0 
}).setView(
    esMovil ? [-12.0, -75.0] : [-10.0, -76.5], 
    esMovil ? 4.4 : 5.55                     
);

let elecciones = {}, periodos = [], currentIndex = 0;
let geoJsonLayer, callaoInset, pexLayer;
let timerInterval, isPlaying = true;

const excepcionesLocales = {
    "1980 - 1ra Vuelta": { "PUNO": "Roger Cáceres" },
    "2016 - 1ra Vuelta": { "CAJAMARCA": "Gregorio Santos" },
    "2021 - 1ra Vuelta": { "LA LIBERTAD": "César Acuña" } 
};

const notasHistoricas = {
    "1980 - 1ra Vuelta": { 
        "UCAYALI": "La región fue creada en junio de 1980, luego de esta elección, antes formaba parte de Loreto." 
    }
};

const generarLabel = (anio, vueltaStr) => {
    const tipoVuelta = String(vueltaStr).toLowerCase().includes('prim') ? '1ra Vuelta' : '2da Vuelta';
    return `${String(anio).trim()} - ${tipoVuelta}`;
};

const getStyle = (name) => {
    const n = name ? name.toUpperCase().trim() : "";
    const elec = elecciones[periodos[currentIndex]];
    const fillColor = (elec && elec.mapa[n]) ? elec.mapa[n].color : CONFIG.colores.defecto;
    return { fillColor: fillColor, weight: 0.8, opacity: 1, color: "#444444", fillOpacity: 1 };
};

function onEachFeature(feature, layer) {
    let n = feature?.properties?.NOMBDEP ? feature.properties.NOMBDEP.toUpperCase().trim() : "CALLAO";
    let anioActual = periodos[currentIndex];
    
    if (notasHistoricas[anioActual] && notasHistoricas[anioActual][n]) {
        layer.bindPopup(`
            <div class="popup-region">${n}</div>
            <div class="popup-historical-note">${notasHistoricas[anioActual][n]}</div>
        `, { closeButton: false });
        return; 
    }

    let currentElec = elecciones[anioActual];
    if (currentElec && currentElec.mapa[n]) {
        let d = currentElec.mapa[n];
        let textoLocalHtml = "";
        
        if (excepcionesLocales[anioActual] && excepcionesLocales[anioActual][n]) {
            textoLocalHtml = `<div class="popup-local-winner">${excepcionesLocales[anioActual][n]}</div>`;
        }

        layer.bindPopup(`
            <div class="popup-region">${n}</div>
            ${textoLocalHtml}
            <div class="popup-party">${d.partido}</div>
            <div class="popup-pct">${d.pct} <span class="popup-pct-label">(votos válidos)</span></div>
        `, { closeButton: false });
    }
}

function createCard(cand, anio) {
    if (!cand || !cand.nombre) return '';
    const bgImage = `background-image: url('fotos/${cand.idFoto}_${anio}.png'), url('fotos/${cand.idFoto}.png'); background-size: cover; background-position: center center;`;
    const dotHtml = cand.color ? `<div class="dot" style="background:${cand.color};"></div>` : '';

    return `
        <div class="photo" style="${bgImage}"></div>
        <div class="cand-info-container">
            <span class="cand-name">${cand.nombre}</span>
            <span class="cand-party">${cand.partido}</span>
            <div class="cand-pct">
                ${dotHtml}
                <span>${cand.pct}</span>
            </div>
        </div>
    `;
}

function updateLegend() {
    const currentData = elecciones[periodos[currentIndex]];
    if (!currentData) return;
    const anioActual = periodos[currentIndex].split(' - ')[0];
    
    document.getElementById("cand-1").innerHTML = currentData.candidatos[0] ? createCard(currentData.candidatos[0], anioActual) : '';
    document.getElementById("cand-2").innerHTML = currentData.candidatos[1] ? createCard(currentData.candidatos[1], anioActual) : '';
    
    const bottom = document.getElementById("bottom-candidates");
    bottom.innerHTML = currentData.candidatos.slice(2).reduce((html, cand) => {
        if (!cand) return html;
        return html + `<div class="candidate-small">${createCard(cand, anioActual)}</div>`;
    }, "");
}

// Inicialización de datos con manejador de errores
Promise.all([
    new Promise(res => Papa.parse(CONFIG.archivos.regiones, { download: true, header: true, skipEmptyLines: true, delimiter: ";", transformHeader: h => h.replace(/^\uFEFF/, '').trim().toLowerCase(), complete: res })),
    new Promise(res => Papa.parse(CONFIG.archivos.nacion, { download: true, header: true, skipEmptyLines: true, delimiter: ";", transformHeader: h => h.replace(/^\uFEFF/, '').trim().toLowerCase(), complete: res }))
]).then(results => {
    const [regionesData, nacionData] = results;

    nacionData.data.forEach(row => {
        const anio = row['año'] || row['ano'] || Object.values(row)[0];
        const puestoRaw = (row['puesto'] || "").toUpperCase().trim();
        if (!anio || !row['vuelta'] || !row['candidato'] || !puestoRaw) return; 

        const label = generarLabel(anio, row['vuelta']);
        if (!elecciones[label]) elecciones[label] = { mapa: {}, candidatos: [] };

        const nombreLimpio = row['candidato'].trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\./g, '').replace(/\s+/g, '_');
        const idx = ['PRIMERO', 'SEGUNDO', 'TERCERO', 'CUARTO'].indexOf(puestoRaw);
        
        if (idx !== -1) {
            elecciones[label].candidatos[idx] = { 
                nombre: row['candidato'].trim(), 
                partido: (row['organización política'] || row['organizacion politica'] || "").trim(), 
                pct: row['%_votos_validos'] || "", 
                color: (row['color'] || "").trim(),
                idFoto: nombreLimpio
            };
        }
    });

    regionesData.data.forEach(row => {
        const anio = row['año'] || row['ano'] || Object.values(row)[0];
        let region = row["distrito electoral"];
        if (!anio || !row['vuelta'] || !region) return; 

        const label = generarLabel(anio, row['vuelta']);
        if (!elecciones[label]) elecciones[label] = { mapa: {}, candidatos: [] };
        
        region = region.toUpperCase().trim();
        if (region.includes("EXTRANJERO")) region = "EXTRANJERO";

        elecciones[label].mapa[region] = { 
            color: (row['color'] || "").trim() || CONFIG.colores.defecto, 
            partido: (row["organización política"] || row["organizacion politica"] || "").trim(), 
            pct: row["%_votos_validos"] || "" 
        };
    });

    periodos = Object.keys(elecciones).sort();
    if (periodos.length === 0) return document.getElementById("year-display").innerText = "Error CSV";

    fetch("mapa.geojson?v=" + Date.now()).then(res => res.json()).then(data => {
        geoJsonLayer = L.geoJSON(data, { style: f => getStyle(f.properties.NOMBDEP), onEachFeature: onEachFeature }).addTo(map);

        const callaoF = data.features.find(f => f.properties.NOMBDEP === "CALLAO");
        if (callaoF) {
            let callaoGeom = JSON.parse(JSON.stringify(callaoF.geometry));
            const shift = [-82.5, -11.5], scale = 12, center = [-77.12, -12.05];
            callaoGeom.coordinates = (function transform(coords) { return Array.isArray(coords[0]) ? coords.map(transform) : [shift[0] + (coords[0] - center[0]) * scale, shift[1] + (coords[1] - center[1]) * scale]; })(callaoGeom.coordinates);
            callaoInset = L.geoJSON(callaoGeom, { style: getStyle("CALLAO"), onEachFeature: onEachFeature }).addTo(map);
            L.polyline([[-10.8, -82.2], [-12.05, -77.50]], { color: "#444", weight: 1.2, dashArray: "5, 5" }).addTo(map);
            L.marker([-8.5, -82.75], { icon: L.divIcon({ className: 'pex-label', html: 'CALLAO', iconSize: [100, 20], iconAnchor: [50, 10] }), interactive: false }).addTo(map);
        }

        const coordMundito = esMovil ? [-17.5, -81.5] : [-16.0, -81.5]; 
        const coordPopupMundito = esMovil ? [-18.2, -81.5] : [-14.7, -81.5];

        pexLayer = L.marker(coordMundito, { icon: L.divIcon({ className: 'pex-globe-container', html: '<div class="pex-globe"></div><div class="pex-label">Peruanos en<br>el extranjero</div>', iconSize: [120, 100], iconAnchor: [60, 50] }) }).addTo(map);
        
        pexLayer.on('click', () => {
            let d = elecciones[periodos[currentIndex]]?.mapa["EXTRANJERO"];
            if (d) L.popup().setLatLng(coordPopupMundito).setContent(`<div class="popup-region">EXTRANJERO</div><div class="popup-party">${d.partido}</div><div class="popup-pct">${d.pct} <span class="popup-pct-label">(votos válidos)</span></div>`).openOn(map);
        });

        actualizarPantalla();
        iniciarAnimacion();
    });
}).catch(error => {
    console.error("Error crítico cargando los datos electorales:", error);
    document.getElementById("year-display").innerText = "⚠️ Error cargando datos.";
});

function actualizarPantalla() {
    document.getElementById("year-display").innerText = periodos[currentIndex];
    geoJsonLayer.setStyle(layerFeature => getStyle(layerFeature.properties.NOMBDEP));
    geoJsonLayer.eachLayer(layer => onEachFeature(layer.feature, layer));
    if (callaoInset) {
        callaoInset.setStyle(getStyle("CALLAO"));
        callaoInset.eachLayer(layer => onEachFeature(layer.feature, layer));
    }
    
    let globe = pexLayer?.getElement()?.querySelector('.pex-globe');
    if (globe) {
        let currentElec = elecciones[periodos[currentIndex]];
        let d = currentElec ? currentElec.mapa["EXTRANJERO"] : null;
        let colorFondo = (d && d.color && d.color !== CONFIG.colores.defecto) ? d.color : 'transparent';

        if (periodos[currentIndex].includes("1980")) {
            globe.style.backgroundColor = "#ffffff"; 
            globe.style.filter = "invert(1)";
        } else {
            globe.style.backgroundColor = colorFondo; 
            globe.style.filter = "none";              
        }
    }

    updateLegend();

    const noteContainer = document.getElementById("year-note");
    const editorNoteContainer = document.getElementById("editor-note");

    if (periodos[currentIndex].includes("2000")) {
        if (esMovil) {
            noteContainer.innerHTML = `
                <div id="btn-contexto-movil" style="cursor:pointer; font-weight:900; color:#111; text-align:center;">
                    Mostrar contexto histórico 
                </div>
                <div id="texto-contexto-movil" style="display:none; margin-top:8px; border-top: 1px solid #ddd; padding-top: 8px;">
                    Las elecciones generales del año 2000, que culminaron en la re-reelección de Alberto Fujimori, recibieron serios señalamientos de fraude por parte de organismos internacionales.
                </div>
            `;
            noteContainer.style.display = "block";
            if (editorNoteContainer) editorNoteContainer.style.display = "none";
            
            document.getElementById("btn-contexto-movil").addEventListener("click", function() {
                const texto = document.getElementById("texto-contexto-movil");
                if (texto.style.display === "none") {
                    texto.style.display = "block";
                    this.innerHTML = "Ocultar contexto histórico";
                } else {
                    texto.style.display = "none";
                    this.innerHTML = "Mostrar contexto histórico";
                }
            });
        } else {
            noteContainer.style.display = "none";
            if (editorNoteContainer) {
                editorNoteContainer.innerHTML = "<strong>Nota del editor:</strong> Las elecciones generales del año 2000, que culminaron en la re-reelección de Alberto Fujimori, recibieron serios señalamientos de fraude por parte de organismos internacionales.";
                editorNoteContainer.style.display = "block";
            }
        }
    } else {
        noteContainer.style.display = "none";
        if (editorNoteContainer) editorNoteContainer.style.display = "none";
    }
}
const btnPlayPause = document.getElementById("play-pause-btn");
const btnPrev = document.getElementById("prev-btn");
const btnNext = document.getElementById("next-btn");
const btnRestart = document.getElementById("restart-btn");

function avanzarFrame() { currentIndex = (currentIndex + 1) % periodos.length; actualizarPantalla(); }
function retrocederFrame() { currentIndex = (currentIndex - 1 + periodos.length) % periodos.length; actualizarPantalla(); }

function iniciarAnimacion() { 
    timerInterval = setInterval(avanzarFrame, CONFIG.animacion.velocidad); 
    isPlaying = true; btnPlayPause.innerHTML = "⏸"; 
    btnPrev.disabled = true; btnNext.disabled = true;
}

function pausarAnimacion() { 
    clearInterval(timerInterval); 
    isPlaying = false; btnPlayPause.innerHTML = "▶"; 
    btnPrev.disabled = false; btnNext.disabled = false;
}

btnPlayPause.addEventListener("click", () => isPlaying ? pausarAnimacion() : iniciarAnimacion());
btnNext.addEventListener("click", () => { if (!isPlaying) avanzarFrame(); });
btnPrev.addEventListener("click", () => { if (!isPlaying) retrocederFrame(); });

btnRestart.addEventListener("click", () => {
    currentIndex = 0; actualizarPantalla();
    if (!isPlaying) iniciarAnimacion();
    else { clearInterval(timerInterval); timerInterval = setInterval(avanzarFrame, CONFIG.animacion.velocidad); }
});

// ===============================================
// BLOQUE 2: DICCIONARIO MAESTRO 2021 (MAPA + GRÁFICO FASE 2)
// ===============================================
const dataRegiones2021 = {
    "AMAZONAS": { macro: "ORIENTE", electores: 306186 },
    "ANCASH": { macro: "NORTE", electores: 886265 },
    "APURIMAC": { macro: "CENTRO", electores: 316000 },
    "AREQUIPA": { macro: "SUR", electores: 1145268 },
    "AYACUCHO": { macro: "CENTRO", electores: 473282 },
    "CAJAMARCA": { macro: "NORTE", electores: 1103247 },
    "CUSCO": { macro: "SUR", electores: 1025280 },
    "HUANCAVELICA": { macro: "CENTRO", electores: 299843 },
    "HUANUCO": { macro: "CENTRO", electores: 586411 },
    "ICA": { macro: "SUR", electores: 651364 },
    "JUNIN": { macro: "CENTRO", electores: 982556 },
    "LA LIBERTAD": { macro: "NORTE", electores: 1429469 },
    "LAMBAYEQUE": { macro: "NORTE", electores: 977656 },
    "LIMA": { macro: "LIMA Y CALLAO", electores: 8322644 },
    "LORETO": { macro: "ORIENTE", electores: 699964 },
    "MADRE DE DIOS": { macro: "ORIENTE", electores: 116513 },
    "MOQUEGUA": { macro: "SUR", electores: 148367 },
    "PASCO": { macro: "CENTRO", electores: 200682 },
    "PIURA": { macro: "NORTE", electores: 1396448 },
    "PUNO": { macro: "SUR", electores: 922016 },
    "SAN MARTIN": { macro: "ORIENTE", electores: 636330 },
    "TACNA": { macro: "SUR", electores: 282974 },
    "TUMBES": { macro: "NORTE", electores: 167771 },
    "CALLAO": { macro: "LIMA Y CALLAO", electores: 824496 },
    "UCAYALI": { macro: "ORIENTE", electores: 389889 }
};

// ===============================================
// BLOQUE 3: MAPA DE IMPACTO (FASE 2)
// ===============================================
const staticOptionsImpacto = {
    zoomControl: false, dragging: false, scrollWheelZoom: false,
    doubleClickZoom: false, touchZoom: false, attributionControl: false, zoomSnap: 0
};

const mapaImpacto = L.map('mapa-impacto', staticOptionsImpacto).setView(
    esMovil ? [-9.0, -75.0] : [-9.5, -74.5], 
    esMovil ? 5.0 : 5.4                      
);
let capaCartograma;

function sincronizarFoco(macroObjetivo, origen = 'otro') {
    if (capaCartograma) {
        capaCartograma.eachLayer(layer => {
            const data = dataRegiones2021[layer.feature.properties.NOMBDEP];
            if (!macroObjetivo) {
                layer.setStyle({ fillColor: CONFIG.colores.macro[data.macro], fillOpacity: 0.85, opacity: 1, color: "#ffffff" });
            } else if (data && data.macro === macroObjetivo) {
                layer.setStyle({ fillColor: CONFIG.colores.macro[data.macro], fillOpacity: 1, opacity: 1, color: "#ffffff" }); 
            } else {
                layer.setStyle({ fillColor: '#e5e5e5', fillOpacity: 0.7, opacity: 1, color: "#ffffff" }); 
            }
        });
    }

    if (window.graficoAreas) {
        let targetDatasetIndex = -1;

        window.graficoAreas.data.datasets.forEach((dataset, index) => {
            if (!macroObjetivo || dataset.label === macroObjetivo) {
                dataset.backgroundColor = CONFIG.colores.macro[dataset.label];
                dataset.borderColor = CONFIG.colores.macro[dataset.label];
                if (dataset.label === macroObjetivo) targetDatasetIndex = index;
            } else {
                dataset.backgroundColor = '#eaeaea'; 
                dataset.borderColor = '#d1d1d1';     
            }
        });

        if (origen !== 'grafico') {
            if (macroObjetivo && targetDatasetIndex !== -1) {
                window.graficoAreas.tooltip.setActiveElements([{ datasetIndex: targetDatasetIndex, index: 2 }], {x: 0, y: 0});
                window.graficoAreas.setActiveElements([{ datasetIndex: targetDatasetIndex, index: 2 }]);
            } else {
                window.graficoAreas.tooltip.setActiveElements([], {x: 0, y: 0});
                window.graficoAreas.setActiveElements([]);
            }
        }
        window.graficoAreas.update(); 
    }

    document.querySelectorAll('.leyenda-item').forEach(item => {
        if (!macroObjetivo || item.id === `leyenda-${macroObjetivo}`) {
            item.style.opacity = '1';
        } else {
            item.style.opacity = '0.3';
        }
    });
}

function onEachFeatureImpacto(feature, layer) {
    const regionNombre = feature.properties.NOMBDEP;
    const data = dataRegiones2021[regionNombre];

    if (data) {
        const electoresFmt = new Intl.NumberFormat('es-PE').format(data.electores);
        layer.bindPopup(`
            <div class="popup-region">${regionNombre}</div>
            <div class="popup-party" style="font-weight:bold; color: ${CONFIG.colores.macro[data.macro]};">MACRORREGIÓN ${data.macro}</div>
            <div class="popup-pct">${electoresFmt} <span class="popup-pct-label">(electores)</span></div>
        `, { closeButton: false });

        layer.on({
            mouseover: (e) => sincronizarFoco(data.macro, 'mapa'),
            mouseout: (e) => sincronizarFoco(null, 'mapa')
        });
    }
}

fetch("mapa_2021_def.geojson")
    .then(res => res.json())
    .then(data => {
        capaCartograma = L.geoJSON(data, {
            style: (feature) => {
                const macro = dataRegiones2021[feature.properties.NOMBDEP]?.macro;
                return { fillColor: CONFIG.colores.macro[macro] || "#ccc", weight: 1.5, opacity: 1, color: "#ffffff", fillOpacity: 0.85 };
            },
            onEachFeature: onEachFeatureImpacto
        }).addTo(mapaImpacto);
    }).catch(error => console.error("Error cargando mapa Fase 2:", error));

// ===============================================
// BLOQUE 4: GRÁFICO DE ÁREAS Y LEYENDA (FASE 2)
// ===============================================
const ctxImpacto = document.getElementById('grafico-areas').getContext('2d');

window.graficoAreas = new Chart(ctxImpacto, {
    type: 'line',
    data: {
        labels: ['1980', '2001', '2021'],
        datasets: [
            { label: 'LIMA Y CALLAO', data: [2571748, 5549649, 9147140], borderColor: CONFIG.colores.macro['LIMA Y CALLAO'], backgroundColor: CONFIG.colores.macro['LIMA Y CALLAO'], fill: true, pointRadius: 4, pointHoverRadius: 6 },
            { label: 'NORTE', data: [1518390, 3619731, 5960856], borderColor: CONFIG.colores.macro['NORTE'], backgroundColor: CONFIG.colores.macro['NORTE'], fill: true, pointRadius: 4, pointHoverRadius: 6 },
            { label: 'SUR', data: [1150253, 2569392, 4175269], borderColor: CONFIG.colores.macro['SUR'], backgroundColor: CONFIG.colores.macro['SUR'], fill: true, pointRadius: 4, pointHoverRadius: 6 },
            { label: 'CENTRO', data: [862783, 1846016, 2858774], borderColor: CONFIG.colores.macro['CENTRO'], backgroundColor: CONFIG.colores.macro['CENTRO'], fill: true, pointRadius: 4, pointHoverRadius: 6 },
            { label: 'ORIENTE', data: [328447, 1065762, 2148882], borderColor: CONFIG.colores.macro['ORIENTE'], backgroundColor: CONFIG.colores.macro['ORIENTE'], fill: true, pointRadius: 4, pointHoverRadius: 6 }
        ]
    },
    options: {
        responsive: true, maintainAspectRatio: false, animation: { duration: 250 },
        interaction: { mode: 'nearest', axis: 'xy', intersect: false },
        scales: { x: { grid: { display: false } }, y: { stacked: true, ticks: { callback: value => value / 1000000 + ' M' } } },
        plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: function(context) { let label = context.dataset.label || ''; if (label) { label += ': '; } if (context.parsed.y !== null) { label += new Intl.NumberFormat('es-PE').format(context.parsed.y); } return label; } } }
        },
        onHover: (event, activeElements) => {
            if (activeElements.length > 0) {
                const datasetIndex = activeElements[0].datasetIndex;
                const macroHovered = window.graficoAreas.data.datasets[datasetIndex].label;
                sincronizarFoco(macroHovered, 'grafico');
            } else {
                sincronizarFoco(null, 'grafico');
            }
        }
    }
});

document.getElementById('grafico-areas').addEventListener('mouseleave', () => sincronizarFoco(null, 'grafico'));

const contenedorLeyenda = document.getElementById('leyenda-compartida');
if (contenedorLeyenda) {
    contenedorLeyenda.innerHTML = ''; 
    Object.keys(CONFIG.colores.macro).forEach(macro => {
        const item = document.createElement('div');
        item.className = 'leyenda-item';
        item.id = `leyenda-${macro}`;
        
        const colorBox = document.createElement('div');
        colorBox.className = 'leyenda-color';
        colorBox.style.backgroundColor = CONFIG.colores.macro[macro];
        
        const texto = document.createElement('span');
        texto.innerText = macro;
        
        item.appendChild(colorBox);
        item.appendChild(texto);
        
        item.addEventListener('mouseover', () => sincronizarFoco(macro, 'leyenda'));
        item.addEventListener('mouseout', () => sincronizarFoco(null, 'leyenda'));
        
        contenedorLeyenda.appendChild(item);
    });
}

// ===============================================
// BLOQUE 5: FASE 3 - MAPA DE PARTICIPACIÓN (AZUL)
// ===============================================
const periodosFase3 = ['1980', '1985', '1990 - 1ra Vuelta', '1990 - 2da Vuelta', '1995', '2000 - 1ra Vuelta', '2000 - 2da Vuelta', '2001 - 1ra Vuelta', '2001 - 2da Vuelta', '2006 - 1ra Vuelta', '2006 - 2da Vuelta', '2011 - 1ra Vuelta', '2011 - 2da Vuelta', '2016 - 1ra Vuelta', '2016 - 2da Vuelta', '2021 - 1ra Vuelta', '2021 - 2da Vuelta'];

const participacionNacion = [82.52, 90.60, 78.57, 79.94, 73.85, 82.82, 81.01, 82.28, 81.37, 88.71, 87.71, 83.71, 82.54, 81.80, 80.09, 70.05, 74.57];

const participacionRegiones = {
    "AMAZONAS": [73.13, 93.15, 62.23, 63.55, 66.83, 78.53, 74.27, 76.25, 73.25, 85.49, 82.60, 75.87, 73.02, 71.64, 67.58, 60.11, 63.32],
    "ANCASH": [81.03, 91.39, 72.92, 74.35, 69.27, 81.78, 79.90, 81.25, 79.90, 89.18, 87.97, 83.21, 81.77, 79.09, 77.30, 69.26, 73.26],
    "APURIMAC": [72.30, 82.10, 72.08, 72.15, 63.52, 77.41, 74.56, 76.22, 73.37, 86.58, 84.07, 79.40, 76.88, 76.96, 72.30, 69.39, 71.96],
    "AREQUIPA": [82.23, 92.43, 86.25, 86.10, 75.30, 87.24, 85.44, 86.75, 86.09, 90.97, 90.47, 88.10, 87.64, 86.50, 85.79, 78.78, 79.69],
    "AYACUCHO": [75.30, 82.87, 52.47, 59.54, 53.50, 74.00, 71.89, 73.69, 70.84, 87.61, 85.96, 78.87, 76.67, 77.34, 73.33, 68.63, 71.92],
    "CAJAMARCA": [74.92, 87.49, 73.32, 70.44, 68.46, 80.81, 77.69, 78.77, 77.40, 88.24, 85.63, 80.81, 78.82, 77.21, 73.45, 62.60, 69.30],
    "CUSCO": [79.54, 87.15, 75.57, 75.78, 64.73, 78.93, 75.28, 78.51, 76.43, 87.76, 85.47, 83.41, 81.61, 81.44, 78.54, 73.52, 75.85],
    "HUANCAVELICA": [77.20, 78.31, 59.61, 55.67, 55.59, 75.16, 73.20, 74.67, 72.30, 89.19, 86.70, 76.95, 73.96, 73.38, 68.74, 67.55, 68.99],
    "HUANUCO": [75.68, 85.51, 49.89, 56.11, 60.17, 74.73, 71.64, 73.01, 70.08, 86.80, 84.15, 78.34, 74.43, 74.71, 70.24, 68.28, 69.10],
    "ICA": [83.28, 94.94, 85.63, 86.28, 77.63, 88.37, 87.32, 87.95, 87.64, 92.31, 91.90, 88.99, 88.38, 87.43, 86.94, 75.97, 79.87],
    "JUNIN": [80.63, 90.19, 50.55, 66.63, 65.91, 81.71, 80.15, 80.97, 79.69, 88.16, 87.81, 81.92, 80.88, 80.81, 79.55, 71.93, 74.37],
    "LA LIBERTAD": [81.50, 93.54, 81.94, 80.90, 71.23, 82.71, 81.02, 81.80, 81.46, 88.94, 88.33, 84.84, 83.96, 82.48, 80.89, 68.93, 74.36],
    "LAMBAYEQUE": [86.68, 92.29, 84.24, 83.55, 78.72, 85.85, 84.15, 85.06, 84.59, 89.06, 88.31, 84.53, 83.95, 83.32, 82.41, 71.40, 76.32],
    "LIMA": [84.63, 92.17, 87.06, 87.48, 78.79, 85.52, 84.21, 85.36, 84.93, 90.18, 89.65, 87.74, 87.16, 86.66, 86.31, 74.57, 79.66],
    "LORETO": [72.15, 87.17, 75.42, 75.80, 70.16, 76.91, 72.77, 77.19, 75.72, 84.20, 82.75, 75.00, 73.45, 70.19, 68.17, 60.93, 61.92],
    "MADRE DE DIOS": [83.33, 83.40, 73.51, 80.17, 62.81, 74.40, 72.31, 71.67, 71.97, 85.08, 84.35, 82.66, 81.91, 80.89, 79.87, 71.07, 73.66],
    "MOQUEGUA": [95.38, 92.59, 90.44, 86.13, 75.69, 88.54, 86.95, 87.91, 87.18, 91.63, 91.17, 87.26, 86.78, 86.61, 85.54, 77.20, 78.37],
    "PASCO": [77.62, 86.94, 62.81, 72.16, 64.56, 81.21, 79.40, 79.47, 77.71, 88.42, 87.75, 79.03, 77.24, 76.01, 73.38, 63.65, 67.23],
    "PIURA": [84.48, 91.55, 84.64, 85.30, 76.67, 85.15, 83.90, 84.18, 83.80, 90.04, 89.06, 85.32, 84.38, 82.76, 81.56, 66.75, 75.34],
    "PUNO": [83.67, 90.99, 77.47, 78.36, 72.93, 84.91, 83.28, 84.72, 83.88, 92.65, 91.38, 87.00, 85.22, 85.49, 83.13, 81.91, 82.09],
    "SAN MARTIN": [79.67, 85.48, 68.64, 73.47, 65.81, 79.61, 77.89, 78.18, 76.88, 87.51, 85.85, 82.04, 80.54, 78.83, 77.31, 69.17, 73.07],
    "TACNA": [88.58, 93.73, 92.91, 94.65, 80.55, 90.02, 88.20, 89.80, 89.47, 92.35, 92.11, 89.24, 88.56, 86.46, 85.57, 77.80, 79.35],
    "TUMBES": [83.83, 95.61, 90.62, 94.51, 76.28, 87.42, 86.57, 86.92, 87.18, 91.59, 91.01, 85.47, 85.12, 83.42, 82.81, 74.56, 78.32],
    "CALLAO": [85.35, 94.05, 86.26, 84.55, 78.59, 84.49, 83.55, 84.39, 84.02, 89.90, 89.41, 87.62, 87.12, 86.54, 86.14, 75.23, 79.53],
    "UCAYALI": [null, 85.95, 70.36, 77.17, 69.03, 75.39, 73.77, 75.23, 73.96, 84.54, 83.72, 78.62, 77.02, 76.77, 75.28, 66.28, 69.20],
    "EXTRANJERO": [null, 74.26, 45.32, 41.49, null, 49.69, 45.52, 51.79, 49.79, 63.49, 61.79, 53.38, 50.23, 53.34, 44.02, 22.86, 36.47]
};

const obtenerColorAzul = (valor) => {
    if (valor === null || valor === undefined) return "#e0e0e0"; 
    if (valor >= 85) return "#002868"; 
    if (valor >= 80) return "#0047ab"; 
    if (valor >= 75) return "#3a75c4"; 
    if (valor >= 65) return "#75a3dd"; 
    if (valor >= 50) return "#b0d0f5"; 
    return "#e6f0fa";                  
};

let indexActualFase3 = 16; 
const mapaFase3 = L.map('mapa-fase3', {
    zoomControl: false, dragging: false, scrollWheelZoom: false,
    doubleClickZoom: false, touchZoom: false, attributionControl: false, zoomSnap: 0
}).setView(
    esMovil ? [-9.0, -75.0] : [-11.0, -76.5], 
    esMovil ? 4.3 : 4.8                      
);

let capaGeoJsonFase3, callaoInsetFase3, pexLayerFase3;

function repintarMapaFase3() {
    const estiloBase = (valor) => {
        return { fillColor: obtenerColorAzul(valor), weight: 0.8, opacity: 1, color: "#444444", fillOpacity: 0.95 };
    };

    if (capaGeoJsonFase3) {
        capaGeoJsonFase3.setStyle((feature) => {
            let nombre = feature.properties ? feature.properties.NOMBDEP.toUpperCase().trim() : "";
            let valor = (participacionRegiones[nombre]) ? participacionRegiones[nombre][indexActualFase3] : null;
            return estiloBase(valor);
        });
    }

    if (callaoInsetFase3) {
        let valorCallao = participacionRegiones["CALLAO"][indexActualFase3];
        callaoInsetFase3.setStyle(estiloBase(valorCallao));
    }
    
    if (pexLayerFase3) {
        let valorExt = participacionRegiones["EXTRANJERO"][indexActualFase3];
        let globe = pexLayerFase3.getElement()?.querySelector('.pex-globe');
        if (globe) {
            globe.style.backgroundColor = obtenerColorAzul(valorExt);
        }
    }
}

function onEachFeatureFase3(feature, layer) {
    layer.on('mouseover', (e) => {
        let nombre = feature.properties ? feature.properties.NOMBDEP.toUpperCase() : "CALLAO";
        let valor = participacionRegiones[nombre][indexActualFase3];
        let textoValor = valor ? `${valor}%` : "Sin registro";
        
        L.popup()
            .setLatLng(e.latlng)
            .setContent(`
                <div class="popup-region">${nombre}</div>
                <div class="popup-party" style="font-weight:bold; color: #0047ab;">PARTICIPACIÓN</div>
                <div class="popup-pct">${textoValor}</div>
            `)
            .openOn(mapaFase3);
    });
    layer.on('mouseout', () => mapaFase3.closePopup());
}

fetch("mapa.geojson").then(res => res.json()).then(data => {
    capaGeoJsonFase3 = L.geoJSON(data, { 
        style: { color: "#444444", weight: 0.8, fillOpacity: 0.95 },
        onEachFeature: onEachFeatureFase3 
    }).addTo(mapaFase3);

    const callaoF = data.features.find(f => f.properties.NOMBDEP === "CALLAO");
    if (callaoF) {
        let callaoGeom = JSON.parse(JSON.stringify(callaoF.geometry));
        const shift = [-82.5, -11.5], scale = 12, center = [-77.12, -12.05];
        callaoGeom.coordinates = (function transform(coords) { 
            return Array.isArray(coords[0]) ? coords.map(transform) : [shift[0] + (coords[0] - center[0]) * scale, shift[1] + (coords[1] - center[1]) * scale]; 
        })(callaoGeom.coordinates);
        
        callaoInsetFase3 = L.geoJSON(callaoGeom, { 
            style: { color: "#444444", weight: 0.8, fillOpacity: 0.95 },
            onEachFeature: onEachFeatureFase3 
        }).addTo(mapaFase3);
        
        L.polyline([[-10.8, -82.2], [-12.05, -77.50]], { color: "#999", weight: 1, dashArray: "4, 4" }).addTo(mapaFase3);
        L.marker([-8.5, -82.75], { icon: L.divIcon({ className: 'pex-label', html: 'CALLAO', iconSize: [100, 20], iconAnchor: [50, 10] }), interactive: false }).addTo(mapaFase3);
    }

    const coordMunditoFase3 = esMovil ? [-19.5, -81.5] : [-15.5, -81.5];
    const coordPopupMunditoFase3 = esMovil ? [-18.2, -81.5] : [-14.2, -81.5];

    pexLayerFase3 = L.marker(coordMunditoFase3, { 
        icon: L.divIcon({ className: 'pex-globe-container', html: '<div class="pex-globe"></div><div class="pex-label">Extranjero</div>', iconSize: [120, 100], iconAnchor: [60, 50] }) 
    }).addTo(mapaFase3);

    pexLayerFase3.on('mouseover', (e) => {
        let valorExt = participacionRegiones["EXTRANJERO"][indexActualFase3];
        L.popup().setLatLng(coordPopupMunditoFase3).setContent(`
            <div class="popup-region">EXTRANJERO</div>
            <div class="popup-party" style="color: #0047ab;">PARTICIPACIÓN</div>
            <div class="popup-pct">${valorExt ? valorExt+'%' : 'Sin registro'}</div>
        `).openOn(mapaFase3);
    });
    pexLayerFase3.on('mouseout', () => mapaFase3.closePopup());
    
    repintarMapaFase3(); 
}).catch(error => console.error("Error cargando mapa Fase 3:", error));

const labelsFase3 = [
    '1980', '1985', '1990 (1)', '1990 (2)', '1995', 
    '2000 (1)', '2000 (2)', '2001 (1)', '2001 (2)', 
    '2006 (1)', '2006 (2)', '2011 (1)', '2011 (2)', 
    '2016 (1)', '2016 (2)', '2021 (1)', '2021 (2)'
];

const ctxFase3 = document.getElementById('grafico-barras-fase3').getContext('2d');

const graficoNacion = new Chart(ctxFase3, {
    type: 'bar',
    data: {
        labels: labelsFase3,
        datasets: [{
            label: 'Participación Nacional (%)',
            data: participacionNacion,
            backgroundColor: '#d1d1d1', 
            borderRadius: 4
        }]
    },
    options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: { callbacks: { title: (context) => periodosFase3[context[0].dataIndex], label: (context) => ` ${context.parsed.y}%` } }
        },
        scales: {
            x: { grid: { display: false }, ticks: { maxRotation: 90, minRotation: 90, font: { size: 11 } } },
            y: { beginAtZero: true, max: 100, ticks: { stepSize: 20, callback: value => value + '%' } }
        },
        onClick: (event, elements) => {
            if (elements.length > 0) {
                const indice = elements[0].index;
                document.getElementById('slider-fase3').value = indice;
                actualizarFase3(indice);
            }
        }
    }
});

function actualizarFase3(nuevoIndice) {
    indexActualFase3 = parseInt(nuevoIndice);
    document.getElementById('fase3-year-display').innerText = periodosFase3[indexActualFase3];
    repintarMapaFase3();
    graficoNacion.data.datasets[0].backgroundColor = participacionNacion.map((_, i) => i === indexActualFase3 ? '#0047ab' : '#eaeaea');
    graficoNacion.update();
}

document.getElementById('slider-fase3').addEventListener('input', (e) => actualizarFase3(e.target.value));

actualizarFase3(16);