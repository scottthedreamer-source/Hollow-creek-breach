# Hollow Creek Breach: handoff brief

Paste everything below into Codex or ChatGPT.

---

## What this is

Hollow Creek Breach is a browser-based first-person tactical shooter in a "clear house" style. The player breaches an original two-storey farmhouse with an attached garage and kills 9, 12 or 15 armed AI bots before a 5:00 timer runs out. It is a single HTML file that uses three.js r128 (the global `THREE` build, no bundler). All textures and sounds are generated in code.

- **Repo:** https://github.com/scottthedreamer-source/Hollow-creek-breach (the capital H matters)
- **Live site (GitHub Pages, deployed from `main` / root):** https://scottthedreamer-source.github.io/Hollow-creek-breach/
- **Files in the repo:**
  - `index.html`: the whole game (HTML, CSS and JS inline)
  - `three.min.js`: three.js r128, self-hosted. `index.html` falls back to cdnjs if this file fails to load.
  - `.nojekyll`, `README.md`

## The unsolved problem: white screen on Xbox Series X

**Platform:** Microsoft Edge (Chromium) on Xbox Series X, with an Xbox controller.

**Symptom:** after pressing Deploy, the HTML HUD is visible and working (timer, hostiles remaining, health and ammo all update), and shooting, sounds and the controller all work. The whole 3D view behind the HUD is plain white.

**Diagnostics the user read off the in-game pause screen on the Xbox:**
- `Graphics: low · WebGL2 · null · 60 fps · Controller: Xbox 360 Controller (XInput STANDARD GAMEPAD) (standard)`
- WebGL2 context: created
- GPU string: `null` (WEBGL_debug_renderer_info gave nothing)
- Frame rate: a steady 60 fps, so the render loop runs and the renderer makes draw calls
- Controller: detected via the Gamepad API with standard mapping, so input works on the standalone site

**What has been tried already:**
1. Low-graphics mode, on by default when the user agent contains "Xbox": no shadow maps, pixel ratio 1, 3 point lights instead of 6, MSAA (`antialias`) off, `powerPreference: 'default'`. **Still white.**
2. Moving the game off claude.ai, where it ran in a cross-origin sandboxed iframe, onto its own GitHub Pages site. This fixed the controller but the view **is still white**.
3. A "display mode" switcher selected by the `?gfx=N` URL query or `localStorage` key `hcb-gfx`. Press X on the briefing or pause screen to step to the next mode. **The user has not yet reported which mode, if any, works.** The modes:
   - 0 Standard: WebGLRenderer, alpha false, sRGB output encoding, ACES tone mapping
   - 1 Transparent canvas: `alpha: true`, clear colour set opaque
   - 2 Keep frame buffer: `preserveDrawingBuffer: true`
   - 3 Copy to 2D canvas: renders to an off-DOM WebGL canvas and copies each frame to a visible 2D canvas with `drawImage`
   - 4 WebGL 1: `THREE.WebGL1Renderer`
   - 5 Plain colour output: LinearEncoding with NoToneMapping
4. The pause screen also reads one pixel with `gl.readPixels` after rendering and shows it as "drawn colour r,g,b". The user hasn't reported this value yet.
   - If it's a normal colour (for example a grey or beige like 224,211,189), the GPU is drawing the scene and the Xbox browser isn't compositing or displaying the canvas.
   - If it's 255,255,255, the shaders themselves are outputting white.

**Ideas not tried yet:**
- Get the "drawn colour" value from the Xbox to find out whether this is a compositing problem or a shader problem.
- If it's a shader problem, try replacing every `MeshStandardMaterial` with `MeshLambertMaterial` or `MeshBasicMaterial`. Also check the custom sky `ShaderMaterial`: it uses `pow()` on values that may be zero, which can give NaN on D3D/ANGLE. Then remove fog, bump maps, `PointsMaterial` with `vertexColors`, and the `Sprite` smoke one at a time to find the culprit.
- Try a different three.js version (for example r150+, where colour management changed) or a bare test page: one WebGL triangle, then a three.js cube, then the full scene.
- The canvas is `position: fixed; inset: 0` inside `#stage`, with HUD overlays on top of it. Check whether an overlay is painting white. The `#flashw` div is `background:#fff; opacity:0` and is unused, so delete it to rule it out.
- Check Edge on Xbox's handling of `devicePixelRatio`, very large canvases and HDR displays.

## Game design spec (keep this behaviour)

- **Map:** an original farmhouse, not a copy of any real game's map.
  - Ground floor: Study, Bathroom, Laundry, Back Hall, Kitchen, Living Room, Front Hall with stairs, Dining Room, and an attached Garage with a half-open roller shutter you crouch under.
  - Upper floor: Storage, Upper Hall, Kids Room, Master Bath, Guest Room, Master Bedroom.
  - Outside: a porch, a parked SUV at the insertion point, a shed, trees and a fence.
  - Units are metres. The house spans x 0–18 and z 0–12, the garage x 18–26 and z 0–9, the upper floor sits at y = 3.2, and the player spawns at (9, 0, 30) facing north (−z).
- **Walls and windows:**
  - Interior walls are "soft": bullets go through them with reduced damage.
  - Exterior walls are "hard".
  - Some doors are barricaded with wooden planks. Melee breaks them, gunfire wears them down, and grenades destroy them.
  - Windows have glass that shatters, and you can vault through the opening.
