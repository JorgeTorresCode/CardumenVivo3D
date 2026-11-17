// node --test tests/ecosystem.test.cjs
// AJV_BUNDLE_PATH permite usar una copia local del bundle del CDN de index.html.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const leer = archivo => fs.readFileSync(path.join(__dirname, "..", archivo), "utf8");
const especie = JSON.parse(leer("data/species.json")).especies[0];
const esquema = JSON.parse(leer("data/species.schema.json"));

// Solo se simula el entorno p5; se usan las clases y la validacion reales.
class Vector {
    constructor(x = 0, y = 0, z = 0) { Object.assign(this, { x, y, z }); }
    copy() { return new Vector(this.x, this.y, this.z); }
    set(v) { Object.assign(this, { x: v.x, y: v.y, z: v.z }); return this; }
    add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
    sub(v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; }
    mult(n) { this.x *= n; this.y *= n; this.z *= n; return this; }
    div(n) { return n === 0 ? this : this.mult(1 / n); }
    magSq() { return this.x ** 2 + this.y ** 2 + this.z ** 2; }
    mag() { return Math.sqrt(this.magSq()); }
    normalize() { return this.mag() ? this.div(this.mag()) : this; }
    setMag(n) { return this.normalize().mult(n); }
    limit(n) { return this.mag() > n ? this.setMag(n) : this; }
    dist(v) { return this.copy().sub(v).mag(); }
    static sub(a, b) { return a.copy().sub(b); }
    static div(a, n) { return a.copy().div(n); }
    static dist(a, b) { return a.dist(b); }
    static random3D() { return new Vector(random(-1, 1), random(-1, 1), random(-1, 1)).normalize(); }
    static fromAngles(t, p, r) { return new Vector(Math.sin(t) * Math.cos(p), Math.cos(t), Math.sin(t) * Math.sin(p)).mult(r); }
}
let semilla = 473;
function random(a = 1, b) {
    semilla = (1664525 * semilla + 1013904223) >>> 0;
    const valor = semilla / 4294967296;
    return b === undefined ? valor * a : a + (b - a) * valor;
}
const contexto = vm.createContext({
    console: { log() {} }, PI: Math.PI, deltaTime: 1000 / 60,
    createVector: (...v) => new Vector(...v), p5: { Vector }, random,
    randomGaussian: (media, sd) => random(media - sd, media + sd),
    constrain: (v, min, max) => Math.max(min, Math.min(max, v)),
    map: (v, a, b, c, d) => c + (v - a) * (d - c) / (b - a),
    noise: () => 0.5, color: (...args) => args, FishDrawer: { display() {} },
    push() {}, pop() {}, noStroke() {}, ambientMaterial() {}, translate() {}, sphere() {}
});
let TrophicLevel, Specie, FishSystem3D, Fish, Fitoplancton;
test.before(async () => {
    let bundle;
    if (process.env.AJV_BUNDLE_PATH) {
        bundle = fs.readFileSync(process.env.AJV_BUNDLE_PATH, "utf8");
    } else {
        const url = leer("index.html").match(/src="([^"]*\/ajv2020\.bundle\.js)"/)[1];
        const respuesta = await fetch(url, { signal: AbortSignal.timeout(15000) });
        assert.ok(respuesta.ok, `HTTP ${respuesta.status} al descargar Ajv`);
        bundle = await respuesta.text();
    }
    vm.runInContext(bundle, contexto);
    for (const archivo of ["structures/TrophicLevel.js", "structures/Specie.js",
        "model/Agent3D.js", "model/Fish.js", "model/Fitoplancton.js", "model/FishSystem3D.js"]) {
        vm.runInContext(leer(archivo), contexto);
    }
    ({ TrophicLevel, Specie, FishSystem3D, Fish, Fitoplancton } = vm.runInContext(
        "({ TrophicLevel, Specie, FishSystem3D, Fish, Fitoplancton })", contexto));
});

test("cada nivel contiene especies y cada especie contiene sus seres", () => {
    const nivel = new TrophicLevel(2.5);
    const grupo = new Specie(especie.nombre);
    assert.deepEqual(Object.keys(nivel).sort(), ["especies", "level"]);
    assert.deepEqual(Object.keys(grupo).sort(), ["beings", "name"]);
    const ser = {};
    grupo.addBeing(ser);
    nivel.addSpecie(grupo);
    assert.equal(nivel.especies[0].beings[0], ser);
});

test("las comparaciones usan directamente el atributo level", () => {
    const bajo = new TrophicLevel(1);
    const alto = new TrophicLevel(2.5);
    assert.ok(bajo.level < alto.level && alto.level > bajo.level);
    assert.ok(bajo.level <= 1 && alto.level >= 2.5);
    assert.equal(bajo.level, new TrophicLevel(1).level);
});

