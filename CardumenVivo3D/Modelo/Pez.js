/**
 * Modelo reutilizable para p5.js en modo global y con un lienzo WEBGL.
 * Crear después de createCanvas(). El frente del modelo es el eje local +X.
 * La escena controla posicion/direccion; actualizar() solo anima la cola.
 */
class Pez {
    constructor({
        posicion = createVector(0, 0, 0),
        direccion = createVector(1, 0, 0),
        tamano = 1,
        colorCuerpo = '#efb34f',
        colorAletas = '#d67a35',
        frecuenciaCola = 2.2,
        amplitudCola = 0.45,
        faseCola = 0,
    } = {}) {
        this.posicion = posicion.copy();
        this.direccion = createVector(1, 0, 0);
        this.orientar(direccion);
        this.tamano = tamano;
        this.colorCuerpo = colorCuerpo;
        this.colorAletas = colorAletas;
        this.frecuenciaCola = frecuenciaCola; // Ciclos por segundo.
        this.amplitudCola = amplitudCola; // Radianes.
        this.faseCola = faseCola;
    }

    // Una dirección nula conserva la orientación anterior.
    orientar(direccion) {
        if (direccion.magSq() > 0.000001) {
            this.direccion.set(direccion).normalize();
        }
    }

    actualizar(segundos) {
        this.faseCola = (this.faseCola + Math.PI * 2 *
            this.frecuenciaCola * Math.max(0, segundos)) % (Math.PI * 2);
    }

    display() {
        push();
        this._aplicarTransformacion();

        // Cuerpo ovalado. p5 recibe radios: mide 76 x 36 x 28.
        ambientMaterial(this.colorCuerpo);
        ellipsoid(38, 18, 14, 24, 16);

        // Cola triangular con grosor: gira desde su unión con el cuerpo.
        push();
        translate(-34, 0, 0);
        rotateY(Math.sin(this.faseCola) * this.amplitudCola);
        ambientMaterial(this.colorAletas);
        this._dibujarAleta([[0, 0, 0], [-30, -23, 0], [-30, 23, 0]]);
        pop();

        // Un ojo a cada lado del cuerpo.
        for (const lado of [-1, 1]) {
            push();
            translate(23, -5, lado * 10.5);
            ambientMaterial('#fff8e9');
            sphere(3.8, 10, 8);
            translate(1.1, 0, lado * 2.6);
            ambientMaterial('#172a33');
            sphere(1.9, 8, 6);
            pop();
        }
        pop();
    }

    // Convierte tres puntos en un prisma triangular cerrado.
    // Se comparte entre la cola, la cresta dorsal y las aletas laterales.
    _dibujarAleta(puntos, grosor = 0.5) {
        const triangulo = puntos.map(([x, y, z]) => createVector(x, y, z));
        const borde1 = p5.Vector.sub(triangulo[1], triangulo[0]);
        const borde2 = p5.Vector.sub(triangulo[2], triangulo[0]);
        const separacion = borde1.cross(borde2).normalize().mult(grosor / 2);

        // Dos triángulos paralelos, uno a cada lado del plano original.
        const vertices = [
            ...triangulo.map(punto => p5.Vector.sub(punto, separacion)),
            ...triangulo.map(punto => p5.Vector.add(punto, separacion)),
        ];
        const caras = [
            [0, 2, 1], [3, 4, 5], // Frente y reverso.
            [0, 1, 4], [0, 4, 3], // Primer borde.
            [1, 2, 5], [1, 5, 4], // Segundo borde.
            [2, 0, 3], [2, 3, 5], // Tercer borde.
        ];

        beginShape(TRIANGLES);
        for (const [i, j, k] of caras) {
            const a = vertices[i], b = vertices[j], c = vertices[k];
            const perpendicular = p5.Vector.sub(b, a).cross(p5.Vector.sub(c, a)).normalize();
            normal(perpendicular.x, perpendicular.y, perpendicular.z);
            vertex(a.x, a.y, a.z);
            vertex(b.x, b.y, b.z);
            vertex(c.x, c.y, c.z);
        }
        endShape();
    }

    // Compartido para que el cuerpo y las aletas usen la misma orientación.
    _aplicarTransformacion() {
        translate(this.posicion.x, this.posicion.y, this.posicion.z);
        const horizontal = Math.hypot(this.direccion.x, this.direccion.z);
        rotateY(Math.atan2(-this.direccion.z, this.direccion.x));
        rotateZ(Math.atan2(this.direccion.y, horizontal));
        scale(this.tamano);
        noStroke();
    }
}
