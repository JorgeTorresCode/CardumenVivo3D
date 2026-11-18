// Interfaz de index.html: edita la configuracion y la guarda en localStorage.
// La logica (validaciones, calculos, importar) vive en Model/Configuracion.js.

let config = null;
let validarEsquema = null;
let indiceEditando = null;   // null = especie nueva

// Campos del formulario de especie, en el orden en que se muestran
const CAMPOS_ESPECIE = [
    { grupo: "Identidad" },
    { clave: "nombre", etiqueta: "Nombre", tipo: "text", ancho: true },
    { clave: "color", etiqueta: "Color", tipo: "color" },
    { grupo: "Ecologia" },
    { clave: "nivelTrofico", etiqueta: "Nivel trofico", paso: 0.1 },
    { clave: "espectroTrofico", etiqueta: "Espectro trofico (min – max)", tipo: "rango", paso: 0.1 },
    { clave: "eficienciaAsimilacion", etiqueta: "Eficiencia de asimilacion (0 – 1)", paso: 0.05 },
    { grupo: "Cuerpo y movimiento" },
    { clave: "tamano", etiqueta: "Tamano", paso: 0.1 },
    { clave: "radius", etiqueta: "Radio de colision", paso: 0.5 },
    { clave: "radioPercepcion", etiqueta: "Radio de percepcion", paso: 10 },
    { clave: "velocidadBase", etiqueta: "Velocidad base", paso: 0.1 },
    { clave: "velocidadRafaga", etiqueta: "Velocidad de rafaga", paso: 0.1 },
    { grupo: "Energia" },
    { clave: "energiaMaxima", etiqueta: "Energia maxima", paso: 1 },
    { clave: "energiaInicial", etiqueta: "Energia inicial", paso: 1 },
    { clave: "umbralHambre", etiqueta: "Umbral de hambre", paso: 1 },
    { clave: "umbralReproduccion", etiqueta: "Umbral de reproduccion", paso: 1 },
    { clave: "costoMetabolicoBase", etiqueta: "Costo metabolico base", paso: 0.01 },
    { clave: "costoLocomocion", etiqueta: "Costo de locomocion", paso: 0.005 }
];

// Valores con los que arranca una especie nueva
const ESPECIE_NUEVA = {
    nombre: "",
    color: [200, 160, 90],
    nivelTrofico: 2.5,
    espectroTrofico: [1, 2],
    tamano: 1,
    radius: 15,
    radioPercepcion: 300,
    velocidadBase: 2,
    velocidadRafaga: 5,
    energiaMaxima: 100,
    energiaInicial: 90,
    umbralHambre: 70,
    umbralReproduccion: 85,
    eficienciaAsimilacion: 0.7,
    costoMetabolicoBase: 0.12,
    costoLocomocion: 0.025
};

const $ = id => document.getElementById(id);

// ---------- Arranque ----------

async function iniciar() {
    construirFormularioEspecie();
    conectarEventos();
    try {
        const respuestaEsquema = await fetch("data/species.schema.json");
        if (!respuestaEsquema.ok) throw new Error(`HTTP ${respuestaEsquema.status} al cargar el esquema`);
        const esquema = await respuestaEsquema.json();
        if (typeof ajv2020 !== "undefined") {
            validarEsquema = new ajv2020({ allErrors: true }).compile(esquema);
        } else {
            mostrarEstado("No se pudo cargar Ajv: solo se aplicaran las validaciones basicas.");
        }

        const { config: cargada, origen } = await Configuracion.cargar();
        config = cargada;
        mostrarEstado(origen === "guardada"
            ? "Configuracion guardada en este navegador."
            : "Valores por defecto de data/config.json y data/species.json.");
        dibujarTodo();
    } catch (error) {
        console.error(error);
        const aviso = $("errorCarga");
        aviso.textContent = "No se pudo cargar la configuracion. Abre el proyecto con un servidor local " +
            "(por ejemplo Live Server) en lugar de abrir el archivo directamente. Detalle: " + error.message;
        aviso.hidden = false;
    }
}

function conectarEventos() {
    for (let input of document.querySelectorAll("[data-sistema]")) {
        input.addEventListener("input", () => {
            asignarRuta(config.sistema, input.dataset.sistema, leerNumero(input));
            guardarYActualizar();
        });
    }
    $("botonNueva").addEventListener("click", () => abrirDialogo(null));
    $("botonCancelar").addEventListener("click", () => $("dialogoEspecie").close());
    $("formEspecie").addEventListener("submit", guardarEspecie);
    $("botonExportarEspecies").addEventListener("click", () =>
        descargar("species.json", Configuracion.exportarEspecies(config)));
    $("botonExportarSistema").addEventListener("click", () =>
        descargar("config.json", Configuracion.exportarSistema(config)));
    $("botonImportar").addEventListener("click", () => $("archivoImportar").click());
    $("archivoImportar").addEventListener("change", importarArchivo);
    $("botonRestaurar").addEventListener("click", restaurar);
    $("botonIniciar").addEventListener("click", iniciarSimulacion);
}

