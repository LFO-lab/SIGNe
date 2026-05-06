// context_claim.js  —  Atomic context ownership for SIGNe-Screen
//
// INLET 0 messages:
//   claim    — attempt to claim the SIGNe context (call from live.thisdevice)
//   release  — release the claim (call from freebang / device deletion)
//
// OUTLET 0:  1 = claim succeeded → proceed as valid instance (rename to SIGNe)
//            0 = claim failed    → another instance owns it  (rename to Impostor)

autowatch = 1;
outlets = 1;

var DICT_NAME = "SIGNe_ContextOwnership";
var claimed   = false;

function claim() {
    var d = new Dict(DICT_NAME);

    var status = null;
    try { status = d.get("status"); } catch(e) {}

    if (status === "claimed") {
        // Another instance already owns the context
        outlet(0, 0);
        return;
    }

    // Unclaimed — take it atomically (Max scheduler is single-threaded,
    // so no two js objects can execute this block simultaneously)
    d.set("status", "claimed");
    claimed = true;
    outlet(0, 1);
}

function release() {
    if (claimed) {
        var d = new Dict(DICT_NAME);
        d.set("status", "free");
        claimed = false;
        // post("SIGNe context_claim: released\n");
    }
}

// Safety: also release on script reload (autowatch)
release();