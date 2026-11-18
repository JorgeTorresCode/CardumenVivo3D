// Configuracion inicial de la simulacion: caja, fitoplancton, especies y poblacion.
// index.html la edita y la guarda en localStorage; sketch.js la lee al arrancar.
// No depende de p5, asi que se puede usar en la pagina de configuracion y en pruebas.
class Configuracion {
    static CLAVE = "cardumenVivo3D.configuracion";
    static VERSION = 1;

    static LIMITES = {
        dimensionMin: 400,      // Agent3D.borders empuja a 150 de cada pared
        dimensionMax: 10000,
        fitoplanctonAviso: 3000,
        pecesAviso: 1500,
        bancosMax: 100,
        individuosPorBancoMax: 1000
    };

    // Poblacion que recibe una especie nueva creada desde la pagina
    static POBLACION_NUEVA = { bancos: 1, individuosPorBanco: 10 };

    static clonar(objeto) {
        return JSON.parse(JSON.stringify(objeto));
    }

    // Los catálogos anteriores guardaban el radio que Fish ahora calcula desde tamano.
    static migrarEspecie(especie) {
        if (!especie || !Object.hasOwn(especie, "radius")) return especie;
        const { radius, ...actual } = especie;
        return actual;
    }

    static crear(sistema, especies, poblacion = {}) {
        const config = {
            version: Configuracion.VERSION,
            sistema: Configuracion.clonar(sistema),
            especies: Configuracion.clonar(especies.map(Configuracion.migrarEspecie)),
            poblacion: Configuracion.clonar(poblacion)
        };
        Configuracion.completarPoblacion(config);
        return config;
    }

    // Toda especie tiene entrada de poblacion y no quedan entradas de especies borradas
    static completarPoblacion(config) {
        const poblacion = {};
        for (let especie of config.especies) {
            const actual = config.poblacion[especie.nombre];
            poblacion[especie.nombre] = actual
                ? { bancos: actual.bancos, individuosPorBanco: actual.individuosPorBanco }
                : { bancos: 0, individuosPorBanco: 0 };
        }
        config.poblacion = poblacion;
        return config;
    }

    // ---------- Carga y guardado ----------

    static async cargar(fetchFn = fetch, storage = Configuracion.storagePorDefecto()) {
        const guardada = Configuracion.leerGuardada(storage);
        if (guardada) {
            return { config: guardada, origen: "guardada" };
        }
        return { config: await Configuracion.cargarArchivos(fetchFn), origen: "archivos" };
    }

    static async cargarArchivos(fetchFn = fetch) {
        const [respuestaConfig, respuestaEspecies] = await Promise.all([
            fetchFn("data/config.json"),
            fetchFn("data/species.json")
        ]);
        if (!respuestaConfig.ok)
            throw new Error(`HTTP ${respuestaConfig.status} al cargar data/config.json`);
        if (!respuestaEspecies.ok)
            throw new Error(`HTTP ${respuestaEspecies.status} al cargar data/species.json`);

        const [datosConfig, datosEspecies] = await Promise.all([
            respuestaConfig.json(),
            respuestaEspecies.json()
        ]);
        return Configuracion.crear(
            datosConfig.sistema,
            datosEspecies.especies ?? [],
            datosConfig.poblacion ?? {}
        );
    }

    static storagePorDefecto() {
        try {
            return typeof localStorage !== "undefined" ? localStorage : null;
        } catch (error) {
            return null;
        }
    }

    static leerGuardada(storage = Configuracion.storagePorDefecto()) {
        if (!storage) return null;
        try {
            const texto = storage.getItem(Configuracion.CLAVE);
            if (!texto) return null;
            const config = JSON.parse(texto);
            if (config?.version !== Configuracion.VERSION || !config.sistema || !Array.isArray(config.especies)) {
                return null;
            }
            config.especies = config.especies.map(Configuracion.migrarEspecie);
            config.poblacion = config.poblacion ?? {};
            return Configuracion.completarPoblacion(config);
        } catch (error) {
            return null;
        }
    }

