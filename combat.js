// ============================================================
// GALACTIC UPRISING - Combat System
// Handles space and ground combat with dice mechanics
// ============================================================

class CombatEngine {
    constructor(gameEngine) {
        this.engine = gameEngine;
    }

    initCombat(systemId) {
        const state = this.engine.state;
        const units = state.units[systemId];

        const domSpace = units.space.filter(u => u.faction === FACTIONS.DOMINION);
        const libSpace = units.space.filter(u => u.faction === FACTIONS.LIBERATION);
        const domGround = units.ground.filter(u => u.faction === FACTIONS.DOMINION && !this.isStructure(u));
        const libGround = units.ground.filter(u => u.faction === FACTIONS.LIBERATION && !this.isStructure(u));

        const hasSpaceBattle = domSpace.length > 0 && libSpace.length > 0;
        const hasGroundBattle = domGround.length > 0 && libGround.length > 0;

        state.activeCombat = {
            systemId,
            phase: hasSpaceBattle ? 'space' : 'ground',
            round: 1,
            hasSpaceBattle,
            hasGroundBattle,
            spaceDone: !hasSpaceBattle,
            groundDone: !hasGroundBattle,
            // Track units per side per domain
            dominion: {
                space: domSpace.map(u => ({ ...u })),
                ground: domGround.map(u => ({ ...u })),
            },
            liberation: {
                space: libSpace.map(u => ({ ...u })),
                ground: libGround.map(u => ({ ...u })),
            },
            // Dice results
            currentRoll: null,
            // Cards played this round
            cardsPlayed: { dominion: null, liberation: null },
            // Retreated
            retreated: null,
            // Log
            combatLog: [],
            // Who's choosing (for card play, assign damage)
            waitingFor: null,
        };

        state.activeCombat.combatLog.push(`Combat at ${state.systems[systemId].name}!`);
        if (hasSpaceBattle) state.activeCombat.combatLog.push('Space battle begins.');

        return state.activeCombat;
    }

    isStructure(unit) {
        const ut = Object.values(UNIT_TYPES).find(t => t.id === unit.typeId);
        return ut && ut.isStructure;
    }

    getUnitType(unit) {
        return Object.values(UNIT_TYPES).find(t => t.id === unit.typeId);
    }

    // Roll dice for a faction in the current combat phase
    rollDice(faction) {
        const combat = this.engine.state.activeCombat;
        if (!combat) return null;

        const domain = combat.phase; // 'space' or 'ground'
        const units = combat[faction][domain];
        const card = combat.cardsPlayed[faction];

        let redDice = 0;
        let blackDice = 0;

        // Sum up dice from units
        units.forEach(u => {
            const ut = this.getUnitType(u);
            if (ut && ut.attack) {
                redDice += ut.attack.red || 0;
                blackDice += ut.attack.black || 0;
            }
        });

        // Add leader bonus
        const leaders = this.engine.state.leaders[faction]
            .filter(l => l.location === combat.systemId && !l.captured);
        if (leaders.length > 0) {
            const bestCombat = Math.max(...leaders.map(l => l.skills.combat));
            if (domain === 'space') redDice += Math.floor(bestCombat / 2);
            else blackDice += Math.floor(bestCombat / 2);
        }

        // Add card bonus
        if (card && card.bonus) {
            redDice += card.bonus.red || 0;
            blackDice += card.bonus.black || 0;
        }

        // Roll
        const results = [];
        for (let i = 0; i < redDice; i++) {
            results.push({ type: 'red', result: this.rollSingleDie('red') });
        }
        for (let i = 0; i < blackDice; i++) {
            results.push({ type: 'black', result: this.rollSingleDie('black') });
        }

        // Handle reroll from cards
        if (card && card.reroll) {
            results.forEach(r => {
                if (r.result === 'miss') {
                    r.result = this.rollSingleDie(r.type);
                    r.rerolled = true;
                }
            });
        }

        return results;
    }

    rollSingleDie(type) {
        const faces = DICE[type].faces;
        return faces[Math.floor(Math.random() * faces.length)];
    }

