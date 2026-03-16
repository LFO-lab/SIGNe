inlets = 1;
outlets = 4;
// Outlet 0: Drawing commands to 2D jit.gl.sketch (Marquee Box)
// Outlet 1: Queries to jit.phys.picker
// Outlet 2: Selection state & commands to your forward object
// Outlet 3: Drawing commands to 3D jit.gl.sketch (Yellow Wireframes)

// --- INTERACTION STATE ---
var isDraggingMarquee = false;
var isDraggingGroup = false;
var isScalingGroup = false;
var isRotatingGroup = false;
var handledClick = false; 
var prevBtn = 0;
var got3DAnchor = false;

// --- MODIFIERS & SETTINGS ---
var isAltDown = 0;
var isShiftDown = 0;
var linkScale = 1; // 1 = Uniform, 0 = Independent
var quantX = "free";
var quantY = "free";

// --- COORDINATES ---
var winW = 1920;
var winH = 1080;
var curX = 0, curY = 0;
var a2x = 0, a2y = 0, c2x = 0, c2y = 0;
var a3x = 0, a3y = 0, c3x = 0, c3y = 0;

// --- CENTROID MATH ---
var groupCx = 0;
var groupCy = 0;

// --- CAMERA TRACKING ---
var lastCamX = 0;
var lastCamY = 0;
var camInitialized = false;

// --- LIVE API ---
var liveSet = null;

// =========================================================
// UTILITIES & CONFIG
// =========================================================
function window_size(w, h) { winW = w; winH = h; }
function alt_key(state) { isAltDown = state; }
function shift_key(state) { isShiftDown = state; }
function set_link_scale(state) { linkScale = state; }
function set_quant_x(v) { quantX = v; }
function set_quant_y(v) { quantY = v; }

function snap(val, quant) {
    if (quant === "free" || quant === 0 || quant === "0" || typeof quant === "undefined") {
        return val;
    }
    var q = parseFloat(quant);
    if (isNaN(q) || q === 0) return val;
    return Math.round(val * q) / q;
}

// =========================================================
// MOUSE & PICKER LOGIC
// =========================================================
function global_button(state) {
    if (state === 0 && prevBtn === 1) {
        if (isDraggingMarquee) release_selection();
        if (isDraggingGroup || isScalingGroup || isRotatingGroup) release_group();
        handledClick = false; 
        prevBtn = 0; 
    }
}

function picker_hit(target, state) {
    if (state === 1) { 
        if (!handledClick) {
            handledClick = true; 
            
            if (target === "BackgroundCollision") {
                // START MARQUEE
                isDraggingMarquee = true;
                isDraggingGroup = false;
                isScalingGroup = false;
                isRotatingGroup = false;
                got3DAnchor = false;
                
                a2x = (curX / winW) * 2.0 - 1.0;
                a2y = 1.0 - (curY / winH) * 2.0;
                outlet(1, "getposition");
                
                draw_selections();
            } else {
                // USER CLICKED AN OBJECT
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
                
                // Route interaction based on modifiers
                if (isAltDown === 1) {
                    isScalingGroup = true;
                    isRotatingGroup = false;
                    isDraggingGroup = false;
                    isDraggingMarquee = false;
                    got3DAnchor = false;
                    take_centroid_snapshot(registry);
                } else if (isShiftDown === 1) {
                    isRotatingGroup = true;
                    isScalingGroup = false;
                    isDraggingGroup = false;
                    isDraggingMarquee = false;
                    got3DAnchor = false;
                    take_centroid_snapshot(registry);
                } else {
                    isDraggingGroup = true;
                    isScalingGroup = false;
                    isRotatingGroup = false;
                    isDraggingMarquee = false;
                    got3DAnchor = false;
                    take_centroid_snapshot(registry); // Safely shares position snapshot logic
                }
                
                outlet(1, "getposition");
                draw_selections();
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
            
        } else if (isDraggingGroup || isScalingGroup || isRotatingGroup) {
            outlet(1, "getposition"); 
        }
    } 
    else if (btn === 0 && prevBtn === 1) {
        if (isDraggingMarquee) release_selection();
        if (isDraggingGroup || isScalingGroup || isRotatingGroup) release_group();
        handledClick = false; 
    }
    
    prevBtn = btn;
}

function picker_pos(x, y, z) {
    if (!got3DAnchor && (isDraggingMarquee || isDraggingGroup || isScalingGroup || isRotatingGroup)) {
        a3x = x; a3y = y;
        got3DAnchor = true; 
    } else if (got3DAnchor) {
        c3x = x; c3y = y;
        if (isDraggingGroup) update_group_positions();
        else if (isScalingGroup) update_group_scale();
        else if (isRotatingGroup) update_group_rotation();
    }
}

// =========================================================
// UNIVERSAL CENTROID SNAPSHOT
// =========================================================
function take_centroid_snapshot(registry) {
    var keys = registry.getkeys();
    if (keys == null) return;
    if (typeof keys === "string") keys = [keys];
    
    var minX = Infinity, maxX = -Infinity;
    var minY = Infinity, maxY = -Infinity;
    var count = 0;
    
    for (var i = 0; i < keys.length; i++) {
        var id = keys[i];
        if (registry.get(id + "::selected") === 1) {
            count++;
            var bx = registry.get(id + "::x");
            var by = registry.get(id + "::y");
            
            registry.set(id + "::base_x", bx);
            registry.set(id + "::base_y", by);
            registry.set(id + "::base_sx", registry.get(id + "::scale_x") || 1.0);
            registry.set(id + "::base_sy", registry.get(id + "::scale_y") || 1.0);
            registry.set(id + "::base_rot", registry.get(id + "::rotation") || 0.0);
            
            if (bx < minX) minX = bx;
            if (bx > maxX) maxX = bx;
            if (by < minY) minY = by;
            if (by > maxY) maxY = by;
        }
    }
    
    if (count > 0) {
        groupCx = (minX + maxX) / 2.0;
        groupCy = (minY + maxY) / 2.0;
    }
}

function release_group() {
    isDraggingGroup = false;
    isScalingGroup = false;
    isRotatingGroup = false;
}

// =========================================================
// POSITION DRAGGING & SELECTION
// =========================================================
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
            var rawX = registry.get(id + "::base_x") + deltaX;
            var rawY = registry.get(id + "::base_y") + deltaY;
            
            var newX = snap(rawX, quantX);
            var newY = snap(rawY, quantY);
            
            registry.set(id + "::x", newX);
            registry.set(id + "::y", newY);
            
            outlet(2, "send", id);
            outlet(2, "move_x", newX);
            outlet(2, "move_y", newY);
        }
    }
    draw_selections();
}

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
    draw_selections();
}

