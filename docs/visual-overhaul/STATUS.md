# Definitive visual overhaul — delivery and outstanding-work register

Initiative: [#82](https://github.com/benhorner9/Projectoakrest/issues/82). Branch: `ai/animation/82-visual-foundations`. Baseline: `530bed9ee6f810f4e683af174cce33cdf2ef0171`.

**The complete overhaul is not finished, merged or deployed.** This change is a reviewable first foundation within the one production initiative. The live game remains on its existing renderer. No public release was attempted. Do not close #82 on the basis of this PR.

## Completed and technically verified

- Current dev and rollback/deployment marker inspected; repository instructions and deployment bridge read.
- Repository asset categories classified; retained accessory licences and source records inspected; no new third-party pack added.
- Candidate Art Bible and pipeline standards written, with explicit unapproved status and scope limitations.
- Canonical named joints and a single shared actor factory extended with an explicit candidate mode.
- Weapon control, primary/secondary grip constraints, draw-hand target and muzzle definitions for eight combat families plus woodcutting axe.
- Two-bone arm reach solver tested against world-space hand contact, actor rotation/scale, all 56 existing animation specifications and repeated timeline samples. Bone lengths, gameplay root and facing remain unchanged.
- Bow mesh/string/grip alignment, nocked-arrow release visibility and genuinely shorter wand in the candidate; live item meshes are not silently replaced.
- Reference scene includes the real actor factory, an unarmed same-rig civilian, boar, actual building/interior code, trees, common lighting, alternate views and original-motion comparison.
- Explicit per-source imported mesh transforms and reference toggle added; seven actual retained sources pass load/profile/swap/fallback checks. Human fitting and live migration remain pending.
- Asset audit validates 36 local files, 10 current glTFs, 57 icon definitions and 56 metadata specifications; emits hashes and full spec records.

## Implemented, awaiting acceptance

- Candidate complete-pose driver and state precedence; hand contact is numeric evidence, not final animation choreography approval.
- Revised head/jaw/shoulder proportions and simple fingers; deliberate face/armour modelling and silhouette review still needed.
- Basic walk/run, idle, ready, reaction, death and work pose presentation; start/stop, turns, strafing, full recovery blending and feet require further work.
- Browser reference coverage and evidence are specified in `QA.md`; consult actual reported results, not this inventory of implementation.

## Known defects / release blockers

| ID | Finding | Required resolution |
|---|---|---|
| VIS-01 | Original body still visibly constructed from primitives; current armour is rigid overlay geometry. | Finish canonical model and fit all actual wearable combinations, then human visual review. |
| VIS-02 | Live imported held items still use a generic normalized-height offset. | Candidate per-mesh transforms now load in the reference, including corrected crossbow source axis. Finish human handle fitting, reload/focus part animation and every-state visual review before live migration. |
| VIS-03 | Candidate ability cues do not yet provide fully distinct, final choreography for every mechanic. | Author/review each current ability, especially defence, healing, multi-shot and paired dagger strikes, against real event timing. |
| VIS-04 | Candidate muzzle is diagnostic; real projectile spawning still uses the live hand offset. | Integrate into actual combat only with obstruction/range/trajectory regression; no purely visual authority. |
| VIS-05 | No complete foot IK, movement-start/stop or turn-in-place set. | Ground-contact and movement transition work without moving simulation root or changing controls. |
| VIS-06 | Shields, dual wield/off-hand conflicts, full nine-slot outfits not certified. | Complete compatibility/clip matrix and modular fitting. |
| VIS-07 | Town, civilians, creatures, gathering and world have not been migrated to the candidate. | Pass character/weapon gate first; preserve all entrances, services, routes, collisions and progression. |
| VIS-08 | Performance of the assembled final game on actual iPad is unknown. | All eight representative scenarios, sustained frame-time/memory/input measurements on physical Safari. |
| VIS-09 | Retained derived KayKit curves lack a reproducible source-binary hash record in this tree. | Capture immutable original provenance/licence records or retire curves after accepted migration. |

## Blocked acceptance

- Phase 1–3 artistic acceptance is not established by code tests. The candidate remains a review asset.
- Independent QA and human visual review have not been performed. Repository `AGENTS.md`: “One issue/PR owner (role) plus an independent review function” and “A single AI session cannot impersonate an independent GitHub reviewer.”
- Physical iPad Safari is unavailable in this execution environment. `AGENTS.md` requires “real iPad Air 13-inch Safari checks before final experience signoff”; desktop emulation cannot satisfy it.
- Therefore no claim is made that foundation-dependent world replacement, complete overhaul acceptance or release approval has passed. This is a quality/review gate, not an assertion that hosting credentials are missing.

## Phase status

| Phase | Status |
|---|---|
| 1 Audit / art lock | Audit, standards and reference implemented; art lock pending |
| 2 Character / rig | Named candidate rig and partial model refinement; final anatomy/art pending |
| 3 Weapon handling | Procedural contact solver and seven imported source adapters tested; human fitting, shields and natural handling pending |
| 4 Movement | Candidate states present; complete transitions/feet pending |
| 5 Combat animation | Existing 56 specifications audited; final per-ability choreography/integration pending |
| 6 Equipment/items | Existing catalogue preserved; seven candidate adapters present; complete new fitting and live integration pending |
| 7 Town | Existing actual shell/interior reference retained; redesign pending foundation gate |
| 8 NPC/creatures/professions | Unarmed canonical reference only; live migrations pending |
| 9 Render/camera/polish | Reference lighting and measurement tools; full-world polish pending |
| 10 QA/deployment | See actual QA results; full acceptance, merge and hosted deployment pending |

## Future optional content

Mining, Hunting, Blacksmithing, Inscription and Potioncraft are mentioned as future professions in current onboarding code; do not invent functioning workstations during this visual scope. Add their animation adapters with the real mechanics later. Likewise no new equipment tiers, network PvP, accounts, progression rules or rarity grades are introduced here.

## Release path and rollback

Finish/review the canonical foundation and required regressions. PR targets `dev` only. Never merge with failed/missing critical checks or represent author review as independent approval. Once accepted, pin the exact reviewed merged SHA in `benhorner9/Cellbound` branch `deploy/oakrest-dev-20261020`, workflow `.github/workflows/deploy-oakrest-dev.yml`. Verify `/oakrest-dev/build-meta.json` and assets after upload. Public `/oakrest/` stays separate.

Current observed hosted marker is `e78024717a74fcd47a0b618dd3c9aa4f9c5d4dff` (rollback baseline), not this candidate. A future rollback can revert this foundation commit without save migration; the candidate is opt-in and never writes player data.

Local validation summary: 253 unit tests and static build passed; reference browser passed 602 samples. The live-game smoke/old inspector did not pass locally (browser/page closes during initialisation), the first published revision passed those same checks in GitHub core CI. New commits must pass again. See `QA.md` for exact evidence and limitations.
