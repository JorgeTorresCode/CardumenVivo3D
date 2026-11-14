class Fish extends Agent3D {
    constructor(x, y, z, mass, depth, esDepredador, tamano) {
        super(x, y, z, mass, depth);
        this.esDepredador = esDepredador;
        this.tamano = tamano;
        this.color = color(random(20, 255), random(20, 255), random(20, 255));
        this.tiempoCola = 0;
        this.direccionAnterior = createVector(1, 0, 0);
    }

    update(ancho, alto, profundidad) {
        super.update(ancho, alto, profundidad);
        this.tiempoCola += Math.max(0, deltaTime / 1000);
        if (this.speed.magSq() > 0.000001) {
            this.direccionAnterior.set(this.speed).normalize();
        }
    }

    display() {
        FishDrawer.display(this.esDepredador, this);
    }
}

