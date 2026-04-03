autowatch = 1;

inlets = 1;
outlets = 4;

// =========================================================
// STATE VARIABLES & SETTINGS
// =========================================================
var ignoreX = false;
var ignoreY = false;

var isDraggingMarquee = false;
var isDraggingGroup = false;
var isScalingGroup = false;
var isRotatingGroup = false;
var isAdjustingOpacityGroup = false; 
var isScrubbing = false; 
var handledClick = false; 
var prevBtn = 0;
var got3DAnchor = false;
var lastViewportInteractionTime = 0; 

var isAltDown = 0;
var isShiftDown = 0;
var isODown = 0; 
var linkScale = 1; 
var activeRatio = 1.0; 

var quantX = "free";
var quantY = "free";
var quantSpacing = "free";

var isHumanX = 1; 
var isHumanY = 1; 

// NEW: 0 = Snap Center, 1 = Snap Trigger
var snapToTrigger = 1; 

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
function o_key(state) { isODown = state; } 
function set_quant_x(v) { quantX = v; quantSpacing = v; } 
function set_quant_y(v) { quantY = v; }
function set_quant_spacing(v) { quantSpacing = v; }

function is_human_x(v) { isHumanX = v; }
function is_human_y(v) { isHumanY = v; }

// NEW: Receive the Snap Mode toggle
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
            lastViewportInteractionTime = new Date().getTime(); 
            target = target.replace(/_\d+$/, "");
            
            if (target === "BackgroundCollision") {
                isDraggingMarquee = true;
                isDraggingGroup = false; isScalingGroup = false; isRotatingGroup = false; isAdjustingOpacityGroup = false;
                got3DAnchor = false;
                a2x = (curX / winW) * 2.0 - 1.0; a2y = 1.0 - (curY / winH) * 2.0;
                outlet(1, "getposition");
                draw_selections();
            } else {
                var registry = new Dict("SigneRegistry");
                if (!registry.contains(target)) return;
                
                var isSelected = registry.get(target + "::selected");
                
                if (isSelected != 1) {
                    var keys = registry.getkeys();
                    if (keys != null) {
                        if (typeof keys === "string") keys = [keys];
                        for (var i = 0; i < keys.length; i++) {
                            registry.set(keys[i] + "::selected", 0);
                            outlet(2, "send", keys[i]); outlet(2, "selected", 0); outlet(2, "selected_via_mouse", 0); 
                        }
                    }
                    registry.set(target + "::selected", 1);
                    outlet(2, "send", target); outlet(2, "selected", 1);

                    if (linkScale === 1) {
                        var x = registry.get(target + "::scale_x") || 1.0;
                        var y = registry.get(target + "::scale_y") || 1.0;
                        activeRatio = (x !== 0) ? (y / x) : 1.0;
                    }
                }
                
                outlet(2, "send", target); outlet(2, "selected_via_mouse", 1);
                
                if (isODown === 1) isAdjustingOpacityGroup = true;
                else if (isAltDown === 1) isScalingGroup = true;
                else if (isShiftDown === 1) isRotatingGroup = true;
                else isDraggingGroup = true;
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
            
            var bx = registry.get(id + "::base_x");
            var newX;
            
            // NEW: Snap the Trigger Offset line if active!
            if (snapToTrigger === 1) {
                var tOff = registry.get(id + "::trigger_offset") || 0.0;
                var rawTriggerPos = bx + tOff + deltaX;
                var snappedTriggerPos = snap(rawTriggerPos, quantX);
                newX = snappedTriggerPos - tOff;
            } else {
                newX = snap(bx + deltaX, quantX);
            }
            
            var newY = snap(registry.get(id + "::base_y") + deltaY, quantY);
            registry.set(id + "::x", newX); registry.set(id + "::y", newY);
            outlet(2, "send", id); outlet(2, "move_x", newX); outlet(2, "move_y", newY);
        }
    }
    draw_selections();
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
        var id = keys[i], isSelected = 0, objX = registry.get(id + "::x"), objY = registry.get(id + "::y");
		var sx = registry.get(id + "::bounds_x");
        if (sx == null) sx = registry.get(id + "::scale_x") || 0.0;
        var sy = registry.get(id + "::bounds_y");
        if (sy == null) sy = registry.get(id + "::scale_y") || 0.0;
        var count = registry.get(id + "::count") || 1, spacing = registry.get(id + "::spacing") || 0.0;
        var gRad = -(registry.get(id + "::group_rot") || 0.0) * (Math.PI * 2.0);
        var gCosT = Math.cos(gRad), gSinT = Math.sin(gRad);
        for (var j = 0; j < count; j++) {
            var ix = objX + (j * spacing * gCosT), iy = objY + (j * spacing * gSinT);
            if (minX <= ix+sx && maxX >= ix-sx && minY <= iy+sy && maxY >= iy-sy) {
                isSelected = 1; if (objX < leftmostX) { leftmostX = objX; leftmostID = id; }
                break; 
            }
        }
        registry.set(id + "::selected", isSelected);
    }
    for (var i = 0; i < keys.length; i++) {
        var id = keys[i]; var isSelected = registry.get(id + "::selected");
        outlet(2, "send", id); outlet(2, "selected", isSelected); 
        outlet(2, "selected_via_mouse", (id === leftmostID) ? 1 : 0);
    }
    draw_selections();
}

