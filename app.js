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
// DICCIONARIOS DE EQUIVALENCIA (CLONES Y ALIANZAS)
// ===============================================

const DICCIONARIO_CLONES = {
    "AGRUPACION INDEPENDIENTE AVANCEMOS": "CAMBIO RADICAL",
    "FRENTE POPULAR AGRICOLA FIA DEL PERU - FREPAP": "FRENTE POPULAR AGRICOLA FIA DEL PERU",
    "PARTIDO POLITICO PERU ACCION": "PERU NACION",
    "CAMBIO 90": "PERU PATRIA SEGURA",
    "PERUANOS POR EL KAMBIO": "PARTIDO POLÍTICO CONTIGO",
    "RESTAURACION NACIONAL": "VICTORIA NACIONAL",
    "SOLIDARIDAD NACIONAL": "RENOVACION POPULAR",
    "FUERZA 2011": "FUERZA POPULAR",
    "PODEMOS POR EL PROGRESO DEL PERU": "PODEMOS PERU",
    "ALIANZA PARA EL PROGRESO": "ALIANZA PARA EL PROGRESO DEL PERU",
    "PERU LIBERTARIO": "MOVIMIENTO POLITICO REGIONAL PERU LIBRE",
    "RENOVACION POPULAR": "SOLIDARIDAD NACIONAL",
    "PARTIDO POLITICO NACIONAL PERU LIBRE": "PERU LIBERTARIO",
    "PARTIDO DEMOCRATICO SOMOS PERU": "MOVIMIENTO INDEPENDIENTE SOMOS PERU - CAUSA DEMOCRATICA",
    "PARTIDO POLÍTICO CONTIGO": "PERUANOS POR EL KAMBIO",
    "UNION POR EL PERU": "AGRUPACION INDEPENDIENTE UNION POR EL PERU - SOCIAL DEMOCRACIA",
    "PARTIDO NACIONALISTA PERUANO": "GANA PERU",
    "ALIANZA ELECTORAL CAMBIO 90 - NUEVA MAYORIA": "ALIANZA POR EL FUTURO",
    "PARTIDO POPULAR CRISTIANO - PPC": "PARTIDO POPULAR CRISTIANO - PPC - UNIDAD NACIONAL",
    "IZQUIERDA UNIDA": "FRENTE ELECTORAL IZQUIERDA UNIDA",
    "CHIM PUM CALLAO": "CHIMPUM - CALLAO",
    "CHIMPUM CALLAO": "CHIM PUM CALLAO",
    "FRENTE NACIONAL DE TRABAJADORES Y CAMPESINOS": "PERU AL 2000 - FRENATRACA",
    // --- PARCHES DE NOMENCLATURA JNE ---
    "ALIANZA ELECTORAL UNIDAD NACIONAL": "UNIDAD NACIONAL",
    "PARTIDO POPULAR CRISTIANO": "PARTIDO POPULAR CRISTIANO - PPC",
    "ALIANZA ELECTORAL SOLIDARIDAD NACIONAL": "ALIANZA SOLIDARIDAD NACIONAL",
    "ALIANZA ELECTORAL IZQUIERDA UNIDA":"ALIANZA IZQUIERDA UNIDA"
};

const DICCIONARIO_ALIANZAS = {
    "ALIANZA SOLIDARIDAD NACIONAL": ["CAMBIO 90", "SIEMPRE UNIDOS", "UNION POR EL PERU", "TODOS POR EL PERU", "SOLIDARIDAD NACIONAL"],
    "PERÚ POSIBLE": ["PERU POSIBLE"],
    "ALIANZA POR EL GRAN CAMBIO": ["ALIANZA PARA EL PROGRESO", "RESTAURACION NACIONAL", "PARTIDO POPULAR CRISTIANO - PPC", "PARTIDO HUMANISTA PERUANO"],
    "ALIANZA POPULAR": ["PARTIDO APRISTA PERUANO", "PARTIDO POPULAR CRISTIANO - PPC", "VAMOS PERU"],
    "ALIANZA ELECTORAL SOLIDARIDAD NACIONAL - UPP": ["SOLIDARIDAD NACIONAL", "UNION POR EL PERU"],
    "ALIANZA PARA EL PROGRESO DE AREQUIPA": ["ALIANZA PARA EL PROGRESO"],
    "ALIANZA PARA EL PROGRESO DE AYACUCHO": ["ALIANZA PARA EL PROGRESO"],
    "ALIANZA PERU POSIBLE": ["ACCION POPULAR", "PARTIDO DEMOCRATICO SOMOS PERU", "PERU POSIBLE"],
    "SUMATE - PERU POSIBLE": ["PERU POSIBLE"],
    "UNIDAD NACIONAL": ["PARTIDO POPULAR CRISTIANO - PPC", "SOLIDARIDAD NACIONAL", "RENOVACION NACIONAL"],
    "FREDEMO": ["MOVIMIENTO LIBERTAD", "ACCION POPULAR", "PARTIDO POPULAR CRISTIANO", "PARTIDO SOLIDARIDAD Y DEMOCRACIA"],
    "FRENTE DE CENTRO": ["ACCION POPULAR", "PARTIDO DEMOCRATICO SOMOS PERU", "COORDINADORA NACIONAL DE INDEPENDIENTES"],
    "ALIANZA ELECTORAL PERU 2000": ["CAMBIO 90", "ALIANZA ELECTORAL VAMOS VECINO", "ALIANZA ELECTORAL CAMBIO 90 - NUEVA MAYORIA"],
    "ALIANZA ELECTORAL IZQUIERDA UNIDA": ["IZQUIERDA UNIDA"],
    "ALIANZA ELECTORAL SOLUCION POPULAR": ["ALIANZA ELECTORAL VAMOS VECINO"],
    "ALIANZA ELECTORAL VAMOS VECINO": ["ALIANZA ELECTORAL PERU 2000"],
    "ALIANZA ELECTORAL UNIDAD POPULAR": ["PARTIDO POPULAR CRISTIANO - PPC", "ALIANZA SOLIDARIDAD NACIONAL", "RENOVACION NACIONAL"],
    "CONVERGENCIA DEMOCRATICA": ["PARTIDO POPULAR CRISTIANO - PPC", "MOVIMIENTO DE BASES HAYISTAS"],
    "ALIANZA ELECTORAL IZQUIERDA UNIDA":["IZQUIERDA UNIDA", "FRENTE ELECTORAL IZQUIERDA UNIDA"],
};

