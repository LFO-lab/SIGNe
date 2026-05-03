autowatch = 1;
outlets = 2;
// outlet 0: gate state (1 = human/pass, 0 = automation/block)
// outlet 1: init_done bang — fires once observers are live and ready.
//           Wire this to the gate's right inlet (replacing delay 1000 → 1).

var targetName = "";
for (var i = 1; i < jsarguments.length; i++) {
    targetName += jsarguments[i];
    if (i < jsarguments.length - 1) targetName += " ";
}

var isPlaying = 0;
var isRecording = 0;
var autoState = 1;

var transportObs = null;
var recordObs = null;
var paramObs = null;
var isReady = false;

// ─────────────────────────────────────────────────────────────────────────────
// INIT: called once from live.thisdevice bang in the patch.
// Constructs all LiveAPI observers and scans parameters exactly once.
// ─────────────────────────────────────────────────────────────────────────────
function init() {
    isReady = false;

    if (!transportObs) {
        transportObs = new LiveAPI(transportCallback, "live_set");
    }
    transportObs.property = "is_playing";

    if (!recordObs) {
        recordObs = new LiveAPI(recordCallback, "live_set");
    }
    recordObs.property = "record_mode";

    if (!paramObs) {
        paramObs = new LiveAPI(paramCallback);
    }

    _find_and_bind_param();
}

function _find_and_bind_param() {
    var api = new LiveAPI("this_device");
    var count = api.getcount("parameters");

    for (var i = 0; i < count; i++) {
        var p = new LiveAPI("this_device parameters " + i);
        var pName = p.get("name") ? p.get("name").toString() : "";

        if (pName === targetName) {
            paramObs.path = "this_device parameters " + i;
            paramObs.property = "automation_state";

            // Read initial states synchronously before signalling readiness
            var aState = paramObs.get("automation_state");
            if (aState) autoState = aState[0];

            var pState = transportObs.get("is_playing");
            if (pState) isPlaying = pState[0];

            var rState = recordObs.get("record_mode");
            if (rState) isRecording = rState[0];

            isReady = true;

            // outlet 1 fires BEFORE outlet 0 so the gate is open
            // by the time the first state value arrives.
            outlet(1, "bang");
            updateState();
            return;
        }
    }

    // Parameter not found — open gate defensively so nothing silently stalls.
    post("auto_gate: parameter '" + targetName + "' not found — gate held open.\n");
    outlet(1, "bang");
    outlet(0, 1);
}

// ─────────────────────────────────────────────────────────────────────────────
// BANG: lightweight query, called by the gate-trigger path. No API work.
// ─────────────────────────────────────────────────────────────────────────────
function bang() {
    if (!isReady) {
        outlet(0, 1);
        return;
    }
    updateState();
}

// ─────────────────────────────────────────────────────────────────────────────
// OBSERVERS
// ─────────────────────────────────────────────────────────────────────────────
function transportCallback(args) {
    if (args[0] === "is_playing") {
        isPlaying = args[1];
        updateState();
    }
}

function recordCallback(args) {
    if (args[0] === "record_mode") {
        isRecording = args[1];
        updateState();
    }
}

function paramCallback(args) {
    if (args[0] === "automation_state") {
        autoState = args[1];
        updateState();
    }
}

function updateState() {
    var isHuman = 1;

    // Block ONLY during clean automation playback
    if (isPlaying == 1 && isRecording == 0 && autoState == 1) {
        isHuman = 0;
    }

    outlet(0, isHuman);
}