    // Execute a full combat round
    executeCombatRound() {
        const combat = this.engine.state.activeCombat;
        if (!combat) return null;

        const domain = combat.phase;

        // Roll for both sides
        const domRoll = this.rollDice(FACTIONS.DOMINION);
        const libRoll = this.rollDice(FACTIONS.LIBERATION);

        // Count hits and crits
        const domHits = this.countHits(domRoll, combat.cardsPlayed[FACTIONS.DOMINION]);
        const libHits = this.countHits(libRoll, combat.cardsPlayed[FACTIONS.LIBERATION]);

        // Apply blocks from cards
        let domBlocked = 0;
        let libBlocked = 0;
        if (combat.cardsPlayed[FACTIONS.DOMINION]?.block) {
            domBlocked = combat.cardsPlayed[FACTIONS.DOMINION].block;
        }
        if (combat.cardsPlayed[FACTIONS.LIBERATION]?.block) {
            libBlocked = combat.cardsPlayed[FACTIONS.LIBERATION].block;
        }

        // Handle pierce (ignores blocks)
        const domPierce = combat.cardsPlayed[FACTIONS.DOMINION]?.pierce;
        const libPierce = combat.cardsPlayed[FACTIONS.LIBERATION]?.pierce;

        const domEffectiveHits = Math.max(0, domHits.total - (libPierce ? 0 : libBlocked));
        const libEffectiveHits = Math.max(0, libHits.total - (domPierce ? 0 : domBlocked));

        // Handle doubleHits
        const domFinalHits = combat.cardsPlayed[FACTIONS.DOMINION]?.doubleHits ? domEffectiveHits * 2 : domEffectiveHits;
        const libFinalHits = combat.cardsPlayed[FACTIONS.LIBERATION]?.doubleHits ? libEffectiveHits * 2 : libEffectiveHits;

        // Apply damage
        const domDamaged = this.applyDamage(combat[FACTIONS.LIBERATION][domain], libFinalHits, domHits.crits);
        const libDamaged = this.applyDamage(combat[FACTIONS.DOMINION][domain], domFinalHits, libHits.crits);

        // Remove destroyed units
        combat[FACTIONS.LIBERATION][domain] = combat[FACTIONS.LIBERATION][domain].filter(u => u.damage < u.maxHealth);
        combat[FACTIONS.DOMINION][domain] = combat[FACTIONS.DOMINION][domain].filter(u => u.damage < u.maxHealth);

        // Track destroyed for objectives
        this.engine.state.stats.unitsDestroyedInBattle += domDamaged.destroyed + libDamaged.destroyed;

        // Track capital ship destruction
        domDamaged.destroyedUnits.forEach(u => {
            const ut = this.getUnitType(u);
            if (ut && (ut.id === 'dom_capital' || ut.id === 'dom_super')) {
                this.engine.state.stats.capitalShipsDestroyed++;
                if (ut.id === 'dom_super') {
                    this.engine.state.titanDestroyed = true;
                }
            }
        });

        const roundResult = {
            round: combat.round,
            domain,
            dominion: { roll: domRoll, hits: domHits, effectiveHits: domFinalHits, blocked: domBlocked, damaged: domDamaged },
            liberation: { roll: libRoll, hits: libHits, effectiveHits: libFinalHits, blocked: libBlocked, damaged: libDamaged },
        };

        combat.combatLog.push(`Round ${combat.round}: Dominion deals ${libFinalHits} hits, Liberation deals ${domFinalHits} hits.`);

        // Check if combat in this domain is over
        const domLeft = combat[FACTIONS.DOMINION][domain].length;
        const libLeft = combat[FACTIONS.LIBERATION][domain].length;

        if (domLeft === 0 || libLeft === 0) {
            if (domain === 'space') {
                combat.spaceDone = true;
                const winner = domLeft > 0 ? 'Dominion' : 'Liberation';
                combat.combatLog.push(`Space battle won by ${winner}!`);

                // Track stats - check initial enemy ship count, not dice rolled
                if (winner === 'Liberation' && combat.dominion.space.length + (roundResult.dominion.damaged?.destroyed || 0) >= 3) {
                    this.engine.state.stats.spaceWinsVs3Plus++;
                }

                if (combat.hasGroundBattle) {
                    combat.phase = 'ground';
                    combat.round = 1;
                    combat.cardsPlayed = { dominion: null, liberation: null };
                    combat.combatLog.push('Ground battle begins.');
                    return { ...roundResult, domainComplete: true, nextDomain: 'ground' };
                }
            } else {
                combat.groundDone = true;
                const winner = domLeft > 0 ? 'Dominion' : 'Liberation';
                combat.combatLog.push(`Ground battle won by ${winner}!`);

                // Track defense wins
                if (winner === 'Liberation') {
                    this.engine.state.stats.groundDefenseWins++;
                }
            }

            // Combat is completely over
            if (combat.spaceDone && (combat.groundDone || !combat.hasGroundBattle)) {
                this.finalizeCombat();
                return { ...roundResult, combatOver: true };
            }
        }

        combat.round++;
        combat.cardsPlayed = { dominion: null, liberation: null };

        return roundResult;
    }

