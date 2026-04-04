// ===============================================
// CONFIGURACIÓN MACRO (ARQUITECTURA)
// ===============================================
const CONFIG = {
    colores: {
        partidos: {
            "FUERZA POPULAR": "#F39C12",
            "RENOVACION POPULAR": "#2980B9",
            "PERU LIBRE": "#C0392B",
            "AHORA NACION - AN": "#8E44AD",
            "ALIANZA PARA EL PROGRESO": "#27AE60",
            "DEFECTO": "#95A5A6"
        }
    },
    filtros: {
        // Todo partido en esta lista será invisible en la web, pero seguirá existiendo en el JSON
        partidosOcultosVisualmente: [
            "PARTIDO CIUDADANOS POR EL PERU"
        ]
    },
    archivos: {
        masterJSON: "Data_lista/candidatos_super_master.json",
        partidosJSON: "Data_lista/diccionario_partidos.json" 
    },
    rutas: {
        baseFotos: "fotos/",
    }
};

let todosLosCandidatos = [];
let diccionarioPartidos = {}; 
let timelineChartInstance = null; 

// ===============================================
// INYECCIÓN AUTOMÁTICA DE CSS (AJUSTES UI)
// ===============================================
const style = document.createElement('style');
style.innerHTML = `
/* Selectores Premium */
.custom-select-wrapper { position: relative; display: inline-block; user-select: none; font-family: inherit; vertical-align: middle; max-width: 100%; }
.custom-select-trigger { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background-color: #fff; border: 1px solid #ccc; border-radius: 6px; cursor: pointer; font-size: 14px; color: #333; min-height: 38px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.custom-select-trigger .c-text { display: flex; align-items: center; font-weight: 500; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.custom-select-trigger .c-arrow { font-size: 10px; color: #888; margin-left: 10px; flex-shrink: 0; }
.c-logo { width: 20px; height: 20px; object-fit: contain; margin-right: 8px; flex-shrink: 0; }
.c-icon-placeholder { width: 20px; height: 20px; margin-right: 8px; background: transparent; display: flex; align-items: center; justify-content: center; font-size: 11px; flex-shrink: 0; }
.custom-select-options { position: absolute; top: 100%; left: 0; right: 0; margin-top: 5px; background-color: #fff; border: 1px solid #ddd; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 999; max-height: 250px; overflow-y: auto; display: none; min-width: 100%; }
.custom-select-options.open { display: block; }
.custom-option { display: flex; align-items: center; padding: 10px 12px; cursor: pointer; font-size: 14px; border-bottom: 1px solid #f9f9f9; transition: background 0.2s; }
.custom-option:hover { background-color: #f1f1f1; }

/* Borde Gris Sutil y Eliminación de Anillos en Rankings */
.ranking-column { border-top: none !important; }
.chameleon-top { 
    border: 1px solid #e2e8f0 !important;
    border-radius: 8px !important;
    box-shadow: 0 2px 4px rgba(0,0,0,0.03) !important; 
    background-color: #fff !important;
    padding: 15px;
    margin-bottom: 12px;
}
.chameleon-top .photo, 
.chameleon-top .photo img {
    border: none !important;
    outline: none !important;
    box-shadow: none !important;
}

/* Escudo de Partido en el Avatar (Burbujas) */
.party-badge-mini {
    position: absolute;
    bottom: -4px;
    right: -4px;
    width: 35%;
    height: 35%;
    border-radius: 50%;
    border: 2px solid #fff;
    background-color: #fff;
    object-fit: contain;
    box-shadow: 0 2px 4px rgba(0,0,0,0.15);
    z-index: 5;
}


/* AJUSTE EDITORA: Reducir de 3 a 2 columnas para el Ranking */
#rankings-wrapper {
    display: grid !important;
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 30px !important;
    max-width: 800px !important;
    margin: 0 auto 30px auto !important;
}

/* Estructura para ordenar las camisetas en la tarjeta (Flex Wrap) */
.history-section { margin-top: 15px; width: 100%; }
.history-title { font-size: 12px; font-weight: bold; margin-bottom: 10px; color: #333; }
.jersey-track { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; width: 100%; }
.jersey-item { width: 65px; display: flex; flex-direction: column; align-items: center; text-align: center; }
.jersey-placeholder { width: 45px; height: 45px; position: relative; margin-bottom: 4px; border: none; background: transparent; }
.jersey-year { font-size: 11px; font-weight: bold; color: #111; }
.jersey-party-name { font-size: 9px; color: #666; line-height: 1.1; margin-top: 2px; width: 100%; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.jersey-role { font-size: 8px; color: #888; font-style: italic; margin-top: 2px; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
`;
document.head.appendChild(style);

