# Hollow Creek Breach

An original browser tactical shooter with armed AI bots, destructible barricades, soft-wall penetration, glass breaking, leaning, crouching and a five-minute room-clearing objective. No multiplayer or external game service is required.

Play: https://scottthedreamer-source.github.io/Hollow-creek-breach/

## Maps and kits

- **Hollow Creek Farmhouse:** the original two-storey house and garage, with stairs, windows and multiple breach points.
- **Blackwater Depot:** a single-storey loading facility with an open transit aisle, dispatch/storage bays, cargo cover and connecting arches.
- **Ridgeway Annex:** six offices joined by a central corridor and internal doors, with desks, chairs and records cabinets.

Every map has 9 / 12 / 15 armed bots on Recruit / Regular / Veteran. Map changes reload the scene; loadout and difficulty selections persist. Best times are tracked separately for each map and difficulty.

Choose **Assault** (30-round balanced carbine), **Entry** (40-round fast SMG), or **Marksman** (20-round high-damage semi-auto rifle). All include a 15-round P-9 pistol, two frags and a light. The primary uses a resized version of the original weapon model; rates of fire, damage, recoil, range, magazines and reload times differ.

## Xbox controller

Designed for standalone Microsoft Edge on Xbox. Allow Edge to use the controller for the game when prompted; enter its game-controls mode if the sticks move the browser cursor instead. A physical Xbox console has not been available for verification.

| Action | Button |
| --- | --- |
| Move / look | Left / right stick |
| Shoot / aim | RT / LT |
| Crouch | LB |
| Reload | X |
| Toggle lean left / right | Click left / right stick |
| Switch primary / pistol | Y |
| Vault / melee | A / B |
| Frag | RB |
| Light / fire mode | D-pad up / left |
| Pause | Menu |

Push the left stick fully forward briefly to sprint. Clicking the same stick again cancels that lean. Disconnecting the controller pauses an active match and clears held inputs.

**Briefing menu:** D-pad up/down selects threat, map, loadout or graphics; left/right changes the highlighted selection. RB cycles gun loadouts. A deploys. X cycles display modes. In the pause menu, A resumes, Y restarts, B returns to briefing, and D-pad up/down selects graphics quality.

Keyboard/mouse: WASD, Shift sprint, mouse fire/aim, Q/E lean, C crouch, R reload, 1/2 weapon, Space vault, V melee, G frag, F light, B fire mode, Esc pause.

## Graphics and Xbox limitation

An existing Xbox white-screen issue is documented in `CODEX_HANDOFF.md`. New **display mode 7: Xbox compatibility** replaces Standard materials with simpler Lambert lighting, removes the custom sky shader, disables tone mapping and uses linear output. New Xbox sessions default to this mode; a previously saved mode is preserved. Select it directly with `?gfx=6`, or cycle with X on the briefing/pause screen. Low quality limits pixel ratio and lights.

Chromium software-WebGL tests render all maps in standard and compatibility modes. This does **not** establish that the Xbox compositor/driver issue is fixed; test on the target console and inspect the pause-screen diagnostics if the view is still white.

## Development and checks

No dependencies or build step are needed to serve the game:

```sh
python3 -m http.server 8000
```

Open the served page in a desktop browser or serve over HTTPS for an Xbox. Three.js r128 (MIT) is bundled locally as `three.min.js`; textures and game sounds are generated in code.

Browser regression checks require Node, Playwright and Chromium:

```sh
node tests/smoke.cjs
```

Use `CHROMIUM_PATH` to override `/usr/bin/chromium`; optionally use `SMOKE_MAP=annex SMOKE_GFX=6` for a focused run. Checks cover map startup, valid spawns, reachable positions on the new maps after breaching, loadout stats, controller fire/reload/crouch/lean/swap/pause/menu behavior, bot hit detection, disconnect safety and rendered pixels. Controller events are simulated; physical console testing remains separate.

GitHub Pages serves `main` / root and rebuilds after pushes.
