# Galactic Uprising - Progress

## Game Description
An asymmetric strategy board game (digital adaptation) where:
- **Dominion** (large authoritarian faction) seeks to find and destroy the hidden Liberation base
- **Liberation** (small resistance faction) seeks to inspire the galaxy by completing objectives

## Architecture
- **data.js** - All game data: systems, units, leaders, missions, objectives
- **engine.js** - Core game state, turn management, mission resolution
- **combat.js** - Dice-based combat system (space + ground)
- **render.js** - Canvas-based galaxy map with 3D planet rendering
- **ui.js** - DOM UI panels, modals, step-by-step player interaction
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
- [x] Galaxy map with 3D planet rendering, multi-colored stars, nebulae
- [x] All mission effects implemented
- [x] Production system
- [x] Probe deck mechanic
- [x] Win condition checks
- [x] Step-by-step assignment flow with numbered prompts
- [x] Phase tracker in top bar (Assign > Command > Refresh)
- [x] Turn indicator banner showing active faction and phase
- [x] Adjacent system highlighting during movement
- [x] Mission skill requirement validation with visual feedback
- [x] CSS variable-based color theme
- [ ] Action card play in combat (system exists, needs better UI)
- [ ] More sophisticated AI movement decisions
- [ ] Sound effects

## Visual Overhaul (v2)
- Replaced flat circles with 3D-shaded planet spheres with specular highlights
- Multi-colored star field (500+ stars, 5 color temperatures, diffraction spikes on bright stars)
- 7 varied nebulae with proper RGB gradient rendering
- Gradient hyperspace lane connections that brighten near selected systems
- Pulsing highlight rings on valid move targets
- Deeper space color palette with CSS custom properties
- Cohesive faction colors (Dominion red #e74c3c, Liberation blue #5dade2)
- Cleaner panel design with better typography and spacing
- Animated AI thinking indicator
- Backdrop blur on modal overlays
- Better combat modal with aligned unit health displays

## Known Issues
- Production is quite aggressive; may need balancing
- Some missions auto-resolve target selection (should be player choice)