test("el constructor guarda los productores exclusivamente en ecosystem, nivel 1", () => {
    const sistema = new FishSystem3D(2400, 2400, 1200);
    assert.equal(sistema.ecosystem.length, 1);
    const nivel = sistema.ecosystem[0];
    assert.equal(nivel.level, 1);
    assert.equal(nivel.especies.length, 1);
    assert.equal(nivel.especies[0].name, "Fitoplancton");
    assert.ok(nivel.especies[0].beings.length > 0);
    assert.ok(nivel.especies[0].beings.every(ser => ser instanceof Fitoplancton));
    assert.equal("fish" in sistema, false);
    assert.equal("fitoplancton" in sistema, false);
});

test("cargarJSON registra especies en sus niveles, inicialmente sin seres", () => {
    const sistema = new FishSystem3D(100, 100, 100);
    const otra = { ...especie, nombre: "Otra especie" };
    sistema.cargarJSON({ especies: [especie, otra, { ...especie, nivelTrofico: 4 }] }, esquema);
    assert.equal(sistema.catalogoEspecies.length, 3);
    assert.equal(sistema.ecosystem.filter(nivel => nivel.level === especie.nivelTrofico).length, 1);
    assert.equal(sistema.getTrophicLevel(especie.nivelTrofico).especies.length, 2);
    assert.equal(sistema.getTrophicLevel(4).especies.length, 1);
    assert.equal(sistema.getSpecie(especie.nivelTrofico, especie.nombre).name, especie.nombre);
    for (const nivel of sistema.ecosystem) {
        for (const grupo of nivel.especies) assert.equal(grupo.beings.length, 0);
    }
});

test("las especies invalidas no crean niveles ni entran al catalogo", () => {
    const sistema = new FishSystem3D(100, 100, 100);
    sistema.cargarJSON({ especies: [null, { ...especie, nivelTrofico: "4" }, { ...especie, nivelTrofico: 9, radius: "15" }] }, esquema);
    assert.equal(sistema.ecosystem.length, 1);
    assert.equal(sistema.ecosystem[0].especies.length, 1);
    assert.equal(sistema.catalogoEspecies.length, 0);
});

test("ambos metodos de creacion agregan peces a su especie y nivel", () => {
    const sistema = new FishSystem3D(1000, 1000, 1000);
    sistema.addMinibanco(3, especie);
    sistema.addRandomFish(2, especie);
    const otra = { ...especie, nivelTrofico: 4 };
    sistema.addRandomFish(1, otra);
    assert.equal(sistema.getSpecie(especie.nivelTrofico, especie.nombre).beings.length, 5);
    assert.equal(sistema.getSpecie(4, otra.nombre).beings.length, 1);
    assert.equal(sistema.getFish().length, 6);
    assert.ok(sistema.getFish().every(pez => pez instanceof Fish));
    assert.equal(sistema.getFish()[0].especie, especie);
});

test("cohesion y alineacion agrupan por especie; separacion incluye todos los peces", () => {
    const sistema = new FishSystem3D(100, 100, 100);
    sistema.addRandomFish(2, especie);
    sistema.addRandomFish(1, { ...especie }); // Mismo nombre, otro objeto de configuracion.
    sistema.addRandomFish(1, { ...especie, nombre: "Otra especie" });
    sistema.addRandomFish(1, { ...especie, nivelTrofico: 4 });
    for (const pez of sistema.getFish()) {
        pez.cohere = vecinos => {
            const mismoGrupo = pez.especie.nombre === especie.nombre && pez.especie.nivelTrofico === especie.nivelTrofico;
            assert.equal(vecinos.length, mismoGrupo ? 3 : 1);
            assert.ok(vecinos.every(otro => otro.especie.nombre === pez.especie.nombre &&
                otro.especie.nivelTrofico === pez.especie.nivelTrofico));
        };
        pez.align = pez.cohere;
        pez.separate = vecinos => assert.equal(vecinos.length, 5);
    }
    sistema.cohere(); sistema.align(); sistema.separate();
});

test("actualiza peces de distintos niveles durante 120 ciclos sin tratar el fitoplancton como pez", () => {
    const sistema = new FishSystem3D(1000, 1000, 1000);
    sistema.addMinibanco(3, especie);
    sistema.addRandomFish(2, { ...especie, nivelTrofico: 4 });
    for (let frame = 0; frame < 120; frame++) {
        sistema.cohere(); sistema.align(); sistema.separate(); sistema.wander(); sistema.update();
    }
    assert.equal(sistema.getFish().length, 5);
    for (const pez of sistema.getFish()) {
        assert.ok(Number.isFinite(pez.pos.x) && Number.isFinite(pez.pos.y) && Number.isFinite(pez.pos.z));
    }
});

test("elimina varios muertos del nivel real sin saltar los vivos", () => {
    const sistema = new FishSystem3D(100, 100, 100);
    sistema.addRandomFish(3, especie);
    const [muerto1, vivo, muerto2] = sistema.getFish();
    muerto1.energia = 0; muerto2.energia = 0;
    sistema.update();
    assert.equal(sistema.getFish().length, 1);
    assert.equal(sistema.getFish()[0], vivo);
});

