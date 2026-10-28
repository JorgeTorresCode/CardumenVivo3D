class AgentSystem3D {
    constructor(depth = 1200) {
        this.agents = [];
        this.depth = depth;
    }

    cohere() {
        for (let a of this.agents) {
            a.cohere(this.agents);
        }
    }

    align() {
        for (let a of this.agents) {
            a.align(this.agents);
        }
    }

    separate() {
        for (let a of this.agents) {
            a.separate(this.agents);
        }
    }

    wander() {
        for (let a of this.agents) {
            a.wander();
        }
    }

    update() {
        for (let i = this.agents.length - 1; i >= 0; i--) {
            let a = this.agents[i];
            
            if (a.isDead()) {
                this.agents.splice(i, 1);
                continue;
            }

            a.update();
            a.display();
        }
    }

    addRandomAgents(count, mass = 15) {
        let w = 1200 / 2; 
        let h = 700 / 2;  
        let d = this.depth / 2;

        for (let i = 0; i < count; i++) {
            let agent = new Agent3D(
                random(-w, w),
                random(-h, h),
                random(-d, d),
                mass,
                this.depth
            );
            agent.speed = p5.Vector.random3D();
            agent.speed.mult(random(1, agent.maxSpeed));
            this.agents.push(agent);
        }
    }

    addMinibanco(count, mass = 15) {
        let centroX = random(-150, 150);
        let centroY = random(-100, 100);
        let centroZ = random(-150, 150);
        
        let velocidadBase = p5.Vector.random3D();
        velocidadBase.mult(2);

        for (let i = 0; i < count; i++) {
            let x = centroX + random(-30, 30);
            let y = centroY + random(-30, 30);
            let z = centroZ + random(-30, 30);

            let pez = new Pez(x, y, z, mass, this.depth, {
                colorCuerpo: color(random(100, 255), 200, 255),
                colorAletas: color(50, 150, 200)
            });
            
            pez.speed = velocidadBase.copy().add(p5.Vector.random3D().mult(0.5));
            this.agents.push(pez);
        }
    }
}