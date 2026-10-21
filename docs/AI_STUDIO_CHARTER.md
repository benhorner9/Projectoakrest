# Oakrest AI Studio — Team Charter
Established 21 October 2026. **Working agreement, not a claim of six active autonomous agents.**

## Leadership
**Game Director:** human project owner; owns game vision, acceptance of player-facing design, priorities and public release approval.

**Studio Coordinator:** AI-assisted planning and integration; maintains ordered backlog, maps issues to specialists, checks dependency order, collates QA evidence and escalates unresolved conflicts. The coordinator does not bypass PR review or release safeguards.

## Six specialist roles

| Role / issue prefix | Owns | Must consult |
| --- | --- | --- |
| Technical Director — `[TECH]` | Three.js architecture, performance budgets, collision/pathfinding, build tooling, shared-host releases, code health | Gameplay on physics/attack correctness; QA on testability |
| Gameplay & Systems — `[GAMEPLAY]` | Tribrid combat, targeting, equipment, skilling, 1–99 XP curves, monsters, crafting/economy design | Tech on implementation; Animation on telegraph timing; QA on simulation |
| World & Environment — `[WORLD]` | Lived-in Oakrest town, usable doorways/interiors, banker/shopkeeper/NPC routes, paths, terrain, art consistency | Tech on collisions/perf; UX on interact cues; QA on navigation |
| Character & Animation — `[ANIMATION]` | Rigging/motion, three style-specific attacks and abilities, readable PvP tells, hit responses, VFX and sound timing | Gameplay on contact windows; Tech on budgets; QA on visual checks |
| UI/UX — `[UX]` | iPad-first landscape UI, health HUD, minimap, tabs, equipment/inventory, skill cards, side backpack, controls | Gameplay on item/skill truth; QA on interaction journeys |
| QA & Balance — `[QA]` | Automated regression and browser suites, test plans, defect reproduction, perf/save/device signoff | Every authoring role; independent review of acceptance criteria |

Roles are **work queues and prompts**, not provisioned bot accounts. A specialist works only when a person invokes an AI coding session/Work task with its issue. Keep one implementer accountable for each PR; request cross-role review in the PR body.

## Delivery workflow
1. **Discover:** Read this charter, `AGENTS.md`, current dev state and relevant open PRs. Link issue, scope, acceptance criteria, risks and dependencies.
2. **Design review:** Gameplay/World/UX proposals affecting player experience go to Game Director before implementation. Preserve agreed decisions and distinguish proposals.
3. **Build isolated:** Branch `ai/<role>/<issue>-topic` from latest `dev`. Avoid working on the same core file in parallel unless interfaces and merge order are agreed.
4. **Validate:** Check/units/build, affected browser flows, save-key compatibility, three combat styles, iPad-sized screenshots and physical Safari test when appropriate. Attach evidence.
5. **Review:** QA independently tests; relevant counterpart reviews correctness/readability; coordinator checks cross-system regressions. A review by the same AI login is not independent approval.
6. **Merge to dev only:** All required CI must be conclusive, not merely initiated; failed/cancelled/skipped critical jobs block. Do not merge old unrelated stale PRs until rebased/re-audited.
7. **Deploy dev deliberately:** Follow `docs/development-deployment.md`, using the Cellbound deployment bridge and pinned reviewed commit. Confirm workflow run and hosted build-meta. Public release is separate and explicitly authorised.

## Priority and escalation
P0 = blocker to trustworthy tests, saves, core movement/combat, or safe release. P1 = visible usability/gameplay defects, major performance or world-cohesion regressions. P2 = polish/non-blocking work. A stopped CI run is **not** a pass. If QA cannot be completed, mark the PR blocked rather than guessing.

**Current first cycle:** restore conclusive CI; verify dev release; audit starter-town interactions; audit three-style combat and animation; validate iPad inventory/HUD/woodcutting; establish balance baselines. See `AI_STUDIO_AUDIT_2026-10-21.md`.

## Change control
Use GitHub issues and PRs as the durable handoff. Link issue → branch → PR → CI → reviewed dev SHA → hosted dev SHA. Do not promise continuous monitoring, automatic role handoff or unattended execution without a separate configured automation or actual agent runner.
