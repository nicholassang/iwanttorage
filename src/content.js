import html2canvas from "html2canvas";

// Ping back to pop.js for inital handshake
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "ping") {
    sendResponse({ ready: true });
  }
});

// When user reloads, run script
window.addEventListener("beforeunload", () => {
    chrome.storage.local.set({ scriptActive: false, isReloading: false });
});


// Prevent double injection of canvas
if (!window.__IWANTTORAGE_SCRIPT_LOADED__) {
  window.__IWANTTORAGE_SCRIPT_LOADED__ = true;

// Toggling logic
let isActive = false;
let isToggling = false;
let isReloading = false; 

chrome.storage.local.get("isReloading", (data) => {
  if (data.isReloading) {
    chrome.storage.local.set({ isReloading: false });
    isReloading = false;
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action !== "toggle") return;

  if (isToggling || isReloading) {
    sendResponse({ success: false, busy: true, isActive });
    return true;
  }

  isToggling = true;

  if (isActive) {
    stopScriptSafe(sendResponse);
  } else {
    startScriptSafe(sendResponse);
  }

  return true; 
});

function startScriptSafe(sendResponse) {
  if (isActive) {
    isToggling = false;
    if (sendResponse) sendResponse({ success: true, isActive });
    return;
  }

  isActive = true;
  chrome.storage.local.set({ scriptActive: true });

  startScript(); 

  setTimeout(() => {
    isToggling = false;
    if (sendResponse) sendResponse({ success: true, isActive });
  }, 300);
}

async function stopScriptSafe(sendResponse) {
  if (!isActive) {
    isToggling = false;
    if (sendResponse) sendResponse({ success: true, isActive });
    return;
  }

  isActive = false;
  isReloading = true; 
  await chrome.storage.local.set({ scriptActive: false, isReloading: true });

  if (sendResponse) sendResponse({ success: true, isActive });

  await new Promise(r => setTimeout(r, 150));
  window.location.reload();
}

// Flamethrower
let mousePos = { x: 0, y: 0 };
let emitter = { x: 0, y: 0 };

document.addEventListener("mousemove", (e) => {
    mousePos.x = e.clientX;
    mousePos.y = e.clientY;
    emitter.x = e.clientX;
    emitter.y = e.clientY;
});

function startScript() {
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
            canvas.tabIndex = 0;     
            canvas.style.outline = "none";
            canvas.focus();         
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
            // Cursor & Flamethrower Mode
            // ---------------------
let mode = "mouse";
let flames = [];
let shooting = false;
let lastFlameTime = 0;
const flameInterval = 40;
let emitterAngle = 0;

function drawCursor() {
    ctx.save();
    ctx.translate(mousePos.x, mousePos.y);

    if (mode === "mouse") {
        ctx.strokeStyle = "rgba(80,150,255,0.9)";
        ctx.shadowColor = "rgba(80,150,255,0.8)";
    } else {
        ctx.strokeStyle = "rgba(255,120,40,0.95)";
        ctx.shadowColor = "rgba(255,80,0,1)";
    }

    ctx.lineWidth = 2;
    ctx.shadowBlur = 12;

    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.stroke();

    if (mode === "flamethrower") {
        ctx.save();
        ctx.rotate(emitterAngle);

        ctx.lineWidth = 3;
        ctx.shadowBlur = 18;
        ctx.shadowColor = "rgba(255,120,40,1)";

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(18, 0);
        ctx.stroke();

        ctx.restore();
    }

    ctx.restore();
}

let turningLeft = false;
let turningRight = false;

document.addEventListener("keydown", e => {
    if (e.key === "a") turningLeft = true;
    if (e.key === "d") turningRight = true;
    if (e.key.toLowerCase() === "f") {
        mode = mode === "mouse" ? "flamethrower" : "mouse";
        console.log("Mode switched to", mode);
    }
});

document.addEventListener("keyup", e => {
    if (e.key === "d") turningLeft = false;
    if (e.key === "a") turningRight = false;
});

document.addEventListener("mousedown", () => {
    if (mode === "flamethrower") shooting = true;
});

document.addEventListener("mouseup", () => shooting = false);

function spawnFlame(x, y, angle) {
    const speed = 5 + Math.random() * 5;
    flames.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        birth: Date.now(),
        damage: 5
    });
}

