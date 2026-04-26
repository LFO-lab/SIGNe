autowatch = 1;

inlets = 1;
outlets = 11; // 0-4 for UI, 5-9 for GPU Triggers

// =========================================================
// STATE VARIABLES & SETTINGS
// =========================================================
var ignoreX = false, ignoreY = false;
var isDraggingMarquee = false, isDraggingGroup = false, isScalingGroup = false;
var isRotatingGroup = false, isAdjustingOpacityGroup = false, isScrubbing = false; 
var handledClick = false, prevBtn = 0, got3DAnchor = false, lastViewportInteractionTime = 0; 
var isAltDown = 0, isShiftDown = 0, isODown = 0, linkScale = 1, activeRatio = 1.0;
var globalPlayheadOffset = 0.0;
var quantX = "free", quantY = "free", quantSpacing = "free";
var isHumanX = 1, isHumanY = 1, isHumanSpacing = 1, snapToTrigger = 0, ROT_MAX = 1.0; 
var winW = 1920, winH = 1080, curX = 0, curY = 0;
var a2x = 0, a2y = 0, c2x = 0, c2y = 0, a3x = 0, a3y = 0, c3x = 0, c3y = 0;
var groupCx = 0, groupCy = 0, lastCamX = 0, lastCamY = 0, camInitialized = false;
var globalAspectRatio = 1.77;
var showAllBounds = 0;

// GLOBAL LIVE API OBJECT (Centralized to save memory)
var liveViewAPI = null;

// =========================================================
// --- MIDI TRIGGERS ---
// =========================================================
var cached_midi_triggers = [];
var last_playhead_x = -1.0;

// =========================================================
// --- CENTRALIZED FRUSTUM CULLING ---
// =========================================================
var currentFirstBar = 0.0;
var currentLastBar = 100.0;

// =========================================================
// GPU MATRICES (SHARED GLOBAL MEMORY BINDING)
// =========================================================
var last_total_instances = -1;
var last_total_midi = -1;

var matPos = new JitterMatrix(4, "float32", 1); matPos.name = "SIGNe_Pos_Data";
var matSym = new JitterMatrix(4, "float32", 1); matSym.name = "SIGNe_Sym_Data";
var matPat = new JitterMatrix(4, "float32", 1); matPat.name = "SIGNe_Pat_Data";
var matScl = new JitterMatrix(4, "float32", 1); matScl.name = "SIGNe_Scl_Data";
var matTil = new JitterMatrix(3, "float32", 1); matTil.name = "SIGNe_Til_Data";
var matMidiPos = new JitterMatrix(3, "float32", 1); matMidiPos.name = "SIGNe_MidiPos_Data";
var matMidiScl = new JitterMatrix(3, "float32", 1); matMidiScl.name = "SIGNe_MidiScl_Data";
var matMidiCol = new JitterMatrix(4, "float32", 1); matMidiCol.name = "SIGNe_MidiCol_Data";

// =========================================================
// SIMULTANEOUS GPU UPLOAD
// =========================================================
var dirty_pos = false;
var dirty_sym = false;
var dirty_pat = false;
var dirty_scl = false;
var dirty_til = false;
var dirty_midi = false;
var needs_recalc = false;

function mark_dirty(pos, sym, pat, scl, til) {
    if (pos) { dirty_pos = true; dirty_midi = true; }
    if (sym) dirty_sym = true;
    if (pat) dirty_pat = true;
    if (scl) { dirty_scl = true; dirty_midi = true; }
    if (til) dirty_til = true;
    needs_recalc = true;
}

function mark_midi_dirty() {
    dirty_midi = true;
    needs_recalc = true;
}

function bang() {
    if (needs_recalc) {
        update_math();
        update_midi_math();
        update_trigger_cache();
        needs_recalc = false;
    }
    if (dirty_pos) { outlet(5, "bang"); dirty_pos = false; }
    if (dirty_sym) { outlet(6, "bang"); dirty_sym = false; }
    if (dirty_pat) { outlet(7, "bang"); dirty_pat = false; }
    if (dirty_scl) { outlet(8, "bang"); dirty_scl = false; }
    if (dirty_til) { outlet(9, "bang"); dirty_til = false; }
    if (dirty_midi) { outlet(10, "bang"); dirty_midi = false; }
}

// =========================================================
// ABLETON LIVE API FOCUS LOGIC (Ping Max Patch)
// =========================================================
function focus_live_device(id) {
    // Tell the specific device to calculate its own path and focus itself
    outlet(2, "send", id);
    outlet(2, "focus_me", 1);
}

// =========================================================
// UTILITIES
// =========================================================
function window_size(w, h) { winW = w; winH = h; }
function alt_key(state) { isAltDown = state; }
function shift_key(state) { isShiftDown = state; }
function o_key(state) { isODown = state; } 
function set_quant_x(v) { quantX = v; quantSpacing = v; } 
function set_quant_y(v) { quantY = v; }
function set_quant_spacing(v) { quantSpacing = v; }
function is_human_x(v) { isHumanX = v; }
function is_human_y(v) { isHumanY = v; }
function is_human_spacing(v) { isHumanSpacing = v; } 
function set_snap_mode(v) { snapToTrigger = v; }

function set_link_scale(state) { 
    linkScale = state; 
    if (linkScale === 1) {
        var registry = new Dict("SigneRegistry");
        var keys = registry.getkeys();
        if (keys != null) {
            if (typeof keys === "string") keys = [keys];
            for (var i = 0; i < keys.length; i++) {
                if (registry.get(keys[i] + "::selected") == 1) {
                    var x = registry.get(keys[i] + "::scale_x") || 1.0;
                    var y = registry.get(keys[i] + "::scale_y") || 1.0;
                    activeRatio = (x !== 0) ? (y / x) : 1.0;
                    break;
                }
            }
        }
    }
}

function set_scrubbing(state) {
    isScrubbing = (state === 1);
    if (isScrubbing) {
        isDraggingMarquee = false;
        release_group(); 
        outlet(0, "reset"); 
    }
}

function set_playhead_offset(val) {
    globalPlayheadOffset = parseFloat(val);
}

function set_aspect_ratio(val) {
    globalAspectRatio = parseFloat(val);
    if (globalAspectRatio <= 0.0) globalAspectRatio = 1.0; // Failsafe
}

function draw_all_bounds(v) {
    showAllBounds = v;
    draw_selections(); // Force an immediate redraw when toggled
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

function lerp(start, end, amt) {
    return (1.0 - amt) * start + amt * end;
}

function rgbToHsl(r, g, b) {
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2.0;

    if (max === min) { h = s = 0; } // achromatic
    else {
        var d = max - min;
        s = l > 0.5 ? d / (2.0 - max - min) : d / (max + min);
        if (max === r) h = (g - b) / d + (g < b ? 6.0 : 0.0);
        else if (max === g) h = (b - r) / d + 2.0;
        else h = (r - g) / d + 4.0;
        h /= 6.0;
    }
    return [h, s, l];
}

function hslToRgb(h, s, l) {
    var r, g, b;
    var hue2rgb = function(p, q, t) {
        if (t < 0.0) t += 1.0;
        if (t > 1.0) t -= 1.0;
        if (t < 1.0/6.0) return p + (q - p) * 6.0 * t;
        if (t < 1.0/2.0) return q;
        if (t < 2.0/3.0) return p + (q - p) * (2.0/3.0 - t) * 6.0;
        return p;
    };

    if (s === 0.0) { r = g = b = l; } // Grayscale
    else {
        var q = l < 0.5 ? l * (1.0 + s) : l + s - l * s;
        var p = 2.0 * l - q;
        r = hue2rgb(p, q, h + 1.0/3.0);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1.0/3.0);
    }
    return [r, g, b];
}

function apply_sat(r, g, b, sat) {
    // 1. Convert to HSL
    var hsl = rgbToHsl(r, g, b);
    
    // 2. Override the native saturation with our dial's value
    var new_s = Math.max(0.0, Math.min(1.0, sat));
    
    // 3. Convert back to RGB and return
    return hslToRgb(hsl[0], new_s, hsl[2]);
}

// =========================================================
// FRUSTUM CULLING
// =========================================================
// Call this from Max whenever the camera/screen scrolls
function update_frustum(first, last) {
    currentFirstBar = parseFloat(first);
    currentLastBar = parseFloat(last);
    // Broadcast the exact width in bars to SIGNe-Background
    messnamed("FrustumWidth", currentLastBar - currentFirstBar);

    check_frustum();
}

// Call this from Max when SIGNe-Background loads and requests the width
function get_frustum_width() {
    var fw = currentLastBar - currentFirstBar;
    if (fw <= 0.0) fw = 20.0; // Safe fallback in case it fires before the camera initializes
    messnamed("FrustumWidth", fw);
}

