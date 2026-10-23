# Foundation QA evidence — not final overhaul acceptance

## Reproducible commands

```
npm ci --ignore-scripts
npm run check
npm test
npm run audit:visuals
npm run build
node tests/browser-visual-foundation.cjs
node tests/browser-held-assets.cjs
node tests/browser-smoke.cjs
node tests/browser-animation-inspector.cjs
```

Browser evidence lands under `qa/visual-foundation/`: each family PNG, ensemble/interior/side/rear PNGs, original/candidate greatsword comparison, WebM sequence, `results.json`, and `asset-audit.json`. CI uploads `qa/` as an artifact. The screenshot test is evidence capture and numeric validation, not an automatic perceptual signoff or a calibrated pixel-diff baseline.

## What the automated checks prove

- Canonical joints/sockets exist; both hands reach intended targets on transformed actors; no bone stretching or simulation-root movement.
- Explicit interruption priorities, timestamp boundaries and neutral knee reset; repeated fixed samples do not accumulate offsets.
- Bow hand follows nock; string and arrow agree; projectile release hides the nocked arrow in the candidate.
- Equipment re-equip retains physical palms/fingers and detaches old props.
- Existing regression suites remain the authority for saves/gameplay. No new assertion claims the whole game is unchanged just because a reference page has no save access.
- The standalone browser scene has no uncaught errors/missing assets in a successful run, samples all 56 metadata entries and the nine profiles, and checks GPU geometry count across repeated swaps.

## What remains unproven

Complete art quality, anatomical fitting of imported item grips, all actual gameplay ability animations, shield compatibility, all 16 interiors, pathfinding after migration, full-world frame times, Safari/WebKit compatibility for the new candidate, physical touch controls, and long-run memory stability. The browser reference metric is a short software-GPU sample, not a hardware benchmark. Renderer geometry/texture counts are not total GPU memory. Browser heap reporting, where available, is not a leak proof.

## Visual review findings

Initial front view revealed an inverted sword wind-up despite passing contact checks; candidate weapon pitch was corrected. Subsequent code review found off-hand clearing removed candidate palm meshes; the equipment socket now sits below the hand with an explicit regression. Bow limb, string and nock were put into common grip coordinates. Final family/ensemble captures still require a complete human motion review. Primitive construction, rigid armour and incomplete unique choreography remain explicit open defects.

## Physical iPad Safari procedure (not performed)

1. Record iPad model, iPadOS/Safari version, orientation, viewport, quality preset, power mode and tested commit. Keep existing saves; use a separate test character without clearing website data.
2. Open the deployed reference page at `/oakrest-dev/visual-reference.html` once this candidate is reviewed and deployed. Inspect every weapon from front/side/rear while idle/walking/running, at wind-up/contact/recovery, and during repeated equipment changes. Scrub then resume; inspect palms, fingers, wrists, bowstring, arrow and second-hand support.
3. Compare player, civilian, creature and house/interior together. Judge face/armour proportions, palette, material response, ground contact, door scale, camera and silhouettes at ordinary game distance. Reject visible mismatch, not merely technical errors.
4. After candidate integration, play the real game: joystick movement + style swap + camera drag; every ability; interruption/dodge/damage/death; all three loadouts; banking/shop/Examine/drop/pickup/save/reload; every building door and interior; resource approach/chop/contact.
5. Measure at least 60 seconds each in empty outdoors, populated town, interiors, multiple NPCs, combat VFX, repeated switching, gathering, and town/wilderness transitions. Report mean/p50/p95/p99 frame times, stalls, inputs and thermal behaviour. Run a 20-minute traversal/combat/menus soak and compare memory/resource observations before/after.
6. Record failures with build ID, precise action, family/ability, timestamp and screenshot/video. Keep unresolved acceptance boxes open. Physical-device signoff belongs to the actual tester.

## Local execution results

Results are recorded below after actual runs; interrupted attempts do not count as passes.

| Check | Actual result |
|---|---|
| Locked dependency installation | Passed (`npm ci --ignore-scripts`) |
| Source syntax | Passed |
| Unit/regression suite | 253 passed, 0 failed |
| Static build/cache checks | Passed; 2 build checks |
| Visual asset audit | Passed: 36 files, 10 glTFs, 57 icons, 56 specs, 0 errors |
| Standalone Chromium reference | Passed: 602 samples, 56 spec entries, 9 profiles, save isolation and repeated-swap GPU geometry check |
| Retained imported meshes | Passed: seven actual sources, expected adapters, stale-request protection and procedural fallback; screenshots under `qa/visual-foundation/imported/` |
| Live-game Chromium smoke | Failed locally before QA initialisation: browser/page closed at `browser-smoke.cjs:28`. No live-game pass is claimed. Baseline comparison investigated separately. The first published revision passed this check in GitHub CI. |
| Existing animation inspector | Local attempt ended with browser/page closed; first published revision passed in GitHub CI |
| Complete CI matrix / independent QA | First published revision core passed; complete matrix and latest revision must be checked separately. Independent review not performed. |
| WebKit / physical iPad / desktop Safari | Not tested |
| Development deployment | Not performed |

