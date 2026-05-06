autowatch = 1;
outlets = 2;
// outlet 0: gate state (1 = pass, 0 = block during automation curve playback)
// outlet 1: init_done bang — fires once observer is live and gate state valid.
//
// LFO/modulation detection is handled by the pure-Max rate consistency
// subpatcher elsewhere; this file only detects recorded automation playback.
//
// Transport state (is_playing, record_mode) arrives via global send/receive
// from a single shared transport observer in SIGNe-Screen — wire as:
//   r SIGNe_IsPlaying    → prepend is_playing    → js auto_gate.js
//   r SIGNe_IsRecording  → prepend record_mode   → js auto_gate.js

var targetName = "";
for (var i = 1; i < jsarguments.length; i++) {
    targetName += jsarguments[i];
    if (i < jsarguments.length - 1) targetName += " ";
}

var isPlaying    = 0;
var isRecording  = 0;
var autoState    = 0;
var paramObs     = null;
var isReady      = false;

// ─────────────────────────────────────────────────────────────────────────────
// INIT — called once from live.thisdevice bang.
// ─────────────────────────────────────────────────────────────────────────────
function init() {
    if (!paramObs) paramObs = new LiveAPI(paramCallback);
    _find_and_bind_param();
}

function _find_and_bind_param() {
    var api = new LiveAPI("this_device");
    var count = api.getcount("parameters");

    for (var i = 0; i < count; i++) {
        var p = new LiveAPI("this_device parameters " + i);
        var pName = p.get("name") ? p.get("name").toString() : "";

        if (pName === targetName) {
            paramObs.path     = "this_device parameters " + i;
            paramObs.property = "automation_state";

            var aState = paramObs.get("automation_state");
            if (aState) autoState = aState[0];

            isReady = true;
            outlet(1, "bang");
            updateState();
            return;
        }
    }

    post("auto_gate: parameter '" + targetName + "' not found — gate held open.\n");
    outlet(1, "bang");
    outlet(0, 1);
}

// ─────────────────────────────────────────────────────────────────────────────
// MESSAGE HANDLERS — receive transport state via global broadcast
// ─────────────────────────────────────────────────────────────────────────────
function is_playing(v)  { isPlaying  = v; updateState(); }
function record_mode(v) { isRecording = v; updateState(); }

// ─────────────────────────────────────────────────────────────────────────────
// OBSERVER — fires only on automation_state changes (rare)
// ─────────────────────────────────────────────────────────────────────────────
function paramCallback(args) {
    if (args[0] === "automation_state") { autoState = args[1]; updateState(); }
}

// ─────────────────────────────────────────────────────────────────────────────
// CORE DECISION
// ─────────────────────────────────────────────────────────────────────────────
function updateState() {
    if (!isReady) { outlet(0, 1); return; }
    var isHuman = (isPlaying == 1 && isRecording == 0 && autoState == 1) ? 0 : 1;
    outlet(0, isHuman);
}