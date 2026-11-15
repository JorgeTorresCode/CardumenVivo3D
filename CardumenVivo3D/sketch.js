let fishSystem;

function setup() {
    createCanvas(windowWidth - 5, windowHeight - 5, WEBGL);
    fishSystem = new FishSystem3D(2400, 2400, 1200);

    // (densidadMaxima, ratioAparicion %, tasaBase, minEnergia, maxEnergia)
    fishSystem.configurarFitoplancton(0.05, 0.5, 0.08, 1, 10);
    fishSystem.addMinibanco(10, 15, false, 1);
}

function draw() {
    background(20, 40, 60);
    orbitControl();
    lights();

    push();
    stroke(255, 100);
    noFill();
    box(fishSystem.ancho, fishSystem.alto, fishSystem.depth);
    pop();

    fishSystem.cohere();
    fishSystem.align();
    fishSystem.separate();
    fishSystem.wander();

    fishSystem.update();
}