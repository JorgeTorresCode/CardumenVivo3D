class Pez extends Agent3D {
    constructor(x, y, z, mass, depth, {
        esDepredador = false,
        tamano = 1
    }) {
        super(x, y, z, mass, depth);
        this.esDepredador = esDepredador;
        this.tamano = tamano;
        this.color = color(random(20, 255), random(20, 255), random(20, 255));
        this.tiempoCola = 0;
        this.direccionAnterior = createVector(1, 0, 0);
    }

    update(dimensiones) {
        super.update(dimensiones);
        this.tiempoCola += Math.max(0, deltaTime / 1000);
        if (this.speed.magSq() > 0.000001) {
            this.direccionAnterior.set(this.speed).normalize();
        }
    }

    display() {
        DibujadorPez.display(this.esDepredador, this);
    }
}