// ===============================================
// MOVIMIENTOS EXCLUIDOS DE LA MATEMÁTICA PERIODÍSTICA
// Partidos locales/regionales con INCLUIR = "NO"
// ===============================================
const PARTIDOS_EXCLUIDOS = ["TRABAJEMOS POR QUINCHES", "MOVIMIENTO INDEPENDIENTE COMPROMISO CAMPESINO", "MOVIMIENTO INDEPENDIENTE FRENTE POPULAR N° 3", "L.I. N° 5 FRENTE INDEPENDIENTE CRISTIANO LIBRE ACCION NAC.", "L.I. NRO 11 CAMBIO MUNICIPAL 95", "LUCHEMOS POR CAJAMARCA", "POR UN SAN JUAN SEGURO", "TODOS POR JUNIN", "PIURA EMPRENDEDOR", "FUERZA Y DESARROLLO", "TODOS POR MADRE DE DIOS", "L.I. NRO 7 GESTION POPULAR", "L.I. NRO 3 MOVIMIENTO INDEPENDIENTE DESARROLLO TECNOLOGIA Y MODERNIDAD", "TODOS CON TACNA", "UNIDOS POR EL CAMBIO DE PACHANGARA", "JUNTOS SI SE PUEDE", "¡ARRIBA PAIJAN!", "ORGANIZACION INDEPENDIENTE TODOS POR ILO", "MOVIMIENTO AL SOCIALISMO Y LIBERTAD", "FRENTE AMPLIO PARA EL DESARROLLO DE PUNO - FADEP", "FRENTE AMPLIO REGIONAL", "MOVIMIENTO INDEPENDIENTE HECHOS Y NO PALABRAS", "FRENTE DE AGRICULTORES LA UNION", "MOVIMIENTO INDEPENDIENTE \"LA PERLA\"", "ALTERNATIVA", "MOVIMIENTO REGIONAL \"PARA EL DESARROLLO E INTEGRACION DE AYACUCHO - DIA\"", "ORGANIZACION POLITICA MOPAV", "SOMOS LIBRES", "L.I. NRO 11 FRENTE INDEPENDIENTE SOLIDARIDAD UCHICINA", "MOVIMIENTO INDEPENDIENTE DE ACCION RENOVADORA DE SULLANA - MARS", "L.I. NRO 11 CAMBIO Y SOLUCION", "MOVIMIENTO DEMOCRATICO DE IZQUIERDA", "MOVIMIENTO INDEPENDIENTE FUERZA CAMPESINA", "COMPROMISO UCAYALINO", "L.I. N° 3 FRENTE DEMOCRATICO POPULAR", "MOVIMIENTO DE AFIRMACION SOCIAL - ACCION", "LA MOLINA 2000", "FRENTE UNIDO", "MOVIMIENTO INDEPENDIENTE \"RECUPEREMOS LINCE YA\"", "INTEGRACION DISTRITAL", "SALVEMOS LURIN", "LINDO HUARMEY", "MOVIMIENTO INDEPENDIENTE INNOVACION - SULLANA", "L.I. UNIDAD Y DESARROLLO PASQUEÑOS", "MOVIMIENTO INDEPENDIENTE REGIONAL HORA CERO", "MOVIMIENTO INDEPENDIENTE TRABAJANDO PARA TODOS", "UCAYALI DIGNIDAD", "MOVIMIENTO SOCIAL TUMBES UNIDO", "L.I. NRO 7 UNION POR EL PROGRESO", "INTEGRACION CHINCHANA", "MOVIMIENTO CIVICO AREQUIPA", "TRABAJO MAS TRABAJO", "L.I. NRO 13 MOV IND POR EL DESARROLLO DE MOQ", "L.I. NRO 11 MOVIMIENTO POLITICO INDEPENDIENTE MI PUEBLO", "ALTERNATIVA CAMPESINA", "PUCACACA AL 2000", "ENERGIA COMUNAL AMAZONICA", "VOLUNTAD INDEPENDIENTE DE DESARROLLO AMAZONICO", "MOVIMIENTO INDEPENDIENTE \"YAUYOS ERES TU\"", "L.I. NRO 11 SOMOS CAMBIO 95", "L.I. NRO 9 UNION POR EL PUEBLO", "U.T. VIVA LA MOLINA", "OPORTUNIDAD PARA TODOS", "L.I. NRO 7", "MIRAFLORES UNIDO", "MOVIMIENTO OBRAS", "AREQUIPA PRIMERO", "NUEVA IMAGEN", "MOVIMIENTO INDEPENDIENTE \"FUERZA ICA\"", "L.I. NRO 9 FRENATRACA", "L.I. NRO 11 FRENTE DE CONSTRUCCION Y DESARROLLO", "CUSCO LINDO", "ALIANZA POR AREQUIPA", "MOVIMIENTO REGIONAL INDEPENDIENTE DE CAMPESINOS OBREROS, EMPLEADOS Y ESTUDIANTES", "MOVIMIENTO INDEPENDIENTE \"NUEVO YUNGUYO\"", "L.I. NRO 41 MOVIMIENTOS JUNTOS POR BARRANCA", "IGUALDAD NACIONAL CRISTIANA AUTONOMA", "ALIANZA POPULAR INDEPENDIENTE", "MOVIMIENTO DE INTEGRACION PARA EL DESARROLLO", "VAMOS POR NASCA", "L.I. N° 19", "FRENTE AMPLIO PODER VECINAL", "L.I. NRO 15 ACCION VECINAL PRO PUNO", "L.I. N° 7 DESARROLLO Y RENOVACION - LIDER", "LUCHO POR CASTILLA", "CONTIGO LAREDO", "TRABAJO + TRABAJO", "MOVIMIENTO PARTICIPEMOS", "MOVIMIENTO POLITICO FUERZA HUANCAVELICA", "FRENTE METROPOLITANO", "CORAZON CHORRILLANO", "MOVIMIENTO INDEPENDIENTE \"FRENTE DE DESARROLLO CORRALES\"", "MOVIMIENTO INDEPENDIENTE TAMBOGRANDINO", "UNIDAD DEL PUEBLO", "ALIANZA ELECTORAL UNIDAD POPULAR", "TODOS POR BELEN", "MOVIMIENTO INDEPENDIENTE REGIONAL APURIMAC UNIDO", "MI DISTRITO", "L.I. NRO 9 SOMOS TAHUAMANU", "DEMOCRACIA CON VALORES", "ROCA FUERTE - SEGUNDA JERUSALEN", "FRENTE UNIFICADO LAMBAYECANO", "MOLLEBAYA AHORA", "LISTA INDEPENDIENTE FRENTE CIVICO", "MOVIMIENTO INDEPENDIENTE UNIDOS CONSTRUYENDO", "L.I. NRO 17 HONESTIDA Y TRABAJO", "MOVIMIENTO REGIONAL INDEPENDIENTE CON EL PERU", "MOVIMIENTO INDEPENDIENTE REGIONAL VAMOS LORETO", "UNION CARRIONINA", "MOVIMIENTO INDEPENDIENTE \"PROGRESO VERDE\"", "MOVIMIENTO INDEPENDIENTE FUERZA CONSTRUCTORA", "POR UN FUTURO MEJOR", "L.I. CAMBIO 93", "DIALOGO VECINAL", "MOVIMIENTO DE IZQUIERDA PAMPINA", "MOVIMIENTO INDEPENDIENTE \"FRENTE SOCIAL NUEVA PROPUESTA\"", "MOVIMIENTO AGRARIO POPULAR UCAYALINO", "RUNA", "UNIDAD CAMPESINA INDEPENDIENTE", "L.I N° 3 UDECA", "TARMA CORAZON", "ACCION POR EL BIENESTAR", "MOVIMIENTO CAMBIO 93", "MOVIMIENTO INDEPENDIENTE IDEAS", "MOVIMIENTO POLITICO REGIONAL ENERGIA COMUNAL AMAZONICA", "LA PERLA EMPRENDE, SI SE PUEDE", "MOVIMIENTO INDEPENDIENTE JUNTOS POR EL DESARROLLO", "PIURA RENACE", "L.I.N° 3", "MOVIMIENTO INDEPENDIENTE \"FRENTE DESARROLLO LUCANAS - FREDEL\"", "SECHURANOS UNIDOS", "MOVIMIENTO INDEPENDIENTE UNION YUNGAINA", "VICTORIA AMAZONENSE", "FUERZA REGIONAL AMAZONICA DE MADRE DE DIOS", "OBRAS Y MAS OBRAS", "PLATAFORMA DEMOCRATICA", "LISTA 5", "TODOS UNIDOS POR NUESTRO AYACUCHO", "MOVIMIENTO INDEPENDIENTE \"INTEGRACION REGIONAL\"", "L.I. NRO 21 BARRANCA AL CAMBIO", "SOMOS MIRAFLORES 2002", "MOVIMIENTO REGIONAL JUSTICIA Y CAPACIDAD", "FUERZA CHANCHAMAYO", "INDEPENDIENTE ACUERDO POPULAR", "JUNTOS GOBERNAREMOS", "SIGAMOS MODERNIZANDO PIMENTEL", "ALTERNATIVA LIBRE", "UNION REGIONAL TRANSPARENTE", "MOVIMIENTO INDEPENDIENTE \"AMANECER AGRARIO - MIAA\"", "MOVIMIENTO INDEPENDIENTE AMISTAD", "COMITE INDEPENDIENTE VECINAL DE PUNTA HERMOSA", "MOVIMIENTO INDEPENDIENTE ALTERNATIVA ANDINA", "MOVIMIENTO INDEPENDIENTE \"FUERZA COMUNAL\"", "MOVIMIENTO HUANUCO UNIDO", "ALIANZA REGIONAL INDEPENDIENTE", "POR EL AVANCE DEL SUR", "SI TRABAJA", "UNIDAD Y DESARROLLO", "CHINCHA SI PUEDE", "L.I N° 5 FRENTE INDEPENDIENTE DE RENOVACION Y CAM", "PARTIDO DE INTEGRACION NACIONAL", "MOVIMIENTO INDEPENDIENTE \"UNIDOS POR TINGO MARIA\"", "FRENTE POPULAR DE IZQUIERDA NUEVO COMAS", "MOVIMIENTO INDEPENDIENTE \"RESURGIR SALPINO\"", "L.I. NRO 7 JUNTOS POR SAN LUIS", "PADIN - MOVIMIENTO INDEPENDIENTE REGIONAL", "MOVIMIENTO REGIONAL FUERZA POR MADRE DE DIOS", "MOVIMIENTO INDEPENDIENTE CENTENARIO ESPINAR", "L.I. NRO 17 INKA PACHAKUTEQ", "VIVA LA MOLINA", "ALIANZA POR TACNA", "ADELANTE CHICLAYO", "CONTIGO MOQUEGUA", "SALVEMOS HUARAZ", "TAYACAJA 98", "CAPACIDAD CIUDADANA AL DESARROLLO", "DESARROLLO SOCIAL AMAZONENSE", "L.I. N° 13 CERRO BAUL", "L.I N° 3 MOVIMIENTO INDEPENDIENTE REQUENA", "TE QUIERO WANCHAQ", "MOVIMIENTO POLITICO INDEPENDIENTE \"CHIM PUM CALLAO\"", "IZQUIERDA PAMPINA", "NUEVO SATIPO", "MOVIMIENTO INDEPENDIENTE REIVINDICADOR DE PADRE ABAD (MIRPA)", "TACNA HEROICA", "CONTIGO SIVIA", "FRENTE UNITARIO POPULAR", "L.I. NRO 33 MAYORIA CON EL CAMBIO EN LA CONVENCION", "FRENTE UNITARIO VECINAL PROGRESISTA ALTO PIURA", "MOVIMIENTO DE IDENTIDAD Y CONFIANZA", "ORGANIZACION POLITICA INDEPENDIENTE DISTRITAL ALTERNATIVA VERDE", "NUEVA VICTORIA", "L.I. NRO 15 REGIONAL FUERZA UCAYALINA", "L.I. NRO 7 VAMOS CHURCAMPA", "ACCION CIVICA", "FUERZA CAMPESINA", "ACCION SOLIDARIA", "L.I. MOVIMIENTO REPRESENTACION DISTRITAL SANTA ANITA", "JUNTOS ALCANZAREMOS EL NORTE \"MI JAEN\"", "MOVIMIENTO ETNOCACERISTA REGIONAL AMA SUA, AMA LLULLA, AMA QUELLA", "ORGANIZACION INDEPENDIENTE ASHANINKA DEL PICHIS", "L.I.N° 3 OBRAS", "PISCO AL FUTURO", "MOVIMIENTO POLITICO INDEPENDIENTE \"TODOS TAWANTINSUYO\"", "SALVEMOS LOS OLIVOS", "UNIDOS POR RECUAY", "FRATERNIDAD FAJARDINA", "L.I. NRO 7 ORGANIZACION PARA EL DESARROLLO DE PATAZ", "MOVIMIENTO INDEPENDIENTE DE DESARROLLO LOCAL - MODELO", "MOVIMIENTO INDEPENDIENTE FUERZA CAMPESINA REGIONAL", "L.I. NRO 13 SOMOS HUERTAS - 95", "MOVIMIENTO INDEPENDIENTE COMAS CON FE", "PODER PARA TODOS", "POR EL DESARROLLO DE CONTRALMIRANTE VILLAR", "CAJAMARCA EN ACCION", "INNOVACION", "MOVIMIENTO UNIDOS POR PUEBLO LIBRE", "TODOS SOMOS CHACLACAYO", "MOVIMIENTO INDEPENDIENTE REIVINDIQUEMOS LORETO", "VAMOS CAYMA CON LA NUEVA GENERACION 2014", "MOVIMIENTO INDEPENDIENTE \"ALTERNATIVA POR LA DEMOCRACIA Y DESARROLLO REGIONAL ALPODER\"", "LA ESPERANZA DE LA PROVINCIA DE CHEPEN", "L.I. NRO 9 MID PASCO", "HUANCAVELICA SOSTENIBLE", "MOVIMIENTO POPULAR VASO DE LECHE", "FRENTE INDEPENDIENTE DE BIGOTE", "MOVIMIENTO INDEPENDIENTE NUESTRO ILO-MOQUEGUA", "MAS ACCION", "L.I. N° 7 FRENTE INDEPENDIENTE AGRICOLA", "PRODE - PROGRESO Y DESARROLLO", "MOVIMIENTO INDEPENDIENTE TODOS POR LAMBAYEQUE", "LOS INDEPENDIENTES", "MOVIMIENTO ECOLOGICO ALTERNATIVA VERDE - LOS VERDES", "FUTURO PARA TODOS", "EL GRAN CAMINO", "MOVIMIENTO MACROREGIONAL TODAS LAS SANGRES - APURIMAC", "L.I. N° 3 FRENTE INDEPENDIENTE RENOVADOR (FIR)", "LUCHO POR EL RIMAC", "FUERZA COMUNAL", "RECUPEREMOS VICTOR LARCO", "L.I. NRO 21 CAMBIO", "MOVIMIENTO REGIONAL AREQUIPA UNIDA", "L.I. NRO 11 TRABAJO + TRABAJO", "UNIDOS POR CHINCHA", "MOVIMIENTO LIBERTAD", "VAMOS SULLANA", "CONCIENCIA CHALACA", "MOVIMIENTO INDEPENDIENTE AMANECER ACOLLINO", "ARMANDO EL PROGRESO", "FRENTE RENACIMIENTO SURQUILLANO", "RESURGIR SALPINO", "MOVIMIENTO INDEPENDIENTE \"ACCION Y DESARROLLO\"", "L.I. NRO 7 ORDEN Y DESARROLLO", "ARRIBA CALANA", "COORDINADORA NACIONAL DE INDEPENDIENTES", "L.I. NRO 5", "MOVIMIENTO INDEPENDIENTE \"LUCHEMOS POR HUANUCO\"", "UNIDOS POR EL DESARROLLO", "CONTIGO BREÑA", "UNION POPULAR CHINCHANA", "POR MIRAFLORES JUNTOS PODEMOS...", "FRENTE INDEPENDIENTE UNIDAD VECINAL DE LURIN", "VALE ANCASH", "L.I. NRO 3 UNIDOS POR LA RENOVACION", "FRENTE ESPERANZA POR TACNA", "PROYECTO VECINAL", "MOVIMIENTO REGIONAL LAMBAYECANO PODER PARA TODOS", "L.I. NRO 09 OBRAS + OBRAS", "TUMBES RENACE", "ALIANZA POPULAR INDEPENDIENTE \"VICTOR LARCO HERRERA\"", "RECONSTRUCCION Y DESARROLLO", "ADELANTE A TRIUNFAR", "PAUCARPATA DESARROLLO TOTAL", "MOVIMIENTO POLITICO INDEPENDIENTE \"DEMOCRACIA ANDINA REGIONAL\"", "FRENTE DE INTEGRACION VECINAL DE UTCUBAMBA", "FRENTE AMPLIO", "MUVA", "L.I. NRO 25 SOMOS MM", "L.I. NRO 3 UNIDOS POR CHEPEN", "MOVIMIENTO ACCION SOCIAL INDEPENDIENTE", "MOVIMIENTO INDEPENDIENTE SOMOS NUEVA GENERACION", "PUJANZA SAMEGUANA", "L.I. NRO 19 UNIDAD VECINAL CASTELLANA", "NUESTRO ILO - MOQUEGUA", "CONTIGO REGION", "FRENTE DE DESARROLLO JUNTOS POR PAUCARPATA", "FRENTE INDEPENDIENTE PASCO UNIDO", "L.I. NRO 9 IZQUIERDA UNIDA", "ORGANIZACION POLITICA REGIONAL \"VICTORIA CHALACA\"", "L.I. NRO 3 MOVIMIENTO INDIGENA 95", "MOVIMIENTO INDEPENDIENTE \"POR LA AGRICULTURA Y TRABAJO DE CHAO\"", "L.I. NRO 21 MOV IND L AMERICAS", "DIGNIDAD Y ESPERANZA FERREÑAFANA", "RENOVACION CONVENCIANA", "L.I. NRO 9 NUEVA ALTERNATIVA", "DESARROLLO PARA TACNA", "L.I. N° 7", "L.I. NRO 9 SUCRE TECNOLOGIA Y DESARROLLO", "POR LAS COMUNIDADES FUENTE DE INTEGRACION ANDINA DE PUNO - CONFIA - PUNO", "LIDER", "ALIANZA HORA CERO FUERZA POPULAR", "PODER Y CAMBIO AL 2010", "AGROPECUARIO HONORIA PROGRESO", "LINEA DE IDENTIDAD Y DESARROLLO SATIPEÑO - LIDER´S", "MOVIMIENTO CIVICO NACIONAL 7 DE JUNIO INDEPENDIENTES PASQUEÑOS", "ANCASH DIGNIDAD", "MOVIMIENTO INDEPENDIENTE TALARA SOMOS GENTE JOVEN", "MOVIMIENTO INDEPENDIENTE OBRAS AL 2000", "MOVIMIENTO CAMPESINO ATUSPARIA", "UNIDAD REGIONAL", "MOVIMIENTO INDEPENDIENTE UVAS - UNION VECINAL DE AVANZADA SUNAMPINA", "TODO POR UCAYALI", "L.I. NRO 5 FRENTE INDEPENDIENTE RENOVADOR - FIR", "MOV. DEMOCRATICO DE IZQUIERDA", "MOVIMIENTO POPULAR REGIONAL", "L.I. NRO 25 FRATERNIDAD NACIONAL", "PUMA 2011", "MOVIMIENTO UCHICINO DE DESARROLLO INTEGRAL MUDI", "MOVIMIENTO INDEPENDIENTE SALVEMOS AYACUCHO", "DIGNIDAD VECINAL", "L.I. NRO 5 UNION POR CARHUAZ", "ACCION Y DESARROLLO", "UPA-TCU UNIDOS PUEBLO AGRO TAMBOGRANDE CASERIOS UNIDOS", "SALVEMOS MIRAFLORES", "PARTIDO SOCIALISTA REVOLUCIONARIO", "LISTA INDEPENDIENTE \"UNION PARA EL DESARROLLO DEL ALTO PIURA\" - UDAP", "MOVIMIENTO DE INTEGRACION INDIGENA Y CAMPESINO", "FRENTE TACNEÑISTA", "L.I. NRO 7 MOV IND FRENTE POPULAR POR MADRE DE DIOS", "L.I. NRO 51 MOVIMIENTO ACCION CIVICA INDEPENDIENTE", "SELVA SUR", "NACE UNA ESPERANZA", "FUERZA POR MADRE DE DIOS", "LISTA 3", "MOVIMIENTO INDEPENDIENTE REGIONAL \"FRENTE UNIDO PROGRESISTA\"", "ESPERANZA CIUDADANA", "MOVIMIENTO ETNOCACERISTA AREQUIPA", "MOVIMIENTO INDEPENDIENTE \"NUEVO FUTURO DE ILO\"", "L. I. PAZ Y DESARROLLO", "RECONSTRUCCION EFECTIVA", "MOVIMIENTO CIVICO REGIONAL \"TODO POR UCAYALI\"", "MOVIMIENTO INDEPENDIENTE CONTIGO CHORRILLOS", "MOVIMIENTO INKA PACHACUTEQ", "UNIDOS PUEBLO AGRO TAMBOGRANDE CASERIOS UNIDOS", "FRENTE INDEPENDIENTE EL PUEBLO ORGANIZADO", "MOVIMIENTO INDEPENDIENTE INTEGRACIONISTA ALTO AMAZONAS M.I.I.A.A.", "L.I. NRO 11 95 YUNGUYO AL FUTURO", "CASTILLA AVANZA", "MOVIMIENTO INDEPENDIENTE \"JUNTOS POR EL CALLAO\"", "UNIDOS POR EL CAMBIO ZARUMILLA", "SOMOS MARIANO MELGAR", "ACCION DE GOBERNABILIDAD PARA LA UNIDAD ANDINA", "L.I. NRO 13 DE LA UNIV", "BARRANCO SOLIDARIO", "MOVIMIENTO INDEPENDIENTE PROVINCIAL \"CONCERTANDO SI PODEMOS\"", "LISTA INDEPENDIENTE \"CONFRATERNIDAD TAYACAJINA\"", "CHIMPUM - CALLAO", "MOVIMIENTO INDEPENDIENTE AMOR POR MADRE DE DIOS", "CIENCIA Y ACCION MOVILIZADORA DE UCAYALI", "L.I N° 13 FRENTE PROGRESISTA DE MASAS", "L.I. NRO 17", "ARRIBA CAÑETE", "L.I. N° 5 UNIDAD POPULAR"];

