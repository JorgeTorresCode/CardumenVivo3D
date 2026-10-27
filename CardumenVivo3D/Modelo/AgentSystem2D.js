class AgentSystem2D {
    constructor(x, y, g, defaultMass, defaultMassLoss) {
        this.pos = createVector(x, y);
        this.agents = [];
        this.attractors = [];
        this.g = g;
        this.defaultMass = defaultMass;
        this.defaultMassLoss = defaultMassLoss;
    }
    update() {
        for (let a of this.agents) {
            for (let attractor of this.attractors) {
                attractor.attract(a);
            }
            a.update();
            a.display();
            if (a.isDead()) {
                this.agents.splice(this.agents.indexOf(a), 1);
            }
        }
    }
    addAgent(x, y) {
        this.agents.push(
            Agent2D.createRandomSpeed(
                x, 
                y, 
                this.defaultMass, 
                this.defaultMassLoss));
    }
    addForce(f) {
        for (let a of this.agents) {
            a.addForce(f);
        }
    }
    applyGravity(g) {
        for (let a of this.agents) {
            a.applyGravity(g);
        }
    }
    applyFriction(f) {
        for (let a of this.agents) {
            a.applyFriction(f);
        }
    }
    applyDrag(d) {
        for (let a of this.agents) {
            a.applyDrag(d);
        }
    }
    gravitationalForce() {
        for (let i = 0; i < this.agents.length; i++) {
            let a1 = this.agents.at(i);
            for (let j = i + 1; j < this.agents.length; j++) {
                let a2 = this.agents.at(j);
                let r = p5.Vector.sub(a1.pos, a2.pos);
                const mag = max(r.magSq(), 1);
                const c = this.g * a1.mass * a2.mass / mag;
                r.normalize();
                r.mult(c);
                a2.addForce(r);
                r.mult(-1);
                a1.addForce(r);
            }
        }
    }
    addAttractors(attractors) {
        for (let attractor of attractors) {
            this.attractors.push(attractor);
        }
    }
    addAttractor(attractor) {
        this.attractors.push(attractor);
    }
    align() {
        for (let agent of this.agents) {
            agent.align(this.agents);
        }
    }
    separate() {
        for (let a of this.agents) {
            a.separate(this.agents);
        }
    }
}