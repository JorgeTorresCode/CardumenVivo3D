class FishDrawer {
    static inicializarGeometrias() {
        if (this.aletas) return;

        const formas = {
            cola: [[0, 0, 0], [-30, -23, 0], [-30, 23, 0]],
            dorsal: [[13, -14, 0], [-8, -43, 0], [-19, -14, 0]],
            lateralIzquierda: [[14, 5, 9], [-20, 10, 39], [-15, 5, 9]],
            lateralDerecha: [[14, 5, -9], [-15, 5, -9], [-20, 10, -39]],
        };

        this.aletas = {};
        push();
        noStroke();
        for (const [nombre, puntos] of Object.entries(formas)) {
            const geometria = buildGeometry(() => this.dibujarAleta(puntos, 0.5));
            // El color se aplica al dibujar cada pez, no queda fijado en la malla.
            geometria.clearColors();
            this.aletas[nombre] = geometria;
        }
        pop();
    }
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
        
        scale(pez.r / 38);
        noStroke();
    }
    static dibujarCuerpo(pez) {
        ambientMaterial(pez.especie.color);
        ellipsoid(38, 18, 14, 24, 16);
    }
    static dibujarCola(pez) {
        const frecuencia = 2.2; 
        const amplitud = 0.45; 
        const fase = (pez.tiempoCola * Math.PI * 2 * frecuencia) % (Math.PI * 2);
        push();
        translate(-34, 0, 0);
        rotateY(Math.sin(fase) * amplitud);
        ambientMaterial(pez.especie.color);
        model(this.aletas.cola);
        pop();
    }
    static dibujarOjos(pez) {
        ambientMaterial(pez.especie.color);
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
        ambientMaterial(pez.especie.color);
        model(this.aletas.dorsal);
    }
    static dibujarAletasLaterales(pez) {
        ambientMaterial(pez.especie.color);
        model(this.aletas.lateralIzquierda);
        model(this.aletas.lateralDerecha);
    }
    static dibujarAleta(puntos, grosor) {
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
