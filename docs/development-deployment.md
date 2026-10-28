# Oakrest development releases

Oakrest runs as static files on the Cellbound shared host. No Vercel service is needed.

- Source repository: `benhorner9/Projectoakrest`, branch `dev`.
- Development: https://playcellbound.com/oakrest-dev/
- Public: https://playcellbound.com/oakrest/ (separate release, never a dev target).
- Secure deployment bridge: `benhorner9/Cellbound`, branch `deploy/oakrest-dev-20261020`, `.github/workflows/deploy-oakrest-dev.yml`.
- Existing Cellbound repository secrets: `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`, optional `FTP_PORT`. Values stay in GitHub Actions.

## Publish an update

1. Open a PR against Oakrest `dev`. Keep existing saves and completed systems. Review the unit, syntax, build and Chromium checks. The WebKit diagnostic records compatibility separately; a physical iPad is still required for hardware-specific behaviour.
2. Merge only into `dev` after required checks pass.
3. Update `OAKREST_COMMIT` in the deployment bridge to the exact reviewed dev commit and push that bridge branch. This is the deliberate handoff between repositories: the hosting credentials are not available in Oakrest, and no cross-repository automation token is currently configured.
4. The Classic bridge correction verifies that the pin belongs to `dev`, runs QA, creates `dist/`, and stamps it with `node scripts/stamp-development-release.mjs`. The stamp rejects a different checked-out SHA or a build containing the retired `src/main.js`. It fingerprints the public site, uploads **only** `./oakrest-dev/` over FTPS, verifies the exact hosted commit and all public build files, then runs the normal Classic entry flow. A push to `dev` alone runs QA; it does not implicitly publish production.
5. Check the successful action run and `/oakrest-dev/build-meta.json` commit before testing. HTML, JavaScript, CSS and JSON revalidate on the host; imports and styles also carry an asset fingerprint.

## Local checks

```
npm ci --ignore-scripts
npm run check
npm test
npm run build
npx playwright install --with-deps chromium
node tests/browser-classic-dev-launch.cjs
node tests/browser-rebirth-world.cjs
node tests/browser-classic-equipment-ui.cjs
node tests/browser-classic-creator.cjs
node tests/browser-classic-camera.cjs
node tests/browser-classic-free-combat.cjs
node tests/browser-classic-combat-overhaul.cjs
node tests/browser-classic-combat-impacts.cjs
node tests/browser-adventure-complete.cjs
```

`browser-classic-dev-launch.cjs` serves the **built** files under `/oakrest-dev/`. For the hosted equivalent, set `OAKREST_TEST_URL=https://playcellbound.com/oakrest-dev/` and `OAKREST_COMMIT` to the full pinned SHA. It verifies normal entry without QA, query/hash preservation, creation, identity, touch controls, earned onboarding gear, three-style contact, banking and reload. QA helpers accelerate travel and simulation after creation; this is not a natural-duration player playthrough. The `?qa=1` inspection hooks are available only on localhost and the dev path; they are not enabled on `/oakrest/`. Tests use an isolated browser context and only its own local saves.

`scripts/verify-hosted.mjs` requires `OAKREST_COMMIT` and matching local stamped metadata. It rejects stale hosted metadata, changed asset bytes, invalid module MIME types, HTTP errors and redirects. Public deployment paths are rejected. The bridge correction is delivered in a separate Cellbound PR; its presence in Oakrest does not mean that bridge PR was merged or a release occurred.

## Saves and limitations

Saves are browser-local, per character. `/oakrest-dev/` uses `oakrest-dev-*` keys; public retains the existing `oakrest-*` keys. The native character screen uses the same separation. Clearing website data removes those local saves; there is no server account/login or cross-device save service in this prototype.

Starter arrows are a reusable quiver, as in PR #4. The bank stores spare equipment; remove it from every preset first. Item ownership is represented once in the bag or bank, with equipped slots referencing that ownership.

## Recover a failed upload or roll back development

Stop if the target is anything except `./oakrest-dev/`. Never use a clean-slate upload, repository-wide sync, public folder or Cellbound game folder.

Repoint `OAKREST_COMMIT` on the deployment bridge to the last successful **compatible** dev commit and push. This rebuilds and uploads that release to the development directory and repeats verification. The action retains its build artifact for recovery. If an upload was interrupted, re-run the same bridge release after checking its pinned commit; do not assume success from a GitHub merge alone. An application rollback does not roll back local saves: avoid versions older than the save schema in use, or export test saves before an intentional schema downgrade.

Public promotion needs separate approval and a separate workflow. This development workflow never uploads to `/oakrest/` and checks its file hashes before and after release.
