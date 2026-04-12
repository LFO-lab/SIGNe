autowatch = 1;
outlets = 4; // 0: Pos, 1: Col1, 2: Col2, 3: Scl

var count = 25;
var frame = 0.0;

// Initialize 4 matrices 
var matPos  = new JitterMatrix(4, "float32", count); matPos.name  = "demo_pos";
var matCol1 = new JitterMatrix(4, "float32", count); matCol1.name = "demo_col1";
var matCol2 = new JitterMatrix(4, "float32", count); matCol2.name = "demo_col2";
var matScl  = new JitterMatrix(4, "float32", count); matScl.name  = "demo_scl";

// Round robin state
var dirty_pos = false;
var dirty_col1 = false;
var dirty_col2 = false;
var dirty_scl = false;

var check_order = [0, 1, 2, 3];
var current_check_idx = 0;

function bang() {
    update_math(); // Recalculate animation every frame

    // Round robin Output
    for (var i = 0; i < 4; i++) {
        var outlet_num = check_order[current_check_idx];
        current_check_idx = (current_check_idx + 1) % 4;

        if (outlet_num === 0 && dirty_pos)  { outlet(0, "bang"); dirty_pos  = false; return; }
        if (outlet_num === 1 && dirty_col1) { outlet(1, "bang"); dirty_col1 = false; return; }
        if (outlet_num === 2 && dirty_col2) { outlet(2, "bang"); dirty_col2 = false; return; }
        if (outlet_num === 3 && dirty_scl)  { outlet(3, "bang"); dirty_scl  = false; return; }
    }
}

function update_math() {
    frame += 0.05; // Advance animation
    
    for (var i = 0; i < count; i++) {
        var col = i % 5;
        var row = Math.floor(i / 5);
        var x = (col - 2) * 0.5;
        var y = (row - 2) * 0.5;

        // Animate Parameters 
        var rot = frame + (i * 0.1);
        var sx = 0.2 + (Math.sin(frame + col) * 0.1);
        var sy = 0.2 + (Math.cos(frame + row) * 0.1);
        var r = (Math.sin(frame + x) + 1.0) * 0.5;
        var b = (Math.cos(frame + y) + 1.0) * 0.5;

        // Pack the data
        matPos.setcell1d(i, x, y, 0.0, rot);       
        matCol1.setcell1d(i, r, 0.2, 0.8, 1.0);    
        matCol2.setcell1d(i, 0.2, 0.8, b, 1.0);    
        matScl.setcell1d(i, sx, sy, 1.0, 1.0);     
    }

    // Flag all as ready to be pushed
    dirty_pos = true;
    dirty_col1 = true;
    dirty_col2 = true;
    dirty_scl = true;
}