autowatch = 1;
outlets = 1;
// outlet 0: bang when atlas is ready (built or loaded from cache)

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
// CACHE STATE
// ─────────────────────────────────────────────────────────────────────────────
var _cacheDir = "";
var _symCachePath = "";
var _patCachePath = "";
var _manifestCachePath = "";
var _lastFolderPath = "";

function _set_cache_paths(signeFolderPath) {
    _cacheDir = signeFolderPath + "/cache";
    _symCachePath = _cacheDir + "/SymbolAtlas.jxf";
    _patCachePath = _cacheDir + "/PatternAtlas.jxf";
    _manifestCachePath = _cacheDir + "/atlas_manifest.json";
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────────
function build_atlases(signeFolderPath) {
    profile_mark("build_atlases: start");
    if (signeFolderPath.charAt(signeFolderPath.length - 1) === "/") {
        signeFolderPath = signeFolderPath.slice(0, -1);
    }
    _lastFolderPath = signeFolderPath;
    _set_cache_paths(signeFolderPath);

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

    var currentManifest = _build_manifest(symFiles, symNames, patFiles, patNames);
    profile_mark("build_atlases: manifest built");

    if (_try_load_cache(currentManifest, symFiles, symNames, patFiles, patNames)) {
        post("atlas_builder: loaded from cache (" + symFiles.length + " symbols, " + patFiles.length + " patterns)\n");
        profile_mark("build_atlases: cache load complete");
        outlet(0, "bang");
        return;
    }

    post("atlas_builder: building atlas (" + symFiles.length + " symbols, " + patFiles.length + " patterns)...\n");
    profile_mark("build_atlases: importmovie loop start");
    _build_and_cache(symFiles, symNames, patFiles, patNames, currentManifest);
    profile_mark("build_atlases: build+cache complete");
    post("atlas_builder: done\n");
    profile_mark("build_atlases: about to outlet bang");
    outlet(0, "bang");
    profile_mark("build_atlases: outlet bang returned");
}

// ─────────────────────────────────────────────────────────────────────────────
// MANIFEST — filename only, no size scan
// Detects additions, removals, renames. Use force_rebuild for same-name replacements.
// ─────────────────────────────────────────────────────────────────────────────
function _build_manifest(symFiles, symNames, patFiles, patNames) {
    var m = { symbols: [], patterns: [] };
    for (var i = 0; i < symFiles.length; i++) m.symbols.push({ name: symNames[i] });
    for (var i = 0; i < patFiles.length; i++) m.patterns.push({ name: patNames[i] });
    return m;
}

// ─────────────────────────────────────────────────────────────────────────────
// CACHE LOAD
// ─────────────────────────────────────────────────────────────────────────────
function _try_load_cache(currentManifest, symFiles, symNames, patFiles, patNames) {
    if (!_file_exists(_symCachePath) || !_file_exists(_patCachePath) || !_file_exists(_manifestCachePath)) {
        return false;
    }

    var savedManifest = _read_json(_manifestCachePath);
    if (!savedManifest) return false;

    if (!_manifests_equal(savedManifest, currentManifest)) {
        post("atlas_builder: cache invalid (files changed)\n");
        return false;
    }

    profile_mark("build_atlases: cache valid, loading 3D matrices");

    // Load 3D matrices from .jxf cache files
    var symMatrix = _load_jxf(_symCachePath, symFiles.length);
    if (!symMatrix) { post("atlas_builder: sym cache load failed\n"); return false; }

    var patMatrix = _load_jxf(_patCachePath, patFiles.length);
    if (!patMatrix) { post("atlas_builder: pat cache load failed\n"); return false; }

    // Push to GPU
    texSymbols.dim = [512, 512, symFiles.length];
    texSymbols.jit_matrix(symMatrix.name);
    texPatterns.dim = [512, 512, patFiles.length];
    texPatterns.jit_matrix(patMatrix.name);

    atlasDict.set("symbols", symNames);
    atlasDict.set("patterns", patNames);
    return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// FULL BUILD + CACHE SAVE
// ─────────────────────────────────────────────────────────────────────────────
function _build_and_cache(symFiles, symNames, patFiles, patNames, manifest) {
    var symMatrix = _build_atlas_matrix(symFiles);
    var patMatrix = _build_atlas_matrix(patFiles);

    texSymbols.dim = [512, 512, symFiles.length];
    texSymbols.jit_matrix(symMatrix.name);
    texPatterns.dim = [512, 512, patFiles.length];
    texPatterns.jit_matrix(patMatrix.name);

    atlasDict.set("symbols", symNames);
    atlasDict.set("patterns", patNames);

    // Save 3D matrices to cache
    _save_jxf(symMatrix, _symCachePath);
    _save_jxf(patMatrix, _patCachePath);
    _write_json(_manifestCachePath, manifest);
}

function _build_atlas_matrix(filePaths) {
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
var _tmpSaveName = "signe_atlas_save.jxf";
var _tmpLoadName = "signe_atlas_load.jxf";

function _save_jxf(matrix, absolutePath) {
    try {
        // matrix.write() is a Max message, not a JS method.
        // Use messnamed to send the write message to the named jit.matrix object.
        // This saves to Max's default file location (search path).
        messnamed(matrix.name, "write", _tmpSaveName);

        // Give Max one tick to complete the write before we try to read it back.
        // We use a small busy-wait — not ideal but JitterMatrix write is synchronous.
        // In practice messnamed is synchronous for file operations.
        var src = new File(_tmpSaveName, "read", "binary");
        if (!src.isopen) {
            // Try with full temp path in case Max wrote it to its own folder
            post("atlas_builder: write to search path failed, trying absolutePath directly\n");
            // Last resort: try writing directly to absolutePath via messnamed
            messnamed(matrix.name, "write", absolutePath);
            profile_mark("_save_jxf: wrote directly to " + absolutePath);
            return true; // Can't verify, but if no error was thrown assume success
        }

        var dst = new File(absolutePath, "write", "binary");
        if (!dst.isopen) {
            src.close();
            post("atlas_builder: could not write to " + absolutePath + "\n");
            post("atlas_builder: ensure the cache/ folder exists in your SIGNe directory\n");
            return false;
        }

        while (!src.eof) {
            var chunk = src.readbytes(65536);
            dst.writebytes(chunk, chunk.length);
        }
        src.close();
        dst.close();
        profile_mark("_save_jxf: saved to " + absolutePath);
        return true;
    } catch(e) {
        post("atlas_builder: _save_jxf error: " + e + "\n");
        return false;
    }
}

function _load_jxf(absolutePath, depth) {
    try {
        // Copy bytes from absolute cache path into Max's search path via temp file
        var src = new File(absolutePath, "read", "binary");
        if (!src.isopen) return null;

        var dst = new File(_tmpLoadName, "write", "binary");
        if (!dst.isopen) { src.close(); return null; }

        while (!src.eof) {
            var chunk = src.readbytes(65536);
            dst.writebytes(chunk, chunk.length);
        }
        src.close();
        dst.close();

        // Use messnamed to send read message to the named jit.matrix object
        var m = new JitterMatrix(4, "char", 512, 512, depth);
        messnamed(m.name, "read", _tmpLoadName);
        profile_mark("_load_jxf: loaded from " + absolutePath);
        return m;
    } catch(e) {
        post("atlas_builder: _load_jxf error: " + e + "\n");
        return null;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// MANIFEST COMPARISON
// ─────────────────────────────────────────────────────────────────────────────
function _manifests_equal(a, b) {
    if (!a || !b) return false;
    if (!_manifest_arrays_equal(a.symbols, b.symbols)) return false;
    if (!_manifest_arrays_equal(a.patterns, b.patterns)) return false;
    return true;
}

function _manifest_arrays_equal(a, b) {
    if (!a || !b) return false;
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) {
        if (a[i].name !== b[i].name) return false;
    }
    return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// FILE UTILITIES
// ─────────────────────────────────────────────────────────────────────────────
function _file_exists(path) {
    try {
        var f = new File(path, "read");
        if (f.isopen) { f.close(); return true; }
    } catch(e) {}
    return false;
}

function _read_json(path) {
    try {
        var f = new File(path, "read");
        if (!f.isopen) return null;
        var lines = [];
        while (!f.eof) lines.push(f.readline());
        f.close();
        return JSON.parse(lines.join("\n").trim());
    } catch(e) {
        post("atlas_builder: could not read manifest: " + e + "\n");
        return null;
    }
}

function _write_json(path, obj) {
    try {
        var f = new File(path, "write");
        if (!f.isopen) {
            post("atlas_builder: could not write manifest to " + path + "\n");
            post("atlas_builder: ensure the cache/ folder exists in your SIGNe directory\n");
            return;
        }
        f.writeline(JSON.stringify(obj));
        f.close();
    } catch(e) {
        post("atlas_builder: error writing manifest: " + e + "\n");
    }
}

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
// PROFILING (forwarded from marquee_selection_instancing.js conventions)
// ─────────────────────────────────────────────────────────────────────────────
var _profile_t0 = 0;
var _profile_enabled = true;

function profile_mark(label) {
    if (!_profile_enabled) return;
    var now = (new Date()).getTime();
    if (_profile_t0 === 0) _profile_t0 = now;
    post("[SIGNE PROFILE] +" + (now - _profile_t0) + "ms  " + label + "\n");
}

function profile_reset() { _profile_t0 = 0; }
function profile_enable(v) { _profile_enabled = (v !== 0); }

// ─────────────────────────────────────────────────────────────────────────────
// FORCE REBUILD — bypasses cache, always does full build
// Can be called with no argument after build_atlases has run once
// ─────────────────────────────────────────────────────────────────────────────
function force_rebuild(signeFolderPath) {
    if (signeFolderPath === undefined || signeFolderPath === "") {
        if (_lastFolderPath === "") {
            post("atlas_builder: force_rebuild called before build_atlases — no path known\n");
            return;
        }
        signeFolderPath = _lastFolderPath;
    }
    if (signeFolderPath.charAt(signeFolderPath.length - 1) === "/") {
        signeFolderPath = signeFolderPath.slice(0, -1);
    }
    _lastFolderPath = signeFolderPath;
    _set_cache_paths(signeFolderPath);

    var symFiles = []; var symNames = [];
    var patFiles = []; var patNames = [];
    get_images_recursive(signeFolderPath + "/symbols", symFiles, symNames);
    get_images_recursive(signeFolderPath + "/patterns", patFiles, patNames);
    var manifest = _build_manifest(symFiles, symNames, patFiles, patNames);
    post("atlas_builder: force rebuild (" + symFiles.length + " symbols, " + patFiles.length + " patterns)...\n");
    _build_and_cache(symFiles, symNames, patFiles, patNames, manifest);
    post("atlas_builder: force rebuild done\n");
    outlet(0, "bang");
}