inlets = 1;
outlets = 3;
// Outlet 0: Drawing commands to jit.gl.sketch
// Outlet 1: Queries to jit.phys.picker
// Outlet 2: Selection state to your forward object

var isDragging = false;
var validTarget = false;
var got3DAnchor = false;

var winW = 1920;
var winH = 1080;

// 2D Screen Anchors
var a2x = 0, a2y = 0, c2x = 0, c2y = 0;
// 3D World Anchors
var a3x = 0, a3y = 0, c3x = 0, c3y = 0;

// Update window dimensions dynamically
function window_size(w, h) {
    winW = w; winH = h;
}

// 1. FAILSAFE: Global OS Mouse Check
function global_button(state) {
    if (state === 0 && isDragging) {
        release_selection(); // Force release if OS says the mouse is up
    }
}

// 2. GATING: Did we hit the background or an object?
function picker_hit(target, state) {
    if (target === "BackgroundCollision" && state === 1) {
        validTarget = true;
    } else if (state === 1) {
        validTarget = false;
    }
}

// 3. UI LOGIC: Tracking the mouse movement
function screen_mouse(x, y, btn) {
    if (btn === 1 && !isDragging && validTarget) {
        // Start Dragging
        isDragging = true;
        got3DAnchor = false;
        
        // Store 2D Anchor & Normalize
        a2x = (x / winW) * 2.0 - 1.0;
        a2y = 1.0 - (y / winH) * 2.0;
        
        // Request 3D World Anchor
        outlet(1, "getposition");
        
    } else if (btn === 1 && isDragging) {
        // Update 2D Drag coordinates
        c2x = (x / winW) * 2.0 - 1.0;
        c2y = 1.0 - (y / winH) * 2.0;
        
        // Draw the Marquee
        outlet(0, "reset");
        outlet(0, "glcolor", 0.8, 0.8, 1.0, 1.0);
        outlet(0, "framequad", a2x, a2y, 0.0, c2x, a2y, 0.0, c2x, c2y, 0.0, a2x, c2y, 0.0);
        
        // Request updated 3D Drag coordinates
        outlet(1, "getposition");
        
    } else if (btn === 0 && isDragging) {
        // Standard Mouse Release
        release_selection();
    }
}

// 4. WORLD LOGIC: Receiving the 3D Coordinates
function picker_pos(x, y, z) {
    if (isDragging && !got3DAnchor) {
        // The VERY FIRST coordinate received after clicking becomes the anchor
        a3x = x; a3y = y;
        got3DAnchor = true; 
    } else if (isDragging) {
        c3x = x; c3y = y;
    }
}

// 5. SELECTION LOGIC: Execute Math & Update
function release_selection() {
    isDragging = false;
    validTarget = false;
    
    // Clear the sketch instantly
    outlet(0, "reset");
    
    // Sort boundaries
    var minX = Math.min(a3x, c3x); var maxX = Math.max(a3x, c3x);
    var minY = Math.min(a3y, c3y); var maxY = Math.max(a3y, c3y);
    
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
        
        var objMinX = objX - (scaleX); var objMaxX = objX + (scaleX);
        var objMinY = objY - (scaleY); var objMaxY = objY + (scaleY);
        
        var isSelected = 0;
        if (minX <= objMaxX && maxX >= objMinX && minY <= objMaxY && maxY >= objMinY) {
            isSelected = 1;
        }
        
        registry.set(id + "::selected", isSelected);
        
        // Output ID and state to the Max patch
        outlet(2, id, isSelected); 
    }
}