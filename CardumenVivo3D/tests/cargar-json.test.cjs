// Ejecutar: node --test tests/cargar-json.test.cjs
// Usa el mismo Ajv del CDN de index.html. AJV_BUNDLE_PATH permite una copia local.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const raiz = path.resolve(__dirname, "..");
const leer = archivo => fs.readFileSync(path.join(raiz, archivo), "utf8");
const esquema = JSON.parse(leer("data/species.schema.json"));
const datos = JSON.parse(leer("data/species.json"));
const ejemplo = datos.especies[0];
const contexto = vm.createContext({ console });
let FishSystem3D;

test.before(async () => {
    let bundle;
    if (process.env.AJV_BUNDLE_PATH) {
        bundle = fs.readFileSync(process.env.AJV_BUNDLE_PATH, "utf8");
    } else {
        const url = leer("index.html").match(/src="([^"]*\/ajv2020\.bundle\.js)"/)[1];
        const respuesta = await fetch(url, { signal: AbortSignal.timeout(15000) });
        assert.equal(respuesta.ok, true, `No se pudo descargar Ajv: HTTP ${respuesta.status}`);
        bundle = await respuesta.text();
    }
    // Se ejecuta la biblioteca real, sin sustituir Ajv ni escribir otro validador.
    vm.runInContext(bundle, contexto);
    FishSystem3D = vm.runInContext(`${leer("model/FishSystem3D.js")}\nFishSystem3D;`, contexto);
});

function crearSistema() {
    const mensajes = [];
    contexto.console = { log: (...argumentos) => mensajes.push(argumentos) };
    // Aisla la carga del constructor de la simulacion, que depende de p5.
    const sistema = Object.create(FishSystem3D.prototype);
    sistema.catalogoEspecies = [];
    return { sistema, mensajes };
}

function cargar(especies, reglas = esquema) {
    const resultado = crearSistema();
    resultado.sistema.cargarJSON({ especies }, reglas);
    return resultado;
}

function rechazar(especie, reglaEsperada) {
    const { sistema, mensajes } = cargar([especie, ejemplo]);
    assert.deepEqual(sistema.catalogoEspecies, [ejemplo], "Debe omitir la invalida y cargar la siguiente");
    assert.equal(mensajes.length, 1);
    const errores = mensajes[0][3];
    assert.ok(Array.isArray(errores) && errores.length > 0);
    if (reglaEsperada) {
        assert.equal(errores[0].keyword, reglaEsperada);
    }
}

test("carga todas las especies del archivo de ejemplo sin descartes", () => {
    const { sistema, mensajes } = cargar(datos.especies);
    assert.deepEqual(sistema.catalogoEspecies, datos.especies);
    assert.equal(mensajes.length, 0);
});

for (const campo of esquema.required) {
    test(`descarta si falta el campo obligatorio ${campo}`, () => {
        const incompleta = { ...ejemplo };
        delete incompleta[campo];
        rechazar(incompleta, "required");
    });
}

for (const [campo, definicion] of Object.entries(esquema.properties)) {
    const tiposIncorrectos = definicion.type === "number"
        ? ["15", null, true, [], {}]
        : definicion.type === "string"
            ? [15, null, true, [], {}]
            : [15, null, true, "[1, 2]", {}];
    for (const [indice, valor] of tiposIncorrectos.entries()) {
        test(`descarta el tipo incorrecto ${indice + 1} en ${campo}`, () => {
            rechazar({ ...ejemplo, [campo]: valor }, "type");
        });
    }

    if (definicion.type !== "number") continue;
    test(`acepta decimales validos en ${campo}`, () => {
        const especie = { ...ejemplo, [campo]: 0.5 };
        assert.deepEqual(cargar([especie]).sistema.catalogoEspecies, [especie]);
    });
    test(`descarta negativos en ${campo}`, () => {
        rechazar({ ...ejemplo, [campo]: -1 });
    });
    for (const valor of [NaN, Infinity, -Infinity]) {
        test(`descarta ${valor} en ${campo}`, () => {
            rechazar({ ...ejemplo, [campo]: valor }, "type");
        });
    }
    test(`respeta el limite de cero en ${campo}`, () => {
        const especie = { ...ejemplo, [campo]: 0 };
        if (definicion.exclusiveMinimum === 0) {
            rechazar(especie, "exclusiveMinimum");
        } else {
            assert.deepEqual(cargar([especie]).sistema.catalogoEspecies, [especie]);
        }
    });
}

