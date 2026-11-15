class FishSystem3D {
    // Se conserva depth como primer argumento para las llamadas existentes.
    constructor(depth, ancho, alto) {
        this.agents = [];
        this.fitoplancton = [];

        this.depth = depth;
        this.ancho = ancho;
        this.alto = alto;

        // Parámetros por defecto del modelo matemático de fitoplancton
        this.densidadMaxima = 0.05; // esferas por cada 10^6 
        this.ratioAparicion = 0.5; // 0.0 a 1.0
        this.tasaBaseRegeneracion = 0.05; // velocidad base (1/s)
        this.minEnergiaFito = 1;
        this.maxEnergiaFito = 10;

        this.acumuladorFitoplancton = 0;
        this.inicializarFitoplancton();
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
        let volumenBloques = (this.ancho * this.alto * this.depth) / 1e6; //Se divide entre 1e6 para obtener el volumen en bloques, cada bloque es de 100^3 de volumen
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

    regenerarFitoplancton() {
        let K = this.getCapacidadCarga();
        let N = this.fitoplancton.length;
        let ratio = constrain(this.ratioAparicion, 0, 1);

        if (N >= K || ratio <= 0) {
            return;
        }

        let dt = Math.min(Math.max(0, deltaTime / 1000), 0.1);

        // dN/dt = r_base * ratio * (K - N)
        //Donde N  = poblacion actual, K = capacidad de carga, r_base = tasa base de regeneracion, (K - N) = espacio disponible
        //dt = delta time, tiempo transcurrido desde el ultimo frame
        
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

            a.update(this.ancho, this.alto, this.depth);
            a.display();
        }
    }

    addRandomAgents(count, mass, esDepredador, tamano) {
        for (let i = 0; i < count; i++) {
            let agent = Fish.createRandomPos(
                mass,
                this.ancho,
                this.alto,
                this.depth,
                esDepredador,
                tamano
            );
            agent.speed = p5.Vector.random3D();
            agent.speed.mult(random(1, agent.maxSpeed));
            this.agents.push(agent);
        }
    }

    addMinibanco(count, mass, esDepredador, tamano) {
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

            let pez = new Fish(x, y, z, mass, esDepredador, tamano);
            
            pez.speed = velocidadBase.copy().add(p5.Vector.random3D().mult(0.5));
            this.agents.push(pez);
        }
    }
}