# Project Oakrest — Visual Fidelity Pass 01

**Target:** \`feature/oakrest-visual-fidelity-pass\` → \`dev\`. Do not merge to \`main\` or deploy to the public game until reviewed.

## Art direction and scope

We are building a tactile low-poly fantasy world, **not** chasing realism or simply multiplying triangles. The starter city must have readable silhouettes, warm interiors, natural landscape materials, coherent colour temperature, and visually distinct destinations. Keep Oakrest's own fantasy identity; no imported RuneScape or Warcraft artwork.

This PR is a **first-engineering vertical slice**, not a claim that asset creation, character art, animations, weather or AAA-level polish is complete.

### Delivered

- Deterministic tileable 256px procedural surface art for plaster, limestone, timber, slate, cloth and road masonry, with shared PBR textures and low-amplitude bump detail.
- PBR material adoption for buildings, removable roofs, interior flooring, Heartwood stonework, timber and wilderness props; material presets are explicitly tuned by category.
- Camera-relative **directional-light shadow footprint** recentered in 8m steps for better shadow texel density near the player; no world or collision relocation.
- Three quality budgets: performance (512px shadow map/no street point lights), balanced (1024px/one street point light), high (2048px/two street point lights); renderer resolution caps preserved.
- One recycled interior point light and two recycled nearby lantern point lights, **without dynamic light shadows**. Point lights are disabled in other gameplay scenes, and lantern lighting is disabled indoors.
- Wind on instanced grass blades is calculated in the vertex shader, without CPU animation, material allocation or draw-call inflation.
- Graphics diagnostics report active lights and shadow resolution. Existing gameplay save format, camera behaviour and collision rules remain unchanged.

### Deliberately out of scope

Professionally authored low-poly GLB characters, animation retargeting, a full art-asset pipeline, motion matching, advanced GI/SSAO, screen-space reflections and a complete day/night system. These require explicit performance budgeting, authored art, rigging, integration and visual signoff rather than synthetic quick fixes.

## QA and release gates

### Automated checks to run

1. \`npm ci\`
2. \`npm run check\` — source parse checks (all src modules).
3. \`npm test\` — including \`tests/visual-fidelity.test.js\`.
4. \`npm run build\` — verify static packaging contains \`src/visual-fidelity.js\`, any reused maps and assets.
5. \`npm run test:browser\` where Chromium/SwiftShader is available; record failures and distinguish environment issues from regressions.

### Functional / visual checks

- In the town, inspect bank, general store, Forester's Lodge, Trade House, square, market stalls, well and homes **from all four facade directions**.
- Enter **every** village building and test roof cutaway, door opening, collision and camera visibility. Verify counters and shops remain accessible.
- Check new roofs for seams, inverted UVs and patterned texture stretching. Verify plaster/limestone/wood are not muddy or nearly black.
- Move the camera while shadows follow the player; inspect if shadow resolution jumps are noticeable when crossing an 8m recenter threshold.
- In performance/balanced/high presets, switch quality repeatedly. Look for WebGL errors, black screens, uninitialized shadow textures and GPU memory growth.
- Check lantern pools outdoors and an interior light indoors. Confirm no lighting from the outside city leaks into Portal Realm or tutorial.
- Confirm windy grass moves **after gameplay starts** while neighbouring ground and non-grass meshes remain static.
- Repeat all checks in midday-like lighting (current default) with HUD, effects and combat engaged. Ensure visual effects preserve enemy warning-circle readability.
- Confirm item icons, drop pickups, bank/shop UI, XP, equipment, combat and browser-local saves are unchanged.

### Browser & real-device evidence

- Capture identical-camera before/after screenshots for: south arrival, Heartwood Square, bank exterior, bank interior, Trade House, general store, forest edge, first combat area.
- Primary: **iPad Air 13-inch, landscape Safari**. Secondary: iPhone Safari portrait/landscape, desktop Chromium and Firefox; WebKit automated test where available.
- Record average FPS, p95 frame time, draw calls, triangles, texture and geometry counts. Use \`window.oakrestDiagnostics()\` and record graphics quality.
- Release target: **60 FPS during normal iPad exploration** and stable memory over 10 minutes; investigate any material regression relative to the current \`dev\` build. Document exceptions explicitly. No "looks fine" acceptance without visual comparisons and metrics.
- Capture console and WebGL errors with screenshot evidence and link them to the PR review.

## Known limitations at authoring time

The connected GitHub tools can author and inspect repository files, but this execution environment cannot clone GitHub via network access and cannot run Oakrest's Playwright browser suite against a built checkout. Source parse checks and isolated lighting/material smoke checks have been performed in the available JS runtime. **No real iPad benchmark, screenshot comparison, browser gameplay test or deployment has been claimed.**

## Merge criteria

A reviewer must see actual before/after screenshots, confirm the starter city remains walkable and all interiors work, review automated test results, and approve iPad Safari performance. Merge **to dev only** after passing these gates. Public hosting and production remain unchanged.
