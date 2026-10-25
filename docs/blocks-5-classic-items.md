# Oakrest Classic 2.5D — Block 5: item ownership and session economy

**Issue:** #94. **Stacked base:** Block 4 commit `53f336de9a6f488a776261967671a9ca89adc243` (PR #93). Blocks 1–4 remain open, unmerged, and must be reconciled before Block 5 integration.

## Implemented
- **Item interfaces:** A classic 4-column 28-cell backpack, 9 equipment slots per combat style (Helm, Ammy, Arrows, Chest, Legs, Weapon, Off hand, Boots, Ring), Examine with authentic stats and restrictions, slot arranging and equipped-style selector.
- **Skills:** Four ability-slot selectors using `equipSkill` and the current weapon's ability catalogue, requirement and duplicate-slot restrictions.
- **Bank:** Indoor banker opens dual backpack/bank inventory, coins/material quantity controls, and gear transfers. The original `town-services.js` rejects item duplication and depositing currently equipped items.
- **Store:** The shopkeeper opens actual `SHOP_STOCK` with original partial starter-bundle prices, ownership checks and item costs. No invented rarity colors, currencies or price formulas.
- **Loot:** Monster victories use the existing `createMonsterDrops` and `collectDrop`; 3D item representations on the floor are reused from Oakrest's `item-visuals.js`. Items are only awarded when picked up within 3.2m; quantity and ownership rules are unchanged.
- **Safety:** The authoritative session data is held by `createClassicCombat` and is cloned from the existing save. All item commands affect **that session only**. There are no `localStorage.setItem/removeItem/clear` calls in the Classic route.

## Important status boundaries
This block is **not** a production economy migration or completed MMO. Equipment and purchases made in the Classic route disappear when the page is closed or reloaded. XP, banking and loot remain persistent only in the untouched existing 3D game. In the Classic route the controls accurately exercise the real game mechanics **without saving results**. Do not tell testers their purchases, items or level gains will persist.

The current Classic session temporarily loans basic practice gear to empty-inventory characters, to allow the three combat styles to be tested; the loaned items never enter the saved character.

The newer crafting scroll-economy rule is not introduced in this block. Teleportation scrolls retain their existing saved representation and cannot be spent here. This avoids silently changing ongoing combat economics during a visual/UX prototype.

## Tests and review
- `npm ci --ignore-scripts`, `npm run check`, `npm test`, `npm run build`.
- `tests/classic-items.test.js`: actual owned item checks, level requirements, nine equip slots, 28 inventory cells, four active ability slots, bank quantity and equipped-item protection, starter bundles, pickup/double-pickup and cloned save integrity.
- `tests/browser-classic.cjs`: real Chromium banking and shop UI, inventory cells, paper doll, combat and unchanged browser localStorage.
- `classic-prototype-qa.yml`: runs all Classic tests and browser smoke against the isolated route.
- Entire Oakrest Core + Greenwood regressions and independent QA, and real iPad Air 13-inch Safari landscape UX/performance review are required before merge or a final release signoff.

## Deployment
The test-only shared host remains `https://playcellbound.com/oakrest-dev/`. The public `/oakrest/` must not change. Deploying Block 5 should follow only after passing required checks, via `benhorner9/Cellbound` branch `deploy/oakrest-dev-20261020`, with a pinned SHA, uploaded byte verification, and observed hosted smoke. **The previous Block 4 hosted browser verification failed behind a hosting security challenge; that failure is not a pass.** Development upload success alone does not establish a playable page from all automated clients.

## Rollback
Revert Block 5 changes only; the Block 4 Classic sandbox and the existing 3D game remain. The session-only item features do not migrate or wipe any browser localStorage keys.
