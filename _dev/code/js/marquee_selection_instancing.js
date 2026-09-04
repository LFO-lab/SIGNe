autowatch = 1;

inlets = 1;
outlets = 11; // 0-4 for UI, 5-9 for GPU Triggers

// =========================================================
// STATE VARIABLES & SETTINGS
// =========================================================

// =========================================================
// FAST BOOT
// =========================================================
var _registered_count = 0;       // incremented each time a Symbol registers
var _expected_count = 0;         // optionally set before devices load
var _boot_settle_task = null;    // debounce timer — fires 150ms after last registration

// =========================================================
// PROFILING
// =========================================================
var _profile_t0 = 0;
var _profile_enabled = false; // set to false in production
var _profile_heartbeat_task = null;
var _profile_heartbeat_count = 0;
var _profile_atlas_started = false;

function profile_mark(label) {
    if (!_profile_enabled) return;
    var now = (new Date()).getTime();
    if (_profile_t0 === 0) _profile_t0 = now;
    post("[SIGNE PROFILE] +" + (now - _profile_t0) + "ms  " + label + "\n");
}

function profile_reset() {
    _profile_t0 = 0;
}

function profile_enable(v) {
    _profile_enabled = (v !== 0);
}

function _profile_start_heartbeat() {
    if (!_profile_enabled) return;
    if (_profile_heartbeat_task !== null) _profile_heartbeat_task.cancel();
    _profile_heartbeat_count = 0;
    _profile_heartbeat_task = new Task(function() {
        _profile_heartbeat_count++;
        profile_mark("heartbeat: atlas_started=" + _profile_atlas_started
            + " registered=" + _registered_count + "/" + _expected_count
            + " booting=" + is_booting);
        if (_profile_heartbeat_count < 24 && !_profile_atlas_started) {
            _profile_heartbeat_task.schedule(5000);
        } else {
            _profile_heartbeat_task = null;
        }
    });
    _profile_heartbeat_task.schedule(5000);
}

function path_probe(label, value) {
    var suffix = "";
    if (value !== undefined && value !== null) suffix = " value=" + value;
    profile_mark("path_probe: " + label + suffix);
}



// ─────────────────────────────────────────────────────────────────────────────
// SYMBOL-SIDE PROFILING
// Called via s Signe_Hub from SIGNe-Symbol patch.
//
// Wire these message boxes in Symbol's CONFIG subpatcher to s Signe_Hub:
//
//   symbol_profile ---Object live_thisdevice   (from live.thisdevice)
//   symbol_profile ---Object register          (from register ---Object message)
//   symbol_profile ---Object object_init       (from r ---Object_Init)
//   symbol_profile ---Object auto_gate_done    (from auto_gate.js outlet 0 first output)
//
// In each case, use a sprintf or pack to substitute the actual object ID
// for ---Object. e.g.:
//   sprintf "symbol_profile %s live_thisdevice" ---Object → s Signe_Hub
// ─────────────────────────────────────────────────────────────────────────────
function symbol_profile(id, label) {
    if (!_profile_enabled) return;
    var l = (label !== undefined) ? label : "event";
    profile_mark("Symbol " + id + ": " + l);
}

// ─────────────────────────────────────────────────────────────────────────────
// PER-SECOND STATS DUMP
// Tracks volume and timing of work to detect cumulative slowdowns.
// Toggle with: stats_enable 1 / stats_enable 0
// ─────────────────────────────────────────────────────────────────────────────
var _stats_enabled = false;
var _stats_last_dump = 0;
var _stats_bang_count = 0;
var _stats_update_math_total_us = 0;
var _stats_update_math_max_us = 0;
var _stats_update_math_calls = 0;
var _stats_draw_sel_total_us = 0;
var _stats_check_frust_total_us = 0;
var _stats_handler_calls = {};

function stats_enable(v) {
    _stats_enabled = (v !== 0);
    if (_stats_enabled) {
        _stats_last_dump = (new Date()).getTime();
        post("[STATS] enabled\n");
    } else {
        post("[STATS] disabled\n");
    }
}

function _stats_record_handler(name) {
    if (!_stats_enabled) return;
    _stats_handler_calls[name] = (_stats_handler_calls[name] || 0) + 1;
}

function _stats_maybe_dump() {
    if (!_stats_enabled) return;
    var now = (new Date()).getTime();
    var elapsed = now - _stats_last_dump;
    if (elapsed < 1000) return;
    
    var registry = _reg();
    var keys = registry.getkeys();
    var n_keys = (keys === null) ? 0 : (typeof keys === "string" ? 1 : keys.length);
    
    var n_slot_for_id = 0;
    for (var k in _slot_for_id) n_slot_for_id++;
    var n_registered = 0;
    for (var k2 in _registered_ids) n_registered++;
    
    var avg_um = (_stats_update_math_calls > 0) ? (_stats_update_math_total_us / _stats_update_math_calls).toFixed(1) : "0";
    
    post("[STATS] " + elapsed + "ms | bangs=" + _stats_bang_count
        + " | update_math: calls=" + _stats_update_math_calls 
        + " avg=" + avg_um + "us"
        + " max=" + _stats_update_math_max_us + "us"
        + " total=" + _stats_update_math_total_us + "us"
        + "\n");
    post("[STATS]   draw_sel total=" + _stats_draw_sel_total_us + "us"
        + " | check_frust total=" + _stats_check_frust_total_us + "us"
        + " | dict_keys=" + n_keys
        + " | slot_map=" + n_slot_for_id
        + " | registered=" + n_registered
        + " | free_slots=" + _free_slots.length
        + " | next_slot=" + _next_slot
        + "\n");
    
    var handler_summary = "";
    for (var name in _stats_handler_calls) {
        handler_summary += name + "=" + _stats_handler_calls[name] + " ";
    }
    if (handler_summary.length > 0) {
        post("[STATS]   handlers: " + handler_summary + "\n");
    }
    
    // reset
    _stats_last_dump = now;
    _stats_bang_count = 0;
    _stats_update_math_total_us = 0;
    _stats_update_math_max_us = 0;
    _stats_update_math_calls = 0;
    _stats_draw_sel_total_us = 0;
    _stats_check_frust_total_us = 0;
    _stats_handler_calls = {};
}

function _now_us() { return (new Date()).getTime() * 1000; }

// =========================================================
// ATLAS INDEX CACHE  (built once at boot, O(1) lookups)
// =========================================================
var _symIndexCache = {};
var _patIndexCache = {};
// Phase 4 opt 1: per-Symbol resolved texture index, keyed by Symbol id.
// Avoids regex/split work in update_math hot loop (~30% savings at 50 symbols).
// Updated whenever a Symbol's texture or the atlas itself changes.
var _resolvedSymIdx = {};
var _resolvedPatIdx = {};
// Phase 4 opt 3: per-Symbol cached saturated RGB endpoints. update_math reads
// these directly instead of running apply_sat 4 times per Symbol per frame.
// Cache invalidated on any color/saturation change via _markColorDirty.
//   _colorCache[id] = {sStartRGB:[r,g,b], sEndRGB:[r,g,b], pStartRGB:[r,g,b],
//                      pEndRGB:[r,g,b], sStartA, sEndA, pStartA, pEndA, dirty}
var _colorCache = {};
function _markColorDirty(id) {
    if (_colorCache[id]) _colorCache[id].dirty = true;
}
function _refreshColorCache(id, registry) {
    var entry = _colorCache[id];
    if (!entry) {
        entry = _colorCache[id] = {
            sStartRGB: [1.0, 1.0, 1.0], sEndRGB: [1.0, 1.0, 1.0],
            pStartRGB: [0.0, 0.0, 0.0], pEndRGB: [0.0, 0.0, 0.0],
            sStartA: 1.0, sEndA: 1.0, pStartA: 1.0, pEndA: 1.0,
            dirty: true
        };
    }
    if (!entry.dirty) return entry;
    
    var sStart = registry.get(id + "::symbol_colour_start_rgb") || [1.0, 1.0, 1.0, 1.0];
    var sEnd   = registry.get(id + "::symbol_colour_end_rgb")   || [1.0, 1.0, 1.0, 1.0];
    var pStart = registry.get(id + "::pattern_colour_start_rgb") || [0.0, 0.0, 0.0, 1.0];
    var pEnd   = registry.get(id + "::pattern_colour_end_rgb")   || [0.0, 0.0, 0.0, 1.0];
    var sStartSat = parseFloat(registry.get(id + "::symbol_colour_start_sat")); if (isNaN(sStartSat)) sStartSat = 1.0;
    var sEndSat   = parseFloat(registry.get(id + "::symbol_colour_end_sat"));   if (isNaN(sEndSat))   sEndSat   = 1.0;
    var pStartSat = parseFloat(registry.get(id + "::pattern_colour_start_sat")); if (isNaN(pStartSat)) pStartSat = 1.0;
    var pEndSat   = parseFloat(registry.get(id + "::pattern_colour_end_sat"));   if (isNaN(pEndSat))   pEndSat   = 1.0;
    
    var s1 = apply_sat(sStart[0], sStart[1], sStart[2], sStartSat);
    var s2 = apply_sat(sEnd[0],   sEnd[1],   sEnd[2],   sEndSat);
    var p1 = apply_sat(pStart[0], pStart[1], pStart[2], pStartSat);
    var p2 = apply_sat(pEnd[0],   pEnd[1],   pEnd[2],   pEndSat);
    
    entry.sStartRGB[0] = s1[0]; entry.sStartRGB[1] = s1[1]; entry.sStartRGB[2] = s1[2];
    entry.sEndRGB[0]   = s2[0]; entry.sEndRGB[1]   = s2[1]; entry.sEndRGB[2]   = s2[2];
    entry.pStartRGB[0] = p1[0]; entry.pStartRGB[1] = p1[1]; entry.pStartRGB[2] = p1[2];
    entry.pEndRGB[0]   = p2[0]; entry.pEndRGB[1]   = p2[1]; entry.pEndRGB[2]   = p2[2];
    entry.sStartA = (sStart[3] !== undefined) ? sStart[3] : 1.0;
    entry.sEndA   = (sEnd[3]   !== undefined) ? sEnd[3]   : 1.0;
    entry.pStartA = (pStart[3] !== undefined) ? pStart[3] : 1.0;
    entry.pEndA   = (pEnd[3]   !== undefined) ? pEnd[3]   : 1.0;
    entry.dirty = false;
    return entry;
}
function _resolveTextureIndex(filename, indexCache) {
    if (filename == null) return 0.0;
    var parts = filename.split(/[\\/]/);
    var clean = parts[parts.length - 1].replace(/\.[^/.]+$/, "");
    var idx = indexCache[clean];
    return (idx !== undefined) ? idx : 0.0;
}
function _refreshResolvedSymIdx(id) {
    var registry = _reg();
    var name = registry.get(id + "::symbol_texture");
    _resolvedSymIdx[id] = _resolveTextureIndex(name, _symIndexCache);
}
function _refreshResolvedPatIdx(id) {
    var registry = _reg();
    var name = registry.get(id + "::pattern_texture");
    _resolvedPatIdx[id] = _resolveTextureIndex(name, _patIndexCache);
}
function _refreshAllResolvedTextures() {
    var registry = _reg();
    var keys = registry.getkeys();
    if (keys == null) return;
    if (typeof keys === "string") keys = [keys];
    for (var i = 0; i < keys.length; i++) {
        var id = keys[i];
        if (registry.contains(id)) {
            _refreshResolvedSymIdx(id);
            _refreshResolvedPatIdx(id);
        }
    }
}

function _build_atlas_index_cache() {
    profile_mark("_build_atlas_index_cache: start");
    _symIndexCache = {};
    _patIndexCache = {};
    profile_mark("_build_atlas_index_cache: opening dict");
    var manifest = new Dict("AtlasManifest");
    profile_mark("_build_atlas_index_cache: getting symbols");
    var symArray = manifest.get("symbols");
    profile_mark("_build_atlas_index_cache: got symbols (" + (symArray ? symArray.length : 0) + ")");
    if (symArray != null) {
        if (typeof symArray === "string") symArray = [symArray];
        for (var i = 0; i < symArray.length; i++) _symIndexCache[symArray[i]] = i;
    }
    profile_mark("_build_atlas_index_cache: getting patterns");
    var patArray = manifest.get("patterns");
    profile_mark("_build_atlas_index_cache: got patterns (" + (patArray ? patArray.length : 0) + ")");
    if (patArray != null) {
        if (typeof patArray === "string") patArray = [patArray];
        for (var i = 0; i < patArray.length; i++) _patIndexCache[patArray[i]] = i;
    }
    profile_mark("_build_atlas_index_cache: complete sym=" + Object.keys(_symIndexCache).length + " pat=" + Object.keys(_patIndexCache).length);
    // Phase 4 opt 1: atlas changed, re-resolve every Symbol's texture index
    _refreshAllResolvedTextures();
}

// Call after atlas is rebuilt (e.g. after build_atlases completes)
function rebuild_atlas_cache() {
    _build_atlas_index_cache();
    if (!is_booting) mark_dirty(1, 1, 1, 1, 1);
}

// =========================================================
// ATLAS BUILD + CACHE (merged from atlas_builder.js)
// =========================================================
// ─────────────────────────────────────────────────────────────────────────────
// GPU TEXTURES
// ─────────────────────────────────────────────────────────────────────────────
var texSymbols = new JitterObject("jit.gl.texture", "SIGNe");
texSymbols.name = "SymbolAtlas";
texSymbols.filter = "none";

var texPatterns = new JitterObject("jit.gl.texture", "SIGNe");
texPatterns.name = "PatternAtlas";
texPatterns.filter = "none";

// ─────────────────────────────────────────────────────────────────────────────
// MANIFEST DICTIONARY
// ─────────────────────────────────────────────────────────────────────────────
var atlasDict = new Dict("AtlasManifest");

// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// MAIN ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────────
function build_atlases(signeFolderPath) {
    _profile_atlas_started = true;
    if (_profile_heartbeat_task !== null) {
        _profile_heartbeat_task.cancel();
        _profile_heartbeat_task = null;
    }
    profile_mark("build_atlases: start");
    profile_mark("build_atlases: path received (" + signeFolderPath + ")");
    if (signeFolderPath.charAt(signeFolderPath.length - 1) === "/") {
        signeFolderPath = signeFolderPath.slice(0, -1);
    }

    var symFiles = []; var symNames = [];
    var patFiles = []; var patNames = [];
    profile_mark("build_atlases: scanning folders");
    get_images_recursive(signeFolderPath + "/symbols", symFiles, symNames);
    get_images_recursive(signeFolderPath + "/patterns", patFiles, patNames);
    profile_mark("build_atlases: scan done (" + symFiles.length + " sym, " + patFiles.length + " pat)");

    if (symFiles.length === 0 && patFiles.length === 0) {
        post("atlas_builder: no images found in " + signeFolderPath + "\n");
        outlet(0, "bang");
        return;
    }

    if (_profile_enabled) post("atlas_builder: building atlas (" + symFiles.length + " symbols, " + patFiles.length + " patterns)...\n");
    profile_mark("build_atlases: importmovie loop start");

    var symMatrix = _build_atlas_matrix(symFiles, "symbols");
    var patMatrix = _build_atlas_matrix(patFiles, "patterns");

    texSymbols.dim = [512, 512, symFiles.length];
    texSymbols.jit_matrix(symMatrix.name);
    texPatterns.dim = [512, 512, patFiles.length];
    texPatterns.jit_matrix(patMatrix.name);

    atlasDict.set("symbols", symNames);
    atlasDict.set("patterns", patNames);

    _build_atlas_index_cache();

    profile_mark("build_atlases: build complete");
    if (_profile_enabled) post("atlas_builder: done\n");
    outlet(0, "bang");
}

function _build_atlas_matrix(filePaths, label) {
    var atlas3D = new JitterMatrix(4, "char", 512, 512, filePaths.length);
    atlas3D.usedstdim = 1;
    var cookieCutter = new JitterMatrix(4, "char", 512, 512);
    cookieCutter.adapt = 0;
    var t0 = (new Date()).getTime();
    for (var i = 0; i < filePaths.length; i++) {
        cookieCutter.importmovie(filePaths[i]);
        atlas3D.dstdimstart = [0, 0, i];
        atlas3D.dstdimend = [511, 511, i];
        atlas3D.frommatrix(cookieCutter);
    }
    var elapsed = (new Date()).getTime() - t0;
    profile_mark("_build_atlas_matrix: " + filePaths.length + " files in " + elapsed + "ms (" + Math.round(elapsed / filePaths.length) + "ms/file avg)");
    return atlas3D;
}

// ─────────────────────────────────────────────────────────────────────────────
// JXF SAVE/LOAD via temp file + File byte copy
//
// JitterMatrix.write(name) saves a .jxf to Max's search path (not an absolute
// path). We save to a known temp name, then copy the bytes to the absolute
// cache path using Max's File object, which does handle absolute paths.
// Loading reverses the process.
// ─────────────────────────────────────────────────────────────────────────────
// Max's 'write' message saves to its resource folder, not the search path.
// We use the full absolute path so File can read it back.









// ─────────────────────────────────────────────────────────────────────────────
// RECURSIVE FOLDER SCAN
// ─────────────────────────────────────────────────────────────────────────────
function get_images_recursive(path, pathArray, nameArray) {
    var f = new Folder(path);
    while (!f.end) {
        if (f.filetype === "fold") {
            if (f.filename !== "." && f.filename !== "..") {
                get_images_recursive(path + "/" + f.filename, pathArray, nameArray);
            }
        } else {
            var ext = f.filename.split('.').pop().toLowerCase();
            if (ext === "png" || ext === "jpg" || ext === "jpeg") {
                pathArray.push(path + "/" + f.filename);
                nameArray.push(f.filename.replace(/\.[^/.]+$/, ""));
            }
        }
        f.next();
    }
    f.close();
}

// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// FORCE REBUILD — bypasses cache, always does full build
// Can be called with no argument after build_atlases has run once
// ─────────────────────────────────────────────────────────────────────────────
function force_rebuild(signeFolderPath) {
    if (!signeFolderPath || signeFolderPath === "") {
        post("atlas_builder: force_rebuild requires a path argument\n");
        return;
    }
    if (signeFolderPath.charAt(signeFolderPath.length - 1) === "/") {
        signeFolderPath = signeFolderPath.slice(0, -1);
    }
    build_atlases(signeFolderPath);
}


function loadbang() {
    profile_reset();
    profile_mark("loadbang");
    _profile_atlas_started = false;
    _profile_start_heartbeat();

    // Force the UI into its empty, hidden state immediately on boot
    messnamed("SelectedObjectName", "none"); 
    messnamed("SelectedObjectIndex_FromSymbol", -1); 
    messnamed("SelectedPatternIndex_FromSymbol", -1);
    messnamed("SelectedObjectIsText", -1);
}

// ─────────────────────────────────────────────────────────────────────────────
// FAST BOOT — count-based, no fixed delays
// ─────────────────────────────────────────────────────────────────────────────

// Called by the patch to declare how many Symbol devices to expect.
// Send this from live.thisdevice in Screen BEFORE devices start loading.
// Optional but enables instant boot without the 150ms debounce.
function set_expected_device_count(n) {
    _expected_count = parseInt(n) || 0;
    _registered_count = 0;
    _registered_ids = {};
    profile_mark("set_expected_device_count: " + _expected_count);
}

// Called once per Symbol when it finishes writing its initial data to SigneRegistry.
// Wire: in Symbol, after the register message fires, also send notify_device_registered
// to the js object in Screen's p MarqueeSelection.
// Track registered IDs to ignore duplicate registrations (e.g. from Signe_RollCall)
var _registered_ids = {};
var _boot_settle_due_ms = 0;

// ─────────────────────────────────────────────────────────────────────────────
// SLOT LIFECYCLE (Phase 1 of fast-path architecture)
// Each registered Symbol gets a permanent slot index for direct matrix writes.
// Slots are reused on Symbol removal to keep the active range compact.
// ─────────────────────────────────────────────────────────────────────────────
var _slot_for_id = {};      // map: registry id → slot index
var _free_slots = [];        // recycled slot indices (FIFO)
var _next_slot = 0;          // monotonic counter for fresh slots
var MAX_SLOTS = 1024;        // upper bound; raw matrices will be sized to this

function _assign_slot(id) {
    if (_slot_for_id[id] !== undefined) return _slot_for_id[id];
    var slot;
    if (_free_slots.length > 0) {
        slot = _free_slots.shift();
    } else {
        slot = _next_slot++;
        if (slot >= MAX_SLOTS) {
            post("WARNING: exceeded MAX_SLOTS (" + MAX_SLOTS + "); slot " + slot + " will not be safe to use\n");
        }
    }
    _slot_for_id[id] = slot;
    // Clear whatever the slot held before this object owned it — see
    // _seed_raw_pos_from_registry. Must happen after _slot_for_id is set,
    // since the raw writers resolve the slot through it.
    _seed_raw_pos_from_registry(id);
    // Tell the Symbol device its slot via dedicated per-device receive
    messnamed(id + "_SIGNe_AssignSlot", slot);
    return slot;
}

function _free_slot(id) {
    var slot = _slot_for_id[id];
    if (slot === undefined) return;
    _free_slots.push(slot);
    delete _slot_for_id[id];
}

// Phase 2c: read x, y for a registered Symbol from raw_matPos (fast path),
// falling back to registry if the slot is unassigned (e.g. text symbols).
function _get_pos(id, registry) {
    var slot = _slot_for_id[id];
    if (slot !== undefined && slot >= 0) {
        try {
            var c = raw_matPos.getcell(slot);
            return [c[0], c[1]];
        } catch (e) {
            // fall through to registry
        }
    }
    if (registry === undefined) registry = _reg();
    var x = parseFloat(registry.get(id + "::x"));
    var y = parseFloat(registry.get(id + "::y"));
    return [isNaN(x) ? 0.0 : x, isNaN(y) ? 0.0 : y];
}

// Phase 2c: write x, y to raw_matPos for a Symbol's slot.
// Preserves layer and rotation channels by reading the existing cell first.
function _set_raw_pos(id, x, y) {
    var slot = _slot_for_id[id];
    if (slot === undefined || slot < 0) return;
    try {
        var c = raw_matPos.getcell(slot);
        raw_matPos.setcell1d(slot, x, y, c[2], c[3]);
    } catch (e) {
        // matrix not ready; skip silently
    }
}

function _set_raw_pos_x(id, x) {
    var slot = _slot_for_id[id]; if (slot === undefined || slot < 0) return;
    try { var c = raw_matPos.getcell(slot); raw_matPos.setcell1d(slot, x, c[1], c[2], c[3]); }
    catch (e) {}
}
// Seed a slot's position from the registry.
//
// An object's position is recorded in three places — the registry, the device's
// own parameters, and raw_matPos — and they only agree if every path that sets
// one sets the others. A slot handed out by _assign_slot starts with whatever
// it already held: zeros when fresh, the previous occupant's coordinates when
// recycled. Seeding it here means an object can never render at a deleted
// object's position while its device draws itself somewhere else.
//
// Deliberately reads the registry rather than calling _get_pos, which prefers
// the matrix — the very value being corrected.
function _seed_raw_pos_from_registry(id) {
    var registry = _reg();
    var x = parseFloat(registry.get(id + "::x"));
    var y = parseFloat(registry.get(id + "::y"));
    _set_raw_pos(id, isNaN(x) ? 0.0 : x, isNaN(y) ? 0.0 : y);
}

// Phase 3: per-plane writers for raw_matPos (preserve other channels).
function _set_raw_layer(id, layer) {
    var slot = _slot_for_id[id]; if (slot === undefined || slot < 0) return;
    try { var c = raw_matPos.getcell(slot); raw_matPos.setcell1d(slot, c[0], c[1], layer, c[3]); }
    catch (e) {}
}
function _set_raw_rotation(id, rot) {
    var slot = _slot_for_id[id]; if (slot === undefined || slot < 0) return;
    try { var c = raw_matPos.getcell(slot); raw_matPos.setcell1d(slot, c[0], c[1], c[2], rot); }
    catch (e) {}
}

// Phase 3: helpers for raw_matScl (2 planes: scaleX, scaleY).
function _get_scl(id, registry) {
    var slot = _slot_for_id[id];
    if (slot !== undefined && slot >= 0) {
        try { var c = raw_matScl.getcell(slot); return [c[0], c[1]]; }
        catch (e) {}
    }
    if (registry === undefined) registry = _reg();
    var sx = parseFloat(registry.get(id + "::scale_x")); if (isNaN(sx)) sx = 1.0;
    var sy = parseFloat(registry.get(id + "::scale_y")); if (isNaN(sy)) sy = 1.0;
    return [sx, sy];
}
function _set_raw_scl_x(id, sx) {
    var slot = _slot_for_id[id]; if (slot === undefined || slot < 0) return;
    try { var c = raw_matScl.getcell(slot); raw_matScl.setcell1d(slot, sx, c[1]); }
    catch (e) {}
}
function _set_raw_scl_y(id, sy) {
    var slot = _slot_for_id[id]; if (slot === undefined || slot < 0) return;
    try { var c = raw_matScl.getcell(slot); raw_matScl.setcell1d(slot, c[0], sy); }
    catch (e) {}
}
function _set_raw_scl(id, sx, sy) {
    var slot = _slot_for_id[id]; if (slot === undefined || slot < 0) return;
    try { raw_matScl.setcell1d(slot, sx, sy); }
    catch (e) {}
}

// Phase 3: helpers for raw_matTil (2 planes: tiling uniform, intensity).
// Pattern tiling is a single uniform value applied to both X and Y axes.
function _get_til(id, registry) {
    var slot = _slot_for_id[id];
    if (slot !== undefined && slot >= 0) {
        try { var c = raw_matTil.getcell(slot); return [c[0], c[1]]; }
        catch (e) {}
    }
    if (registry === undefined) registry = _reg();
    var t  = parseFloat(registry.get(id + "::pat_tiling_x")); if (isNaN(t))  t  = 1.0;
    var pi = parseFloat(registry.get(id + "::pattern_intensity")); if (isNaN(pi)) pi = 0.0;
    return [t, pi];
}
function _set_raw_tiling(id, t) {
    var slot = _slot_for_id[id]; if (slot === undefined || slot < 0) return;
    try { var c = raw_matTil.getcell(slot); raw_matTil.setcell1d(slot, t, c[1]); }
    catch (e) {}
}
function _set_raw_intensity(id, intensity) {
    var slot = _slot_for_id[id]; if (slot === undefined || slot < 0) return;
    try { var c = raw_matTil.getcell(slot); raw_matTil.setcell1d(slot, c[0], intensity); }
    catch (e) {}
}

// Phase 3: helpers for raw_matCol (3 planes: opacity, sInterp, pInterp).
function _get_col(id, registry) {
    var slot = _slot_for_id[id];
    if (slot !== undefined && slot >= 0) {
        try { var c = raw_matCol.getcell(slot); return [c[0], c[1], c[2]]; }
        catch (e) {}
    }
    if (registry === undefined) registry = _reg();
    var op = parseFloat(registry.get(id + "::opacity")); if (isNaN(op)) op = 1.0;
    var si = parseFloat(registry.get(id + "::symbol_colour_interp")); if (isNaN(si)) si = 0.0;
    var pi = parseFloat(registry.get(id + "::pattern_colour_interp")); if (isNaN(pi)) pi = 0.0;
    return [op, si, pi];
}
function _set_raw_opacity(id, op) {
    var slot = _slot_for_id[id]; if (slot === undefined || slot < 0) return;
    try { var c = raw_matCol.getcell(slot); raw_matCol.setcell1d(slot, op, c[1], c[2]); }
    catch (e) {}
}
function _set_raw_sinterp(id, si) {
    var slot = _slot_for_id[id]; if (slot === undefined || slot < 0) return;
    try { var c = raw_matCol.getcell(slot); raw_matCol.setcell1d(slot, c[0], si, c[2]); }
    catch (e) {}
}
function _set_raw_pinterp(id, pi) {
    var slot = _slot_for_id[id]; if (slot === undefined || slot < 0) return;
    try { var c = raw_matCol.getcell(slot); raw_matCol.setcell1d(slot, c[0], c[1], pi); }
    catch (e) {}
}