// ===============================================
// UTILIDADES COMUNES
// ===============================================
const getInitials = (name) => {
    if (!name) return "?";
    let parts = name.split(' ').filter(n => n.length > 0);
    if(parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0] ? parts[0][0].toUpperCase() : "?";
};

const normalizarId = (str) => {
    if (!str) return "defecto";
    return str.toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .replace(/[^a-z0-9]/g, '_')
              .replace(/_+/g, '_')
              .replace(/_$/g, '');
};

function hexToRgba(hex, alpha) {
    let c;
    if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)){
        c= hex.substring(1).split('');
        if(c.length== 3){
            c= [c[0], c[0], c[1], c[1], c[2], c[2]];
        }
        c= '0x'+c.join('');
        return 'rgba('+[(c>>16)&255, (c>>8)&255, c&255].join(',')+','+alpha+')';
    }
    return `rgba(149, 165, 166, ${alpha})`;
}

const getUrlImagen = (nombreArchivo) => {
    if (!nombreArchivo) return "";
    const tieneExtension = /\.(png|jpg|jpeg|webp)$/i.test(nombreArchivo);
    return `${CONFIG.rutas.baseFotos}${encodeURI(nombreArchivo)}${tieneExtension ? '' : '.png'}`;
};

const extraerAnioInicial = (anioStr) => {
    if (!anioStr) return 0;
    const match = String(anioStr).match(/\d{4}/);
    return match ? parseInt(match[0]) : 0;
};

const ensureArray = (data) => {
    if (!data || data === "NA") return [];
    let arr = Array.isArray(data) ? data : [data];
    return arr.filter(item => item && typeof item === 'object' && item.partido && String(item.partido).trim() !== "" && item.partido !== "NA");
};

// ===============================================
// INICIALIZACIÓN
// ===============================================
document.addEventListener("DOMContentLoaded", initApp);

async function initApp() {
    try {
        const [resCand, resPart] = await Promise.all([
            fetch(CONFIG.archivos.masterJSON),
            fetch(CONFIG.archivos.partidosJSON).catch(() => ({ ok: false })) 
        ]);

        const datosCrudos = await resCand.json();
        
        // FILTRO VISUAL
        todosLosCandidatos = datosCrudos.filter(c => !CONFIG.filtros.partidosOcultosVisualmente.includes(c.partidoActual));
        
        if (resPart.ok) diccionarioPartidos = await resPart.json();

        const partidosSet = new Set();
        todosLosCandidatos.forEach(c => { if(c.partidoActual) partidosSet.add(c.partidoActual); });
        const partidosUnicos = Array.from(partidosSet).sort();

        const cargosSet = new Set();
        todosLosCandidatos.forEach(c => {
            if(Array.isArray(c.cargos)) c.cargos.forEach(cg => cargosSet.add(cg));
            else if(c.cargo) cargosSet.add(c.cargo);
        });
        const cargosUnicos = Array.from(cargosSet).sort();

        // 1. Ranking 
        const selectRankings = document.getElementById('ranking-partido-select');
        if(selectRankings) {
            populateSelects('ranking-partido-select', partidosUnicos, 'partido');
            selectRankings.addEventListener('change', (e) => renderRankings(calcularRankings(todosLosCandidatos, e.target.value), e.target.value));
        }
        renderRankings(calcularRankings(todosLosCandidatos, "ALL"), "ALL");

        // 2. Comparador
        populateSelects('select-partido-1', partidosUnicos, 'partido');
        populateSelects('select-partido-2', partidosUnicos, 'partido');
        populateSelects('select-cargo-1', cargosUnicos, 'cargo'); 
        populateSelects('select-cargo-2', cargosUnicos, 'cargo');
        
        setupBuscadorComparador('input-busqueda-1', 'select-partido-1', 'preselector-panel-1', 'results-container-1');
        setupBuscadorComparador('input-busqueda-2', 'select-partido-2', 'preselector-panel-2', 'results-container-2');
        renderTarjetaCandidato(null, 'results-container-1');
        renderTarjetaCandidato(null, 'results-container-2');

        // 3. Heatmap
        const selectHeatmap = document.getElementById('heatmap-partido-select');
        if(selectHeatmap) {
            populateSelects('heatmap-partido-select', partidosUnicos, 'partido');
            selectHeatmap.addEventListener('change', (e) => renderHeatmap(todosLosCandidatos, e.target.value));
        }
        renderHeatmap(todosLosCandidatos, "ALL");

        // 4. Timeline
        const selectTimeline = document.getElementById('timeline-partido-select');
        if(selectTimeline) {
            populateSelects('timeline-partido-select', partidosUnicos, 'partido');
            selectTimeline.addEventListener('change', (e) => renderTimeline(todosLosCandidatos, e.target.value));
        }
        renderTimeline(todosLosCandidatos, "ALL");

    } catch (error) {
        console.error("Fallo al cargar datos:", error);
    }
}

