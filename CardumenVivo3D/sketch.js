function setup() {
    createCanvas(800, 600);
}

function draw() {
    background(220);
    let pez;
let depredador;
let tiempo = 0;
let pausado = false;
let mostrarLimites = true;
let camara;
let lienzo;

function setup() {
    lienzo = createCanvas(windowWidth, windowHeight, WEBGL);
    lienzo.parent('escena');
    lienzo.elt.setAttribute('aria-label', 'Pez dorado y depredador azul nadando en una escena tridimensional');
    lienzo.elt.addEventListener('contextmenu', (evento) => evento.preventDefault());
    pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
    camara = createCamera();
    restablecerCamara();

    pez = new Pez();
    depredador = new Depredador({ faseCola: Math.PI / 2 });
    actualizarRecorridos();

    document.querySelector('#pausa').addEventListener('click', alternarPausa);
    document.querySelector('#camara').addEventListener('click', restablecerCamara);
    document.querySelector('#limites').addEventListener('change', (evento) => {
        mostrarLimites = evento.target.checked;
    });
}

function draw() {
    background('#0b1e2b');
    orbitControl();
    ambientLight(150, 160, 175);
    directionalLight(255, 242, 215, -0.4, 0.7, -0.6);
    directionalLight(100, 170, 215, 0.6, -0.2, 0.5);

    if (!pausado) {
        // Evita saltos al regresar de una pestaña inactiva.
        const segundos = Math.min(deltaTime / 1000, 0.05);
        tiempo += segundos;
        actualizarRecorridos();
        pez.actualizar(segundos);
        depredador.actualizar(segundos);
    }

    dibujarEscenario();
    pez.display();
    depredador.display();
}

// Los recorridos pertenecen a esta demostración, no a las clases de dibujo.
function actualizarRecorridos() {
    recorrer(pez, -155, tiempo * 0.48, 85, 70, -12);
    recorrer(depredador, 155, tiempo * 0.38 + 0.3, 70, 65, -12);
}

function recorrer(modelo, centroX, angulo, radioX, radioZ, altura) {
    modelo.posicion.set(
        centroX + radioX * Math.sin(angulo),
        altura + 18 * Math.sin(angulo * 2),
        radioZ * Math.cos(angulo),
    );
    // Derivada del recorrido: la cabeza mira hacia donde nada.
    modelo.orientar(createVector(
        radioX * Math.cos(angulo),
        36 * Math.cos(angulo * 2),
        -radioZ * Math.sin(angulo),
    ));
}

function dibujarEscenario() {
    push();
    stroke('#244453');
    strokeWeight(1);
    for (let x = -350; x <= 350; x += 50) {
        line(x, 105, -175, x, 105, 175);
    }
    for (let z = -175; z <= 175; z += 50) {
        line(-350, 105, z, 350, 105, z);
    }
    if (mostrarLimites) {
        noFill();
        stroke('#355666');
        translate(0, -5, 0);
        box(700, 220, 350);
    }
    pop();
}

function alternarPausa() {
    pausado = !pausado;
    const boton = document.querySelector('#pausa');
    boton.textContent = pausado ? 'Reanudar' : 'Pausar';
    boton.setAttribute('aria-pressed', String(pausado));
}

function restablecerCamara() {
    const distancia = Math.max(560, 540 / (width / height));
    camara.camera(distancia * 0.32, -distancia * 0.35, distancia, 0, 0, 0, 0, 1, 0);
    camara.perspective(Math.PI / 3, width / height, 5, 10000);
    setCamera(camara);
    // p5 2.2.3 conserva la inercia de orbitControl en el renderizador.
    // Limpiarla evita que la cámara vuelva a moverse tras restablecerla.
    lienzo.rotateVelocity.set(0, 0);
    lienzo.moveVelocity.set(0, 0);
    lienzo.zoomVelocity = 0;
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    restablecerCamara();
}

}