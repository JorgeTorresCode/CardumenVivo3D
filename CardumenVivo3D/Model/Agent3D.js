const BorderBehaviour = {
    BORDERS: "BORDERS",
    WRAP: "WRAP",
    NONE: "NONE"
};

class Agent3D {
    constructor(x, y, z, mass = 1) {
        this.pos = createVector(x, y, z);
        this.lastPos = this.pos.copy();
        this.speed = createVector(0, 0, 0);
        this.acc = createVector(0, 0, 0);
        this.mass = mass <= 0 ? 1 : mass;

        this.r = Math.cbrt((3 * this.mass) / (4 * PI));

        this.borderDamp = 0.8;
        this.maxSteeringForce = 0.03;
        this.maxSpeed = 2;
        this.arrivalDist = 200;

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
        this.borderBehaviour = BorderBehaviour.WRAP;
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

    borders(ancho, alto, profundidad) {
        let w = ancho / 2;
        let h = alto / 2;
        let d = profundidad / 2;
        switch (this.borderBehaviour) {
            case BorderBehaviour.BORDERS:
                if (this.pos.x < -w + this.r || this.pos.x > w - this.r)
                    this.speed.x *= -this.borderDamp;
                if (this.pos.y < -h + this.r || this.pos.y > h - this.r)
                    this.speed.y *= -this.borderDamp;
                if (this.pos.z < -d + this.r || this.pos.z > d - this.r)
                    this.speed.z *= -this.borderDamp;
                this.pos.x = constrain(this.pos.x, -w + this.r, w - this.r);
                this.pos.y = constrain(this.pos.y, -h + this.r, h - this.r);
                this.pos.z = constrain(this.pos.z, -d + this.r, d - this.r);
                break;
            case BorderBehaviour.WRAP:
                if (this.pos.x > w + this.r) this.pos.x = -w - this.r;
                if (this.pos.x < -w - this.r) this.pos.x = w + this.r;
                if (this.pos.y > h + this.r) this.pos.y = -h - this.r;
                if (this.pos.y < -h - this.r) this.pos.y = h + this.r;
                if (this.pos.z > d + this.r) this.pos.z = -d - this.r;
                if (this.pos.z < -d - this.r) this.pos.z = d + this.r;
                break;
            case BorderBehaviour.NONE:
                break;
        }
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

    align(agents) {
        let result = createVector(0, 0, 0);
        let n = 0;
        for (let a of agents) {
            if (this != a && this.pos.dist(a.pos) <= this.alignmentRadius) {
                result.add(a.speed);
                n++;
            }
        }
        if (n > 0) {
            result.div(n);
            result.mult(this.alignmentRatio);
            result.limit(this.maxSteeringForce);
            this.addForce(result);
        }
    }

    separate(agents) {
        let result = createVector(0, 0, 0);
        let n = 0;
        for (let a of agents) {
            if (this != a && this.pos.dist(a.pos) <= this.separationRadius) {
                let dif = p5.Vector.sub(this.pos, a.pos);
                dif.normalize();
                dif.div(this.pos.dist(a.pos));
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

    cohere(agents) {
        let result = createVector(0, 0, 0);
        let n = 0;
        for (let a of agents) {
            let d = p5.Vector.dist(this.pos, a.pos);
            if (this != a && d <= this.cohesionRadius) {
                result.add(a.pos);
                n++;
            }
        }
        if (n > 0) {
            result.div(n);
            result.sub(this.pos);
            result.setMag(this.cohesionRatio);
            result.limit(this.maxSteeringForce);
            this.addForce(result);
        }
    }
}