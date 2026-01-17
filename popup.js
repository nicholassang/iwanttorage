console.log('This is a popup!');

// Wait for DOM
document.addEventListener('DOMContentLoaded', () => {

    const Engine = Matter.Engine,
          Render = Matter.Render,
          Runner = Matter.Runner,
          Bodies = Matter.Bodies,
          Composite = Matter.Composite;

    // Create engine
    const engine = Engine.create();

    // Create renderer
    const render = Render.create({
        element: document.getElementById('canvas-container'), // place canvas here
        engine: engine,
        options: {
            width: 280,
            height: 200,
            wireframes: false,
            background: '#f0f0f0'
        }
    });

    // Create boxes and ground
    const boxA = Bodies.rectangle(140, 50, 40, 40, { render: { fillStyle: 'red' } });
    const boxB = Bodies.rectangle(180, 20, 40, 40, { render: { fillStyle: 'blue' } });
    const ground = Bodies.rectangle(140, 180, 280, 20, { isStatic: true, render: { fillStyle: '#666' } });

    Composite.add(engine.world, [boxA, boxB, ground]);

    // Run renderer and engine
    Render.run(render);
    Runner.run(Runner.create(), engine);
});