inlets = 1;
outlets = 3;
// Outlet 0: Drawing commands to jit.gl.sketch
// Outlet 1: Queries to jit.phys.picker
// Outlet 2: Selection state to your forward object

var isDragging = false;
var handledClick = false; // Locks the raycast target evaluation!
var prevBtn = 0;
var got3DAnchor = false;

var winW = 1920;
var winH = 1080;

var curX = 0;
var curY = 0;

var a2x = 0, a2y = 0, c2x = 0, c2y = 0;
var a3x = 0, a3y = 0, c3x = 0, c3y = 0;

function window_size(w, h) { 
    winW = w; 
    winH = h; 
}

// 1. FAILSAFE: Global OS Mouse Check
function global_button(state) {
    // If the OS says the mouse is up, but our patch missed it:
    if (state === 0 && prevBtn === 1) {
        if (isDragging) {
            release_selection();
        }
        handledClick = false; // Force unlock
        prevBtn = 0; 
    }
}

// 2. GATING: Evaluate the hit ONLY on the very first touch of a click!
function picker_hit(target, state) {
    if (state === 1) { 
        // If we haven't locked in a click decision yet...
        if (!handledClick) {
            handledClick = true; // Lock it! No more target changes until release.
            
            if (target === "BackgroundCollision") {
                // Initial click was on the background. Start dragging!
                isDragging = true;
                got3DAnchor = false;
                
                a2x = (curX / winW) * 2.0 - 1.0;
                a2y = 1.0 - (curY / winH) * 2.0;
                
                outlet(1, "getposition");
            } else {
                // Initial click was on an object. Do not draw a marquee.
                isDragging = false;
            }
        }
    }
}

// 3. UI LOGIC: Continuously track coordinates and draw
function screen_mouse(x, y, btn) {
    curX = x;
    curY = y;
    
    // If the picker locked us into a background drag, draw the box!
    if (btn === 1 && isDragging) {
        c2x = (x / winW) * 2.0 - 1.0;
        c2y = 1.0 - (y / winH) * 2.0;
        
        outlet(0, "reset");
        outlet(0, "glcolor", 0.8, 0.8, 1.0, 1.0);
        outlet(0, "framequad", a2x, a2y, 0.0, c2x, a2y, 0.0, c2x, c2y, 0.0, a2x, c2y, 0.0);
        
        outlet(1, "getposition");
    } 
    // Handle the mouse release safely
    else if (btn === 0 && prevBtn === 1) {
        if (isDragging) {
            release_selection();
        }
        // ONLY unlock the click state when the mouse is physically released!
        handledClick = false; 
    }
    
    prevBtn = btn;
}

// 4. WORLD LOGIC: Receiving the 3D Coordinates
function picker_pos(x, y, z) {
    if (isDragging && !got3DAnchor) {
        a3x = x; 
        a3y = y;
        got3DAnchor = true; 
    } else if (isDragging) {
        c3x = x; 
        c3y = y;
    }
}

// 5. SELECTION LOGIC: Execute Math & Broadcast Updates
function release_selection() {
    isDragging = false;
    
    outlet(0, "reset");
    
    var minX = Math.min(a3x, c3x); 
    var maxX = Math.max(a3x, c3x);
    var minY = Math.min(a3y, c3y); 
    var maxY = Math.max(a3y, c3y);
    
    var registry = new Dict("SigneRegistry");
    var keys = registry.getkeys();
    
    if (keys == null) return;
    if (typeof keys === "string") keys = [keys];
    
    for (var i = 0; i < keys.length; i++) {
        var id = keys[i];
        
        var objX = registry.get(id + "::x");
        var objY = registry.get(id + "::y");
        var scaleX = registry.get(id + "::scale_x") || 0.0;
        var scaleY = registry.get(id + "::scale_y") || 0.0;
        
        // Scale math without division
        var objMinX = objX - scaleX; 
        var objMaxX = objX + scaleX;
        var objMinY = objY - scaleY; 
        var objMaxY = objY + scaleY;
        
        var isSelected = 0;
        if (minX <= objMaxX && maxX >= objMinX && minY <= objMaxY && maxY >= objMinY) {
            isSelected = 1;
        }
        
        registry.set(id + "::selected", isSelected);
        
        outlet(2, "send", id); 
        outlet(2, "selected", isSelected); 
    }
}