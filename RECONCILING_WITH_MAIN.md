# Reconciling this branch with `main`

**Status as of 2026-09-04.** This branch (`2026-05-15_optimization`) is dormant
pending QA funding. `main` has since received a round of bugfixes. This file
records exactly what has to be replayed by hand when work resumes, and why.

Merge base: `d5f1c40`. Since then `main` is **16 commits** ahead and this
branch is **7** ahead. They have not been reconciled.

---

## Why this cannot be a normal merge

Git cannot three-way merge a `.amxd`. It is a binary container as far as git is
concerned, so on a conflict it can only take one side wholesale — and both
branches have modified the same three devices. Taking either side discards the
other's work silently.

**Every device change on `main` must be re-made by hand, in Max, on this
branch.** There is no shortcut. The list below is what to re-make.

Text files (`.js`, `.maxpat`, `.gitattributes`) merge normally.

---

## What overlaps

`main` changed these since the merge base:

```
.gitattributes                                  new, no conflict
_dev/code/js/marquee_selection_instancing.js    ← CONFLICTS
amxd/SIGNe-Screen.amxd                          ← CONFLICTS, replay by hand
amxd/SIGNe-Symbol.amxd                          ← CONFLICTS, replay by hand
amxd/SIGNe-Text.amxd                            ← CONFLICTS, replay by hand
amxd/SIGNe-Background.amxd                      no conflict — this branch never touches it
common/logo_solid.svg                           moved out of _dev/legacy, no conflict
```

`SIGNe-Background` and the two non-device files can be taken from `main`
directly. The rest is the work.

---

## The one JS conflict

`main` added a fix to `marquee_selection_instancing.js` — the file this branch
modifies most heavily, and which it mirrors into
`marquee_selection_instancing_v8.js` via `sync_v8_from_js.py`.

The change is small and self-contained: three additions that keep `raw_matPos`
in step with the registry.

1. `_set_raw_pos_x(id, x)` — a per-plane writer beside the existing
   `_set_raw_scl_x` / `_set_raw_scl_y`.
2. `_seed_raw_pos_from_registry(id)` — reads the registry (deliberately not
   `_get_pos`, which prefers the matrix, the value being corrected) and writes
   it into the slot.
3. Two call sites: `_assign_slot` seeds a slot as it hands it out, and
   `drop_new_object` writes the x plane after setting the registry.

**Why it matters:** an object's position lives in three places — the registry,
the device's own parameters, and `raw_matPos`. `drop_new_object` set the first
two and left the third holding whatever the slot already contained: zeros when
fresh, the *previous occupant's coordinates* when recycled. A newly dropped
object therefore drew its bounds in one place and itself in another, and the
first drag read the stale matrix value as its origin and discarded the drop
position.

After merging, run `sync_v8_from_js.py` so the v8 copy picks this up, and check
its output for substitutions reporting 0 replacements.

---

## Device changes to replay by hand

Verified against `main` with `patchprobe diff`. Parameter changes are inspector
edits; the wiring changes need doing in the patcher.

### SIGNe-Screen

Parameter Visibility, in the inspector:

| Object | From | To |
| --- | --- | --- |
| `Show Background Grid` (Settings) | Hidden | Stored Only |
| `Show Time Ruler` (Settings) | Hidden | Stored Only |
| `Quantization X` (Properties) | Hidden | Stored Only |
| `Quantization Y` (Properties) | Hidden | Stored Only |

Also on `Settings Tabs` (Settings): turn **Initial Enable** on and set
**Initial** to `0`, so the Settings window opens on the Display tab instead of
whichever tab was showing when the device was last saved.

Ignore the ~51 `hidden` attribute differences the diff reports on Settings
boxes — those are the tab panel's saved show/hide state, which changes on every
save depending on which tab was open. Not a real change.

### SIGNe-Symbol

Parameter Visibility → **Automated** (from Stored Only):

- `Duplicate Quantity`
- `Symbol Colour Start Saturation`, `Symbol Colour End Saturation`
- `Pattern Colour Start Saturation`, `Pattern Colour End Saturation`

Then set **parameter_order** on each, appending past the existing entries —
`15, 16, 17, 18, 19` in that order — and add the matching rows to the
`parameter_order` map comment. Do not renumber anything existing: Live's saved
automation references parameters by index, so renumbering breaks every set ever
saved with the device.

Patcher edits:

- Delete `r ---OnLoadMesh` and the `zl reg` it fed; connect `zl change#3`
  directly to `s ---ToPhysicsBody`.
