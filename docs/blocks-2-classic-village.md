# Oakrest Blocks — Block 2: first playable 2.5D village

**Issue:** #88 · **Prototype route:** `classic.html` · **Original game:** `index.html` remains unchanged. Branch `ai/world/88-block-2-classic-village` was created from dev `780545670c82b884e4b412a6859d6e790a71358e`.

## What this builds
A distinct, cohesive low-complexity 2.5D proof of presentation: elevated **orthographic** follow camera, 8-direction canvas sprite characters with combat-style equipment silhouettes, canonical Oakrest roads/buildings, distinct bank/store/forester landmarks, real open doorways and automatic roof cutaways. Mouse/touch tap-to-move uses line-of-sight or bounded 8-neighbour pathfinding; WASD, arrows and iPad joystick provide direct movement. Tap near NPCs to approach and hear their introductory dialogue. View a **read-only snapshot** of the existing active character's saved style levels and three loadouts.

## What remains strictly unchanged
- The existing 3D game at `index.html`.
- Any existing character XP, skills, gear, ability slots, inventory, bank, loot, world/currency values or save schema.
- All existing monster/damage calculations and active combat systems.
- Original 3D animations/rigs/assets: rollback always possible.
- Shared-host production path `/oakrest/`. No deployment in this PR.

The Classic route **does not write to localStorage**, even during movement, style selection, or NPC dialogue. It reads active-character or legacy save data via the canonical `storageKey` function. Its style buttons preview existing saved loadouts without changing the active combat style in a game save. It is **not yet a second persistent RPG world**, and its town interactions do not issue actual bank/shop transactions. Block 4 will reconnect the authoritative combat simulation; Block 5 will expose equipment/bank UX on this renderer. NPCs and interiors in Block 2 demonstrate visual/navigation parity only.

## File boundaries
- `src/classic-presentation.js`: **renderer-free** canonical world footprints, collision, route planning, 8-way sprite direction and read-only saved equipment view.
- `src/classic-sprites.js`: directional canvas textures + sprite material; texture cache avoids per-frame atlas recreation.
- `src/classic-village.js`: lightweight Three.js mesh builder from `town-layout.js`, removable roofs, indoor floors, landmark counters.
- `src/classic-prototype.js`: route-specific camera, game-loop, touch/keyboard intent, NPC dialogue and UI update; no save writes.
- `src/classic.css`, `classic.html`: mobile-first entry point.
- `scripts/build.mjs`: copies and fingerprints classic entry (existing source and source build untouched).
- `tests/classic-presentation.test.js`, `tests/browser-classic.cjs`: physics/footprint/save tests and Chromium interactive smoke.
- `.github/workflows/classic-prototype-qa.yml`: dedicated QA gate.

## Quick test
1. Locally run `npm ci --ignore-scripts && npm run check && npm test && npm run build`.
2. Serve repository root at port 5173: `python3 -m http.server 5173`, then visit `http://localhost:5173/classic.html`.
3. Use mouse or touch to select destinations, WASD/joystick to move, click Melee/Magic/Ranged to preview equipment and experience.
4. Try bank and store doors; roofs disappear when inside.
5. Run `node tests/browser-classic.cjs` with Chromium installed; check the Classic workflow.

## QA constraints and later work
- Automated browser tests do **not** constitute physical iPad Air 13-inch Safari performance or usability verification.
- The current sprite artwork is procedural placeholder art designed to prove eight-direction/equipment layering; replacement with an approved cohesive atlas belongs to art iteration, not a parallel skeleton project.
- Test navigation around entrances on a real iPad before merging; non-blocking pathing edge cases should be captured as issues.
- Pixel art is generated under local code ownership; no unverified external asset pack or license dependency.
- Review build and browser CI, then merge into dev only; pinned shared-host dev deployment is a separate authorised action. Never use Vercel or upload public files.
- Block 1 PR #87 may still be unmerged. Block 2 only imports existing dev modules and can be tested independently; the gameplay extraction can be integrated separately after review.