// =========================================================
// UI INTERACTIONS 
// =========================================================
function remove(id) {
    var registry = new Dict("SigneRegistry");
    if (registry.contains(id)) registry.remove(id);
    draw_selections();
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
    outlet(2, "send", target); outlet(2, "selected", 1);
    take_centroid_snapshot(registry);

    if (linkScale === 1) {
        var x = registry.get(target + "::scale_x") || 1.0;
        var y = registry.get(target + "::scale_y") || 1.0;
        activeRatio = (x !== 0) ? (y / x) : 1.0;
    }

    draw_selections();
}

// NEW: Dynamically shift the coordinate to snap the trigger instead of the center
function ui_move_x(id, x) {
    var registry = new Dict("SigneRegistry");
    if (!registry.contains(id)) return;
    
    var newX = x;
    if (isHumanX === 1) {
        if (snapToTrigger === 1) {
            var tOff = registry.get(id + "::trigger_offset") || 0.0;
            var snappedTriggerPos = snap(x + tOff, quantX);
            newX = snappedTriggerPos - tOff;
        } else {
            newX = snap(x, quantX);
        }
    }
    
    registry.set(id + "::x", newX);
    outlet(2, "send", id);
    draw_selections();
}

function ui_move_y(id, y) {
    var registry = new Dict("SigneRegistry");
    if (!registry.contains(id)) return;
    var v = (isHumanY === 1) ? snap(y, quantY) : y; 
    registry.set(id + "::y", v);
    outlet(2, "send", id);
    draw_selections();
}

// NEW: Catch the offset from the UI dial so we can use it in math!
function ui_trigger_offset(id, val) {
    var registry = new Dict("SigneRegistry");
    if (!registry.contains(id)) return;
    registry.set(id + "::trigger_offset", val);
    draw_selections();
}

function dial_scale_x(id, val, isHuman) {
    if (isScalingGroup || ignoreX) return; 

    var registry = new Dict("SigneRegistry");
    if (!registry.contains(id)) return;

    registry.set(id + "::scale_x", val);
    outlet(2, "send", id); 
    
    outlet(2, "scale_x", val); 

    var humanInteraction = (isHuman !== undefined) ? isHuman : 1;

    if (linkScale === 1 && humanInteraction === 1) {
        var newY = val * activeRatio;
        registry.set(id + "::scale_y", newY);
        
        ignoreY = true;
        outlet(2, "scale_y", newY); 
        outlet(2, "ui_y", newY);    
        ignoreY = false;
    }
    draw_selections();
}

function dial_scale_y(id, val, isHuman) {
    if (isScalingGroup || ignoreY) return; 

    var registry = new Dict("SigneRegistry");
    if (!registry.contains(id)) return;

    registry.set(id + "::scale_y", val);
    outlet(2, "send", id); 
    outlet(2, "scale_y", val); 

    var humanInteraction = (isHuman !== undefined) ? isHuman : 1;

    if (linkScale === 1 && humanInteraction === 1) {
        var newX = (activeRatio !== 0) ? (val / activeRatio) : val;
        registry.set(id + "::scale_x", newX);
        
        ignoreX = true;
        outlet(2, "scale_x", newX); 
        outlet(2, "ui_x", newX);    
        ignoreX = false;
    }
    draw_selections();
}

function ui_scale_x(id, val) {
    var registry = new Dict("SigneRegistry");
    if (!registry.contains(id)) return;
    registry.set(id + "::scale_x", val); 
    outlet(2, "send", id); 
    draw_selections();
}

function ui_scale_y(id, val) {
    var registry = new Dict("SigneRegistry");
    if (!registry.contains(id)) return;
    registry.set(id + "::scale_y", val); 
    outlet(2, "send", id); 
    draw_selections();
}

function ui_rotate(id, val) {
    var registry = new Dict("SigneRegistry");
    if (!registry.contains(id)) return;
    registry.set(id + "::rotation", val); 
    outlet(2, "send", id); 
    draw_selections();
}

function ui_opacity(id, val) {
    var registry = new Dict("SigneRegistry");
    if (!registry.contains(id)) return;
    registry.set(id + "::opacity", val); 
    outlet(2, "send", id); 
}

function ui_count(id, val) {
    var registry = new Dict("SigneRegistry");
    if (!registry.contains(id)) return;
    registry.set(id + "::count", val); outlet(2, "send", id); 
    draw_selections();
}

function ui_spacing(id, val) {
    var registry = new Dict("SigneRegistry");
    if (!registry.contains(id)) return;
    var v = (isHumanX === 1) ? snap(val, quantSpacing) : val; // Assuming spacing behaves like X
    registry.set(id + "::spacing", v); 
    outlet(2, "send", id); 
    draw_selections();
}

