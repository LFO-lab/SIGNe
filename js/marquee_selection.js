autowatch = 1;

inlets = 1;
outlets = 4;
// Outlet 0: Marquee Box 2D Drawing
// Outlet 1: jit.phys.picker Queries
// Outlet 2: Selection & Parameter Updates
// Outlet 3: Yellow Wireframe 3D Drawing

// =========================================================
// STATE VARIABLES & SETTINGS
// =========================================================
var isDraggingMarquee = false;
var isDraggingGroup = false;
var isScalingGroup = false;
var isRotatingGroup = false;
var isAdjustingOpacityGroup = false; // NEW: Opacity state
var isScrubbing = false; 
var handledClick = false; 
var prevBtn = 0;
var got3DAnchor = false;

var isAltDown = 0;
var isShiftDown = 0;
var isODown = 0; // NEW: 'o' key state
var linkScale = 1; 
var quantX = "free";
var quantY = "free";

var ROT_MAX = 1.0; 

var winW = 1920; var winH = 1080;
var curX = 0, curY = 0;
var a2x = 0, a2y = 0, c2x = 0, c2y = 0;
var a3x = 0, a3y = 0, c3x = 0, c3y = 0;

var groupCx = 0; var groupCy = 0;
var lastCamX = 0; var lastCamY = 0;
var camInitialized = false;

var liveSet = null;

// =========================================================
// UTILITIES
// =========================================================
function window_size(w, h) { winW = w; winH = h; }
function alt_key(state) { isAltDown = state; }
function shift_key(state) { isShiftDown = state; }
function o_key(state) { isODown = state; } // NEW: Catch 'o' key
function set_link_scale(state) { linkScale = state; }
function set_quant_x(v) { quantX = v; }
function set_quant_y(v) { quantY = v; }

function set_scrubbing(state) {
    isScrubbing = (state === 1);
    if (isScrubbing) {
        isDraggingMarquee = false;
        release_group(); 
        outlet(0, "reset"); 
    }
}

function snap(val, quant) {
    if (quant === "free" || quant === 0 || quant === "0" || typeof quant === "undefined") return val;
    var q = parseFloat(quant);
    if (isNaN(q) || q === 0) return val;
    return Math.round(val * q) / q;
}

function true_wrap(val, max) {
    var v = val - Math.floor(val / max) * max;
    if (v < 0.0) v += max;
    return v;
}

// =========================================================
// MOUSE & RAYCAST LOGIC
// =========================================================
function global_button(state) {
    if (state === 0 && prevBtn === 1) {
        if (isDraggingMarquee) release_selection();
        if (isDraggingGroup || isScalingGroup || isRotatingGroup || isAdjustingOpacityGroup) release_group();
        handledClick = false; 
        prevBtn = 0; 
    }
}