// Call this whenever a text object moves, scales, or duplicates
function check_frustum() {
    var registry = new Dict("SigneRegistry");
    var keys = registry.getkeys();
    if (keys == null) return;
    if (typeof keys === "string") keys = [keys];

    for (var i = 0; i < keys.length; i++) {
        var id = keys[i];
        
        // Skip Symbols, we only need to cull Text objects
        if (!registry.contains(id + "::text_content")) continue;

        // Safely parse position and grouping numbers
        var x = parseFloat(registry.get(id + "::x")) || 0.0;
        var count = parseInt(registry.get(id + "::count")) || 1;
        var spacing = parseFloat(registry.get(id + "::spacing")) || 0.0;
        var gRot = parseFloat(registry.get(id + "::group_rot")) || 0.0;

        // --- THE FIX: GRAB ACTUAL BOUNDS/SCALE ---
        var sx = parseFloat(registry.get(id + "::bounds_x")); 
        if (isNaN(sx) || sx === 0) sx = parseFloat(registry.get(id + "::scale_x")) || 0.5;
        
        var sy = parseFloat(registry.get(id + "::bounds_y")); 
        if (isNaN(sy) || sy === 0) sy = parseFloat(registry.get(id + "::scale_y")) || 0.5;

        // Calculate the maximum possible radius (hypotenuse) to protect rotated text
        var dynamicMargin = Math.sqrt((sx * sx) + (sy * sy));
        // -----------------------------------------

        // Group rotation in radians for the trigonometry
        var gRad = -gRot * Math.PI * 2.0;
        
        // Calculate the X position of the final duplicated instance
        var endX = x + ((count - 1) * spacing * Math.cos(gRad));

        // Find the absolute center left and right bounds of the group
        var leftEdge = Math.min(x, endX);
        var rightEdge = Math.max(x, endX);

        // Apply the dynamic geometric margin
        leftEdge -= dynamicMargin;
        rightEdge += dynamicMargin;

        // Check if the group overlaps the visible camera bounds
        var inFrustum = 0;
        if (rightEdge > currentFirstBar && leftEdge < currentLastBar) {
            inFrustum = 1;
        }

        // Fire the result directly into the SIGNe-Text instance's gate
        outlet(2, "send", id);
        outlet(2, "in_frustum", inFrustum);
    }
}

// =========================================================
// PURE MATH RAYCASTING
// =========================================================
function get_hit_object(px, py) {
    var registry = new Dict("SigneRegistry");
    var keys = registry.getkeys();
    if (keys == null) return null;
    if (typeof keys === "string") keys = [keys];
    var hitID = null, highestLayer = -Infinity;

    for (var i = 0; i < keys.length; i++) {
        var id = keys[i];
        var objX = parseFloat(registry.get(id + "::x")) || 0.0;
        var objY = parseFloat(registry.get(id + "::y")) || 0.0;
        
        // Safely parse layer
        var layerStr = registry.get(id + "::layer");
        var layer = (layerStr !== null) ? parseFloat(layerStr) : 0.0;
        if (isNaN(layer)) layer = 0.0;

        // Force ABS on bounds in case text bounds output a negative width/height
        var sx = Math.abs(parseFloat(registry.get(id + "::bounds_x"))); 
        if (isNaN(sx) || sx === 0) sx = Math.abs(parseFloat(registry.get(id + "::scale_x"))) || 0.5;
        
        var sy = Math.abs(parseFloat(registry.get(id + "::bounds_y"))); 
        if (isNaN(sy) || sy === 0) sy = Math.abs(parseFloat(registry.get(id + "::scale_y"))) || 0.5;
        
        var rot = parseFloat(registry.get(id + "::rotation")) || 0.0;
        var gRot = parseFloat(registry.get(id + "::group_rot")) || 0.0;
        var count = parseInt(registry.get(id + "::count")) || 1;
        var spacing = parseFloat(registry.get(id + "::spacing")) || 0.0;
        var gCos = Math.cos(-gRot * 2.0 * Math.PI);
        var gSin = Math.sin(-gRot * 2.0 * Math.PI);

        for (var j = 0; j < count; j++) {
            var ix = objX + (j * spacing * gCos), iy = objY + (j * spacing * gSin);
            var dx = px - ix, dy = py - iy;
            var rad = (rot + gRot) * 2.0 * Math.PI;
            var cosT = Math.cos(rad), sinT = Math.sin(rad); // Positive rad for inverse rotation!
            var localX = (dx * cosT) - (dy * sinT), localY = (dx * sinT) + (dy * cosT);
            
            // If the click is inside the bounds...
            if (Math.abs(localX) <= sx && Math.abs(localY) <= sy) {
                // ...AND it is on a higher (or equal) layer than our current winner
                if (layer >= highestLayer) { 
                    highestLayer = layer; 
                    hitID = id; 
                }
            }
        }
    }
    return hitID;
}

// =========================================================
// MOUSE LOGIC (Zero GPU interaction)
// =========================================================
function global_button(state) {
    if (state === 0 && prevBtn === 1) {
        if (isDraggingMarquee) release_selection();
        if (isDraggingGroup || isScalingGroup || isRotatingGroup || isAdjustingOpacityGroup) release_group();
        handledClick = false; prevBtn = 0; 
    }
}

function picker_hit(target, state) {
    if (isScrubbing) return;
    if (state === 1) { 
        if (!handledClick) {
            handledClick = true; lastViewportInteractionTime = new Date().getTime(); 
            var mathHitID = get_hit_object(c3x, c3y);
            
            if (mathHitID == null) {
                isDraggingMarquee = true; isDraggingGroup = false; isScalingGroup = false; isRotatingGroup = false; isAdjustingOpacityGroup = false;
                got3DAnchor = false; a2x = (curX / winW) * 2.0 - 1.0; a2y = 1.0 - (curY / winH) * 2.0;
                outlet(1, "getposition"); draw_selections();
            } else {
                var registry = new Dict("SigneRegistry");
                var isSelected = registry.get(mathHitID + "::selected");
                
                if (isSelected != 1) {
                    var keys = registry.getkeys();
                    if (keys != null) {
                        if (typeof keys === "string") keys = [keys];
                        for (var i = 0; i < keys.length; i++) {
                            registry.set(keys[i] + "::selected", 0);
                            outlet(2, "send", keys[i]); outlet(2, "selected", 0); outlet(2, "selected_via_mouse", 0); 
                        }
                    }
                    registry.set(mathHitID + "::selected", 1);
                    update_properties_window(mathHitID);
					outlet(4, mathHitID, 1);
                    outlet(2, "send", mathHitID); outlet(2, "selected", 1);

                    if (linkScale === 1) {
                        var x = registry.get(mathHitID + "::scale_x") || 1.0, y = registry.get(mathHitID + "::scale_y") || 1.0;
                        activeRatio = (x !== 0) ? (y / x) : 1.0;
                    }
                }
                outlet(2, "send", mathHitID); outlet(2, "selected_via_mouse", 1);
                
                focus_live_device(mathHitID);
                
                if (isODown === 1) isAdjustingOpacityGroup = true;
                else if (isAltDown === 1) isScalingGroup = true;
                else if (isShiftDown === 1) isRotatingGroup = true;
                else isDraggingGroup = true;
                
                got3DAnchor = false; take_centroid_snapshot(registry);
                outlet(1, "getposition"); draw_selections();
            }
        }
    }
}