for (const nombre of ["", " ", "\t\n"]) {
    test(`descarta nombre vacio o en blanco ${JSON.stringify(nombre)}`, () => {
        rechazar({ ...ejemplo, nombre });
    });
}

test("acepta nombres con caracteres Unicode", () => {
    const especie = { ...ejemplo, nombre: "Sardina del Pacífico" };
    assert.deepEqual(cargar([especie]).sistema.catalogoEspecies, [especie]);
});

for (const color of [[], [0, 1], [0, 1, 2, 3], [-1, 0, 0], [0, 0, 256],
    [0, 0.5, 0], [0, "1", 0], [0, null, 0], [0, NaN, 0]]) {
    test(`descarta color invalido ${JSON.stringify(color)}`, () => {
        rechazar({ ...ejemplo, color });
    });
}

for (const color of [[0, 0, 0], [255, 255, 255]]) {
    test(`acepta los limites RGB ${JSON.stringify(color)}`, () => {
        const especie = { ...ejemplo, color };
        assert.deepEqual(cargar([especie]).sistema.catalogoEspecies, [especie]);
    });
}

for (const espectroTrofico of [[], [1], [1, 2, 3], ["1", 2], [1, "2"],
    [null, 2], [1, null], [-1, 2], [1, -2], [Infinity, 2]]) {
    test(`descarta espectroTrofico invalido ${JSON.stringify(espectroTrofico)}`, () => {
        rechazar({ ...ejemplo, espectroTrofico });
    });
}

test("acepta un espectro de dos numeros iguales y decimales", () => {
    const especie = { ...ejemplo, espectroTrofico: [1.5, 1.5] };
    assert.deepEqual(cargar([especie]).sistema.catalogoEspecies, [especie]);
});

test("acepta eficienciaAsimilacion igual a uno", () => {
    const especie = { ...ejemplo, eficienciaAsimilacion: 1 };
    assert.deepEqual(cargar([especie]).sistema.catalogoEspecies, [especie]);
});

test("descarta eficienciaAsimilacion mayor que uno", () => {
    rechazar({ ...ejemplo, eficienciaAsimilacion: 1.001 }, "maximum");
});

test("descarta propiedades de especie no declaradas en el esquema", () => {
    rechazar({ ...ejemplo, atributoDesconocido: 123 }, "additionalProperties");
});

test("descarta propiedades especiales recibidas desde JSON", () => {
    const especie = JSON.parse(JSON.stringify(ejemplo).replace(/}$/, ', "__proto__": {"radius": 15}}'));
    rechazar(especie, "additionalProperties");
});

for (const especie of [null, [], "pez", 15, true, false, {}]) {
    test(`descarta registros malformados ${JSON.stringify(especie)}`, () => rechazar(especie));
}

test("un catalogo mixto conserva solo las validas y mantiene su orden", () => {
    const otra = { ...ejemplo, nombre: "Otra especie valida" };
    const { sistema, mensajes } = cargar([null, ejemplo, {}, { ...ejemplo, radius: "15" }, otra, false]);
    assert.deepEqual(sistema.catalogoEspecies, [ejemplo, otra]);
    assert.equal(mensajes.length, 4);
});

test("si todas las especies son invalidas el catalogo queda vacio", () => {
    const { sistema, mensajes } = cargar([null, {}, { ...ejemplo, radius: "15" }]);
    assert.deepEqual(sistema.catalogoEspecies, []);
    assert.equal(mensajes.length, 3);
});

