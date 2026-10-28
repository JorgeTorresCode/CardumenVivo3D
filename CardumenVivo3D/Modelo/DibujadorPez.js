class DibujadorPez {
    static display(esDepredador, pez) {
        push();
        this.aplicarTransformacion(pez);
        this.dibujarCuerpo(pez);
        this.dibujarCola(pez);
        this.dibujarOjos(pez);
        if (esDepredador) {
            this.dibujarAletaDorsal(pez);
            this.dibujarAletasLaterales(pez);
        }
        pop();
    }

    static aplicarTransformacion(pez) {
        if (pez.speed.magSq() > 0.000001) {
            pez.direccionAnterior = pez.speed.copy();
        }
        const {x, y, z} = pez.direccionAnterior;
        const horizontal = Math.hypot(x, z);
        const giroHorizontal = createVector(x, -z).heading();
        const inclinacion = createVector(horizontal, y).heading();

        translate(pez.pos.x, pez.pos.y, pez.pos.z);
        rotateY(giroHorizontal);
        rotateZ(inclinacion);
        
        scale(pez.tamano * pez.r / 38);
        noStroke();
    }

    static dibujarCuerpo(pez) {
        ambientMaterial(pez.color);
        ellipsoid(38, 18, 14, 24, 16);
    }

    static dibujarCola(pez) {
        const frecuencia = 2.2; 
        const amplitud = 0.45; 
        const fase = (pez.tiempoCola * Math.PI * 2 * frecuencia) % (Math.PI * 2);
        push();
        translate(-34, 0, 0);
        rotateY(Math.sin(fase) * amplitud);
        ambientMaterial(pez.color);
        this.dibujarAleta([[0, 0, 0], [-30, -23, 0], [-30, 23, 0]]);
        pop();
    }

    static dibujarOjos(pez) {
        ambientMaterial(pez.color);
        for (const lado of [-1, 1]) {
            push();
            translate(23, -5, lado * 10.5);
            sphere(3.8, 10, 8);
            translate(1.1, 0, lado * 2.6);
            sphere(1.9, 8, 6);
            pop();
        }
    }

    static dibujarAletaDorsal(pez) {
        ambientMaterial(pez.color);
        this.dibujarAleta([[13, -14, 0], [-8, -43, 0], [-19, -14, 0]]);
    }

    static dibujarAletasLaterales(pez) {
        ambientMaterial(pez.color);
        this.dibujarAleta([[14, 5, 9], [-20, 10, 39], [-15, 5, 9]]);
        this.dibujarAleta([[14, 5, -9], [-15, 5, -9], [-20, 10, -39]]);
    }

    static dibujarAleta(puntos, grosor = 0.5) {
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
