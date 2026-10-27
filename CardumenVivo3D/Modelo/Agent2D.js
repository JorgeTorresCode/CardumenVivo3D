const BorderBehaviour = {
    BORDERS : "BORDERS",
    WRAP : "WRAP",
    NONE : "NONE"
}

class Agent2D {
    static drawRatio = 5;
    static img;
    constructor(x, y, mass) {
        this.pos = createVector(x, y);
        this.lastPos = this.pos.copy();
        this.speed = createVector(0, 0);
        this.acc = createVector(0, 0);
        this.mass = mass < 0? 0 : mass;
        this.massLoss = 0;
        this.c = color(random(100, 255), 255, random(100, 255));
        this.r = sqrt(this.mass / PI) * Agent2D.drawRatio;
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
    }
    static createRandomSpeed(x, y, mass, massLoss) {
        let agent = new Agent2D(x, y, mass, massLoss);
        let v = p5.Vector.random2D();
        agent.speed.add(v);
        return agent;
    }
    static createRandomPos(mass = 1) {
        let agent = new Agent2D(random(width), random(height), mass);
        return agent;
    }
    update() {
        this.lastPos.x = this.pos.x;
        this.lastPos.y = this.pos.y;
        this.speed.add(this.acc);
        this.speed.limit(this.maxSpeed);
        this.pos.add(this.speed);
        this.acc.mult(0);
        this.borders();
        this.mass -= this.massLoss;
        this.r = sqrt(this.mass / PI) * Agent2D.drawRatio;
    }
    display() {
        stroke(this.c);
        strokeWeight(this.r * 2)
        push();
        translate(this.pos.x, this.pos.y);
        rotate(this.speed.heading());
        beginShape();
        vertex(-this.r/3, -this.r/2);
        vertex(-this.r/3, this.r/2);
        vertex(3 * this.r/3, 0);
        endShape(CLOSE);
        pop();
    }
    borders() {
        switch (this.borderBehaviour) {
            case BorderBehaviour.BORDERS:
                if (this.pos.x < this.r || this.pos.x > width - this.r)
                    this.speed.x *= -this.borderDamp;
                if (this.pos.y < this.r || this.pos.y > height - this.r)
                    this.speed.y *= -this.borderDamp;
                this.pos.x = constrain(this.pos.x, this.r, width - this.r);
                this.pos.y = constrain(this.pos.y, this.r, height - this.r);
                break;
            case BorderBehaviour.WRAP:
                if (this.pos.x > width + this.r) this.pos.x = -this.r;
                if (this.pos.x < -this.r) this.pos.x = width + this.r;
                if (this.pos.y > height + this.r) this.pos.y = -this.r;
                if (this.pos.y < -this.r) this.pos.y = height + this.r;
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
        let r = this.speed.copy();
        r.setMag(this.wanderRadius);
        r.rotate(map(noise(this.wanderNoiseT), 0, 1, -PI, PI));
        this.wanderDebug(future, r);
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
        translate(this.pos.x, this.pos.y);
        line(0, 0, future.x, future.y);
        translate(future.x, future.y);
        ellipse(0, 0, r.mag() * 2);
        translate(r.x, r.y);
        ellipse(0, 0, 5);
        pop();     
    }
    align(agents) {
        let result = createVector(0, 0);
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
        let result = createVector(0, 0);
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
}