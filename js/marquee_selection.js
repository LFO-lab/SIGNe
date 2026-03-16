inlets = 1;
outlets = 3;
// Outlet 0: Drawing commands to jit.gl.sketch
// Outlet 1: Queries to jit.phys.picker
// Outlet 2: Selection state & movement to your forward object

var isDraggingMarquee = false;
var isDraggingGroup = false;

var handledClick = false; 
var prevBtn = 0;
var got3DAnchor = false;

// Camera Tracking State ---
var lastCamX = 0;
var lastCamY = 0;
var camInitialized = false;

var winW = 1920;
var winH = 1080;

var curX = 0, curY = 0;
var a2x = 0, a2y = 0, c2x = 0, c2y = 0;
var a3x = 0, a3y = 0, c3x = 0, c3y = 0;

// --- NEW: Quantization State ---
var quantX = "free";
var quantY = "free";

function set_quant_x(v) { quantX = v; }
function set_quant_y(v) { quantY = v; }

function window_size(w, h) { winW = w; winH = h; }

// --- NEW: Snap Math Function ---
function snap(val, quant) {
    if (quant === "free" || quant === 0 || quant === "0" || typeof quant === "undefined") {
        return val;
    }
    var q = parseFloat(quant);
    if (isNaN(q) || q === 0) return val;
    
    // Snaps to the nearest grid increment (e.g., * 4, round, / 4)
    return Math.round(val * q) / q;
}

// ---------------------------------------------------------
// UI DIAL INTERACTION (Called by Child Devices)
// ---------------------------------------------------------
function ui_move_x(id, x) {
    var newX = snap(x, quantX);
    var registry = new Dict("SigneRegistry");
    registry.set(id + "::x", newX);
    
    outlet(2, "send", id);
    outlet(2, "move_x", newX);
}

function ui_move_y(id, y) {
    var newY = snap(y, quantY);
    var registry = new Dict("SigneRegistry");
    registry.set(id + "::y", newY);
    
    outlet(2, "send", id);
    outlet(2, "move_y", newY);
}

// ---------------------------------------------------------
// PINNED / SCREEN SPACE LOGIC
// ---------------------------------------------------------

// Called by the child device's UI Toggle
function set_pinned(id, state) {
    var registry = new Dict("SigneRegistry");
    registry.set(id + "::pinned", state);
}

// Called constantly by your camera's position output
function camera_pos(cx, cy) {
    // If this is the first frame, just store the camera pos and abort
    if (!camInitialized) {
        lastCamX = cx;
        lastCamY = cy;
        camInitialized = true;
        return;
    }
    
    // Calculate how far the camera just moved
    var dCx = cx - lastCamX;
    var dCy = cy - lastCamY;
    
    // If the camera actually moved, push the pinned objects!
    if (dCx !== 0 || dCy !== 0) {
        var registry = new Dict("SigneRegistry");
        var keys = registry.getkeys();
        
        if (keys != null) {
            if (typeof keys === "string") keys = [keys];
            
            for (var i = 0; i < keys.length; i++) {
                var id = keys[i];
                
                // If the object is pinned to the screen...
                if (registry.get(id + "::pinned") === 1) {
                    
                    var oldX = registry.get(id + "::x");
                    var oldY = registry.get(id + "::y");
                    
                    // Move the object by the exact same amount the camera moved
                    var newX = oldX + dCx;
                    var newY = oldY + dCy;
                    
                    registry.set(id + "::x", newX);
                    registry.set(id + "::y", newY);
                    
                    outlet(2, "send", id);
                    outlet(2, "move_x", newX);
                    outlet(2, "move_y", newY);
                }
            }
        }
    }
    
    // Store the current camera position for the next frame
    lastCamX = cx;
    lastCamY = cy;
}

// ---------------------------------------------------------
// MOUSE INTERACTION LOGIC
// ---------------------------------------------------------
function global_button(state) {
    if (state === 0 && prevBtn === 1) {
        if (isDraggingMarquee) release_selection();
        if (isDraggingGroup) release_group();
        handledClick = false; 
        prevBtn = 0; 
    }
}

