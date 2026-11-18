class Agent3D {
    constructor(x, y, z, mass = 1) {
        this.pos = createVector(x, y, z);
        this.lastPos = this.pos.copy();
        this.speed = createVector(0, 0, 0);
        this.acc = createVector(0, 0, 0);
        this.mass = mass <= 0 ? 1 : mass;

        this.r = Math.cbrt((3 * this.mass) / (4 * PI));

        this.maxSteeringForce = 0.4;
        this.maxSpeed = 2;
        this.arrivalDist = 100;

        this.wanderLookAhead = 70;
        this.wanderRadius = 50;
        this.wanderNoiseT = random(10);
        this.wanderNoiseInc = 0.01;

        this.alignmentRadius = 100;
        this.alignmentRatio = 1;

        this.separationRadius = 70;
        this.separationRatio = 0.5;

        this.cohesionRadius = 150;
        this.cohesionRatio = 1;
    }
    update(ancho, alto, profundidad) {
        this.lastPos.set(this.pos);
        this.speed.add(this.acc);
        this.speed.limit(this.maxSpeed);
        this.pos.add(this.speed);
        this.acc.mult(0);
        this.borders(ancho, alto, profundidad);
    }
    display() {
        push();
        noStroke();
        fill(255, 0, 0, 50);
        translate(this.pos.x, this.pos.y, this.pos.z);
        sphere(this.r);
        pop();
    }   

    // TODO
    borders(ancho, alto, profundidad) {
        const w = ancho / 2 - this.r;
        const h = alto / 2 - this.r;
        const d = profundidad / 2 - this.r;
        const margen = 150;

        const fuerza = createVector(0, 0, 0);

        const empuje = distancia =>
            this.mass * constrain(1 - distancia / margen, 0, 1) ** 2;

        if (this.pos.x > w - margen) fuerza.x -= empuje(w - this.pos.x);
        if (this.pos.x < -w + margen) fuerza.x += empuje(this.pos.x + w);

        if (this.pos.y > h - margen) fuerza.y -= empuje(h - this.pos.y);
        if (this.pos.y < -h + margen) fuerza.y += empuje(this.pos.y + h);

        if (this.pos.z > d - margen) fuerza.z -= empuje(d - this.pos.z);
        if (this.pos.z < -d + margen) fuerza.z += empuje(this.pos.z + d);

        this.addForce(fuerza);
    }
    addForce(f) {
        let force = p5.Vector.div(f, this.mass);
        this.acc.add(force);
    }
    applyGravity(g) {
        this.acc.add(g); 
    }
    applyFriction(m) {
        let fric = this.speed.copy();
        fric.normalize();
        fric.mult(-m);
        this.addForce(fric);
    }
    applyDrag(d) {
        let drag = this.speed.copy();
        drag.normalize();
        drag.mult(this.speed.mag() ** 2 * -d);
        this.addForce(drag);
    }
    seek(target) {
        let desired = p5.Vector.sub(target, this.pos);
        desired.setMag(this.maxSpeed);
        let steering = p5.Vector.sub(desired, this.speed);
        steering.limit(this.maxSteeringForce);
        this.addForce(steering);
    }
    arrive(target) {
        let desired = p5.Vector.sub(target, this.pos);
        let d = desired.mag();
        if (d < this.arrivalDist) {
            let m = map(d, 0, this.arrivalDist, 0, this.maxSpeed);
            desired.setMag(m);
        } else {
            desired.setMag(this.maxSpeed);
        }
        let steering = p5.Vector.sub(desired, this.speed);
        steering.limit(this.maxSteeringForce);
        this.addForce(steering);
    }
    wander() {
        let future = this.speed.copy();
        future.setMag(this.wanderLookAhead);
        let theta = map(noise(this.wanderNoiseT), 0, 1, 0, PI);
        let phi = map(noise(this.wanderNoiseT + 1000), 0, 1, -PI, PI);
        let r = p5.Vector.fromAngles(theta, phi, this.wanderRadius);
        this.wanderNoiseT += this.wanderNoiseInc;
        r.add(future);
        r.add(this.pos);
        this.seek(r);
    }
    cohereAndAlign(agents) {
        const cohesion = createVector(0, 0, 0);
        const alineacion = createVector(0, 0, 0);
        let vecinosCohesion = 0;
        let vecinosAlineacion = 0;

        for (let a of agents) {
            if (this === a) continue;
            const distancia = this.pos.dist(a.pos);

            if (distancia <= this.cohesionRadius) {
                cohesion.add(a.pos);
                vecinosCohesion++;
            }
            if (distancia <= this.alignmentRadius) {
                alineacion.add(a.speed);
                vecinosAlineacion++;
            }
        }

        if (vecinosCohesion > 0) {
            cohesion.div(vecinosCohesion);
            cohesion.sub(this.pos);
            cohesion.setMag(this.cohesionRatio);
            cohesion.limit(this.maxSteeringForce);
            this.addForce(cohesion);
        }
        if (vecinosAlineacion > 0) {
            alineacion.div(vecinosAlineacion);
            alineacion.mult(this.alignmentRatio);
            alineacion.limit(this.maxSteeringForce);
            this.addForce(alineacion);
        }
    }
    separate(agents) {
        let result = createVector(0, 0, 0);
        let n = 0;

        for (let a of agents) {
            if (this === a) continue;

            let d = this.pos.dist(a.pos);
            let radioContacto = this.r + a.r;

            if (d < radioContacto) {
                let dif = d > 0.0001
                    ? p5.Vector.sub(this.pos, a.pos).normalize()
                    : p5.Vector.random3D(); 

                // Empuje proporcional 
                let empuje = 1 - (d / radioContacto);
                dif.mult(this.mass * empuje * 1.5);
                this.addForce(dif);
            }
            else if (d <= this.separationRadius) {
                let dif = p5.Vector.sub(this.pos, a.pos);
                dif.normalize();
                dif.div(d);
                result.add(dif);
                n++;
            }
        }

        if (n > 0) {
            result.div(n);
            result.mult(this.separationRatio);
            result.limit(this.maxSteeringForce);
            this.addForce(result);
        }
    }
}
