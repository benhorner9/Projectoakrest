# Oakrest Classic — Block 1 hardening and acceptance matrix

**Roadmap:** [#187](https://github.com/benhorner9/Projectoakrest/issues/187) · **Implementation:** [#180](https://github.com/benhorner9/Projectoakrest/issues/180) · **PR:** [#188](https://github.com/benhorner9/Projectoakrest/pull/188)

## Release baseline

- Previous **verified development release**: `d3a70c7d93ed24b3bd4310fd24fb6f1bfdafcbf2` (28 October 2026); dedicated source branch `ai/qa/180-classic-hardening`.
- Target: Classic Three.js 2.5D only, with unchanged character saves, published production content, equipment requirements, weapon timing and chapter level cap 60.
- Physical **iPad Air 13-inch Safari is not connected here**. CI Chromium touch emulation and desktop WebKit tests are *not* physical hardware experience signoff.
- Natural-duration end-to-end playthrough (2–4h), 60 FPS on device, thermal behaviour and long-session Safari memory stability are **not yet verified**. The existing complete-quest acceptance is accelerated, using QA teleport and time advance, but does not mint quest progress, resources, NPC flags or kills.

## Changes in this hardening slice

1. Native Quest Journal dialog closes *synchronously* on changes of sidebar tab/item panel and cannot remain on the browser top layer to block inventory or controls while the main game render is paused. The window controller publishes current tabs through an unsubscribable listener; permanent tabs still cannot be dismissed into an empty book.
2. Rerendered quest list retains its scroll position on tracking/progression changes. The selected quest still lives in a distinct native dialog; back/X/Escape close it and restore focus when the Quests tab remains active.
3. Full-journey save checkpoint comparisons now include authoritative bank and wallet, weapon gear for all three styles, four ability slots, armour presets, nine-slot equipment, woodcutting XP, other character XP, inventory ownership and material counts. A legitimate 10-coin bank deposit ensures the bank roundtrip tests nonempty values.
4. Every failed repeat quest claim and invalid crafting attempt must preserve wallet/materials/skill XP; existing tests also guard completed dungeon heart rewards from double claim.

## Accepted test cases and evidence

| Area | Runnable acceptance coverage | Scope and limitations |
|---|---|---|
| Fresh character, canonical eight quests, all four Hollow dungeon rooms, earned combat/gather/craft materials, repeated expedition | `tests/browser-adventure-complete.cjs` | Accelerated **real game** transactions with seeded fights; not natural-duration travel |
| Four save checkpoints (after 3 quests, prepared dungeon, two wards, final completion) | `tests/browser-adventure-complete.cjs` | Same test asserts bank, bag, wallet, three saved combat styles, equipment, XP, quest progress and idempotency |
| Starting character, normal onboarding, inventory MAKE, quest journal and popup, iPad-like viewports | `tests/browser-adventure.cjs` | Browser/desktop touch emulation, includes new immediate modal-close test |
| Persistent sidebar, quest modal focus/scroll and previous-tab restoration | `tests/classic-ui-controller.test.js`, `tests/classic-quest-journal.test.js` and `tests/browser-adventure.cjs` | Real tab model plus browser top-layer modal, no save mutation |
| Move/retreat and monster leash, style switch, LOS/abilities, inventory ownership | `tests/browser-classic-combat-engagement.cjs`, `tests/browser-classic-equipment-ui.cjs` and `tests/browser-classic-free-combat.cjs` | Software-rendered browser checks; no physical hardware assertion |
| iPad viewport game/chat/action/sidebar separation, minimap, 8 slots | `tests/browser-classic-framed.cjs`, `tests/browser-classic-mmorpg-ui.cjs`, `tests/browser-classic-rebirth-v2.cjs` | Regressions at 1194×834, 1024×768, 1180×600 and companion sizes |
| Skill XP notifications only for successful work, level-up banner and capped future previews | `tests/browser-classic-skill-xp.cjs`, `tests/skill-cap-preview.test.js` and `tests/skill-cap-future-preview.test.js` | Actual simulator-derived skilling events; no combat XP presented as skilling |

## Explicit go/no-go conditions

- [ ] All relevant automated Core, Classic, Greenwood, Rebirth and First Adventure jobs **finish successfully**. No cancelled/skipped/failed critical checks described as green.
- [ ] Review by an independent engineering/QA function **or a new explicitly scoped human waiver** from the Game Director. The October 28 waiver was release-specific and does **not** automatically apply.
- [ ] Merge PR #188 into `dev` only after those gates.
- [ ] Publish only `/oakrest-dev/` using the Cellbound bridge's exact reviewed merge SHA; verify full hosted build metadata/assets, save/reload, adventure and eight quick slots.
- [ ] Host-side public snapshot check confirms `/oakrest/` unchanged.
- [ ] Record hosted SHA, deployment job, iPad status, remaining defects/risks and rollback SHA. *Until then Block 1 is not marked completed or deployed.*

## Open experience limitations

- A real iPad Safari play session remains required to establish touch comfort, hand feel, viewport visibility, stall behaviour and a genuine 60 FPS baseline.
- A natural-duration new-player playthrough is a separate human experience check, not a substitute for accelerated reward correctness.
- Performance under long play sessions and maximum inventory/large-world encounters requires device profiling; avoid claiming a frame-rate target is met from Linux SwiftShader results.
- Later world, profession, economy, combat mastery and multiplayer feature growth belongs to separate roadmap blocks, not this reliability-focused PR.

**Rollback:** If a future development release fails, repin the Cellbound development-only bridge to the last *compatible* verified `dev` commit; don't erase character localStorage or change the public target.