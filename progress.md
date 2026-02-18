# Galactic Uprising - Progress

## Game Description
An asymmetric strategy board game (digital adaptation) where:
- **Dominion** (large authoritarian faction) seeks to find and destroy the hidden Liberation base
- **Liberation** (small resistance faction) seeks to inspire the galaxy by completing objectives

## Architecture
- **data.js** - All game data: systems, units, leaders, missions, objectives
- **engine.js** - Core game state, turn management, mission resolution
- **combat.js** - Dice-based combat system (space + ground)
- **render.js** - Canvas-based galaxy map rendering
- **ui.js** - DOM UI panels, modals, player interaction
- **ai.js** - AI opponent for single-player
- **main.js** - Entry point, game loop

## Current Status
- [x] Core engine with full turn cycle
- [x] 32 systems across 8 regions
- [x] 6 leaders per faction with skill-based missions
- [x] 10 missions per faction (all implemented)
- [x] 14 objectives for Liberation faction
- [x] Dice combat system (space + ground)
- [x] AI opponent (Dominion)
- [x] Galaxy map rendering with pan/zoom
- [x] All mission effects implemented
- [x] Production system
- [x] Probe deck mechanic
- [x] Win condition checks
- [ ] Action card play in combat (system exists, needs UI)
- [ ] More sophisticated AI movement decisions
- [ ] Sound effects

## Known Issues
- Production is quite aggressive; may need balancing
- Some missions auto-resolve target selection (should be player choice)
