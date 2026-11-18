let fishSystem;
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
    fishSystem = new FishSystem3D(2400, 2400, 1200);

    // (densidadMaxima, ratioAparicion %, tasaBase, minEnergia, maxEnergia)
    fishSystem.configurarFitoplancton(0.05, 0.5, 0.08, 1, 10);
    cargarEspecies();
}

async function cargarEspecies() {
    try {
        const [respuestaDatos, respuestaEsquema] = await Promise.all([
            fetch("data/species.json"),
            fetch("data/species.schema.json")
        ]);
        if (!respuestaDatos.ok)
            throw new Error(`HTTP ${respuestaDatos.status} al cargar las especies`);
        if (!respuestaEsquema.ok)
            throw new Error(`HTTP ${respuestaEsquema.status} al cargar el esquema de especies`);
        const [datos, esquema] = await Promise.all([
            respuestaDatos.json(),
            respuestaEsquema.json()
        ]);
        fishSystem.cargarJSON(datos, esquema);

        const especie = fishSystem.catalogoEspecies[0];
        if (especie) {
            fishSystem.addMinibanco(100, especie);
        }

        const depredador = fishSystem.catalogoEspecies.find(e => e.nivelTrofico >= 3);
        if (depredador) {
            fishSystem.addRandomFish(2, depredador);
        }
        panel.registrar(0, fishSystem.obtenerPoblaciones());
        document.getElementById("estado").hidden = true;
        escenarioListo = true;
    } catch (error) {
        document.getElementById("estado").textContent = "No se pudo cargar el catálogo de especies.";
        console.error("No se pudo cargar el catalogo de especies:", error);
    }
}

function draw() {
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
