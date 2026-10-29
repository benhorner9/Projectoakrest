# Oakrest Classic — Roadmap Block 3: environment and town life

This release builds directly on Block 2 named zones and the original Classic game.
No save, equipment, quest, monster, XP or combat timing changes.

## Changes
- Naturally variable path edges and deterministic shallow centreline curves, generated from the same shared routes as the minimap. Changes are mesh/cartographic only and do not redirect movement.
- Visible secondary bank and shop/trade-house furniture added to the existing canonical interior fixture registry; navigation, player collision and ray-line checks consume these exact rectangles. Existing front doors, roofs and service NPCs remain compatible.
- Three more unarmed townspeople go about everyday work, travelling the safe east/west lanes and village streets with distinct walking speeds and pauses. Fixed service staff, guard and static villagers remain fixed. NPC routines are deterministic and never modify progression data.
- Explicit environment QA covers furniture solids and line-of-sight, entry from service doors, safe civilian routes, road strip continuity, existing world naming, and full playable touch Chromium bank entry.

## QA / release
Run `npm run check && npm test && npm run build`, browser scenario `node tests/browser-classic-block3.cjs`, existing navigation regression and all applicable GitHub checks. QA uses Linux browsers only: physical 13-inch iPad Air Safari and hardware FPS remain unverified.
Block 3 is stacked on the still-open Block 2 PR #191. Release in dependency order after the Block 2 review/waiver, merge, exact-SHA dev deployment and hosted verification. For Block 3 a *separate* independent review or Game Director waiver is required. Do not merge, deploy, alter production, or claim either block live from an unmerged PR.

Rollback: pin the previously verified dev commit using the existing Cellbound bridge without deleting or migrating browser saves.
