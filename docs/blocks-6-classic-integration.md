# Oakrest Classic — Block 6 foundation integration and release gates

Issue #96 · stacked upon Block 5 PR #95. **This is a development-only integration candidate, not public release authorisation.** Unmerged prerequisite PRs #87, #89, #91, #93 and #95 must be reviewed and merged in order before this PR can merge into `dev`.

## Implemented in Block 6
1. **Guarded persistence:** `src/classic-save-manager.js` uses exactly the same `storageKey` namespace and `oakrest-character-save-<id>` key schema as the existing 3D game. It validates the actual selected character in the roster before each write, checks original save bytes to prevent multi-tab conflicts, and records an immutable `oakrest-classic-before-block6-<id>` backup before the first Classic write. Session-only by default; users explicitly enable saving after reading the consent.
2. **Safe save ownership:** `createClassicCombat.persistentSave()` removes all temporary practice loan weapons and restores non-owned gear state before serializing. `validSave` sanitizes saved XP, materials, equipment, abilities and ground loot. The original browser-local 3D character remains the source of truth; the Classic world does **not** introduce a separate economy or duplicate ownership.
3. **Autowrite after meaningful actions:** combat XP/monster ground drops, purchases, bank transfers, equipment and ability edits, and ground pickups mark state dirty. A bounded periodic flush and `pagehide`/visibility flush write only in enabled mode. Storage errors and stale revisions disable further writes; the UI reports blocked status instead of silently losing data.
4. **Readability/performance:** equipment silhouette is cached between actual style/item changes and hero is updated only once per animation frame. Keyboard shortcuts ignore focused text input and ability selectors.
5. **QA evidence:** `tests/classic-save-manager.test.js` tests opt-in/backup, 3D save round-trip, loan exclusion, missing/tutorial protection, multi-tab conflicts, non-overwritten backups and path isolation. `tests/browser-classic-save.cjs` checks a real Chromium bank transaction, reload persistence and conflict refusal. Existing Classic gameplay, item, navigation and original-game tests remain required.

## Explicit boundaries and unresolved review
- **Real iPad Air 13-inch Safari landscape validation is required and cannot be simulated by Chromium.** Measure FPS on an actual iPad during moving, building entry, monster combat, spells, equipment view and bank/shop interactions. Goal around 60 FPS without skipped input, incorrect taps or crashes; open an issue for any observed regressions.
- A single coding session is not independent QA approval or the Game Director's art acceptance. Do not self-approve prerequisite branches; request independent engineering and gameplay review, then merge sequentially to `dev`.
- The original 3D `index.html` and public `/oakrest/` remain untouched. Never deploy public without express authorisation.
- Fresh characters in their original tutorial and the Portal Realm cannot enable Classic saving until they complete the original game's onboarding, because Classic does not yet implement those missions. They remain playable in session-only mode.
- This is *guarded browser-local* persistence, not cloud account synchronisation, trading or MMO multiplayer. Position and current HP are not stored because they are not part of the canonical 3D save schema.

## QA / deploy plan
- Verify `npm ci --ignore-scripts`, `npm run check`, `npm test`, `npm run build`.
- Dedicated Classic CI: Node combat, movement, interactions, items and save-manager tests; Chromium browser inventory/shop/bank + separate saved-character/reload test.
- Full Core, Visual Fidelity and Greenwood jobs are required to finish conclusively. Failed/skipped/cancelled/missing critical suites block merge. Independent QA and actual iPad screenshots/controls acceptance gate the product release.
- Only after the code-level gates pass, optional development-host candidate `https://playcellbound.com/oakrest-dev/classic.html` can be published using a pinned SHA from this branch via the existing Cellbound FTPS bridge, with hosted checksum + browser smoke + public-site before/after fingerprint checks.
- Rollback is reversible: revert Block 6 branch/commit and preserve the pre-Block6 backup key; the original 3D client can still read its save. If the user needs to restore the untouched old save, use the backup value after explicitly choosing to discard changes since the backup; never auto-restore or clear storage.

## Device test checklist
- iPad Safari landscape touch joystick and tap-to-move, without involuntary page zoom, gesture conflict or UI overlap.
- Bank interiors, roof cutaways, NPC selection, indoor/outdoor movement, external doors.
- Enemy target, Melee/Magic/Ranged transitions, four abilities, target health, incoming warnings, dodge, resets.
- Examine, four-column bag, nine worn slots, shop purchase, partial-bank transfer, ground-drop pickup.
- Opt in after finishing an actual character tutorial, purchase/fight/loot/bank, reload/reopen and see expected XP/gear/coins. Confirm backup stays unchanged.
- Change the same character in another tab; Classic must refuse to overwrite and show save-lock warning.
