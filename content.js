window.addEventListener("load", () => {
console.log("Google Physics Canvas – Draggable Boxes Loaded!");

// Matter.js aliases
const Engine = Matter.Engine,
      Runner = Matter.Runner,
      Bodies = Matter.Bodies,
      Composite = Matter.Composite,
      Mouse = Matter.Mouse,
      MouseConstraint = Matter.MouseConstraint;

// 1️⃣ Engine and world
const engine = Engine.create();
engine.world.gravity.y = 1.5;
const world = engine.world;
Runner.run(Runner.create(), engine);

// 2️⃣ Canvas overlay
const canvas = document.createElement('canvas');
canvas.style.position = 'fixed';
canvas.style.top = '0';
canvas.style.left = '0';
canvas.style.pointerEvents = 'auto';
canvas.style.zIndex = 9999;
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;

    canvas.width  = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;

    canvas.style.width  = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// 3️⃣ Bodies array
let bodies = [];
const NUM_FRAGMENTS = 2;

// 4️⃣ Floor & walls
const floor = Bodies.rectangle(window.innerWidth/2, window.innerHeight + 50, window.innerWidth*2, 100, { isStatic: true });
const leftWall = Bodies.rectangle(-50, window.innerHeight/2, 100, window.innerHeight*2, { isStatic: true });
const rightWall = Bodies.rectangle(window.innerWidth+50, window.innerHeight/2, 100, window.innerHeight*2, { isStatic: true });
Composite.add(world, [floor, leftWall, rightWall]);

// 5️⃣ Spawn a box
function spawnBox(x = 300, y = 50, w = 150, h = 40) {
    const colors = ['#4285f4','#0f9d58','#f4b400','#db4437'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const body = Bodies.rectangle(x, y, w, h, { restitution: 0.6 });
    body.meta = { width: w, height: h, color };
    Composite.add(world, body);
    bodies.push(body);
    return body;
}

// 6️⃣ Break a box into 2 fragments
function breakBox(body) {
    if (!body.meta) return;
    const w = body.meta.width / 2;
    const h = body.meta.height;
    Composite.remove(world, body);
    bodies = bodies.filter(b => b !== body);

    for (let i = 0; i < 2; i++) {
        const frag = Bodies.rectangle(
            body.position.x + (i===0?-w/2:w/2),
            body.position.y,
            w, h,
            { restitution: 0.6 }
        );
        frag.meta = { width: w, height: h, color: body.meta.color };
        Matter.Body.setVelocity(frag, { x: (Math.random()-0.5)*5, y: -2 });
        Matter.Body.setAngularVelocity(frag, (Math.random()-0.5)*0.2);
        Composite.add(world, frag);
        bodies.push(frag);
    }
}

// 7️⃣ Spawn initial boxes
for (let i = 0; i < 10; i++) {
    spawnBox(100 + i*150, 50 - i*20);
}

// 8️⃣ Mouse drag support (draggable boxes)
const mouse = Mouse.create(canvas);
mouse.pixelRatio = window.devicePixelRatio || 1;
const mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: { stiffness: 0.2, render: { visible: false } }
});
Composite.add(world, mouseConstraint);

// 9️⃣ Click to break a box
document.addEventListener('click', e => {
    const mouseX = e.clientX;
    const mouseY = e.clientY;

    bodies.forEach(body => {
        if (!body.meta) return;

        const dx = mouseX - body.position.x;
        const dy = mouseY - body.position.y;

        if (Math.abs(dx) < body.meta.width/2 && Math.abs(dy) < body.meta.height/2) {
            breakBox(body);
        }
    });
});

// 🔟 Render loop
(function renderLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    bodies.forEach(body => {
        if (!body.meta) return;
        ctx.save();
        ctx.translate(body.position.x, body.position.y);
        ctx.rotate(body.angle);
        ctx.fillStyle = body.meta.color;
        ctx.fillRect(-body.meta.width/2, -body.meta.height/2, body.meta.width, body.meta.height);
        ctx.restore();
    });

    requestAnimationFrame(renderLoop);
})();

});