// Phase 3: helpers for raw_matLay (2 planes: spacing, groupRot).
function _get_lay(id, registry) {
    var slot = _slot_for_id[id];
    if (slot !== undefined && slot >= 0) {
        try { var c = raw_matLay.getcell(slot); return [c[0], c[1]]; }
        catch (e) {}
    }
    if (registry === undefined) registry = _reg();
    var sp = parseFloat(registry.get(id + "::spacing")); if (isNaN(sp)) sp = 0.0;
    var gr = parseFloat(registry.get(id + "::group_rot")); if (isNaN(gr)) gr = 0.0;
    return [sp, gr];
}
function _set_raw_spacing(id, sp) {
    var slot = _slot_for_id[id]; if (slot === undefined || slot < 0) return;
    try { var c = raw_matLay.getcell(slot); raw_matLay.setcell1d(slot, sp, c[1]); }
    catch (e) {}
}
function _set_raw_grouprot(id, gr) {
    var slot = _slot_for_id[id]; if (slot === undefined || slot < 0) return;
    try { var c = raw_matLay.getcell(slot); raw_matLay.setcell1d(slot, c[0], gr); }
    catch (e) {}
}

// ─────────────────────────────────────────────────────────────────────────────
// CORE STATE VARIABLES (from original)
// ─────────────────────────────────────────────────────────────────────────────
var is_booting = true; // --- THE NEW BOOT FLAG ---
var ignoreX = false, ignoreY = false;
var isDraggingMarquee = false, isDraggingGroup = false, isScalingGroup = false;
var isRotatingGroup = false, isAdjustingOpacityGroup = false, isScrubbing = false;
// Drag override: broadcast to selected Symbols so their cache pak path
// suppresses modulation overwrites while the user is interacting via mouse.
// One broadcast per drag-start, one per drag-end — not per frame.
var _drag_active_kind = null;  // null | "pos" | "scl" | "rot" | "opac"  
var handledClick = false, prevBtn = 0, got3DAnchor = false, lastViewportInteractionTime = 0; 
var isAltDown = 0, isShiftDown = 0, isODown = 0, linkScale = 0, activeRatio = 1.0;
var isCmdDown = 0;
var globalPlayheadOffset = 0.0;
var quantX = "free", quantY = "free", quantSpacing = "free";
var snapToTrigger = 0, ROT_MAX = 1.0;
var winW = 1920, winH = 1080, curX = 0, curY = 0;
var a2x = 0, a2y = 0, c2x = 0, c2y = 0, a3x = 0, a3y = 0, c3x = 0, c3y = 0;
var groupCx = 0, groupCy = 0, lastCamX = 0, lastCamY = 0, camInitialized = false;
var globalAspectRatio = 1.77;
var showAllBounds = 0;
var liveViewAPI = null;
var cached_midi_triggers = [];
var last_playhead_x = -1.0;
var currentFirstBar = 0.0;
var currentLastBar = 100.0;
var last_total_instances = -1;
var last_total_midi = -1;
var matPos = new JitterMatrix(4, "float32", 1); matPos.name = "SIGNe_Pos_Data";
var matSym = new JitterMatrix(4, "float32", 1); matSym.name = "SIGNe_Sym_Data";
var matPat = new JitterMatrix(4, "float32", 1); matPat.name = "SIGNe_Pat_Data";
var matScl = new JitterMatrix(4, "float32", 1); matScl.name = "SIGNe_Scl_Data";
var matTil = new JitterMatrix(3, "float32", 1); matTil.name = "SIGNe_Til_Data";
var matMidiPos = new JitterMatrix(3, "float32", 1); matMidiPos.name = "SIGNe_MidiPos_Data";
var matMidiScl = new JitterMatrix(3, "float32", 1); matMidiScl.name = "SIGNe_MidiScl_Data";
var matMidiCol = new JitterMatrix(4, "float32", 1); matMidiCol.name = "SIGNe_MidiCol_Data";

// Phase 2a: reference to raw_matPos (created in Screen patch as jit.matrix)
// Symbols write directly here at their assigned slot, bypassing JS for high-frequency updates
var raw_matPos = new JitterMatrix("raw_matPos");

// Phase 3: additional raw matrices for modulatable parameters.
// Each matrix is shared across all Symbols, indexed by slot.
// Created in SIGNe-Screen patch as named jit.matrix objects.
//   raw_matScl: 2 planes — ScaleX, ScaleY
//   raw_matTil: 2 planes — Tiling (uniform), PatternIntensity
//   raw_matCol: 3 planes — Opacity, SymbolColourInterp, PatternColourInterp
//   raw_matLay: 2 planes — Spacing, GroupRot
var raw_matScl = new JitterMatrix("raw_matScl");
var raw_matTil = new JitterMatrix("raw_matTil");
var raw_matCol = new JitterMatrix("raw_matCol");
var raw_matLay = new JitterMatrix("raw_matLay");

// Persistent working array for update_math — avoids per-frame allocation
var _all_instances = [];

// Phase 4 opt 2: object pool for instance descriptors. Avoids per-frame
// allocation of objects + 5 sub-arrays per render instance (50 symbols × 60Hz
// × 6 allocations = 18,000/sec of GC churn). Pool grows to high-water mark
// then stays stable; reused entries are mutated in place.
var _instance_pool = [];
function _get_pool_instance(idx) {
    while (idx >= _instance_pool.length) {
        _instance_pool.push({
            z: 0,
            pos: [0, 0, 0, 0],
            sym: [0, 0, 0, 0],
            pat: [0, 0, 0, 0],
            scl: [0, 0, 0, 0],
            til: [0, 0, 0]
        });
    }
    return _instance_pool[idx];
}

// Cached Dict reference to avoid repeated new Dict() allocations (GC pressure).
// The underlying Max Dict object is persistent; this JS wrapper is safe to hold.
var _registry_cache = null;
function _reg() {
    if (_registry_cache === null) _registry_cache = new Dict("SigneRegistry");
    return _registry_cache;
}
var dirty_pos = false;
var dirty_sym = false;
var dirty_pat = false;
var dirty_scl = false;
var dirty_til = false;
var dirty_midi = false;
var needs_recalc = false;
var _dirty_selections = false;
var _dirty_frustum = false;

function notify_device_registered(id) {
    _stats_record_handler("notify_device_registered");
    // If called without an id, just count (legacy path)
    if (id !== undefined && id !== null) {
        if (_registered_ids[id]) return; // already registered, ignore
        _registered_ids[id] = true;
        // Phase 1: assign permanent slot index to this Symbol
        _assign_slot(id);
    }

    _registered_count++;
    profile_mark("notify_device_registered: " + _registered_count + "/" + _expected_count);



    if (_expected_count > 0 && _registered_count >= _expected_count) {
        _do_boot();
        return;
    }
    // Debounce: wait 150ms after last registration before booting
    if (_boot_settle_task !== null) _boot_settle_task.cancel();
    _boot_settle_due_ms = (new Date()).getTime() + 150;
    _boot_settle_task = new Task(function() {
        var late = (new Date()).getTime() - _boot_settle_due_ms;
        profile_mark("_boot_settle_task fired late=" + late + "ms is_booting=" + is_booting);
        if (is_booting) _do_boot();
    });
    _boot_settle_task.schedule(150);
}

function _do_boot() {
    if (!is_booting) return;
    is_booting = false;
    if (_boot_settle_task !== null) { _boot_settle_task.cancel(); _boot_settle_task = null; }
    profile_mark("_do_boot: building atlas cache");
    _build_atlas_index_cache();
    profile_mark("_do_boot: draw_selections");
    draw_selections();
    profile_mark("_do_boot: check_frustum");
    check_frustum();
    profile_mark("_do_boot: request_rebuild");
    request_rebuild();
    profile_mark("_do_boot: COMPLETE");


}

// Legacy fallback — patch can still send finish_booting (e.g. from existing delay path)
function finish_booting() {
    profile_mark("finish_booting called (is_booting=" + is_booting + ")");
    if (!is_booting) return;
    _do_boot();
}

function mark_dirty(pos, sym, pat, scl, til) {
    if (pos) { dirty_pos = true; dirty_midi = true; }
    if (sym) dirty_sym = true;
    if (pat) dirty_pat = true;
    if (scl) { dirty_scl = true; dirty_midi = true; }
    if (til) dirty_til = true;
    needs_recalc = true;
}

function mark_midi_dirty() {
    dirty_midi = true;
    needs_recalc = true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Lightweight signal from the patch: raw_matPos has been written via the
// cache-pak fast path (LFO modulation OR human dial input that the rate
// detector classified as modulation). Tells the next bang() to refresh
// selection wireframes / frustum culling against the new positions.
// Wired from `r SIGNe_RawMatPosDirty → speedlim 16 → mark_pos_dirty` in Screen,
// so it fires at most ~60Hz regardless of total symbol/modulation count.
// ─────────────────────────────────────────────────────────────────────────────
function mark_pos_dirty() {
    _stats_record_handler("mark_pos_dirty");
    _dirty_selections = true;
    _dirty_frustum = true;
}

function bang() {
    var pushed = false; 
    if (_stats_enabled) _stats_bang_count++;

    // update_math + matrix flush must run every frame because the raw_mat*
    // matrices may have been updated directly by Symbol devices (fast
    // modulation path) without touching any JS handler or dirty flag.
    // raw_matPos → dirty_pos / raw_matScl → dirty_scl / raw_matTil → dirty_til
    // raw_matCol affects both Symbol and Pattern alpha → dirty_sym + dirty_pat
    // raw_matLay (spacing/groupRot) affects positions of duplicates → covered by dirty_pos
    needs_recalc = true;
    dirty_pos = true;
    dirty_sym = true;
    dirty_pat = true;
    dirty_scl = true;
    dirty_til = true;

    // draw_selections and check_frustum only need to run when the selection
    // set or frustum has actually changed — NOT forced every frame, since
    // that overwhelms jit.gl.sketch with geometry commands and causes
    // cumulative slowdown. Modulation via raw_matPos doesn't affect selection
    // wireframes (they track the base position from JS drag/dial, which is
    // accurate enough for selection UX).

    if (needs_recalc) {
        var _t0 = _stats_enabled ? _now_us() : 0;
        update_math();
        if (_stats_enabled) {
            var _dt = _now_us() - _t0;
            _stats_update_math_total_us += _dt;
            if (_dt > _stats_update_math_max_us) _stats_update_math_max_us = _dt;
            _stats_update_math_calls++;
        }
        update_midi_math();
        update_trigger_cache();
        needs_recalc = false;
    }
    
    if (dirty_pos) { outlet(5, "bang"); dirty_pos = false; pushed = true; }
    if (dirty_sym) { outlet(6, "bang"); dirty_sym = false; pushed = true; }
    if (dirty_pat) { outlet(7, "bang"); dirty_pat = false; pushed = true; }
    if (dirty_scl) { outlet(8, "bang"); dirty_scl = false; pushed = true; }
    if (dirty_til) { outlet(9, "bang"); dirty_til = false; pushed = true; }
    if (dirty_midi) { outlet(10, "bang"); dirty_midi = false; pushed = true; }
    
    // Coalesce expensive UI updates that may have been triggered many times
    // per frame by automation/modulation. Run at most once per render frame.
    if (_dirty_selections) {
        var _t1 = _stats_enabled ? _now_us() : 0;
        draw_selections();
        if (_stats_enabled) _stats_draw_sel_total_us += (_now_us() - _t1);
        _dirty_selections = false;
    }
    if (_dirty_frustum) {
        var _t2 = _stats_enabled ? _now_us() : 0;
        check_frustum();
        if (_stats_enabled) _stats_check_frust_total_us += (_now_us() - _t2);
        _dirty_frustum = false;
    }
    
    _stats_maybe_dump();
}

function focus_live_device(id) {
    outlet(2, "send", id);
    outlet(2, "focus_me", 1);
}

function window_size(w, h) { winW = w; winH = h; }
function alt_key(state) { isAltDown = state; }
function shift_key(state) { isShiftDown = state; }
function o_key(state) { isODown = state; } 
function cmd_key(state) { isCmdDown = state; }
function set_quant_x(v) { quantX = v; quantSpacing = v; } 
function set_quant_y(v) { quantY = v; }
function set_quant_spacing(v) { quantSpacing = v; }
// Phase 4 cleanup: is_human_x/y/spacing handlers removed.
// In the new architecture, modulation values bypass JS entirely via the
// cache pak → raw matrix fast path, so these handlers were always called
// with v=1 and the flag was always 1. The flag check is now redundant.
function set_snap_mode(v) { snapToTrigger = v; }

function set_link_scale(state) { 
    linkScale = state; 
    if (linkScale === 1) {
        var registry = _reg();
        var keys = registry.getkeys();
        if (keys != null) {
            if (typeof keys === "string") keys = [keys];
            for (var i = 0; i < keys.length; i++) {
                if (registry.get(keys[i] + "::selected") == 1) {
                    var x = registry.get(keys[i] + "::scale_x") || 1.0;
                    var y = registry.get(keys[i] + "::scale_y") || 1.0;
                    activeRatio = (x !== 0) ? (y / x) : 1.0;
                    break;
                }
            }
        }
    }
}

function set_scrubbing(state) {
    isScrubbing = (state === 1);
    if (isScrubbing) {
        isDraggingMarquee = false;
        release_group(); 
        outlet(0, "reset"); 
    }
}

function set_playhead_offset(val) {
    globalPlayheadOffset = parseFloat(val);
}

function set_aspect_ratio(val) {
    globalAspectRatio = parseFloat(val);
    if (globalAspectRatio <= 0.0) globalAspectRatio = 1.0;
}

function draw_all_bounds(v) {
    showAllBounds = v;
    if (!is_booting) draw_selections(); 
}

function request_rebuild() {
    if (typeof release_selection === "function") {
        release_selection(); 
    }
    needs_recalc = true;
    mark_dirty(1, 1, 1, 1, 1);
}

function snap(val, quant) {
    if (quant === "free" || quant === 0 || quant === "0" || typeof quant === "undefined") return val;
    var q = parseFloat(quant);
    if (isNaN(q) || q === 0) return val;
    return Math.round(val * q) / q;
}

function true_wrap(val, max) {
    var v = val - Math.floor(val / max) * max;
    if (v < 0.0) v += max;
    return v;
}

function lerp(start, end, amt) {
    return (1.0 - amt) * start + amt * end;
}

function rgbToHsl(r, g, b) {
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2.0;

    if (max === min) { h = s = 0; }
    else {
        var d = max - min;
        s = l > 0.5 ? d / (2.0 - max - min) : d / (max + min);
        if (max === r) h = (g - b) / d + (g < b ? 6.0 : 0.0);
        else if (max === g) h = (b - r) / d + 2.0;
        else h = (r - g) / d + 4.0;
        h /= 6.0;
    }
    return [h, s, l];
}

function hslToRgb(h, s, l) {
    var r, g, b;
    var hue2rgb = function(p, q, t) {
        if (t < 0.0) t += 1.0;
        if (t > 1.0) t -= 1.0;
        if (t < 1.0/6.0) return p + (q - p) * 6.0 * t;
        if (t < 1.0/2.0) return q;
        if (t < 2.0/3.0) return p + (q - p) * (2.0/3.0 - t) * 6.0;
        return p;
    };

    if (s === 0.0) { r = g = b = l; } 
    else {
        var q = l < 0.5 ? l * (1.0 + s) : l + s - l * s;
        var p = 2.0 * l - q;
        r = hue2rgb(p, q, h + 1.0/3.0);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1.0/3.0);
    }
    return [r, g, b];
}

