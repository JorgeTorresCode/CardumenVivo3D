class FishSystem3D {
    constructor(depth, ancho, alto) {
        this.agents = [];
        this.fitoplancton = [];
        this.catalogoEspecies = [];

        this.depth = depth;
        this.ancho = ancho;
        this.alto = alto;

        this.densidadMaxima = 0.05; 
        this.ratioAparicion = 0.5; 
        this.tasaBaseRegeneracion = 0.05; 
        this.minEnergiaFito = 1;
        this.maxEnergiaFito = 10;

        this.acumuladorFitoplancton = 0;
        this.inicializarFitoplancton();
    }

    cargarJSON(datosJSON) {
        if (!datosJSON || !Array.isArray(datosJSON.especies)) {
            return;
        }
        for (let especie of datosJSON.especies) {
            this.registrarEspecie(especie);
        }
    }

    registrarEspecie(especie) {
        this.catalogoEspecies.push(especie);
        let cantidad = especie.cantidadInicial ?? 0;

        if (cantidad > 0) {
            if (especie.enMinibanco) {
                this.addMinibanco(cantidad, especie);
            } else {
                this.addRandomAgents(cantidad, especie);
            }
        }
    }


    configurarFitoplancton(densidadMaxima, ratioAparicion, tasaBase, minEnergia = 1, maxEnergia = 10) {
        this.densidadMaxima = densidadMaxima;
        this.ratioAparicion = constrain(ratioAparicion, 0, 1);
        this.tasaBaseRegeneracion = tasaBase;
        this.minEnergiaFito = minEnergia;
        this.maxEnergiaFito = maxEnergia;
        this.inicializarFitoplancton();
    }

    getCapacidadCarga() {
        let volumenBloques = (this.ancho * this.alto * this.depth) / 1e6;
        return Math.max(0, Math.floor(volumenBloques * this.densidadMaxima));
    }

    inicializarFitoplancton() {
        this.fitoplancton = [];
        this.acumuladorFitoplancton = 0;

        let K = this.getCapacidadCarga();
        let ratio = constrain(this.ratioAparicion, 0, 1);
        let cantidadInicial = Math.floor(K * ratio * 0.5);

        for (let i = 0; i < cantidadInicial; i++) {
            this.agregarFitoplanctonAleatorio();
        }
    }

    agregarFitoplanctonAleatorio() {
        let fito = Fitoplancton.createRandom(
            this.ancho,
            this.alto,
            this.depth,
            this.minEnergiaFito,
            this.maxEnergiaFito
        );
        this.fitoplancton.push(fito);
    }

    eliminarFitoplancton(fito) {
        let indice = this.fitoplancton.indexOf(fito);
        if (indice !== -1) {
            this.fitoplancton.splice(indice, 1);
        }
    }

    regenerarFitoplancton() {
        let K = this.getCapacidadCarga();
        let N = this.fitoplancton.length;
        let ratio = constrain(this.ratioAparicion, 0, 1);

        if (N >= K || ratio <= 0) {
            return;
        }

        let dt = Math.min(Math.max(0, deltaTime / 1000), 0.1);

        // dN/dt = r_base * ratio * (K - N)
        let dN = this.tasaBaseRegeneracion * ratio * (K - N) * dt;
        this.acumuladorFitoplancton += dN;

        let nuevos = Math.floor(this.acumuladorFitoplancton);
        if (nuevos > 0) {
            let cantidadCrear = Math.min(nuevos, K - N);
            for (let i = 0; i < cantidadCrear; i++) {
                this.agregarFitoplanctonAleatorio();
            }
            this.acumuladorFitoplancton -= nuevos;
        }
    }


    cohere() {
        for (let a of this.agents) {
            let mismaEspecie = this.agents.filter(otro => otro.especie === a.especie);
            a.cohere(mismaEspecie);
        }
    }

    align() {
        for (let a of this.agents) {
            let mismaEspecie = this.agents.filter(otro => otro.especie === a.especie);
            a.align(mismaEspecie);
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
        this.regenerarFitoplancton();
        for (let f of this.fitoplancton) {
            f.display();
        }

        for (let i = this.agents.length - 1; i >= 0; i--) {
            let a = this.agents[i];

            if (a.isDead()) {
                this.agents.splice(i, 1);
                continue;
            }

            let fitoConsumido = a.buscarYComerFitoplancton(this.fitoplancton);
            if (fitoConsumido !== null) {
                this.eliminarFitoplancton(fitoConsumido);
            }

            a.update(this.ancho, this.alto, this.depth);
            a.display();
        }
    }


    addRandomAgents(count, especie) {
        for (let i = 0; i < count; i++) {
            let agent = Fish.createRandomPos(
                this.ancho,
                this.alto,
                this.depth,
                especie
            );
            agent.speed = p5.Vector.random3D();
            agent.speed.mult(random(1, agent.maxSpeed));
            this.agents.push(agent);
        }
    }

    addMinibanco(count, especie) {
        let dispersionX = Math.min(30, this.ancho / 4);
        let dispersionY = Math.min(30, this.alto / 4);
        let dispersionZ = Math.min(30, this.depth / 4);
        let margenX = Math.min(150, this.ancho / 2 - dispersionX);
        let margenY = Math.min(100, this.alto / 2 - dispersionY);
        let margenZ = Math.min(150, this.depth / 2 - dispersionZ);
        let centroX = random(-margenX, margenX);
        let centroY = random(-margenY, margenY);
        let centroZ = random(-margenZ, margenZ);

        let velocidadBase = p5.Vector.random3D();
        velocidadBase.mult(2);

        for (let i = 0; i < count; i++) {
            let x = centroX + random(-dispersionX, dispersionX);
            let y = centroY + random(-dispersionY, dispersionY);
            let z = centroZ + random(-dispersionZ, dispersionZ);

            let pez = new Fish(x, y, z, especie);
            pez.speed = velocidadBase.copy().add(p5.Vector.random3D().mult(0.5));
            this.agents.push(pez);
        }
    }
}