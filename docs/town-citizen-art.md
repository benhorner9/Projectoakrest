# Oakrest town characters — visual milestone B (issue #74)

**Scope:** Replace the *appearance only* of nearby, already-existing Oakrest townsfolk with official, free CC0 KayKit skinned 3D characters.

## Source
No new asset packs, hosts, or licences. Reuse previously pinned and SHA-verified official KayKit Knight/Rogue/Mage GLBs from \`assets/kaykit-character-art/\` and their original CC0 licences. The optional shared browser GLTF loader and Three.js r180 SkeletonUtils are self-hosted in \`vendor/\`; no runtime third-party URLs or new developer-controlled rarity taxonomy.

## Behaviour
- Banker, shopkeeper, forester, trade steward, four ambient staff and 14 roaming citizens keep **exact names, roles, dialogue, routes, transaction and collision authority**.
- Import exact model sources once per three variants; clone skeletons while sharing immutable geometries and texture atlases. Outfit tint is very restrained and owned by each render instance.
- Maximum **8** detailed town NPC models, prioritised by player proximity; load within 27 world units and retain up to 31 world units to avoid popping. Distant NPCs are procedural. Animate only loaded NPC models; current walk/idle driven by existing authoritative pathfinding.
- Existing Settings → **KayKit 3D characters** preference also applies to villagers. Performance quality disables models, returning to all original geometry; no save migration or schema edits.
- Forest boars/mosslings, buildings, paths and existing forestry/tree collision are left intact; do not substitute a humanoid skeleton for a quadruped.

## Verification
- \`npm run check\`, \`npm test\`, \`npm run build\`; source and WebKit/Chromium built gameplay checks plus \`node tests/browser-town-citizen-art.cjs\`.
- Visual QA: view merchant/guard/courier silhouettes from player camera and bank interiors; ensure no double bodies, foot hover, collision shift or clipped equipment.
- Real iPad Safari landscape signoff remains mandatory. Do **not** claim an emulator proves hardware 60 FPS or body-appearance parity.
- No public release. Merge **dev only** when all required checks conclude successfully. Use the Cellbound pinned \`/oakrest-dev/\` deployment bridge, verify the hosted commit and public snapshot. If any check fails, keep PR open.

## Known limits
Three base presets create repetition and do not add role-unique outfit meshes; personal hair/sex/skin customisation of the player was not addressed by this town pass. This is a performance-budgeted visual milestone, not a full MMO-quality character configurator.