    static guardar(config, storage = Configuracion.storagePorDefecto()) {
        if (!storage) return false;
        try {
            storage.setItem(Configuracion.CLAVE, JSON.stringify(config));
            return true;
        } catch (error) {
            return false;
        }
    }

    static borrar(storage = Configuracion.storagePorDefecto()) {
        if (!storage) return;
        try {
            storage.removeItem(Configuracion.CLAVE);
        } catch (error) {
            // sin almacenamiento disponible: no hay nada que borrar
        }
    }

    // ---------- Calculos derivados ----------

    // Mismo calculo que FishSystem3D.getCapacidadCarga
    static capacidadCarga(sistema) {
        const { ancho, alto, profundidad } = sistema.caja;
        const volumenBloques = (ancho * alto * profundidad) / 1e6;
        return Math.max(0, Math.floor(volumenBloques * sistema.fitoplancton.densidadMaxima));
    }

    // Mismo calculo que FishSystem3D.inicializarFitoplancton
    static fitoplanctonInicial(sistema) {
        const ratio = Math.min(Math.max(sistema.fitoplancton.ratioAparicionPorcentaje / 100, 0), 1);
        return Math.floor(Configuracion.capacidadCarga(sistema) * ratio * 0.5);
    }

    static pecesDeEspecie(config, nombre) {
        const p = config.poblacion[nombre];
        return p ? p.bancos * p.individuosPorBanco : 0;
    }

    static totalPeces(config) {
        return config.especies.reduce((total, e) => total + Configuracion.pecesDeEspecie(config, e.nombre), 0);
    }

    // ---------- Validaciones ----------

    static esNumero(valor) {
        return typeof valor === "number" && Number.isFinite(valor);
    }

    static validarSistema(sistema) {
        const errores = {};
        const L = Configuracion.LIMITES;
        const caja = sistema?.caja ?? {};
        const fito = sistema?.fitoplancton ?? {};

        for (let campo of ["ancho", "alto", "profundidad"]) {
            const v = caja[campo];
            if (!Configuracion.esNumero(v)) errores[`caja.${campo}`] = "Ingrese un numero.";
            else if (v < L.dimensionMin || v > L.dimensionMax)
                errores[`caja.${campo}`] = `Debe estar entre ${L.dimensionMin} y ${L.dimensionMax}.`;
        }

        const noNegativo = (campo, nombre) => {
            const v = fito[campo];
            if (!Configuracion.esNumero(v)) errores[`fitoplancton.${campo}`] = "Ingrese un numero.";
            else if (v < 0) errores[`fitoplancton.${campo}`] = `${nombre} no puede ser negativo.`;
        };
        noNegativo("densidadMaxima", "La densidad");
        noNegativo("tasaBase", "La tasa");

        const ratio = fito.ratioAparicionPorcentaje;
        if (!Configuracion.esNumero(ratio)) errores["fitoplancton.ratioAparicionPorcentaje"] = "Ingrese un numero.";
        else if (ratio < 0 || ratio > 100) errores["fitoplancton.ratioAparicionPorcentaje"] = "Debe estar entre 0 y 100 %.";

        const min = fito.minEnergia;
        const max = fito.maxEnergia;
        if (!Configuracion.esNumero(min)) errores["fitoplancton.minEnergia"] = "Ingrese un numero.";
        else if (min <= 0) errores["fitoplancton.minEnergia"] = "Debe ser mayor que 0.";
        if (!Configuracion.esNumero(max)) errores["fitoplancton.maxEnergia"] = "Ingrese un numero.";
        else if (Configuracion.esNumero(min) && max < min)
            errores["fitoplancton.maxEnergia"] = "Debe ser mayor o igual que la energia minima.";

        return errores;
    }

    static validarPoblacion(entrada) {
        const errores = {};
        const L = Configuracion.LIMITES;
        const revisar = (campo, maximo) => {
            const v = entrada?.[campo];
            if (!Number.isInteger(v) || v < 0) errores[campo] = "Entero mayor o igual a 0.";
            else if (v > maximo) errores[campo] = `Maximo ${maximo}.`;
        };
        revisar("bancos", L.bancosMax);
        revisar("individuosPorBanco", L.individuosPorBancoMax);
        return errores;
    }