// ===============================================
// CONSTRUCTOR DE SELECTORES
// ===============================================
function populateSelects(id, options, tipo = "partido") {
    const nativeSelect = document.getElementById(id);
    if(!nativeSelect) return;

    nativeSelect.innerHTML = `<option value="ALL">Todos los ${tipo === 'cargo' ? 'cargos' : 'partidos'}</option>`;
    options.forEach(opt => nativeSelect.innerHTML += `<option value="${opt}">${opt}</option>`);
    nativeSelect.style.display = 'none';

    if(nativeSelect.nextElementSibling && nativeSelect.nextElementSibling.classList.contains('custom-select-wrapper')) {
        nativeSelect.nextElementSibling.remove();
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'custom-select-wrapper';
    
    const isComparador = id.includes('select-partido-1') || id.includes('select-partido-2') || id.includes('select-cargo');
    wrapper.style.width = isComparador ? '100%' : '450px'; 
    wrapper.style.minWidth = isComparador ? 'auto' : '450px';

    const renderContent = (valor, etiqueta) => {
        if (tipo === 'cargo') return `<span>${etiqueta}</span>`;
        if (valor === 'ALL') return `<span style="font-weight: bold;">${etiqueta}</span>`;
        
        const idPart = normalizarId(valor);
        const infoPart = diccionarioPartidos[idPart];
        const logoUrl = (infoPart && infoPart.logo) ? getUrlImagen(infoPart.logo) : '';
        
        const imgHtml = logoUrl ? `<img src="${logoUrl}" class="c-logo" onerror="this.outerHTML='<div class=\\'c-icon-placeholder\\'></div>'" />` : `<div class="c-icon-placeholder"></div>`;
        return `${imgHtml} <span>${etiqueta}</span>`;
    };

    const trigger = document.createElement('div');
    trigger.className = 'custom-select-trigger';
    trigger.innerHTML = `<span class="c-text">${renderContent('ALL', `Todos los ${tipo === 'cargo' ? 'cargos' : 'partidos'}`)}</span> <span class="c-arrow">▼</span>`;

    const optionsPanel = document.createElement('div');
    optionsPanel.className = 'custom-select-options';

    const createOption = (valor, etiqueta) => {
        const optDiv = document.createElement('div');
        optDiv.className = 'custom-option';
        optDiv.innerHTML = renderContent(valor, etiqueta);
        optDiv.addEventListener('click', () => {
            trigger.querySelector('.c-text').innerHTML = optDiv.innerHTML;
            nativeSelect.value = valor;
            nativeSelect.dispatchEvent(new Event('change')); 
            optionsPanel.classList.remove('open');
        });
        optionsPanel.appendChild(optDiv);
    };

    createOption('ALL', `Todos los ${tipo === 'cargo' ? 'cargos' : 'partidos'}`);
    options.forEach(opt => createOption(opt, opt));

    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.custom-select-options').forEach(p => { if(p !== optionsPanel) p.classList.remove('open'); });
        optionsPanel.classList.toggle('open');
    });

    wrapper.appendChild(trigger);
    wrapper.appendChild(optionsPanel);
    nativeSelect.parentNode.insertBefore(wrapper, nativeSelect.nextSibling);
}

document.addEventListener('click', (e) => {
    if(!e.target.closest('.custom-select-wrapper')) {
        document.querySelectorAll('.custom-select-options').forEach(p => p.classList.remove('open'));
    }
});