function apply_sat(r, g, b, sat) {
    var hsl = rgbToHsl(r, g, b);
    var new_s = Math.max(0.0, Math.min(1.0, sat));
    return hslToRgb(hsl[0], new_s, hsl[2]);
}

function update_frustum(first, last) {
    currentFirstBar = parseFloat(first);
    currentLastBar = parseFloat(last);
    messnamed("FrustumWidth", currentLastBar - currentFirstBar);
    if (!is_booting) check_frustum();
}

function get_frustum_width() {
    var fw = currentLastBar - currentFirstBar;
    if (fw <= 0.0) fw = 20.0;
    messnamed("FrustumWidth", fw);
}

function check_frustum() {
    var registry = _reg();
    var keys = registry.getkeys();
    if (keys == null) return;
    if (typeof keys === "string") keys = [keys];

    for (var i = 0; i < keys.length; i++) {
        var id = keys[i];
        if (!registry.contains(id + "::text_content")) continue;

        var x = parseFloat(registry.get(id + "::x")) || 0.0;
        var count = parseInt(registry.get(id + "::count")) || 1;
        var spacing = parseFloat(registry.get(id + "::spacing")) || 0.0;
        var gRot = parseFloat(registry.get(id + "::group_rot")) || 0.0;

        var sx = parseFloat(registry.get(id + "::bounds_x")); 
        if (isNaN(sx) || sx === 0) sx = parseFloat(registry.get(id + "::scale_x")) || 0.5;
        
        var sy = parseFloat(registry.get(id + "::bounds_y")); 
        if (isNaN(sy) || sy === 0) sy = parseFloat(registry.get(id + "::scale_y")) || 0.5;

        var dynamicMargin = Math.sqrt((sx * sx) + (sy * sy));
        var gRad = -gRot * Math.PI * 2.0;
        var endX = x + ((count - 1) * spacing * Math.cos(gRad));

        var leftEdge = Math.min(x, endX);
        var rightEdge = Math.max(x, endX);

        leftEdge -= dynamicMargin;
        rightEdge += dynamicMargin;

        var inFrustum = 0;
        if (rightEdge > currentFirstBar && leftEdge < currentLastBar) {
            inFrustum = 1;
        }

        outlet(2, "send", id);
        outlet(2, "in_frustum", inFrustum);
    }
}

function get_hit_object(px, py) {
    var registry = _reg();
    var keys = registry.getkeys();
    if (keys == null) return null;
    if (typeof keys === "string") keys = [keys];
    var hitID = null, highestLayer = -Infinity;

    for (var i = 0; i < keys.length; i++) {
        var id = keys[i];
        var _p = _get_pos(id, registry);
        var objX = _p[0], objY = _p[1];
        
        var layerStr = registry.get(id + "::layer");
        var layer = (layerStr !== null) ? parseFloat(layerStr) : 0.0;
        if (isNaN(layer)) layer = 0.0;

        var sx = Math.abs(parseFloat(registry.get(id + "::bounds_x"))); 
        if (isNaN(sx) || sx === 0) sx = Math.abs(parseFloat(registry.get(id + "::scale_x"))) || 0.5;
        
        var sy = Math.abs(parseFloat(registry.get(id + "::bounds_y"))); 
        if (isNaN(sy) || sy === 0) sy = Math.abs(parseFloat(registry.get(id + "::scale_y"))) || 0.5;
        
        var rot = parseFloat(registry.get(id + "::rotation")) || 0.0;
        var gRot = parseFloat(registry.get(id + "::group_rot")) || 0.0;
        var count = parseInt(registry.get(id + "::count")) || 1;
        var spacing = parseFloat(registry.get(id + "::spacing")) || 0.0;
        var gCos = Math.cos(-gRot * 2.0 * Math.PI);
        var gSin = Math.sin(-gRot * 2.0 * Math.PI);

        for (var j = 0; j < count; j++) {
            var ix = objX + (j * spacing * gCos), iy = objY + (j * spacing * gSin);
            var dx = px - ix, dy = py - iy;
            var rad = (rot + gRot) * 2.0 * Math.PI;
            var cosT = Math.cos(rad), sinT = Math.sin(rad); 
            var localX = (dx * cosT) - (dy * sinT), localY = (dx * sinT) + (dy * cosT);
            
            if (Math.abs(localX) <= sx && Math.abs(localY) <= sy) {
                if (layer >= highestLayer) { 
                    highestLayer = layer; 
                    hitID = id; 
                }
            }
        }
    }
    return hitID;
}

function global_button(state) {
    if (state === 0 && prevBtn === 1) {
        if (isDraggingMarquee) release_selection();
        if (isDraggingGroup || isScalingGroup || isRotatingGroup || isAdjustingOpacityGroup) release_group();
        handledClick = false; prevBtn = 0; 
    }
}

function picker_hit(target, state) {
    if (isScrubbing) return;
    if (state === 1) { 
        if (!handledClick) {
            handledClick = true; lastViewportInteractionTime = new Date().getTime(); 
            var mathHitID = get_hit_object(c3x, c3y);
            
            if (mathHitID == null) {
                isDraggingMarquee = true; isDraggingGroup = false; isScalingGroup = false; isRotatingGroup = false; isAdjustingOpacityGroup = false;
                got3DAnchor = false; a2x = (curX / winW) * 2.0 - 1.0; a2y = 1.0 - (curY / winH) * 2.0;
                outlet(1, "getposition"); draw_selections();
            } else {
                var registry = _reg();
                var isSelected = registry.get(mathHitID + "::selected");
                
                if (isCmdDown === 1) {
                    if (isSelected == 1) {
                        registry.set(mathHitID + "::selected", 0);
                        outlet(2, "send", mathHitID); outlet(2, "selected", 0); outlet(2, "selected_via_mouse", 0); 
                        draw_selections();
                        return;
                    } else {
                        registry.set(mathHitID + "::selected", 1);
                        update_properties_window(mathHitID);
                        outlet(4, mathHitID, 1);
                        outlet(2, "send", mathHitID); outlet(2, "selected", 1);
                    }
                } else {
                    if (isSelected != 1) {
                        var keys = registry.getkeys();
                        if (keys != null) {
                            if (typeof keys === "string") keys = [keys];
                            for (var i = 0; i < keys.length; i++) {
                                registry.set(keys[i] + "::selected", 0);
                                outlet(2, "send", keys[i]); outlet(2, "selected", 0); outlet(2, "selected_via_mouse", 0); 
                            }
                        }
                        registry.set(mathHitID + "::selected", 1);
                        update_properties_window(mathHitID);
                        outlet(4, mathHitID, 1);
                        outlet(2, "send", mathHitID); outlet(2, "selected", 1);

                        if (linkScale === 1) {
                            var x = registry.get(mathHitID + "::scale_x") || 1.0, y = registry.get(mathHitID + "::scale_y") || 1.0;
                            activeRatio = (x !== 0) ? (y / x) : 1.0;
                        }
                    }
                }

                outlet(2, "send", mathHitID); outlet(2, "selected_via_mouse", 1);
                focus_live_device(mathHitID);
                
                if (isODown === 1) isAdjustingOpacityGroup = true;
                else if (isAltDown === 1) isScalingGroup = true;
                else if (isShiftDown === 1) isRotatingGroup = true;
                else isDraggingGroup = true;
                
                got3DAnchor = false; take_centroid_snapshot(registry);
                outlet(1, "getposition"); draw_selections();
            }
        }
    }
}

function screen_mouse(x, y, btn) {
    curX = x; curY = y;
    if (btn === 1 && prevBtn === 0) handledClick = false;
    if (btn === 1) {
        if (isDraggingMarquee && !isScrubbing) {
            c2x = (x / winW) * 2.0 - 1.0; c2y = 1.0 - (y / winH) * 2.0;
            outlet(0, "reset"); outlet(0, "glcolor", 0.8, 0.8, 1.0, 1.0);
            outlet(0, "framequad", a2x, a2y, 0.0, c2x, a2y, 0.0, c2x, c2y, 0.0, a2x, c2y, 0.0);
            outlet(1, "getposition");
        } else if (isDraggingGroup || isScalingGroup || isRotatingGroup || isAdjustingOpacityGroup) {
            outlet(1, "getposition"); 
        }
    } 
    else if (btn === 0 && prevBtn === 1) {
        if (isDraggingMarquee) release_selection();
        if (isDraggingGroup || isScalingGroup || isRotatingGroup || isAdjustingOpacityGroup) release_group();
        handledClick = false; 
    }
    prevBtn = btn;
}

function picker_pos(x, y, z) {
    if (!got3DAnchor && (isDraggingMarquee || isDraggingGroup || isScalingGroup || isRotatingGroup || isAdjustingOpacityGroup)) {
        a3x = x; a3y = y; c3x = x; c3y = y; got3DAnchor = true; 
    } else if (got3DAnchor) {
        c3x = x; c3y = y;
        if (isDraggingGroup) update_group_positions();
        else if (isScalingGroup) update_group_scale();
        else if (isRotatingGroup) update_group_rotation();
        else if (isAdjustingOpacityGroup) update_group_opacity(); 
    }
}

function take_centroid_snapshot(registry) {
    var keys = registry.getkeys();
    if (keys == null) return;
    if (typeof keys === "string") keys = [keys];
    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, count = 0;
    for (var i = 0; i < keys.length; i++) {
        var id = keys[i];
        if (registry.get(id + "::selected") == 1) { 
            count++;
            var _p = _get_pos(id, registry);
            var bx = _p[0], by = _p[1];
            registry.set(id + "::base_x", bx); registry.set(id + "::base_y", by);
            registry.set(id + "::base_sx", registry.get(id + "::scale_x") || 1.0);
            registry.set(id + "::base_sy", registry.get(id + "::scale_y") || 1.0);
            registry.set(id + "::base_rot", registry.get(id + "::rotation") || 0.0);
            var currentOpacity = registry.get(id + "::opacity");
            registry.set(id + "::base_opacity", currentOpacity !== null ? parseFloat(currentOpacity) : 1.0);
            if (bx < minX) minX = bx; if (bx > maxX) maxX = bx;
            if (by < minY) minY = by; if (by > maxY) maxY = by;
        }
    }
    if (count > 0) { groupCx = (minX + maxX) / 2.0; groupCy = (minY + maxY) / 2.0; }
}

function release_group() {
    isDraggingGroup = false; isScalingGroup = false; isRotatingGroup = false; isAdjustingOpacityGroup = false;
    
    // Broadcast drag-end to all currently selected Symbols.
    // Releases each Symbol's gate-override so modulation can resume.
    if (_drag_active_kind !== null) {
        var registry = _reg();
        var keys = registry.getkeys();
        if (keys != null) {
            if (typeof keys === "string") keys = [keys];
            for (var k = 0; k < keys.length; k++) {
                if (registry.get(keys[k] + "::selected") == 1) {
                    outlet(2, "send", keys[k]);
                    outlet(2, "drag_active", 0);
                }
            }
        }
        _drag_active_kind = null;
    }
}

function update_group_positions() {
    var deltaX = c3x - a3x; var deltaY = c3y - a3y;
    var registry = _reg();
    var keys = registry.getkeys();
    if (keys == null) return;
    if (typeof keys === "string") keys = [keys];
    
    // Broadcast drag-start once at the beginning of a position drag.
    // Tells each selected Symbol's gate to lock to human path until drag ends.
    if (_drag_active_kind !== "pos") {
        for (var k = 0; k < keys.length; k++) {
            if (registry.get(keys[k] + "::selected") == 1) {
                outlet(2, "send", keys[k]);
                outlet(2, "drag_active", 1);
            }
        }
        _drag_active_kind = "pos";
    }
    
    for (var i = 0; i < keys.length; i++) {
        var id = keys[i];
        if (registry.get(id + "::selected") == 1) { 
            if (registry.get(id + "::locked") == 1) continue;
            var bx = registry.get(id + "::base_x"); var newX;
            if (snapToTrigger === 1) {
                var tOff = registry.get(id + "::trigger_offset") || 0.0;
                newX = snap(bx + tOff + deltaX, quantX) - tOff;
            } else { newX = snap(bx + deltaX, quantX); }
            var newY = snap(registry.get(id + "::base_y") + deltaY, quantY);
            registry.set(id + "::x", newX); registry.set(id + "::y", newY);
            _set_raw_pos(id, newX, newY);  // Phase 2c: keep raw_matPos in sync for fast read path
            outlet(2, "send", id); outlet(2, "move_x", newX); outlet(2, "move_y", newY);
        }
    }
    
    if (!is_booting) {
        _dirty_selections = true;
        mark_dirty(1, 0, 0, 0, 0); 
        _dirty_frustum = true;
        needs_recalc = true;
    }
}

