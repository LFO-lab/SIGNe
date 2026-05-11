autowatch = 1;
outlets = 2;
// outlet 0: gate state (1 = pass, 0 = block during automation curve playback)
// outlet 1: init_done bang — fires once observer is live and gate state valid.
//
// LFO/modulation detection is handled by the pure-Max rate consistency
// subpatcher elsewhere; this file only detects recorded automation playback.
//
// Transport state arrives via global send/receive from a single shared
// transport observer in SIGNe-Screen — wire as:
//   r SIGNe_IsPlaying    → prepend is_playing    → js auto_gate.js
//   r SIGNe_IsRecording  → prepend record_mode   → js auto_gate.js
//
// ─────────────────────────────────────────────────────────────────────────────
// ARGUMENTS — three accepted forms, in order of preference
//
//   js auto_gate.js NAME INDEX     ← fastest + safest (recommended)
//   js auto_gate.js INDEX          ← fastest, no name verification
//   js auto_gate.js NAME           ← legacy fallback, scans param list (slow)
//
// INDEX is the LiveAPI flat-list index, NOT the parameter_order attribute.
// LiveAPI INDEX = parameter_order + 1 (Live prepends "Device On" at index 0).
//
// SELF-HEALING: if INDEX-based bind fails name verification, falls back to a
// name scan, binds correctly, and posts the right INDEX value.
// ─────────────────────────────────────────────────────────────────────────────
//
// ▒▒▒▒▒ DIAGNOSTIC INSTRUMENTATION — REMOVE WHEN CASCADE INVESTIGATION DONE ▒▒
//
// Three counters per AutoModGate instance, logged when they exceed expected
// counts. During a normal boot we expect: init() called once, init_done
// emitted once, paramCallback fired once (with property=automation_state).
//
// If init() fires repeatedly → the patch is invoking init multiple times
//   (could be live.thisdevice firing more than once, or a loadbang chain
//   triggering init alongside live.thisdevice).
// If init_done outlets fire repeatedly without init() repeating → the patch
//   wiring downstream of outlet 1 is creating a feedback loop.
// If paramCallback fires with non-automation_state properties → Live is
//   pushing spurious notifications during device load (rare but possible).
//
// All diagnostic post() calls are gated on count > 1 so the first (expected)
// occurrence stays silent. A clean boot produces zero diagnostic output.
//
// ─────────────────────────────────────────────────────────────────────────────

var targetName  = "";
var targetIndex = -1;

(function parseArgs() {
    for (var i = 1; i < jsarguments.length; i++) {
        var arg = jsarguments[i];
        if (typeof arg === "number" && arg === Math.floor(arg) && arg >= 0 && targetIndex < 0) {
            targetIndex = arg;
        } else {
            if (targetName.length > 0) targetName += " ";
            targetName += arg;
        }
    }
})();

// Diagnostic counters (per-instance)
var _diagInitCount = 0;
var _diagEmitCount = 0;
var _diagCbCount   = 0;

function _diagLabel() {
    return "auto_gate[" + (targetName || ("idx=" + targetIndex)) + "]";
}

var isPlaying   = 0;
var isRecording = 0;
var autoState   = 0;
var paramObs    = null;
var isReady     = false;
var lastGateOut = null;

// ─────────────────────────────────────────────────────────────────────────────
// INIT — called once from live.thisdevice bang.
// ─────────────────────────────────────────────────────────────────────────────
function init() {
    _diagInitCount++;
    if (_diagInitCount > 1) {
        post(_diagLabel() + ": init() called #" + _diagInitCount +
             " — RE-INIT (cascade source: patch is invoking init repeatedly)\n");
    }

    if (!paramObs) paramObs = new LiveAPI(paramCallback);
    _bind_param();
}

// ─────────────────────────────────────────────────────────────────────────────
// _emit_init_done — single chokepoint for outlet 1 emissions, with cascade
// detection. If this counter ever exceeds 1, init_done is being re-emitted
// without a corresponding extra init() call (i.e. the cascade is downstream
// of this outlet, not from init() being re-invoked).
// ─────────────────────────────────────────────────────────────────────────────
function _emit_init_done() {
    _diagEmitCount++;
    if (_diagEmitCount > 1) {
        post(_diagLabel() + ": init_done outlet emitted #" + _diagEmitCount +
             " (init was called #" + _diagInitCount +
             "; if these don't match, cascade source is downstream of outlet 1)\n");
    }
    // Emit the init_done bang only once per instance to avoid downstream
    // rebroadcast loops. Diagnostics above still post on subsequent calls
    // but we suppress repeated emissions which are the usual cause of
    // global init cascades during boot.
    if (_diagEmitCount === 1) outlet(1, "bang");
}

