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
        const fitoplancton = this.getSpecie(1, "Fitoplancton");
        return this.ecosystem.flatMap(nivel => nivel.especies)
            .filter(especie => especie !== fitoplancton)
            .flatMap(especie => especie.beings);
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
    obtenerPoblaciones() {
        return this.ecosystem.flatMap(nivel => nivel.especies.map(especie => ({
            nivel: nivel.level, nombre: especie.name, cantidad: especie.beings.length
        })));
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
    eliminarFitoplancton(fito) {
        const productores = this.getFitoplancton();
        let indice = productores.indexOf(fito);
        if (indice !== -1) {
            productores.splice(indice, 1);
        }
    }
    regenerarFitoplancton(dt) {
        let K = this.getCapacidadCarga();
        let N = this.getFitoplancton().length;
        let ratio = constrain(this.ratioAparicion, 0, 1);

        if (N >= K || ratio <= 0) {
            return;
        }

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
    cohereAndAlign() {
        const fitoplancton = this.getSpecie(1, "Fitoplancton");
        for (let nivel of this.ecosystem) {
            for (let especie of nivel.especies) {
                if (especie === fitoplancton) continue;
                const fish = especie.beings.filter(pez => !pez.isDead());
                for (let pez of fish) {
                    if (!pez.persiguiendo && !pez.huyendo) {
                        pez.cohereAndAlign(fish);
                    }
                }
            }
        }
    }
    separate(fish = this.getFish()) {
        for (let pez of fish) {
            pez.separate(fish);
        }
    }
    wander(fish = this.getFish()) {
        for (let pez of fish) {
            if (!pez.persiguiendo && !pez.huyendo && !pez.buscandoAlimento) {
                pez.wander();
            }
        }
    }
    simular(dt) {
        this.update(this.getFish(), dt);
    }
    update(todosLosPeces = this.getFish(), dt = 1 / 60) {
        this.regenerarFitoplancton(dt);
        const fitoplancton = this.getSpecie(1, "Fitoplancton");

        // Resolver la conducta del paso antes de aplicar las fuerzas de cardumen.
        for (const pez of todosLosPeces) {
            if (pez.isDead()) continue;
            pez.reiniciarEstado();
            const { amenaza, presa } = pez.percibir(todosLosPeces);
            if (amenaza) {
                pez.huir(amenaza);
            } else if (presa) {
                pez.cazar(presa);
            } else {
                const consumido = pez.buscarYComerFitoplancton(fitoplancton.beings);
                if (consumido) this.eliminarFitoplancton(consumido);
            }
        }

        const vivos = todosLosPeces.filter(pez => !pez.isDead());
        this.cohereAndAlign();
        this.separate(vivos);
        this.wander(vivos);

        for (let nivel of this.ecosystem) {
            for (let especie of nivel.especies) {
                if (especie === fitoplancton) continue;
                const fish = especie.beings;
                const crias = [];
                for (const pez of fish) {
                    if (pez.isDead()) continue;
                    pez.update(this.ancho, this.alto, this.depth, dt);
                    const cria = pez.intentarReproducirse(fish);
                    if (cria) crias.push(cria);
                }
                for (let i = fish.length - 1; i >= 0; i--) {
                    if (fish[i].isDead()) fish.splice(i, 1);
                }
                for (const cria of crias) especie.addBeing(cria);
            }
        }
    }
    display() {
        for (let nivel of this.ecosystem) {
            for (let especie of nivel.especies) {
                for (let ser of especie.beings) {
                    ser.display();
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
