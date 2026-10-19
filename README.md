# BRICK BREAKER — uniquegames

A self-contained, buildless HTML/CSS/vanilla JavaScript arcade game. No external libraries, fonts, audio files, or engine.

The campaign uses four three-stage light arcade worlds, reusing these scenery assets: Meadow (hills and drifting leaves), Sunset (sun and moving clouds), Ocean (waves and bubbles), Snow (mountains and snowfall), and Space (planets and twinkling stars). Page colors, paddle, bricks, level cards, and playfield follow the selected world. Dark balls remain readable on the pale backgrounds. The main menu and About credit uniquegames. Background motion is restrained during play and respects reduced-motion preferences. Decorative elements do not capture input.

## Run

Serve `dist/` with any static web server, then open it in a modern browser. For example, `python3 -m http.server 8080 --directory dist`. JavaScript modules require HTTP hosting rather than opening the HTML with a `file://` URL. Upload everything inside `dist/` to any static host.

## Controls

- Arrow keys or A/D: move. Mouse: move across the playfield.
- Space: start/launch/continue. P or Escape: pause/resume.
- Touch: drag on the board, or slide left/right in the separate control area below it without obscuring the paddle. The lower area fills the remaining phone viewport (minimum 96px); movement is relative, so touching down does not reposition the paddle. A quick tap in either area launches. Pointer capture keeps a drag working outside its starting area; extra fingers are ignored.
- The header speaker button starts on for new visitors; tap to mute (crossed speaker), tap again to unmute with a short confirmation chime. It remembers your preference. Muting stops active and scheduled tones immediately. Web Audio starts after user interaction and resumes interrupted mobile audio on the next interaction. Effects use stronger, longer envelopes (2.4× nominal gain for unchanged tones) with compression for overlapping hits.

## Screens and saved progress

The standalone main menu has Let’s Play, Levels, About, and Quit. The gameplay screen shows a centered board and its HUD without side panels. About contains the controls and boost guide. This testing build enables `allLevelsUnlocked` in `main.js`: all twelve stages can be selected immediately, including the Space boss, with fresh, existing or inaccessible browser storage. Opening access does not award stars or scores; clearing a later stage does not mark skipped stages as cleared. Sequential progression remains available by disabling this option. Levels starts a fresh three-life run at the selected stage; restart repeats that run’s starting stage. Let’s Play starts stage 1. Quit attempts to close the tab and shows an exit screen if the browser keeps it open. Storage failure does not prevent playing, but progress will then be kept only for the current page session.

## Gameplay

Twelve stages across four worlds increase ball speed, armor, layouts, and steel obstacles. Three lives per run. Normal bricks score 100, bonus bricks 150, armored bricks 250, switches 300 and the guardian 1500 (before multipliers). Every third consecutive destruction increases the combo, capped at ×4; paddle hits and lost lives reset it. Bonus bricks drop one of six power-ups with an 80% probability. Temporary boosts refresh when collected again; multiball adds two balls with a six-ball cap; life adds one life. Lives are only lost when the last active ball leaves the board. Steel bricks are excluded from completion. Clearing all twelve stages ends with a victory screen. High score is stored locally if browser storage is available.

## Stars, missions and new mechanics

- Every cleared level saves its best score and highest star rating separately. Zero lives lost earns 3 stars, one loss earns 2, and two or more earns 1. Extra-life boosts do not erase losses. Older unlock progress remains valid; replay old stages to earn their new ratings. Records use `brickBreaker.records` alongside the existing unlock and high-score keys. Storage errors do not interrupt play.
- Four three-stage worlds: Meadow (1–3), Ocean (4–6), Snow (7–9), Space (10–12). Guardians occur only at 3, 6, 9, 12 with 6, 9, 9, 12 HP. Each has three glowing weak-spot phases. Speeds rise gently from 355 to 455; normal layouts stay at 4–6 rows and armor at two hits. Moving rows and switch gates are introduced separately before combining. Level 12 alone ends the run. All 12 levels remain open for testing; the total star target is 36. Existing numbered level records are retained.
- Run missions: catch 3 power-ups, reach combo ×4, and clear one level without a lost life. Inspect progress in Pause. Missions carry between stages and reset on a new run or restart. Mission and power-up reactions queue as compact text without a box, border or background. Each gently pops in and fades out in 0.9 seconds; queued reactions restart the animation. Reduced-motion settings use an opacity fade only.
- The level-clear screen shows the current rating and score for six seconds, with an immediate Next button. Pause/results can scroll on short screens.

## Code map

- `themes.js`: shared world palettes and scenery identities.
- `levels.js`: dimensions, layouts, colors, boost definitions.
- `physics.js`: swept collision and safe bounce directions.
- `game.js`: state machine, simulation, scoring, boost lifetimes.
- `renderer.js`: responsive high-DPI Canvas rendering and effects.
- `particles.js`: capped particles, fragments, floating text.
- `audio.js`: generated Web Audio effects.
- `main.js`: inputs, screen navigation, UI, local storage, fixed-step animation loop.
- `progress.js`: persisted stage unlocks, scores, star ratings and selection guards.
- `missions.js`: definitions and initial state for the three run missions.

## Checks

Run `npm test`. Tests cover swept high-speed collisions, safe bounce angles, actual paddle/drop collision, life loss, pause, all boosts and expiry, combos, steel exclusion, all twelve level transitions, victory, game over, and restart. The simulation is DOM-independent for reliable testing. Feature tests cover moving-frame collisions, switches, boss shields/phases, ratings, record reloads and mission resets; a minimal-DOM integration test checks main-module navigation and result wiring. This DOM stub does not validate browser layout. Browser visual/input/audio QA should also be performed on desktop and Android before a public release.
