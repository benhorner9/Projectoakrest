# Oakrest — Block 7: cohesive in-game HUD, minimap and responsive panels

**Issue #98.** Stacked on Block 6 PR #97 head `9795650e70a7381249ed7d2fe8e947be85c3285e`. Blocks 1–6 remain unmerged. No promotion to main/public without Game Director approval.

## Changes

- Replaced full-width header, permanent right-side character sheet and intrusive bottom guidance with compact character/vitality/health/loadout HUD at top-left, lightweight minimap at top-right, four-ability + attack/dodge dock at bottom-right and iPad joystick bottom-left.
- Created `src/classic-minimap.js`: Canvas 2D north-up rendering derived directly from `OAKREST_BUILDINGS`, `OAKREST_PATHS`, `OAKREST_WELL`, trees and `OAKREST_SERVICES`. Shows player-facing arrow, live monster/loot dots, service icons and selected navigation goal. Static street/footprint texture is cached; dynamic icons/player update at most ~8 fps. Minimap zoom and expanded map; tapping the big map uses `minimapToWorld` and the existing movement/pathfinding rules. No duplicate map authoring.
- Created `src/classic-ui-controller.js` so inventory, equipment, abilities, bank, shop, map, settings and NPC dialogue are exclusive, never stacked. Existing item logic remains owned by `src/classic-items-ui.js`.
- Bank/shop windows open from the physical indoor NPC, using existing permission, distance and transaction checks; primary menus always close/switch predictably.
- Context-sensitive Interact and Pickup; hints are time-limited toasts. Character-save management and camera controls live under Settings; a visible save badge still gives persistent vs practice vs blocked state, with save errors remaining visible.
- `src/classic-hud.css` consolidates the visual identity without touching gameplay rules. The central world stays visible; viewport-safe positions and 44px-class targets are used for iPad landscape.
- No new items, XP rates, game saves, combat math, styles or inventory economy. Original 3D client and public route remain intact.

## Tests and safeguards

`tests/classic-minimap.test.js`: canonical reference identity, correctly oriented coordinates, real building/service locations, reversible world/screen transforms.

`tests/browser-classic-hud.cjs`: real Chromium 1194×834, 1024×768 and 1180×600 layout bounds; no overlap between HUD/minimap/dock/menu; exclusive map/inventory/equipment/settings windows; 28 bag cells and 9 paper-doll slots; bank interaction; live map zoom; original browser-local save unchanged.

Existing Classic movement/combat/item/save tests, Build, Core Gate, Greenwood and visual regression all remain required. Real physical iPad Air 13-inch Safari landscape experience signoff is **not simulated** by Chromium. Run actual device test before product acceptance.

## Known boundaries

1. Device acceptance and screenshots/60 FPS verification require physical iPad Safari testing. Do not claim these have passed on browser emulation.
2. Block 7 is an additive 2.5D route in a stacked draft PR, not yet merged to `dev`; integrate prerequisite PRs in order and seek independent QA.
3. Original 3D game and dev/public browser saves must remain intact. The Classic save manager is opt-in/guarded and unchanged by this presentation block.
4. The expanded world map covers the starter region represented by the Classic village; it does not fabricate distant MMO world geography.

## Development deployment

Pinned review commit → existing Cellbound `deploy/oakrest-dev-20261020` FTPS bridge → verify all uploaded bytes → hosted Classic gameplay/browser smoke, map and windows, public-site fingerprint. No public deployment. Rollback: return bridge `OAKREST_COMMIT` to preceding Block 6 SHA, which retains original saves; leave backup keys untouched.
