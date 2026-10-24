# Oakrest Classic — orbit camera controls (desktop keyboard and iPad Settings)

## New controls

- **Left / Right arrows:** orbit the elevated 2.5D camera continuously around the player through all 360°.
- **Up / Down arrows:** raise or lower the look angle; clamped from 25° to 78° (no underground view or exact top-down gimbal).
- **WASD / existing touch joystick:** move relative to the **actual camera direction**, not the old hardcoded northward offset.
- **Home:** restore the original oblique Classic view.
- **Settings → Camera:** four 44px-class arrow controls and a reset button, usable on iPad without a hardware keyboard.
- **Wheel and zoom buttons:** continue using the independent orthographic zoom; rotation does not affect save or combat state.

## Integration correctness

- Only arrow keys steer the camera. They are no longer aliases for WASD.
- Live orbit offset flows into the camera position, the hero/NPC's 8-way sprite facing, joystick/WASD screen basis and corner minimap transform.
- Full map remains north-up and its destination clicking stays in world coordinates.
- The hero remains centred during rotation, and static minimap assets stay cached instead of rebuilding terrain every frame.
- The old default angle is pixel-compatible with Classic before the first arrow input.
- Nothing new is saved; the camera is transient. Returning to Classic resets to the known default.

## QA

- `tests/classic-camera-orbit.test.js`: 360° continuity, pitch limits, default preservation, movement and minimap inverse mapping, sprite direction and Home-style reset.
- `tests/browser-classic-camera.cjs`: keyboard turn/tilt with immobile hero, walking in the rotated view, minimap parity, Settings tap buttons, Home reset and unchanged localStorage.
- Full unit, syntax, build, browser checks and physical iPad Air landscape signoff remain required.

## Dependency and release

Branch is stacked on Classic creator and village PR #100; apply on top after it. Do not merge stale stacks directly into public. Dev release through the isolated Cellbound FTPS bridge after complete checks, verifying `/oakrest-dev/build-meta.json` SHA. Public `/oakrest/` remains untouched.

## Rollback

Revert this branch only: fixed original `CLASSIC_CAMERA` offset remains the fallback. No player saves or equipment/XP migrations.
