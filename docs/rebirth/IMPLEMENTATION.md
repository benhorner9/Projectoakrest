# Oakrest Rebirth implementation evidence

This is a development-only implementation. It does not constitute physical iPad Safari experience signoff or a claim that every aspirational art and pacing target is finished.

| Block | Implemented | PR |
| --- | --- | --- |
| Integration prerequisite | Preserved deployed Classic stack in dev; fixed loan/bank/drop ownership; added browser acceptance gate | #110 |
| 1 — Art direction | Forest palette, varied terrain, organic road verges, inset plaza paving, lower default camera, bounded rendering density | #111 |
| 2 — Village and wilderness | Furnished cutaway interiors, alder crowns, village architecture details, ambient citizen routines, gate ribbons and repeated-mesh batching | #113 |
| 3 — Character and animation | Attached mirrored weapon grip, distinct attack poses, unarmed hand, guardian/keeper silhouettes, health bar placement, bounded texture cache | #115 |
| 4 — Interface and controls | Ink/linen/fern UI, readable field notes, 44-pixel primary controls, independent joystick/action fingers, keyboard and cancelled-touch fixes | #117 |
| 5 — Playable adventure finish | Event-driven damage/healing labels, audio settings and cues, live gather/craft UI refresh, earned fresh-character equipment, full journey regression | Issue #118 |

The eight-quest adventure, gathering/crafting and four-room dungeon were retained from the existing deployed Classic stack and integrated safely. They are not represented as eight newly authored quests in block 5. Balance, hit rates and XP curves remain unchanged.

## Visual evidence

All captures are Chromium desktop/software rendering at landscape touch-sized viewports, not physical iPad Safari. The comparison frames use the same village position; the final UI comparison is block 4, while the completed journal includes block 5.

![Before](https://raw.githubusercontent.com/benhorner9/Projectoakrest/f0292814852cc37625266a0a4c95189252dd63a1/docs/rebirth/evidence/before.png)
![After blocks 1–4](https://raw.githubusercontent.com/benhorner9/Projectoakrest/f0292814852cc37625266a0a4c95189252dd63a1/docs/rebirth/evidence/after.png)
![Bank cutaway interior](https://raw.githubusercontent.com/benhorner9/Projectoakrest/f0292814852cc37625266a0a4c95189252dd63a1/docs/rebirth/evidence/bank-interior.png)
![Weapon poses](https://raw.githubusercontent.com/benhorner9/Projectoakrest/f0292814852cc37625266a0a4c95189252dd63a1/docs/rebirth/evidence/weapon-poses.png)
![Completed adventure](https://raw.githubusercontent.com/benhorner9/Projectoakrest/f0292814852cc37625266a0a4c95189252dd63a1/docs/rebirth/evidence/completed-journal.png)

## Verification scope

Local block 5 unit run: 358 passed, zero failures/skips/cancellations. Source parse and build passed; two cache/asset build tests passed. Visual asset audit: 36 files, 10 glTF models, 68 icons, 56 animation specifications, zero errors. Final exact remote CI and deployment status is recorded in the PR and delivery report, not inferred from these local results.

Independent QA exercised fresh creation, all eight quests, real gathering and crafting, all six dungeon enemies in four rooms, a halfway reload, final reload, reward-once protection and a clean paid repeat expedition. The browser test uses seeded varying randomness, accelerated real simulation and QA teleportation; it does not prove natural quest duration, balance or navigation quality. Separate camera/navigation/input suites cover movement. Earlier harness attempts failed or were cancelled while fixing RNG, gathering retries, food cooldown and supplies; they are not counted as passes.

Save verification includes bank-only starter ownership, rejected practice-weapon deposits, earned drops replacing loans, source-save immutability, conflict protection, per-character development/public namespaces, XP/inventory/bank/quest/dungeon round trips, and earned training gear after reload. No save-key migration or blanket storage clear was introduced.

Performance observations: 1,125 repeated static meshes consolidated into 12 batches; sampled village 128 draw calls / 27,081 triangles; near woodland 121 / 27,419; deep woodland 141 / 26,236. Sprite cache stress stays at or below 256 entries. These are scene counts in software Chromium, not device FPS or a measured hardware speedup. The framebuffer policy caps DPR at 1.5 and targets 1.5 million pixels; its minimum density of .75 means very large displays can exceed the nominal budget.

## Remaining validation and scope

Physical iPad Air 13-inch Safari testing: none of the five blocks. Playwright WebKit and Chromium touch emulation are separate software evidence only. Natural 2–4 hour progression pacing, speaker quality, sustained hardware frame rate, touch ergonomics and thermal behavior remain unverified. The new art direction is a coherent foundation within the existing 2.5D engine, not a complete bespoke asset replacement. Existing static architecture and the established item/XP economy remain.

## Safe release and rollback

Integrate only after exact-head Core, Greenwood, Classic, Rebirth, Adventure and Visual checks succeed, including inspection of potentially non-blocking WebKit steps. Use only the Cellbound bridge pinned to the reviewed dev merge SHA. The bridge checks every hosted file and fingerprints production before/after. Roll back development by pinning the previous compatible reviewed SHA; application rollback does not roll back browser saves. Never promote main or upload /oakrest/ from this work.