- Delete an orphaned, unconnected `[t b]` at the root.
- Add the comment recording **when a parameter needs an AutoModGate** (see
  `main`'s copy for the text).

### SIGNe-Text

Parameter Visibility → **Automated** (from Stored Only):

- `Duplicate Quantity`
- `Text Colour Start Saturation`, `Text Colour End Saturation`

Then **parameter_order** `13, 14, 15`, same rules as above, and add the map
rows. Also retitle that comment — it currently reads "SIGNe-Symbol
parameter_order map", a copy-paste from Symbol.

Patcher edits:

- **Add `[live.thisdevice] → [s SIGNe_Global_Boot]` at the root.** This is the
  important one. Screen broadcasts `SIGNe_Safe_To_Load` from one-shot timers at
  its own boot, and AutoModGate's output gate stays closed until it arrives.
  Screen re-broadcasts on request via `r SIGNe_Global_Boot`; Symbol asks and
  Text did not. Any Text device added more than ~3s after Screen therefore had
  all five of its AutoModGates permanently shut, so dial input took the cache
  fast path and never reached the scale-linking code in Screen's JS. Symptom
  was scale linking silently not working; position and duplicate-spacing were
  affected the same way.
- Delete the three `r ---OnLoadMesh` receivers and the three `zl reg` objects
  they fed; connect `zl change → s ---TextInstanceScale`,
  `zl change#2 → s ---ToPhysicsBody`, `zl change#3 → s ---ToPhysicsBody#2`.
- Add the AutoModGate comment, as in Symbol.

### SIGNe-Background

Nothing to replay — this branch does not touch it. Take `main`'s version.

---

## Pre-existing problem on this branch: SIGNe-Text is unfrozen

**`amxd/SIGNe-Text.amxd` on this branch is committed in an unfrozen state.**
Confirm with:

```
patchprobe deps amxd/SIGNe-Text.amxd
```

An unfrozen device resolves its abstractions, scripts and images through the
Max search path of whoever opens it. It works on the machine that built it and
breaks everywhere else, so this branch would ship a broken Text device if
released as-is. `main`'s copy is frozen and carries 26 embedded files.

This predates the bugfix work and is unrelated to it — worth fixing whenever
this branch is next opened, independently of the reconciliation. Re-freeze
before doing anything else, so that later diffs compare like with like.

While checking, note that this branch's SIGNe-Screen carries 19 embedded files
against `main`'s 17. The extra two are `jit.gl.spoutsender.mxe64` and
`marquee_selection_instancing_v8.js`, both of which belong to the optimization
work. That difference is expected.

For the record, `main` changed it so the drop button reads "drop file" rather
than the default image's filename: `sprintf %s/3DivisionsWhite.png` no longer
feeds `regexp .+/(.+)`, and the sentinel branch goes through a `[t b b]` that
loads the default image first and then sets the label.

---

## Suggested order

1. Merge `main` into this branch. Accept `main` for `.gitattributes`,
   `common/logo_solid.svg` and `SIGNe-Background.amxd`.
2. Resolve `marquee_selection_instancing.js` by hand — take this branch's
   version and add the three `raw_matPos` pieces described above.
3. Take **this branch's** `.amxd` files for Screen, Symbol and Text — they
   carry the optimization work, which is far larger than the bugfixes.
4. Replay each device change from the lists above, in Max.
5. Re-freeze all three devices. Confirm with
   `patchprobe deps <device>.amxd` — it says UNFROZEN explicitly.
6. Run `sync_v8_from_js.py`.

---

## Verifying the replay

`patchprobe diff` between this branch's device and `main`'s will show what is
still outstanding. Once the replay is complete, the parameter section should
report only the differences that belong to the optimization work — on Screen
that is `Enable Spout` and `Frame Rate`, which exist only here.

```
patchprobe diff <main's device>.amxd <this branch's device>.amxd
```

Ignore in that output:

- `patching_rect` differences. Both branches have had whole-patch coordinate
  reflow — `main`'s Symbol and Text show fractional-to-integer rewrites that
  are cosmetic but inflate the diff considerably.
- `appversion`, `project`, and window `rect` on patcher attributes.
- `hidden` on Settings boxes in Screen, as noted above.
- `saved_object_attributes` on subpatcher boxes. These appeared, changed value,
  and disappeared again across three consecutive saves during the bugfix work
  without anyone editing them; they are not stable and not meaningful.

Also worth running `typemax check ./amxd --summary` before and after, to
confirm the replay did not introduce findings. `main` sat at 461 when this file
was written.