function ui_group_rot(id, val) {
    var registry = new Dict("SigneRegistry");
    if (!registry.contains(id)) return;
    registry.set(id + "::group_rot", val); outlet(2, "send", id); 
    draw_selections();
}

function ui_bounds_x(id, val) {
    var registry = new Dict("SigneRegistry");
    if (!registry.contains(id)) return;
    registry.set(id + "::bounds_x", val);
    draw_selections();
}

function ui_bounds_y(id, val) {
    var registry = new Dict("SigneRegistry");
    if (!registry.contains(id)) return;
    registry.set(id + "::bounds_y", val);
    draw_selections();
}

// =========================================================
// CAMERA TRACKING & TRANSPORT
// =========================================================
function set_pinned(id, state) {
    var registry = new Dict("SigneRegistry");
    if (registry.contains(id)) registry.set(id + "::pinned", state);
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
        draw_selections();
    }
    lastCamX = cx; lastCamY = cy;
}

// NEW: Snap the trigger to the transport playhead, rather than the object center
function move_to_transport(id) {
    if (!liveSet) liveSet = new LiveAPI(null, "live_set");
    var num = parseFloat(liveSet.get("signature_numerator")[0]);
    var den = parseFloat(liveSet.get("signature_denominator")[0]);
    var beatsPerBar = (num / den) * 4.0; 
    var beats = parseFloat(liveSet.get("current_song_time")[0]);
    var bars = beats / beatsPerBar; 
    
    var v = bars;
    var registry = new Dict("SigneRegistry");
    if (!registry.contains(id)) return;

    if (snapToTrigger === 1) {
        var tOff = registry.get(id + "::trigger_offset") || 0.0;
        var snappedTriggerPos = snap(bars, quantX);
        v = snappedTriggerPos - tOff;
    } else {
        v = snap(bars, quantX);
    }

    registry.set(id + "::x", v);
    outlet(2, "send", id); outlet(2, "move_x", v); draw_selections();
}

function move_transport_to_object(id) {
    if (!liveSet) liveSet = new LiveAPI(null, "live_set");
    var registry = new Dict("SigneRegistry");
    if (registry.contains(id)) {
        var num = parseFloat(liveSet.get("signature_numerator")[0]);
        var den = parseFloat(liveSet.get("signature_denominator")[0]);
        var beatsPerBar = (num / den) * 4.0;
        var bars = parseFloat(registry.get(id + "::x"));
        var beats = bars * beatsPerBar;
        liveSet.set("current_song_time", Number(beats));
    }
}

// =========================================================
// VISUAL FEEDBACK (3D SKETCH OUTLINES)
// =========================================================
function draw_selections() {
    var registry = new Dict("SigneRegistry");
    var keys = registry.getkeys();
    outlet(3, "reset");
    if (keys == null) return;
    if (typeof keys === "string") keys = [keys];
    for (var i = 0; i < keys.length; i++) {
        var id = keys[i];
        if (registry.get(id + "::selected") == 1) { 
            outlet(3, "glcolor", (registry.get(id + "::locked") == 1) ? [0.2, 0.6, 1.0, 1.0] : [1.0, 0.8, 0.0, 1.0]);
            var x = registry.get(id+"::x"), y = registry.get(id+"::y");
			var sx = registry.get(id + "::bounds_x");
            if (sx == null) sx = registry.get(id + "::scale_x") || 0.0;
            var sy = registry.get(id + "::bounds_y");
            if (sy == null) sy = registry.get(id + "::scale_y") || 0.0;            var rot = registry.get(id+"::rotation") || 0.0, gRot = registry.get(id+"::group_rot") || 0.0;
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
// GROUP PROPERTY DISTRIBUTION (From Properties Window)
// =========================================================
function group_prop_float(propName, val) {
    var registry = new Dict("SigneRegistry");
    var keys = registry.getkeys();
    if (keys == null) return;
    if (typeof keys === "string") keys = [keys];
    for (var i = 0; i < keys.length; i++) {
        var id = keys[i];
        if (registry.get(id + "::selected") == 1) {
            registry.set(id + "::" + propName, val);
            outlet(2, "send", id);
            outlet(2, propName, val);
        }
    }
}

function group_prop_rgb(propName, r, g, b) {
    var registry = new Dict("SigneRegistry");
    var keys = registry.getkeys();
    if (keys == null) return;
    if (typeof keys === "string") keys = [keys];
    for (var i = 0; i < keys.length; i++) {
        var id = keys[i];
        if (registry.get(id + "::selected") == 1) {
            registry.set(id + "::" + propName, [r, g, b]); 
            outlet(2, "send", id);
            outlet(2, propName, r, g, b);
        }
    }
}

function group_prop_symbol(propName, sym) {
    var registry = new Dict("SigneRegistry");
    var keys = registry.getkeys();
    if (keys == null) return;
    if (typeof keys === "string") keys = [keys];
    for (var i = 0; i < keys.length; i++) {
        var id = keys[i];
        if (registry.get(id + "::selected") == 1) {
            registry.set(id + "::" + propName, sym);
            outlet(2, "send", id);
            outlet(2, propName, sym);
        }
    }
}