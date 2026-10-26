# Classic overhaul Block 3 — equipment and connected interface

Issue #132. Branch `ai/ux/132-classic-equipment-ui`, based on Block 2 merge `bdf5194bd8e47507c8858775c36d3d71ba9a24d8`. Scope is the existing Classic development route and shared equipment/save rules. The established world, characters, quests, recipes and economy are retained.

## Delivered behaviour

- All eight quick slots accept abilities, food, tonic, owned equipment or supported menu actions. Arrange, clear, reset, item examination and drag assignment share one rule set. Bindings belong to the selected character; old four-utility ordering is imported compatibly. Unavailable items, full health, missing targets and cooldowns are represented by disabled actions. Consumables use the adventure engine's existing healing and cooldowns.
- Four inventory columns, readable quantities, Examine, Use, Equip, Drop and existing item-on-item/recipe crafting. Mouse dragging and held touch dragging rearrange items; a short vertical touch scrolls the panel. New presses are never swallowed by a prior drag's synthetic-click suppression. Alt-arrow arrangement and the tap arrangement controls remain available.
- Nine equipment slots and independent Melee/Ranged/Magic presets remain authoritative. Two-handed greatswords, paired daggers and bows/crossbows clear the off-hand reference while preserving the item in the backpack. Invalid old combinations are repaired on load. Existing staff/focus combinations remain valid. Equipment displays actual maximum hit, tick-aligned attack interval, reach, armour, power and guard; missing owned weapons are reported.
- Four ability selectors follow the active style immediately and show current availability/cooldowns. Switching style from either control updates the equipment and combat screens.
- Banking supports individual, ten, all and custom whole quantities, plus drag transfers. Ownership, proximity, equipped references, 28-slot bag capacity, 240-slot bank capacity and stack limits are validated before committing. Existing overfull saves remain readable and can reduce their inventory. Shop bundles use the same atomic capacity checks and retain existing prices. Timber sales at the coin cap preserve the logs.
- Player drops retain registered identity and quantities through reload. Equipped items, onboarding teleport scrolls, restoration seals and the Warden heart are protected. Pickup checks distance/obstacles and capacity, cannot run twice, and leaves uncollectable loot intact. Existing duplicate-equipment salvage also respects bank ownership and coin capacity.
- Skill detail scrolling survives XP refreshes. Quest journals update expedition progress and show the relevant quest contact. Existing dialogue, shop, skill, map, quest tracking and crafting flows remain connected.

## Ownership and save compatibility

`classic-item-state.js` validates on a cloned candidate and commits only supported item fields after success. Nested live inventory objects retain their identity so adventure crafting and consumables keep reading current quantities. DOM code never writes inventory directly. Ground loot and quick-slot saves validate registered IDs; quick-slot references do not create ownership.

The optional `quickSlots` field is additive. No existing storage key is renamed or cleared. Character backups, external-write conflict protection and dev/public namespaces are retained. Existing equipped items continue to be references to backpack ownership. Cooldowns, attack timers and XP are not reset by quick-slot changes. No new item prices, equipment tiers, quests, gathering methods or multiplayer services are introduced.

## Verification

- Locked dependency installation, syntax, full unit suite, static build/cache tests and visual asset audit.
- Eleven added unit regressions cover two-handed ownership/stats/reload, overfull legacy saves, capacity/stack-safe bank transfers, stale drags, atomic shop failures, persistent drops, duplicate pickups, banked-equipment salvage, all eight bindings, adventure material references/cooldowns, protected practice loans and coin-cap sales.
- New actual Chromium DOM journey covers held touch/mouse dragging, short touch scrolling, arbitrary quick slots, nine equipment slots, two-handed swaps, style-sensitive panels, custom banking, transfers, dropping/collecting, crafting, skills, quests, map, save/reload and character isolation. Screenshots at 1366×1024 and 1194×834 are saved under `qa/classic-block3-*.png` by CI.
- Existing Forged HUD and combat-overhaul browser journeys pass locally. Forged HUD asserts the explicitly requested four columns and retains its five viewport checks.
- New journey runs in the Rebirth matrix and the First Adventure WebKit job. Core and Greenwood remain mandatory gates. Local legacy 3D smoke/town/equipment/auto-combat/iPad-creator processes close during startup; no local pass is claimed for these. Local WebKit system dependencies cannot be installed in this container, so the Linux WebKit CI job is required.

Physical iPad Safari, hardware FPS, frame pacing and long-session testing remain unverified. Desktop WebKit and Chromium touch emulation are not physical-device results. Action bar presentation refreshes at most every 80 ms during ordinary frames, with immediate explicit action/style refreshes; this avoids cloning/rendering all eight bindings at every graphics frame. It is an implementation limit, not an FPS measurement.

## Integration and rollback

PR targets `dev` only. Required CI must pass before merge and bridge handoff. No independent GitHub reviewer approval is claimed. The final PR delivery notes record actual commit, CI and hosted verification results.

Pin the merged commit in the existing Cellbound development bridge. Verify hosted metadata/assets/gameplay and unchanged public fingerprints. To roll back, revert through dev and repin the last verified compatible bridge commit. Production is not a deployment target. Optional quick-slot fields may be ignored by older versions; no destructive migration is required.