test("el fitoplancton consumido se elimina y otro pez no puede volver a consumirlo", () => {
    const sistema = new FishSystem3D(100, 100, 100);
    const peces = [new Fish(0, 0, 0, especie), new Fish(0, 0, 0, especie)];
    for (const pez of peces) { pez.energia = 1; sistema.getSpecie(especie.nivelTrofico, especie.nombre).addBeing(pez); }
    const fito = new Fitoplancton(0, 0, 0, 5);
    sistema.getSpecie(1, "Fitoplancton").addBeing(fito);
    sistema.update();
    assert.equal(sistema.getFitoplancton().length, 0);
    assert.ok(peces[0].energia > 1 && peces[1].energia < 1);
});

test("reconfigurar fitoplancton conserva los peces, incluso los del nivel 1", () => {
    const sistema = new FishSystem3D(1000, 1000, 1000);
    sistema.addRandomFish(1, { ...especie, nivelTrofico: 1 });
    const pez = sistema.getFish()[0];
    sistema.configurarFitoplancton(0.1, 1, 0.05);
    assert.equal(sistema.getFish()[0], pez);
    assert.equal(sistema.getFitoplancton().length, 50);
    assert.equal(sistema.getTrophicLevel(1).especies.length, 2);
    assert.equal(sistema.getSpecie(1, especie.nombre).beings.length, 1);
});

test("consumir alimento dentro del mismo nivel no actualiza dos veces al pez", () => {
    const sistema = new FishSystem3D(100, 100, 100);
    const fito = new Fitoplancton(0, 0, 0, 5);
    const pez = new Fish(0, 0, 0, { ...especie, nivelTrofico: 1 });
    pez.energia = 1;
    let actualizaciones = 0;
    const actualizar = pez.update.bind(pez);
    pez.update = (...args) => { actualizaciones++; actualizar(...args); };
    sistema.getSpecie(1, "Fitoplancton").addBeing(fito);
    sistema.getSpecie(1, especie.nombre).addBeing(pez);
    sistema.update();
    assert.equal(actualizaciones, 1);
    assert.equal(sistema.getSpecie(1, especie.nombre).beings.length, 1);
    assert.equal(sistema.getFitoplancton().length, 0);
});

test("la regeneracion respeta la capacidad contando solo fitoplancton", () => {
    const sistema = new FishSystem3D(1000, 1000, 1000);
    sistema.configurarFitoplancton(0.01, 1, 100);
    sistema.addRandomFish(2, { ...especie, nivelTrofico: 1 });
    for (let i = 0; i < 100; i++) sistema.regenerarFitoplancton();
    assert.equal(sistema.getFitoplancton().length, 10);
    assert.equal(sistema.getFish().length, 2);
});

test("el arranque del sketch carga especies y crea el minibanco en ecosystem", async () => {
    const sistema = new FishSystem3D(100, 100, 100);
    contexto.sistema = sistema;
    contexto.fetch = async url => ({ ok: true, json: async () => JSON.parse(leer(url)) });
    vm.runInContext(leer("sketch.js"), contexto);
    await vm.runInContext("fishSystem = sistema; cargarEspecies();", contexto);
    assert.equal(sistema.getFish().length, 10);
    assert.equal(sistema.getSpecie(especie.nivelTrofico, especie.nombre).beings.length, 10);
});

test("cargas repetidas y creacion reutilizan el grupo sin perder organismos", () => {
    const sistema = new FishSystem3D(100, 100, 100);
    sistema.cargarJSON({ especies: [especie] }, esquema);
    const grupo = sistema.getSpecie(especie.nivelTrofico, especie.nombre);
    sistema.addMinibanco(2, especie);
    const primerPez = grupo.beings[0];
    sistema.cargarJSON({ especies: [{ ...especie }] }, esquema);
    sistema.addRandomFish(1, especie);
    assert.equal(sistema.getTrophicLevel(especie.nivelTrofico).especies.length, 1);
    assert.equal(sistema.getSpecie(especie.nivelTrofico, especie.nombre), grupo);
    assert.equal(grupo.beings.length, 3);
    assert.equal(grupo.beings[0], primerPez);
});

test("una especie conserva su registro aunque todos sus peces mueran", () => {
    const sistema = new FishSystem3D(100, 100, 100);
    sistema.cargarJSON({ especies: [especie] }, esquema);
    sistema.addRandomFish(2, especie);
    const grupo = sistema.getSpecie(especie.nivelTrofico, especie.nombre);
    for (const pez of grupo.beings) pez.energia = 0;
    sistema.update();
    assert.equal(grupo.beings.length, 0);
    assert.equal(sistema.getTrophicLevel(especie.nivelTrofico).especies[0], grupo);
    assert.equal(sistema.catalogoEspecies[0], especie);
});

test("regenerar fitoplancton conserva la lista original y las otras especies", () => {
    const sistema = new FishSystem3D(1000, 1000, 1000);
    sistema.addRandomFish(2, especie);
    const grupoPeces = sistema.getSpecie(especie.nivelTrofico, especie.nombre);
    const listaOriginal = sistema.getFitoplancton();
    sistema.configurarFitoplancton(0.1, 1, 0.05);
    assert.equal(sistema.getFitoplancton(), listaOriginal);
    assert.equal(listaOriginal.length, 50);
    assert.equal(grupoPeces.beings.length, 2);
});
