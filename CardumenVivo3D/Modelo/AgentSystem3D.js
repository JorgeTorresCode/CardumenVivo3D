class AgentSystem3D {
    // Se conserva depth como primer argumento para las llamadas existentes.
    constructor(depth = 1200, ancho = 1200, alto = 700) {
        this.agents = [];
        this.depth = depth;
        this.ancho = ancho;
        this.alto = alto;
    }

    cohere() {
        for (let a of this.agents) {
            a.cohere(this.agents);
        }
    }

    align() {
        for (let a of this.agents) {
            a.align(this.agents);
        }
    }

    separate() {
        for (let a of this.agents) {
            a.separate(this.agents);
        }
    }

    wander() {
        for (let a of this.agents) {
            a.wander();
        }
    }

    update() {
        const dimensiones = {
            ancho: this.ancho,
            alto: this.alto,
            profundidad: this.depth,
        };
        for (let i = this.agents.length - 1; i >= 0; i--) {
            let a = this.agents[i];
            
            if (a.isDead()) {
                this.agents.splice(i, 1);
                continue;
            }

            a.update(dimensiones);
            a.display();
        }
    }

    addRandomAgents(count, mass = 15, opcionesPez = {}) {
        for (let i = 0; i < count; i++) {
            let agent = Pez.createRandomPos(
                mass,
                this.ancho,
                this.alto,
                this.depth,
                opcionesPez
            );
            agent.speed = p5.Vector.random3D();
            agent.speed.mult(random(1, agent.maxSpeed));
            this.agents.push(agent);
        }
    }

    addMinibanco(count, mass = 15, opcionesPez = {}) {
        // Ajustar el grupo a acuarios menores sin generar centros fuera del volumen.
        const dispersionX = Math.min(30, this.ancho / 4);
        const dispersionY = Math.min(30, this.alto / 4);
        const dispersionZ = Math.min(30, this.depth / 4);
        const margenX = Math.min(150, this.ancho / 2 - dispersionX);
        const margenY = Math.min(100, this.alto / 2 - dispersionY);
        const margenZ = Math.min(150, this.depth / 2 - dispersionZ);
        let centroX = random(-margenX, margenX);
        let centroY = random(-margenY, margenY);
        let centroZ = random(-margenZ, margenZ);
        
        let velocidadBase = p5.Vector.random3D();
        velocidadBase.mult(2);

        for (let i = 0; i < count; i++) {
            let x = centroX + random(-dispersionX, dispersionX);
            let y = centroY + random(-dispersionY, dispersionY);
            let z = centroZ + random(-dispersionZ, dispersionZ);

            let pez = new Pez(x, y, z, mass, this.depth, {
                ...opcionesPez
            });
            
            pez.speed = velocidadBase.copy().add(p5.Vector.random3D().mult(0.5));
            this.agents.push(pez);
        }
    }
}
