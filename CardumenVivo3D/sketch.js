let fishSystem;
const paso = 1 / 60;
let acumulado = 0;

function setup() {
    createCanvas(windowWidth - 5, windowHeight - 5, WEBGL);
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
    } catch (error) {
        console.error("No se pudo cargar el catalogo de especies:", error);
    }
}

function draw() {
    // Recuperar como maximo 0.1 s tras una pausa; descartar el exceso.
    acumulado += Math.min(Math.max(0, deltaTime / 1000), 0.1);
    while (acumulado >= paso) {
        fishSystem.simular(paso);
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
