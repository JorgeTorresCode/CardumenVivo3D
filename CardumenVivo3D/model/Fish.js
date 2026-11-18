class Fish extends Agent3D {
    static PROBABILIDAD_REPRODUCCION = 0.35; 

    constructor(x, y, z, especie) {
        super(x, y, z, especie.tamano * 10);

        this.especie = especie;

        this.tamano = especie.tamano;
        this.energia = especie.energiaInicial;
        this.maxSpeed = especie.velocidadBase;

        // Estados que se recalculan en cada paso de simulacion
        this.persiguiendo = false;
        this.huyendo = false;
        this.buscandoAlimento = false;

        this.esDepredador = especie.nivelTrofico >= 3.0;
        this.r = especie.radius;

        this.tiempoCola = 0;
        this.direccionAnterior = createVector(1, 0, 0);
    }

    static createRandomPos(ancho, alto, depth, especie) {
        return new Fish(
            random(-ancho / 2, ancho / 2),
            random(-alto / 2, alto / 2),
            random(-depth / 2, depth / 2),
            especie
        );
    }

    puedeComerFitoplancton() {
        return this.especie.espectroTrofico[0] <= 1.0 && this.especie.espectroTrofico[1] >= 1.0;
    }

    tieneHambre() {
        return this.energia < this.especie.umbralHambre;
    }

    reiniciarEstado() {
        this.persiguiendo = false;
        this.huyendo = false;
        this.buscandoAlimento = false;
        this.maxSpeed = this.especie.velocidadBase;
    }

    puedeCazar(otro) {
        if (otro === this || otro.isDead() || otro.especie.nombre === this.especie.nombre) {
            return false;
        }
        let [minTL, maxTL] = this.especie.espectroTrofico;
        let tlPresa = otro.especie.nivelTrofico;

        let enEspectro = tlPresa >= minTL && tlPresa <= maxTL;
        let difTrofica = this.especie.nivelTrofico - tlPresa >= 0.5;
        let proporcion = otro.tamano / this.tamano <= 0.5;

        return enEspectro && difTrofica && proporcion;
    }

    // Un solo recorrido: encuentra la amenaza y la presa mas cercanas
    percibir(peces) {
        let amenaza = null;
        let presa = null;
        let radio = this.especie.radioPercepcion;
        let distAmenaza = radio;
        let distPresa = radio;
        let buscaPresa = this.tieneHambre();

        for (let otro of peces) {
            if (otro === this || otro.isDead()) continue;

            let d = this.pos.dist(otro.pos);
            if (d >= radio) continue;

            if (d < distAmenaza && otro.puedeCazar(this)) {
                distAmenaza = d;
                amenaza = otro;
            } else if (buscaPresa && d < distPresa && this.puedeCazar(otro)) {
                distPresa = d;
                presa = otro;
            }
        }
        return { amenaza, presa };
    }

    huir(amenaza) {
        this.huyendo = true;
        this.maxSpeed = this.especie.velocidadRafaga;

        // flee con ligera dispersión individual para evitar que se apilen al escapar
        let deseada = p5.Vector.sub(this.pos, amenaza.pos);
        deseada.setMag(this.maxSpeed);
        deseada.add(p5.Vector.random3D().mult(this.maxSpeed * 0.25));

        let steering = p5.Vector.sub(deseada, this.speed);
        steering.limit(this.maxSteeringForce * 3);
        this.addForce(steering);
    }

    cazar(presa) {
        this.persiguiendo = true;
        this.maxSpeed = this.especie.velocidadRafaga;

        if (this.pos.dist(presa.pos) <= this.r + presa.r) {
            let energiaGanada = presa.energia * this.especie.eficienciaAsimilacion;
            this.energia = Math.min(this.especie.energiaMaxima, this.energia + energiaGanada);
            presa.energia = 0; // la elimina el isDead() de FishSystem3D.update()
        } else {
            // seek con la fuerza de giro reforzada
            let deseada = p5.Vector.sub(presa.pos, this.pos);
            deseada.setMag(this.maxSpeed);
            let steering = p5.Vector.sub(deseada, this.speed);
            steering.limit(this.maxSteeringForce * 3);
            this.addForce(steering);
        }
    }

    buscarYComerFitoplancton(productores) {
        if (!this.puedeComerFitoplancton() || !this.tieneHambre()) {
            return null;
        }

        let fitoMasCercano = null;
        let distMinima = this.especie.radioPercepcion;

        for (const fito of productores) {
            const distancia = this.pos.dist(fito.pos);
            if (distancia < distMinima) {
                distMinima = distancia;
                fitoMasCercano = fito;
            }
        }

        if (fitoMasCercano !== null) {
            this.buscandoAlimento = true;
            let radioContacto = this.r + fitoMasCercano.r;

            if (distMinima <= radioContacto) {
                let energiaGanada = fitoMasCercano.energia * this.especie.eficienciaAsimilacion;
                this.energia = Math.min(this.especie.energiaMaxima, this.energia + energiaGanada);
                return fitoMasCercano;
            } else {
                let offset = p5.Vector.random3D().mult(fitoMasCercano.r * 0.8);
                this.seek(p5.Vector.add(fitoMasCercano.pos, offset));
            }
        }

        return null;
    }

    puedeReproducirse() {
        return !this.isDead() && !this.huyendo && this.energia >= this.especie.umbralReproduccion;
    }

    intentarReproducirse(companerosEspecie) {
        if (!this.puedeReproducirse()) {
            return null;
        }

        let dt = Math.min(Math.max(0, deltaTime / 1000), 0.1);
        let probFrame = Fish.PROBABILIDAD_REPRODUCCION * dt;
        let costoPorPadre = this.especie.energiaInicial * 0.5;

        for (let otro of companerosEspecie) {
            if (otro === this || !otro.puedeReproducirse()) {
                continue;
            }

            let radioEncuentro = (this.r + otro.r) * 2.5;
            if (this.pos.dist(otro.pos) <= radioEncuentro) {
                if (random() >= probFrame) {
                    continue;
                }

                this.energia -= costoPorPadre;
                otro.energia -= costoPorPadre;

                let puntoMedio = p5.Vector.add(this.pos, otro.pos).mult(0.5);
                puntoMedio.add(p5.Vector.random3D().mult(this.r));

                let cria = new Fish(puntoMedio.x, puntoMedio.y, puntoMedio.z, this.especie);
                cria.speed = p5.Vector.add(this.speed, otro.speed).mult(0.5);

                return cria;
            }
        }

        return null;
    }

    actualizarEnergia(dt) {
        let gastoBasal = this.especie.costoMetabolicoBase * dt;
        let gastoMovimiento = this.especie.costoLocomocion * this.speed.magSq() * dt;

        // dE/dt = Ingesta - C_metabolico - C_locomocion
        this.energia -= (gastoBasal + gastoMovimiento);
    }

    isDead() {
        return this.energia <= 0;
    }

    update(ancho, alto, profundidad, dt) {
        super.update(ancho, alto, profundidad);
        this.actualizarEnergia(dt);

        this.tiempoCola += dt;
        if (this.speed.magSq() > 0.000001) {
            this.direccionAnterior.set(this.speed).normalize();
        }
    }

    display() {
        FishDrawer.display(this.esDepredador, this);
    }
}