function update_group_scale() {
    var deltaX = c3x - a3x; var factorX = 1.0 + deltaX; 
    var factorY = (linkScale === 1) ? factorX : (1.0 + (c3y - a3y));
    if (factorX < 0.01) factorX = 0.01; if (factorY < 0.01) factorY = 0.01;
    var registry = _reg();
    var keys = registry.getkeys();
    if (keys == null) return;
    if (typeof keys === "string") keys = [keys];
    
    // Broadcast drag-start once at the beginning of a scale drag.
    if (_drag_active_kind !== "scl") {
        for (var k = 0; k < keys.length; k++) {
            if (registry.get(keys[k] + "::selected") == 1) {
                outlet(2, "send", keys[k]);
                outlet(2, "drag_active", 1);
            }
        }
        _drag_active_kind = "scl";
    }
    
    for (var i = 0; i < keys.length; i++) {
        var id = keys[i];
        if (registry.get(id + "::selected") == 1) { 
            if (registry.get(id + "::locked") == 1) continue;
            var newX = groupCx + ((registry.get(id + "::base_x") - groupCx) * factorX);
            var newY = groupCy + ((registry.get(id + "::base_y") - groupCy) * factorY);
            var newSx = registry.get(id + "::base_sx") * factorX;
            var newSy = registry.get(id + "::base_sy") * factorY;
            
            registry.set(id + "::x", newX); registry.set(id + "::y", newY);
            registry.set(id + "::scale_x", newSx); registry.set(id + "::scale_y", newSy);
            _set_raw_pos(id, newX, newY);  // Phase 2c: keep raw_matPos in sync
            _set_raw_scl(id, newSx, newSy);  // Phase 3: keep raw_matScl in sync
            
            outlet(2, "send", id); 
            outlet(2, "move_x", newX); outlet(2, "move_y", newY);
            outlet(2, "scale_x", newSx); outlet(2, "scale_y", newSy);    
            outlet(2, "ui_x", newSx); outlet(2, "ui_y", newSy);
        }
    }
    
    if (!is_booting) {
        _dirty_selections = true;
        mark_dirty(1, 0, 0, 1, 0); 
        _dirty_frustum = true;
        needs_recalc = true;
    }
}

function update_group_rotation() {
    var deltaRot = (c3x - a3x); var orbitRad = -deltaRot * (Math.PI * 2.0); 
    var cosTheta = Math.cos(orbitRad); var sinTheta = Math.sin(orbitRad);
    var registry = _reg();
    var keys = registry.getkeys();
    if (keys == null) return;
    if (typeof keys === "string") keys = [keys];
    
    // Broadcast drag-start once at the beginning of a rotation drag.
    if (_drag_active_kind !== "rot") {
        for (var k = 0; k < keys.length; k++) {
            if (registry.get(keys[k] + "::selected") == 1) {
                outlet(2, "send", keys[k]);
                outlet(2, "drag_active", 1);
            }
        }
        _drag_active_kind = "rot";
    }
    
    for (var i = 0; i < keys.length; i++) {
        var id = keys[i];
        if (registry.get(id + "::selected") == 1) { 
            if (registry.get(id + "::locked") == 1) continue;
            var dx = registry.get(id + "::base_x") - groupCx, dy = registry.get(id + "::base_y") - groupCy;
            var newX = groupCx + (dx * cosTheta) - (dy * sinTheta), newY = groupCy + (dx * sinTheta) + (dy * cosTheta);
            var newRot = true_wrap(registry.get(id + "::base_rot") + deltaRot, ROT_MAX);
            registry.set(id + "::x", newX); registry.set(id + "::y", newY); registry.set(id + "::rotation", newRot);
            _set_raw_pos(id, newX, newY);  // Phase 2c: keep raw_matPos in sync
            _set_raw_rotation(id, newRot);  // Phase 3: keep rotation in sync
            outlet(2, "send", id); outlet(2, "move_x", newX); outlet(2, "move_y", newY); outlet(2, "rotation", newRot);
        }
    }
    
    if (!is_booting) {
        _dirty_selections = true;
        mark_dirty(1, 0, 0, 0, 0); 
        _dirty_frustum = true;
        needs_recalc = true;
    }
}

function update_group_opacity() {
    var deltaY = c3y - a3y;
    var registry = _reg();
    var keys = registry.getkeys();
    if (keys != null) {
        if (typeof keys === "string") keys = [keys];
        // Broadcast drag-start once at the beginning of an opacity drag.
        if (_drag_active_kind !== "opac") {
            for (var k = 0; k < keys.length; k++) {
                if (registry.get(keys[k] + "::selected") == 1) {
                    outlet(2, "send", keys[k]);
                    outlet(2, "drag_active", 1);
                }
            }
            _drag_active_kind = "opac";
        }
    }
    // Restore original local registry handling
    var registry = _reg();
    var keys = registry.getkeys();
    if (keys == null) return;
    if (typeof keys === "string") keys = [keys];
    for (var i = 0; i < keys.length; i++) {
        var id = keys[i];
        if (registry.get(id + "::selected") == 1) { 
            if (registry.get(id + "::locked") == 1) continue;
            var newOpac = Math.max(0, Math.min(1, parseFloat(registry.get(id + "::base_opacity")) + deltaY));
            registry.set(id + "::opacity", newOpac);
            _set_raw_opacity(id, newOpac);  // Phase 3: keep raw_matCol in sync
            outlet(2, "send", id); outlet(2, "opacity", newOpac);
        }
    }
    
    if (!is_booting) {
        _dirty_selections = true;
        mark_dirty(0, 1, 1, 0, 0);
        needs_recalc = true;
    }
}

function release_selection() {
    if (isScrubbing) return; 
    isDraggingMarquee = false; outlet(0, "reset");
    lastViewportInteractionTime = new Date().getTime(); 

    var minX = Math.min(a3x, c3x), maxX = Math.max(a3x, c3x), minY = Math.min(a3y, c3y), maxY = Math.max(a3y, c3y);
    var registry = _reg();
    var keys = registry.getkeys();
    if (keys == null) return;
    if (typeof keys === "string") keys = [keys];
    
    var leftmostID = null, leftmostX = Infinity;
    
    for (var i = 0; i < keys.length; i++) {
        var id = keys[i];
        
        var wasSelected = (registry.get(id + "::selected") == 1);
        var isSelected = 0;
        var hit = false;
        
        var _p = _get_pos(id, registry);
        var objX = _p[0], objY = _p[1];
        var sx = registry.get(id + "::bounds_x"); if (sx == null) sx = registry.get(id + "::scale_x") || 0.0;
        var sy = registry.get(id + "::bounds_y"); if (sy == null) sy = registry.get(id + "::scale_y") || 0.0;
        var rot = registry.get(id + "::rotation") || 0.0;
        var gRot = registry.get(id + "::group_rot") || 0.0;
        var count = registry.get(id + "::count") || 1;
        var spacing = registry.get(id + "::spacing") || 0.0;

        var gRad = -gRot * (Math.PI * 2.0);
        var gCosT = Math.cos(gRad), gSinT = Math.sin(gRad);
        var drawRad = -(rot + gRot) * 2.0 * Math.PI;
        var cosT = Math.cos(drawRad), sinT = Math.sin(drawRad);
        var invRad = (rot + gRot) * 2.0 * Math.PI;
        var invCos = Math.cos(invRad), invSin = Math.sin(invRad);

        for (var j = 0; j < count; j++) {
            var ix = objX + (j * spacing * gCosT), iy = objY + (j * spacing * gSinT);
            var p1x = ix + (-sx*cosT - sy*sinT), p1y = iy + (-sx*sinT + sy*cosT);
            var p2x = ix + ( sx*cosT - sy*sinT), p2y = iy + ( sx*sinT + sy*cosT);
            var p3x = ix + ( sx*cosT + sy*sinT), p3y = iy + ( sx*sinT - sy*cosT);
            var p4x = ix + (-sx*cosT + sy*sinT), p4y = iy + (-sx*sinT - sy*cosT);

            if (ix >= minX && ix <= maxX && iy >= minY && iy <= maxY) hit = true;
            else if (p1x >= minX && p1x <= maxX && p1y >= minY && p1y <= maxY) hit = true;
            else if (p2x >= minX && p2x <= maxX && p2y >= minY && p2y <= maxY) hit = true;
            else if (p3x >= minX && p3x <= maxX && p3y >= minY && p3y <= maxY) hit = true;
            else if (p4x >= minX && p4x <= maxX && p4y >= minY && p4y <= maxY) hit = true;
            else {
                var mqC = [[minX, minY], [maxX, minY], [maxX, maxY], [minX, maxY]];
                for(var c = 0; c < 4; c++) {
                    var dx = mqC[c][0] - ix, dy = mqC[c][1] - iy;
                    var lx = (dx * invCos) - (dy * invSin);
                    var ly = (dx * invSin) + (dy * invCos);
                    if (Math.abs(lx) <= sx && Math.abs(ly) <= sy) { hit = true; break; }
                }
            }
            if (hit) break; 
        }
        
        if (isCmdDown === 1) {
            isSelected = hit ? (wasSelected ? 0 : 1) : (wasSelected ? 1 : 0);
        } else {
            isSelected = hit ? 1 : 0;
        }

        if (isSelected === 1 && objX < leftmostX) { 
            leftmostX = objX; 
            leftmostID = id; 
        } 
        
        registry.set(id + "::selected", isSelected);
        outlet(4, id, (id === leftmostID) ? 1 : 0);
    }
    
    for (var i = 0; i < keys.length; i++) {
        var id = keys[i]; var isSelected = registry.get(id + "::selected");
        outlet(2, "send", id); outlet(2, "selected", isSelected); 
        outlet(2, "selected_via_mouse", (id === leftmostID) ? 1 : 0);
        if (id === leftmostID) {
            focus_live_device(id);
            update_properties_window(id);
        }
    }

    if (leftmostID === null) {
        messnamed("SelectedObjectName", "none"); 
        messnamed("SelectedObjectIndex_FromSymbol", -1); 
        messnamed("SelectedPatternIndex_FromSymbol", -1);
        messnamed("SelectedObjectIsText", -1);
    }

    if (!is_booting) {
        _dirty_selections = true;
        mark_dirty(1, 1, 1, 1, 1);
        needs_recalc = true;
    }
}

// =========================================================
// UI INTERACTIONS 
// =========================================================
function drop_new_object(id) {
    var api = new LiveAPI(null, "live_set");
    if (!api) return;
    
    var num = parseFloat(api.get("signature_numerator")[0]);
    var den = parseFloat(api.get("signature_denominator")[0]);
    var beatsPerBar = (num / den) * 4.0;
    var beats = parseFloat(api.get("current_song_time")[0]);
    
    var bars = (beats / beatsPerBar) + 1.0;
    var dropX = snap(bars + 2.0, quantX);

    var registry = _reg();
    if (!registry.contains(id)) return;

    registry.set(id + "::x", dropX);
    // Keep raw_matPos in step with the registry, as the drag handlers do.
    // Without this the object's bounds — drawn from the matrix — and the device's
    // own rendering, driven by the move_x below, disagree by dropX. The next
    // drag then reads the stale matrix value as its origin via _get_pos and
    // silently discards the drop position. Only the x plane is written: y comes
    // from the device's own Position Y initial, which has not arrived yet.
    _set_raw_pos_x(id, dropX);
    outlet(2, "send", id);
    outlet(2, "move_x", dropX);
    
    if (!is_booting) {
        _dirty_selections = true;
        mark_dirty(1, 0, 0, 0, 0);
        needs_recalc = true;
    }
}

function remove(id) {
    _stats_record_handler("remove");
    // Phase 4 opt 1: drop resolved-index cache entries
    delete _resolvedSymIdx[id];
    delete _resolvedPatIdx[id];
    // Phase 4 opt 3: drop color cache entry
    delete _colorCache[id];
    var registry = _reg();
    if (registry.contains(id)) registry.remove(id);
    // Phase 1: free this Symbol's slot for reuse
    _free_slot(id);
    delete _registered_ids[id]; // also clear registration flag so re-add works
    
    if (!is_booting) {
        _dirty_selections = true;
        mark_dirty(1, 1, 1, 1, 1);
        needs_recalc = true;
    }
}

function ui_lock(id, state) {
    _stats_record_handler("ui_lock");
    var registry = _reg();
    if (!registry.contains(id)) return;
    
    registry.set(id + "::locked", state);
    if (!is_booting) draw_selections(); 
    
    if (registry.get(id + "::selected") == 1) {
        update_properties_window(id);
    }
}

function ui_lock_all(state) {
    var registry = _reg();
    var keys = registry.getkeys();
    if (keys == null) return;
    if (typeof keys === "string") keys = [keys];
    
    var activeSelectedID = null;

    for (var i = 0; i < keys.length; i++) {
        var id = keys[i];
        registry.set(id + "::locked", state);
        outlet(2, "send", id);
        outlet(2, "locked", state);
        if (registry.get(id + "::selected") == 1) {
            activeSelectedID = id;
        }
    }
    
    if (!is_booting) draw_selections();
    
    if (activeSelectedID !== null) {
        update_properties_window(activeSelectedID);
    }
}

function ui_select(target) {
    _stats_record_handler("ui_select");
    if (isScrubbing) return;
    if (new Date().getTime() - lastViewportInteractionTime < 500) return;
    var registry = _reg();
    if (!registry.contains(target)) return;
    var keys = registry.getkeys();
    if (keys != null) {
        if (typeof keys === "string") keys = [keys];
        for (var i = 0; i < keys.length; i++) {
            registry.set(keys[i] + "::selected", 0);
            outlet(2, "send", keys[i]); outlet(2, "selected", 0); outlet(2, "selected_via_mouse", 0); 
        }
    }
    registry.set(target + "::selected", 1);
    outlet(4, target, 1); outlet(2, "send", target); outlet(2, "selected", 1);
    update_properties_window(target);
    take_centroid_snapshot(registry);

    if (linkScale === 1) {
        var x = registry.get(target + "::scale_x") || 1.0, y = registry.get(target + "::scale_y") || 1.0;
        activeRatio = (x !== 0) ? (y / x) : 1.0;
    }
    if (!is_booting) draw_selections();
}