// Single flame loop in beforeUpdate
Events.on(engine, "beforeUpdate", () => {
    if (mode === "flamethrower" && shooting && Date.now() - lastFlameTime > flameInterval) {
        spawnFlame(emitter.x, emitter.y, emitterAngle);
        lastFlameTime = Date.now();
    }

    // Move flames & collision
    flames.forEach(f => {
        f.x += f.vx;
        f.y += f.vy;

        bodies.forEach(b => {
            if (!b.meta) return;
            if (Math.abs(f.x - b.position.x) < b.meta.width/2 &&
                Math.abs(f.y - b.position.y) < b.meta.height/2) {
                if (!b.meta.hp) {
                    if (b.meta.bitmap) {
                        b.meta.hp = 300;
                        b.meta.maxHP = 300;
                    } else {
                        b.meta.hp = 100;
                        b.meta.maxHP = 100; 
                    }
                }
                b.meta.hp -= f.damage;

                const maxHP = b.meta.maxHP || 100; // store maxHP per object
                const hpRatio = Math.max(0, b.meta.hp / maxHP); // 1 = full HP, 0 = dead
                const burntShade = Math.floor(255 * hpRatio); // scales 255 → 0 as HP decreases

                if (b.meta.bitmap) {
                    // slower darkening for DOM objects
                    b.meta.color = `rgb(${Math.floor(burntShade)},${Math.floor(burntShade/2)},0)`;
                } else {
                    // normal boxes can darken faster
                    b.meta.color = `rgb(${Math.floor(burntShade)},${Math.floor(burntShade/2)},0)`;
                }

                if (b.meta.hp <= 0) breakBox(b);
            }
        });
    });

    // Remove old flames
    flames = flames.filter(f => Date.now() - f.birth < 800);
});

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
            let boundaries = [];

            function createBoundaries() {
                boundaries.forEach(b => Composite.remove(world, b));
                boundaries = [];

                const floor = Bodies.rectangle(window.innerWidth/2, window.innerHeight + 40, window.innerWidth*2, 80, { isStatic:true });
                const ceiling = Bodies.rectangle(window.innerWidth/2, -40, window.innerWidth*2, 80, { isStatic:true });
                const leftWall = Bodies.rectangle(-40, window.innerHeight/2, 80, window.innerHeight*2, { isStatic:true });
                const rightWall = Bodies.rectangle(window.innerWidth + 40, window.innerHeight/2, 80, window.innerHeight*2, { isStatic:true });

                boundaries.push(floor, ceiling, leftWall, rightWall);
                Composite.add(world, boundaries);
            }

            // Initial call
            createBoundaries();

            // Update on window resize
            window.addEventListener('resize', () => {
                resizeCanvas();  
                createBoundaries();
            });
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
                    // Remove the original DOM element
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
            const BREAKABLE_SELECTORS = [
            '#rso > div',
            'img',
            'textarea',
            'span',
            'h1', 'h2', 'h3', 'h4', 'h5',
            'a', 'button', 'p', 'input',
            ];

            function registerBreakableElements() {
                const elements = document.querySelectorAll(BREAKABLE_SELECTORS.join(','));
                elements.forEach(el => {
                    if (el._isRegistered) return; 
                    el._isRegistered = true;

                    el.addEventListener('click', e => {
                        e.stopPropagation();
                        e.preventDefault();
                        spawnPhysicsFromDOM(el);
                    });
                });
            }

            setInterval(registerBreakableElements, 1500);

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
                        const srcTotalW = body.meta.bitmap.width;   
                        const srcTotalH = body.meta.bitmap.height;

                        const leftW  = Math.floor(srcTotalW / 2);
                        const rightW = srcTotalW - leftW;

                        const srcW = (i === 0) ? leftW : rightW;
                        const srcX = (i === 0) ? 0 : leftW;

                        // fragment bitmap pixels
                        fragBitmap = document.createElement("canvas");
                        fragBitmap.width  = srcW;
                        fragBitmap.height = srcTotalH;

                        const bctx = fragBitmap.getContext("2d");

                        bctx.drawImage(
                            body.meta.bitmap,
                            srcX, 0,            
                            srcW, srcTotalH,    
                            0, 0,               
                            srcW, srcTotalH
                        );
                    }

                    // Matter.js fragment
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
                        bitmap: fragBitmap, 
                        color: body.meta.color || "#4285f4", 
                        originalWidth: body.meta.originalWidth,
                        originalHeight: body.meta.originalHeight
                    };

                    // Separation velocity
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
                    canvas.style.pointerEvents = 'auto'; 
                } else {
                    canvas.style.pointerEvents = 'none';  
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
                isDragging = true; 
            });

            Events.on(mouseConstraint, 'enddrag', () => {
                isDragging = false; 
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
                        // Darken overlay
                        if (body.meta.hp && body.meta.hp < 100) {
                            const alpha = (100 - body.meta.hp) / 100;
                            ctx.fillStyle = `rgba(0,0,0,${alpha})`;
                            ctx.fillRect(
                                -body.meta.width / 2,
                                -body.meta.height / 2,
                                body.meta.width,
                                body.meta.height
                            );
                        }
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

                flames.forEach(f => {
                    ctx.save();
                    ctx.translate(f.x, f.y);
                    ctx.fillStyle = "#ff5722";
                    ctx.beginPath();
                    ctx.arc(0, 0, 6, 0, Math.PI*2);
                    ctx.fill();
                    ctx.restore();
                });
                if (turningLeft)  emitterAngle -= 0.05;
                if (turningRight) emitterAngle += 0.05;
                drawCursor();
                requestAnimationFrame(render);
            })();
}
}