// ===============================================
// FASE 1: RANKINGS DINÁMICOS Y FILTRADOS
// ===============================================
function calcularRankings(candidatos, partidoFiltro = "ALL") {
    // 'pool' es la lista filtrada por el dropdown (afectará a la columna 1)
    let pool = candidatos;
    if (partidoFiltro !== "ALL") pool = candidatos.filter(c => c.partidoActual === partidoFiltro);

    // RANKING 1: Cambios de Camiseta (Afectado por el dropdown)
    let rankingCamisetas = pool.map(c => {
        let historialSeguro = ensureArray(c.historialElectoral);
        let partidosUsados = historialSeguro.map(h => h.partido_matriz || h.partido).filter(Boolean);
        if(c.partidoActual) partidosUsados.push(c.partidoActual);
        let uniqueParties = new Set(partidosUsados);
        return { ...c, metrica: uniqueParties.size };
    }).sort((a, b) => b.metrica - a.metrica).slice(0, 5);

    // RANKING 2: PARTIDOS CON MÁS CAMALEONES (SIEMPRE GLOBAL)
    const conteoPartidos = {};
    
    // Usamos 'candidatos' originales en lugar de 'pool' para que NO le afecte el dropdown
    candidatos.forEach(c => {
        let historialSeguro = ensureArray(c.historialElectoral);
        let partidosUsados = historialSeguro.map(h => h.partido_matriz || h.partido).filter(Boolean);
        if (c.partidoActual) partidosUsados.push(c.partidoActual);
        let uniqueParties = new Set(partidosUsados);
        if (uniqueParties.size > 1) {
            conteoPartidos[c.partidoActual] = (conteoPartidos[c.partidoActual] || 0) + 1;
        }
    });

    // Convertimos el conteo de partidos en un formato que la tarjeta entienda
    let rankingPartidos = Object.entries(conteoPartidos)
        .map(([nombrePartido, cantidad]) => {
            const idPart = normalizarId(nombrePartido);
            const logoPartido = diccionarioPartidos[idPart] ? diccionarioPartidos[idPart].logo : null;
            return {
                nombre: nombrePartido,
                metrica: cantidad,
                partidoActual: null, // Lo dejamos en null para que no dibuje la medallita superpuesta redundante
                idFoto: logoPartido  // Mandamos el logo del partido para que lo dibuje en el círculo grande
            };
        })
        .sort((a, b) => b.metrica - a.metrica)
        .slice(0, 5);

    return [
        { titulo: "Top 5 con más cambios de camiseta", data: rankingCamisetas, label: "franquicias" },
        { titulo: "Partidos con más camaleones", data: rankingPartidos, label: "candidatos" }
    ];
}

function renderRankings(rankingsData, partidoFiltro = "ALL") {
    const wrapper = document.getElementById('rankings-wrapper');
    if(!wrapper) return;

    let html = '';

    rankingsData.forEach(ranking => {
        if(ranking.data.length === 0) {
            html += `<div class="ranking-column" style="border-top: none !important;"><div class="ranking-header">${ranking.titulo}</div><p style="color:#888; font-size:13px; text-align:center; padding:20px;">Sin datos o nadie cumple el criterio</p></div>`;
            return;
        }

        const top1 = ranking.data[0];
        const resto = ranking.data.slice(1); 
        
        const fotoTop1 = top1.idFoto ? `<img src="${getUrlImagen(top1.idFoto)}" style="width:100%; height:100%; object-fit:cover; border-radius:50%; filter: grayscale(100%);" onerror="this.outerHTML='${getInitials(top1.nombre)}'"/>` : getInitials(top1.nombre);

        let badgeTop1 = '';
        if(top1.partidoActual) {
            const idPart = normalizarId(top1.partidoActual);
            if(diccionarioPartidos[idPart]?.logo) {
                badgeTop1 = `<img src="${getUrlImagen(diccionarioPartidos[idPart].logo)}" class="party-badge-mini" onerror="this.style.display='none'"/>`;
            }
        }

        let colHtml = `
            <div class="ranking-column" style="border-top: none !important;">
                <div class="ranking-header">${ranking.titulo}</div>
                <div class="chameleon-top">
                    <div class="photo" style="position: relative; background-color: #eee; display: flex; align-items: center; justify-content: center;">
                        ${fotoTop1}
                        ${badgeTop1}
                    </div>
                    <div class="chameleon-name">${top1.nombre}</div>
                    <div class="chameleon-metric"><span>${top1.metrica}</span> ${ranking.label}</div>
                </div>
                <div class="chameleon-list">
        `;

        resto.forEach((cand, index) => {
            const fotoResto = cand.idFoto ? `<img src="${getUrlImagen(cand.idFoto)}" style="width:100%; height:100%; object-fit:cover; border-radius:50%; filter: grayscale(100%);" onerror="this.outerHTML='${getInitials(cand.nombre)}'"/>` : getInitials(cand.nombre);
            
            let badgeResto = '';
            if(cand.partidoActual) {
                const idPart = normalizarId(cand.partidoActual);
                if(diccionarioPartidos[idPart]?.logo) {
                    badgeResto = `<img src="${getUrlImagen(diccionarioPartidos[idPart].logo)}" class="party-badge-mini" onerror="this.style.display='none'"/>`;
                }
            }

            colHtml += `
                <div class="chameleon-item">
                    <div class="pos">${index + 2}</div>
                    <div class="photo" style="position: relative; background-color: #eee; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold; color: #555;">
                        ${fotoResto}
                        ${badgeResto}
                    </div>
                    <div class="info">
                        <div class="name">${cand.nombre}</div>
                        <div class="metric">${cand.metrica} ${ranking.label}</div>
                    </div>
                </div>
            `;
        });
        colHtml += `</div></div>`;
        html += colHtml;
    });
    wrapper.innerHTML = html;
}

