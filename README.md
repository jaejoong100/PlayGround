# THE LONG ROAD

**Drive. Loot. Hold the line.** A 2D, mobile-first road-trip survival game with tower defense at every stop.

You are the last rig rolling toward **Haven**, 388 miles of zombie-infested highway away. Each leg is an auto-scrolling road run: drag to steer, auto-fire at anything in range, ram the weak ones, and scavenge scrap. Every stop turns into a holdout — place turrets on hardpoints, aim the rig gun, and survive the waves. Spend scrap in the garage on cars, weapons, armor, car parts, turrets, and base modules, then take the next leg.

## Features

- **12 stops** across distinct biomes, including **4 boss stops**, ending at Haven.
- **5 cars**, **6 weapons**, **5 armor sets**, and **12 car parts** with upgrade levels.
- **6 turret types** and **6 base modules** for the holdout defense.
- Two interlocking modes: auto-scrolling road survival and hardpoint tower defense.
- Scrap economy, persistent garage, checkpoint retry, pause, mute, and victory/defeat flow.
- Save/resume via `localStorage` (key `the-long-road-save-v1`).
- Procedural WebAudio sound effects and engine ambience — no external assets.
- Single static build: Canvas 2D + HTML/CSS/JS, no bundler or dependencies.

## Play

Open `index.html` through a local web server (ES modules require HTTP):

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

On desktop, drag with the mouse or use **A/D** or **←/→** to steer; **Space** fires the Pulse/shockwave ability; **Esc/P** pauses. On mobile, drag anywhere on the road to steer, tap hardpoints to place turrets, and drag on the holdout field to aim the rig gun.

## Structure

| File | Purpose |
| --- | --- |
| `index.html` | Screens, HUD, build panel, garage, modals |
| `styles.css` | Full visual design and responsive layout |
| `js/data.js` | Cars, weapons, armor, parts, turrets, base modules, stops, enemies |
| `js/audio.js` | Procedural WebAudio engine and sound effects |
| `js/game.js` | Game state, road/holdout logic, combat, waves, saving, rendering, input |

## Assumptions

- Mobile-first portrait layout; desktop centers the play field and keeps the same controls.
- Progression is linear across the 12 stops; a run can be resumed from the last checkpoint.
- All art and audio are procedural so the game runs offline with no asset pipeline.

---

<!-- omgithub:readme:start -->
## 🚀 Build, play, and remix with OMGithub

**Created using [OMGithub.com](https://go.ondev.store/).**

[![OMGithub](https://img.shields.io/badge/OMGithub-Open%20project-orange?style=for-the-badge)](https://go.ondev.store/jaejoong100/PlayGround)
[![GitHub](https://img.shields.io/badge/GitHub-Source-181717?logo=github&style=for-the-badge)](https://github.com/jaejoong100/PlayGround)

- 🎮 [Open the project](https://go.ondev.store/jaejoong100/PlayGround).
- ✨ [Remix this project](https://go.ondev.store/jaejoong100/PlayGround?remix=1).
- 💻 [Explore the source](https://github.com/jaejoong100/PlayGround).
- 🛠️ [Check build runs](https://github.com/jaejoong100/PlayGround/actions).
- 🐛 [Report an issue](https://github.com/jaejoong100/PlayGround/issues).
- 👤 [Explore the creator's projects](https://go.ondev.store/jaejoong100).
- 🌍 [Create with OMGithub](https://go.ondev.store/).
<!-- omgithub:readme:end -->
