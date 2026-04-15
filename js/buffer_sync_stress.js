autowatch = 1;
outlets = 4;

var count = 25;
var frame = 0.0;

var matCol = new JitterMatrix(4, "float32", count); matCol.name = "demo_col";
var matPos = new JitterMatrix(4, "float32", count); matPos.name = "demo_pos";
var matRot = new JitterMatrix(4, "float32", count); matRot.name = "demo_rot";
var matScl = new JitterMatrix(4, "float32", count); matScl.name = "demo_scl";

// Listen for an integer in the left inlet to change the instance count
function msg_int(v) {
    if (v < 1) v = 1; // Prevent 0 or negative instances
    count = v;
    
    // Dynamically resize the Jitter matrices
    matCol.dim = count;
    matPos.dim = count;
    matRot.dim = count;
    matScl.dim = count;
}

function bang() {
    frame += 0.05; 
    
    // Calculate grid dimensions to keep everything in a fixed frustum area
    var grid_size = Math.ceil(Math.sqrt(count));
    var spacing = 4.0 / grid_size; // Fit within -2.0 to +2.0
    var offset = -2.0 + (spacing * 0.5);
    var base_scale = spacing * 0.4; // Scale down to leave gaps between planes
    
    for (var i = 0; i < count; i++) {
        var col = i % grid_size;
        var row = Math.floor(i / grid_size);
        
        // Base positions
        var bx = offset + (col * spacing);
        var by = offset + (row * spacing);
        
        // Add a slight wobble proportional to the spacing
        var x = bx + Math.sin(frame + i) * (spacing * 0.1);
        var y = by + Math.cos(frame + i) * (spacing * 0.1);
        
        matCol.setcell1d(i, Math.sin(frame)*0.5+0.5, Math.cos(frame)*0.5+0.5, 1, 1);
        matPos.setcell1d(i, x, y, 0, 1);
        matRot.setcell1d(i, frame * 2.0, 0, 0, 0);
        
        // Scale with a breathing effect
        var s = base_scale + Math.sin(frame * 1.5 + col) * (base_scale * 0.2);
        matScl.setcell1d(i, s, s, 1, 1);
    }

    // Now that the inlets are separated, we can blast them all at once!
    outlet(3, "bang");
    outlet(2, "bang");
    outlet(1, "bang");
    outlet(0, "bang"); 
}