function live_device_selected(device_id) {
    if (isScrubbing) return;
    var registry = _reg();
    var keys = registry.getkeys();
    if (keys == null) return;
    if (typeof keys === "string") keys = [keys];

    for (var i = 0; i < keys.length; i++) {
        var id = keys[i];
        var reg_dev_id = registry.get(id + "::live_device_id");
        
        if (reg_dev_id !== null && parseInt(reg_dev_id) === parseInt(device_id)) {
            if (registry.get(id + "::selected") != 1) {
                var tempTime = lastViewportInteractionTime;
                lastViewportInteractionTime = 0; 
                ui_select(id);
                lastViewportInteractionTime = tempTime;
            }
            return;
        }
    }
}

function ui_move_x(id, x) {
    _stats_record_handler("ui_move_x");
    var registry = _reg();
    if (!registry.contains(id)) return;
    var newX;
    if (snapToTrigger === 1) {
        var tOff = registry.get(id + "::trigger_offset") || 0.0;
        newX = snap(x + tOff, quantX) - tOff;
    } else {
        newX = snap(x, quantX);
    }
    registry.set(id + "::x", newX); 
    // Phase 2c: ALSO write to raw_matPos so render stays consistent with registry
    // for human dial input. (Cache pak in patch already handles this, but writing
    // here too is safe and avoids a window of inconsistency.)
    var _slot = _slot_for_id[id];
    if (_slot !== undefined && _slot >= 0) {
        try {
            var _c = raw_matPos.getcell(_slot);
            raw_matPos.setcell1d(_slot, newX, _c[1], _c[2], _c[3]);
        } catch (e) {}
    }
    outlet(2, "send", id); 
    
    if (!is_booting) {
        _dirty_selections = true;
        mark_dirty(1, 0, 0, 0, 0);
        _dirty_frustum = true;
        needs_recalc = true;
    }
}

function ui_move_y(id, y) {
    _stats_record_handler("ui_move_y");
    var registry = _reg();
    if (!registry.contains(id)) return;
    var v = snap(y, quantY);
    registry.set(id + "::y", v); 
    // Phase 2c: ALSO write to raw_matPos
    var _slot = _slot_for_id[id];
    if (_slot !== undefined && _slot >= 0) {
        try {
            var _c = raw_matPos.getcell(_slot);
            raw_matPos.setcell1d(_slot, _c[0], v, _c[2], _c[3]);
        } catch (e) {}
    }
    outlet(2, "send", id); 
    
    if (!is_booting) {
        _dirty_selections = true;
        mark_dirty(1, 0, 0, 0, 0);
        _dirty_frustum = true;
        needs_recalc = true;
    }
}

function ui_trigger_offset(id, val) {
    _stats_record_handler("ui_trigger_offset");
    var registry = _reg();
    if (!registry.contains(id)) return;
    registry.set(id + "::trigger_offset", val); 
    
    if (!is_booting) {
        _dirty_selections = true; 
        mark_dirty(1, 0, 0, 0, 0);
        needs_recalc = true;
    }
}

function dial_scale_x(id, val) {
    if (isScalingGroup || ignoreX) return; 
    var registry = _reg();
    if (!registry.contains(id)) return;
    
    if (linkScale === 1) {
        var oldX = registry.get(id + "::scale_x") || 1.0;
        var oldY = registry.get(id + "::scale_y") || 1.0;
        var currentRatio = (oldX !== 0) ? (oldY / oldX) : 1.0;
        
        registry.set(id + "::scale_x", val); 
        outlet(2, "send", id); outlet(2, "scale_x", val); 
        
        var newY = val * currentRatio;
        registry.set(id + "::scale_y", newY); ignoreY = true;
        outlet(2, "scale_y", newY); outlet(2, "ui_y", newY); ignoreY = false;
    } else {
        registry.set(id + "::scale_x", val); 
        outlet(2, "send", id); outlet(2, "scale_x", val); 
    }
    
    if (!is_booting) {
        _dirty_selections = true;
        mark_dirty(1, 0, 0, 1, 0);
        _dirty_frustum = true;
        needs_recalc = true;
    }
}

function dial_scale_y(id, val) {
    if (isScalingGroup || ignoreY) return; 
    var registry = _reg();
    if (!registry.contains(id)) return;

    if (linkScale === 1) {
        var oldX = registry.get(id + "::scale_x") || 1.0;
        var oldY = registry.get(id + "::scale_y") || 1.0;
        var currentRatio = (oldY !== 0) ? (oldX / oldY) : 1.0;
        
        registry.set(id + "::scale_y", val); 
        outlet(2, "send", id); outlet(2, "scale_y", val); 
        
        var newX = val * currentRatio;
        registry.set(id + "::scale_x", newX); ignoreX = true;
        outlet(2, "scale_x", newX); outlet(2, "ui_x", newX); ignoreX = false;
    } else {
        registry.set(id + "::scale_y", val); 
        outlet(2, "send", id); outlet(2, "scale_y", val); 
    }
    
    if (!is_booting) {
        _dirty_selections = true;
        mark_dirty(1, 0, 0, 1, 0);
        _dirty_frustum = true;
        needs_recalc = true;
    }
}

function ui_scale_x(id, val) {
    _stats_record_handler("ui_scale_x");
    var registry = _reg(); if (!registry.contains(id)) return;
    registry.set(id + "::scale_x", val); _set_raw_scl_x(id, val); outlet(2, "send", id); 
    if (!is_booting) { _dirty_selections = true; mark_dirty(1, 0, 0, 1, 0); _dirty_frustum = true; needs_recalc = true; }
}

function ui_scale_y(id, val) {
    _stats_record_handler("ui_scale_y");
    var registry = _reg(); if (!registry.contains(id)) return;
    registry.set(id + "::scale_y", val); _set_raw_scl_y(id, val); outlet(2, "send", id); 
    if (!is_booting) { _dirty_selections = true; mark_dirty(1, 0, 0, 1, 0); _dirty_frustum = true; needs_recalc = true; }
}

function ui_rotate(id, val) {
    _stats_record_handler("ui_rotate");
    var registry = _reg(); if (!registry.contains(id)) return;
    registry.set(id + "::rotation", val);
    // Phase 3: store raw rotation in user units (radians conversion happens in update_math)
    _set_raw_rotation(id, val);
    outlet(2, "send", id); 
    if (!is_booting) { _dirty_selections = true; mark_dirty(1, 0, 0, 0, 0); needs_recalc = true; }
}

function ui_opacity(id, val) {
    _stats_record_handler("ui_opacity");
    var registry = _reg(); if (!registry.contains(id)) return;
    registry.set(id + "::opacity", val); _set_raw_opacity(id, val); outlet(2, "send", id); 
    if (!is_booting) { _dirty_selections = true; mark_dirty(0, 1, 1, 0, 0); needs_recalc = true; }
}

function ui_count(id, val) {
    _stats_record_handler("ui_count");
    var registry = _reg(); if (!registry.contains(id)) return;
    registry.set(id + "::count", val); outlet(2, "send", id); 
    if (!is_booting) { _dirty_selections = true; mark_dirty(1, 1, 1, 1, 1); _dirty_frustum = true; needs_recalc = true; }
}

function ui_spacing(id, val) {
    _stats_record_handler("ui_spacing");
    var registry = _reg(); if (!registry.contains(id)) return;
    var v = snap(val, quantSpacing);
    registry.set(id + "::spacing", v); _set_raw_spacing(id, v); outlet(2, "send", id); 
    if (!is_booting) { _dirty_selections = true; mark_dirty(1, 1, 1, 1, 1); _dirty_frustum = true; needs_recalc = true; }
}

function ui_group_rot(id, val) {
    _stats_record_handler("ui_group_rot");
    var registry = _reg(); if (!registry.contains(id)) return;
    registry.set(id + "::group_rot", val); _set_raw_grouprot(id, val); outlet(2, "send", id); 
    if (!is_booting) { _dirty_selections = true; mark_dirty(1, 0, 0, 0, 0); _dirty_frustum = true; needs_recalc = true; }
}

function ui_bounds_x(id, val) {
    _stats_record_handler("ui_bounds_x");
    var registry = _reg(); if (!registry.contains(id)) return;
    registry.set(id + "::bounds_x", val); 
    if (!is_booting) { _dirty_selections = true; _dirty_frustum = true; needs_recalc = true; }
}

function ui_bounds_y(id, val) {
    _stats_record_handler("ui_bounds_y");
    var registry = _reg(); if (!registry.contains(id)) return;
    registry.set(id + "::bounds_y", val); 
    if (!is_booting) { _dirty_selections = true; _dirty_frustum = true; needs_recalc = true; }
}

function ui_layer(id, val) {
    _stats_record_handler("ui_layer");
    var registry = _reg(); if (!registry.contains(id)) return;
    registry.set(id + "::layer", val);
    // Phase 3: store raw layer in user units (×0.01 happens in update_math)
    _set_raw_layer(id, val);
    if (!is_booting) { _dirty_selections = true; mark_dirty(1, 1, 1, 1, 1); _dirty_frustum = true; needs_recalc = true; }
}

function ui_symbol_texture(id, val) {
    var registry = _reg(); if (!registry.contains(id)) return;
    registry.set(id + "::symbol_texture", val);
    _refreshResolvedSymIdx(id);
    if (!is_booting) mark_dirty(1, 1, 1, 1, 1);
}

function ui_symbol_colour_start_rgb() {
    var args = arrayfromargs(arguments); var id = args[0];
    var registry = _reg(); if (!registry.contains(id)) return;
    _markColorDirty(id);
    var hsl = rgbToHsl(args[1], args[2], args[3]);
    var pureRGB = hslToRgb(hsl[0], 1.0, hsl[2]); 
    registry.set(id + "::symbol_colour_start_rgb", pureRGB); 
    if (!is_booting) mark_dirty(0, 1, 0, 0, 0);
}

function ui_symbol_colour_start_sat(id, val) {
    var registry = _reg(); if (!registry.contains(id)) return;
    _markColorDirty(id);
    registry.set(id + "::symbol_colour_start_sat", val); 
    if (!is_booting) mark_dirty(0, 1, 0, 0, 0); 
}

function ui_symbol_colour_end_rgb() {
    var args = arrayfromargs(arguments); var id = args[0];
    var registry = _reg(); if (!registry.contains(id)) return;
    _markColorDirty(id);
    var hsl = rgbToHsl(args[1], args[2], args[3]);
    var pureRGB = hslToRgb(hsl[0], 1.0, hsl[2]);
    registry.set(id + "::symbol_colour_end_rgb", pureRGB); 
    if (!is_booting) mark_dirty(0, 1, 0, 0, 0);
}

function ui_symbol_colour_end_sat(id, val) {
    var registry = _reg(); if (!registry.contains(id)) return;
    _markColorDirty(id);
    registry.set(id + "::symbol_colour_end_sat", val); 
    if (!is_booting) mark_dirty(0, 1, 0, 0, 0); 
}

function ui_symbol_colour_start_hsl() {
    var args = arrayfromargs(arguments); var id = args[0];
    var registry = _reg(); if (!registry.contains(id)) return;
    _markColorDirty(id);
    var pureRGB = hslToRgb(args[1], 1.0, args[3]);
    registry.set(id + "::symbol_colour_start_rgb", pureRGB); 
    if (!is_booting) mark_dirty(0, 1, 0, 0, 0);
}

function ui_symbol_colour_end_hsl() {
    var args = arrayfromargs(arguments); var id = args[0];
    var registry = _reg(); if (!registry.contains(id)) return;
    _markColorDirty(id);
    var pureRGB = hslToRgb(args[1], 1.0, args[3]);
    registry.set(id + "::symbol_colour_end_rgb", pureRGB); 
    if (!is_booting) mark_dirty(0, 1, 0, 0, 0);
}

function ui_symbol_colour_interp(id, val) {
    _stats_record_handler("ui_symbol_colour_interp");
    var registry = _reg(); if (!registry.contains(id)) return;
    registry.set(id + "::symbol_colour_interp", val); _set_raw_sinterp(id, val);
    if (!is_booting) { _dirty_selections = true; mark_dirty(0, 1, 0, 0, 0); needs_recalc = true; }
}

function ui_pattern_texture(id, val) {
    var registry = _reg(); if (!registry.contains(id)) return;
    registry.set(id + "::pattern_texture", val);
    _refreshResolvedPatIdx(id);
    if (!is_booting) mark_dirty(1, 1, 1, 1, 1); 
}

function ui_pattern_tiling(id, val) {
    _stats_record_handler("ui_pattern_tiling");
    var registry = _reg(); if (!registry.contains(id)) return;
    registry.set(id + "::pat_tiling_x", val); registry.set(id + "::pat_tiling_y", val);
    _set_raw_tiling(id, val);
    if (!is_booting) { _dirty_selections = true; mark_dirty(0, 0, 0, 0, 1); needs_recalc = true; }
}

function ui_pattern_intensity(id, val) {
    _stats_record_handler("ui_pattern_intensity");
    var registry = _reg(); if (!registry.contains(id)) return;
    registry.set(id + "::pattern_intensity", val); _set_raw_intensity(id, val);
    if (!is_booting) { _dirty_selections = true; mark_dirty(0, 0, 1, 0, 0); needs_recalc = true; }
}

function ui_pattern_colour_start_rgb() {
    var args = arrayfromargs(arguments); var id = args[0];
    var registry = _reg(); if (!registry.contains(id)) return;
    _markColorDirty(id);
    var hsl = rgbToHsl(args[1], args[2], args[3]);
    var pureRGB = hslToRgb(hsl[0], 1.0, hsl[2]);
    registry.set(id + "::pattern_colour_start_rgb", pureRGB); 
    if (!is_booting) mark_dirty(0, 0, 1, 0, 0);
}

function ui_pattern_colour_start_sat(id, val) {
    var registry = _reg(); if (!registry.contains(id)) return;
    _markColorDirty(id);
    registry.set(id + "::pattern_colour_start_sat", val); 
    if (!is_booting) mark_dirty(0, 0, 1, 0, 0); 
}