// ===============================================
// FASE 2: COMPARADOR CARA A CARA
// ===============================================
function generarRopaHTML(historial, tipoRopa) {
    if (!historial || historial.length === 0) {
        return `<p style="text-align:left; font-size:14px; color:#888; padding: 10px 0; margin:0; font-style: italic;">Sin registros previos.</p>`;
    }
    
    return historial.map(h => {
        const idPart = normalizarId(h.partido);
        const infoPart = diccionarioPartidos[idPart];
        
        const imgRopaBase = `<img src="${CONFIG.rutas.baseFotos}${tipoRopa}" style="width: 100%; height: 100%; object-fit: contain; position: absolute; top: 0; left: 0; z-index: 1;" onerror="this.style.display='none'"/>`;

        let logoImg = '';
        if (infoPart && infoPart.logo) {
            const estiloLogo = tipoRopa === 'camiseta.png' 
                ? 'width: 16px; height: 16px; position: absolute; top: 25%; right: 25%; z-index: 2; object-fit: contain;' 
                : 'width: 14px; height: 14px; position: absolute; bottom: 20%; left: 30%; z-index: 2; object-fit: contain;';
            logoImg = `<img src="${getUrlImagen(infoPart.logo)}" style="${estiloLogo}" onerror="this.style.display='none'"/>`;
        }

        const anioLimpio = extraerAnioInicial(h.anio) || h.anio || 'N/A';

        return `
        <div class="jersey-item">
            <div class="jersey-placeholder" style="position: relative; background: transparent; border: none; box-shadow: none;">
                ${imgRopaBase}
                ${logoImg}
            </div>
            <div class="jersey-year">${anioLimpio}</div>
            <div class="jersey-party-name">${h.partido || 'Desconocido'}</div>
            <div class="jersey-role">${h.rol || ''}</div>
        </div>
        `;
    }).join('');
}

function renderTarjetaCandidato(candidato, containerId) {
    const container = document.getElementById(containerId);
    if(!container) return;

    if (!candidato) {
        container.innerHTML = `<div style="background:#f9f9f9; border: 1px dashed #ccc; padding:40px 20px; text-align:center; border-radius:6px; color:#888;">Utiliza el buscador superior para seleccionar a un candidato y ver su historial aquí.</div>`;
        return;
    }

    let pActual = candidato.partidoActual || "INDEPENDIENTE";
    let colorPartido = CONFIG.colores.partidos[pActual] || CONFIG.colores.partidos["DEFECTO"];
    let iniciales = getInitials(candidato.nombre);
    
    let fotoPerfil = candidato.idFoto ? `<img src="${getUrlImagen(candidato.idFoto)}" style="width:100%; height:100%; object-fit:cover; border-radius:50%; filter: grayscale(100%);" onerror="this.outerHTML='${iniciales}'"/>` : iniciales;
    
    let cargosLabel = Array.isArray(candidato.cargos) ? candidato.cargos.join(' / ') : (candidato.cargos || '');

    const postulacion2026 = {
        anio: "2026",
        partido: pActual,
        rol: cargosLabel || "Candidato"
    };

    let historialElectoralSeguro = ensureArray(candidato.historialElectoral);
    let historialElectoralOrdenado = historialElectoralSeguro.slice().sort((a, b) => extraerAnioInicial(a.anio) - extraerAnioInicial(b.anio));
    historialElectoralOrdenado.push(postulacion2026); 

    let camElectorales = generarRopaHTML(historialElectoralOrdenado, 'camiseta.png');

    // Calcular número total de camisetas políticas únicas
    let pSet = new Set(historialElectoralSeguro.map(h => h.partido_matriz || h.partido).filter(Boolean));
    if (pActual) pSet.add(pActual);
    let totalCamisetas = pSet.size;

    const html = `
        <div class="candidate-card" style="border-top-color: ${colorPartido}">
            <div class="card-header-flex">
                <div class="avatar-initials" style="color: ${colorPartido}; background-color: ${colorPartido}20; padding: 0; overflow: hidden; display: flex; align-items: center; justify-content: center;">
                    ${fotoPerfil}
                </div>
                <div class="card-info">
                    <div class="card-name">${candidato.nombre || 'Desconocido'}</div>
                    <div class="card-current-party">Postula por: ${pActual} <br> <span style="font-size:11px; color:#888;">${cargosLabel ? `(${cargosLabel})` : ''}</span></div>
                </div>
            </div>
            
            <div class="histories-container">
                <div class="history-section">
                    <div class="history-title">Postulaciones (Orden cronológico)</div>
                    <div class="jersey-track">${camElectorales}</div>
                </div>
            </div>

            <div style="margin-top: 15px; padding-top: 12px; border-top: 1px dashed #ddd; font-size: 13px; text-align: center; color: #444; font-weight: bold;">
                Este candidato tuvo ${totalCamisetas} camiseta(s) política(s).
            </div>
        </div>
    `;
    container.innerHTML = html;
}




