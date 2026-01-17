window.addEventListener("load", () => {
    console.log("Google Physics Click-to-Fall Extension Loaded!");

    // 1️⃣ Matter aliases
    const Engine = Matter.Engine,
        Render = Matter.Render,
        Runner = Matter.Runner,
        Bodies = Matter.Bodies,
        Composite = Matter.Composite,
        Events = Matter.Events;

    // 2️⃣ Create engine and world
    const engine = Engine.create();
    const world = engine.world;

    // 3️⃣ Create invisible renderer (optional)
    const render = Render.create({
        element: document.body,
        engine: engine,
        options: {
            width: window.innerWidth,
            height: window.innerHeight,
            wireframes: false,
            background: 'transparent'
        }
    });
    Render.run(render);

    // 4️⃣ Run the engine
    Runner.run(Runner.create(), engine);

    // 5️⃣ Track bodies
    let bodies = [];

    // 6️⃣ Function to attach physics to a DOM element
    function attachBody(el) {
        const rect = el.getBoundingClientRect();
        const scrollX = window.scrollX;
        const scrollY = window.scrollY;

        const width = Math.max(rect.width, 20);
        const height = Math.max(rect.height, 20);

        const body = Bodies.rectangle(
            rect.left + scrollX + width / 2,
            rect.top + scrollY + height / 2,
            width,
            height,
            { restitution: 0.6 }
        );

        body.domElement = el;
        bodies.push(body);
        Composite.add(world, body);

        el.style.position = 'absolute';
        el.style.pointerEvents = 'none';
    }

    // 7️⃣ Update DOM positions after physics update
    Events.on(engine, 'afterUpdate', () => {
        bodies.forEach(body => {
            const el = body.domElement;
            el.style.left = `${body.position.x - body.bounds.max.x + body.bounds.min.x}px`;
            el.style.top  = `${body.position.y - body.bounds.max.y + body.bounds.min.y}px`;
            el.style.transform = `rotate(${body.angle}rad)`;
        });
    });

    // 8️⃣ Handle clicks
    document.addEventListener('click', e => {
        let el = e.target;

        // Skip elements already physics-enabled
        if (bodies.find(b => b.domElement === el)) return;

        attachBody(el);
    });
});

