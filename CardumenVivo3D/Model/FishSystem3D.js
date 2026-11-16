class FishSystem3D {
    constructor(depth, ancho, alto) {
        this.fish = [];
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
    cargarJSON(datosJSON, esquema) {
        if (!datosJSON || !Array.isArray(datosJSON.especies)) {
            return;
        }

        const validarEspecie = new ajv2020().compile(esquema);
        for (let especie of datosJSON.especies) {
            if (!validarEspecie(especie)) {
                console.log(
                    "Especie descartada:", especie?.nombre ?? "(sin nombre)",
                    "Motivo:", validarEspecie.errors
                );
                continue;
            }
            this.catalogoEspecies.push(especie);
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
        for (let pez of this.fish) {
            let mismaEspecie = this.fish.filter(otro => otro.especie === pez.especie);
            pez.cohere(mismaEspecie);
        }
    }
    align() {
        for (let pez of this.fish) {
            let mismaEspecie = this.fish.filter(otro => otro.especie === pez.especie);
            pez.align(mismaEspecie);
        }
    }
    separate() {
        for (let pez of this.fish) {
            pez.separate(this.fish);
        }
    }
    wander() {
        for (let pez of this.fish) {
            pez.wander();
        }
    }
    update() {
        this.regenerarFitoplancton();
        for (let f of this.fitoplancton) {
            f.display();
        }

        for (let i = this.fish.length - 1; i >= 0; i--) {
            let pez = this.fish[i];

            if (pez.isDead()) {
                this.fish.splice(i, 1);
                continue;
            }

            let fitoConsumido = pez.buscarYComerFitoplancton(this.fitoplancton);
            if (fitoConsumido !== null) {
                this.eliminarFitoplancton(fitoConsumido);
            }

            pez.update(this.ancho, this.alto, this.depth);
            pez.display();
        }
    }
    addRandomFish(count, especie) {
        for (let i = 0; i < count; i++) {
            let pez = Fish.createRandomPos(
                this.ancho,
                this.alto,
                this.depth,
                especie
            );
            pez.speed = p5.Vector.random3D();
            pez.speed.mult(random(1, pez.maxSpeed));
            this.fish.push(pez);
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
            this.fish.push(pez);
        }
    }
}