// =========================================================
// SCALE DRAGGING (ALT/OPTION)
// =========================================================
function update_group_scale() {
    var deltaX = c3x - a3x;
    var deltaY = c3y - a3y;
    
    var factorX = 1.0 + deltaX; 
    var factorY = 1.0 + deltaY; 
    
    if (linkScale === 1) factorY = factorX; 
    
    if (factorX < 0.01) factorX = 0.01;
    if (factorY < 0.01) factorY = 0.01;
    
    var registry = new Dict("SigneRegistry");
    var keys = registry.getkeys();
    if (keys == null) return;
    if (typeof keys === "string") keys = [keys];
    
    for (var i = 0; i < keys.length; i++) {
        var id = keys[i];
        if (registry.get(id + "::selected") === 1) {
            var bx = registry.get(id + "::base_x");
            var by = registry.get(id + "::base_y");
            var bsx = registry.get(id + "::base_sx");
            var bsy = registry.get(id + "::base_sy");
            
            var newX = groupCx + ((bx - groupCx) * factorX);
            var newY = groupCy + ((by - groupCy) * factorY);
            var newSx = bsx * factorX;
            var newSy = bsy * factorY;
            
            registry.set(id + "::x", newX);
            registry.set(id + "::y", newY);
            registry.set(id + "::scale_x", newSx);
            registry.set(id + "::scale_y", newSy);
            
            outlet(2, "send", id);
            outlet(2, "move_x", newX);
            outlet(2, "move_y", newY);
            outlet(2, "scale_x", newSx);
            outlet(2, "scale_y", newSy);
        }
    }
    draw_selections();
}

// =========================================================
// ROTATION DRAGGING (SHIFT)
// =========================================================
function update_group_rotation() {
    var deltaX = c3x - a3x;
    
    // Map horizontal mouse movement to degrees (e.g., 1 unit = 90 deg)
    var angleDelta = -deltaX * 90.0; 
    var rad = angleDelta * (Math.PI / 180.0);
    
    var cosTheta = Math.cos(rad);
    var sinTheta = Math.sin(rad);
    
    var registry = new Dict("SigneRegistry");
    var keys = registry.getkeys();
    if (keys == null) return;
    if (typeof keys === "string") keys = [keys];
    
    for (var i = 0; i < keys.length; i++) {
        var id = keys[i];
        if (registry.get(id + "::selected") === 1) {
            
            var bx = registry.get(id + "::base_x");
            var by = registry.get(id + "::base_y");
            var brot = registry.get(id + "::base_rot");
            
            // 1. Distance from centroid
            var dx = bx - groupCx;
            var dy = by - groupCy;
            
            // 2. Apply Orbit Matrix Math
            var newX = groupCx + (dx * cosTheta) - (dy * sinTheta);
            var newY = groupCy + (dx * sinTheta) + (dy * cosTheta);
            
            // 3. Rotate the object itself
            var newRot = brot - angleDelta;
            
            registry.set(id + "::x", newX);
            registry.set(id + "::y", newY);
            registry.set(id + "::rotation", newRot);
            
            outlet(2, "send", id);
            outlet(2, "move_x", newX);
            outlet(2, "move_y", newY);
            outlet(2, "rotation", newRot);
        }
    }
    draw_selections();
}

// =========================================================
// UI DIAL INTERACTIONS (Sent by Child Devices)
// =========================================================
function ui_move_x(id, x) {
    var newX = snap(x, quantX);
    var registry = new Dict("SigneRegistry");
    registry.set(id + "::x", newX);
    
    outlet(2, "send", id);
    outlet(2, "move_x", newX);
    draw_selections();
}

