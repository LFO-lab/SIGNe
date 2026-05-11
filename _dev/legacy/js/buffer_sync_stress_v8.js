outlets = 4; // Using the correct V8 syntax!

var count = 25;
var frame = 0.0;

const matCol = new JitterMatrix(4, "float32", count); matCol.name = "demo_col";
const matPos = new JitterMatrix(4, "float32", count); matPos.name = "demo_pos";
const matRot = new JitterMatrix(4, "float32", count); matRot.name = "demo_rot";
const matScl = new JitterMatrix(4, "float32", count); matScl.name = "demo_scl";

// Listen for an integer in the left inlet to change the instance count
function msg_int(v) {
    if (v < 1) v = 1;
    count = v;
    
    matCol.dim = count;
    matPos.dim = count;
    matRot.dim = count;
    matScl.dim = count;
}

function bang() {
    frame += 0.05; 
    
    let grid_size = Math.ceil(Math.sqrt(count));
    let spacing = 4.0 / grid_size; 
    let offset = -2.0 + (spacing * 0.5);
    let base_scale = spacing * 0.4; 
    
    for (let i = 0; i < count; i++) {
        let col = i % grid_size;
        let row = Math.floor(i / grid_size);
        
        let bx = offset + (col * spacing);
        let by = offset + (row * spacing);
        
        let x = bx + Math.sin(frame + i) * (spacing * 0.1);
        let y = by + Math.cos(frame + i) * (spacing * 0.1);
        
        matCol.setcell1d(i, Math.sin(frame)*0.5+0.5, Math.cos(frame)*0.5+0.5, 1, 1);
        matPos.setcell1d(i, x, y, 0, 1);
        matRot.setcell1d(i, frame * 2.0, 0, 0, 0);
        
        let s = base_scale + Math.sin(frame * 1.5 + col) * (base_scale * 0.2);
        matScl.setcell1d(i, s, s, 1, 1);
    }

    outlet(3, "bang");
    outlet(2, "bang");
    outlet(1, "bang");
    outlet(0, "bang"); 
}