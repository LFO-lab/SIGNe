{
	"patcher" : 	{
		"fileversion" : 1,
		"appversion" : 		{
			"major" : 9,
			"minor" : 0,
			"revision" : 9,
			"architecture" : "x64",
			"modernui" : 1
		}
,
		"classnamespace" : "box",
		"rect" : [ 35.0, 85.0, 270.0, 336.0 ],
		"gridsize" : [ 15.0, 15.0 ],
		"boxes" : [ 			{
				"box" : 				{
					"id" : "obj-1048",
					"maxclass" : "message",
					"numinlets" : 2,
					"numoutlets" : 1,
					"outlettype" : [ "" ],
					"patching_rect" : [ 721.0, 399.0, 121.0, 22.0 ],
					"text" : "addObject jit.gl.mesh"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-1046",
					"maxclass" : "newobj",
					"numinlets" : 2,
					"numoutlets" : 5,
					"outlettype" : [ "dictionary", "", "", "", "" ],
					"patching_rect" : [ 929.0, 485.0, 63.0, 22.0 ],
					"saved_object_attributes" : 					{
						"embed" : 0,
						"legacy" : 0,
						"parameter_enable" : 0,
						"parameter_mappable" : 0
					}
,
					"text" : "dict scene"
				}

			}
, 			{
				"box" : 				{
					"filename" : "none",
					"id" : "obj-1042",
					"maxclass" : "newobj",
					"numinlets" : 1,
					"numoutlets" : 1,
					"outlettype" : [ "" ],
					"patching_rect" : [ 713.0, 433.0, 21.0, 22.0 ],
					"saved_object_attributes" : 					{
						"parameter_enable" : 0
					}
,
					"text" : "v8",
					"textfile" : 					{
						"text" : "const scene = new Dict(\"scene\");\r\n\nfunction loadbang()\n{\n    initScene();\n}\n\r\nfunction initScene()\r\n{\r\n    // Create meta dict if missing\r\n    if (!scene.contains(\"meta\"))\r\n    {\r\n        const meta = new Dict();\r\n        meta.set(\"version\", 1);\r\n        meta.set(\"next_id\", 1);\r\n        scene.replace(\"meta\", meta);\r\n    }\r\n\r\n    // Create objects dict if missing\r\n    if (!scene.contains(\"objects\"))\r\n    {\r\n        const objects = new Dict();\r\n        scene.replace(\"objects\", objects);\r\n    }\r\n}\r\n\r\nfunction addObject(type)\n{\n    const meta = scene.get(\"meta\");\n    const nextID = meta.get(\"next_id\");\n\n    const objectID = `obj_${String(nextID).padStart(4, \"0\")}`;\n    meta.replace(\"next_id\", nextID + 1);\n\n    const obj = new Dict();\n    obj.set(\"type\", type);\n    obj.set(\"pos\", [0, 0, 0]);\n    obj.set(\"scale\", [1, 1, 1]);\n    obj.set(\"rotate\", [0, 0, 0]);\n    obj.set(\"texture\", \"\");\n    obj.set(\"params\", new Dict());\n\n    scene.replace(`objects::${objectID}`, obj);\n\n    outlet(0, \"object_added\", objectID);\n}\n\r\nfunction setObjectPos(objectID, x, y, z)\r\n{\r\n    scene.replace(`objects::${objectID}::pos`, [x, y, z]);\r\n}\r\n\r\nfunction removeObject(objectID)\r\n{\r\n    scene.remove(`objects::${objectID}`);\r\n    outlet(0, \"object_removed\", objectID);\r\n}\r\n\r\nfunction rebuildFromDict()\r\n{\r\n    const objects = scene.get(\"objects\");\r\n    const keys = objects.getkeys();\r\n\r\n    for (let i = 0; i < keys.length; i++)\r\n    {\r\n        const id = keys[i];\r\n        allocateMesh(id);\r\n        updateObject(id, objects.get(id));\r\n    }\r\n}\r\n",
						"filename" : "none",
						"flags" : 0,
						"embed" : 1,
						"autowatch" : 1
					}

				}

			}
, 			{
				"box" : 				{
					"id" : "obj-1041",
					"maxclass" : "newobj",
					"numinlets" : 9,
					"numoutlets" : 2,
					"outlettype" : [ "", "" ],
					"patching_rect" : [ 397.0, 465.0, 103.0, 22.0 ],
					"text" : "jit.gl.mesh"
				}

			}
, 			{
				"box" : 				{
					"fontface" : 0,
					"fontname" : "Arial",
					"fontsize" : 12.0,
					"id" : "obj-1040",
					"maxclass" : "jit.fpsgui",
					"numinlets" : 1,
					"numoutlets" : 2,
					"outlettype" : [ "", "" ],
					"patching_rect" : [ 528.0, 391.0, 80.0, 36.0 ]
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-1039",
					"maxclass" : "toggle",
					"numinlets" : 1,
					"numoutlets" : 1,
					"outlettype" : [ "int" ],
					"parameter_enable" : 0,
					"patching_rect" : [ 503.0, 275.0, 24.0, 24.0 ]
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-1037",
					"maxclass" : "newobj",
					"numinlets" : 1,
					"numoutlets" : 3,
					"outlettype" : [ "jit_matrix", "bang", "" ],
					"patching_rect" : [ 497.0, 323.0, 157.0, 22.0 ],
					"text" : "jit.world scene_ctx @sync 0"
				}

			}
, 			{
				"box" : 				{
					"filename" : "none",
					"id" : "obj-1036",
					"maxclass" : "newobj",
					"numinlets" : 1,
					"numoutlets" : 1,
					"outlettype" : [ "" ],
					"patching_rect" : [ 197.0, 351.0, 21.0, 22.0 ],
					"saved_object_attributes" : 					{
						"parameter_enable" : 0
					}
,
					"text" : "v8",
					"textfile" : 					{
						"text" : "\"use strict\";\r\nautowatch = 1;\r\n\r\nconst MAX_MESHES = 1024;\r\nconst GL_CONTEXT = \"scene_ctx\";\r\n\r\n// Mesh pool\r\nconst meshPool  = new Array(MAX_MESHES);   // index → JitterObject\r\nconst meshFree  = new Array(MAX_MESHES);   // index → boolean\r\nconst freeStack = [];                      // free mesh indices\r\n\r\n// Bindings\r\nconst objectToMesh = Object.create(null);  // objectID → mesh index\r\nconst meshToObject = Object.create(null);  // mesh index → objectID\r\n\r\nfunction loadbang()\r\n{\r\n    initMeshPool();\r\n}\r\n\r\nfunction initMeshPool()\r\n{\r\n    cleanup(); // in case of reload\r\n\r\n    for (let i = 0; i < MAX_MESHES; i++)\r\n    {\r\n        const mesh = new JitterObject(\"jit.gl.mesh\", GL_CONTEXT);\r\n\r\n        // Static setup (never changes)\r\n        mesh.draw_mode = \"triangles\";\r\n        mesh.automatic = 0;\r\n        mesh.enable = 0;\r\n\r\n        meshPool[i] = mesh;\r\n        meshFree[i] = true;\r\n        freeStack.push(i);\r\n    }\r\n\r\n    post(`JitterObject mesh pool initialized (${MAX_MESHES})\\n`);\r\n}\r\n\r\nfunction allocateMesh(objectID)\r\n{\r\n    if (objectID in objectToMesh)\r\n        return objectToMesh[objectID];\r\n\r\n    if (freeStack.length === 0)\r\n    {\r\n        error(\"No free meshes available\\n\");\r\n        return -1;\r\n    }\r\n\r\n    const meshIndex = freeStack.pop();\r\n\r\n    objectToMesh[objectID] = meshIndex;\r\n    meshToObject[meshIndex] = objectID;\r\n    meshFree[meshIndex] = false;\r\n\r\n    const mesh = meshPool[meshIndex];\r\n    mesh.enable = 1;\r\n\r\n    return meshIndex;\r\n}\r\n\r\nfunction releaseMesh(objectID)\r\n{\r\n    if (!(objectID in objectToMesh))\r\n        return;\r\n\r\n    const meshIndex = objectToMesh[objectID];\r\n    const mesh = meshPool[meshIndex];\r\n\r\n    // Reset to known neutral state\r\n    mesh.enable = 0;\r\n    mesh.position = [0, 0, 0];\r\n    mesh.scale    = [1, 1, 1];\r\n    mesh.rotatexyz = [0, 0, 0];\r\n    mesh.texture = \"\";\r\n\r\n    delete objectToMesh[objectID];\r\n    delete meshToObject[meshIndex];\r\n\r\n    meshFree[meshIndex] = true;\r\n    freeStack.push(meshIndex);\r\n}\r\n\r\nfunction updateObject(objectID, data)\r\n{\r\n    if (!(objectID in objectToMesh))\r\n        return;\r\n\r\n    const mesh = meshPool[objectToMesh[objectID]];\r\n\r\n    if (data.pos)\r\n        mesh.position = data.pos;\r\n\r\n    if (data.scale)\r\n        mesh.scale = data.scale;\r\n\r\n    if (data.rotate)\r\n        mesh.rotatexyz = data.rotate;\r\n\r\n    if (data.texture)\r\n        mesh.texture = data.texture;\r\n}\r\n\r\nfunction rebuildFromScene(sceneData)\r\n{\r\n    // sceneData = { id1:{...}, id2:{...}, ... }\r\n\r\n    for (const objectID in sceneData)\r\n    {\r\n        allocateMesh(objectID);\r\n        updateObject(objectID, sceneData[objectID]);\r\n    }\r\n}\r\n\r\nfunction cleanup()\r\n{\r\n    for (let i = 0; i < meshPool.length; i++)\r\n    {\r\n        if (meshPool[i])\r\n        {\r\n            try {\r\n                meshPool[i].free();\r\n            } catch (e) {}\r\n\r\n            meshPool[i] = null;\r\n        }\r\n    }\r\n\r\n    freeStack.length = 0;\r\n\r\n    for (const k in objectToMesh) delete objectToMesh[k];\r\n    for (const k in meshToObject) delete meshToObject[k];\r\n}\r\n\r\nfunction notifydeleted()\r\n{\r\n    cleanup();\r\n}\r\n\r\n",
						"filename" : "none",
						"flags" : 0,
						"embed" : 1,
						"autowatch" : 1
					}

				}

			}
, 			{
				"box" : 				{
					"id" : "obj-11",
					"maxclass" : "message",
					"numinlets" : 2,
					"numoutlets" : 1,
					"outlettype" : [ "" ],
					"patching_rect" : [ 197.0, 277.0, 77.0, 22.0 ],
					"text" : "initMeshPool"
				}

			}
 ],
		"lines" : [ 			{
				"patchline" : 				{
					"destination" : [ "obj-1040", 0 ],
					"source" : [ "obj-1037", 1 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-1037", 0 ],
					"source" : [ "obj-1039", 0 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-1042", 0 ],
					"source" : [ "obj-1048", 0 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-1036", 0 ],
					"source" : [ "obj-11", 0 ]
				}

			}
 ],
		"dependency_cache" : [  ],
		"autosave" : 0,
		"oscreceiveudpport" : 0
	}

}