function setupBuscadorComparador(inputId, selectId, panelId, resultId) {
    const input = document.getElementById(inputId);
    const select = document.getElementById(selectId);
    const panel = document.getElementById(panelId);
    let timeout;

    if(!input || !select || !panel) return;

    const ejecutarBusqueda = () => {
        const val = input.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        const partidoFiltro = select.value;
        
        if (!val || val.length < 3) {
            panel.style.display = "none";
            return;
        }

        const terminosBusqueda = val.split(/\s+/);

        clearTimeout(timeout);
        timeout = setTimeout(() => {
            const matches = todosLosCandidatos.filter(cand => {
                if(!cand.nombre) return false;
                const nom = cand.nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                
                const matchText = terminosBusqueda.every(termino => nom.includes(termino));
                const matchPartido = (partidoFiltro === "" || partidoFiltro === "ALL") ? true : cand.partidoActual === partidoFiltro;
                
                return matchText && matchPartido;
            }).slice(0, 15);

            if (matches.length > 0) {
                panel.style.display = "block";
                let html = '';
                matches.forEach(cand => {
                    let pActual = cand.partidoActual || "Indep.";
                    let fotoMini = cand.idFoto ? `<img src="${getUrlImagen(cand.idFoto)}" style="width:100%; height:100%; object-fit:cover; border-radius:50%; filter: grayscale(100%);" onerror="this.outerHTML='${getInitials(cand.nombre)}'"/>` : getInitials(cand.nombre);

                    html += `
                        <div class="preselector-item" data-id="${cand.dni}">
                            <div class="preselector-avatar" style="padding:0; overflow:hidden;">${fotoMini}</div>
                            <div class="preselector-info">
                                <div class="preselector-name">${cand.nombre}</div>
                            </div>
                            <div class="preselector-badge">${pActual}</div>
                        </div>
                    `;
                });
                panel.innerHTML = html;

                panel.querySelectorAll('.preselector-item').forEach(item => {
                    item.addEventListener('click', function() {
                        const dniSeleccionado = this.getAttribute('data-id');
                        const candidato = todosLosCandidatos.find(c => c.dni === dniSeleccionado);
                        input.value = ""; 
                        panel.style.display = "none";
                        renderTarjetaCandidato(candidato, resultId);
                    });
                });
            } else {
                panel.style.display = "block";
                panel.innerHTML = `<div style="padding: 15px; color: #888; font-size:13px;">No hay coincidencia.</div>`;
            }
        }, 300);
    };

    input.addEventListener('input', ejecutarBusqueda);
    select.addEventListener('change', ejecutarBusqueda); 

    document.addEventListener("click", function (e) {
        if (e.target !== input && e.target !== select && e.target !== panel && !panel.contains(e.target)) {
            panel.style.display = "none";
        }
    });
}

