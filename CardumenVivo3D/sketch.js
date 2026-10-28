let agentSystem;

function setup() {
    createCanvas(1200, 700, WEBGL); // Entorno 3D WebGL
    agentSystem = new AgentSystem3D(1200); // Sandbox con profundidad de 1200
    
    // Agregamos un cardumen inicial de 30 peces de prueba
    agentSystem.addRandomAgents(30, 15);
}

function draw() {
    background(20, 40, 60); 
    orbitControl(); 

    agentSystem.cohere();
    agentSystem.align();
    agentSystem.separate();
    agentSystem.wander();

    agentSystem.update();
}