// dump_params.js
// ─────────────────────────────────────────────────────────────────────────────
// Diagnostic: print every parameter exposed by this device's LiveAPI list.
//
// USAGE: place a "js dump_params.js" object in the device. Drive its inlet
// with a `bang` (e.g. from a button, or from `live.thisdevice` after load).
// Output appears in the Max Console.
//
// Walks all indices and reports name + automation_state for each. Also probes
// a few indices past `getcount("parameters")` to confirm where the list ends.
// ─────────────────────────────────────────────────────────────────────────────

autowatch = 1;

function bang() { dump(); }

function dump() {
    var api   = new LiveAPI("this_device");
    var count = api.getcount("parameters");

    post("\n══════════════════════════════════════════════════════\n");
    post("dump_params: this_device has " + count + " parameters\n");
    post("══════════════════════════════════════════════════════\n");
    post("  idx  name                                  state\n");
    post("  ───  ────────────────────────────────────  ─────\n");

    // Walk the whole list, plus a few past the end to see how Live behaves
    // beyond the count. Anything past `count` should show as missing.
    var probeMax = count + 5;
    for (var i = 0; i < probeMax; i++) {
        var p     = new LiveAPI("this_device parameters " + i);
        var nameProp  = p.get("name");
        var stateProp = p.get("automation_state");

        var name  = nameProp  ? nameProp.toString()  : "(no name)";
        var state = stateProp ? stateProp.toString() : "(none)";

        var marker = (i < count) ? "  " : "* ";   // * marks past-end probes
        var idxStr = (i < 10) ? ("  " + i) : (i < 100 ? (" " + i) : ("" + i));

        // Pad name to 38 chars for column alignment
        while (name.length < 38) name += " ";
        if (name.length > 38) name = name.substring(0, 38);

        post(marker + idxStr + "  " + name + "  " + state + "\n");
    }

    post("══════════════════════════════════════════════════════\n");
    post("(rows marked * are probes past the reported parameter count)\n\n");
}