import html2canvas from "html2canvas";

let isActive = false;
let isToggling= false;

chrome.storage.local.get("scriptActive", (data) => {
  if (data.scriptActive === true && isToggling === false) {
    startScript(); 
  } else {
    isActive = false; 
  }
});

function startScript() {
  if (isActive) return;
  isActive = true;
  chrome.storage.local.set({ scriptActive: true });

            let mode = "mouse";

            document.addEventListener("keydown", (e) => {
            if (e.key.toLowerCase() === "f") {
                // Toggle mode
                mode = mode === "mouse" ? "flamethrower" : "mouse";
                console.log("Mode switched to:", mode);
                }
            });

            // Matter aliases
            const Engine = Matter.Engine,
                Runner = Matter.Runner,
                Bodies = Matter.Bodies,
                Composite = Matter.Composite,
                Mouse = Matter.Mouse,
                MouseConstraint = Matter.MouseConstraint;
                Events = Matter.Events;

            // ---------------------
            // Engine
            // ---------------------
            const engine = Engine.create();
            Runner.run(Runner.create(), engine);
            const world = engine.world;

            // ---------------------
            // Canvas 
            // ---------------------
            const canvas = document.createElement('canvas');
            canvas.style.position = 'fixed';
            canvas.style.top = '0';
            canvas.style.left = '0';
            canvas.style.zIndex = 9999;
            canvas.style.pointerEvents = 'auto';
            document.body.appendChild(canvas);
            const ctx = canvas.getContext('2d', { willReadFrequently: true });

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

            // ---------------------
            // Enable Mouse Scroll
            // ---------------------

            canvas.addEventListener('wheel', e => {
                window.scrollBy({
                    top: e.deltaY,
                    left: e.deltaX,
                    behavior: 'auto'
                });
            });

            // ---------------------
            // World boundaries
            // ---------------------
            const floor = Bodies.rectangle(window.innerWidth/2, window.innerHeight + 40, window.innerWidth*2, 80, { isStatic:true });
            const leftWall = Bodies.rectangle(-40, window.innerHeight/2, 80, window.innerHeight*2, { isStatic:true });
            const rightWall = Bodies.rectangle(window.innerWidth+40, window.innerHeight/2, 80, window.innerHeight*2, { isStatic:true });
            const ceiling = Bodies.rectangle(window.innerWidth / 2, -40, window.innerWidth * 2, 80,{ isStatic: true });
            Composite.add(world, [floor, leftWall, rightWall, ceiling]);

            // ---------------------
            // Bodies storage
            // ---------------------
            let bodies = [];

            // ---------------------
            // Spawn Box
            // ---------------------
            function spawnBox(x=200, y=50, w=140, h=40){
                const colors = ['#4285f4','#0f9d58','#f4b400','#db4437'];
                const color = colors[Math.floor(Math.random()*colors.length)];
                const body = Bodies.rectangle(x,y,w,h,{ restitution:0.5 });
                body.meta = {
                    width: w,
                    height: h,
                    color,
                    originalWidth: w,
                    originalHeight: h,
                };
                Composite.add(world, body);
                bodies.push(body);
                return body;
            }

            // Spawn starter boxes
            for(let i=0;i<10;i++){
                spawnBox(200 + i*160, 60);
            }

            // ---------------------
            // Spawn DOM
            // ---------------------
            function spawnPhysicsFromDOM(el) {
                const rect = el.getBoundingClientRect();

                // Remove event listener
                if (el._clickListener) {
                    el.removeEventListener('click', el._clickListener);
                    el._clickListener = null;
                }

                // Random colour
                const colors = ['#4285f4','#0f9d58','#f4b400','#db4437'];
                const color = colors[Math.floor(Math.random()*colors.length)];

                // Render DOM element to a canvas
                html2canvas(el).then(canvasBitmap => {
                    // Hide the original DOM element
                    el.parentNode.removeChild(el);
                    el.style.pointerEvents = 'none';
                    
                    const body = Bodies.rectangle(
                        rect.left + rect.width/2,
                        rect.top + rect.height/2,
                        rect.width,
                        rect.height,
                        { restitution: 0.5 }
                    );

                    // Store the bitmap to draw in render loop
                    body.meta = {
                        width: rect.width,
                        height: rect.height,
                        bitmap: canvasBitmap,
                        originalWidth: rect.width,
                        originalHeight: rect.height
                    };

                    Composite.add(world, body);
                    bodies.push(body);
                });
            }

            // ---------------------
            // Click on DOM elements to transfrom them into canvas objects
            // ---------------------

            const google_search_elem = document.querySelectorAll('#rso > div');
            const imgs = document.querySelectorAll('img');
            const textarea = document.querySelectorAll('textarea');
            const span = document.querySelectorAll('span');
            const h1 = document.querySelectorAll('h1');
            const h2 = document.querySelectorAll('h2');
            const h3 = document.querySelectorAll('h3');
            const h4 = document.querySelectorAll('h4');
            const h5 = document.querySelectorAll('h5');
            const a = document.querySelectorAll('a');
            const btns = document.querySelectorAll('btn');

            const breakable_elements = [
                ...google_search_elem,
                ...imgs,
                ...textarea,
                ...span,
                ...h1,
                ...h2,
                ...h3,
                ...h4,
                ...h5,
                ...a,
                ...btns,
            ];

            breakable_elements.forEach(el => {
                el.addEventListener('click', e => {
                    e.stopPropagation();
                    e.preventDefault();      // prevent default link navigation 
                    spawnPhysicsFromDOM(el); // transform element to physics
                });
            });

            // ---------------------
            // Break Box
            // ---------------------
            function breakBox(body) {
                if (!body.meta) return;

                const width = body.meta.width;
                const height = body.meta.height;

                // Stop breaking if too small
                if (width <= body.meta.originalWidth / 10) return;

                const w = width / 2;
                const h = height;

                // Remove the original body
                Composite.remove(world, body);
                bodies = bodies.filter(b => b !== body);

                for (let i = 0; i < 2; i++) {
                    let fragBitmap = null;

                    if (body.meta.bitmap) {
                        const srcTotalW = body.meta.bitmap.width;   // bitmap pixels
                        const srcTotalH = body.meta.bitmap.height;

                        const leftW  = Math.floor(srcTotalW / 2);
                        const rightW = srcTotalW - leftW;

                        const srcW = (i === 0) ? leftW : rightW;
                        const srcX = (i === 0) ? 0 : leftW;

                        // Create fragment bitmap in BITMAP PIXELS
                        fragBitmap = document.createElement("canvas");
                        fragBitmap.width  = srcW;
                        fragBitmap.height = srcTotalH;

                        const bctx = fragBitmap.getContext("2d");

                        // Copy pixels 1:1
                        bctx.drawImage(
                            body.meta.bitmap,
                            srcX, 0,            // source x, y
                            srcW, srcTotalH,    // source size
                            0, 0,               // destination
                            srcW, srcTotalH
                        );
                    }

                    // Create a Matter.js body for the fragment
                    const frag = Bodies.rectangle(
                        body.position.x + (i === 0 ? -w / 2 : w / 2),
                        body.position.y,
                        w,
                        h,
                        { restitution: 0.5 }
                    );

                    // Store metadata
                    frag.meta = {
                        width: w,
                        height: h,
                        bitmap: fragBitmap, // can be null
                        color: body.meta.color || "#4285f4", // fallback color
                        originalWidth: body.meta.originalWidth,
                        originalHeight: body.meta.originalHeight
                    };

                    // Add some separation velocity
                    Matter.Body.setVelocity(frag, {
                        x: (Math.random() - 0.5) * 4,
                        y: -2
                    });

                    Composite.add(world, frag);
                    bodies.push(frag);
                }
            }
            // ---------------------
            // Mouse dragging
            // ---------------------
            const mouse = Mouse.create(canvas);
            mouse.pixelRatio = window.devicePixelRatio || 1;

            const mouseConstraint = MouseConstraint.create(engine,{
                mouse,
                constraint:{ stiffness:0.25, render:{visible:false} }
            });
            Composite.add(world, mouseConstraint);

            // ---------------------
            // Click vs Drag detection
            // ---------------------

            let isDragging = false;
            let mouseDownPos = null;
            const CLICK_DISTANCE_THRESHOLD = 20;

            // Check if mouse is over any physics body
            function isMouseOverBody(mx, my) {
                return bodies.some(body => {
                    if (!body.meta) return false;
                    return Math.abs(mx - body.position.x) < body.meta.width/2 &&
                        Math.abs(my - body.position.y) < body.meta.height/2;
                });
            }

            // Update canvas pointer-events dynamically
            document.addEventListener('mousemove', e => {
                if (isDragging || isMouseOverBody(e.clientX, e.clientY)) {
                    canvas.style.pointerEvents = 'auto';  // interact with canvas objects
                } else {
                    canvas.style.pointerEvents = 'none';  // allow clicks to pass through
                }
            });

            document.addEventListener('mousedown', e => {
                mouseDownPos = { x: e.clientX, y: e.clientY };
            });

            document.addEventListener('mouseup', e => {
                if (!mouseDownPos) return;

                const dx = e.clientX - mouseDownPos.x;
                const dy = e.clientY - mouseDownPos.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                mouseDownPos = null;

                // If dragged, do nothing
                if (dist > CLICK_DISTANCE_THRESHOLD) return;

                // True click → check for physics bodies under cursor
                const mx = e.clientX;
                const my = e.clientY;

                let clickedBody = null;

                bodies.forEach(body => {
                    if(!body.meta) return;

                    if(Math.abs(mx - body.position.x) < body.meta.width/2 &&
                        Math.abs(my - body.position.y) < body.meta.height/2){
                        clickedBody = body;
                    }
                });

                if(clickedBody) {
                    e.stopPropagation(); 
                    e.preventDefault();  
                    breakBox(clickedBody);   
                }
            });

            // Enable drag detection with the mouse constraint
            Events.on(mouseConstraint, 'startdrag', () => {
                isDragging = true; // start dragging → keep pointer-events auto
            });

            Events.on(mouseConstraint, 'enddrag', () => {
                isDragging = false; // drag ended → pointer-events can toggle normally
            });
            // ---------------------
            // Cleanup Fragments
            // ---------------------
            function cleanupTinyBodies() {
                bodies.forEach(body => {
                    if (!body.meta) return;

                    const tooSmall =
                        body.meta.width  <= body.meta.originalWidth  / 12 ||
                        body.meta.height <= body.meta.originalHeight / 12 || 
                        body.meta.width <= 5 ||
                        body.meta.height <= 5;

                    if (tooSmall) {
                        Composite.remove(world, body);
                    }
                });

                bodies = bodies.filter(b => world.bodies.includes(b));
            }

            // ---------------------
            // Render Loop
            // ---------------------
            (function render(){
                cleanupTinyBodies()
                ctx.clearRect(0,0,canvas.width,canvas.height);

                bodies.forEach(body=>{
                    if(!body.meta) return;
                    ctx.save();
                    ctx.translate(body.position.x, body.position.y);
                    ctx.rotate(body.angle);
                    
                    if(body.meta.bitmap){
                        ctx.drawImage(
                            body.meta.bitmap,
                            -body.meta.width/2,
                            -body.meta.height/2,
                            body.meta.width,
                            body.meta.height
                        );
                    } else {
                        ctx.fillStyle = body.meta.color;
                        ctx.fillRect(
                            -body.meta.width/2,
                            -body.meta.height/2,
                            body.meta.width,
                            body.meta.height
                        );
                    }

                    ctx.restore();
                });

                requestAnimationFrame(render);
            })();
}

async function stopScript() {
  if (!isActive) return;
  isActive = false;
  chrome.storage.local.set({ scriptActive: false });
  await window.location.reload();
  isToggling = false;
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "toggle") {
    if (isActive) {
        isToggling = true;
        stopScript();
    } else {
        startScript();
    }
  }
});