// ===============================================
// FASE 3: HEATMAP NATIVO CSS GRID
// ===============================================
function renderHeatmap(candidatos, partidoFiltro = "ALL") {
    const grid = document.getElementById('heatmap-grid');
    if (!grid) return;

    let pool = candidatos;
    if (partidoFiltro !== "ALL") pool = candidatos.filter(c => c.partidoActual === partidoFiltro);

    const matriz = Array(5).fill(0).map(() => Array(10).fill(null).map(() => ({ count: 0, ejemplos: [] })));
    
    pool.forEach(c => {
        let historialSeguro = ensureArray(c.historialElectoral);
        
        const totalParticipaciones = historialSeguro.length + 1; 
        
        let partidosUsados = historialSeguro.map(h => h.partido_matriz || h.partido).filter(Boolean);
        if (c.partidoActual) partidosUsados.push(c.partidoActual);
        
        let uniqueParties = new Set(partidosUsados).size;
        
        let colIndex = Math.min(totalParticipaciones - 1, 9);
        let rowIndex;
        if (uniqueParties >= 5) rowIndex = 0;
        else if (uniqueParties === 4) rowIndex = 1;
        else if (uniqueParties === 3) rowIndex = 2;
        else if (uniqueParties === 2) rowIndex = 3;
        else rowIndex = 4;

        matriz[rowIndex][colIndex].count++;
        if (matriz[rowIndex][colIndex].ejemplos.length < 4) matriz[rowIndex][colIndex].ejemplos.push(c.nombre);
    });

    let localMaxDensity = 0;
    for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 10; c++) {
            if (r === 4 && c === 0) continue; 
            if (matriz[r][c].count > localMaxDensity) localMaxDensity = matriz[r][c].count;
        }
    }
    if (localMaxDensity === 0) localMaxDensity = 1;

    let html = '';
    for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 10; c++) { 
            const bucket = matriz[r][c];
            let bgColor = "#f4f6f8"; 
            let textColor = "#111111"; 
            
            if (bucket.count > 0) {
                let intensidad;
                if (r === 4 && c === 0) intensidad = 1.0; 
                else {
                    const ratio = Math.sqrt(bucket.count / localMaxDensity);
                    intensidad = 0.3 + (ratio * 0.7); 
                    if (intensidad > 1) intensidad = 1;
                }
                bgColor = `rgba(230, 57, 70, ${intensidad})`; 
            }

            let tooltipHtml = '';
            if (bucket.count > 0) {
                const labelIntentos = (c === 9) ? "10 a más postulaciones totales" : `${c + 1} postulación(es) en total`;
                const labelPartidos = (r === 0) ? "con 5 o más partidos" : `con ${5 - r} partido(s)`;
                
                tooltipHtml = `
                <div class="tooltip">
                    <strong style="color:#fff; font-size:12px; margin-bottom:2px;">${labelIntentos} <br> ${labelPartidos}</strong>
                    <hr style="border:0; border-top:1px solid #444; margin: 4px 0;">
                    <strong>${bucket.count} candidatos</strong>
                    <div style="margin-top:4px; font-size:11px; color:#ccc;">Ejemplos:</div>
                    ${bucket.ejemplos.map(e => `• ${e}`).join('<br>')}
                    ${bucket.count > 4 ? `<br><i style="color:#888;">...y ${bucket.count - 4} más</i>` : ''}
                </div>`;
            }

            html += `
                <div class="heatmap-cell" style="background-color: ${bgColor}; color: ${textColor}; font-weight: bold; border-radius: 4px; border: 1px solid rgba(0,0,0,0.05);">
                    ${bucket.count > 0 ? bucket.count : ''}
                    ${tooltipHtml}
                </div>
            `;
        }
    }
    grid.innerHTML = html;
}

// ===============================================
// FASE 4: TIMELINE 1D (Antigüedad de Afiliación)
// ===============================================
const FECHA_LIMITE = new Date(2025, 6, 12); 

const deadlinePlugin = {
    id: 'deadlinePlugin',
    afterDraw(chart) {
        const ctx = chart.ctx;
        const xAxis = chart.scales.x;
        const xPos = xAxis.getPixelForValue(FECHA_LIMITE.getTime()); 

        if (xPos >= chart.chartArea.left && xPos <= chart.chartArea.right) {
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(xPos, chart.chartArea.top);
            ctx.lineTo(xPos, chart.chartArea.bottom);
            ctx.lineWidth = 2;
            ctx.strokeStyle = 'rgba(229, 57, 53, 0.9)'; 
            ctx.setLineDash([5, 5]);
            ctx.stroke();

            ctx.fillStyle = 'rgba(229, 57, 53, 1)';
            ctx.font = 'bold 11px Arial';
            ctx.fillText('12 JUL 2025', xPos - 75, chart.chartArea.top + 15);
            ctx.fillText('CIERRE PADRÓN', xPos - 100, chart.chartArea.top + 30);
            ctx.restore();
        }
    }
};
if (typeof Chart !== 'undefined') Chart.register(deadlinePlugin);


// ESTA ES LA FUNCIÓN CLAVE CORREGIDA 
function extractAffiliationTimestamp(candidato) {
    let historialSeguro = ensureArray(candidato.historialPartidario);
    if (historialSeguro.length === 0) return null;

    // Busca específicamente el registro con "anio": "Vigente"
    const activeAffiliation = historialSeguro.find(h => h.anio === "Vigente");
    
    if (activeAffiliation && activeAffiliation.fechaInicio) {
        const parts = activeAffiliation.fechaInicio.split('/');
        if (parts.length === 3) return new Date(parts[2], parts[1] - 1, parts[0]).getTime();
    }
    return null;
}

function getDiasAntiguedad(timestampAfiliacion) {
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.round((FECHA_LIMITE.getTime() - timestampAfiliacion) / msPerDay);
}

