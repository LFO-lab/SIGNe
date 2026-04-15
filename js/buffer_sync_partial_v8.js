outlets = 4;

var total_count = 25;
var anim_count = 25;
var frame = 0.0;

const matCol = new JitterMatrix(4, "float32", total_count); matCol.name = "demo_col";
const matPos = new JitterMatrix(4, "float32", total_count); matPos.name = "demo_pos";
const matRot = new JitterMatrix(4, "float32", total_count); matRot.name = "demo_rot";
const matScl = new JitterMatrix(4, "float32", total_count); matScl.name = "demo_scl";

function total(v) {
    if (v < 1) v = 1;
    total_count = v;
    if (anim_count > total_count) anim_count = total_count;
    
    matCol.dim = total_count;
    matPos.dim = total_count;
    matRot.dim = total_count;
    matScl.dim = total_count;
    
    init_grid();
}

function animate(v) {
    if (v < 0) v = 0;
    if (v > total_count) v = total_count;
    anim_count = v;
    init_grid();
}

function init_grid() {
    let grid_size = Math.ceil(Math.sqrt(total_count));
    let spacing = 4.0 / grid_size; 
    let offset = -2.0 + (spacing * 0.5);
    let base_scale = spacing * 0.4; 
    
    for (let i = 0; i < total_count; i++) {
        let col = i % grid_size;
        let row = Math.floor(i / grid_size);
        let bx = offset + (col * spacing);
        let by = offset + (row * spacing);
        
        matCol.setcell1d(i, 0.3, 0.3, 0.3, 1.0); 
        matPos.setcell1d(i, bx, by, 0.0, 1.0);
        matRot.setcell1d(i, 0.0, 0.0, 0.0, 0.0);
        matScl.setcell1d(i, base_scale, base_scale, 1.0, 1.0);
    }
}

function bang() {
    frame += 0.05; 
    
    let grid_size = Math.ceil(Math.sqrt(total_count));
    let spacing = 4.0 / grid_size; 
    let offset = -2.0 + (spacing * 0.5);
    let base_scale = spacing * 0.4; 
    
    for (let i = 0; i < anim_count; i++) {
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