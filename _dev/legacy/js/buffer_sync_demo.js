autowatch = 1;
outlets = 4; 

var count = 25;
var frame = 0.0;

var matCol = new JitterMatrix(4, "float32", count); matCol.name = "demo_col";
var matPos = new JitterMatrix(4, "float32", count); matPos.name = "demo_pos";
var matRot = new JitterMatrix(4, "float32", count); matRot.name = "demo_rot";
var matScl = new JitterMatrix(4, "float32", count); matScl.name = "demo_scl";

// Round robin state
var dirty_col = false;
var dirty_pos = false;
var dirty_rot = false;
var dirty_scl = false;

var check_order = [0, 1, 2, 3];
var current_check_idx = 0;

function bang() {
    update_math(); 

    // Round robin output
    for (var i = 0; i < 4; i++) {
        var outlet_num = check_order[current_check_idx];
        current_check_idx = (current_check_idx + 1) % 4;

        if (outlet_num === 0 && dirty_col) { outlet(0, "bang"); dirty_col = false; return; }
        if (outlet_num === 1 && dirty_pos) { outlet(1, "bang"); dirty_pos = false; return; }
        if (outlet_num === 2 && dirty_rot) { outlet(2, "bang"); dirty_rot = false; return; }
        if (outlet_num === 3 && dirty_scl) { outlet(3, "bang"); dirty_scl = false; return; }
    }
}

function update_math() {
    frame += 0.05; 
    
    for (var i = 0; i < count; i++) {
        var col = i % 5;
        var row = Math.floor(i / 5);
        
        // 1. Color (vertex_attr0)
        var r = Math.sin(frame) * 0.5 + 0.5;
        var g = Math.cos(frame * 0.8) * 0.5 + 0.5;
        matCol.setcell1d(i, r, g, 1.0, 1.0);

        // 2. Position (vertex_attr1)
        var x = (col - 2) * 0.5 + Math.sin(frame + i) * 0.1;
        var y = (row - 2) * 0.5 + Math.cos(frame + i) * 0.1;
        matPos.setcell1d(i, x, y, 0.0, 1.0);

        // 3. Rotation (vertex_attr2)
        matRot.setcell1d(i, frame * 2.0, 0, 0, 0);

        // 4. Scale (vertex_attr3)
        var s = 0.2 + Math.sin(frame * 1.5) * 0.1;
        matScl.setcell1d(i, s, s, 1.0, 1.0);
    }

    dirty_col = true;
    dirty_pos = true;
    dirty_rot = true;
    dirty_scl = true;
}