Short reference performance sample after silhouette revision: Chromium 134.0.6998.35, Linux headless, SwiftShader software GPU, 1366×1024 viewport with touch emulation and video capture. Measured **2.15 FPS mean**, **464.27 ms mean frame interval**, **1233.40 ms p95**, **1233.40 ms p99**; sampled ensemble reported 234 draw calls / 12,964 triangles. Browser-reported JS heap was approximately 13.4 MB used / 14.3 MB total. These are measured diagnostics under software rendering, not an iPad result, representative final-game benchmark, or 60 FPS pass. Capture overhead and simultaneous validation activity prevent a controlled frame-time comparison. No final performance gate passes on this evidence.

See [machine-readable metrics](evidence/reference-metrics.json), [original greatsword](evidence/before-greatsword.png), [candidate greatsword](evidence/after-greatsword.png), [bow](evidence/bow.png), [ensemble](evidence/ensemble.png) and [interior](evidence/interior.png). The local WebM and complete family captures are retained in `qa/visual-foundation/` and the CI artifact workflow collects that directory.

Baseline comparison: the untouched `530bed9ee6f810f4e683af174cce33cdf2ef0171` tree was checked out into a separate worktree and the same Chromium smoke was run with the same dependencies. It failed at the same initial QA wait with `Target page, context or browser has been closed`. This establishes that the local failure is reproducible before these changes; it does **not** establish successful live-game verification or identify the crash's root cause.

Imported-source visual inspection: rendered crossbow, greatsword and staff captures were inspected after loading their actual glTF geometry. The crossbow has a different source axis and now uses its own rotation. These captures expose remaining wrist/handle and pose-quality work; zero numerical socket residual is not evidence of final finger contact. Imported static meshes currently have no separately animated crossbow catch or magical focus.

First revision CI evidence: [core run 39940405005](https://github.com/benhorner9/Projectoakrest/actions/runs/39940405005) passed all steps at `77fbc85aad24ced727f1e7da6ffa1081c4e894c7`, including smoke, existing inspector and reference browser. This run does not cover subsequent imported-source additions.

CI infrastructure correction: bank run 39940405072 spent 6m30s downloading system packages, then its eight-minute job limit cancelled the bank walkthrough. The workflow now uses the runner system libraries, as core/Greenwood already do, with bounded Chromium installation and the unchanged full bank scenario. This fixes setup overhead; only a successful rerun establishes the bank check.

Silhouette revision: the same actor factory now uses authored tapered body, face/hair, limbs, belt, boots and fitted chest/leg armour for the candidate. The legacy caller retains its original shapes. Shared chest/pauldron material now matches the fitted leg armour. Staff ready stance was raised from a horizontal hold. The seven-source browser test and full unit suite passed after the principal geometry change; final reference capture covers the subsequent belt/material/stance adjustments. Hands, full outfit compatibility and human motion acceptance remain open.

## Grounding and timing continuation

The candidate now separates upper-body aim from pelvis rotation and uses explicit ankle pivots. New tests exercise stationary ground contact across all 56 specifications, transformed actor roots, constant bone lengths, forward/backward/lateral stance cancellation, starts/stops/turns, equipment interruptions, modest terrain steps and exact weapon contact during normal playback. The old whole-rig bow twist and wind-up/contact discontinuity were corrected. Boot meshes now follow ankles while greaves remain on shins.

Actual results for this continuation:

- Locked installation, source check, **263 unit/regression tests**, 36-file asset audit and 2 build checks passed.
- Chromium reference passed **818 samples**, all 56 specifications and nine profiles, with save isolation/resource-swap checks. Backward walk, both strafes and turning are now selectable. Rendered bow, greatsword and ensemble captures were inspected by the implementing session; this is not independent human motion approval.
- All seven actual retained source meshes passed loading, expected-profile selection, stale-request protection and fallback after the joint hierarchy change.
- A dedicated actual-game test is added for `?qa=1&visual-foundation=1`: movement during style change, retained facing, eight family release clocks, interruption, inventory and save reopening with the baseline renderer. Local Chromium closed during initial QA loading, before assertions; its CI result must be read from PR #83. The earlier untouched-baseline local failure remains relevant context, not a waiver for this new test.
- The short software-GPU capture had only **one usable interval after five warm-up frames** (783.4 ms). The report now explicitly says `insufficient-samples`, includes sample count/window and emits JSON-safe nulls for empty data. This is **not a usable performance benchmark** or evidence for the iPad target. Old 2.15 FPS diagnostic numbers above belong to the earlier silhouette capture and are not a current performance comparison.
- Default gameplay, existing regression workflows and public-path exclusion remain required. Review latest-head CI in PR #83; older green runs do not certify this revision.

For real-device review, use the reference first, then an isolated test character on the explicit candidate playtest URL. Do not interpret the flag as a completed migration. Real projectile spawning still follows the existing hand-offset/obstruction logic; canonical muzzle calibration, all ability choreography and shield combinations remain open.
