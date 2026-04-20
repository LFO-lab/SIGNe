autowatch = 1;

// 1. Define our GPU Textures
var texSymbols = new JitterObject("jit.gl.texture", "SIGNe");
texSymbols.name = "SymbolAtlas";
texSymbols.filter = "none"; // Disables Z-axis interpolation!

var texPatterns = new JitterObject("jit.gl.texture", "SIGNe");
texPatterns.name = "PatternAtlas";
texPatterns.filter = "none";

// 2. Define our Manifest Dictionary (so the UI knows the names of the images)
var atlasDict = new Dict("AtlasManifest");

// 3. The Main Trigger Function (Send the message: build_atlases "C:/path/to/SIGNe")
function build_atlases(signeFolderPath) {
    // Strip trailing slash if present just to be safe
    if(signeFolderPath.charAt(signeFolderPath.length-1) === "/") {
        signeFolderPath = signeFolderPath.slice(0, -1);
    }

    // Build both atlases automatically
    build_3d_texture(signeFolderPath + "/symbols", texSymbols, "symbols");
    build_3d_texture(signeFolderPath + "/patterns", texPatterns, "patterns");
    
    // Tell the Max patch we are done
    outlet(0, "bang");
}

// 4. The Core Stacking Engine
function build_3d_texture(folderPath, targetTexture, dictKey) {
    var filePaths = [];
    var fileNames = [];
    
    // Run the recursive search
    get_images_recursive(folderPath, filePaths, fileNames);

    if (filePaths.length === 0) {
        post("No images found in " + folderPath + "\n");
        return;
    }

    // Initialize our 3D Atlas Matrix (dynamically sized to the number of files)
    var atlas3D = new JitterMatrix(4, "char", 512, 512, filePaths.length);
    atlas3D.usedstdim = 1;

    // Initialize our 2D Cookie Cutter Matrix
    var cookieCutter = new JitterMatrix(4, "char", 512, 512);
    cookieCutter.adapt = 0; // Force to 512x512, do not adapt to incoming image size

    var nameMap = new Array();

    // Loop through every file, cut it, and stack it
    for (var i = 0; i < filePaths.length; i++) {
        cookieCutter.importmovie(filePaths[i]);

        atlas3D.dstdimstart = [0, 0, i]; // Target the current Z-slice
        atlas3D.dstdimend = [511, 511, i];
        atlas3D.frommatrix(cookieCutter);

        nameMap.push(fileNames[i]);
    }

    // Push the 3D matrix to the GPU texture!
    targetTexture.dim = [512, 512, filePaths.length];
    targetTexture.jit_matrix(atlas3D.name);

    // Save the index map to our dictionary so the UI knows what Z-slice = what image
    atlasDict.set(dictKey, nameMap);

    // post("Successfully built " + dictKey + " atlas with " + filePaths.length + " layers.\n");
}

// 5. The Recursive Folder Search
function get_images_recursive(path, pathArray, nameArray) {
    var f = new Folder(path);
    while (!f.end) {
        if (f.filetype === "fold") {
            // Ignore hidden system navigation folders
            if (f.filename !== "." && f.filename !== "..") {
                get_images_recursive(path + "/" + f.filename, pathArray, nameArray);
            }
        } else {
            var ext = f.filename.split('.').pop().toLowerCase();
            if (ext === "png" || ext === "jpg" || ext === "jpeg") {
                pathArray.push(path + "/" + f.filename);
                // Store just the filename without the extension for a clean UI menu
                nameArray.push(f.filename.replace(/\.[^/.]+$/, "")); 
            }
        }
        f.next();
    }
    f.close();
}