function renderTimeline(candidatos, partidoFiltro = "ALL") {
    const canvas = document.getElementById('timeline-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (timelineChartInstance) timelineChartInstance.destroy();

    let datasets = [];
    
    // Rango extendido para que no queden fuera afiliados de años como 2005 o 2006. 
    // Fijo para que sirva de escala general de comparación.
    const minYearScale = new Date(2000, 0, 1).getTime();

    if (partidoFiltro === "ALL") {
        const partyStats = {};
        candidatos.forEach(c => {
            const timestamp = extractAffiliationTimestamp(c);
            if (timestamp !== null && timestamp <= FECHA_LIMITE.getTime()) {
                const p = c.partidoActual;
                if (!partyStats[p]) partyStats[p] = { sumTimestamp: 0, count: 0 };
                partyStats[p].sumTimestamp += timestamp;
                partyStats[p].count++;
            }
        });

        const dataPoints = [];
        const pointStyles = [];
        const bgColors = [];
        
        const sortedParties = Object.keys(partyStats).sort((a,b) => {
            return (partyStats[a].sumTimestamp / partyStats[a].count) - (partyStats[b].sumTimestamp / partyStats[b].count);
        });

        const yLevels = [-8, 8, -6, 6, -4, 4, -7, 7, -5, 5, -3, 3, -2, 2, -1, 1, 0];

        sortedParties.forEach((p, index) => {
            const avgTimestamp = partyStats[p].sumTimestamp / partyStats[p].count;
            const yPos = yLevels[index % yLevels.length];

            dataPoints.push({ 
                x: avgTimestamp, 
                y: yPos, 
                partido: p, 
                count: partyStats[p].count,
                diasPromedio: getDiasAntiguedad(avgTimestamp)
            });

            const idPart = normalizarId(p);
            const logoUrl = (diccionarioPartidos[idPart] && diccionarioPartidos[idPart].logo) ? getUrlImagen(diccionarioPartidos[idPart].logo) : null;
            
            if (logoUrl) {
                const img = new Image();
                img.src = logoUrl;
                img.width = 24; 
                img.height = 24;
                pointStyles.push(img);
            } else {
                pointStyles.push('circle');
            }

            bgColors.push(hexToRgba(CONFIG.colores.partidos[p] || CONFIG.colores.partidos["DEFECTO"], 0.85));
        });

        datasets.push({
            label: 'Promedio por Partido',
            data: dataPoints,
            backgroundColor: bgColors,
            borderColor: '#111',
            borderWidth: 1.5,
            pointRadius: 8,
            pointHoverRadius: 12,
            pointStyle: pointStyles 
        });
        
    } else {
        const dataPoints = [];

        candidatos.forEach(c => {
            if (c.partidoActual === partidoFiltro) {
                const timestamp = extractAffiliationTimestamp(c);
                if (timestamp !== null && timestamp <= FECHA_LIMITE.getTime()) {
                    const yPos = (Math.random() * 18) - 9; 

                    dataPoints.push({
                        x: timestamp,
                        y: yPos, 
                        nombre: c.nombre,
                        partido: c.partidoActual,
                        diasAfiliado: getDiasAntiguedad(timestamp)
                    });
                }
            }
        });

        let pColor = CONFIG.colores.partidos[partidoFiltro] || CONFIG.colores.partidos["DEFECTO"];
        datasets.push({
            label: 'Afiliados Vigentes',
            data: dataPoints,
            backgroundColor: hexToRgba(pColor, 0.7),
            borderColor: hexToRgba(pColor, 1),
            borderWidth: 1,
            pointRadius: 6,
            pointHoverRadius: 9
        });
    }

    timelineChartInstance = new Chart(ctx, {
        type: 'scatter',
        data: { datasets: datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            layout: { padding: { top: 30, right: 20, left: 20 } },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(17,17,17,0.95)',
                    titleFont: { size: 14, family: 'Arial', weight: 'bold' },
                    bodyFont: { size: 13, family: 'Arial', lineHeight: 1.4 },
                    padding: 12,
                    callbacks: {
                        label: (context) => {
                            const p = context.raw;
                            const fechaLegible = new Date(p.x).toLocaleDateString('es-PE', { year: 'numeric', month: 'short', day: 'numeric' });
                            
                            if (partidoFiltro === "ALL") {
                                return [ `Partido: ${p.partido}`, `Militantes contabilizados: ${p.count}`, `Afiliación promedio: ${fechaLegible}`, `Antigüedad promedio: ${p.diasPromedio} días antes del cierre` ];
                            } else {
                                return [ `Candidato: ${p.nombre}`, `Se afilió el: ${fechaLegible}`, `Antigüedad: ${p.diasAfiliado} días antes del cierre` ];
                            }
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    title: { display: true, text: 'Línea de tiempo (Años)', font: { weight: 'bold', size: 13, family: 'Arial' } },
                    min: minYearScale, 
                    max: new Date(2025, 11, 31).getTime(),
                    grid: { color: 'rgba(0,0,0,0.05)' },
                    ticks: { callback: function(value) { return new Date(value).getFullYear(); }, maxTicksLimit: 12, font: { family: 'Arial' } }
                },
                y: { display: false, min: -10, max: 10 } 
            }
        }
    });
}