    // Avisos que no bloquean el inicio
    static avisosSistema(config) {
        const avisos = [];
        const L = Configuracion.LIMITES;
        if (Object.keys(Configuracion.validarSistema(config.sistema)).length === 0) {
            const k = Configuracion.capacidadCarga(config.sistema);
            if (k === 0) avisos.push("La capacidad de carga es 0: no habra fitoplancton.");
            if (k > L.fitoplanctonAviso) avisos.push(`Capacidad de carga de ${k} fitoplancton: puede bajar los fps.`);
        }
        const total = Configuracion.totalPeces(config);
        if (total === 0) avisos.push("No se creara ningun pez.");
        if (total > L.pecesAviso) avisos.push(`${total} peces: puede bajar mucho los fps.`);
        return avisos;
    }

    // validarEsquema: funcion compilada por Ajv con species.schema.json (puede ser null)
    // nombreOriginal: nombre de la especie que se esta editando, para permitir conservarlo
    static validarEspecie(especie, validarEsquema, especies, nombreOriginal = null) {
        const errores = {};
        const agregar = (campo, mensaje) => {
            if (!errores[campo]) errores[campo] = mensaje;
        };

        if (validarEsquema && !validarEsquema(especie)) {
            for (let error of validarEsquema.errors ?? []) {
                const { campo, mensaje } = Configuracion.traducirErrorAjv(error);
                agregar(campo, mensaje);
            }
        }

        const nombre = typeof especie.nombre === "string" ? especie.nombre.trim() : "";
        if (nombre && nombre !== nombreOriginal &&
            especies.some(e => e.nombre.trim().toLowerCase() === nombre.toLowerCase())) {
            agregar("nombre", "Ya existe una especie con ese nombre.");
        }

        const n = Configuracion.esNumero;
        if (n(especie.energiaInicial) && n(especie.energiaMaxima) && especie.energiaInicial > especie.energiaMaxima)
            agregar("energiaInicial", "No puede superar la energia maxima.");
        if (n(especie.umbralHambre) && n(especie.energiaMaxima) && especie.umbralHambre > especie.energiaMaxima)
            agregar("umbralHambre", "No puede superar la energia maxima.");
        if (n(especie.umbralReproduccion) && n(especie.energiaMaxima) && especie.umbralReproduccion > especie.energiaMaxima)
            agregar("umbralReproduccion", "No puede superar la energia maxima.");
        if (n(especie.velocidadRafaga) && n(especie.velocidadBase) && especie.velocidadRafaga < especie.velocidadBase)
            agregar("velocidadRafaga", "Debe ser mayor o igual que la velocidad base.");

        const espectro = especie.espectroTrofico;
        if (Array.isArray(espectro) && n(espectro[0]) && n(espectro[1]) && espectro[0] > espectro[1])
            agregar("espectroTrofico", "El minimo no puede ser mayor que el maximo.");

        return errores;
    }

    static traducirErrorAjv(error) {
        const ruta = (error.instancePath ?? "").split("/").filter(Boolean);
        let campo = ruta[0] ?? error.params?.missingProperty ?? "nombre";
        const p = error.params ?? {};
        let mensaje;
        switch (error.keyword) {
            case "required": mensaje = "Campo obligatorio."; campo = p.missingProperty; break;
            case "type": mensaje = "Ingrese un valor valido."; break;
            case "minimum": mensaje = `Debe ser mayor o igual que ${p.limit}.`; break;
            case "maximum": mensaje = `Debe ser menor o igual que ${p.limit}.`; break;
            case "exclusiveMinimum": mensaje = `Debe ser mayor que ${p.limit}.`; break;
            case "minLength":
            case "pattern": mensaje = "No puede estar vacio."; break;
            case "not": mensaje = "\"Fitoplancton\" en nivel 1 esta reservado para el productor."; campo = "nombre"; break;
            case "additionalProperties": mensaje = `Campo no permitido: ${p.additionalProperty}.`; break;
            default: mensaje = error.message ?? "Valor invalido.";
        }
        return { campo, mensaje };
    }

