# Galactic Uprising

A strategic battle for the fate of the galaxy. Two asymmetric factions. One hidden base. Fourteen turns to decide everything.

## The Conflict

The **Dominion** holds the galaxy in an iron grip. Its fleets darken the skies of a hundred worlds. Its intelligence networks reach into every corner of civilized space. It has one mission: find the hidden Liberation base and crush the uprising before it spreads.

The **Liberation** operates from the shadows. Outnumbered and outgunned, they fight not with brute force but with hope — completing daring objectives, swaying neutral worlds, and running the clock until the galaxy rises up on its own.

One player commands the might of the Dominion. The other leads the Liberation from a secret base whose location only they know.

## How to Play

**Serve the directory and open it in a browser.** No install. No build step. No dependencies.

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

You play the Liberation. The AI plays the Dominion.

## The Game

### The Galaxy

32 star systems spread across 8 regions, from the fortified Core Worlds to the lawless Wild Rim. Systems produce ships and troops, shift loyalties between factions, and serve as battlegrounds for control of the galaxy.

### Leaders & Missions

Each faction fields 6 unique leaders with skills in **Combat**, **Intel**, **Diplomacy**, and **Logistics**. Every turn, you assign leaders to missions — covert operations that shape the war:

- Send a spy to **sabotage** enemy production
- Dispatch an envoy to **rally support** on a neutral world
- Order a commando to **hit and run** against an enemy fleet
- Task your best operative with **relocating your hidden base** before the Dominion closes in

The Dominion, meanwhile, runs **probe sweeps** and **intelligence operations** to narrow down where your base is hiding.

### Combat

When fleets collide, combat plays out in two phases — **space**, then **ground**. Roll red and black dice, play tactical cards for decisive advantages, and decide when to press the attack or retreat to fight another day. Crits bypass armor. Cards can block damage, double hits, or pierce defenses.

### The Clock

Time is not on the Dominion's side. A **reputation track** starts at 30. Every objective the Liberation completes brings it closer to the advancing **time marker**. When they meet, the galaxy rises and the Liberation wins.

But if 14 turns pass and the Dominion still stands — or if they find and destroy the Liberation base — the uprising is crushed.

### Objectives

The Liberation draws from a deck of objectives across three tiers:

| Tier | Examples | Points |
|------|----------|--------|
| Early | Gain loyalty in 3 outer systems, win a ground defense, build a supply network | 1 |
| Mid | Capture a Dominion leader, liberate a Core World, control 4 regions | 2 |
| Late | Destroy the Titan superweapon, inspire 8 systems, win a decisive battle | 3 |

Completing objectives is the only path to Liberation victory.

## Controls

| Action | Input |
|--------|-------|
| Select a system | Left-click on the map |
| Pan the map | Right-click drag |
| Zoom | Scroll wheel |
| Assign a mission | Pick a leader and mission in the left panel, click "Assign to Mission", click a target system |
| Move units | Select a system with your forces, click "Move Units", click an adjacent system |
| Resolve combat | Roll dice, play tactic cards, or retreat |

## Development

The game is ~3,400 lines of vanilla JavaScript across 8 files. No frameworks, no bundler, no transpiler.

```
index.html  — layout and styles
data.js     — systems, units, leaders, missions, objectives
engine.js   — game state, turn flow, mission effects, win conditions
combat.js   — dice combat with action cards
render.js   — canvas galaxy map with pan/zoom
ui.js       — panels, modals, interaction
ai.js       — Dominion AI opponent
main.js     — entry point and game loop
```

## License

MIT