    countHits(roll, card) {
        let hits = 0;
        let crits = 0;
        roll.forEach(r => {
            if (r.result === 'hit') hits++;
            else if (r.result === 'crit') { hits++; crits++; }
        });
        return { hits, crits, total: hits };
    }

    applyDamage(units, hits, crits) {
        let remaining = hits;
        const destroyedUnits = [];
        let destroyed = 0;

        // Crits go to the biggest units first
        // Sort units by health descending for crit targeting
        const sorted = [...units].sort((a, b) => b.maxHealth - a.maxHealth);

        // Apply crits (bypass health, deal direct damage)
        let critsLeft = crits;
        for (const u of sorted) {
            if (critsLeft <= 0) break;
            u.damage++;
            remaining--;
            critsLeft--;
            if (u.damage >= u.maxHealth) {
                destroyedUnits.push(u);
                destroyed++;
            }
        }

        // Apply remaining hits to lightest units first (like in the board game)
        const sortedAsc = [...units].sort((a, b) => (a.maxHealth - a.damage) - (b.maxHealth - b.damage));
        for (const u of sortedAsc) {
            if (remaining <= 0) break;
            if (u.damage >= u.maxHealth) continue; // already destroyed
            u.damage++;
            remaining--;
            if (u.damage >= u.maxHealth) {
                destroyedUnits.push(u);
                destroyed++;
            }
        }

        return { destroyed, destroyedUnits };
    }

    finalizeCombat() {
        const combat = this.engine.state.activeCombat;
        const systemId = combat.systemId;

        // Update actual units in game state to match combat results
        // Remove all combat units, re-add survivors
        const state = this.engine.state;

        // Space
        state.units[systemId].space = state.units[systemId].space.filter(u => {
            // Keep non-combatant units (shouldn't be any, but safety)
            const inCombatDom = combat.dominion.space.find(cu => cu.id === u.id);
            const inCombatLib = combat.liberation.space.find(cu => cu.id === u.id);
            if (!inCombatDom && !inCombatLib) return true;
            // Keep if survived
            if (inCombatDom) return inCombatDom.damage < inCombatDom.maxHealth;
            if (inCombatLib) return inCombatLib.damage < inCombatLib.maxHealth;
            return false;
        });

        // Ground
        state.units[systemId].ground = state.units[systemId].ground.filter(u => {
            if (this.isStructure(u)) return true; // structures aren't in combat arrays
            const inCombatDom = combat.dominion.ground.find(cu => cu.id === u.id);
            const inCombatLib = combat.liberation.ground.find(cu => cu.id === u.id);
            if (!inCombatDom && !inCombatLib) return true;
            if (inCombatDom) return inCombatDom.damage < inCombatDom.maxHealth;
            if (inCombatLib) return inCombatLib.damage < inCombatLib.maxHealth;
            return false;
        });

        // Reset damage on surviving units
        ['space', 'ground'].forEach(domain => {
            state.units[systemId][domain].forEach(u => u.damage = 0);
        });

        combat.combatLog.push('Combat resolved.');
        state.activeCombat = null;
    }

    // Get available action cards for a faction in current combat
    getAvailableCards(faction) {
        const combat = this.engine.state.activeCombat;
        if (!combat) return [];
        return this.engine.state.actionCards[faction]
            .filter(c => c.domain === combat.phase);
    }

    playCard(faction, cardId) {
        const combat = this.engine.state.activeCombat;
        if (!combat) return false;
        const card = this.engine.state.actionCards[faction].find(c => c.id === cardId);
        if (!card) return false;
        combat.cardsPlayed[faction] = card;
        combat.combatLog.push(`${faction === FACTIONS.DOMINION ? 'Dominion' : 'Liberation'} plays ${card.name}.`);
        return true;
    }

    retreat(faction) {
        const combat = this.engine.state.activeCombat;
        if (!combat) return false;
        combat.retreated = faction;
        combat.combatLog.push(`${faction === FACTIONS.DOMINION ? 'Dominion' : 'Liberation'} retreats!`);
        this.finalizeCombat();
        return true;
    }
}

const combatEngine = new CombatEngine(engine);
