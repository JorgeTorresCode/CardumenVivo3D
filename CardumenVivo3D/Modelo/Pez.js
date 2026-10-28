class Pez extends Agent3D {
    constructor(x, y, z, mass = 15, depth = 1200, {
        esDepredador = false,
        tamano = 1,
        colorCuerpo = '#efb34f',
        colorAletas = '#d67a35',
    } = {}) {
        super(x, y, z, mass, depth);
        this.esDepredador = esDepredador;
        this.tamano = tamano;
        this.colorCuerpo = colorCuerpo;
        this.colorAletas = colorAletas;
        this.tiempoCola = 0;
        this.direccionAnterior = createVector(1, 0, 0);
    }

    update(segundos = deltaTime / 1000) {
        super.update();
        this.tiempoCola += Math.max(0, segundos);
        if (this.speed.magSq() > 0.000001) {
            this.direccionAnterior.set(this.speed).normalize();
        }
    }

    display() {
        DibujadorPez.display(this.esDepredador, this);
    }
}



