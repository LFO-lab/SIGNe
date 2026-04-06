autowatch = 1;

// --- STATE VARIABLES ---
var transportPos = 0.0;
var zoom = 12.0; // Replaced visibleBars
var aspectRatio = 1.77; 
var beatsPerBar = 4.0;
var bpm = 120.0;
var showTimeMode = 0; 
var yOffset = -0.9; 
var textBaseScale = 0.05; 
var rulerEnabled = 0; 
var textColor = [1.0, 1.0, 1.0, 1.0]; 

var textPool = [];
var poolSize = 128; 
var poolInitialized = false;

function loadbang() { init_pool(); }

function init_pool() {
    if (poolInitialized) return; 
    
    for (var i = 0; i < poolSize; i++) {
        var t = new JitterObject("jit.gl.text", "SIGNe");
        t.blend_enable = 1;
        t.depth_enable = 0;
        t.layer = 100;
        t.transform_reset = 2;
        t.align = 0; 
        t.mode = "3d"; 
        t.color = textColor;
        
        t.enable = 0; 
        t.automatic = 0; 
        
        textPool.push(t);
    }
    poolInitialized = true;
}

function notifydeleted() {
    for (var i = 0; i < poolSize; i++) {
        if (textPool[i]) textPool[i].freepeer(); 
    }
}

// --- DATA ROUTING ---
function msg_float(v) { transportPos = v; }
function zoom_level(v) { zoom = Math.max(1.0, v); } // Send 'zoom_level $1' from your Max dial
function aspect_ratio(v) { aspectRatio = v; } 
function beats_per_bar(v) { beatsPerBar = Math.max(1, v); }
function set_bpm(v) { bpm = Math.max(1, v); }
function set_mode(v) { showTimeMode = v; }

// --- UI & FEATURES ---
function font_size(v) { 
    var clampedV = Math.max(0.0, Math.min(1.0, v)); 
    textBaseScale = 0.03 + (clampedV * 0.02); 
}

function time_ruler_color(r, g, b, a) {
    var alpha = (typeof a !== 'undefined') ? a : 1.0;
    textColor = [r, g, b, alpha];
}

function enable_time_ruler(v) {
    rulerEnabled = v;
    
    if (rulerEnabled === 0) {
        for (var j = 0; j < poolSize; j++) {
            if (textPool[j]) {
                textPool[j].enable = 0;
                textPool[j].automatic = 0;
            }
        }
    }
}

// --- THE GPU RENDER LOOP ---
function bang() {
    if (!poolInitialized || rulerEnabled === 0) return;

    var actualVisibleBars = zoom * aspectRatio;
    
    // Level of Detail (LOD) - dynamically skip drawing numbers if zoomed out too far
    var step = 1;
    if (actualVisibleBars > 32) step = 4;
    if (actualVisibleBars > 64) step = 8;
    if (actualVisibleBars > 128) step = 16;
    if (actualVisibleBars > 256) step = 32;

    // Snap the starting bar to the nearest LOD step boundary
    var startBar = Math.floor(transportPos / step) * step;
    var endBar = Math.ceil(transportPos + actualVisibleBars);
    
    var correctedXScale = textBaseScale / aspectRatio;
    var voiceIndex = 0;
    var textNudgeX = 0.004; 

    for (var i = startBar; i <= endBar; i += step) {
        if (voiceIndex >= poolSize) break; 

        var normX = (i - transportPos) / actualVisibleBars;
        
        // Skip drawing if it falls off the left edge (can happen due to LOD snapping)
        if (normX < 0) continue; 
        
        var glX = (normX * 2.0) - 1.0; 

        var txt = "";
        if (showTimeMode === 1) {
            var zeroIndexedBar = i - 1; 
            var isNegative = zeroIndexedBar < 0;
            var totalBeats = Math.abs(zeroIndexedBar) * beatsPerBar;
            var totalSeconds = totalBeats * (60.0 / bpm);
            var mins = Math.floor(totalSeconds / 60);
            var secs = Math.floor(totalSeconds % 60);
            var secStr = (secs < 10) ? "0" + secs : secs;
            txt = (isNegative ? "-" : "") + mins + ":" + secStr;
        } else {
            txt = i.toString();
        }

        textPool[voiceIndex].text(txt.toString()); 
        textPool[voiceIndex].position = [glX + textNudgeX, yOffset, 0.0];
        textPool[voiceIndex].scale = [correctedXScale, textBaseScale, textBaseScale];
        textPool[voiceIndex].color = textColor; 
        textPool[voiceIndex].enable = 1;
        textPool[voiceIndex].automatic = 1;
        
        voiceIndex++;
    }

    for (var j = voiceIndex; j < poolSize; j++) {
        textPool[j].enable = 0;
        textPool[j].automatic = 0;
    }
}

init_pool();