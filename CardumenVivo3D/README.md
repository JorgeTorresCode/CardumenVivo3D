# CardumenVivo3D

## Dimensiones y creación de peces

El sistema recibe `(profundidad, ancho, alto)`; se conserva la profundidad
como primer argumento para mantener las llamadas existentes:

```js
agentSystem = new AgentSystem3D(2400, 2400, 1200);
agentSystem.addRandomAgents(30, 15, { esDepredador: false });
agentSystem.addMinibanco(5, 25, { esDepredador: true });
```

`ancho`, `alto` y `depth` son dimensiones completas de un volumen centrado en
el origen. Se pueden modificar en el sistema; cada `update()` pasa los valores
actuales a los peces. La caja visible usa esas mismas propiedades, sin depender
del tamaño del canvas. `borders(ancho, alto, profundidad)` también se puede
llamar directamente para aplicar rebote o wrap a otro volumen.

Las fábricas estáticas conservan la clase desde la que se invocan:

```js
// x, y, z, masa, pérdida de masa por actualización, profundidad, opciones
const pez = Pez.createRandomSpeed(0, 0, 0, 15, 0.01, 2400, {
    esDepredador: true
});

// masa, ancho, alto, profundidad, opciones
const otro = Pez.createRandomPos(15, 2400, 1200, 2400);
```

Ambas devuelven `Pez` si se llaman desde `Pez`, o `Agent3D` si se llaman desde
`Agent3D`. `createRandomPos` inicia la velocidad en cero; `addRandomAgents`
le asigna además una velocidad aleatoria.

Cada pez genera su propio color RGB una sola vez en el constructor:
`this.color = color(random(20, 255), random(20, 255), random(20, 255))`.
El dibujador utiliza `pez.color` para todas las partes: cuerpo, cola, aletas,
ojos y pupilas. Se usa el modo RGB predeterminado de p5.js (0–255).

## Tiempo de simulación

El movimiento conserva unidades por fotograma: `Agent3D.update()` suma
aceleración a velocidad y velocidad a posición una vez por actualización.
La pérdida de masa y el avance del ruido de exploración también son por paso.
Solo `Pez.update(dimensiones)` consulta `deltaTime / 1000` para la cola;
`AgentSystem3D.update()` y `Agent3D.update(dimensiones)` no reciben tiempo.
Por ello,
variar los FPS cambia la rapidez de desplazamiento, aunque el aleteo mantenga
su frecuencia. No se ha convertido la física a unidades por segundo.

## Getting Started

Open `index.html` in your web browser and start editing `sketch.js`.

## Running Locally

For projects with media files, use a local server:

```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx http-server

# Using VS Code Live Server extension
# Right-click index.html -> "Open with Live Server"
```

## Resources

- [p5.js 2.0](https://beta.p5js.org/)
- [p5.js Reference](https://p5js.org/reference/)
