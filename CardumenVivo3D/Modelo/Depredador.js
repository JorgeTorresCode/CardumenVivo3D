/** Mismo cuerpo y cola que Pez, más dos aletas laterales y una dorsal. */
class Depredador extends Pez {
    constructor(opciones = {}) {
        super({
            tamano: 1.3,
            colorCuerpo: '#70b7c9',
            colorAletas: '#397c98',
            frecuenciaCola: 1.7,
            amplitudCola: 0.32,
            ...opciones,
        });
    }

    display() {
        // Reutiliza el cuerpo, la cola animada y los ojos del pez.
        super.display();

        push();
        this._aplicarTransformacion();
        ambientMaterial(this.colorAletas);

        // Cresta dorsal. En p5, -Y apunta hacia arriba.
        this._dibujarAleta([[13, -14, 0], [-8, -43, 0], [-19, -14, 0]]);

        // Aletas laterales simétricas; sobresalen a ambos lados del cuerpo.
        this._dibujarAleta([[14, 5, 9], [-20, 10, 39], [-15, 5, 9]]);
        this._dibujarAleta([[14, 5, -9], [-15, 5, -9], [-20, 10, -39]]);
        pop();
    }
}