function ui_pattern_colour_end_rgb() {
    var args = arrayfromargs(arguments); var id = args[0];
    var registry = _reg(); if (!registry.contains(id)) return;
    _markColorDirty(id);
    var hsl = rgbToHsl(args[1], args[2], args[3]);
    var pureRGB = hslToRgb(hsl[0], 1.0, hsl[2]);
    registry.set(id + "::pattern_colour_end_rgb", pureRGB); 
    if (!is_booting) mark_dirty(0, 0, 1, 0, 0);
}

function ui_pattern_colour_end_sat(id, val) {
    var registry = _reg(); if (!registry.contains(id)) return;
    _markColorDirty(id);
    registry.set(id + "::pattern_colour_end_sat", val); 
    if (!is_booting) mark_dirty(0, 0, 1, 0, 0); 
}

function ui_pattern_colour_start_hsl() {
    var args = arrayfromargs(arguments); var id = args[0];
    var registry = _reg(); if (!registry.contains(id)) return;
    _markColorDirty(id);
    var pureRGB = hslToRgb(args[1], 1.0, args[3]);
    registry.set(id + "::pattern_colour_start_rgb", pureRGB); 
    if (!is_booting) mark_dirty(0, 0, 1, 0, 0);
}

function ui_pattern_colour_end_hsl() {
    var args = arrayfromargs(arguments); var id = args[0];
    var registry = _reg(); if (!registry.contains(id)) return;
    _markColorDirty(id);
    var pureRGB = hslToRgb(args[1], 1.0, args[3]);
    registry.set(id + "::pattern_colour_end_rgb", pureRGB); 
    if (!is_booting) mark_dirty(0, 0, 1, 0, 0);
}

function ui_pattern_colour_interp(id, val) {
    _stats_record_handler("ui_pattern_colour_interp");
    var registry = _reg(); if (!registry.contains(id)) return;
    registry.set(id + "::pattern_colour_interp", val); _set_raw_pinterp(id, val);
    if (!is_booting) { _dirty_selections = true; mark_dirty(0, 0, 1, 0, 0); needs_recalc = true; }
}

function ui_midi_trigger_state(id, val) {
    var registry = _reg(); if (!registry.contains(id)) return;
    registry.set(id + "::midi_trigger_state", val); 
    if (!is_booting) mark_midi_dirty();
}

function ui_midi_trigger_offset(id, val) {
    var registry = _reg(); if (!registry.contains(id)) return;
    registry.set(id + "::trigger_offset", val); 
    if (!is_booting) mark_midi_dirty();
}

function ui_midi_trigger_rgb(id, r, g, b) {
    var registry = _reg(); if (!registry.contains(id)) return;
    registry.set(id + "::midi_trigger_rgb", [r, g, b]); 
    if (!is_booting) mark_midi_dirty();
}

function ui_midi_trigger_sat(id, val) {
    var registry = _reg(); if (!registry.contains(id)) return;
    registry.set(id + "::midi_trigger_sat", val); 
    if (!is_booting) mark_midi_dirty();
}

function ui_midi_trigger_pitch(id, val) {
    _stats_record_handler("ui_midi_trigger_pitch");
    var registry = _reg(); if (!registry.contains(id)) return;
    registry.set(id + "::midi_trigger_pitch", val);
}

function ui_midi_trigger_velocity(id, val) {
    _stats_record_handler("ui_midi_trigger_velocity");
    var registry = _reg(); if (!registry.contains(id)) return;
    registry.set(id + "::midi_trigger_velocity", val);
}

function ui_midi_trigger_duration(id, val) {
    var registry = _reg(); if (!registry.contains(id)) return;
    registry.set(id + "::midi_trigger_duration", val);
}

function ui_text_italic(id, val) {
    var registry = _reg(); if (!registry.contains(id)) return;
    registry.set(id + "::text_italic", val);
}

function ui_text_bold(id, val) {
    var registry = _reg(); if (!registry.contains(id)) return;
    registry.set(id + "::text_bold", val);
}

function ui_text_spacing(id, val) {
    var registry = _reg(); if (!registry.contains(id)) return;
    registry.set(id + "::text_spacing", val);
}

function ui_text_alignment(id, val) {
    var registry = _reg(); if (!registry.contains(id)) return;
    registry.set(id + "::text_alignment", val);
}

function ui_base_bounds_x(id, val) {
    var registry = _reg(); if (!registry.contains(id)) return;
    registry.set(id + "::base_bounds_x", val);
}

function ui_base_bounds_y(id, val) {
    var registry = _reg(); if (!registry.contains(id)) return;
    registry.set(id + "::base_bounds_y", val);
}

function ui_text_font() {
    var args = arrayfromargs(arguments);
    var id = args[0];
    var registry = _reg(); if (!registry.contains(id)) return;
    var fontName = args.slice(1).join(" ");
    registry.set(id + "::text_font", fontName);
}

function ui_text_content() {
    var args = arrayfromargs(arguments);
    var id = args[0];
    var registry = _reg(); if (!registry.contains(id)) return;
    var textContent = args.slice(1).join(" ");
    registry.set(id + "::text_content", textContent);
    if (!is_booting) check_frustum();
}

function ui_symbol_library() {
    var args = arrayfromargs(arguments); var id = args[0];
    var registry = _reg(); if (!registry.contains(id)) return;
    registry.set(id + "::symbol_library", args.slice(1).join(" "));
}
function ui_symbol_category() {
    var args = arrayfromargs(arguments); var id = args[0];
    var registry = _reg(); if (!registry.contains(id)) return;
    registry.set(id + "::symbol_category", args.slice(1).join(" "));
}
function ui_symbol_index(id, val) {
    var registry = _reg(); if (!registry.contains(id)) return;
    registry.set(id + "::symbol_index", val);
}

function ui_pattern_library() {
    var args = arrayfromargs(arguments); var id = args[0];
    var registry = _reg(); if (!registry.contains(id)) return;
    registry.set(id + "::pattern_library", args.slice(1).join(" "));
}
function ui_pattern_category() {
    var args = arrayfromargs(arguments); var id = args[0];
    var registry = _reg(); if (!registry.contains(id)) return;
    registry.set(id + "::pattern_category", args.slice(1).join(" "));
}
function ui_pattern_index(id, val) {
    var registry = _reg(); if (!registry.contains(id)) return;
    registry.set(id + "::pattern_index", val);
}

function set_pinned(id, state) {
    var registry = _reg(); if (registry.contains(id)) registry.set(id + "::pinned", state);
}

function camera_pos(cx, cy) {
    if (!camInitialized) { lastCamX = cx; lastCamY = cy; camInitialized = true; return; }
    var dCx = cx - lastCamX, dCy = cy - lastCamY;
    if (dCx !== 0 || dCy !== 0) {
        var registry = _reg();
        var keys = registry.getkeys();
        if (keys != null) {
            if (typeof keys === "string") keys = [keys];
            for (var i = 0; i < keys.length; i++) {
                var id = keys[i];
                if (registry.get(id + "::pinned") == 1) { 
                    var _p = _get_pos(id, registry);
                    var nx = _p[0] + dCx, ny = _p[1] + dCy;
                    registry.set(id+"::x", nx); registry.set(id+"::y", ny);
                    outlet(2, "send", id); outlet(2, "move_x", nx); outlet(2, "move_y", ny);
                }
            }
        }
        if (!is_booting) { _dirty_selections = true; mark_dirty(1, 0, 0, 0, 0); needs_recalc = true; }
    }
    lastCamX = cx; lastCamY = cy;
}

function move_to_transport(id) {
    var api = new LiveAPI(null, "live_set"); if (!api) return; 
    var num = parseFloat(api.get("signature_numerator")[0]), den = parseFloat(api.get("signature_denominator")[0]);
    var beatsPerBar = (num / den) * 4.0, beats = parseFloat(api.get("current_song_time")[0]);
    var bars = (beats / beatsPerBar) + 1.0; var v = bars;
    var registry = _reg(); if (!registry.contains(id)) return;
    if (snapToTrigger === 1) {
        var tOff = registry.get(id + "::trigger_offset") || 0.0;
        v = snap(bars, quantX) - tOff;
    } else { v = snap(bars, quantX); }
    registry.set(id + "::x", v); outlet(2, "send", id); outlet(2, "move_x", v); 
    if (!is_booting) { _dirty_selections = true; mark_dirty(1, 0, 0, 0, 0); needs_recalc = true; }
}

function move_transport_to_object(id) {
    var api = new LiveAPI(null, "live_set"); if (!api) return;
    var registry = _reg();
    if (registry.contains(id)) {
        var num = parseFloat(api.get("signature_numerator")[0]), den = parseFloat(api.get("signature_denominator")[0]);
        var beatsPerBar = (num / den) * 4.0, posX = _get_pos(id, registry)[0];
        var targetBeats = Math.max(0, (posX - 1.0) * beatsPerBar), songLength = parseFloat(api.get("song_length"));
        if (targetBeats >= songLength) { outlet(2, "send", id); outlet(2, "bounds_error", 1); return; }
        api.set("current_song_time", Number(targetBeats));
    }
}

function group_prop_float(propName, val) {
    var registry = _reg(); var keys = registry.getkeys();
    if (keys == null) return;
    if (typeof keys === "string") keys = [keys];
    for (var i = 0; i < keys.length; i++) {
        var id = keys[i];
        if (registry.get(id + "::selected") == 1) { registry.set(id + "::" + propName, val); outlet(2, "send", id); outlet(2, propName, val); }
    }
    if (!is_booting) mark_dirty(1, 1, 1, 1, 1);
}

function group_prop_rgb(propName, r, g, b, a) {
    if (a === undefined) a = 1.0; 
    var registry = _reg(); var keys = registry.getkeys();
    if (keys == null) return;
    if (typeof keys === "string") keys = [keys];
    for (var i = 0; i < keys.length; i++) {
        var id = keys[i];
        if (registry.get(id + "::selected") == 1) { registry.set(id + "::" + propName, [r, g, b, a]); outlet(2, "send", id); outlet(2, propName, r, g, b, a); }
    }
    if (!is_booting) mark_dirty(0, 1, 1, 0, 0);
}

function group_prop_symbol(propName, filename) {
    if (filename === undefined) { filename = propName; propName = "symbol_texture"; }
    
    var dictKey = (propName === "pattern_texture") ? "pattern_texture" : "symbol_texture";
    
    var registry = _reg(); 
    var keys = registry.getkeys();
    if (keys == null) return;
    if (typeof keys === "string") keys = [keys];
    
    for (var i = 0; i < keys.length; i++) {
        var id = keys[i];
        if (registry.get(id + "::selected") == 1) { 
            registry.set(id + "::" + dictKey, filename); 
            outlet(2, "send", id); 
            outlet(2, dictKey, filename); 
            
            if (dictKey === "symbol_texture") {
                messnamed("SymbolTexture_FromObject", filename);
            } else {
                messnamed("PatternTexture_FromObject", filename);
            }
        }
    }
    if (!is_booting) mark_dirty(0, 0, 0, 1, 0);
}

function draw_selections() {
    var registry = _reg();
    var keys = registry.getkeys();
    outlet(3, "reset");
    
    if (keys == null) return;
    if (typeof keys === "string") keys = [keys];
    
    for (var i = 0; i < keys.length; i++) {
        var id = keys[i];
        var isSelected = (registry.get(id + "::selected") == 1);
        var isLocked = (registry.get(id + "::locked") == 1);

        if (isSelected || showAllBounds === 1) { 
            if (isLocked) {
                outlet(3, "glcolor", [0.4, 0.8, 1.0, 1.0]); 
            } else if (isSelected) {
                outlet(3, "glcolor", [1.0, 0.8, 0.0, 1.0]); 
            } else {
                outlet(3, "glcolor", [1.0, 0.0, 0.0, 1.0]); 
            }

            var _p = _get_pos(id, registry);
            var x = _p[0], y = _p[1];
            var sx = registry.get(id + "::bounds_x");
            if (sx == null) sx = registry.get(id + "::scale_x") || 0.0;
            var sy = registry.get(id + "::bounds_y");
            if (sy == null) sy = registry.get(id + "::scale_y") || 0.0;            
            var rot = registry.get(id+"::rotation") || 0.0, gRot = registry.get(id+"::group_rot") || 0.0;
            var count = registry.get(id+"::count") || 1, spacing = registry.get(id+"::spacing") || 0.0;
            var gCos = Math.cos(-gRot * 2 * Math.PI), gSin = Math.sin(-gRot * 2 * Math.PI);
            var cosT = Math.cos(-(rot+gRot) * 2 * Math.PI), sinT = Math.sin(-(rot+gRot) * 2 * Math.PI);
            
            for (var j = 0; j < count; j++) {
                var ix = x + (j * spacing * gCos), iy = y + (j * spacing * gSin);
                outlet(3, "glbegin", "line_loop");
                outlet(3, "glvertex", ix + (-sx*cosT - sy*sinT), iy + (-sx*sinT + sy*cosT), 0);
                outlet(3, "glvertex", ix + (sx*cosT - sy*sinT), iy + (sx*sinT + sy*cosT), 0);
                outlet(3, "glvertex", ix + (sx*cosT + sy*sinT), iy + (sx*sinT - sy*cosT), 0);
                outlet(3, "glvertex", ix + (-sx*cosT + sy*sinT), iy + (-sx*sinT - sy*cosT), 0);
                outlet(3, "glend");
            }
        }
    }
}

// =========================================================
// HARDWARE INSTANCING MATH
// =========================================================