function screen_mouse(x, y, btn) {
    curX = x; curY = y;
    if (btn === 1 && prevBtn === 0) handledClick = false;
    if (btn === 1) {
        if (isDraggingMarquee && !isScrubbing) {
            c2x = (x / winW) * 2.0 - 1.0; c2y = 1.0 - (y / winH) * 2.0;
            outlet(0, "reset"); outlet(0, "glcolor", 0.8, 0.8, 1.0, 1.0);
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
        a3x = x; a3y = y; c3x = x; c3y = y; got3DAnchor = true; 
    } else if (got3DAnchor) {
        c3x = x; c3y = y;
        if (isDraggingGroup) update_group_positions();
        else if (isScalingGroup) update_group_scale();
        else if (isRotatingGroup) update_group_rotation();
        else if (isAdjustingOpacityGroup) update_group_opacity(); 
    }
}

function take_centroid_snapshot(registry) {
    var keys = registry.getkeys();
    if (keys == null) return;
    if (typeof keys === "string") keys = [keys];
    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, count = 0;
    for (var i = 0; i < keys.length; i++) {
        var id = keys[i];
        if (registry.get(id + "::selected") == 1) { 
            count++;
            var bx = registry.get(id + "::x"), by = registry.get(id + "::y");
            registry.set(id + "::base_x", bx); registry.set(id + "::base_y", by);
            registry.set(id + "::base_sx", registry.get(id + "::scale_x") || 1.0);
            registry.set(id + "::base_sy", registry.get(id + "::scale_y") || 1.0);
            registry.set(id + "::base_rot", registry.get(id + "::rotation") || 0.0);
            var currentOpacity = registry.get(id + "::opacity");
            registry.set(id + "::base_opacity", currentOpacity !== null ? parseFloat(currentOpacity) : 1.0);
            if (bx < minX) minX = bx; if (bx > maxX) maxX = bx;
            if (by < minY) minY = by; if (by > maxY) maxY = by;
        }
    }
    if (count > 0) { groupCx = (minX + maxX) / 2.0; groupCy = (minY + maxY) / 2.0; }
}

function release_group() {
    isDraggingGroup = false; isScalingGroup = false; isRotatingGroup = false; isAdjustingOpacityGroup = false;
}

// =========================================================
// TRANSFORM UPDATES (View-Origin)
// =========================================================
function update_group_positions() {
    var deltaX = c3x - a3x; var deltaY = c3y - a3y;
    var registry = new Dict("SigneRegistry");
    var keys = registry.getkeys();
    if (keys == null) return;
    if (typeof keys === "string") keys = [keys];
    for (var i = 0; i < keys.length; i++) {
        var id = keys[i];
        if (registry.get(id + "::selected") == 1) { 
            if (registry.get(id + "::locked") == 1) continue;
            var bx = registry.get(id + "::base_x"); var newX;
            if (snapToTrigger === 1) {
                var tOff = registry.get(id + "::trigger_offset") || 0.0;
                newX = snap(bx + tOff + deltaX, quantX) - tOff;
            } else { newX = snap(bx + deltaX, quantX); }
            var newY = snap(registry.get(id + "::base_y") + deltaY, quantY);
            registry.set(id + "::x", newX); registry.set(id + "::y", newY);
            outlet(2, "send", id); outlet(2, "move_x", newX); outlet(2, "move_y", newY);
        }
    }
    draw_selections();
    mark_dirty(1, 0, 0, 0, 0); // Pos dirty
    check_frustum();
}

function update_group_scale() {
    var deltaX = c3x - a3x; var factorX = 1.0 + deltaX; 
    var factorY = (linkScale === 1) ? factorX : (1.0 + (c3y - a3y));
    if (factorX < 0.01) factorX = 0.01; if (factorY < 0.01) factorY = 0.01;
    var registry = new Dict("SigneRegistry");
    var keys = registry.getkeys();
    if (keys == null) return;
    if (typeof keys === "string") keys = [keys];
    
    for (var i = 0; i < keys.length; i++) {
        var id = keys[i];
        if (registry.get(id + "::selected") == 1) { 
            if (registry.get(id + "::locked") == 1) continue;
            var newX = groupCx + ((registry.get(id + "::base_x") - groupCx) * factorX);
            var newY = groupCy + ((registry.get(id + "::base_y") - groupCy) * factorY);
            var newSx = registry.get(id + "::base_sx") * factorX;
            var newSy = registry.get(id + "::base_sy") * factorY;
            
            registry.set(id + "::x", newX); registry.set(id + "::y", newY);
            registry.set(id + "::scale_x", newSx); registry.set(id + "::scale_y", newSy);
            
            outlet(2, "send", id); 
            outlet(2, "move_x", newX); outlet(2, "move_y", newY);
            outlet(2, "scale_x", newSx); outlet(2, "scale_y", newSy);    
            outlet(2, "ui_x", newSx); outlet(2, "ui_y", newSy);
        }
    }
    draw_selections();
    mark_dirty(1, 0, 0, 1, 0); // Pos & Scl dirty
    check_frustum();
}

function update_group_rotation() {
    var deltaRot = (c3x - a3x); var orbitRad = -deltaRot * (Math.PI * 2.0); 
    var cosTheta = Math.cos(orbitRad); var sinTheta = Math.sin(orbitRad);
    var registry = new Dict("SigneRegistry");
    var keys = registry.getkeys();
    if (keys == null) return;
    if (typeof keys === "string") keys = [keys];
    for (var i = 0; i < keys.length; i++) {
        var id = keys[i];
        if (registry.get(id + "::selected") == 1) { 
            if (registry.get(id + "::locked") == 1) continue;
            var dx = registry.get(id + "::base_x") - groupCx, dy = registry.get(id + "::base_y") - groupCy;
            var newX = groupCx + (dx * cosTheta) - (dy * sinTheta), newY = groupCy + (dx * sinTheta) + (dy * cosTheta);
            var newRot = true_wrap(registry.get(id + "::base_rot") + deltaRot, ROT_MAX);
            registry.set(id + "::x", newX); registry.set(id + "::y", newY); registry.set(id + "::rotation", newRot);
            outlet(2, "send", id); outlet(2, "move_x", newX); outlet(2, "move_y", newY); outlet(2, "rotation", newRot);
        }
    }
    draw_selections();
    mark_dirty(1, 0, 0, 0, 0); // Pos dirty
    check_frustum();
}

function update_group_opacity() {
    var deltaY = c3y - a3y;
    var registry = new Dict("SigneRegistry");
    var keys = registry.getkeys();
    if (keys == null) return;
    if (typeof keys === "string") keys = [keys];
    for (var i = 0; i < keys.length; i++) {
        var id = keys[i];
        if (registry.get(id + "::selected") == 1) { 
            if (registry.get(id + "::locked") == 1) continue;
            var newOpac = Math.max(0, Math.min(1, parseFloat(registry.get(id + "::base_opacity")) + deltaY));
            registry.set(id + "::opacity", newOpac);
            outlet(2, "send", id); outlet(2, "opacity", newOpac);
        }
    }
    draw_selections();
    mark_dirty(0, 1, 1, 0, 0); 
}

function release_selection() {
    if (isScrubbing) return; 
    isDraggingMarquee = false; outlet(0, "reset");
    lastViewportInteractionTime = new Date().getTime(); 

    var minX = Math.min(a3x, c3x), maxX = Math.max(a3x, c3x), minY = Math.min(a3y, c3y), maxY = Math.max(a3y, c3y);
    var registry = new Dict("SigneRegistry");
    var keys = registry.getkeys();
    if (keys == null) return;
    if (typeof keys === "string") keys = [keys];
    
    var leftmostID = null, leftmostX = Infinity;
    
    for (var i = 0; i < keys.length; i++) {
        var id = keys[i];
        var isSelected = 0;
        var objX = registry.get(id + "::x"), objY = registry.get(id + "::y");
        var sx = registry.get(id + "::bounds_x"); if (sx == null) sx = registry.get(id + "::scale_x") || 0.0;
        var sy = registry.get(id + "::bounds_y"); if (sy == null) sy = registry.get(id + "::scale_y") || 0.0;
        var rot = registry.get(id + "::rotation") || 0.0;
        var gRot = registry.get(id + "::group_rot") || 0.0;
        var count = registry.get(id + "::count") || 1;
        var spacing = registry.get(id + "::spacing") || 0.0;

        var gRad = -gRot * (Math.PI * 2.0);
        var gCosT = Math.cos(gRad), gSinT = Math.sin(gRad);
        var drawRad = -(rot + gRot) * 2.0 * Math.PI;
        var cosT = Math.cos(drawRad), sinT = Math.sin(drawRad);
        var invRad = (rot + gRot) * 2.0 * Math.PI;
        var invCos = Math.cos(invRad), invSin = Math.sin(invRad);

        for (var j = 0; j < count; j++) {
            var ix = objX + (j * spacing * gCosT), iy = objY + (j * spacing * gSinT);
            var p1x = ix + (-sx*cosT - sy*sinT), p1y = iy + (-sx*sinT + sy*cosT);
            var p2x = ix + ( sx*cosT - sy*sinT), p2y = iy + ( sx*sinT + sy*cosT);
            var p3x = ix + ( sx*cosT + sy*sinT), p3y = iy + ( sx*sinT - sy*cosT);
            var p4x = ix + (-sx*cosT + sy*sinT), p4y = iy + (-sx*sinT - sy*cosT);

            var hit = false;
            if (ix >= minX && ix <= maxX && iy >= minY && iy <= maxY) hit = true;
            else if (p1x >= minX && p1x <= maxX && p1y >= minY && p1y <= maxY) hit = true;
            else if (p2x >= minX && p2x <= maxX && p2y >= minY && p2y <= maxY) hit = true;
            else if (p3x >= minX && p3x <= maxX && p3y >= minY && p3y <= maxY) hit = true;
            else if (p4x >= minX && p4x <= maxX && p4y >= minY && p4y <= maxY) hit = true;
            else {
                var mqC = [[minX, minY], [maxX, minY], [maxX, maxY], [minX, maxY]];
                for(var c = 0; c < 4; c++) {
                    var dx = mqC[c][0] - ix, dy = mqC[c][1] - iy;
                    var lx = (dx * invCos) - (dy * invSin);
                    var ly = (dx * invSin) + (dy * invCos);
                    if (Math.abs(lx) <= sx && Math.abs(ly) <= sy) { hit = true; break; }
                }
            }

            if (hit) {
                isSelected = 1; 
                if (objX < leftmostX) { leftmostX = objX; leftmostID = id; } 
                break; 
            }
        }
        
        registry.set(id + "::selected", isSelected);
        outlet(4, id, (id === leftmostID) ? 1 : 0);
    }
    
    // --- RESET PROPERTIES WINDOW IF BACKGROUND CLICKED ---
    if (leftmostID === null) {
        messnamed("SelectedObjectName", "none");
        messnamed("SelectedObjectIndex_FromSymbol", -1);
        messnamed("SelectedPatternIndex_FromSymbol", -1);
        messnamed("SelectedObjectIsText", -1);
    }
    // -----------------------------------------------------

    for (var i = 0; i < keys.length; i++) {
        var id = keys[i]; var isSelected = registry.get(id + "::selected");
        outlet(2, "send", id); outlet(2, "selected", isSelected); 
        outlet(2, "selected_via_mouse", (id === leftmostID) ? 1 : 0);
        if (id === leftmostID) {
            focus_live_device(id);
            update_properties_window(id);
        }
    }

    // --- RESET PROPERTIES WINDOW IF BACKGROUND CLICKED ---
    if (leftmostID === null) {
        messnamed("SelectedObjectName", "none"); // Triggers the gate close
        messnamed("SelectedObjectIndex_FromSymbol", -1); // Hides the blue panels
        messnamed("SelectedPatternIndex_FromSymbol", -1);
        messnamed("SelectedObjectIsText", -1);
    }

    draw_selections();
    mark_dirty(1, 1, 1, 1, 1); 
}

// =========================================================
// UI INTERACTIONS 
// =========================================================
// --- DROP NEW OBJECT AT PLAYHEAD ---
function drop_new_object(id) {
    var api = new LiveAPI(null, "live_set");
    if (!api) return;
    
    var num = parseFloat(api.get("signature_numerator")[0]);
    var den = parseFloat(api.get("signature_denominator")[0]);
    var beatsPerBar = (num / den) * 4.0;
    var beats = parseFloat(api.get("current_song_time")[0]);
    
    // Calculate current bar and add 2-bar drop offset
    var bars = (beats / beatsPerBar) + 1.0;
    var dropX = snap(bars + 2.0, quantX);

    var registry = new Dict("SigneRegistry");
    if (!registry.contains(id)) return;

    // Update the registry and tell the UI dial to move
    registry.set(id + "::x", dropX);
    outlet(2, "send", id);
    outlet(2, "move_x", dropX);
    
    draw_selections();
    mark_dirty(1, 0, 0, 0, 0);
}

function remove(id) {
    var registry = new Dict("SigneRegistry");
    if (registry.contains(id)) registry.remove(id);
    draw_selections();
    mark_dirty(1, 1, 1, 1, 1);
}

function ui_lock(id, state) {
    var registry = new Dict("SigneRegistry");
    if (!registry.contains(id)) return;
    registry.set(id + "::locked", state);
    draw_selections(); 
}

function ui_select(target) {
    if (isScrubbing) return;
    if (new Date().getTime() - lastViewportInteractionTime < 500) return;
    var registry = new Dict("SigneRegistry");
    if (!registry.contains(target)) return;
    var keys = registry.getkeys();
    if (keys != null) {
        if (typeof keys === "string") keys = [keys];
        for (var i = 0; i < keys.length; i++) {
            registry.set(keys[i] + "::selected", 0);
            outlet(2, "send", keys[i]); outlet(2, "selected", 0); outlet(2, "selected_via_mouse", 0); 
        }
    }
    registry.set(target + "::selected", 1);
    outlet(4, target, 1); outlet(2, "send", target); outlet(2, "selected", 1);
    update_properties_window(target);
    take_centroid_snapshot(registry);

    if (linkScale === 1) {
        var x = registry.get(target + "::scale_x") || 1.0, y = registry.get(target + "::scale_y") || 1.0;
        activeRatio = (x !== 0) ? (y / x) : 1.0;
    }
    draw_selections();
}

// LIVE UI REVERSE-LOOKUP FUNCTION
function live_device_selected(device_id) {
    if (isScrubbing) return;
    var registry = new Dict("SigneRegistry");
    var keys = registry.getkeys();
    if (keys == null) return;
    if (typeof keys === "string") keys = [keys];

    for (var i = 0; i < keys.length; i++) {
        var id = keys[i];
        var reg_dev_id = registry.get(id + "::live_device_id");
        
        if (reg_dev_id !== null && parseInt(reg_dev_id) === parseInt(device_id)) {
            // Prevent redundant selection updates if it's already the active object
            if (registry.get(id + "::selected") != 1) {
                // Temporarily bypass the 500ms viewport interaction block
                var tempTime = lastViewportInteractionTime;
                lastViewportInteractionTime = 0; 
                ui_select(id);
                lastViewportInteractionTime = tempTime;
            }
            return;
        }
    }
}

function ui_move_x(id, x) {
    var registry = new Dict("SigneRegistry");
    if (!registry.contains(id)) return;
    var newX = x;
    if (isHumanX === 1) {
        if (snapToTrigger === 1) {
            var tOff = registry.get(id + "::trigger_offset") || 0.0;
            newX = snap(x + tOff, quantX) - tOff;
        } else { newX = snap(x, quantX); }
    }
    registry.set(id + "::x", newX); outlet(2, "send", id); draw_selections(); mark_dirty(1, 0, 0, 0, 0);
    check_frustum();
}

function ui_move_y(id, y) {
    var registry = new Dict("SigneRegistry");
    if (!registry.contains(id)) return;
    var v = (isHumanY === 1) ? snap(y, quantY) : y; 
    registry.set(id + "::y", v); outlet(2, "send", id); draw_selections(); mark_dirty(1, 0, 0, 0, 0);
    check_frustum();
}

function ui_trigger_offset(id, val) {
    var registry = new Dict("SigneRegistry");
    if (!registry.contains(id)) return;
    registry.set(id + "::trigger_offset", val); draw_selections(); mark_dirty(1, 0, 0, 0, 0);
}

function dial_scale_x(id, val, isHuman) {
    if (isScalingGroup || ignoreX) return; 
    var registry = new Dict("SigneRegistry");
    if (!registry.contains(id)) return;
    registry.set(id + "::scale_x", val); outlet(2, "send", id); outlet(2, "scale_x", val); 
    var humanInteraction = (isHuman !== undefined) ? isHuman : 1;
    if (linkScale === 1 && humanInteraction === 1) {
        var newY = val * activeRatio;
        registry.set(id + "::scale_y", newY); ignoreY = true;
        outlet(2, "scale_y", newY); outlet(2, "ui_y", newY); ignoreY = false;
    }
    draw_selections(); mark_dirty(1, 0, 0, 1, 0);
    check_frustum();
}

function dial_scale_y(id, val, isHuman) {
    if (isScalingGroup || ignoreY) return; 
    var registry = new Dict("SigneRegistry");
    if (!registry.contains(id)) return;
    registry.set(id + "::scale_y", val); outlet(2, "send", id); outlet(2, "scale_y", val); 
    var humanInteraction = (isHuman !== undefined) ? isHuman : 1;
    if (linkScale === 1 && humanInteraction === 1) {
        var newX = (activeRatio !== 0) ? (val / activeRatio) : val;
        registry.set(id + "::scale_x", newX); ignoreX = true;
        outlet(2, "scale_x", newX); outlet(2, "ui_x", newX); ignoreX = false;
    }
    draw_selections(); mark_dirty(1, 0, 0, 1, 0);
    check_frustum();
}

function ui_scale_x(id, val) {
    var registry = new Dict("SigneRegistry"); if (!registry.contains(id)) return;
    registry.set(id + "::scale_x", val); outlet(2, "send", id); draw_selections(); mark_dirty(1, 0, 0, 1, 0);
    check_frustum();
}

function ui_scale_y(id, val) {
    var registry = new Dict("SigneRegistry"); if (!registry.contains(id)) return;
    registry.set(id + "::scale_y", val); outlet(2, "send", id); draw_selections(); mark_dirty(1, 0, 0, 1, 0);
    check_frustum();
}

function ui_rotate(id, val) {
    var registry = new Dict("SigneRegistry"); if (!registry.contains(id)) return;
    registry.set(id + "::rotation", val); outlet(2, "send", id); draw_selections(); mark_dirty(1, 0, 0, 0, 0);
}

function ui_opacity(id, val) {
    var registry = new Dict("SigneRegistry"); if (!registry.contains(id)) return;
    registry.set(id + "::opacity", val); outlet(2, "send", id); draw_selections(); mark_dirty(0, 1, 1, 0, 0);
}

function ui_count(id, val) {
    var registry = new Dict("SigneRegistry"); if (!registry.contains(id)) return;
    registry.set(id + "::count", val); outlet(2, "send", id); draw_selections(); mark_dirty(1, 1, 1, 1, 1);
    check_frustum();
}

function ui_spacing(id, val) {
    var registry = new Dict("SigneRegistry"); if (!registry.contains(id)) return;
    var v = (isHumanSpacing === 1) ? snap(val, quantSpacing) : val; 
    registry.set(id + "::spacing", v); outlet(2, "send", id); draw_selections(); mark_dirty(1, 1, 1, 1, 1);
    check_frustum();
}

function ui_group_rot(id, val) {
    var registry = new Dict("SigneRegistry"); if (!registry.contains(id)) return;
    registry.set(id + "::group_rot", val); outlet(2, "send", id); draw_selections(); mark_dirty(1, 0, 0, 0, 0);
    check_frustum();
}

function ui_bounds_x(id, val) {
    var registry = new Dict("SigneRegistry"); if (!registry.contains(id)) return;
    registry.set(id + "::bounds_x", val); draw_selections();
    check_frustum();
}

function ui_bounds_y(id, val) {
    var registry = new Dict("SigneRegistry"); if (!registry.contains(id)) return;
    registry.set(id + "::bounds_y", val); draw_selections();
    check_frustum();
}

// --- POSITION / SCALE / LAYER ---
function ui_layer(id, val) {
    var registry = new Dict("SigneRegistry"); if (!registry.contains(id)) return;
    registry.set(id + "::layer", val); 
    mark_dirty(1, 1, 1, 1, 1); // Force a full GPU redraw
}

// --- SYMBOL COLOUR & TEXTURE ---
function ui_symbol_texture(id, val) {
    var registry = new Dict("SigneRegistry"); if (!registry.contains(id)) return;
    registry.set(id + "::symbol_texture", val); mark_dirty(0, 0, 0, 1, 0);
}

function ui_symbol_colour_start_rgb() {
    var args = arrayfromargs(arguments); var id = args[0];
    var registry = new Dict("SigneRegistry"); if (!registry.contains(id)) return;
    
    // args 1, 2, 3 are the desaturated RGB from the swatch
    var hsl = rgbToHsl(args[1], args[2], args[3]);
    var pureRGB = hslToRgb(hsl[0], 1.0, hsl[2]); // Force Saturation to 1.0
    
    registry.set(id + "::symbol_colour_start_rgb", pureRGB); 
    mark_dirty(0, 1, 0, 0, 0);
}

function ui_symbol_colour_start_sat(id, val) {
    var registry = new Dict("SigneRegistry"); if (!registry.contains(id)) return;
    registry.set(id + "::symbol_colour_start_sat", val); 
    mark_dirty(0, 1, 0, 0, 0); // Triggers Symbol Matrix redraw
}

function ui_symbol_colour_end_rgb() {
    var args = arrayfromargs(arguments); var id = args[0];
    var registry = new Dict("SigneRegistry"); if (!registry.contains(id)) return;
    var hsl = rgbToHsl(args[1], args[2], args[3]);
    var pureRGB = hslToRgb(hsl[0], 1.0, hsl[2]);
    registry.set(id + "::symbol_colour_end_rgb", pureRGB); 
    mark_dirty(0, 1, 0, 0, 0);
}

function ui_symbol_colour_end_sat(id, val) {
    var registry = new Dict("SigneRegistry"); if (!registry.contains(id)) return;
    registry.set(id + "::symbol_colour_end_sat", val); 
    mark_dirty(0, 1, 0, 0, 0); 
}

function ui_symbol_colour_start_hsl() {
    var args = arrayfromargs(arguments); var id = args[0];
    var registry = new Dict("SigneRegistry"); if (!registry.contains(id)) return;
    var pureRGB = hslToRgb(args[1], 1.0, args[3]); // Force S=1.0!
    registry.set(id + "::symbol_colour_start_rgb", pureRGB); mark_dirty(0, 1, 0, 0, 0);
}
function ui_symbol_colour_end_hsl() {
    var args = arrayfromargs(arguments); var id = args[0];
    var registry = new Dict("SigneRegistry"); if (!registry.contains(id)) return;
    var pureRGB = hslToRgb(args[1], 1.0, args[3]);
    registry.set(id + "::symbol_colour_end_rgb", pureRGB); mark_dirty(0, 1, 0, 0, 0);
}

function ui_symbol_colour_interp(id, val) {
    var registry = new Dict("SigneRegistry"); if (!registry.contains(id)) return;
    registry.set(id + "::symbol_colour_interp", val); 
    mark_dirty(0, 1, 0, 0, 0); // This tells the GPU to redraw
}

// --- PATTERN COLOUR, TEXTURE & TILING ---
function ui_pattern_texture(id, val) {
    var registry = new Dict("SigneRegistry"); if (!registry.contains(id)) return;
    registry.set(id + "::pattern_texture", val); mark_dirty(0, 0, 0, 1, 0);
}
function ui_pattern_tiling(id, val) {
    var registry = new Dict("SigneRegistry"); if (!registry.contains(id)) return;
    registry.set(id + "::pat_tiling_x", val); registry.set(id + "::pat_tiling_y", val); mark_dirty(0, 0, 0, 0, 1);
}
function ui_pattern_intensity(id, val) {
    var registry = new Dict("SigneRegistry"); if (!registry.contains(id)) return;
    registry.set(id + "::pattern_intensity", val); 
    mark_dirty(0, 0, 1, 0, 0);
}

function ui_pattern_colour_start_rgb() {
    var args = arrayfromargs(arguments); var id = args[0];
    var registry = new Dict("SigneRegistry"); if (!registry.contains(id)) return;
    var hsl = rgbToHsl(args[1], args[2], args[3]);
    var pureRGB = hslToRgb(hsl[0], 1.0, hsl[2]);
    registry.set(id + "::pattern_colour_start_rgb", pureRGB); 
    mark_dirty(0, 0, 1, 0, 0);
}

function ui_pattern_colour_start_sat(id, val) {
    var registry = new Dict("SigneRegistry"); if (!registry.contains(id)) return;
    registry.set(id + "::pattern_colour_start_sat", val); 
    mark_dirty(0, 0, 1, 0, 0); // Triggers Pattern Matrix redraw
}

function ui_pattern_colour_end_rgb() {
    var args = arrayfromargs(arguments); var id = args[0];
    var registry = new Dict("SigneRegistry"); if (!registry.contains(id)) return;
    var hsl = rgbToHsl(args[1], args[2], args[3]);
    var pureRGB = hslToRgb(hsl[0], 1.0, hsl[2]);
    registry.set(id + "::pattern_colour_end_rgb", pureRGB); 
    mark_dirty(0, 0, 1, 0, 0);
}

function ui_pattern_colour_end_sat(id, val) {
    var registry = new Dict("SigneRegistry"); if (!registry.contains(id)) return;
    registry.set(id + "::pattern_colour_end_sat", val); 
    mark_dirty(0, 0, 1, 0, 0); 
}

function ui_pattern_colour_start_hsl() {
    var args = arrayfromargs(arguments); var id = args[0];
    var registry = new Dict("SigneRegistry"); if (!registry.contains(id)) return;
    var pureRGB = hslToRgb(args[1], 1.0, args[3]);
    registry.set(id + "::pattern_colour_start_rgb", pureRGB); mark_dirty(0, 0, 1, 0, 0);
}
function ui_pattern_colour_end_hsl() {
    var args = arrayfromargs(arguments); var id = args[0];
    var registry = new Dict("SigneRegistry"); if (!registry.contains(id)) return;
    var pureRGB = hslToRgb(args[1], 1.0, args[3]);
    registry.set(id + "::pattern_colour_end_rgb", pureRGB); mark_dirty(0, 0, 1, 0, 0);
}

function ui_pattern_colour_interp(id, val) {
    var registry = new Dict("SigneRegistry"); if (!registry.contains(id)) return;
    registry.set(id + "::pattern_colour_interp", val); 
    mark_dirty(0, 0, 1, 0, 0);
}

// --- MIDI TRIGGERS ---
function ui_midi_trigger_state(id, val) {
    var registry = new Dict("SigneRegistry"); if (!registry.contains(id)) return;
    registry.set(id + "::midi_trigger_state", val); mark_midi_dirty();
}
function ui_midi_trigger_offset(id, val) {
    var registry = new Dict("SigneRegistry"); if (!registry.contains(id)) return;
    registry.set(id + "::trigger_offset", val); mark_midi_dirty();
}
function ui_midi_trigger_rgb(id, r, g, b) {
    var registry = new Dict("SigneRegistry"); if (!registry.contains(id)) return;
    registry.set(id + "::midi_trigger_rgb", [r, g, b]); mark_midi_dirty();
}
function ui_midi_trigger_sat(id, val) {
    var registry = new Dict("SigneRegistry"); if (!registry.contains(id)) return;
    registry.set(id + "::midi_trigger_sat", val); mark_midi_dirty();
}
function ui_midi_trigger_pitch(id, val) {
    var registry = new Dict("SigneRegistry"); if (!registry.contains(id)) return;
    registry.set(id + "::midi_trigger_pitch", val);
}
function ui_midi_trigger_velocity(id, val) {
    var registry = new Dict("SigneRegistry"); if (!registry.contains(id)) return;
    registry.set(id + "::midi_trigger_velocity", val);
}
function ui_midi_trigger_duration(id, val) {
    var registry = new Dict("SigneRegistry"); if (!registry.contains(id)) return;
    registry.set(id + "::midi_trigger_duration", val);
}

// --- TEXT PROPERTIES ---
function ui_text_italic(id, val) {
    var registry = new Dict("SigneRegistry"); if (!registry.contains(id)) return;
    registry.set(id + "::text_italic", val);
}

function ui_text_bold(id, val) {
    var registry = new Dict("SigneRegistry"); if (!registry.contains(id)) return;
    registry.set(id + "::text_bold", val);
}

function ui_text_spacing(id, val) {
    var registry = new Dict("SigneRegistry"); if (!registry.contains(id)) return;
    registry.set(id + "::text_spacing", val);
}

function ui_text_alignment(id, val) {
    var registry = new Dict("SigneRegistry"); if (!registry.contains(id)) return;
    registry.set(id + "::text_alignment", val);
}

function ui_base_bounds_x(id, val) {
    var registry = new Dict("SigneRegistry"); if (!registry.contains(id)) return;
    registry.set(id + "::base_bounds_x", val);
}

function ui_base_bounds_y(id, val) {
    var registry = new Dict("SigneRegistry"); if (!registry.contains(id)) return;
    registry.set(id + "::base_bounds_y", val);
}

// Fonts and Text Content can have spaces (e.g., "Courier New" or "Hello World"), 
// so we need to grab all arguments and join them back into a single string.
function ui_text_font() {
    var args = arrayfromargs(arguments);
    var id = args[0];
    var registry = new Dict("SigneRegistry"); if (!registry.contains(id)) return;
    
    var fontName = args.slice(1).join(" ");
    registry.set(id + "::text_font", fontName);
}

function ui_text_content() {
    var args = arrayfromargs(arguments);
    var id = args[0];
    var registry = new Dict("SigneRegistry"); if (!registry.contains(id)) return;
    
    var textContent = args.slice(1).join(" ");
    registry.set(id + "::text_content", textContent);
    
    check_frustum();
}

// --- SYMBOL & PATTERN UI STATE ---
function ui_symbol_library() {
    var args = arrayfromargs(arguments); var id = args[0];
    var registry = new Dict("SigneRegistry"); if (!registry.contains(id)) return;
    registry.set(id + "::symbol_library", args.slice(1).join(" "));
}
function ui_symbol_category() {
    var args = arrayfromargs(arguments); var id = args[0];
    var registry = new Dict("SigneRegistry"); if (!registry.contains(id)) return;
    registry.set(id + "::symbol_category", args.slice(1).join(" "));
}
function ui_symbol_index(id, val) {
    var registry = new Dict("SigneRegistry"); if (!registry.contains(id)) return;
    registry.set(id + "::symbol_index", val);
}

function ui_pattern_library() {
    var args = arrayfromargs(arguments); var id = args[0];
    var registry = new Dict("SigneRegistry"); if (!registry.contains(id)) return;
    registry.set(id + "::pattern_library", args.slice(1).join(" "));
}
function ui_pattern_category() {
    var args = arrayfromargs(arguments); var id = args[0];
    var registry = new Dict("SigneRegistry"); if (!registry.contains(id)) return;
    registry.set(id + "::pattern_category", args.slice(1).join(" "));
}
function ui_pattern_index(id, val) {
    var registry = new Dict("SigneRegistry"); if (!registry.contains(id)) return;
    registry.set(id + "::pattern_index", val);
}

function set_pinned(id, state) {
    var registry = new Dict("SigneRegistry"); if (registry.contains(id)) registry.set(id + "::pinned", state);
}

function camera_pos(cx, cy) {
    if (!camInitialized) { lastCamX = cx; lastCamY = cy; camInitialized = true; return; }
    var dCx = cx - lastCamX, dCy = cy - lastCamY;
    if (dCx !== 0 || dCy !== 0) {
        var registry = new Dict("SigneRegistry");
        var keys = registry.getkeys();
        if (keys != null) {
            if (typeof keys === "string") keys = [keys];
            for (var i = 0; i < keys.length; i++) {
                var id = keys[i];
                if (registry.get(id + "::pinned") == 1) { 
                    var nx = registry.get(id+"::x") + dCx, ny = registry.get(id+"::y") + dCy;
                    registry.set(id+"::x", nx); registry.set(id+"::y", ny);
                    outlet(2, "send", id); outlet(2, "move_x", nx); outlet(2, "move_y", ny);
                }
            }
        }
        draw_selections(); mark_dirty(1, 0, 0, 0, 0);
    }
    lastCamX = cx; lastCamY = cy;
}

function move_to_transport(id) {
    var api = new LiveAPI(null, "live_set"); if (!api) return; 
    var num = parseFloat(api.get("signature_numerator")[0]), den = parseFloat(api.get("signature_denominator")[0]);
    var beatsPerBar = (num / den) * 4.0, beats = parseFloat(api.get("current_song_time")[0]);
    var bars = (beats / beatsPerBar) + 1.0; var v = bars;
    var registry = new Dict("SigneRegistry"); if (!registry.contains(id)) return;
    if (snapToTrigger === 1) {
        var tOff = registry.get(id + "::trigger_offset") || 0.0;
        v = snap(bars, quantX) - tOff;
    } else { v = snap(bars, quantX); }
    registry.set(id + "::x", v); outlet(2, "send", id); outlet(2, "move_x", v); draw_selections(); mark_dirty(1, 0, 0, 0, 0);
}

function move_transport_to_object(id) {
    var api = new LiveAPI(null, "live_set"); if (!api) return;
    var registry = new Dict("SigneRegistry");
    if (registry.contains(id)) {
        var num = parseFloat(api.get("signature_numerator")[0]), den = parseFloat(api.get("signature_denominator")[0]);
        var beatsPerBar = (num / den) * 4.0, posX = parseFloat(registry.get(id + "::x"));
        var targetBeats = Math.max(0, (posX - 1.0) * beatsPerBar), songLength = parseFloat(api.get("song_length"));
        if (targetBeats >= songLength) { outlet(2, "send", id); outlet(2, "bounds_error", 1); return; }
        api.set("current_song_time", Number(targetBeats));
    }
}

function group_prop_float(propName, val) {
    var registry = new Dict("SigneRegistry"); var keys = registry.getkeys();
    if (keys == null) return;
    if (typeof keys === "string") keys = [keys];
    for (var i = 0; i < keys.length; i++) {
        var id = keys[i];
        if (registry.get(id + "::selected") == 1) { registry.set(id + "::" + propName, val); outlet(2, "send", id); outlet(2, propName, val); }
    }
    mark_dirty(1, 1, 1, 1, 1);
}

function group_prop_rgb(propName, r, g, b, a) {
    if (a === undefined) a = 1.0; 
    var registry = new Dict("SigneRegistry"); var keys = registry.getkeys();
    if (keys == null) return;
    if (typeof keys === "string") keys = [keys];
    for (var i = 0; i < keys.length; i++) {
        var id = keys[i];
        if (registry.get(id + "::selected") == 1) { registry.set(id + "::" + propName, [r, g, b, a]); outlet(2, "send", id); outlet(2, propName, r, g, b, a); }
    }
    mark_dirty(0, 1, 1, 0, 0);
}

function group_prop_symbol(propName, filename) {
    if (filename === undefined) { filename = propName; propName = "symbol_texture"; }
    
    // Make sure we are saving to the correct key depending on the dropdown used
    var dictKey = (propName === "pattern_texture") ? "pattern_texture" : "symbol_texture";
    
    var registry = new Dict("SigneRegistry"); 
    var keys = registry.getkeys();
    if (keys == null) return;
    if (typeof keys === "string") keys = [keys];
    
    for (var i = 0; i < keys.length; i++) {
        var id = keys[i];
        if (registry.get(id + "::selected") == 1) { 
            registry.set(id + "::" + dictKey, filename); 
            outlet(2, "send", id); 
            outlet(2, dictKey, filename); 
        }
    }
    mark_dirty(0, 0, 0, 1, 0);
}

function draw_selections() {
    var registry = new Dict("SigneRegistry");
    var keys = registry.getkeys();
    outlet(3, "reset");
    
    if (keys == null) return;
    if (typeof keys === "string") keys = [keys];
    
    for (var i = 0; i < keys.length; i++) {
        var id = keys[i];
        var isSelected = (registry.get(id + "::selected") == 1);
        var isLocked = (registry.get(id + "::locked") == 1);

        // Draw if it's selected OR if the global bounds toggle is on
        if (isSelected || showAllBounds === 1) { 
            
            // Assign the color based on selection state
            if (isSelected) {
                outlet(3, "glcolor", isLocked ? [0.2, 0.6, 1.0, 1.0] : [1.0, 0.8, 0.0, 1.0]); // Blue if locked, Yellow if selected
            } else {
                outlet(3, "glcolor", [1.0, 0.0, 0.0, 1.0]); // Red if unselected but bounds are drawn
            }

            var x = registry.get(id+"::x"), y = registry.get(id+"::y");
            var sx = registry.get(id + "::bounds_x");
            if (sx == null) sx = registry.get(id + "::scale_x") || 0.0;
            var sy = registry.get(id + "::bounds_y");
            if (sy == null) sy = registry.get(id + "::scale_y") || 0.0;            
            var rot = registry.get(id+"::rotation") || 0.0, gRot = registry.get(id+"::group_rot") || 0.0;
            var count = registry.get(id+"::count") || 1, spacing = registry.get(id+"::spacing") || 0.0;
            var gCos = Math.cos(-gRot * 2 * Math.PI), gSin = Math.sin(-gRot * 2 * Math.PI);
            var cosT = Math.cos(-(rot+gRot) * 2 * Math.PI), sinT = Math.sin(-(rot+gRot) * 2 * Math.PI);
            
            for (var j = 0; j < count; j++) {
                var ix = x + (j * spacing * gCos), iy = y + (j * spacing * gSin);
                outlet(3, "glbegin", "line_loop");
                outlet(3, "glvertex", ix + (-sx*cosT - sy*sinT), iy + (-sx*sinT + sy*cosT), 0);
                outlet(3, "glvertex", ix + (sx*cosT - sy*sinT), iy + (sx*sinT + sy*cosT), 0);
                outlet(3, "glvertex", ix + (sx*cosT + sy*sinT), iy + (sx*sinT - sy*cosT), 0);
                outlet(3, "glvertex", ix + (-sx*cosT + sy*sinT), iy + (-sx*sinT - sy*cosT), 0);
                outlet(3, "glend");
            }
        }
    }
}

// =========================================================
// HARDWARE INSTANCING MATH
// =========================================================

function update_math() {
    var registry = new Dict("SigneRegistry");
    var manifest = new Dict("AtlasManifest"); 
    
    var keys = registry.getkeys();
    
    if (keys == null) {
        if (last_total_instances !== 1) {
            matPos.dim = 1; matSym.dim = 1; matPat.dim = 1; matScl.dim = 1; matTil.dim = 1;
            last_total_instances = 1;
        }
        matScl.setcell1d(0, 0, 0, 0, 0); 
        return;
    }
    
    if (typeof keys === "string") keys = [keys];

    // ==========================================
    // --- FILTER OUT NON-SYMBOLS (e.g., SIGNe-Text) ---
    // ==========================================
    var valid_symbols = [];
    for (var i = 0; i < keys.length; i++) {
        // Only objects that have a 'symbol_texture' property will be instanced by this mesh
        if (registry.contains(keys[i] + "::symbol_texture")) {
            valid_symbols.push(keys[i]);
        }
    }
    keys = valid_symbols; // Overwrite the keys array with ONLY symbols
    
    // Safety check: If there are no symbols left (e.g., only Text objects exist)
    if (keys.length === 0) {
        if (last_total_instances !== 1) {
            matPos.dim = 1; matSym.dim = 1; matPat.dim = 1; matScl.dim = 1; matTil.dim = 1;
            last_total_instances = 1;
        }
        matScl.setcell1d(0, 0, 0, 0, 0); 
        return; // Stop math execution here!
    }

    // Fetch the arrays ONCE before the loop starts to save CPU
    var symArray = manifest.get("symbols");
    if (symArray != null && typeof symArray === "string") symArray = [symArray];
    
    var patArray = manifest.get("patterns");
    if (patArray != null && typeof patArray === "string") patArray = [patArray];

    // ==========================================
    // 1. COLLECT ALL INSTANCES INTO A FLAT ARRAY
    // ==========================================
    var all_instances = [];

    for (var i = 0; i < keys.length; i++) {
        var id = keys[i];
        
        var bx = parseFloat(registry.get(id + "::x")) || 0.0, by = parseFloat(registry.get(id + "::y")) || 0.0;
        var layer = (parseFloat(registry.get(id + "::layer")) || 0.0) * 0.01;
        var rotRadians = (parseFloat(registry.get(id + "::rotation")) || 0.0) * 2.0 * Math.PI;

        var sx = parseFloat(registry.get(id + "::scale_x")); if (isNaN(sx)) sx = 1.0;
        var sy = parseFloat(registry.get(id + "::scale_y")); if (isNaN(sy)) sy = 1.0;
        
        // --- NESTED FOLDER ATLAS INDEX LOOKUP ---
        var symIdx = 0.0;
        var patIdx = 0.0;
        
        var symName = registry.get(id + "::symbol_texture");
        if (symName != null && symArray != null) {
            var symParts = symName.split(/[\\/]/);
            var cleanSym = symParts[symParts.length - 1].replace(/\.[^/.]+$/, ""); 
            
            for (var s = 0; s < symArray.length; s++) { 
                if (symArray[s] === cleanSym) { symIdx = parseFloat(s); break; } 
            }
        }

        var patName = registry.get(id + "::pattern_texture");
        if (patName != null && patArray != null) {
            var patParts = patName.split(/[\\/]/);
            var cleanPat = patParts[patParts.length - 1].replace(/\.[^/.]+$/, ""); 
            
            for (var p = 0; p < patArray.length; p++) { 
                if (patArray[p] === cleanPat) { patIdx = parseFloat(p); break; } 
            }
        }

        // --- FETCH OPACITY AND COLOUR DATA ---
        var opac = parseFloat(registry.get(id + "::opacity")); if (isNaN(opac)) opac = 1.0;

        // Fetch Base RGBs
        var sStart = registry.get(id + "::symbol_colour_start_rgb") || [1.0, 1.0, 1.0, 1.0];
        var sEnd = registry.get(id + "::symbol_colour_end_rgb") || [1.0, 1.0, 1.0, 1.0];
        var pStart = registry.get(id + "::pattern_colour_start_rgb") || [0.0, 0.0, 0.0, 1.0];
        var pEnd = registry.get(id + "::pattern_colour_end_rgb") || [0.0, 0.0, 0.0, 1.0];

        // Fetch Saturations
        var sStartSat = parseFloat(registry.get(id + "::symbol_colour_start_sat")); if (isNaN(sStartSat)) sStartSat = 1.0;
        var sEndSat = parseFloat(registry.get(id + "::symbol_colour_end_sat")); if (isNaN(sEndSat)) sEndSat = 1.0;
        var pStartSat = parseFloat(registry.get(id + "::pattern_colour_start_sat")); if (isNaN(pStartSat)) pStartSat = 1.0;
        var pEndSat = parseFloat(registry.get(id + "::pattern_colour_end_sat")); if (isNaN(pEndSat)) pEndSat = 1.0;
        
        // Fetch Interpolation
        var sInterp = parseFloat(registry.get(id + "::symbol_colour_interp")); if (isNaN(sInterp)) sInterp = 0.0;
        var pInterp = parseFloat(registry.get(id + "::pattern_colour_interp")); if (isNaN(pInterp)) pInterp = 0.0;

        // Apply Saturation to the RGBs
        var sStartRGB = apply_sat(sStart[0], sStart[1], sStart[2], sStartSat);
        var sEndRGB = apply_sat(sEnd[0], sEnd[1], sEnd[2], sEndSat);
        var pStartRGB = apply_sat(pStart[0], pStart[1], pStart[2], pStartSat);
        var pEndRGB = apply_sat(pEnd[0], pEnd[1], pEnd[2], pEndSat);

        // Calculate Interpolated Final Colours
        var sr = lerp(sStartRGB[0], sEndRGB[0], sInterp);
        var sg = lerp(sStartRGB[1], sEndRGB[1], sInterp);
        var sb = lerp(sStartRGB[2], sEndRGB[2], sInterp);
        var sa = lerp(sStart[3] !== undefined ? sStart[3] : 1.0, sEnd[3] !== undefined ? sEnd[3] : 1.0, sInterp) * opac;

        var pr = lerp(pStartRGB[0], pEndRGB[0], pInterp);
        var pg = lerp(pStartRGB[1], pEndRGB[1], pInterp);
        var pb = lerp(pStartRGB[2], pEndRGB[2], pInterp);
        var pa = lerp(pStart[3] !== undefined ? pStart[3] : 1.0, pEnd[3] !== undefined ? pEnd[3] : 1.0, pInterp) * opac;

        // Layout Parameters
        var tx = parseFloat(registry.get(id + "::pat_tiling_x")) || 1.0; 
        var ty = parseFloat(registry.get(id + "::pat_tiling_y")) || 1.0;
        var pIntensity = parseFloat(registry.get(id + "::pattern_intensity")); if (isNaN(pIntensity)) pIntensity = 0.0;
                
        var count = parseInt(registry.get(id + "::count")) || 1, spacing = parseFloat(registry.get(id + "::spacing")) || 0.0;
        var gRot = parseFloat(registry.get(id + "::group_rot")) || 0.0;
        var gCos = Math.cos(-gRot * 2.0 * Math.PI), gSin = Math.sin(-gRot * 2.0 * Math.PI);

        for (var j = 0; j < count; j++) {
            var ix = bx + (j * spacing * gCos), iy = by + (j * spacing * gSin);
            
            // Push the fully calculated instance into the array
            all_instances.push({
                z: layer, // The sorting key
                pos: [ix, iy, layer, rotRadians],
                sym: [sr, sg, sb, sa],
                pat: [pr, pg, pb, pa],
                scl: [sx, sy, symIdx, patIdx],
                til: [tx, ty, pIntensity]
            });
        }
    }

    // ==========================================
    // 2. SORT BY Z-DEPTH (Painter's Algorithm)
    // ==========================================
    // Lowest layer values get drawn first (background)
    // Highest layer values get drawn last (foreground)
    all_instances.sort(function(a, b) {
        return a.z - b.z;
    });

    // ==========================================
    // 3. RESIZE AND WRITE TO MATRICES
    // ==========================================
    var total_instances = all_instances.length;
    if (total_instances === 0) total_instances = 1; // Failsafe size

    if (total_instances !== last_total_instances) {
        matPos.dim = total_instances;
        matSym.dim = total_instances;
        matPat.dim = total_instances;
        matScl.dim = total_instances;
        matTil.dim = total_instances;
        last_total_instances = total_instances;
    }

    // Failsafe exit if array is truly empty to prevent indexing errors
    if (all_instances.length === 0) {
        matScl.setcell1d(0, 0, 0, 0, 0); 
        return;
    }

    // Write the sorted data sequentially
    for (var k = 0; k < all_instances.length; k++) {
        var inst = all_instances[k];
        matPos.setcell1d(k, inst.pos[0], inst.pos[1], inst.pos[2], inst.pos[3]);
        matSym.setcell1d(k, inst.sym[0], inst.sym[1], inst.sym[2], inst.sym[3]);
        matPat.setcell1d(k, inst.pat[0], inst.pat[1], inst.pat[2], inst.pat[3]);
        matScl.setcell1d(k, inst.scl[0], inst.scl[1], inst.scl[2], inst.scl[3]);
        matTil.setcell1d(k, inst.til[0], inst.til[1], inst.til[2]);
    }
}

function update_midi_math() {
    var registry = new Dict("SigneRegistry");
    var keys = registry.getkeys();
    
    // If empty, hide the matrix
    if (keys == null) {
        matMidiPos.dim = 1; matMidiScl.dim = 1; matMidiCol.dim = 1;
        matMidiScl.setcell1d(0, 0, 0, 0); 
        last_total_midi = 0;
        return;
    }
    if (typeof keys === "string") keys = [keys];

    // Find all valid MIDI triggers
    var valid_midi_ids = [];
    var total_midi = 0;
    for (var i = 0; i < keys.length; i++) {
        var id = keys[i];
        if (parseInt(registry.get(id + "::midi_trigger_state")) === 1) {
            valid_midi_ids.push(id);
            total_midi += (parseInt(registry.get(id + "::count")) || 1);
        }
    }

    if (total_midi < 1) {
        matMidiPos.dim = 1; matMidiScl.dim = 1; matMidiCol.dim = 1;
        matMidiScl.setcell1d(0, 0, 0, 0); 
        last_total_midi = 0;
        return;
    }

    if (total_midi !== last_total_midi) {
        matMidiPos.dim = total_midi;
        matMidiScl.dim = total_midi;
        matMidiCol.dim = total_midi;
        last_total_midi = total_midi;
    }

    var current_idx = 0;
    for (var i = 0; i < valid_midi_ids.length; i++) {
        var id = valid_midi_ids[i];
        var bx = parseFloat(registry.get(id + "::x")) || 0.0;
        var by = parseFloat(registry.get(id + "::y")) || 0.0;
        var tOff = parseFloat(registry.get(id + "::trigger_offset")) || 0.0;

        var count = parseInt(registry.get(id + "::count")) || 1;
        var spacing = parseFloat(registry.get(id + "::spacing")) || 0.0;
        var gRot = parseFloat(registry.get(id + "::group_rot")) || 0.0;
        var gCos = Math.cos(-gRot * 2.0 * Math.PI);
        var gSin = Math.sin(-gRot * 2.0 * Math.PI);

        var sx = parseFloat(registry.get(id + "::bounds_x"));
        if (isNaN(sx) || sx === 0) sx = parseFloat(registry.get(id + "::scale_x")) || 0.5;

        // --- ADD SY FOR VERTICAL SCALING ---
        var sy = parseFloat(registry.get(id + "::bounds_y"));
        if (isNaN(sy) || sy === 0) sy = parseFloat(registry.get(id + "::scale_y")) || 0.5;

        var rgb = registry.get(id + "::midi_trigger_rgb") || [1.0, 0.0, 0.0];
        var sat = parseFloat(registry.get(id + "::midi_trigger_sat")); if (isNaN(sat)) sat = 1.0;
        var finalColor = apply_sat(rgb[0], rgb[1], rgb[2], sat);

        for (var j = 0; j < count; j++) {
            var ix = bx + (j * spacing * gCos) + tOff;
            var iy = by + (j * spacing * gSin);

            // Layer 0.9999 ensures it renders on top
            matMidiPos.setcell1d(current_idx, ix, iy, 0.9999);
            
            // --- FIX: Thin X (0.05), Tall Y (sy) ---
            matMidiScl.setcell1d(current_idx, 0.05, sy, 1.0); 
            matMidiCol.setcell1d(current_idx, finalColor[0], finalColor[1], finalColor[2], 1.0);

            current_idx++;
        }
    }
}

function update_trigger_cache() {
    cached_midi_triggers = [];
    var registry = new Dict("SigneRegistry");
    var keys = registry.getkeys();
    
    if (keys == null) return;
    if (typeof keys === "string") keys = [keys];

    for (var i = 0; i < keys.length; i++) {
        var id = keys[i];
        
        // Grab the necessary position and spacing math
        var bx = parseFloat(registry.get(id + "::x")) || 0.0;
        var tOff = parseFloat(registry.get(id + "::trigger_offset")) || 0.0;
        var count = parseInt(registry.get(id + "::count")) || 1;
        var spacing = parseFloat(registry.get(id + "::spacing")) || 0.0;
        var gRot = parseFloat(registry.get(id + "::group_rot")) || 0.0;
        var gCos = Math.cos(-gRot * 2.0 * Math.PI);

        // Calculate and cache every instance's X-coordinate
        for (var j = 0; j < count; j++) {
            var ix = bx + (j * spacing * gCos) + tOff;
            cached_midi_triggers.push({ id: id, x: ix });
        }
    }
}

function transport_tick(current_x) {
    // Left edge of the screen is (current_x - 1.0) because the grid is 0-indexed.
    // The true world position is just the left edge + the exact bar offset!
    var offset_x = (current_x - 1.0) + globalPlayheadOffset;

    if (last_playhead_x < 0) { last_playhead_x = offset_x; return; }

    if (Math.abs(offset_x - last_playhead_x) > 0.5) {
        last_playhead_x = offset_x;
        return;
    }

    if (offset_x > last_playhead_x) { 
        for (var i = 0; i < cached_midi_triggers.length; i++) {
            var tx = cached_midi_triggers[i].x;
            if (last_playhead_x < tx && offset_x >= tx) {
                outlet(2, "send", cached_midi_triggers[i].id);
                outlet(2, "fire_midi", 1); 
            }
        }
    }
    last_playhead_x = offset_x;
}

// =========================================================
// PROPERTIES WINDOW BROADCASTER
// =========================================================
function update_properties_window(id) {
    var registry = new Dict("SigneRegistry");

    // --- Tell the Properties Window the target's name ---
    messnamed("SelectedObjectName", id);

    // --- TELL PROPERTIES WINDOW WHICH UI TO SHOW ---
    // Check if the object has text properties. If yes, output 1. If no, output 0.
    var isText = registry.contains(id + "::text_content") ? 1 : 0;
    messnamed("SelectedObjectIsText", isText);

    function push_float(key, rx_name) {
        var val = registry.get(id + "::" + key);
        if (val !== null) messnamed(rx_name, parseFloat(val));
    }

    function push_string(key, rx_name) {
        var val = registry.get(id + "::" + key);
        if (val !== null && val !== "") messnamed(rx_name, val);
    }

    function push_color(key, rx_name) {
        var val = registry.get(id + "::" + key);
        if (val !== null) {
            var r = val[0] !== undefined ? val[0] : 1.0;
            var g = val[1] !== undefined ? val[1] : 1.0;
            var b = val[2] !== undefined ? val[2] : 1.0;
            var a = val[3] !== undefined ? val[3] : 1.0;
            messnamed(rx_name, r, g, b, a); // Sends list: R G B A
        }
    }

    // --- SYMBOL MAPPINGS ---
    push_color("symbol_colour_start_rgb", "Colour_StartRGB_FromObject");
    push_float("symbol_colour_start_sat", "Colour_StartSaturation_FromObject");
    push_color("symbol_colour_end_rgb", "Colour_EndRGB_FromObject");
    push_float("symbol_colour_end_sat", "Colour_EndSaturation_FromObject");
    push_float("symbol_colour_interp", "Colour_Interpolation_FromObject");
    push_string("symbol_texture", "SymbolTexture_FromObject"); // Change string if your receive name is different!
    push_string("symbol_library", "ObjectLibraryFolderName_FromSymbol");
    push_string("symbol_category", "ObjectCategoryFolderName_FromSymbol");
    push_float("symbol_index", "SelectedObjectIndex_FromSymbol");

    // --- PATTERN MAPPINGS ---
    push_color("pattern_colour_start_rgb", "Colour_Pattern_StartRGB_FromObject");
    push_float("pattern_colour_start_sat", "Colour_Pattern_StartSaturation_FromObject");
    push_color("pattern_colour_end_rgb", "Colour_Pattern_EndRGB_FromObject");
    push_float("pattern_colour_end_sat", "Colour_Pattern_EndSaturation_FromObject");
    push_float("pattern_colour_interp", "PatternColourInterp_FromObject");
    push_string("pattern_texture", "PatternTexture_FromObject");
    push_float("pat_tiling_x", "PatternTiling_FromObject");
    push_float("pattern_intensity", "PatternIntensity_FromObject");
    push_string("pattern_library", "PatternLibraryFolderName_FromSymbol");
    push_string("pattern_category", "PatternCategoryFolderName_FromSymbol");
    push_float("pattern_index", "SelectedPatternIndex_FromSymbol");

    // --- MIDI MAPPINGS ---
    push_float("midi_trigger_state", "MIDITriggerStateFromObject");
    push_color("midi_trigger_rgb", "MIDITrigger_RGB_FromObject");
    push_float("midi_trigger_sat", "MIDITrigger_Saturation_FromObject");
    push_float("midi_trigger_pitch", "MIDITrigger_Pitch_FromObject");
    push_float("midi_trigger_velocity", "MIDITrigger_Velocity_FromObject");
    push_float("trigger_offset", "MIDITrigger_Offset_FromObject");
    push_float("midi_trigger_duration", "MIDITrigger_Duration_FromObject");

    // --- TEXT MAPPINGS ---
    push_float("text_italic", "TextItalic_FromObject");
    push_float("text_bold", "TextBold_FromObject");
    push_float("text_spacing", "TextSpacing_FromObject");
    push_float("text_alignment", "TextAlignment_FromObject");
    push_float("base_bounds_x", "TextBoundsX_FromObject");
    push_float("base_bounds_y", "TextBoundsY_FromObject");
    push_string("text_font", "TextFont_FromObject");
    push_string("text_content", "TextContent_FromObject");
}