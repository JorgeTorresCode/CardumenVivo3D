class FishSystem3D {
    constructor(depth, ancho, alto) {
        this.ecosystem = [new TrophicLevel(1)];
        this.catalogoEspecies = [];

        this.ancho = ancho;
        this.alto = alto;
        this.depth = depth;

        this.densidadMaxima = 0.05; 
        this.ratioAparicion = 0.5; 
        this.tasaBaseRegeneracion = 0.05; 
        this.minEnergiaFito = 1;
        this.maxEnergiaFito = 10;

        this.acumuladorFitoplancton = 0;
        this.inicializarFitoplancton();
    }

    getTrophicLevel(level) {
        let nivel = this.ecosystem.find(nivel => nivel.level === level);
        if (!nivel) {
            nivel = new TrophicLevel(level);
            this.ecosystem.push(nivel);
        }
        return nivel;
    }
    getFish() {
        return this.ecosystem.flatMap(nivel => nivel.especies)
            .flatMap(especie => especie.beings)
            .filter(ser => ser instanceof Fish);
    }
    getSpecie(level, name) {
        const nivel = this.getTrophicLevel(level);
        let especie = nivel.especies.find(especie => especie.name === name);
        if (!especie) {
            especie = new Specie(name);
            nivel.addSpecie(especie);
        }
        return especie;
    }
    getFitoplancton() {
        return this.getSpecie(1, "Fitoplancton").beings;
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
            this.getSpecie(especie.nivelTrofico, especie.nombre);
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
        this.getFitoplancton().length = 0;
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
        this.getSpecie(1, "Fitoplancton").addBeing(fito);
    }
    eliminarFitoplancton(fito, especie = this.getSpecie(1, "Fitoplancton")) {
        let indice = especie.beings.indexOf(fito);
        if (indice !== -1) {
            especie.beings.splice(indice, 1);
        }
    }
    regenerarFitoplancton() {
        let K = this.getCapacidadCarga();
        let N = this.getFitoplancton().length;
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
        for (let nivel of this.ecosystem) {
            for (let especie of nivel.especies) {
                const fish = especie.beings.filter(ser => ser instanceof Fish);
                for (let pez of fish) {
                    if (!pez.persiguiendo && !pez.huyendo) pez.cohere(fish);
                }
            }
        }
    }
    align() {
        for (let nivel of this.ecosystem) {
            for (let especie of nivel.especies) {
                const fish = especie.beings.filter(ser => ser instanceof Fish);
                for (let pez of fish) {
                    if (!pez.persiguiendo && !pez.huyendo) pez.align(fish);
                }
            }
        }
    }
    separate() {
        const fish = this.getFish();
        for (let pez of fish) {
            pez.separate(fish);
        }
    }
    wander() {
        for (let pez of this.getFish()) {
            if (!pez.persiguiendo && !pez.huyendo && !pez.buscandoAlimento) {
                pez.wander();
            }
        }
    }
    update() {
        this.regenerarFitoplancton();
        const nivelPrimario = this.getTrophicLevel(1);

        for (let especie of nivelPrimario.especies) {
            for (let fito of especie.beings) {
                fito.display();
            }
        }

        const todosLosPeces = this.getFish();

        for (let nivel of this.ecosystem) {
            for (let especie of nivel.especies) {
                const fish = especie.beings.filter(ser => ser instanceof Fish);
                for (let pez of fish) {
                    if (pez.isDead()) {
                        especie.beings.splice(especie.beings.indexOf(pez), 1);
                        continue;
                    }
                    
                    pez.reiniciarEstado();
                    let { amenaza, presa } = pez.percibir(todosLosPeces);

                    if (amenaza !== null) {
                        pez.huir(amenaza);
                    } else if (presa !== null) {
                        pez.cazar(presa);
                    } else {
                        let consumo = pez.buscarYComerFitoplancton(nivelPrimario);
                        if (consumo !== null) {
                            this.eliminarFitoplancton(consumo.fito, consumo.especie);
                        }
                    }

                    pez.update(this.ancho, this.alto, this.depth);

                    let cria = pez.intentarReproducirse(fish);
                    if (cria !== null) {
                        especie.addBeing(cria);
                    }

                    pez.display();
                }
            }
        }
    }

    addRandomFish(count, especie) {
        const grupo = this.getSpecie(especie.nivelTrofico, especie.nombre);
        for (let i = 0; i < count; i++) {
            let pez = Fish.createRandomPos(
                this.ancho,
                this.alto,
                this.depth,
                especie
            );
            pez.speed = p5.Vector.random3D();
            pez.speed.mult(random(1, pez.maxSpeed));
            grupo.addBeing(pez);
        }
    }

    addMinibanco(count, especie) {
        const grupo = this.getSpecie(especie.nivelTrofico, especie.nombre);
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
            grupo.addBeing(pez);
        }
    }
}