- **Bots:**
  - Most hold an angle on a doorway or the stairs. Some crouch, some peek side to side, and one roams the ground floor on a waypoint route.
  - Awareness builds while they can see you. It builds faster when you're close, moving or sprinting, and slower when you're crouched. The weapon light makes them notice you faster.
  - They have a reaction delay, fire bursts with a hit chance, hear gunshots and turn toward them, and shoot through glass.
- **Difficulty:**
  - Recruit: 9 bots
  - Regular: 12 bots
  - Veteran: 15 bots, with faster reactions and better aim
- **Player:**
  - 100 HP and no regeneration.
  - Carbine: 30 rounds, auto or single fire, holographic sight.
  - P-9 pistol: 15 rounds.
  - 2 frag grenades, a weapon light, melee, lean, crouch and vault. A headshot kills instantly.
- **HUD:** current room name, timer, hostiles remaining, health, ammo and fire mode, a kill feed, hit markers and damage-direction arcs.
- **End screen:** stats and a letter grade. The best clear time for each difficulty is saved in localStorage.
- **Menu:** a briefing screen with floor plans drawn from the actual wall data, sliders for sensitivity and field of view, and a graphics setting (High or Low).

## Controls

**Keyboard and mouse**

| Action | Key |
|---|---|
| Move | WASD |
| Sprint | Shift |
| Fire | Left mouse button |
| Aim down sights | Right mouse button |
| Lean left / right (hold) | Q / E |
| Crouch | C |
| Vault | Space |
| Reload | R |
| Carbine / pistol | 1 / 2 |
| Melee | V |
| Frag grenade | G |
| Weapon light | F |
| Fire mode | B |
| Pause | Esc |

**Xbox controller. This is the layout the user asked for, so keep it exactly:**

| Action | Button |
|---|---|
| Move | Left stick |
| Look | Right stick |
| Sprint | Push the left stick fully forward and hold briefly |
| Fire | RT / R2 |
| Aim down sights | LT / L2 |
| Crouch | LB |
| Reload | X |
| Lean left | Click the left stick (toggle) |
| Lean right | Click the right stick (toggle) |
| Vault | A |
| Melee / break barricade | B |
| Switch weapon | Y |
| Frag grenade | RB |
| Weapon light | D-pad up |
| Fire mode | D-pad left |
| Pause | Menu |

**Menu screens on the controller:**
- Briefing screen: A deploys, D-pad left and right change difficulty, D-pad up and down switch High or Low graphics, X tries the next display mode.
- Pause screen: A resumes, Y restarts, B goes back to the briefing, X tries the next display mode.
- End screen: A redeploys, B goes back to the briefing.

**Controller implementation notes:**
- The Gamepad API with standard mapping: buttons 0 = A, 1 = B, 2 = X, 3 = Y, 4 = LB, 5 = RB, 6 = LT, 7 = RT, 8 = View, 9 = Menu, 10 = left stick click, 11 = right stick click, 12–15 = D-pad. Axes 0 and 1 are the left stick, 2 and 3 the right stick.
- There's also a fallback for Edge delivering the controller as keyboard events (`GamepadA`, `GamepadRightTrigger` and so on, or keyCodes 195–218). These events are `preventDefault`-ed so Edge doesn't zoom or navigate.
- There's light aim slowdown when the crosshair is over a visible bot, and rumble on firing, getting hit and explosions.

## Code map (inside `index.html`)

These are the main `/* ===== Section ===== */` blocks in the script:

- **Renderer** and display-mode selection
- **Procedural textures:** canvas-generated wood, tile, wallpaper, siding, cinder block, grass and so on
- **Materials:** the `M` object. `C()` converts sRGB hex to linear.
- **Level geometry:**
  - `addBox()` builds boxes with world-space UVs, a collider and a raycast target.
  - `wall()` builds walls with openings (`win`, `hwin`, `door(..., barricade)` and `arch`).
  - Barricades and glass are destructible.
  - `ROOMS` lists the rooms, with floor and wallpaper per room.
- **Furniture, exterior, sky and lights:** the lights live in the `lamps[]` array, and the sun casts shadows.
- **Effects:** a points-based particle pool, smoke sprites, bullet-hole decals and tracers.
- **Audio:** everything is synthesised with WebAudio, panned in 3D, with a convolution reverb.
- **Viewmodel:** the gun and arms are drawn in a separate scene (`vmScene`), which is rendered after `clearDepth`.
- **Collision:** axis-aligned boxes, a step-up of 0.42 m for stairs, gravity and vaulting.
- **Bots:** the `Bot` class has the states `hold`, `patrol`, `alert` and `engage`. It also contains perception (line-of-sight raycasts that ignore glass), shooting, hearing and the death animation.
- **Player actions:** firing, recoil, wall penetration, reloading, melee and grenades.
- **HUD, Update, Gamepad, Input and Flow:**
  - Flow covers `startGame`, `pauseGame`, `endGame` and `resetLevel`.
  - The main loop calls `simulate(dt)` and then renders. Both are wrapped in try/catch, and errors appear in a red `#diag` box.
  - Graphics quality (`setQuality`) and diagnostics (`diagText`, an FPS watchdog, shader-error and context-lost hooks) sit just before the main loop.

## Notes

- The map and game are original. Don't recreate Rainbow Six Siege's maps, names or branding.
- GitHub Pages serves from `main` / root and rebuilds automatically on every push.