function picker_hit(target, state) {
    if (isScrubbing) return;

    if (state === 1) { 
        if (!handledClick) {
            handledClick = true; 

            // Strip instancing suffixes
            target = target.replace(/_\d+$/, "");
            
            if (target === "BackgroundCollision") {
                isDraggingMarquee = true;
                isDraggingGroup = false;
                isScalingGroup = false;
                isRotatingGroup = false;
                isAdjustingOpacityGroup = false;
                got3DAnchor = false;
                
                a2x = (curX / winW) * 2.0 - 1.0;
                a2y = 1.0 - (curY / winH) * 2.0;
                outlet(1, "getposition");
                
                draw_selections();
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
                
                // NEW: Route interaction based on modifiers (Opacity takes precedence here)
                if (isODown === 1) {
                    isAdjustingOpacityGroup = true;
                    isScalingGroup = false;
                    isRotatingGroup = false;
                    isDraggingGroup = false;
                    isDraggingMarquee = false;
                } else if (isAltDown === 1) {
                    isScalingGroup = true;
                    isRotatingGroup = false;
                    isAdjustingOpacityGroup = false;
                    isDraggingGroup = false;
                    isDraggingMarquee = false;
                } else if (isShiftDown === 1) {
                    isRotatingGroup = true;
                    isScalingGroup = false;
                    isAdjustingOpacityGroup = false;
                    isDraggingGroup = false;
                    isDraggingMarquee = false;
                } else {
                    isDraggingGroup = true;
                    isScalingGroup = false;
                    isRotatingGroup = false;
                    isAdjustingOpacityGroup = false;
                    isDraggingMarquee = false;
                }
                got3DAnchor = false;
                take_centroid_snapshot(registry);
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
        if (isDraggingMarquee && !isScrubbing) {
            c2x = (x / winW) * 2.0 - 1.0;
            c2y = 1.0 - (y / winH) * 2.0;
            
            outlet(0, "reset");
            outlet(0, "glcolor", 0.8, 0.8, 1.0, 1.0);
            outlet(0, "framequad", a2x, a2y, 0.0, c2x, a2y, 0.0, c2x, c2y, 0.0, a2x, c2y, 0.0);
            outlet(1, "getposition");
            
        } else if (isDraggingGroup || isScalingGroup || isRotatingGroup || isAdjustingOpacityGroup) {
            outlet(1, "getposition"); 
        }
    } 
    else if (btn === 0 && prevBtn === 1) {
        if (isDraggingMarquee) release_selection();
        if (isDraggingGroup || isScalingGroup || isRotatingGroup || isAdjustingOpacityGroup) release_group();
        handledClick = false; 
    }
    
    prevBtn = btn;
}

function picker_pos(x, y, z) {
    if (!got3DAnchor && (isDraggingMarquee || isDraggingGroup || isScalingGroup || isRotatingGroup || isAdjustingOpacityGroup)) {
        a3x = x; a3y = y;
        got3DAnchor = true; 
    } else if (got3DAnchor) {
        c3x = x; c3y = y;
        if (isDraggingGroup) update_group_positions();
        else if (isScalingGroup) update_group_scale();
        else if (isRotatingGroup) update_group_rotation();
        else if (isAdjustingOpacityGroup) update_group_opacity(); // NEW
    }
}

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
            
            // NEW: Capture base opacity (defaulting to 1.0 if not yet set)
            var currentOpacity = registry.get(id + "::opacity");
            registry.set(id + "::base_opacity", currentOpacity !== null ? parseFloat(currentOpacity) : 1.0);
            
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
    isAdjustingOpacityGroup = false;
}

// =========================================================
// TRANSFORM UPDATES
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

function update_group_rotation() {
    var deltaX = c3x - a3x;
    
    var deltaRot = deltaX * 1.0; 
    var orbitRad = -deltaRot * (Math.PI * 2.0); 
    
    var cosTheta = Math.cos(orbitRad);
    var sinTheta = Math.sin(orbitRad);
    
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
            
            var dx = bx - groupCx;
            var dy = by - groupCy;
            
            var newX = groupCx + (dx * cosTheta) - (dy * sinTheta);
            var newY = groupCy + (dx * sinTheta) + (dy * cosTheta);
            
            var newRot = true_wrap(brot + deltaRot, ROT_MAX);
            
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

// NEW: Opacity Dragging
function update_group_opacity() {
    // We use vertical mouse movement for opacity
    var deltaY = c3y - a3y;
    
    var registry = new Dict("SigneRegistry");
    var keys = registry.getkeys();
    if (keys == null) return;
    if (typeof keys === "string") keys = [keys];
    
    for (var i = 0; i < keys.length; i++) {
        var id = keys[i];
        if (registry.get(id + "::selected") === 1) {
            var bopac = parseFloat(registry.get(id + "::base_opacity")) || 1.0;
            
            // Add vertical delta (moving up increases opacity)
            var newOpac = bopac + deltaY;
            
            // Clamp strictly between 0.0 and 1.0
            if (newOpac > 1.0) newOpac = 1.0;
            if (newOpac < 0.0) newOpac = 0.0;
            
            registry.set(id + "::opacity", newOpac);
            
            outlet(2, "send", id);
            outlet(2, "opacity", newOpac);
        }
    }
    // Note: We don't technically need to call draw_selections() here since 
    // opacity doesn't change the wireframe size, but it's safe to keep consistent.
}

function release_selection() {
    if (isScrubbing) return; 

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
        
        var count = registry.get(id + "::count");
        if (count == null) count = 1;
        var spacing = registry.get(id + "::spacing") || 0.0;
        
        var isSelected = 0;
        
        for (var j = 0; j < count; j++) {
            var instanceX = objX + (j * spacing);
            var objMinX = instanceX - scaleX; var objMaxX = instanceX + scaleX;
            var objMinY = objY - scaleY; var objMaxY = objY + scaleY;
            
            if (minX <= objMaxX && maxX >= objMinX && minY <= objMaxY && maxY >= objMinY) {
                isSelected = 1;
                break; 
            }
        }
        
        registry.set(id + "::selected", isSelected);
        outlet(2, "send", id); 
        outlet(2, "selected", isSelected); 
    }
    draw_selections();
}

// =========================================================
// UI DIAL INTERACTIONS 
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

// NEW: UI interaction for Opacity
function ui_opacity(id, val) {
    var registry = new Dict("SigneRegistry");
    registry.set(id + "::opacity", val);
    outlet(2, "send", id);
    outlet(2, "opacity", val);
}

function ui_count(id, val) {
    var registry = new Dict("SigneRegistry");
    registry.set(id + "::count", val);
    outlet(2, "send", id);
    outlet(2, "count", val);
    draw_selections();
}

function ui_spacing(id, val) {
    var registry = new Dict("SigneRegistry");
    registry.set(id + "::spacing", val);
    outlet(2, "send", id);
    outlet(2, "spacing", val);
    draw_selections();
}

// =========================================================
// CAMERA TRACKING & TRANSPORT
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
        liveSet.set("current_song_time", objX);
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
            
            var count = registry.get(id + "::count");
            if (count == null) count = 1; 
            var spacing = registry.get(id + "::spacing") || 0.0;
            
            var rad = -rot * (Math.PI * 2.0);
            var cosT = Math.cos(rad);
            var sinT = Math.sin(rad);
            
            var tl_x = -sx, tl_y = sy;
            var tr_x = sx,  tr_y = sy;
            var br_x = sx,  br_y = -sy;
            var bl_x = -sx, bl_y = -sy;
            
            for (var j = 0; j < count; j++) {
                var instanceX = x + (j * spacing);
                
                var w_tl_x = instanceX + (tl_x * cosT - tl_y * sinT);
                var w_tl_y = y + (tl_x * sinT + tl_y * cosT);
                
                var w_tr_x = instanceX + (tr_x * cosT - tr_y * sinT);
                var w_tr_y = y + (tr_x * sinT + tr_y * cosT);
                
                var w_br_x = instanceX + (br_x * cosT - br_y * sinT);
                var w_br_y = y + (br_x * sinT + br_y * cosT);
                
                var w_bl_x = instanceX + (bl_x * cosT - bl_y * sinT);
                var w_bl_y = y + (bl_x * sinT + bl_y * cosT);
                
                outlet(3, "glbegin", "line_loop");
                outlet(3, "glvertex", w_tl_x, w_tl_y, 0.0);
                outlet(3, "glvertex", w_tr_x, w_tr_y, 0.0);
                outlet(3, "glvertex", w_br_x, w_br_y, 0.0);
                outlet(3, "glvertex", w_bl_x, w_bl_y, 0.0);
                outlet(3, "glend");
            }
        }
    }
}