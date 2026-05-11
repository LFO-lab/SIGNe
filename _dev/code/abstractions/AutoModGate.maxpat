{
    "patcher": {
        "fileversion": 1,
        "appversion": {
            "major": 9,
            "minor": 1,
            "revision": 4,
            "architecture": "x64",
            "modernui": 1
        },
        "classnamespace": "box",
        "rect": [ 1555.0, -1065.0, 890.0, 734.0 ],
        "gridonopen": 2,
        "gridsnaponopen": 2,
        "objectsnaponopen": 0,
        "boxes": [
            {
                "box": {
                    "id": "obj-2",
                    "maxclass": "newobj",
                    "numinlets": 2,
                    "numoutlets": 2,
                    "outlettype": [ "", "" ],
                    "patching_rect": [ 120.0, 405.0, 38.0, 22.0 ],
                    "text": "zl reg"
                }
            },
            {
                "box": {
                    "id": "obj-7",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 3,
                    "outlettype": [ "bang", "init", "int" ],
                    "patching_rect": [ 15.0, 90.0, 51.0, 22.0 ],
                    "text": "t b init 1"
                }
            },
            {
                "box": {
                    "id": "obj-3",
                    "maxclass": "newobj",
                    "numinlets": 2,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 15.0, 480.0, 73.0, 22.0 ],
                    "text": "speedlim 33"
                }
            },
            {
                "box": {
                    "id": "obj-358",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 15.0, 45.0, 54.0, 22.0 ],
                    "text": "deferlow"
                }
            },
            {
                "box": {
                    "id": "obj-359",
                    "maxclass": "newobj",
                    "numinlets": 2,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 15.0, 450.0, 180.0, 22.0 ],
                    "text": "gate 1 0"
                }
            },
            {
                "box": {
                    "id": "obj-361",
                    "maxclass": "newobj",
                    "numinlets": 0,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 15.0, 15.0, 136.0, 22.0 ],
                    "text": "r SIGNe_Safe_To_Load"
                }
            },
            {
                "box": {
                    "id": "obj-1",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 3,
                    "outlettype": [ "", "int", "int" ],
                    "patching_rect": [ 135.0, 480.0, 48.0, 22.0 ],
                    "text": "change"
                }
            },
            {
                "box": {
                    "id": "obj-52",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 2,
                    "outlettype": [ "int", "int" ],
                    "patching_rect": [ 120.0, 300.0, 72.0, 22.0 ],
                    "text": "unpack i i"
                }
            },
            {
                "box": {
                    "id": "obj-101",
                    "maxclass": "newobj",
                    "numinlets": 2,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 120.0, 270.0, 60.0, 22.0 ],
                    "text": "pak 1 1"
                }
            },
            {
                "box": {
                    "id": "obj-403",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 420.0, 90.0, 120.0, 22.0 ],
                    "text": "prepend is_playing"
                }
            },
            {
                "box": {
                    "id": "obj-410",
                    "maxclass": "newobj",
                    "numinlets": 0,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 420.0, 60.0, 115.0, 22.0 ],
                    "text": "r SIGNe_IsPlaying"
                }
            },
            {
                "box": {
                    "id": "obj-35",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 270.0, 90.0, 135.0, 22.0 ],
                    "text": "prepend record_mode"
                }
            },
            {
                "box": {
                    "id": "obj-55",
                    "maxclass": "newobj",
                    "numinlets": 0,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 270.0, 60.0, 130.0, 22.0 ],
                    "text": "r SIGNe_IsRecording"
                }
            },
            {
                "box": {
                    "id": "obj-217",
                    "maxclass": "newobj",
                    "numinlets": 2,
                    "numoutlets": 1,
                    "outlettype": [ "int" ],
                    "patching_rect": [ 120.0, 345.0, 29.5, 22.0 ],
                    "text": "&&"
                }
            },
            {
                "box": {
                    "id": "obj-354",
                    "maxclass": "newobj",
                    "numinlets": 2,
                    "numoutlets": 1,
                    "outlettype": [ "int" ],
                    "patching_rect": [ 165.0, 225.0, 105.0, 22.0 ],
                    "text": "DetectModulation"
                }
            },
            {
                "box": {
                    "id": "obj-76",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 2,
                    "outlettype": [ "", "" ],
                    "patching_rect": [ 120.0, 135.0, 127.0, 22.0 ],
                    "saved_object_attributes": {
                        "filename": "auto_gate.js",
                        "parameter_enable": 0
                    },
                    "text": "js auto_gate.js #1"
                }
            },
            {
                "box": {
                    "comment": "",
                    "id": "obj-269",
                    "index": 1,
                    "maxclass": "inlet",
                    "numinlets": 0,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 165.0, 180.0, 30.0, 30.0 ]
                }
            },
            {
                "box": {
                    "comment": "",
                    "id": "obj-304",
                    "index": 1,
                    "maxclass": "outlet",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 15.0, 525.0, 30.0, 30.0 ]
                }
            }
        ],
        "lines": [
            {
                "patchline": {
                    "destination": [ "obj-52", 0 ],
                    "source": [ "obj-101", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-359", 1 ],
                    "source": [ "obj-2", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-2", 0 ],
                    "midpoints": [ 129.5, 383.5, 129.5, 383.5 ],
                    "source": [ "obj-217", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-354", 0 ],
                    "source": [ "obj-269", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-304", 0 ],
                    "source": [ "obj-3", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-76", 0 ],
                    "midpoints": [ 279.5, 122.5, 129.5, 122.5 ],
                    "source": [ "obj-35", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-101", 1 ],
                    "midpoints": [ 174.5, 258.5, 170.5, 258.5 ],
                    "source": [ "obj-354", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-7", 0 ],
                    "source": [ "obj-358", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-3", 0 ],
                    "source": [ "obj-359", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-358", 0 ],
                    "source": [ "obj-361", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-76", 0 ],
                    "midpoints": [ 429.5, 122.5, 129.5, 122.5 ],
                    "source": [ "obj-403", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-403", 0 ],
                    "source": [ "obj-410", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-217", 1 ],
                    "midpoints": [ 182.5, 333.5, 140.0, 333.5 ],
                    "source": [ "obj-52", 1 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-217", 0 ],
                    "midpoints": [ 129.5, 333.5, 129.5, 333.5 ],
                    "source": [ "obj-52", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-35", 0 ],
                    "source": [ "obj-55", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-2", 0 ],
                    "midpoints": [ 24.5, 383.0, 129.5, 383.0 ],
                    "source": [ "obj-7", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-359", 0 ],
                    "midpoints": [ 56.5, 435.0, 24.5, 435.0 ],
                    "source": [ "obj-7", 2 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-76", 0 ],
                    "midpoints": [ 40.5, 123.5, 129.5, 123.5 ],
                    "source": [ "obj-7", 1 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-101", 0 ],
                    "midpoints": [ 129.5, 199.5, 129.5, 199.5 ],
                    "source": [ "obj-76", 0 ]
                }
            }
        ],
        "oscreceiveudpport": 0
    }
}