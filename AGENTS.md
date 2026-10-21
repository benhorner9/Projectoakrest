# Project Oakrest — instructions for AI contributors

Read this file before editing Oakrest, along with `docs/AI_STUDIO_CHARTER.md`, `docs/AI_STUDIO_AUDIT_2026-10-21.md`, and the relevant issue.

## Product and safety contract
- Game Director (human) sets product direction and authorises public release. AI contributors are specialist roles, **not continuously running employees** or separate GitHub accounts.
- Three.js, third-person low-poly fantasy, classless Melee/Magic/Ranged progression, and landscape iPad Safari as the priority device. Preserve existing game systems and saves; favour a cohesive, lived-in starter area before speculative endgame scope.
- Never introduce arbitrary item rarity colours or developer-defined prestige tiers. Do not implement unapproved gameplay features in a quality/refactoring task.
- Player progression aims for meaningful long-term level-99 mastery. Do not casually change combat XP, Woodcutting XP, equipment requirements, hit rates or resource economy without balance evidence.
- Existing browser-local character saves and dev/public save namespaces must remain compatible. No blanket localStorage clearing or save-key migration without explicit plan and tests.
- Never place FTP credentials or secrets in Oakrest, CI logs or PRs.

## Git and release contract
- `dev` is the current integration branch. Start **each** implementation from the latest `dev` on a dedicated issue-scoped branch: `ai/<role>/<issue-number>-short-topic`.
- Open a PR against `dev`, never `main` by default; no direct development pushes to `dev` or `main`.
- One issue/PR owner (role) plus an independent review **function**: engineering review for mechanics/physics, UX review for controls, QA for every PR. A single AI session cannot impersonate an independent GitHub reviewer.
- Do not merge with failed, cancelled, skipped or missing critical checks and call it “green”. If necessary request human waiver with named risks; never self-waive.
- Development host: `https://playcellbound.com/oakrest-dev/`; public host: `https://playcellbound.com/oakrest/`. Do **not** use Vercel. Merging to dev is not proof of deployment. The deployment bridge is documented in `docs/development-deployment.md`; verify pinned commit and hosted assets.
- Absolutely no public deployment or `main` promotion without the Game Director's explicit approval.

## Definition of Done
1. Issue links clear acceptance criteria, owner, dependency and touched files.
2. Changes are narrow; no unrelated redesign or feature creep. Explain interactions with other systems.
3. Run `npm ci --ignore-scripts`, `npm run check`, `npm test`, `npm run build`. Run applicable Chromium flows, particularly `tests/browser-smoke.cjs`, `tests/browser-town.cjs`, `tests/browser-equipment.cjs`, `tests/browser-auto-combat.cjs`, `tests/browser-ipad-creator.cjs` and affected suites. Report actual results; unrun tests are “not verified.”
4. CI core gate succeeds and the existing Greenwood regression/release workflow is fully evaluated, or outstanding blockers are explicitly documented and no merge occurs.
5. For animation, touch controls, visual quality and performance, gather real iPad Air 13-inch Safari checks before final experience signoff. A desktop Chromium touch-emulation result is **not** a physical iPad result.
6. PR includes before/after evidence where visual, save-compatibility and performance notes, rollback note, and QA review.

## Work allocation
- Tech: rendering, physics, builds, hosting/release integration, architecture and perf.
- Gameplay: combat systems, skills, progression, monsters and economy balance.
- World: towns, terrain, building exteriors/interiors, NPC life, environment.
- Animation: rigs, attacks, weapon tells, hit response, readability and VFX.
- UX: HUD, inventory/equipment, keyboard/touch/controller, accessibility.
- QA: scenario matrix, reproducibility, browser evidence, release gates and defects.
- Coordinator: prioritises cross-role work, resolves conflicts and reports truthfully to Game Director.

Do not create fake AI identities, fake approvals or claim background agents are active. Specialist role instructions are reusable for future ChatGPT Work/Codex/GitHub tasks.
