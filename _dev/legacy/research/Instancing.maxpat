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
		"rect" : [ 806.0, -1651.0, 2290.0, 1281.0 ],
		"gridonopen" : 2,
		"gridsize" : [ 15.0, 15.0 ],
		"gridsnaponopen" : 2,
		"objectsnaponopen" : 0,
		"boxes" : [ 			{
				"box" : 				{
					"id" : "obj-10",
					"maxclass" : "newobj",
					"numinlets" : 1,
					"numoutlets" : 1,
					"outlettype" : [ "bang" ],
					"patching_rect" : [ 90.0, 495.000003933906555, 58.0, 22.0 ],
					"text" : "loadbang"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-7",
					"maxclass" : "newobj",
					"numinlets" : 1,
					"numoutlets" : 2,
					"outlettype" : [ "jit_gl_buffer", "" ],
					"patching_rect" : [ 885.0, 420.0, 285.0, 22.0 ],
					"text" : "jit.gl.buffer SIGNe @type vertex_attr3 @instanced 1"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-6",
					"maxclass" : "newobj",
					"numinlets" : 1,
					"numoutlets" : 2,
					"outlettype" : [ "jit_gl_buffer", "" ],
					"patching_rect" : [ 1335.0, 330.0, 285.0, 22.0 ],
					"text" : "jit.gl.buffer SIGNe @type vertex_attr2 @instanced 1"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-5",
					"maxclass" : "newobj",
					"numinlets" : 1,
					"numoutlets" : 2,
					"outlettype" : [ "jit_gl_buffer", "" ],
					"patching_rect" : [ 570.0, 480.0, 285.0, 22.0 ],
					"text" : "jit.gl.buffer SIGNe @type vertex_attr1 @instanced 1"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-4",
					"maxclass" : "newobj",
					"numinlets" : 1,
					"numoutlets" : 2,
					"outlettype" : [ "jit_gl_buffer", "" ],
					"patching_rect" : [ 15.0, 465.0, 285.0, 22.0 ],
					"text" : "jit.gl.buffer SIGNe @type vertex_attr0 @instanced 1"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-3",
					"maxclass" : "newobj",
					"numinlets" : 9,
					"numoutlets" : 2,
					"outlettype" : [ "", "" ],
					"patching_rect" : [ 90.0, 615.0, 547.0, 22.0 ],
					"text" : "jit.gl.mesh SIGNe @shader SymbolCompositor @texture SymbolAtlas PatternAtlas @blend_enable 1"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-2",
					"maxclass" : "newobj",
					"numinlets" : 1,
					"numoutlets" : 2,
					"outlettype" : [ "jit_matrix", "" ],
					"patching_rect" : [ 90.0, 525.3703733086586, 353.0, 22.0 ],
					"text" : "jit.gl.gridshape SIGNe @shape plane @dim 2 2 @matrixoutput 1"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-1",
					"maxclass" : "newobj",
					"numinlets" : 1,
					"numoutlets" : 5,
					"outlettype" : [ "bang", "bang", "bang", "bang", "bang" ],
					"patching_rect" : [ 14.814814329147339, 225.0, 1305.185142397880554, 22.0 ],
					"text" : "t b b b b b"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-53",
					"maxclass" : "newobj",
					"numinlets" : 1,
					"numoutlets" : 2,
					"outlettype" : [ "jit_matrix", "" ],
					"patching_rect" : [ 315.0, 375.0, 136.0, 22.0 ],
					"text" : "jit.map @map 0. 1. 0. 0."
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-48",
					"maxclass" : "newobj",
					"numinlets" : 4,
					"numoutlets" : 2,
					"outlettype" : [ "jit_matrix", "" ],
					"patching_rect" : [ 14.814814329147339, 420.131578087806702, 465.185185670852661, 22.0 ],
					"text" : "jit.pack 4 @type float32"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-50",
					"maxclass" : "newobj",
					"numinlets" : 1,
					"numoutlets" : 2,
					"outlettype" : [ "jit_matrix", "" ],
					"patching_rect" : [ 164.999998569488525, 374.736841678619385, 140.0, 22.0 ],
					"text" : "jit.map @map 0. 1. -5. 5."
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-51",
					"maxclass" : "newobj",
					"numinlets" : 1,
					"numoutlets" : 4,
					"outlettype" : [ "jit_matrix", "jit_matrix", "jit_matrix", "" ],
					"patching_rect" : [ 14.814814329147339, 330.0, 478.518518567085266, 22.0 ],
					"text" : "jit.unpack 3 @type float32"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-52",
					"maxclass" : "newobj",
					"numinlets" : 1,
					"numoutlets" : 2,
					"outlettype" : [ "jit_matrix", "" ],
					"patching_rect" : [ 15.0, 374.736841678619385, 140.0, 22.0 ],
					"text" : "jit.map @map 0. 1. -5. 5."
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-47",
					"maxclass" : "button",
					"numinlets" : 1,
					"numoutlets" : 1,
					"outlettype" : [ "bang" ],
					"parameter_enable" : 0,
					"patching_rect" : [ 15.0, 195.0, 24.0, 24.0 ]
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-45",
					"maxclass" : "newobj",
					"numinlets" : 3,
					"numoutlets" : 2,
					"outlettype" : [ "jit_matrix", "" ],
					"patching_rect" : [ 885.185156166553497, 390.185183703899384, 359.814843833446503, 22.0 ],
					"text" : "jit.pack 3 @type float32"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-44",
					"maxclass" : "newobj",
					"numinlets" : 1,
					"numoutlets" : 2,
					"outlettype" : [ "jit_matrix", "" ],
					"patching_rect" : [ 1185.0, 345.0, 136.0, 22.0 ],
					"text" : "jit.map @map 0. 1. 1. 5."
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-43",
					"maxclass" : "newobj",
					"numinlets" : 1,
					"numoutlets" : 2,
					"outlettype" : [ "jit_matrix", "" ],
					"patching_rect" : [ 1035.370375275611877, 345.0, 136.0, 22.0 ],
					"text" : "jit.map @map 0. 1. 0. 3."
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-42",
					"maxclass" : "newobj",
					"numinlets" : 1,
					"numoutlets" : 4,
					"outlettype" : [ "jit_matrix", "jit_matrix", "jit_matrix", "" ],
					"patching_rect" : [ 885.185156166553497, 299.814816296100616, 329.814843833446503, 22.0 ],
					"text" : "jit.unpack 3 @tyoe float32"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-41",
					"maxclass" : "newobj",
					"numinlets" : 1,
					"numoutlets" : 2,
					"outlettype" : [ "jit_matrix", "" ],
					"patching_rect" : [ 885.000009834766388, 345.0, 143.0, 22.0 ],
					"text" : "jit.map @map 0. 1. 0. 51."
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-40",
					"maxclass" : "newobj",
					"numinlets" : 1,
					"numoutlets" : 2,
					"outlettype" : [ "jit_matrix", "" ],
					"patching_rect" : [ 540.0, 300.0, 149.0, 22.0 ],
					"text" : "jit.map @map 0. 1. 0.2 0.5"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-38",
					"linecount" : 2,
					"maxclass" : "newobj",
					"numinlets" : 1,
					"numoutlets" : 2,
					"outlettype" : [ "jit_matrix", "" ],
					"patching_rect" : [ 1335.0, 270.0, 102.0, 36.0 ],
					"text" : "jit.noise 4 float32 100"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-37",
					"maxclass" : "newobj",
					"numinlets" : 1,
					"numoutlets" : 2,
					"outlettype" : [ "jit_matrix", "" ],
					"patching_rect" : [ 885.000009834766388, 270.185187637805939, 122.0, 22.0 ],
					"text" : "jit.noise 3 float32 100"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-36",
					"maxclass" : "newobj",
					"numinlets" : 1,
					"numoutlets" : 2,
					"outlettype" : [ "jit_matrix", "" ],
					"patching_rect" : [ 705.0, 270.0, 122.0, 22.0 ],
					"text" : "jit.noise 4 float32 100"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-35",
					"maxclass" : "newobj",
					"numinlets" : 1,
					"numoutlets" : 2,
					"outlettype" : [ "jit_matrix", "" ],
					"patching_rect" : [ 540.0, 270.0, 122.0, 22.0 ],
					"text" : "jit.noise 1 float32 100"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-34",
					"maxclass" : "newobj",
					"numinlets" : 1,
					"numoutlets" : 2,
					"outlettype" : [ "jit_matrix", "" ],
					"patching_rect" : [ 15.0, 270.0, 122.0, 22.0 ],
					"text" : "jit.noise 3 float32 100"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-31",
					"maxclass" : "toggle",
					"numinlets" : 1,
					"numoutlets" : 1,
					"outlettype" : [ "int" ],
					"parameter_enable" : 0,
					"patching_rect" : [ 705.0, 60.0, 24.0, 24.0 ]
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-29",
					"maxclass" : "newobj",
					"numinlets" : 1,
					"numoutlets" : 3,
					"outlettype" : [ "jit_matrix", "bang", "" ],
					"patching_rect" : [ 705.0, 90.0, 153.0, 22.0 ],
					"text" : "jit.world SIGNe @floating 1"
				}

			}
, 			{
				"box" : 				{
					"filename" : "none",
					"id" : "obj-28",
					"maxclass" : "newobj",
					"numinlets" : 1,
					"numoutlets" : 2,
					"outlettype" : [ "", "" ],
					"patching_rect" : [ 330.0, 195.0, 460.0, 22.0 ],
					"text" : "jit.gl.shader SIGNe @name SymbolCompositor @file signe_instanced_composite.jxs",
					"textfile" : 					{
						"text" : "<jittershader name=\"mesh_instancing\">\n    <param name=\"position\" type=\"vec3\" state=\"POSITION\" />\n    <param name=\"texcoord\" type=\"vec2\" state=\"TEXCOORD1\" />\n    <param name=\"modelViewProjectionMatrix\" type=\"mat4\" state=\"MODELVIEW_PROJECTION_MATRIX\" />\n\n    <param name=\"inst_transform\" type=\"vec4\" state=\"VERTEX_ATTR0\" />\n    <param name=\"inst_color\"     type=\"vec4\" state=\"VERTEX_ATTR1\" />\n    <param name=\"pattern_color\"  type=\"vec4\" state=\"VERTEX_ATTR2\" />\n    <param name=\"custom_data\"    type=\"vec3\" state=\"VERTEX_ATTR3\" />\n\n    <param name=\"symbolTex\" type=\"int\" default=\"0\" />\n    <param name=\"patternTex\" type=\"int\" default=\"1\" />\n\n    <language name=\"glsl\" version=\"1.5\">\n        <bind param=\"position\" program=\"vp\" />\n        <bind param=\"texcoord\" program=\"vp\" />\n        <bind param=\"modelViewProjectionMatrix\" program=\"vp\" />\n        \n        <bind param=\"inst_transform\" program=\"vp\" />\n        <bind param=\"inst_color\"     program=\"vp\" />\n        <bind param=\"pattern_color\"  program=\"vp\" />\n        <bind param=\"custom_data\"    program=\"vp\" />\n        \n        <bind param=\"symbolTex\"  program=\"fp\" />\n        <bind param=\"patternTex\" program=\"fp\" />\n\n        <program name=\"vp\" type=\"vertex\">\n        <![CDATA[\n        #version 330 core\n        \n        in vec3 position; \n        in vec2 texcoord;\n        \n        in vec4 inst_transform; // x, y, z = Position. w = Scale!\n        in vec4 inst_color;\n        in vec4 pattern_color;\n        in vec3 custom_data;    // x = SymZ, y = PatZ, z = Tile\n        \n        uniform mat4 modelViewProjectionMatrix;\n        \n        out vec2 texUV;\n        out vec4 symColor;\n        out vec4 patColor;\n        out float symZ;\n        out float patZ;\n        out float tile;\n        \n        void main() {\n            // Unpack our transform buffer\n            vec3 inst_pos = inst_transform.xyz;\n            float inst_scale = inst_transform.w;\n\n            // Apply scale, then offset position\n            vec3 final_pos = (position * inst_scale) + inst_pos;\n            gl_Position = modelViewProjectionMatrix * vec4(final_pos, 1.0);\n            \n            texUV = texcoord;\n            symColor = inst_color;\n            patColor = pattern_color;\n            symZ = custom_data.x;\n            patZ = custom_data.y;\n            tile = custom_data.z;\n        }\n        ]]>\n        </program>\n\n        <program name=\"fp\" type=\"fragment\">\n        <![CDATA[\n        #version 330 core\n        \n        uniform sampler3D symbolTex;\n        uniform sampler3D patternTex;\n        \n        in vec2 texUV;\n        in vec4 symColor;\n        in vec4 patColor;\n        in float symZ;\n        in float patZ;\n        in float tile;\n        \n        out vec4 fragColor;\n        \n        void main() {\n            // Bypass the textures temporarily to prove the geometry works!\n            fragColor = symColor;\n        }\n        ]]>\n        </program>\n    </language>\n</jittershader>",
						"filename" : "none",
						"flags" : 0,
						"embed" : 1,
						"autowatch" : 1
					}

				}

			}
, 			{
				"box" : 				{
					"id" : "obj-23",
					"maxclass" : "message",
					"numinlets" : 2,
					"numoutlets" : 1,
					"outlettype" : [ "" ],
					"patching_rect" : [ 210.0, 75.0, 305.0, 22.0 ],
					"text" : "build_atlases C:/Users/evan/Documents/GitHub/SIGNe/"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-21",
					"maxclass" : "newobj",
					"numinlets" : 1,
					"numoutlets" : 1,
					"outlettype" : [ "" ],
					"patching_rect" : [ 210.0, 105.0, 100.0, 22.0 ],
					"saved_object_attributes" : 					{
						"filename" : "atlas_builder.js",
						"parameter_enable" : 0
					}
,
					"text" : "js atlas_builder.js"
				}

			}
 ],
		"lines" : [ 			{
				"patchline" : 				{
					"destination" : [ "obj-34", 0 ],
					"source" : [ "obj-1", 0 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-35", 0 ],
					"source" : [ "obj-1", 1 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-36", 0 ],
					"source" : [ "obj-1", 2 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-37", 0 ],
					"source" : [ "obj-1", 3 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-38", 0 ],
					"source" : [ "obj-1", 4 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-2", 0 ],
					"source" : [ "obj-10", 0 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-3", 0 ],
					"source" : [ "obj-2", 0 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-21", 0 ],
					"source" : [ "obj-23", 0 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-29", 0 ],
					"source" : [ "obj-31", 0 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-51", 0 ],
					"source" : [ "obj-34", 0 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-40", 0 ],
					"source" : [ "obj-35", 0 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-5", 0 ],
					"source" : [ "obj-36", 0 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-42", 0 ],
					"source" : [ "obj-37", 0 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-6", 0 ],
					"source" : [ "obj-38", 0 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-3", 0 ],
					"midpoints" : [ 24.5, 599.888887286186218, 99.5, 599.888887286186218 ],
					"source" : [ "obj-4", 0 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-48", 3 ],
					"source" : [ "obj-40", 0 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-45", 0 ],
					"midpoints" : [ 894.500009834766388, 378.5, 894.685156166553497, 378.5 ],
					"source" : [ "obj-41", 0 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-41", 0 ],
					"midpoints" : [ 894.685156166553497, 333.5, 894.500009834766388, 333.5 ],
					"source" : [ "obj-42", 0 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-43", 0 ],
					"midpoints" : [ 998.290104111035703, 333.5, 1044.870375275611877, 333.5 ],
					"source" : [ "obj-42", 1 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-44", 0 ],
					"midpoints" : [ 1101.895052055517908, 333.5, 1194.5, 333.5 ],
					"source" : [ "obj-42", 2 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-45", 1 ],
					"midpoints" : [ 1044.870375275611877, 378.5, 1065.092578083276749, 378.5 ],
					"source" : [ "obj-43", 0 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-45", 2 ],
					"midpoints" : [ 1194.5, 378.5, 1235.5, 378.5 ],
					"source" : [ "obj-44", 0 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-7", 0 ],
					"source" : [ "obj-45", 0 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-1", 0 ],
					"source" : [ "obj-47", 0 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-4", 0 ],
					"source" : [ "obj-48", 0 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-3", 0 ],
					"midpoints" : [ 579.5, 596.92592442035675, 99.5, 596.92592442035675 ],
					"source" : [ "obj-5", 0 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-48", 1 ],
					"midpoints" : [ 174.499998569488525, 408.236841678619385, 173.043209552764893, 408.236841678619385 ],
					"source" : [ "obj-50", 0 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-50", 0 ],
					"midpoints" : [ 177.487653851509094, 363.236841678619385, 174.499998569488525, 363.236841678619385 ],
					"source" : [ "obj-51", 1 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-52", 0 ],
					"midpoints" : [ 24.314814329147339, 363.236841678619385, 24.5, 363.236841678619385 ],
					"source" : [ "obj-51", 0 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-53", 0 ],
					"source" : [ "obj-51", 2 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-48", 0 ],
					"midpoints" : [ 24.5, 408.236841678619385, 24.314814329147339, 408.236841678619385 ],
					"source" : [ "obj-52", 0 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-48", 2 ],
					"source" : [ "obj-53", 0 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-3", 0 ],
					"midpoints" : [ 1344.5, 593.129626035690308, 99.5, 593.129626035690308 ],
					"source" : [ "obj-6", 0 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-3", 0 ],
					"midpoints" : [ 894.5, 595.166664481163025, 99.5, 595.166664481163025 ],
					"source" : [ "obj-7", 0 ]
				}

			}
 ],
		"dependency_cache" : [ 			{
				"name" : "atlas_builder.js",
				"bootpath" : "~/Documents/GitHub/SIGNe/js",
				"patcherrelativepath" : "../js",
				"type" : "TEXT",
				"implicit" : 1
			}
 ],
		"autosave" : 0,
		"oscreceiveudpport" : 0
	}

}
