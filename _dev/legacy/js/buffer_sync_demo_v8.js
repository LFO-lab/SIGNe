var frame = 0.0;
const count = 25;

const matCol = new JitterMatrix(4, "float32", count); matCol.name = "demo_col";
const matPos = new JitterMatrix(4, "float32", count); matPos.name = "demo_pos";
const matRot = new JitterMatrix(4, "float32", count); matRot.name = "demo_rot";
const matScl = new JitterMatrix(4, "float32", count); matScl.name = "demo_scl";

var dirty = [false, false, false, false];
var check_order = [0, 1, 2, 3];
var cur_idx = 0;

function bang() {
    frame += 0.05;
    for (let i = 0; i < count; i++) {
        let col = i % 5; let row = Math.floor(i / 5);
        matCol.setcell1d(i, Math.sin(frame)*0.5+0.5, Math.cos(frame)*0.5+0.5, 1, 1);
        matPos.setcell1d(i, (col-2)*0.5 + Math.sin(frame+i)*0.1, (row-2)*0.5 + Math.cos(frame+i)*0.1, 0, 1);
        matRot.setcell1d(i, frame * 2.0, 0, 0, 0);
        matScl.setcell1d(i, 0.2 + Math.sin(frame*1.5)*0.1, 0.2 + Math.sin(frame*1.5)*0.1, 1, 1);
    }
    dirty = [true, true, true, true];

    for (let i = 0; i < 4; i++) {
        let out = check_order[cur_idx];
        cur_idx = (cur_idx + 1) % 4;
        if (dirty[out]) { outlet(out, "bang"); dirty[out] = false; return; }
    }
}