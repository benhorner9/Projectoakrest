# Issue 208 — Classic combat HUD and habitats

Development-only implementation owned by the implementing Codex session. The Game Director explicitly waived independent review and physical iPad sign-off for this release. This is not a physical-device performance sign-off.

## Approved changes

1. Player health is reparented into the top-left world viewport and shown only for a live selected fight or active incoming aggression.
2. Target health is reparented into the top-right world viewport, driven by the authoritative selected target and hidden on deselect/death.
3. Damage is larger, outlined and separated into incoming/outgoing lanes; concurrent hits stack. Miss and zero states remain visible. Labels expire after 1.35 seconds and retain the 24-label bound.
4. The lower-left joystick is hidden; real ground-tap navigation and style switching are exercised in browser tests. WASD and camera controls remain.
5. MAKE FROM BAG is removed. Material examination exposes recipes and USE WITH; ambiguous material pairs show matching recipes, while single-result combinations retain the existing transaction.
6. The loose chat footer is removed. The input and Social panel still state that chat is local; channel controls and the message log remain.
7. The circular minimap has explicit square dimensions, centred canvas, border clearance and no header overlap. Existing canonical north/camera projection is retained, including camera-aligned compass and north-up expanded map.
8. Logout moves into Settings, with cancel/confirm handling and the existing guarded save before the character picker.
9. Monster creation/respawn validates body clearance; movement and A* share species-sized clearance. Paths cannot tunnel through walls or trees.
10. Redundant floating resource/object names are hidden; close quest-giver names, quest beacons, interaction names and examination remain. Monster labels appear for selection/aggression.
11. Existing stable monster IDs form meadow, creek, root-grove, camp and shrine groups. Explicit territories bound aggression/movement and returns. Flat low-poly ground dressing differentiates habitats. Instructor, smith, scribe and scout keep their existing work/story locations outside ordinary hostile territories.

## Compatibility and validation

No changes to save namespaces/schema, item ownership, XP/rewards, damage, cooldowns or attack intervals. Existing species and counts remain; encounter locations and territorial limits intentionally change. Five flat dressing meshes add no collision objects or per-frame simulation. Collision queries remain cached per path and paths are refreshed at the existing bounded cadence.

`tests/classic-habitats.test.js` covers shipped spawn clearance, recovery from blocked authoring, wide-body routing, territorial movement and return. `tests/browser-classic-issue208.cjs` covers HUD lifecycle, deselect, incoming-only aggression, concurrent hit/miss/zero presentation, real touch movement/crafting, chat, minimap framing at three landscape sizes and logout cancel/confirm. Existing browser suites are updated for the approved removal of joystick and general crafting button; gameplay assertions are retained. The existing unit suite, build, and full CI gates remain mandatory.

Screenshot evidence: CI artifact `oakrest-issue208-evidence`, `qa/issue208/combat-ipad-landscape.png`. Automated touch Chromium is not physical iPad Safari.

## Release and rollback

Merge only to `dev` once required checks conclude successfully. Pin that exact merge SHA in the Cellbound development bridge, upload only `./oakrest-dev/`, verify hosted metadata and every asset, and compare the production fingerprint before/after. Do not promote `main` or upload `/oakrest/`.

Rollback by reverting this PR on `dev` and deploying that compatible reviewed commit through the same bridge. No save rollback or clearing is required.