function update_math() {
    var registry = _reg();
    var keys = registry.getkeys();
    
    if (keys == null) {
        if (last_total_instances !== 1) {
            matPos.dim = 1; matSym.dim = 1; matPat.dim = 1; matScl.dim = 1; matTil.dim = 1;
            last_total_instances = 1;
        }
        matScl.setcell1d(0, 0, 0, 0, 0); 
        return;
    }
    
    if (typeof keys === "string") keys = [keys];

    var valid_symbols = [];
    for (var i = 0; i < keys.length; i++) {
        if (registry.contains(keys[i] + "::symbol_texture")) {
            valid_symbols.push(keys[i]);
        }
    }
    keys = valid_symbols; 
    
    if (keys.length === 0) {
        if (last_total_instances !== 1) {
            matPos.dim = 1; matSym.dim = 1; matPat.dim = 1; matScl.dim = 1; matTil.dim = 1;
            last_total_instances = 1;
        }
        matScl.setcell1d(0, 0, 0, 0, 0); 
        return; 
    }

    _all_instances.length = 0;  // reuse persistent array, avoid GC pressure
    var all_instances = _all_instances;

    for (var i = 0; i < keys.length; i++) {
        var id = keys[i];
        
        // Phase 2a: read x, y from raw_matPos fast path when slot is assigned;
        // fall back to registry during the brief window before initial push completes
        var slot = _slot_for_id[id];
        var bx, by;
        var have_pos_from_matrix = false;
        if (slot !== undefined && slot >= 0) {
            try {
                var posCell = raw_matPos.getcell(slot);
                bx = posCell[0];
                by = posCell[1];
                have_pos_from_matrix = true;
            } catch (e) {
                // raw_matPos not ready yet; fall through to registry below
            }
        }
        if (!have_pos_from_matrix) {
            bx = parseFloat(registry.get(id + "::x")) || 0.0;
            by = parseFloat(registry.get(id + "::y")) || 0.0;
        }
        // Phase 3: read layer + rotation from raw_matPos planes 2, 3 (with registry fallback)
        var layer_raw, rot_raw;
        if (have_pos_from_matrix) {
            layer_raw = posCell[2];
            rot_raw = posCell[3];
        } else {
            layer_raw = parseFloat(registry.get(id + "::layer")) || 0.0;
            rot_raw = parseFloat(registry.get(id + "::rotation")) || 0.0;
        }
        var layer = layer_raw * 0.01;
        var rotRadians = rot_raw * 2.0 * Math.PI;

        // Phase 3: read scale from raw_matScl (with registry fallback)
        var _sclVals = _get_scl(id, registry);
        var sx = _sclVals[0], sy = _sclVals[1];
        
        // Phase 4 opt 1: pre-resolved texture indices, no string work in hot loop
        var symIdx = _resolvedSymIdx[id]; if (symIdx === undefined) symIdx = 0.0;
        var patIdx = _resolvedPatIdx[id]; if (patIdx === undefined) patIdx = 0.0;

        // Phase 3: read opacity, sInterp, pInterp from raw_matCol (with registry fallback)
        var _colVals = _get_col(id, registry);
        var opac = _colVals[0];
        // sInterp and pInterp consumed below where they're used

        // Phase 4 opt 3: cached saturated endpoints; only lerp runs every frame.
        var _cc = _refreshColorCache(id, registry);
        var sInterp = _colVals[1];
        var pInterp = _colVals[2];

        var sr = lerp(_cc.sStartRGB[0], _cc.sEndRGB[0], sInterp);
        var sg = lerp(_cc.sStartRGB[1], _cc.sEndRGB[1], sInterp);
        var sb = lerp(_cc.sStartRGB[2], _cc.sEndRGB[2], sInterp);
        var sa = lerp(_cc.sStartA, _cc.sEndA, sInterp) * opac;

        var pr = lerp(_cc.pStartRGB[0], _cc.pEndRGB[0], pInterp);
        var pg = lerp(_cc.pStartRGB[1], _cc.pEndRGB[1], pInterp);
        var pb = lerp(_cc.pStartRGB[2], _cc.pEndRGB[2], pInterp);
        var pa = lerp(_cc.pStartA, _cc.pEndA, pInterp) * opac;

        // Phase 3: read uniform tiling + intensity from raw_matTil (with registry fallback)
        var _tilVals = _get_til(id, registry);
        var tx = _tilVals[0], ty = _tilVals[0], pIntensity = _tilVals[1];
                
        // Phase 3: read spacing + groupRot from raw_matLay (with registry fallback)
        var _layVals = _get_lay(id, registry);
        var spacing = _layVals[0], gRot = _layVals[1];
        var count = parseInt(registry.get(id + "::count")) || 1;
        var gCos = Math.cos(-gRot * 2.0 * Math.PI), gSin = Math.sin(-gRot * 2.0 * Math.PI);

        for (var j = 0; j < count; j++) {
            var ix = bx + (j * spacing * gCos), iy = by + (j * spacing * gSin);
            // Phase 4 opt 2: pool reuse instead of allocation
            var inst = _get_pool_instance(all_instances.length);
            inst.z = layer;
            inst.pos[0] = ix;            inst.pos[1] = iy;       inst.pos[2] = layer;  inst.pos[3] = rotRadians;
            inst.sym[0] = sr;            inst.sym[1] = sg;       inst.sym[2] = sb;     inst.sym[3] = sa;
            inst.pat[0] = pr;            inst.pat[1] = pg;       inst.pat[2] = pb;     inst.pat[3] = pa;
            inst.scl[0] = sx;            inst.scl[1] = sy;       inst.scl[2] = symIdx; inst.scl[3] = patIdx;
            inst.til[0] = tx;            inst.til[1] = ty;       inst.til[2] = pIntensity;
            all_instances.push(inst);
        }
    }

    all_instances.sort(function(a, b) {
        return a.z - b.z;
    });

    var total_instances = all_instances.length;
    if (total_instances === 0) total_instances = 1; 

    if (total_instances !== last_total_instances) {
        matPos.dim = total_instances;
        matSym.dim = total_instances;
        matPat.dim = total_instances;
        matScl.dim = total_instances;
        matTil.dim = total_instances;
        last_total_instances = total_instances;
    }

    if (all_instances.length === 0) {
        matScl.setcell1d(0, 0, 0, 0, 0); 
        return;
    }

    for (var k = 0; k < all_instances.length; k++) {
        var inst = all_instances[k];
        matPos.setcell1d(k, inst.pos[0], inst.pos[1], inst.pos[2], inst.pos[3]);
        matSym.setcell1d(k, inst.sym[0], inst.sym[1], inst.sym[2], inst.sym[3]);
        matPat.setcell1d(k, inst.pat[0], inst.pat[1], inst.pat[2], inst.pat[3]);
        matScl.setcell1d(k, inst.scl[0], inst.scl[1], inst.scl[2], inst.scl[3]);
        matTil.setcell1d(k, inst.til[0], inst.til[1], inst.til[2]);
    }
}

function update_midi_math() {
    var registry = _reg();
    var keys = registry.getkeys();
    
    if (keys == null) {
        matMidiPos.dim = 1; matMidiScl.dim = 1; matMidiCol.dim = 1;
        matMidiScl.setcell1d(0, 0, 0, 0); 
        last_total_midi = 0;
        return;
    }
    if (typeof keys === "string") keys = [keys];

    var valid_midi_ids = [];
    var total_midi = 0;
    for (var i = 0; i < keys.length; i++) {
        var id = keys[i];
        if (parseInt(registry.get(id + "::midi_trigger_state")) === 1) {
            valid_midi_ids.push(id);
            total_midi += (parseInt(registry.get(id + "::count")) || 1);
        }
    }

    if (total_midi < 1) {
        matMidiPos.dim = 1; matMidiScl.dim = 1; matMidiCol.dim = 1;
        matMidiScl.setcell1d(0, 0, 0, 0); 
        last_total_midi = 0;
        return;
    }

    if (total_midi !== last_total_midi) {
        matMidiPos.dim = total_midi;
        matMidiScl.dim = total_midi;
        matMidiCol.dim = total_midi;
        last_total_midi = total_midi;
    }

    var current_idx = 0;
    for (var i = 0; i < valid_midi_ids.length; i++) {
        var id = valid_midi_ids[i];
        var _p = _get_pos(id, registry);
        var bx = _p[0], by = _p[1];
        var tOff = parseFloat(registry.get(id + "::trigger_offset")) || 0.0;

        var count = parseInt(registry.get(id + "::count")) || 1;
        var spacing = parseFloat(registry.get(id + "::spacing")) || 0.0;
        var gRot = parseFloat(registry.get(id + "::group_rot")) || 0.0;
        var gCos = Math.cos(-gRot * 2.0 * Math.PI);
        var gSin = Math.sin(-gRot * 2.0 * Math.PI);

        var sx = parseFloat(registry.get(id + "::bounds_x"));
        if (isNaN(sx) || sx === 0) sx = parseFloat(registry.get(id + "::scale_x")) || 0.5;

        var sy = parseFloat(registry.get(id + "::bounds_y"));
        if (isNaN(sy) || sy === 0) sy = parseFloat(registry.get(id + "::scale_y")) || 0.5;

        var rgb = registry.get(id + "::midi_trigger_rgb") || [1.0, 0.0, 0.0];
        var sat = parseFloat(registry.get(id + "::midi_trigger_sat")); if (isNaN(sat)) sat = 1.0;
        var finalColor = apply_sat(rgb[0], rgb[1], rgb[2], sat);

        for (var j = 0; j < count; j++) {
            var ix = bx + (j * spacing * gCos) + tOff;
            var iy = by + (j * spacing * gSin);

            matMidiPos.setcell1d(current_idx, ix, iy, 0.9999);
            matMidiScl.setcell1d(current_idx, 0.05, sy, 1.0); 
            matMidiCol.setcell1d(current_idx, finalColor[0], finalColor[1], finalColor[2], 1.0);

            current_idx++;
        }
    }
}

function update_trigger_cache() {
    cached_midi_triggers = [];
    var registry = _reg();
    var keys = registry.getkeys();
    
    if (keys == null) return;
    if (typeof keys === "string") keys = [keys];

    for (var i = 0; i < keys.length; i++) {
        var id = keys[i];
        
        var bx = _get_pos(id, registry)[0];
        var tOff = parseFloat(registry.get(id + "::trigger_offset")) || 0.0;
        var count = parseInt(registry.get(id + "::count")) || 1;
        var spacing = parseFloat(registry.get(id + "::spacing")) || 0.0;
        var gRot = parseFloat(registry.get(id + "::group_rot")) || 0.0;
        var gCos = Math.cos(-gRot * 2.0 * Math.PI);

        for (var j = 0; j < count; j++) {
            var ix = bx + (j * spacing * gCos) + tOff;
            cached_midi_triggers.push({ id: id, x: ix });
        }
    }
}

function transport_tick(current_x) {
    var offset_x = (current_x - 1.0) + globalPlayheadOffset;

    if (last_playhead_x < 0) { last_playhead_x = offset_x; return; }

    if (Math.abs(offset_x - last_playhead_x) > 0.5) {
        last_playhead_x = offset_x;
        return;
    }

    if (offset_x > last_playhead_x) { 
        for (var i = 0; i < cached_midi_triggers.length; i++) {
            var tx = cached_midi_triggers[i].x;
            if (last_playhead_x < tx && offset_x >= tx) {
                outlet(2, "send", cached_midi_triggers[i].id);
                outlet(2, "fire_midi", 1); 
            }
        }
    }
    last_playhead_x = offset_x;
}

function update_properties_window(id) {
    var registry = _reg();

    messnamed("SelectedObjectName", id);

    var isText = registry.contains(id + "::text_content") ? 1 : 0;
    messnamed("SelectedObjectIsText", isText);

    function push_float(key, rx_name) {
        var val = registry.get(id + "::" + key);
        if (val !== null) messnamed(rx_name, parseFloat(val));
    }

    function push_string(key, rx_name) {
        var val = registry.get(id + "::" + key);
        if (val !== null && val !== "") messnamed(rx_name, val);
    }

    function push_color(key, rx_name) {
        var val = registry.get(id + "::" + key);
        if (val !== null) {
            var r = val[0] !== undefined ? val[0] : 1.0;
            var g = val[1] !== undefined ? val[1] : 1.0;
            var b = val[2] !== undefined ? val[2] : 1.0;
            var a = val[3] !== undefined ? val[3] : 1.0;
            messnamed(rx_name, r, g, b, a); 
        }
    }

    push_float("locked", "ObjectIsLocked_FromSymbol");

    push_color("symbol_colour_start_rgb", "Colour_StartRGB_FromObject");
    push_float("symbol_colour_start_sat", "Colour_StartSaturation_FromObject");
    push_color("symbol_colour_end_rgb", "Colour_EndRGB_FromObject");
    push_float("symbol_colour_end_sat", "Colour_EndSaturation_FromObject");
    push_float("symbol_colour_interp", "Colour_Interpolation_FromObject");
    push_string("symbol_library", "ObjectLibraryFolderName_FromSymbol");
    push_string("symbol_category", "ObjectCategoryFolderName_FromSymbol");
    push_string("symbol_texture", "SymbolTexture_FromObject");

    push_color("pattern_colour_start_rgb", "Colour_Pattern_StartRGB_FromObject");
    push_float("pattern_colour_start_sat", "Colour_Pattern_StartSaturation_FromObject");
    push_color("pattern_colour_end_rgb", "Colour_Pattern_EndRGB_FromObject");
    push_float("pattern_colour_end_sat", "Colour_Pattern_EndSaturation_FromObject");
    push_float("pattern_colour_interp", "PatternColourInterp_FromObject");
    push_float("pat_tiling_x", "PatternTiling_FromObject");
    push_float("pattern_intensity", "PatternIntensity_FromObject");
    push_string("pattern_library", "PatternLibraryFolderName_FromSymbol");
    push_string("pattern_category", "PatternCategoryFolderName_FromSymbol");
    push_string("pattern_texture", "PatternTexture_FromObject");

    push_float("midi_trigger_state", "MIDITriggerStateFromObject");
    push_color("midi_trigger_rgb", "MIDITrigger_RGB_FromObject");
    push_float("midi_trigger_sat", "MIDITrigger_Saturation_FromObject");
    push_float("midi_trigger_pitch", "MIDITrigger_Pitch_FromObject");
    push_float("midi_trigger_velocity", "MIDITrigger_Velocity_FromObject");
    push_float("trigger_offset", "MIDITrigger_Offset_FromObject");
    push_float("midi_trigger_duration", "MIDITrigger_Duration_FromObject");

    push_float("text_italic", "TextItalic_FromObject");
    push_float("text_bold", "TextBold_FromObject");
    push_float("text_spacing", "TextSpacing_FromObject");
    push_float("text_alignment", "TextAlignment_FromObject");
    push_float("base_bounds_x", "TextBoundsX_FromObject");
    push_float("base_bounds_y", "TextBoundsY_FromObject");
    push_string("text_font", "TextFont_FromObject");
    push_string("text_content", "TextContent_FromObject");
}
