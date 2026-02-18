// ============================================================
// GALACTIC UPRISING - AI Player
// Simple AI to play the Dominion faction (or Liberation)
// ============================================================

class AIPlayer {
    constructor(faction) {
        this.faction = faction;
        this.thinkDelay = 800; // ms delay for AI "thinking"
    }

    // Main AI decision entry point
    async takeTurn() {
        const state = engine.state;
        if (state.activePlayer !== this.faction) return;
        if (state.gameOver) return;

        await this.delay(this.thinkDelay);

        if (state.phase === 'assignment') {
            await this.handleAssignment();
        } else if (state.phase === 'command') {
            await this.handleCommand();
        }
    }

    async handleAssignment() {
        const state = engine.state;
        const leaders = state.leaders[this.faction]
            .filter(l => !state.assignedLeaderIds.has(l.id) && !l.captured && !l.exhausted);
        const missions = state.missionHands[this.faction];

        if (leaders.length === 0 || missions.length === 0) {
            engine.passAssignment();
            ui.updateAll();
            return;
        }

        // Find best leader-mission pairing
        let bestLeader = null;
        let bestMission = null;
        let bestScore = -1;

        for (const leader of leaders) {
            for (const mission of missions) {
                const skillVal = leader.skills[mission.skill] || 0;
                if (skillVal < mission.minSkill) continue;

                let score = skillVal;
                // Prioritize certain mission types
                if (this.faction === FACTIONS.DOMINION) {
                    if (mission.effect === 'probe') score += 3;
                    if (mission.effect === 'intel_sweep') score += 4;
                    if (mission.effect === 'sway_dominion') score += 2;
                    if (mission.effect === 'bombardment') score += 2;
                } else {
                    if (mission.effect === 'sway_liberation') score += 3;
                    if (mission.effect === 'sabotage') score += 2;
                    if (mission.effect === 'uprising') score += 3;
                }

                if (score > bestScore) {
                    bestScore = score;
                    bestLeader = leader;
                    bestMission = mission;
                }
            }
        }

        if (bestLeader && bestMission) {
            // Pick target system
            const target = this.pickMissionTarget(bestMission, bestLeader);
            engine.assignLeader(bestLeader.id, bestMission.id, target);
            ui.updateAll();
        } else {
            engine.passAssignment();
            ui.updateAll();
        }
    }

    pickMissionTarget(mission, leader) {
        const state = engine.state;

        switch (mission.effect) {
            case 'probe':
            case 'intel_sweep':
                // Target a system the leader is in or nearby
                return leader.location || 'nexus_prime';
            case 'sway_dominion': {
                // Find neutral system
                const neutralSystems = Object.values(state.systems)
                    .filter(s => s.loyalty === 'neutral');
                return neutralSystems.length > 0
                    ? neutralSystems[Math.floor(Math.random() * neutralSystems.length)].id
                    : leader.location;
            }
            case 'sway_liberation': {
                const neutralSystems = Object.values(state.systems)
                    .filter(s => s.loyalty === 'neutral');
                return neutralSystems.length > 0
                    ? neutralSystems[Math.floor(Math.random() * neutralSystems.length)].id
                    : leader.location;
            }
            case 'bombardment':
            case 'subjugate': {
                // Find system with enemy ground units
                const targets = Object.entries(state.units)
                    .filter(([sysId, units]) => {
                        const enemy = this.faction === FACTIONS.DOMINION ? FACTIONS.LIBERATION : FACTIONS.DOMINION;
                        return units.ground.some(u => u.faction === enemy);
                    })
                    .map(([sysId]) => sysId);
                return targets.length > 0 ? targets[0] : leader.location;
            }
            default:
                return leader.location || Object.keys(state.systems)[0];
        }
    }

    async handleCommand() {
        const state = engine.state;

        // First try to resolve pending missions
        if (state.assignments[this.faction].length > 0) {
            engine.resolveMission(0);
            ui.updateAll();
            return;
        }

        // Try to move units toward enemy or objectives
        const moved = this.tryMove();
        if (moved) {
            ui.updateAll();
            return;
        }

        // Pass
        engine.passCommand();
        if (state.phase === 'refresh') {
            setTimeout(() => ui.updateAll(), 500);
        }
        ui.updateAll();
    }

    tryMove() {
        const state = engine.state;
        const faction = this.faction;

        // Only move occasionally (50% chance per turn) to avoid empty systems
        if (Math.random() > 0.5) return false;

        // Find systems with our units and a leader
        const movableSystems = Object.entries(state.units)
            .filter(([sysId, units]) => {
                const mySpace = units.space.filter(u => u.faction === faction);
                const myGround = units.ground.filter(u => u.faction === faction);
                const hasUnits = mySpace.length > 0 || myGround.length > 0;
                const hasLeader = engine.getLeadersInSystem(sysId, faction).length > 0;
                // Only move from systems with enough units to spare
                return hasUnits && hasLeader && (mySpace.length + myGround.length) > 3;
            })
            .map(([sysId]) => sysId);

        if (movableSystems.length === 0) return false;

        const fromSystem = movableSystems[Math.floor(Math.random() * movableSystems.length)];
        const adjacent = engine.getAdjacentSystems(fromSystem);

        if (adjacent.length === 0) return false;

        // Pick target based on strategy
        let target = null;
        if (faction === FACTIONS.DOMINION) {
            // Prioritize: systems with enemy units > non-probed > non-loyal
            target = adjacent.find(id => {
                const u = state.units[id];
                return u && u.space.some(x => x.faction === FACTIONS.LIBERATION);
            });
            if (!target) target = adjacent.find(id => !state.systems[id].probed);
            if (!target) target = adjacent.find(id => state.systems[id].loyalty !== 'dominion');
        } else {
            target = adjacent.find(id => state.systems[id].loyalty === 'neutral');
        }

        if (!target) target = adjacent[Math.floor(Math.random() * adjacent.length)];

        // Only move HALF the units (leave some behind to defend)
        const unitIds = [];
        let count = 0;
        ['space', 'ground'].forEach(domain => {
            const myUnits = state.units[fromSystem][domain].filter(u => u.faction === faction);
            const toMove = Math.ceil(myUnits.length / 2);
            myUnits.slice(0, toMove).forEach(u => {
                unitIds.push(u.id);
                count++;
            });
        });

        if (unitIds.length === 0) return false;

        // Move one leader too
        const leaders = engine.getLeadersInSystem(fromSystem, faction);
        if (leaders.length > 0) {
            engine.moveLeader(leaders[0].id, target, faction);
        }

        const result = engine.moveUnits(fromSystem, target, unitIds, faction);

        if (result.ok && result.combat) {
            combatEngine.initCombat(target);
            // Auto-resolve combat for AI (play cards if available)
            while (engine.state.activeCombat) {
                const cards = combatEngine.getAvailableCards(faction);
                if (cards.length > 0 && !engine.state.activeCombat.cardsPlayed[faction]) {
                    combatEngine.playCard(faction, cards[0].id);
                }
                combatEngine.executeCombatRound();
            }
        }

        return result.ok;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
