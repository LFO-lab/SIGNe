autowatch = 1;
outlets = 1;

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

function bang() {
    // Safely instantiate API objects to prevent silent crashes
    if (!transportObs) {
        transportObs = new LiveAPI(transportCallback, "live_set");
        if (transportObs.path) transportObs.property = "is_playing";
    }
    if (!recordObs) {
        recordObs = new LiveAPI(recordCallback, "live_set");
        if (recordObs.path) recordObs.property = "record_mode";
    }
    if (!paramObs) {
        paramObs = new LiveAPI(paramCallback);
    }
    
    var api = new LiveAPI("this_device");
    var count = api.getcount("parameters");
    
    for (var i = 0; i < count; i++) { 
        var p = new LiveAPI("this_device parameters " + i);
        var pName = p.get("name") ? p.get("name").toString() : "";
        
        if (pName === targetName) {
            paramObs.path = "this_device parameters " + i;
            paramObs.property = "automation_state";
            
            var aState = paramObs.get("automation_state");
            if (aState) autoState = aState[0];
            
            var pState = transportObs.get("is_playing");
            if (pState) isPlaying = pState[0];
            
            var rState = recordObs.get("record_mode");
            if (rState) isRecording = rState[0];
            
            updateState();
            post("SUCCESS: Smart Gate locked to [" + targetName + "]\n");
            return;
        }
    }
    outlet(0, 1);
}

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
    
    // Block the link ONLY during clean playback
    if (isPlaying == 1 && isRecording == 0 && autoState == 1) {
        isHuman = 0;
    }
    
    outlet(0, isHuman);
}