test("no convierte, completa ni modifica los registros de entrada", () => {
    const especies = [{ ...ejemplo, radius: "15" }, { ...ejemplo }];
    const original = structuredClone(especies);
    cargar(especies);
    assert.deepEqual(especies, original);
});

test("el log identifica la propiedad y el motivo del descarte", () => {
    const { mensajes } = cargar([{ ...ejemplo, radius: "15" }]);
    assert.equal(mensajes[0][1], ejemplo.nombre);
    assert.equal(mensajes[0][3][0].instancePath, "/radius");
    assert.equal(mensajes[0][3][0].message, "must be number");
});

test("el log tolera especies sin nombre", () => {
    const { mensajes } = cargar([null]);
    assert.equal(mensajes[0][1], "(sin nombre)");
});

test("cambiar un limite del esquema cambia la admision sin modificar JavaScript", () => {
    const modificado = structuredClone(esquema);
    modificado.properties.radius.minimum = ejemplo.radius + 1;
    assert.equal(cargar([ejemplo], modificado).sistema.catalogoEspecies.length, 0);
    modificado.properties.radius.minimum = ejemplo.radius;
    assert.equal(cargar([ejemplo], modificado).sistema.catalogoEspecies.length, 1);
});

test("un campo nuevo se exige y valida solamente al agregarlo al esquema", () => {
    const modificado = structuredClone(esquema);
    modificado.properties.habitat = { type: "string", enum: ["pelagico"] };
    modificado.required.push("habitat");
    assert.equal(cargar([ejemplo], modificado).sistema.catalogoEspecies.length, 0);
    assert.equal(cargar([{ ...ejemplo, habitat: 1 }], modificado).sistema.catalogoEspecies.length, 0);
    assert.equal(cargar([{ ...ejemplo, habitat: "bentonico" }], modificado).sistema.catalogoEspecies.length, 0);
    assert.equal(cargar([{ ...ejemplo, habitat: "pelagico" }], modificado).sistema.catalogoEspecies.length, 1);
});

test("el esquema puede prohibir propiedades adicionales o permitirlas", () => {
    const modificado = structuredClone(esquema);
    modificado.additionalProperties = true;
    const especie = { ...ejemplo, atributoDesconocido: 1 };
    assert.deepEqual(cargar([especie], modificado).sistema.catalogoEspecies, [especie]);
});

test("rechaza un esquema invalido antes de incorporar registros", () => {
    const { sistema } = crearSistema();
    assert.throws(() => sistema.cargarJSON(datos, { type: "tipoInexistente" }));
    assert.deepEqual(sistema.catalogoEspecies, []);
});

test("ignora entradas sin un arreglo especies y acepta el arreglo vacio", () => {
    const { sistema } = crearSistema();
    for (const documento of [undefined, null, 1, "json", [], {}, { especies: {} }, { especies: null }, { especies: [] }]) {
        sistema.cargarJSON(documento, esquema);
    }
    assert.deepEqual(sistema.catalogoEspecies, []);
});

// Limites actuales del contrato: estas relaciones no aparecen en el esquema.
test("el esquema actual permite energiaInicial mayor que energiaMaxima", () => {
    const especie = { ...ejemplo, energiaInicial: ejemplo.energiaMaxima + 1 };
    assert.deepEqual(cargar([especie]).sistema.catalogoEspecies, [especie]);
});

test("el esquema actual permite velocidadRafaga menor que velocidadBase", () => {
    const especie = { ...ejemplo, velocidadRafaga: ejemplo.velocidadBase / 2 };
    assert.deepEqual(cargar([especie]).sistema.catalogoEspecies, [especie]);
});

test("el esquema actual permite un espectroTrofico invertido", () => {
    const especie = { ...ejemplo, espectroTrofico: [2, 1] };
    assert.deepEqual(cargar([especie]).sistema.catalogoEspecies, [especie]);
});
