# Oakrest 2.5D transition — Block 1 foundation

Issue: #86. Baseline branch: `dev` at `780545670c82b884e4b412a6859d6e790a71358e` (23 October 2026). Implementation: `ai/tech/86-block-1-gameplay-isolation`.

## Product decision
Build Oakrest's **modern RuneScape Classic-inspired 2.5D** direction in isolated, reviewable **blocks**. Keep independent Melee, Magic, Ranged and Vitality progression, the three complete loadouts, ability slots, inventory/equipment/bank, ground loot, world interactions and existing persistent character data. iPad Safari landscape remains the primary physical test.

**This block does not implement the camera, sprites, new art, navigation scheme or new combat balance.** The current 3D game should look and play exactly as it did before this branch.

## Renderer-independent gameplay contract

| System | Current authoritative modules | New 2.5D presenter should do |
| --- | --- | --- |
| XP/level/ability unlocks | `rules.js`, `gameplay-core.js`, `woodcutting.js` | Display levels/unlocks; do not recalculate XP in view |
| Damage/cadence/target acquisition | `auto-combat.js`, `attack-rules.js`, `combat-physics.js`, `gameplay-core.js` | Render weapon/tell/projectile states while respecting game clocks |
| Three combat loadouts | `rules.js`, `equipment-slots.js` | Show each selected style's saved equipment and four active slots |
| Items/ground loot | `items.js`, `loot.js`, `drop-tables.js` | Map item IDs to sprite art; never generate gameplay rarity colours |
| Shop/bank/town/woodcutting | `town-services.js`, `woodcutting.js`, `town-ui.js` | Show NPC interaction and resource feedback; reuse existing prices/rules |
| Save/characters | `rules.js` (`validSave`), `characters.js`, `storage-key.js` | Preserve exactly the existing keys and structured payloads |

### Extracted functions in this block
- `combatSourceSnapshot(data, style, weapon)`: pure damage-input snapshot, independent of Three.js, camera, current weapon mesh, or HUD.
- `awardMonsterVictory(data, type, sourceStyle)`: predictable XP, Vitality, kills and level unlocks; returns presentation events rather than calling DOM or writing storage. Preserves original in-place save mutation.

The existing `main.js` shell still owns the game clock, HP effects, score/quest UI, rendering, character changes, save persistence, aiming and movement. Its functions `gainXp` and `sourceSnapshot` delegate to these exported functions. **No alternate simulation, no parallel save ownership.**

### Boundaries still to extract before/while building future blocks
1. **Block 2:** isolate a render-facing world state representation, camera transform and sprite/presentation adapter; do not fork combat/XP rules.
2. **Block 3:** extract input intent and target/path selection from canvas pointer details, preserving obstacle collision semantics.
3. **Block 4:** bind active attacks/projectiles/monster tells into 2.5D renderer, preserving exact current gameplay timings and spatial checks.
4. **Block 5:** swap inventory, equipment and services presentation only, preserving item IDs, transaction rules and saved state.
5. **Block 6:** browser regression tests, device measurements, reviewed dev integration and deliberate pinned development-host release.

## Save and rollback safety
- Existing `localStorage` character saves are **not** renamed, erased or migrated.
- Public `/oakrest/` and dev `/oakrest-dev/` remain separately namespaced via `storage-key.js`.
- Snapshot/backup strategy: the pre-change dev commit above is immutable and the new work lives only in an issue-scoped branch/PR; revert the PR or restore that SHA to roll back this extraction.
- The 3D presenter and all former visual assets remain present in this block.
- No Vercel deployment. Never treat a GitHub PR or dev merge as a proven deployment of `/oakrest-dev/`.

## Validation and release gates
New unit regressions live in `tests/gameplay-core.test.js` and run through `npm test`. The authoring session cannot claim passing checks without observed results.

Before merge: `npm ci --ignore-scripts`, `npm run check`, `npm test`, `npm run build`, all relevant existing gameplay/browser suites and a conclusive core CI result; separate QA review is required. Existing longer Greenwood CI workflows have historically been cancelled; **cancelled or missing ≠ passed**.

No direct push to `dev` or `main`, no public release, and no claim of physical iPad verification from automated browser emulation.
