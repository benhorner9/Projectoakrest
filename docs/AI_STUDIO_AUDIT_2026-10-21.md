# Oakrest AI Studio — Initial quality audit

**Date:** 21 October 2026  
**Audited reference:** `dev` `1e67d113c2` (21 Oct 19:59 UTC)  
**Nature of audit:** Repository structure, GitHub PR, CI metadata and selected source/test/document review. **Not** an end-to-end runtime playthrough, new CI execution, real iPad session, or fresh development-host deployment.

## Verified baseline
- `main` at `ed8a1a1fd9`; `dev` is **187 commits ahead, 0 behind** at the reference SHA. Public and dev must remain distinct.
- `package.json`: Node tests (`npm test`), parser check (`npm run check`), static build (`npm run build`), and Playwright browser tests. Multiple targeted gameplay/browser regression files exist, including Combat Reborn, auto-combat, town, equipment, creator, controller, release and Woodcutting.
- Static site served from shared hosting. The dedicated development deployment bridge pins an Oakrest SHA in the separate Cellbound repository; an Oakrest GitHub merge does not prove the site was updated.
- Open PRs at audit: #1 Greenwood overhaul (draft, targets `main`), #2 Greenwood QA (draft, targets #1's branch), #19 visual fidelity (draft, targets `dev`), #25 Woodcutting skills/side backpack (ready, targets `dev`). Review status and rebase conflicts before combining.
- Source contains independent `src/woodcutting.js`, `src/combat-physics.js`, `src/auto-combat.js`, `src/town-world.js` and many focused tests. Existence of a test is not proof it passed.

## Findings and prioritised assignments

| Priority | Finding and evidence | Owner | Required next result |
| --- | --- | --- | --- |
| **P0** | Latest `dev` Greenwood QA run [39666396936](https://github.com/benhorner9/Projectoakrest/actions/runs/39666396936) concluded **cancelled**. `built-release` was successful, including its WebKit step, but `regression-and-browser` was cancelled during **Combat Reborn real simulation scenarios** after ~15 minutes. Auto-combat and performance steps were skipped. Earlier reviewed `dev` runs also ended cancelled. The job has `timeout-minutes: 15`. | QA + Tech | Reproduce the long-running suite, isolate why it exceeds/cancels, remove hang or split suites, and obtain one complete passing integration run; do not call release green beforehand. |
| **P0** | Development deployment correctness is **not established by this audit**: pinned SHA, bridge workflow result and hosted asset/build metadata have not been checked here. | Tech + QA | Compare reviewed dev SHA to bridge pin and `/oakrest-dev/build-meta.json` after a reviewed release; never upload public assets. |
| **P1** | Existing `README.md` still calls Oakrest a 0.1 prototype and instructs deployment to Vercel, contradicting `docs/development-deployment.md` and the supported shared-host workflow. | Tech | Refresh README only after reconciling actual scripts, branch/release path and known limitations. |
| **P1** | Four open PRs span different bases and ages, including older #1 targeting `main` and dependent #2. Concurrent world/visual and Woodcutting/UI integrations risk overlapping central code. | Coordinator + Tech | Triage each: merge to dev after evidence, rebase/refactor, or close as superseded; do not blindly merge. |
| **P1** | `src/main.js` is a cross-system integration hotspot (combat, input, UI, town/world). The branch history and numerous overlapping branches signal conflict risk, but no defect is inferred solely from size. | Tech | Map module boundaries and identify low-risk refactor seams without gameplay changes or save regressions. |
| **P1** | Physical iPad Air 13-inch Safari gameplay, touch ergonomics, actual FPS, memory stability, visual quality and animation readability have not been established by this audit. Chromium emulation and CI WebKit are narrower evidence. | QA + UX + Animation | Device test sheet with genuine screenshots/videos, movement, camera, combat lock/swap, ability tells, full inventory/bank/shop and 20-minute soak; measure frame-time where possible. |
| **P1** | `docs/combat-redefined.md` explicitly describes hit/accuracy values as initial tuning; combat-level, 1–99 progression and skilling economy need balancing, not extrapolation from tests. | Gameplay + QA | Baseline target kill-times, accuracy/zero-hits, style fairness, XP/hour and 1–99 projections. |
| **P1** | Woodcutting implementation and tree-species tests are present in `dev`, but the uniform skill card + persistent side backpack is still **PR #25**, not verified merged. | UX + QA | Review PR #25 against current dev, test XP/unlock levels, the side-backpack with active movement/chopping, inventory persistence and iPad safe areas; gate merge on CI. |
| **P2** | `README.md` and development docs describe browser-local saves and no network authority/account/multiplayer. This is a **known prototype limitation**, not a new bug. | Game Director + Tech | Keep as explicit release-scope limitation; do not misrepresent as an MMO. |

## First studio iteration: ordered exit gates
1. **QA/Tech:** achieve conclusive end-to-end dev CI with no critical cancelled/skipped stages; preserve test and performance artefacts.
2. **Tech/Coordinator:** triage four outstanding PRs, check target branches and resolve stale conflicts.
3. **World/QA:** walkthrough: starter town footpaths, each door/interior, banker/shopkeeper, moving NPCs, collisions and monster placement.
4. **Gameplay/Animation/QA:** visually and functionally assess repeated basic attacks, weapon cadence, Melee/Magic/Ranged styles, abilities, telegraph differentiation, zero hits, target tracking and collision.
5. **UX/QA:** audit iPad 13-inch landscape movement+camera+abilities while skills/inventory is open; inspect #25 independently.
6. **Tech/QA:** only after an approved dev merge, verify shared-host commit/build and actual device runtime. No public deployment.

## Status of checks
- **Inspected:** code and test inventory, selected source/test files, current PR and CI metadata, deployment document.
- **Observed previously successful step in latest CI:** static build, parser/unit checks, Chromium smoke, town/equipment/creator/controller, built-release and CI WebKit step (per GitHub job record).
- **Blocked/unverified:** complete Combat Reborn browser integration, auto-combat browser integration, combat performance comparison in that run, physical iPad Safari, hosted dev version, actual player experience. This audit did not execute tests anew.
- **Audit rule:** A successful CI step is a narrower fact than a successful full workflow; never substitute one for the other.

## Source pointers
- [GitHub dev branch](https://github.com/benhorner9/Projectoakrest/tree/dev)
- [Latest audited workflow](https://github.com/benhorner9/Projectoakrest/actions/runs/39666396936)
- [Release instructions](https://github.com/benhorner9/Projectoakrest/blob/dev/docs/development-deployment.md)
- [Combat definition](https://github.com/benhorner9/Projectoakrest/blob/dev/docs/combat-redefined.md)
- [Current PR #25](https://github.com/benhorner9/Projectoakrest/pull/25)
