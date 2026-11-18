class PanelPoblacion {
    constructor() {
        this.tabla = document.getElementById("poblaciones");
        this.reloj = document.getElementById("tiempo");
        this.iniciales = new Map();
    }

    registrar(segundo, poblaciones) {
        const filas = document.createDocumentFragment();
        if (segundo === 0) this.iniciales.clear();
        for (const { nivel, nombre, cantidad } of poblaciones) {
            const clave = JSON.stringify([nivel, nombre]);
            if (segundo === 0) this.iniciales.set(clave, cantidad);
            const diferencia = cantidad - (this.iniciales.get(clave) ?? 0);
            const fila = document.createElement("tr");
            const especie = document.createElement("th");
            especie.scope = "row";
            especie.title = nombre;
            especie.textContent = nombre.replace(/\s+\([^()]*\)$/, "");
            fila.append(especie);
            const conteo = fila.insertCell();
            const cambio = document.createElement("span");
            if (diferencia > 0) cambio.className = "aumento";
            if (diferencia < 0) cambio.className = "disminucion";
            cambio.textContent = `(${diferencia > 0 ? "+" : ""}${diferencia})`;
            conteo.append(`${cantidad} `, cambio);
            conteo.title = "Individuos actuales (cambio desde el inicio)";
            filas.append(fila);
        }
        this.tabla.replaceChildren(filas);
        const minutos = String(Math.floor(segundo / 60)).padStart(2, "0");
        this.reloj.textContent = minutos + ":" + String(segundo % 60).padStart(2, "0");
    }
}