// ─────────────────────────────────────────────────────────────────────────────
// _scan_for_name — walk parameter list, return LiveAPI index or -1.
// ─────────────────────────────────────────────────────────────────────────────
function _scan_for_name(name) {
    var api   = new LiveAPI("this_device");
    var count = api.getcount("parameters");
    for (var j = 0; j < count; j++) {
        var p     = new LiveAPI("this_device parameters " + j);
        var pName = p.get("name") ? p.get("name").toString() : "";
        if (pName === name) return j;
    }
    return -1;
}

function _complete_bind() {
    var aState = paramObs.get("automation_state");
    if (aState) autoState = aState[0];
    isReady = true;
    _emit_init_done();
    updateState();
}

function _bind_param() {
    if (targetIndex >= 0) {
        paramObs.path     = "this_device parameters " + targetIndex;
        paramObs.property = "automation_state";

        if (targetName.length === 0) {
            _complete_bind();
            return;
        }

        var nameProp   = paramObs.get("name");
        var actualName = nameProp ? nameProp.toString() : "";

        if (actualName === targetName) {
            _complete_bind();
            return;
        }

        post(_diagLabel() + ": index " + targetIndex + " is '" + actualName +
             "', expected '" + targetName + "'. Scanning by name…\n");

        var foundAt = _scan_for_name(targetName);
        if (foundAt >= 0) {
            paramObs.path     = "this_device parameters " + foundAt;
            paramObs.property = "automation_state";
            post(_diagLabel() + ": found at index " + foundAt +
                 ". Update INDEX argument from " + targetIndex + " to " +
                 foundAt + ".\n");
            _complete_bind();
            return;
        }

        post(_diagLabel() + ": NOT FOUND in scan — gate held open.\n");
        _emit_init_done();
        outlet(0, 1);
        return;
    }

    if (targetName.length === 0) {
        post(_diagLabel() + ": no name or index argument — gate held open.\n");
        _emit_init_done();
        outlet(0, 1);
        return;
    }

    var foundAt2 = _scan_for_name(targetName);
    if (foundAt2 >= 0) {
        paramObs.path     = "this_device parameters " + foundAt2;
        paramObs.property = "automation_state";
        _complete_bind();
        return;
    }

    post(_diagLabel() + ": parameter not found — gate held open.\n");
    _emit_init_done();
    outlet(0, 1);
}

// ─────────────────────────────────────────────────────────────────────────────
// MESSAGE HANDLERS — receive transport state via global broadcast
// ─────────────────────────────────────────────────────────────────────────────
function is_playing(v)  { isPlaying   = v; updateState(); }
function record_mode(v) { isRecording = v; updateState(); }

// ─────────────────────────────────────────────────────────────────────────────
// OBSERVER — fires on automation_state changes (rare in normal use).
// ─────────────────────────────────────────────────────────────────────────────
function paramCallback(args) {
    if (args[0] === "id") return;

    _diagCbCount++;
    if (_diagCbCount > 1 || args[0] !== "automation_state") {
        post(_diagLabel() + ": paramCallback #" + _diagCbCount +
             " property=" + args[0] + " value=" + args[1] + "\n");
    }
    if (args[0] === "automation_state") { autoState = args[1]; updateState(); }
}

// ─────────────────────────────────────────────────────────────────────────────
// CORE DECISION
// ─────────────────────────────────────────────────────────────────────────────
function updateState() {
    if (!isReady) { _emit_gate_state(1); return; }
    var isHuman = (isPlaying == 1 && isRecording == 0 && autoState == 1) ? 0 : 1;
    _emit_gate_state(isHuman);
}

function _emit_gate_state(v) {
    if (lastGateOut === v) return;
    lastGateOut = v;
    outlet(0, v);
}
