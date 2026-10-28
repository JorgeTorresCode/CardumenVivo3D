/** Dibujo WEBGL. El frente del modelo es +X y arriba es -Y. */
class DibujadorPez {
    // Fachada: coordina las partes, sin modificar el estado físico del pez.
    static display(esDepredador, pez) {
        push();
        this._aplicarTransformacion(pez);
        this._dibujarCuerpo(pez);
        this._dibujarCola(pez);
        this._dibujarOjos();
        if (esDepredador) {
            this._dibujarAletaDorsal(pez);
            this._dibujarAletasLaterales(pez);
        }
        pop();
    }

    static _aplicarTransformacion(pez) {
        // Una velocidad casi nula conserva la última orientación visual.
        const direccion = pez.speed.magSq() > 0.000001
            ? pez.speed : pez.direccionAnterior;
        translate(pez.pos.x, pez.pos.y, pez.pos.z);
        const horizontal = Math.hypot(direccion.x, direccion.z);
        rotateY(Math.atan2(-direccion.z, direccion.x));
        rotateZ(Math.atan2(direccion.y, horizontal));
        // El semieje mayor del cuerpo mide 38: se escala al radio del agente.
        scale(pez.tamano * pez.r / 38);
        noStroke();
    }

    static _dibujarCuerpo(pez) {
        ambientMaterial(pez.colorCuerpo);
        ellipsoid(38, 18, 14, 24, 16);
    }

    static _dibujarCola(pez) {
        const frecuencia = 2.2; // Ciclos por segundo, igual al aleteo original.
        const amplitud = 0.45; // Radianes.
        const fase = (pez.tiempoCola * Math.PI * 2 * frecuencia) % (Math.PI * 2);
        push();
        translate(-34, 0, 0);
        rotateY(Math.sin(fase) * amplitud);
        ambientMaterial(pez.colorAletas);
        this._dibujarAleta([[0, 0, 0], [-30, -23, 0], [-30, 23, 0]]);
        pop();
    }

    static _dibujarOjos() {
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
    }

    static _dibujarAletaDorsal(pez) {
        ambientMaterial(pez.colorAletas);
        this._dibujarAleta([[13, -14, 0], [-8, -43, 0], [-19, -14, 0]]);
    }

    static _dibujarAletasLaterales(pez) {
        ambientMaterial(pez.colorAletas);
        this._dibujarAleta([[14, 5, 9], [-20, 10, 39], [-15, 5, 9]]);
        this._dibujarAleta([[14, 5, -9], [-15, 5, -9], [-20, 10, -39]]);
    }

    // Prisma triangular compartido por la cola y las aletas adicionales.
    static _dibujarAleta(puntos, grosor = 0.5) {
        const triangulo = puntos.map(([x, y, z]) => createVector(x, y, z));
        const borde1 = p5.Vector.sub(triangulo[1], triangulo[0]);
        const borde2 = p5.Vector.sub(triangulo[2], triangulo[0]);
        const separacion = borde1.cross(borde2).normalize().mult(grosor / 2);
        const vertices = [
            ...triangulo.map(punto => p5.Vector.sub(punto, separacion)),
            ...triangulo.map(punto => p5.Vector.add(punto, separacion)),
        ];
        const caras = [
            [0, 2, 1], [3, 4, 5],
            [0, 1, 4], [0, 4, 3],
            [1, 2, 5], [1, 5, 4],
            [2, 0, 3], [2, 3, 5],
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
}