    // ---------- Avisos ecologicos ----------

    // Misma regla que Fish.puedeCazar (valores hardcodeados alla: 0.5 y 0.5)
    static puedeCazar(depredador, presa) {
        if (depredador.nombre === presa.nombre) return false;
        const [minTL, maxTL] = depredador.espectroTrofico;
        const enEspectro = presa.nivelTrofico >= minTL && presa.nivelTrofico <= maxTL;
        const difTrofica = depredador.nivelTrofico - presa.nivelTrofico >= 0.5;
        const proporcion = presa.tamano / depredador.tamano <= 0.5;
        return enEspectro && difTrofica && proporcion;
    }

    static comeFitoplancton(especie) {
        return especie.espectroTrofico[0] <= 1.0 && especie.espectroTrofico[1] >= 1.0;
    }

    // Devuelve { nombre: [avisos] } para la tabla de especies
    static avisosEcologicos(especies) {
        const avisos = {};
        for (let especie of especies) {
            const lista = [];
            const presas = especies.filter(otra => Configuracion.puedeCazar(especie, otra));
            const depredadores = especies.filter(otra => Configuracion.puedeCazar(otra, especie));
            if (!Configuracion.comeFitoplancton(especie) && presas.length === 0)
                lista.push("No puede comer nada: morira de hambre.");
            if (depredadores.length > 0)
                lista.push("Presa de: " + depredadores.map(d => d.nombre).join(", "));
            if (presas.length > 0)
                lista.push("Caza a: " + presas.map(p => p.nombre).join(", "));
            avisos[especie.nombre] = lista;
        }
        return avisos;
    }

    // ---------- Importar ----------

    // Acepta un species.json ({ especies }) o un config.json ({ sistema, poblacion })
    static importar(config, datos, validarEsquema) {
        const resultado = { config: Configuracion.clonar(config), mensajes: [], descartadas: [] };
        if (!datos || typeof datos !== "object") {
            resultado.mensajes.push("El archivo no contiene un objeto JSON.");
            return resultado;
        }
        let reconocido = false;

        if (Array.isArray(datos.especies)) {
            reconocido = true;
            const aceptadas = [];
            for (const entrada of datos.especies) {
                const especie = Configuracion.migrarEspecie(entrada);
                const errores = Configuracion.validarEspecie(especie, validarEsquema, aceptadas);
                if (Object.keys(errores).length > 0) {
                    resultado.descartadas.push({ nombre: especie?.nombre ?? "(sin nombre)", errores });
                } else {
                    aceptadas.push(especie);
                }
            }
            resultado.config.especies = Configuracion.clonar(aceptadas);
            resultado.mensajes.push(`${aceptadas.length} especies importadas.`);
        }

        if (datos.sistema) {
            reconocido = true;
            const errores = Configuracion.validarSistema(datos.sistema);
            if (Object.keys(errores).length > 0) {
                resultado.mensajes.push("El sistema del archivo no es valido y no se importo.");
            } else {
                resultado.config.sistema = Configuracion.clonar(datos.sistema);
                resultado.mensajes.push("Sistema importado.");
            }
        }

        if (datos.poblacion && typeof datos.poblacion === "object") {
            reconocido = true;
            for (let [nombre, entrada] of Object.entries(datos.poblacion)) {
                if (Object.keys(Configuracion.validarPoblacion(entrada)).length === 0) {
                    resultado.config.poblacion[nombre] = Configuracion.clonar(entrada);
                }
            }
            resultado.mensajes.push("Poblacion importada.");
        }

        if (!reconocido) {
            resultado.mensajes.push("No se encontraron especies, sistema ni poblacion en el archivo.");
        }
        Configuracion.completarPoblacion(resultado.config);
        return resultado;
    }

    // Formatos de exportacion
    static exportarEspecies(config) {
        return { especies: Configuracion.clonar(config.especies) };
    }

    static exportarSistema(config) {
        return {
            sistema: Configuracion.clonar(config.sistema),
            poblacion: Configuracion.clonar(config.poblacion)
        };
    }
}

if (typeof module !== "undefined") {
    module.exports = Configuracion;
}
