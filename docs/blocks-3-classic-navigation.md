# Oakrest — Block 3: 2.5D navigation and existing town interactions

Issue #90. Stacked upon unmerged **Block 2 PR #89** at `1d13ff878d7e2b451df7d4a95133716c2840e509`. Do not merge this pull request before #89; after #89 merges, the Block 3 diff can be reviewed independently.

## Completed implementation
- `src/classic-navigation.js`: renderer-agnostic path-following and manual-movement authority. Supports tap-to-walk, WASD, iPad joystick, safe approach positions near NPCs, no through-wall interaction, collision sliding, stalled-route retry, stop and manual override. No DOM or browser storage.
- `src/classic-interactions.js`: canonical service points, NPC names, radii and stock data from `town-services.js`, plus existing signs/training groves. Presents read-only bank, shop, trade and Woodcutting information with **no save mutations**.
- `src/classic-presentation.js`: 2.5D NPCs now derive from `OAKREST_SERVICES` rather than being positioned by an unrelated set of constants. Colliders include training groves.
- `src/classic-village.js`: grove trees and town noticeboards exist as actual visible/selectable objects.
- `src/classic-prototype.js`: player input/raycast shell, status feedback, selected destination marker, automatic approach, key T/E and touch INTERACT button, multi-line dialog, deterministic QA hook; existing saved combat loadout previews remain intact.
- `classic.html`/`classic.css`: UI designed for iPad Safari landscape and mouse/keyboard with an obvious interact action.
- `tests/classic-interactions.test.js`: pure logic tests for routing, in-range/LOS, save preservation and authoritative service binding.
- `tests/browser-classic.cjs`: actual Chromium checks for bank, store, grove, movement and preserved save data.
- Dedicated Classic CI now includes the new interaction tests.

## Deliberate boundary
**Block 3 integrates targeting, pathfinding and interaction discovery, not economic transactions.** The full original 3D game's bank/shop/woodcutting mechanics remain authoritative and are unchanged; the Classic view only reads their associated data. Interaction panels cannot purchase items, chop trees or deposit/withdraw bank contents. Active combat is reserved for Block 4; item/economy UX is reserved for Block 5.

**Saves remain bit-for-bit unmodified by the Classic prototype.** The original `index.html` continues to run the original 3D game.

## QA before merge / release
Run: `npm ci --ignore-scripts`, `npm run check`, `npm test`, `npm run build`, the Classic Chromium suite and all relevant AI Core and Greenwood release checks. Inspect real iPad Safari landscape gesture, doorway, roof and hit-target behaviour and obtain independent UX/QA review. Pending/missing/cancelled or failed checks are *not* green.

Deploy to shared-host `/oakrest-dev/` only from a reviewed `dev` SHA through the Cellbound release bridge; **never publish to `/oakrest/`** from this PR. No Vercel.

Rollback: revert Block 3, leaving Block 2's independent display prototype and the original 3D game recoverable.