function picker_hit(target, state) {
    if (state === 1) { 
        if (!handledClick) {
            handledClick = true; 
            
            if (target === "BackgroundCollision") {
                isDraggingMarquee = true;
                isDraggingGroup = false;
                got3DAnchor = false;
                
                a2x = (curX / winW) * 2.0 - 1.0;
                a2y = 1.0 - (curY / winH) * 2.0;
                outlet(1, "getposition");
                
            } else {
                var registry = new Dict("SigneRegistry");
                var isSelected = registry.get(target + "::selected");
                
                if (isSelected !== 1) {
                    var keys = registry.getkeys();
                    if (keys != null) {
                        if (typeof keys === "string") keys = [keys];
                        for (var i = 0; i < keys.length; i++) {
                            registry.set(keys[i] + "::selected", 0);
                            outlet(2, "send", keys[i]);
                            outlet(2, "selected", 0);
                        }
                    }
                    registry.set(target + "::selected", 1);
                    outlet(2, "send", target);
                    outlet(2, "selected", 1);
                }
                
                isDraggingGroup = true;
                isDraggingMarquee = false;
                got3DAnchor = false;
                
                take_group_snapshot(registry);
                outlet(1, "getposition");
            }
        }
    }
}

function screen_mouse(x, y, btn) {
    curX = x; curY = y;
    
    if (btn === 1 && prevBtn === 0) handledClick = false;
    
    if (btn === 1) {
        if (isDraggingMarquee) {
            c2x = (x / winW) * 2.0 - 1.0;
            c2y = 1.0 - (y / winH) * 2.0;
            
            outlet(0, "reset");
            outlet(0, "glcolor", 0.8, 0.8, 1.0, 1.0);
            outlet(0, "framequad", a2x, a2y, 0.0, c2x, a2y, 0.0, c2x, c2y, 0.0, a2x, c2y, 0.0);
            outlet(1, "getposition");
            
        } else if (isDraggingGroup) {
            outlet(1, "getposition"); 
        }
    } 
    else if (btn === 0 && prevBtn === 1) {
        if (isDraggingMarquee) release_selection();
        if (isDraggingGroup) release_group();
        handledClick = false; 
    }
    
    prevBtn = btn;
}

function picker_pos(x, y, z) {
    if (!got3DAnchor && (isDraggingMarquee || isDraggingGroup)) {
        a3x = x; a3y = y;
        got3DAnchor = true; 
    } else if (got3DAnchor) {
        c3x = x; c3y = y;
        if (isDraggingGroup) update_group_positions();
    }
}

function take_group_snapshot(registry) {
    var keys = registry.getkeys();
    if (keys == null) return;
    if (typeof keys === "string") keys = [keys];
    
    for (var i = 0; i < keys.length; i++) {
        var id = keys[i];
        if (registry.get(id + "::selected") === 1) {
            registry.set(id + "::base_x", registry.get(id + "::x"));
            registry.set(id + "::base_y", registry.get(id + "::y"));
        }
    }
}

function update_group_positions() {
    var deltaX = c3x - a3x;
    var deltaY = c3y - a3y;
    
    var registry = new Dict("SigneRegistry");
    var keys = registry.getkeys();
    if (keys == null) return;
    if (typeof keys === "string") keys = [keys];
    
    for (var i = 0; i < keys.length; i++) {
        var id = keys[i];
        if (registry.get(id + "::selected") === 1) {
            // Calculate raw target position
            var rawX = registry.get(id + "::base_x") + deltaX;
            var rawY = registry.get(id + "::base_y") + deltaY;
            
            // --- NEW: Apply Quantization to the dragged positions ---
            var newX = snap(rawX, quantX);
            var newY = snap(rawY, quantY);
            
            registry.set(id + "::x", newX);
            registry.set(id + "::y", newY);
            
            outlet(2, "send", id);
            outlet(2, "move_x", newX);
            outlet(2, "move_y", newY);
        }
    }
}

function release_group() { isDraggingGroup = false; }

function release_selection() {
    isDraggingMarquee = false;
    outlet(0, "reset");
    
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
        
        var objMinX = objX - scaleX; var objMaxX = objX + scaleX;
        var objMinY = objY - scaleY; var objMaxY = objY + scaleY;
        
        var isSelected = 0;
        if (minX <= objMaxX && maxX >= objMinX && minY <= objMaxY && maxY >= objMinY) {
            isSelected = 1;
        }
        
        registry.set(id + "::selected", isSelected);
        outlet(2, "send", id); 
        outlet(2, "selected", isSelected); 
    }
}