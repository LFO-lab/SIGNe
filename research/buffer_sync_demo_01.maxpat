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
		"rect" : [ 859.0, -1643.0, 1951.0, 1265.0 ],
		"gridonopen" : 2,
		"gridsize" : [ 15.0, 15.0 ],
		"gridsnaponopen" : 2,
		"objectsnaponopen" : 0,
		"boxes" : [ 			{
				"box" : 				{
					"id" : "obj-41",
					"linecount" : 9,
					"maxclass" : "comment",
					"numinlets" : 1,
					"numoutlets" : 0,
					"patching_rect" : [ 300.0, 210.0, 152.0, 131.0 ],
					"text" : "In JS subframe updates mode, try alternating clicking on the Max window and the Jitter output window. Notice that each time you switch window focus, the buffer that's getting updated changes."
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-37",
					"maxclass" : "message",
					"numinlets" : 2,
					"numoutlets" : 1,
					"outlettype" : [ "" ],
					"patching_rect" : [ 1590.0, 375.0, 50.0, 22.0 ],
					"text" : "update"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-35",
					"maxclass" : "newobj",
					"numinlets" : 1,
					"numoutlets" : 4,
					"outlettype" : [ "", "", "", "" ],
					"patching_rect" : [ 1590.0, 420.0, 240.0, 22.0 ],
					"saved_object_attributes" : 					{
						"filename" : "buffer_sync_subframe.js",
						"parameter_enable" : 0
					}
,
					"text" : "js buffer_sync_subframe.js"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-34",
					"linecount" : 2,
					"maxclass" : "newobj",
					"numinlets" : 2,
					"numoutlets" : 1,
					"outlettype" : [ "bang" ],
					"patching_rect" : [ 1650.0, 360.0, 100.0, 36.0 ],
					"text" : "qmetro 3 @active 1"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-19",
					"maxclass" : "newobj",
					"numinlets" : 1,
					"numoutlets" : 4,
					"outlettype" : [ "", "", "", "" ],
					"patching_rect" : [ 495.0, 420.0, 345.0, 22.0 ],
					"saved_object_attributes" : 					{
						"filename" : "buffer_sync_demo.js",
						"parameter_enable" : 0
					}
,
					"text" : "js buffer_sync_demo.js"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-31",
					"maxclass" : "newobj",
					"numinlets" : 2,
					"numoutlets" : 1,
					"outlettype" : [ "int" ],
					"patching_rect" : [ 495.0, 255.0, 100.0, 22.0 ],
					"text" : "+ 1"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-28",
					"maxclass" : "live.tab",
					"num_lines_patching" : 4,
					"num_lines_presentation" : 0,
					"numinlets" : 1,
					"numoutlets" : 3,
					"outlettype" : [ "", "", "float" ],
					"parameter_enable" : 1,
					"patching_rect" : [ 495.0, 150.0, 135.0, 90.0 ],
					"saved_attribute_attributes" : 					{
						"valueof" : 						{
							"parameter_enum" : [ "JS round robin", "V8 round robin", "JS all at once", "JS subframe updates" ],
							"parameter_longname" : "live.tab",
							"parameter_mmax" : 3,
							"parameter_modmode" : 0,
							"parameter_shortname" : "live.tab",
							"parameter_type" : 2,
							"parameter_unitstyle" : 9
						}

					}
,
					"varname" : "live.tab"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-27",
					"maxclass" : "newobj",
					"numinlets" : 2,
					"numoutlets" : 4,
					"outlettype" : [ "", "", "", "" ],
					"patching_rect" : [ 495.0, 300.0, 165.0, 22.0 ],
					"text" : "gate 4 1"
				}

			}
, 			{
				"box" : 				{
					"filename" : "buffer_sync_demo_v8.js",
					"id" : "obj-20",
					"maxclass" : "newobj",
					"numinlets" : 1,
					"numoutlets" : 1,
					"outlettype" : [ "" ],
					"patching_rect" : [ 885.0, 420.0, 165.0, 22.0 ],
					"saved_object_attributes" : 					{
						"parameter_enable" : 0
					}
,
					"text" : "v8 buffer_sync_demo_v8.js",
					"textfile" : 					{
						"filename" : "buffer_sync_demo_v8.js",
						"flags" : 0,
						"embed" : 0,
						"autowatch" : 1
					}

				}

			}
, 			{
				"box" : 				{
					"id" : "obj-8",
					"maxclass" : "newobj",
					"numinlets" : 1,
					"numoutlets" : 3,
					"outlettype" : [ "jit_matrix", "jit_matrix", "" ],
					"patching_rect" : [ 105.0, 652.0, 195.0, 22.0 ],
					"text" : "jit.unpack 2 @jump 3 2 @offset 0 3"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-26",
					"maxclass" : "newobj",
					"numinlets" : 1,
					"numoutlets" : 2,
					"outlettype" : [ "jit_gl_texture", "" ],
					"patching_rect" : [ 1110.0, 210.0, 285.0, 22.0 ],
					"text" : "jit.gl.texture demo_world @name tex2 @rectangle 0"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-24",
					"maxclass" : "newobj",
					"numinlets" : 1,
					"numoutlets" : 2,
					"outlettype" : [ "jit_gl_texture", "" ],
					"patching_rect" : [ 1110.0, 135.0, 285.0, 22.0 ],
					"text" : "jit.gl.texture demo_world @name tex1 @rectangle 0"
				}

			}
, 			{
				"box" : 				{
					"fontface" : 0,
					"fontname" : "Arial",
					"fontsize" : 12.0,
					"id" : "obj-2",
					"maxclass" : "jit.fpsgui",
					"numinlets" : 1,
					"numoutlets" : 2,
					"outlettype" : [ "", "" ],
					"patching_rect" : [ 720.0, 300.0, 80.0, 36.0 ]
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-30",
					"maxclass" : "newobj",
					"numinlets" : 1,
					"numoutlets" : 1,
					"outlettype" : [ "bang" ],
					"patching_rect" : [ 105.0, 585.0, 58.0, 22.0 ],
					"text" : "loadbang"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-18",
					"linecount" : 2,
					"maxclass" : "newobj",
					"numinlets" : 1,
					"numoutlets" : 2,
					"outlettype" : [ "jit_gl_buffer", "" ],
					"patching_rect" : [ 1230.0, 570.0, 180.0, 36.0 ],
					"text" : "jit.gl.buffer demo_world @type vertex_attr3 @instanced 1"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-17",
					"linecount" : 2,
					"maxclass" : "newobj",
					"numinlets" : 1,
					"numoutlets" : 2,
					"outlettype" : [ "jit_gl_buffer", "" ],
					"patching_rect" : [ 990.0, 570.0, 180.0, 36.0 ],
					"text" : "jit.gl.buffer demo_world @type vertex_attr2 @instanced 1"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-16",
					"linecount" : 2,
					"maxclass" : "newobj",
					"numinlets" : 1,
					"numoutlets" : 2,
					"outlettype" : [ "jit_gl_buffer", "" ],
					"patching_rect" : [ 750.0, 570.0, 180.0, 36.0 ],
					"text" : "jit.gl.buffer demo_world @type vertex_attr1 @instanced 1"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-15",
					"linecount" : 2,
					"maxclass" : "newobj",
					"numinlets" : 1,
					"numoutlets" : 2,
					"outlettype" : [ "jit_gl_buffer", "" ],
					"patching_rect" : [ 495.0, 570.0, 180.0, 36.0 ],
					"text" : "jit.gl.buffer demo_world @type vertex_attr0 @instanced 1"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-14",
					"linecount" : 2,
					"maxclass" : "newobj",
					"numinlets" : 1,
					"numoutlets" : 2,
					"outlettype" : [ "jit_matrix", "" ],
					"patching_rect" : [ 1230.0, 510.0, 115.0, 36.0 ],
					"text" : "jit.matrix demo_scl 4 float32 25"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-13",
					"linecount" : 2,
					"maxclass" : "newobj",
					"numinlets" : 1,
					"numoutlets" : 2,
					"outlettype" : [ "jit_matrix", "" ],
					"patching_rect" : [ 990.0, 510.0, 122.0, 36.0 ],
					"text" : "jit.matrix demo_rot 4 float32 25"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-12",
					"linecount" : 2,
					"maxclass" : "newobj",
					"numinlets" : 1,
					"numoutlets" : 2,
					"outlettype" : [ "jit_matrix", "" ],
					"patching_rect" : [ 750.0, 510.0, 122.0, 36.0 ],
					"text" : "jit.matrix demo_pos 4 float32 25"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-11",
					"linecount" : 2,
					"maxclass" : "newobj",
					"numinlets" : 1,
					"numoutlets" : 2,
					"outlettype" : [ "jit_matrix", "" ],
					"patching_rect" : [ 495.0, 510.0, 122.0, 36.0 ],
					"text" : "jit.matrix demo_col 4 float32 25"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-10",
					"maxclass" : "newobj",
					"numinlets" : 1,
					"numoutlets" : 4,
					"outlettype" : [ "", "", "", "" ],
					"patching_rect" : [ 1170.0, 420.0, 345.0, 22.0 ],
					"saved_object_attributes" : 					{
						"filename" : "buffer_sync_demo_simultaneous.js",
						"parameter_enable" : 0
					}
,
					"text" : "js buffer_sync_demo_simultaneous.js"
				}

			}
, 			{
				"box" : 				{
					"filename" : "demo_instancing.jxs",
					"id" : "obj-9",
					"maxclass" : "newobj",
					"numinlets" : 1,
					"numoutlets" : 2,
					"outlettype" : [ "", "" ],
					"patching_rect" : [ 1110.0, 255.0, 404.0, 22.0 ],
					"text" : "jit.gl.shader demo_world @name demo_shader @file demo_instancing.jxs",
					"textfile" : 					{
						"filename" : "demo_instancing.jxs",
						"flags" : 0,
						"embed" : 0,
						"autowatch" : 1
					}

				}

			}
, 			{
				"box" : 				{
					"id" : "obj-7",
					"maxclass" : "newobj",
					"numinlets" : 9,
					"numoutlets" : 2,
					"outlettype" : [ "", "" ],
					"patching_rect" : [ 105.0, 705.0, 446.0, 22.0 ],
					"text" : "jit.gl.mesh demo_world @color 1 1 1 1 @shader demo_shader @texture tex1 tex2"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-6",
					"maxclass" : "newobj",
					"numinlets" : 1,
					"numoutlets" : 2,
					"outlettype" : [ "jit_matrix", "" ],
					"patching_rect" : [ 105.0, 615.0, 327.0, 22.0 ],
					"text" : "jit.gl.gridshape demo_world @shape plane @matrixoutput 2"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-5",
					"maxclass" : "newobj",
					"numinlets" : 1,
					"numoutlets" : 2,
					"outlettype" : [ "jit_gl_texture", "" ],
					"patching_rect" : [ 1110.0, 180.0, 283.0, 22.0 ],
					"text" : "jit.movie @moviefile redball.mov @output_texture 1"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-4",
					"maxclass" : "newobj",
					"numinlets" : 1,
					"numoutlets" : 2,
					"outlettype" : [ "jit_gl_texture", "" ],
					"patching_rect" : [ 1110.0, 105.0, 294.0, 22.0 ],
					"text" : "jit.movie @moviefile chickens.mp4 @output_texture 1"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-3",
					"maxclass" : "toggle",
					"numinlets" : 1,
					"numoutlets" : 1,
					"outlettype" : [ "int" ],
					"parameter_enable" : 0,
					"patching_rect" : [ 675.0, 195.0, 24.0, 24.0 ]
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-1",
					"linecount" : 2,
					"maxclass" : "newobj",
					"numinlets" : 1,
					"numoutlets" : 3,
					"outlettype" : [ "jit_matrix", "bang", "" ],
					"patching_rect" : [ 675.0, 240.0, 121.0, 36.0 ],
					"text" : "jit.world demo_world @floating 1"
				}

			}
 ],
		"lines" : [ 			{
				"patchline" : 				{
					"destination" : [ "obj-2", 0 ],
					"order" : 0,
					"source" : [ "obj-1", 1 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-27", 1 ],
					"order" : 1,
					"source" : [ "obj-1", 1 ]
				}

			}
, 			{
				"patchline" : 				{
					"color" : [ 0.0, 1.0, 0.909803921568627, 1.0 ],
					"destination" : [ "obj-11", 0 ],
					"midpoints" : [ 1179.5, 453.5, 504.5, 453.5 ],
					"source" : [ "obj-10", 0 ]
				}

			}
, 			{
				"patchline" : 				{
					"color" : [ 0.447058823529412, 0.647058823529412, 1.0, 1.0 ],
					"destination" : [ "obj-12", 0 ],
					"midpoints" : [ 1288.166666666666742, 468.5, 759.5, 468.5 ],
					"source" : [ "obj-10", 1 ]
				}

			}
, 			{
				"patchline" : 				{
					"color" : [ 0.0, 0.274509803921569, 1.0, 1.0 ],
					"destination" : [ "obj-13", 0 ],
					"midpoints" : [ 1396.833333333333258, 483.5, 999.5, 483.5 ],
					"source" : [ "obj-10", 2 ]
				}

			}
, 			{
				"patchline" : 				{
					"color" : [ 0.454901960784314, 0.0, 1.0, 1.0 ],
					"destination" : [ "obj-14", 0 ],
					"midpoints" : [ 1505.5, 498.5, 1239.5, 498.5 ],
					"source" : [ "obj-10", 3 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-15", 0 ],
					"source" : [ "obj-11", 0 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-16", 0 ],
					"source" : [ "obj-12", 0 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-17", 0 ],
					"source" : [ "obj-13", 0 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-18", 0 ],
					"source" : [ "obj-14", 0 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-7", 8 ],
					"midpoints" : [ 504.5, 647.5, 541.5, 647.5 ],
					"source" : [ "obj-15", 0 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-7", 8 ],
					"midpoints" : [ 759.5, 647.5, 541.5, 647.5 ],
					"source" : [ "obj-16", 0 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-7", 8 ],
					"midpoints" : [ 999.5, 647.5, 541.5, 647.5 ],
					"source" : [ "obj-17", 0 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-7", 8 ],
					"midpoints" : [ 1239.5, 647.5, 541.5, 647.5 ],
					"source" : [ "obj-18", 0 ]
				}

			}
, 			{
				"patchline" : 				{
					"color" : [ 0.0, 1.0, 0.909803921568627, 1.0 ],
					"destination" : [ "obj-11", 0 ],
					"midpoints" : [ 504.5, 453.5, 504.5, 453.5 ],
					"source" : [ "obj-19", 0 ]
				}

			}
, 			{
				"patchline" : 				{
					"color" : [ 0.447058823529412, 0.647058823529412, 1.0, 1.0 ],
					"destination" : [ "obj-12", 0 ],
					"midpoints" : [ 613.166666666666629, 468.5, 759.5, 468.5 ],
					"source" : [ "obj-19", 1 ]
				}

			}
, 			{
				"patchline" : 				{
					"color" : [ 0.0, 0.274509803921569, 1.0, 1.0 ],
					"destination" : [ "obj-13", 0 ],
					"midpoints" : [ 721.833333333333371, 483.5, 999.5, 483.5 ],
					"source" : [ "obj-19", 2 ]
				}

			}
, 			{
				"patchline" : 				{
					"color" : [ 0.454901960784314, 0.0, 1.0, 1.0 ],
					"destination" : [ "obj-14", 0 ],
					"midpoints" : [ 830.5, 498.5, 1239.5, 498.5 ],
					"source" : [ "obj-19", 3 ]
				}

			}
, 			{
				"patchline" : 				{
					"color" : [ 0.0, 1.0, 0.909803921568627, 1.0 ],
					"destination" : [ "obj-11", 0 ],
					"midpoints" : [ 894.5, 453.5, 504.5, 453.5 ],
					"source" : [ "obj-20", 0 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-10", 0 ],
					"midpoints" : [ 601.833333333333371, 393.5, 1179.5, 393.5 ],
					"source" : [ "obj-27", 2 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-19", 0 ],
					"source" : [ "obj-27", 0 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-20", 0 ],
					"midpoints" : [ 553.166666666666629, 408.5, 894.5, 408.5 ],
					"source" : [ "obj-27", 1 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-37", 0 ],
					"midpoints" : [ 650.5, 348.5, 1599.5, 348.5 ],
					"source" : [ "obj-27", 3 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-31", 0 ],
					"source" : [ "obj-28", 0 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-1", 0 ],
					"source" : [ "obj-3", 0 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-6", 0 ],
					"source" : [ "obj-30", 0 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-27", 0 ],
					"source" : [ "obj-31", 0 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-35", 0 ],
					"midpoints" : [ 1659.5, 408.0, 1599.5, 408.0 ],
					"source" : [ "obj-34", 0 ]
				}

			}
, 			{
				"patchline" : 				{
					"color" : [ 0.0, 1.0, 0.909803921568627, 1.0 ],
					"destination" : [ "obj-11", 0 ],
					"midpoints" : [ 1599.5, 453.5, 504.5, 453.5 ],
					"source" : [ "obj-35", 0 ]
				}

			}
, 			{
				"patchline" : 				{
					"color" : [ 0.447058823529412, 0.647058823529412, 1.0, 1.0 ],
					"destination" : [ "obj-12", 0 ],
					"midpoints" : [ 1673.166666666666742, 468.5, 759.5, 468.5 ],
					"source" : [ "obj-35", 1 ]
				}

			}
, 			{
				"patchline" : 				{
					"color" : [ 0.0, 0.274509803921569, 1.0, 1.0 ],
					"destination" : [ "obj-13", 0 ],
					"midpoints" : [ 1746.833333333333258, 483.5, 999.5, 483.5 ],
					"source" : [ "obj-35", 2 ]
				}

			}
, 			{
				"patchline" : 				{
					"color" : [ 0.454901960784314, 0.0, 1.0, 1.0 ],
					"destination" : [ "obj-14", 0 ],
					"midpoints" : [ 1820.5, 498.5, 1239.5, 498.5 ],
					"source" : [ "obj-35", 3 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-35", 0 ],
					"source" : [ "obj-37", 0 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-24", 0 ],
					"source" : [ "obj-4", 0 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-26", 0 ],
					"source" : [ "obj-5", 0 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-8", 0 ],
					"source" : [ "obj-6", 0 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-7", 1 ],
					"midpoints" : [ 202.5, 689.5, 167.875, 689.5 ],
					"source" : [ "obj-8", 1 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-7", 0 ],
					"midpoints" : [ 114.5, 689.5, 114.5, 689.5 ],
					"source" : [ "obj-8", 0 ]
				}

			}
 ],
		"parameters" : 		{
			"obj-28" : [ "live.tab", "live.tab", 0 ],
			"inherited_shortname" : 1
		}
,
		"dependency_cache" : [ 			{
				"name" : "buffer_sync_demo.js",
				"bootpath" : "~/Documents/GitHub/SIGNe/js",
				"patcherrelativepath" : "../js",
				"type" : "TEXT",
				"implicit" : 1
			}
, 			{
				"name" : "buffer_sync_demo_simultaneous.js",
				"bootpath" : "~/Documents/GitHub/SIGNe/js",
				"patcherrelativepath" : "../js",
				"type" : "TEXT",
				"implicit" : 1
			}
, 			{
				"name" : "buffer_sync_demo_v8.js",
				"bootpath" : "~/Documents/GitHub/SIGNe/js",
				"patcherrelativepath" : "../js",
				"type" : "TEXT",
				"implicit" : 1
			}
, 			{
				"name" : "buffer_sync_subframe.js",
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
