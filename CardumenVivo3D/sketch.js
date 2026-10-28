let agentSystem;

function setup() {
    createCanvas(windowWidth-5, windowHeight-5, WEBGL);
    agentSystem = new AgentSystem3D(2400, 2400, 1200);
    
    agentSystem.addMinibanco(10, 15);
}

function draw() {
    background(20, 40, 60);
    orbitControl(); 
    lights();

    //sandbox
    push();
    stroke(255, 100); 
    noFill();         
    box(agentSystem.ancho, agentSystem.alto, agentSystem.depth);
    pop();
    //
    agentSystem.cohere();
    agentSystem.align();
    agentSystem.separate();
    agentSystem.wander();

    agentSystem.update();
}
