class Fish extends Agent3D {
    constructor(x, y, z, especie) {
        super(x, y, z, especie.tamano * 10);

        this.especie = especie;

        // Atributos cuantitativos del modelo 
        this.nivelTrofico = especie.nivelTrofico;
        this.espectroTrofico = especie.espectroTrofico; // [minTL, maxTL]
        this.tamano = especie.tamano;
        this.radioPercepcion = especie.radioPercepcion;

        this.velocidadBase = especie.velocidadBase;
        this.velocidadRafaga = especie.velocidadRafaga;
        this.maxSpeed = this.velocidadBase;

        // 
        this.energiaMaxima = especie.energiaMaxima;
        this.energia = especie.energiaInicial;
        this.umbralHambre = especie.umbralHambre;
        this.umbralReproduccion = especie.umbralReproduccion;
        this.eficienciaAsimilacion = especie.eficienciaAsimilacion;
        this.costoMetabolicoBase = especie.costoMetabolicoBase;
        this.costoLocomocion = especie.costoLocomocion;

        // Esto es para no cambiar el FishDrawer 
        this.esDepredador = this.nivelTrofico >= 3.0;
        this.r = 15 * this.tamano;

        this.color = color(...especie.color);
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
        return this.espectroTrofico[0] <= 1.0 && this.espectroTrofico[1] >= 1.0;
    }
    tieneHambre() {
        return this.energia < this.umbralHambre;
    }
    buscarYComerFitoplancton(listaFitoplancton) {
        if (!this.puedeComerFitoplancton() || !this.tieneHambre() || listaFitoplancton.length === 0) {
            return null;
        }

        let fitoMasCercano = null;
        let distMinima = this.radioPercepcion;

        for (let f of listaFitoplancton) {
            let d = this.pos.dist(f.pos);
            if (d < distMinima) {
                distMinima = d;
                fitoMasCercano = f;
            }
        }

        if (fitoMasCercano !== null) {
            let radioContacto = this.r + fitoMasCercano.r;

            if (distMinima <= radioContacto) {
                let energiaGanada = fitoMasCercano.energia * this.eficienciaAsimilacion;
                this.energia = Math.min(this.energiaMaxima, this.energia + energiaGanada);
                return fitoMasCercano; 
            } else {
                this.seek(fitoMasCercano.pos);
            }
        }

        return null;
    }
    actualizarEnergia() {
        let dt = Math.min(Math.max(0, deltaTime / 1000), 0.1);
        let gastoBasal = this.costoMetabolicoBase * dt;
        let gastoMovimiento = this.costoLocomocion * this.speed.magSq() * dt;

        // dE/dt = Ingesta - C_metabolico - C_locomocion
        this.energia -= (gastoBasal + gastoMovimiento);
    }
    isDead() {
        return this.energia <= 0;
    }
    update(ancho, alto, profundidad) {
        super.update(ancho, alto, profundidad);
        this.actualizarEnergia();

        this.tiempoCola += Math.max(0, deltaTime / 1000);
        if (this.speed.magSq() > 0.000001) {
            this.direccionAnterior.set(this.speed).normalize();
        }
    }
    display() {
        FishDrawer.display(this.esDepredador, this);
    }
}