function ui_move_y(id, y) {
    var newY = snap(y, quantY);
    var registry = new Dict("SigneRegistry");
    registry.set(id + "::y", newY);
    
    outlet(2, "send", id);
    outlet(2, "move_y", newY);
    draw_selections();
}

function ui_scale_x(id, val) {
    var registry = new Dict("SigneRegistry");
    registry.set(id + "::scale_x", val);
    outlet(2, "send", id);
    outlet(2, "scale_x", val);
    
    if (linkScale === 1) {
        registry.set(id + "::scale_y", val);
        outlet(2, "send", id);
        outlet(2, "scale_y", val);
    }
    draw_selections();
}

function ui_scale_y(id, val) {
    var registry = new Dict("SigneRegistry");
    registry.set(id + "::scale_y", val);
    outlet(2, "send", id);
    outlet(2, "scale_y", val);
    
    if (linkScale === 1) {
        registry.set(id + "::scale_x", val);
        outlet(2, "send", id);
        outlet(2, "scale_x", val);
    }
    draw_selections();
}

function ui_rotate(id, val) {
    var registry = new Dict("SigneRegistry");
    registry.set(id + "::rotation", val);
    
    outlet(2, "send", id);
    outlet(2, "rotation", val);
    draw_selections();
}

// =========================================================
// CAMERA TRACKING (PINNED OBJECTS)
// =========================================================
function set_pinned(id, state) {
    var registry = new Dict("SigneRegistry");
    registry.set(id + "::pinned", state);
}

function camera_pos(cx, cy) {
    if (!camInitialized) {
        lastCamX = cx; lastCamY = cy;
        camInitialized = true;
        return;
    }
    
    var dCx = cx - lastCamX;
    var dCy = cy - lastCamY;
    
    if (dCx !== 0 || dCy !== 0) {
        var registry = new Dict("SigneRegistry");
        var keys = registry.getkeys();
        var objectsMoved = false;
        
        if (keys != null) {
            if (typeof keys === "string") keys = [keys];
            
            for (var i = 0; i < keys.length; i++) {
                var id = keys[i];
                if (registry.get(id + "::pinned") === 1) {
                    var oldX = registry.get(id + "::x");
                    var oldY = registry.get(id + "::y");
                    
                    var newX = oldX + dCx;
                    var newY = oldY + dCy;
                    
                    registry.set(id + "::x", newX);
                    registry.set(id + "::y", newY);
                    
                    outlet(2, "send", id);
                    outlet(2, "move_x", newX);
                    outlet(2, "move_y", newY);
                    
                    objectsMoved = true;
                }
            }
        }
        if (objectsMoved) draw_selections();
    }
    
    lastCamX = cx; lastCamY = cy;
}

// =========================================================
// TRANSPORT & TIMELINE
// =========================================================
function move_to_transport(id) {
    if (!liveSet) liveSet = new LiveAPI(null, "live_set");
    
    if (liveSet) {
        var timeArr = liveSet.get("current_song_time"); 
        var timeInBeats = timeArr[0];
        
        var targetX = timeInBeats; 
        var newX = snap(targetX, quantX);
        
        var registry = new Dict("SigneRegistry");
        registry.set(id + "::x", newX);
        
        outlet(2, "send", id);
        outlet(2, "move_x", newX);
        draw_selections();
    }
}

function move_transport_to_object(id) {
    if (!liveSet) liveSet = new LiveAPI(null, "live_set");
    
    if (liveSet) {
        var registry = new Dict("SigneRegistry");
        var objX = registry.get(id + "::x");
        var targetBeats = objX; 
        
        liveSet.set("current_song_time", targetBeats);
    }
}

// =========================================================
// VISUAL FEEDBACK (3D SKETCH OUTLINES)
// =========================================================
function draw_selections() {
    var registry = new Dict("SigneRegistry");
    var keys = registry.getkeys();
    
    outlet(3, "reset");
    outlet(3, "glcolor", 1.0, 0.8, 0.0, 1.0); 
    
    if (keys == null) return;
    if (typeof keys === "string") keys = [keys];
    
    for (var i = 0; i < keys.length; i++) {
        var id = keys[i];
        if (registry.get(id + "::selected") === 1) {
            
            var x = registry.get(id + "::x");
            var y = registry.get(id + "::y");
            var sx = registry.get(id + "::scale_x") || 0.0;
            var sy = registry.get(id + "::scale_y") || 0.0;
            var rot = registry.get(id + "::rotation") || 0.0;
            
            // Push a new transformation matrix
            outlet(3, "glpushmatrix");
            
            // Move to the object's center, then rotate around the Z axis
            outlet(3, "gltranslate", x, y, 0.0);
            outlet(3, "glrotate", -rot, 0.0, 0.0, 1.0); 
            
            // Draw the quad around the local 0,0 center
            outlet(3, "framequad", -sx, sy, 0.0, sx, sy, 0.0, sx, -sy, 0.0, -sx, -sy, 0.0);
            
            // Pop the matrix to reset the canvas for the next object!
            outlet(3, "glpopmatrix");
        }
    }
}