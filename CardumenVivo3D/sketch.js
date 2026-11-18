let fishSystem = null;
const paso = 1 / 60;
let acumulado = 0;
let pasosSimulados = 0;
let panel;
let escenarioListo = false;

function setup() {
    const acuario = document.getElementById("acuario");
    createCanvas(acuario.clientWidth, acuario.clientHeight, WEBGL).parent(acuario);
    panel = new PanelPoblacion();
    FishDrawer.inicializarGeometrias();
    cargarSimulacion();
}

// Lee la configuracion de index.html (localStorage) o, si no hay, la de data/
async function cargarSimulacion() {
    try {
        const respuestaEsquema = await fetch("data/species.schema.json");
        if (!respuestaEsquema.ok)
            throw new Error(`HTTP ${respuestaEsquema.status} al cargar el esquema de especies`);
        const esquema = await respuestaEsquema.json();

        let { config } = await Configuracion.cargar();
        if (Object.keys(Configuracion.validarSistema(config.sistema)).length > 0) {
            console.warn("La configuracion guardada no es valida; se usan los valores por defecto.");
            config = await Configuracion.cargarArchivos();
        }
        fishSystem = crearSistema(config, esquema);
        panel.registrar(0, fishSystem.obtenerPoblaciones());
        document.getElementById("estado").hidden = true;
        escenarioListo = true;
    } catch (error) {
        document.getElementById("estado").textContent = "No se pudo cargar la configuración.";
        console.error("No se pudo cargar la configuracion:", error);
    }
}

function crearSistema(config, esquema) {
    const { caja, fitoplancton } = config.sistema;

    // El constructor recibe (profundidad, ancho, alto)
    const sistema = new FishSystem3D(caja.profundidad, caja.ancho, caja.alto);
    sistema.configurarFitoplancton(
        fitoplancton.densidadMaxima,
        fitoplancton.ratioAparicionPorcentaje / 100,
        fitoplancton.tasaBase,
        fitoplancton.minEnergia,
        fitoplancton.maxEnergia
    );
    sistema.cargarJSON({ especies: config.especies }, esquema);

    for (let especie of sistema.catalogoEspecies) {
        const poblacion = config.poblacion[especie.nombre];
        if (!poblacion) continue;
        for (let i = 0; i < poblacion.bancos; i++) {
            sistema.addMinibanco(poblacion.individuosPorBanco, especie);
        }
    }
    return sistema;
}

function draw() {
    if (fishSystem === null) {
        background(20, 40, 60);
        return;
    }

    // Recuperar como maximo 0.1 s tras una pausa; descartar el exceso.
    if (escenarioListo) acumulado += Math.min(Math.max(0, deltaTime / 1000), 0.1);
    while (acumulado >= paso) {
        fishSystem.simular(paso);
        pasosSimulados++;
        if (pasosSimulados % 60 === 0) {
            panel.registrar(pasosSimulados / 60, fishSystem.obtenerPoblaciones());
        }
        acumulado -= paso;
    }

    background(20, 40, 60);
    orbitControl();
    lights();

    push();
    stroke(255, 100);
    noFill();
    box(fishSystem.ancho, fishSystem.alto, fishSystem.depth);
    pop();

    fishSystem.display();
}

function windowResized() {
    const acuario = document.getElementById("acuario");
    resizeCanvas(acuario.clientWidth, acuario.clientHeight);
}
