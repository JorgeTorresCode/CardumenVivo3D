const BorderBehaviour = {
    BORDERS : "BORDERS",
    WRAP : "WRAP",
    NONE : "NONE"
}

class Agent3D {
    static drawRatio = 5;
    static img;
    constructor(x, y, z, mass, depth) {
        this.pos = createVector(x, y, z);
        this.lastPos = this.pos.copy();
        this.speed = createVector(0, 0, 0);
        this.acc = createVector(0, 0, 0);
        this.mass = mass < 0? 0 : mass;
        this.massLoss = 0;
        this.c = color(random(100, 255), 255, random(100, 255));
        this.r = Math.cbrt((3 * this.mass) / (4 * PI)) * Agent3D.drawRatio;
        this.borderBehaviour = BorderBehaviour.BORDERS;
        this.borderDamp = 0.8;
        this.maxSteeringForce = 0.01;
        this.maxSpeed = 1;
        this.arrivalDist = 200;

        this.wanderLookAhead = 70;
        this.wanderRadius = 50;
        this.wanderNoiseT = random(10);
        this.wanderNoiseInc = 0.01;

        this.alignmentRadius = 100;
        this.alignmentRatio = 1;

        this.separationRadius = 10;
        this.separationRatio = 1;


        this.cohesionRadius = 100;
        this.cohesionRatio = 1;
        this.depth = depth;
    }
    static createRandomSpeed(x, y, z, mass, massLoss) {
        let agent = new Agent3D(x, y, z, mass, massLoss);
        let v = p5.Vector.random3D();
        agent.speed.add(v);
        return agent;
    }
    static createRandomPos(mass = 1) {
        let agent = new Agent3D(
            random(-width / 2, width / 2),
            random(-height / 2, height / 2),
            random(-this.depth / 2, this.depth / 2),
            mass);
        return agent;
    }
    update() {
        this.lastPos.x = this.pos.x;
        this.lastPos.y = this.pos.y;
        this.lastPos.z = this.pos.z;
        this.speed.add(this.acc);
        this.speed.limit(this.maxSpeed);
        this.pos.add(this.speed);
        this.acc.mult(0);
        this.borders();
        this.mass -= this.massLoss;
        this.r = Math.cbrt((3 * this.mass) / (4 * PI)) * Agent3D.drawRatio;
    }
    display() {
        noStroke();
        fill(this.c);
        push();
        translate(this.pos.x, this.pos.y, this.pos.z);
        sphere(this.r);
        pop();
    }
    borders() {
        let w = width / 2;
        let h = height / 2;
        let d = this.depth / 2;
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
        drag.mult(this.speed.mag()**2 * -d);
        this.addForce(drag);
    }
    isDead() {
        return this.mass <= 0;
    }
    seek(target) {
        let desired = p5.Vector.sub(target, this.pos);
        let steering = p5.Vector.sub(desired, this.speed);
        steering.limit(this.maxSteeringForce);
        this.addForce(steering);
    }
    arrive(target) {
        let desired = p5.Vector.sub(target, this.pos);
        let steering = p5.Vector.sub(desired, this.speed);
        steering.limit(this.maxSteeringForce);
        this.addForce(steering);
        let dist = p5.Vector.dist(this.pos, target);
        let speed = map(dist, 0, this.arrivalDist, 0,this.maxSpeed);
        this.speed.limit(speed);
    }
    wander() {
        let future = this.speed.copy();
        future.setMag(this.wanderLookAhead);
        let theta = map(noise(this.wanderNoiseT), 0, 1, 0, PI);
        let phi = map(noise(this.wanderNoiseT + 1000), 0, 1, -PI, PI);
        let r = p5.Vector.fromAngles(theta, phi, this.wanderRadius);
        //this.wanderDebug(future, r);
        this.wanderNoiseT += this.wanderNoiseInc;
        r.add(future);
        r.add(this.pos);
        this.seek(r);
    }
    wanderDebug(future, r) {
        push();
        stroke(255);
        strokeWeight(1);
        noFill();
        translate(this.pos.x, this.pos.y, this.pos.z);
        line(0, 0, 0, future.x, future.y, future.z);
        translate(future.x, future.y, future.z);
        ellipse(0, 0, r.mag() * 2);
        translate(r.x, r.y, r.z);
        ellipse(0, 0, 5);
        pop();
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
