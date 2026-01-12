"use strict";
autowatch = 1;

const MAX_MESHES = 1024;
const GL_CONTEXT = "scene_ctx";

// Mesh pool
const meshPool  = new Array(MAX_MESHES);   // index → JitterObject
const meshFree  = new Array(MAX_MESHES);   // index → boolean
const freeStack = [];                      // free mesh indices

// Bindings
const objectToMesh = Object.create(null);  // objectID → mesh index
const meshToObject = Object.create(null);  // mesh index → objectID

function loadbang()
{
    initMeshPool();
}

function initMeshPool()
{
    cleanup(); // in case of reload

    for (let i = 0; i < MAX_MESHES; i++)
    {
        const mesh = new JitterObject("jit.gl.mesh", GL_CONTEXT);

        // Static setup (never changes)
        mesh.draw_mode = "triangles";
        mesh.automatic = 0;
        mesh.enable = 0;

        meshPool[i] = mesh;
        meshFree[i] = true;
        freeStack.push(i);
    }

    post(`JitterObject mesh pool initialized (${MAX_MESHES})\n`);
}

function allocateMesh(objectID)
{
    if (objectID in objectToMesh)
        return objectToMesh[objectID];

    if (freeStack.length === 0)
    {
        error("No free meshes available\n");
        return -1;
    }

    const meshIndex = freeStack.pop();

    objectToMesh[objectID] = meshIndex;
    meshToObject[meshIndex] = objectID;
    meshFree[meshIndex] = false;

    const mesh = meshPool[meshIndex];
    mesh.enable = 1;

    return meshIndex;
}

function releaseMesh(objectID)
{
    if (!(objectID in objectToMesh))
        return;

    const meshIndex = objectToMesh[objectID];
    const mesh = meshPool[meshIndex];

    // Reset to known neutral state
    mesh.enable = 0;
    mesh.position = [0, 0, 0];
    mesh.scale    = [1, 1, 1];
    mesh.rotatexyz = [0, 0, 0];
    mesh.texture = "";

    delete objectToMesh[objectID];
    delete meshToObject[meshIndex];

    meshFree[meshIndex] = true;
    freeStack.push(meshIndex);
}

function updateObject(objectID, data)
{
    if (!(objectID in objectToMesh))
        return;

    const mesh = meshPool[objectToMesh[objectID]];

    if (data.pos)
        mesh.position = data.pos;

    if (data.scale)
        mesh.scale = data.scale;

    if (data.rotate)
        mesh.rotatexyz = data.rotate;

    if (data.texture)
        mesh.texture = data.texture;
}

function rebuildFromScene(sceneData)
{
    // sceneData = { id1:{...}, id2:{...}, ... }

    for (const objectID in sceneData)
    {
        allocateMesh(objectID);
        updateObject(objectID, sceneData[objectID]);
    }
}

function cleanup()
{
    for (let i = 0; i < meshPool.length; i++)
    {
        if (meshPool[i])
        {
            try {
                meshPool[i].free();
            } catch (e) {}

            meshPool[i] = null;
        }
    }

    freeStack.length = 0;

    for (const k in objectToMesh) delete objectToMesh[k];
    for (const k in meshToObject) delete meshToObject[k];
}

function notifydeleted()
{
    cleanup();
}