// ---------- Utilidades ----------

function leerNumero(input) {
    return input.value.trim() === "" ? NaN : Number(input.value);
}

function leerRuta(objeto, ruta) {
    return ruta.split(".").reduce((o, k) => o?.[k], objeto);
}

function asignarRuta(objeto, ruta, valor) {
    const claves = ruta.split(".");
    const ultima = claves.pop();
    const destino = claves.reduce((o, k) => (o[k] = o[k] ?? {}), objeto);
    destino[ultima] = valor;
}

function rgbAHex([r, g, b]) {
    return "#" + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, "0")).join("");
}

function hexARgb(hex) {
    const v = parseInt(hex.slice(1), 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

function formatear(n) {
    return Number.isFinite(n) ? n.toLocaleString("es-CR") : "–";
}

function mostrarEstado(texto) {
    $("estado").textContent = texto;
}

function crearElemento(etiqueta, clase, texto) {
    const el = document.createElement(etiqueta);
    if (clase) el.className = clase;
    if (texto !== undefined) el.textContent = texto;
    return el;
}

function guardarYActualizar() {
    if (!Configuracion.guardar(config)) {
        mostrarEstado("No se pudo guardar en este navegador (localStorage no disponible).");
    } else {
        mostrarEstado("Cambios guardados en este navegador.");
    }
    actualizarSistema();
}

// ---------- Dibujo ----------

function dibujarTodo() {
    for (let input of document.querySelectorAll("[data-sistema]")) {
        const valor = leerRuta(config.sistema, input.dataset.sistema);
        input.value = Number.isFinite(valor) ? valor : "";
    }
    dibujarTabla();
    actualizarSistema();
}

function actualizarSistema() {
    const errores = Configuracion.validarSistema(config.sistema);
    for (let span of document.querySelectorAll("[data-error-sistema]")) {
        const mensaje = errores[span.dataset.errorSistema] ?? "";
        span.textContent = mensaje;
        span.previousElementSibling.setAttribute("aria-invalid", mensaje ? "true" : "false");
    }

    const sistemaValido = Object.keys(errores).length === 0;
    $("capacidadCarga").textContent = sistemaValido ? formatear(Configuracion.capacidadCarga(config.sistema)) : "–";
    $("fitoInicial").textContent = sistemaValido ? formatear(Configuracion.fitoplanctonInicial(config.sistema)) : "–";
    $("totalPeces").textContent = formatear(Configuracion.totalPeces(config));

    const lista = $("avisosSistema");
    lista.replaceChildren(...Configuracion.avisosSistema(config).map(a => crearElemento("li", null, a)));

    for (let especie of config.especies) {
        const celda = document.querySelector(`[data-total="${CSS.escape(especie.nombre)}"]`);
        if (celda) celda.textContent = formatear(Configuracion.pecesDeEspecie(config, especie.nombre));
    }
}

function dibujarTabla() {
    const cuerpo = $("cuerpoTabla");
    const avisos = Configuracion.avisosEcologicos(config.especies);
    cuerpo.replaceChildren();
    $("tablaVacia").hidden = config.especies.length > 0;

    config.especies.forEach((especie, indice) => {
        const fila = document.createElement("tr");

        const celdaNombre = crearElemento("td", "celda-especie");
        const muestra = crearElemento("span", "muestra-color");
        muestra.style.background = rgbAHex(especie.color);
        const bloque = crearElemento("div");
        bloque.append(crearElemento("strong", null, especie.nombre));
        const listaAvisos = crearElemento("ul", "avisos-especie");
        for (let aviso of avisos[especie.nombre] ?? []) {
            const item = crearElemento("li", aviso.startsWith("No puede") ? "aviso-fuerte" : null, aviso);
            listaAvisos.append(item);
        }
        bloque.append(listaAvisos);
        celdaNombre.append(muestra, bloque);

        fila.append(
            celdaNombre,
            crearElemento("td", "num", especie.nivelTrofico),
            crearElemento("td", "num", `${especie.espectroTrofico[0]} – ${especie.espectroTrofico[1]}`),
            crearElemento("td", "num", especie.tamano),
            celdaPoblacion(especie, "bancos"),
            celdaPoblacion(especie, "individuosPorBanco")
        );

        const total = crearElemento("td", "num total");
        total.dataset.total = especie.nombre;
        fila.append(total);

        const acciones = crearElemento("td", "celda-acciones");
        acciones.append(
            botonAccion("Editar", () => abrirDialogo(indice)),
            botonAccion("Duplicar", () => duplicarEspecie(indice)),
            botonAccion("Eliminar", () => eliminarEspecie(indice), "boton-peligro")
        );
        fila.append(acciones);
        cuerpo.append(fila);
    });
}

function celdaPoblacion(especie, campo) {
    const celda = crearElemento("td", "num");
    const input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.step = "1";
    input.className = "input-tabla";
    input.value = config.poblacion[especie.nombre][campo];
    input.setAttribute("aria-label", `${campo === "bancos" ? "Bancos" : "Individuos por banco"} de ${especie.nombre}`);
    const error = crearElemento("small", "error");

    input.addEventListener("input", () => {
        const entrada = config.poblacion[especie.nombre];
        entrada[campo] = leerNumero(input);
        const errores = Configuracion.validarPoblacion(entrada);
        error.textContent = errores[campo] ?? "";
        input.setAttribute("aria-invalid", errores[campo] ? "true" : "false");
        guardarYActualizar();
    });
    celda.append(input, error);
    return celda;
}

function botonAccion(texto, accion, claseExtra = "") {
    const boton = crearElemento("button", `boton boton-chico ${claseExtra}`.trim(), texto);
    boton.type = "button";
    boton.addEventListener("click", accion);
    return boton;
}

// ---------- CRUD de especies ----------

function construirFormularioEspecie() {
    const contenedor = $("camposEspecie");
    let fieldset = null;
    for (let campo of CAMPOS_ESPECIE) {
        if (campo.grupo) {
            fieldset = crearElemento("fieldset");
            fieldset.append(crearElemento("legend", null, campo.grupo));
            contenedor.append(fieldset);
            continue;
        }
        const etiqueta = crearElemento("label", campo.ancho ? "campo campo-ancho" : "campo");
        etiqueta.append(crearElemento("span", null, campo.etiqueta));

        if (campo.tipo === "rango") {
            const par = crearElemento("div", "par");
            for (let i = 0; i < 2; i++) {
                const input = document.createElement("input");
                input.type = "number";
                input.step = campo.paso;
                input.name = `${campo.clave}.${i}`;
                input.setAttribute("aria-label", `${campo.etiqueta}: ${i === 0 ? "minimo" : "maximo"}`);
                par.append(input);
            }
            etiqueta.append(par);
        } else {
            const input = document.createElement("input");
            input.type = campo.tipo ?? "number";
            if (!campo.tipo) input.step = campo.paso;
            input.name = campo.clave;
            etiqueta.append(input);
        }
        const error = crearElemento("small", "error");
        error.dataset.errorEspecie = campo.clave;
        etiqueta.append(error);
        fieldset.append(etiqueta);
    }
}

function abrirDialogo(indice) {
    indiceEditando = indice;
    const especie = indice === null ? ESPECIE_NUEVA : config.especies[indice];
    $("tituloDialogo").textContent = indice === null ? "Nueva especie" : `Editar: ${especie.nombre}`;
    const form = $("formEspecie");

    for (let campo of CAMPOS_ESPECIE) {
        if (!campo.clave) continue;
        const valor = especie[campo.clave];
        if (campo.tipo === "rango") {
            form.elements[`${campo.clave}.0`].value = valor[0];
            form.elements[`${campo.clave}.1`].value = valor[1];
        } else if (campo.tipo === "color") {
            form.elements[campo.clave].value = rgbAHex(valor);
        } else {
            form.elements[campo.clave].value = valor;
        }
    }
    mostrarErroresEspecie({});
    $("dialogoEspecie").showModal();
    form.elements.nombre.focus();
}

function leerFormularioEspecie() {
    const form = $("formEspecie");
    const especie = {};
    for (let campo of CAMPOS_ESPECIE) {
        if (!campo.clave) continue;
        if (campo.tipo === "rango") {
            especie[campo.clave] = [
                leerNumero(form.elements[`${campo.clave}.0`]),
                leerNumero(form.elements[`${campo.clave}.1`])
            ];
        } else if (campo.tipo === "color") {
            especie[campo.clave] = hexARgb(form.elements[campo.clave].value);
        } else if (campo.tipo === "text") {
            especie[campo.clave] = form.elements[campo.clave].value.trim();
        } else {
            especie[campo.clave] = leerNumero(form.elements[campo.clave]);
        }
    }
    return especie;
}

function mostrarErroresEspecie(errores) {
    const conocidos = new Set();
    for (let span of document.querySelectorAll("[data-error-especie]")) {
        const clave = span.dataset.errorEspecie;
        conocidos.add(clave);
        span.textContent = errores[clave] ?? "";
        for (let input of span.parentElement.querySelectorAll("input")) {
            input.setAttribute("aria-invalid", errores[clave] ? "true" : "false");
        }
    }
    const otros = Object.entries(errores).filter(([clave]) => !conocidos.has(clave));
    $("erroresGenerales").textContent = otros.map(([, mensaje]) => mensaje).join(" ");
}

function guardarEspecie(evento) {
    evento.preventDefault();
    const especie = leerFormularioEspecie();
    const nombreOriginal = indiceEditando === null ? null : config.especies[indiceEditando].nombre;
    const errores = Configuracion.validarEspecie(especie, validarEsquema, config.especies, nombreOriginal);
    mostrarErroresEspecie(errores);
    if (Object.keys(errores).length > 0) {
        document.querySelector('#formEspecie [aria-invalid="true"]')?.focus();
        return;
    }

    if (indiceEditando === null) {
        config.especies.push(especie);
        config.poblacion[especie.nombre] = { ...Configuracion.POBLACION_NUEVA };
    } else {
        const poblacion = config.poblacion[nombreOriginal];
        delete config.poblacion[nombreOriginal];
        config.poblacion[especie.nombre] = poblacion;
        config.especies[indiceEditando] = especie;
    }
    Configuracion.completarPoblacion(config);
    $("dialogoEspecie").close();
    dibujarTabla();
    guardarYActualizar();
}

function duplicarEspecie(indice) {
    const original = config.especies[indice];
    const copia = Configuracion.clonar(original);
    let n = 1;
    do {
        copia.nombre = `${original.nombre} (copia${n > 1 ? " " + n : ""})`;
        n++;
    } while (config.especies.some(e => e.nombre === copia.nombre));

    config.especies.splice(indice + 1, 0, copia);
    config.poblacion[copia.nombre] = { ...config.poblacion[original.nombre] };
    dibujarTabla();
    guardarYActualizar();
}

function eliminarEspecie(indice) {
    const especie = config.especies[indice];
    if (!confirm(`¿Eliminar la especie "${especie.nombre}"?`)) return;
    config.especies.splice(indice, 1);
    Configuracion.completarPoblacion(config);
    dibujarTabla();
    guardarYActualizar();
}

// ---------- Importar, exportar y restaurar ----------

function descargar(nombreArchivo, datos) {
    const blob = new Blob([JSON.stringify(datos, null, 2) + "\n"], { type: "application/json" });
    const enlace = document.createElement("a");
    enlace.href = URL.createObjectURL(blob);
    enlace.download = nombreArchivo;
    enlace.click();
    URL.revokeObjectURL(enlace.href);
}

async function importarArchivo(evento) {
    const archivo = evento.target.files[0];
    evento.target.value = "";
    if (!archivo) return;
    try {
        const datos = JSON.parse(await archivo.text());
        const resultado = Configuracion.importar(config, datos, validarEsquema);
        config = resultado.config;
        let mensaje = resultado.mensajes.join(" ");
        if (resultado.descartadas.length > 0) {
            mensaje += " Descartadas: " + resultado.descartadas.map(d => d.nombre).join(", ") + ".";
            console.warn("Especies descartadas al importar:", resultado.descartadas);
        }
        dibujarTodo();
        guardarYActualizar();
        mostrarEstado(mensaje);
    } catch (error) {
        mostrarEstado("No se pudo leer el archivo: no es un JSON valido.");
    }
}

async function restaurar() {
    if (!confirm("¿Descartar los cambios guardados en este navegador y volver a los valores por defecto?")) return;
    Configuracion.borrar();
    try {
        config = await Configuracion.cargarArchivos();
        dibujarTodo();
        mostrarEstado("Valores por defecto restaurados.");
    } catch (error) {
        mostrarEstado("No se pudieron cargar los valores por defecto: " + error.message);
    }
}

function iniciarSimulacion() {
    const erroresSistema = Configuracion.validarSistema(config.sistema);
    const poblacionInvalida = config.especies.some(e =>
        Object.keys(Configuracion.validarPoblacion(config.poblacion[e.nombre])).length > 0);

    if (Object.keys(erroresSistema).length > 0 || poblacionInvalida) {
        mostrarEstado("Corrige los campos marcados antes de iniciar.");
        document.querySelector('[aria-invalid="true"]')?.focus();
        return;
    }
    if (!Configuracion.guardar(config)) {
        mostrarEstado("No se pudo guardar la configuracion en este navegador.");
        return;
    }
    window.location.href = "sketch.html";
}

iniciar();
