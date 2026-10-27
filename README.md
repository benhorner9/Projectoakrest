# Project Oakrest — Classic

Oakrest now has **one active game**: Oakrest Classic, a lightweight elevated-camera 2.5D fantasy browser RPG. The separate third-person 3D prototype has been retired. The Classic world still uses Three.js/WebGL to render low-poly terrain and environments; removing the old game does **not** mean removing its renderer.

**Development:** https://playcellbound.com/oakrest-dev/  
**Production (separate release, not updated by dev):** https://playcellbound.com/oakrest/

The development home URL redirects directly to `classic.html`. No mode switch or extra launcher is required.

## Core gameplay

- Keyboard, mouse and touch movement; orbiting elevated camera and minimap.
- Separate Melee, Magic and Ranged loadouts, skills, equipment and progression.
- Single-panel gear, inventory and bank management with shared accessories and no duplicated equipped items.
- Auto-combat, abilities and eight configurable quick slots, items, gathering, crafting, quests and the first adventure/dungeon.
- Browser-local character saves with separate dev and production namespaces. There is no account-based server persistence or public multiplayer yet.

## Local development

```sh
npm ci --ignore-scripts
npm run check
npm test
npm run build
npx playwright install chromium
node tests/browser-classic-dev-launch.cjs
node tests/browser-classic.cjs
node tests/browser-classic-equipment-ui.cjs
node tests/browser-adventure-complete.cjs
```

Run `npm run dev` and open `http://localhost:5173/` (redirects to Classic). Never test save migrations by clearing real browser storage.

## Quality, review and deployment

Changes start from `dev` in an issue-scoped branch, reviewed through a PR. CI should exercise the Classic game rather than historic third-person scenarios. Keep all mechanics, assets, save behaviour and iPad Safari compatibility that Classic uses. Real iPad landscape Safari validation is mandatory for final hardware signoff; desktop WebKit or Chromium emulation alone does not establish it.

The shared-host bridge documented in [docs/development-deployment.md](docs/development-deployment.md) deploys reviewed commits **only** to `/oakrest-dev/`. Changes to production require separate explicit approval. Three.js remains bundled locally, without a runtime CDN.

See [AGENTS.md](AGENTS.md) for the contributor contract and [docs/first-adventure.md](docs/first-adventure.md) for gameplay scope.