// ===============================================
// FUNCIÓN MAESTRA DE CONTEO DE CAMISETAS
// ===============================================
function calcularCamisetasUnicas(candidato) {
    let historialSeguro = ensureArray(candidato.historialElectoral);
    
    // Extraemos partidos y quitamos vacíos
    let partidosCrudos = historialSeguro.map(h => h.partido).filter(Boolean);
    if (candidato.partidoActual) partidosCrudos.push(candidato.partidoActual);
    
    const limpiarNombre = (nombre) => nombre.trim().toUpperCase().replace(/\.$/, '');

    // === EL FILTRO FALTANTE QUE APLICA LA REGLA EDITORIAL ===
    partidosCrudos = partidosCrudos.filter(p => !PARTIDOS_EXCLUIDOS.includes(limpiarNombre(p)));
    // =========================================================

    // Buscador de Raíz Canónica (Resuelve cadenas A->B->C y unifica JNE vs CSV)
    const obtenerRaizCanonica = (partido) => {
        let conectados = new Set([partido]);
        let queue = [partido];
        
        while(queue.length > 0) {
            let actual = queue.shift();
            
            // Buscar hacia adelante
            let destino = DICCIONARIO_CLONES[actual];
            if (destino && !conectados.has(destino)) {
                conectados.add(destino);
                queue.push(destino);
            }
            
            // Buscar hacia atrás
            for (let origen in DICCIONARIO_CLONES) {
                if (DICCIONARIO_CLONES[origen] === actual && !conectados.has(origen)) {
                    conectados.add(origen);
                    queue.push(origen);
                }
            }
        }
        return Array.from(conectados).sort()[0];
    };

    // Homologamos el diccionario de alianzas a raíces universales
    const ALIANZAS_RAIZ = {};
    for (let alianza in DICCIONARIO_ALIANZAS) {
        let alianzaRaiz = obtenerRaizCanonica(limpiarNombre(alianza));
        let miembrosRaiz = DICCIONARIO_ALIANZAS[alianza].map(limpiarNombre).map(obtenerRaizCanonica);
        ALIANZAS_RAIZ[alianzaRaiz] = miembrosRaiz;
    }

    // FASE 1: Limpieza de Clones y Nomenclatura
    let partidosClonados = partidosCrudos.map(limpiarNombre).map(obtenerRaizCanonica);
    let pSet = Array.from(new Set(partidosClonados));

    // FASE 2: Absorción de Alianzas
    let partidosFinales = [];

    for (let p of pSet) {
        if (ALIANZAS_RAIZ[p]) {
            let miembrosAlianza = ALIANZAS_RAIZ[p];
            let tieneMiembro = false;
            
            for (let miembro of miembrosAlianza) {
                if (pSet.includes(miembro) && p !== miembro) {
                    tieneMiembro = true;
                    break;
                }
            }

            if (tieneMiembro) {
                continue; // REGLA 2: Se absorbe (No suma)
            } else {
                partidosFinales.push(p); // REGLA 3: Alianza invitada (Suma)
            }
        } else {
            partidosFinales.push(p); // REGLA NORMAL (Suma)
        }
    }

    return partidosFinales.length;
}



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

        // ==========================================
        // 5. Ranking de Perdedores
        // ==========================================
        renderRankingPerdedores(todosLosCandidatos);

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

    // RANKING 1: Cambios de Camiseta usando la nueva lógica de clusters
    let rankingCamisetas = pool.map(c => {
        return { ...c, metrica: calcularCamisetasUnicas(c) };
    }).sort((a, b) => b.metrica - a.metrica).slice(0, 5);

    // RANKING 2: PARTIDOS CON MÁS CAMALEONES (SIEMPRE GLOBAL)
    const conteoPartidos = {};
    
    // Usamos la nueva lógica de clusters para saber si el candidato es camaleón
    candidatos.forEach(c => {
        let totalCamisetas = calcularCamisetasUnicas(c);
        if (totalCamisetas > 1) {
            conteoPartidos[c.partidoActual] = (conteoPartidos[c.partidoActual] || 0) + 1;
        }
    });

    let rankingPartidos = Object.entries(conteoPartidos)
        .map(([nombrePartido, cantidad]) => {
            const idPart = normalizarId(nombrePartido);
            const logoPartido = diccionarioPartidos[idPart] ? diccionarioPartidos[idPart].logo : null;
            return {
                nombre: nombrePartido,
                metrica: cantidad,
                partidoActual: null, // Evita la medallita doble
                idFoto: logoPartido  // Manda el logo al círculo principal
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

// ===============================================
// RENDERIZADO DE LA TARJETA DEL CANDIDATO
// ===============================================
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
    
    let fotoPerfil = candidato.idFoto ? `<img src="${getUrlImagen(candidato.idFoto)}" style="width:100%; height:100%; object-fit:cover; border-radius:50%; filter: grayscale(100%);" onerror="this.outerHTML='<span style=\\'font-size: 24px; font-weight: bold;\\'>${iniciales}</span>'"/>` : `<span style="font-size: 24px; font-weight: bold;">${iniciales}</span>`;
    
    let cargosLabel = Array.isArray(candidato.cargos) ? candidato.cargos.join(' / ') : (candidato.cargos || '');

    const postulacion2026 = {
        anio: "2026",
        partido: pActual,
        rol: cargosLabel || "Candidato"
    };

    let historialElectoralSeguro = ensureArray(candidato.historialElectoral);

    // === FILTRO VISUAL: Borra el movimiento local de la línea de tiempo ===
    const limpiarNombre = (nombre) => nombre.trim().toUpperCase().replace(/\.$/, '');
    historialElectoralSeguro = historialElectoralSeguro.filter(h => !PARTIDOS_EXCLUIDOS.includes(limpiarNombre(h.partido)));
    // =======================================================================

    let historialElectoralOrdenado = historialElectoralSeguro.slice().sort((a, b) => extraerAnioInicial(a.anio) - extraerAnioInicial(b.anio));
    historialElectoralOrdenado.push(postulacion2026); 

    let camElectorales = generarRopaHTML(historialElectoralOrdenado, 'camiseta.png');

    let totalCamisetas = calcularCamisetasUnicas(candidato);

    const html = `
        <div class="candidate-card" style="border-top-color: ${colorPartido}">
            <div class="card-header-flex">
                <div class="avatar-initials" style="color: ${colorPartido}; background-color: ${colorPartido}20; padding: 0; overflow: hidden; display: flex; align-items: center; justify-content: center; font-size: 24px;">
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
        
        // Calculamos las camisetas usando la lógica de clusters
        let uniqueParties = calcularCamisetasUnicas(c);
        
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

// ===============================================
// RANKING DE PERDEDORES (SIN VICTORIAS)
// ===============================================
function renderRankingPerdedores(candidatos) {
    const container = document.getElementById('ranking-perdedores-container');
    if(!container) return;

    // 1. Encontrar a los que nunca ganaron
    let perdedores = candidatos.filter(c => {
        let historial = ensureArray(c.historialElectoral);
        if(historial.length === 0) return false; // Si no tiene historial, no aplica
        
        // Contamos si tiene alguna victoria ("SI")
        let victorias = historial.filter(h => h.elegido && h.elegido.toUpperCase().trim() === 'SI').length;
        
        // Retorna TRUE solo si tiene 0 victorias
        return victorias === 0;
    });

    // 2. Contar todas sus postulaciones (AQUÍ SÍ CUENTA TODO)
    let perdedoresMapeados = perdedores.map(c => {
        let totalPostulaciones = ensureArray(c.historialElectoral).length;
        return { ...c, totalPostulaciones };
    });

    // 3. Ordenar de mayor a menor cantidad de derrotas
    perdedoresMapeados.sort((a, b) => b.totalPostulaciones - a.totalPostulaciones);

    // 4. Tomamos el Top 5 de los más perdedores
    let topPerdedores = perdedoresMapeados.slice(0, 5);

    // 5. REGLA DE DISEÑO: "A la derecha el más perdedor"
    // Invertimos el array para que el número 1 quede al final visualmente
    topPerdedores.reverse();

    // 6. Generar el HTML
    let html = '';
    topPerdedores.forEach(c => {
        let pActual = c.partidoActual || "INDEPENDIENTE";
        let colorPartido = CONFIG.colores.partidos[pActual] || CONFIG.colores.partidos["DEFECTO"];
        let iniciales = getInitials(c.nombre);
        
        let fotoHtml = c.idFoto ? 
            `<img src="${getUrlImagen(c.idFoto)}" class="loser-avatar" onerror="this.outerHTML='<div class=\\'loser-avatar\\' style=\\'color:${colorPartido};\\'>${iniciales}</div>'"/>` : 
            `<div class="loser-avatar" style="color:${colorPartido};">${iniciales}</div>`;

        html += `
            <div class="loser-card" style="border-top: 3px solid ${colorPartido};">
                <div class="loser-party-circle" style="background-color: ${colorPartido};" title="Postula por: ${pActual}"></div>
                ${fotoHtml}
                <div class="loser-name">${c.nombre}</div>
                <div class="loser-stats">${c.totalPostulaciones} derrotas</div>
            </div>
        `;
    });

    container.innerHTML = html;
}