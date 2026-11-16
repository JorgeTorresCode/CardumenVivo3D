class Fitoplancton {
    constructor(x, y, z, energia) {
        this.pos = createVector(x, y, z);
        this.energia = energia;
        
        const escalaVisual = 1;
        this.r = Math.cbrt((3 * this.energia) / (4 * PI)) * escalaVisual;

        this.color = color(80, random(200, 255), random(120, 180), 210);
    }
    
    static createRandom(ancho, alto, depth, minEnergia = 1, maxEnergia = 10) {
        let halfW = ancho / 2;
        let halfH = alto / 2;
        let halfD = depth / 2;

        //Esto lo podemos cambiar pero por el momento es un Gaussian para que esten esparcidos, pero lo podriamos poner full random

        let x = constrain(randomGaussian(0, halfW / 3), -halfW, halfW);
        let y = constrain(randomGaussian(0, halfH / 3), -halfH, halfH);
        let z = constrain(randomGaussian(0, halfD / 3), -halfD, halfD);

        let energia = random(minEnergia, maxEnergia);
        return new Fitoplancton(x, y, z, energia);
    }

    display() {
        push();
        noStroke();
        ambientMaterial(this.color);
        translate(this.pos.x, this.pos.y, this.pos.z);
        sphere(this.r, 8, 6);
        pop();
    }
}