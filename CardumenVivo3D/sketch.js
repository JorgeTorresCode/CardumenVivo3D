let agentSystem;

function setup() {
    createCanvas(1200, 700, WEBGL);
    agentSystem = new AgentSystem3D(2400);
    
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
    box(2400, 1200, 2400); 
    pop();
    //
    agentSystem.cohere();
    agentSystem.align();
    agentSystem.separate();
    agentSystem.wander();

    agentSystem.update();
}