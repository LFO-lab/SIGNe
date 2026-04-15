autowatch = 1;
outlets = 4;

var count = 25;
var frame = 0.0;

var matCol = new JitterMatrix(4, "float32", count); matCol.name = "demo_col";
var matPos = new JitterMatrix(4, "float32", count); matPos.name = "demo_pos";
var matRot = new JitterMatrix(4, "float32", count); matRot.name = "demo_rot";
var matScl = new JitterMatrix(4, "float32", count); matScl.name = "demo_scl";

function bang() {
    frame += 0.05; 
    
    for (var i = 0; i < count; i++) {
        var col = i % 5;
        var row = Math.floor(i / 5);
        
        matCol.setcell1d(i, Math.sin(frame)*0.5+0.5, Math.cos(frame)*0.5+0.5, 1, 1);
        matPos.setcell1d(i, (col-2)*0.5 + Math.sin(frame+i)*0.1, (row-2)*0.5 + Math.cos(frame+i)*0.1, 0, 1);
        matRot.setcell1d(i, frame * 2.0, 0, 0, 0);
        matScl.setcell1d(i, 0.2 + Math.sin(frame*1.5)*0.1, 0.2 + Math.sin(frame*1.5)*0.1, 1, 1);
    }

    // Firing all at once - Outlets 1, 2, and 3 will likely be ignored by Jitter
    outlet(3, "bang");
    outlet(2, "bang");
    outlet(1, "bang");
    outlet(0, "bang"); // The prioritized attribute
}