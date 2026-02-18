// ============================================================
// GALACTIC UPRISING - Game Engine
// Core state management, turn structure, and game logic
// ============================================================

class GameEngine {
    constructor() {
        this.state = null;
    }

    initGame() {
        this.state = {
            turn: 1,
            phase: 'assignment', // assignment, command, refresh
            activePlayer: FACTIONS.LIBERATION, // Liberation assigns first
            commandActivePlayer: FACTIONS.LIBERATION,

            // Systems state
            systems: {},
            connections: new Map(),

            // Units on the map: { systemId: { space: [unitObj...], ground: [unitObj...] } }
            units: {},

            // Leaders
            leaders: { dominion: [], liberation: [] },

            // Missions
            missionDecks: { dominion: [], liberation: [] },
            missionHands: { dominion: [], liberation: [] },

            // Assignments (leaders assigned to missions this turn)
            assignments: { dominion: [], liberation: [] }, // { leader, mission, targetSystem }

            // Probe deck (for Dominion to find Liberation base)
            probeDeck: [],
            probeDiscards: [],

            // Liberation hidden base
            liberationBase: null, // system id
            baseRevealed: false,

            // Reputation & time tracks
            timeMarker: 0,   // advances each turn, starts at 0
            reputationMarker: STARTING_REPUTATION, // Liberation needs to bring this down

            // Objectives
            objectiveDeck: [],
            currentObjectives: [], // 2-3 face up objectives Liberation can complete
            completedObjectives: [],

            // Production queue
            productionQueue: { dominion: [], liberation: [] }, // { unitType, systemId, turnsLeft }

            // Combat state
            activeCombat: null,

            // Game over
            gameOver: false,
            winner: null,

            // UI state
            selectedLeader: null,
            selectedMission: null,
            selectedSystem: null,
            movingUnits: null,

            // Dominion pass/Liberation pass tracking for command phase
            commandPasses: { dominion: false, liberation: false },

            // Leaders assigned this assignment phase (so they can't be used again)
            assignedLeaderIds: new Set(),

            // Number of assignments made this phase
            assignmentCount: { dominion: 0, liberation: 0 },

            // Action cards
            actionCards: { dominion: [], liberation: [] },

            // Captured leaders
            capturedLeaders: [],

            // Titan built?
            titanBuilt: false,
            titanDestroyed: false,

            // Stats tracking for objectives
            stats: {
                groundDefenseWins: 0,
                capitalShipsDestroyed: 0,
                spaceWinsVs3Plus: 0,
                domLeadersCaptured: 0,
                unitsDestroyedInBattle: 0,
            },

            // Log
            log: [],
        };

        this.initSystems();
        this.initConnections();
        this.initUnits();
        this.initLeaders();
        this.initMissions();
        this.initObjectives();
        this.initProbeDeck();
        this.initActionCards();

        // Liberation picks a secret base
        this.chooseLiberationBase();

        this.addLog('The galaxy stands on the brink. The Dominion tightens its grip. The Liberation rises.');
        this.addLog(`Turn 1 begins. Liberation assigns first.`);

        return this.state;
    }

    initSystems() {
        SYSTEM_DATA.forEach(s => {
            this.state.systems[s.id] = {
                ...s,
                loyalty: s.loyalty, // 'dominion', 'liberation', 'neutral'
                subjugated: false,
                probed: false,
            };
        });
    }

    initConnections() {
        CONNECTIONS.forEach(([a, b]) => {
            if (!this.state.connections.has(a)) this.state.connections.set(a, new Set());
            if (!this.state.connections.has(b)) this.state.connections.set(b, new Set());
            this.state.connections.get(a).add(b);
            this.state.connections.get(b).add(a);
        });
    }

    initUnits() {
        // Initialize empty unit arrays for all systems
        Object.keys(this.state.systems).forEach(sId => {
            this.state.units[sId] = { space: [], ground: [] };
        });

        // Place Dominion starting units
        Object.entries(STARTING_UNITS.dominion).forEach(([sysId, placement]) => {
            if (placement.space) {
                placement.space.forEach(u => {
                    for (let i = 0; i < u.count; i++) {
                        this.state.units[sysId].space.push(this.createUnit(u.type));
                    }
                });
            }
            if (placement.ground) {
                placement.ground.forEach(u => {
                    for (let i = 0; i < u.count; i++) {
                        this.state.units[sysId].ground.push(this.createUnit(u.type));
                    }
                });
            }
        });
    }

    createUnit(typeId) {
        const type = UNIT_TYPES[typeId.toUpperCase()] || Object.values(UNIT_TYPES).find(t => t.id === typeId);
        if (!type) {
            console.error('Unknown unit type:', typeId);
            return null;
        }
        return {
            id: 'u_' + Math.random().toString(36).substr(2, 9),
            typeId: type.id,
            type: type.name,
            faction: type.faction,
            domain: type.domain,
            health: type.health,
            maxHealth: type.health,
            damage: 0,
        };
    }

    initLeaders() {
        ['dominion', 'liberation'].forEach(faction => {
            LEADER_DATA[faction].forEach(ld => {
                this.state.leaders[faction].push({
                    ...ld,
                    location: ld.startSystem, // null for liberation leaders (they start at base)
                    onMission: false,
                    captured: false,
                    exhausted: false,
                });
            });
        });
    }

    initMissions() {
        ['dominion', 'liberation'].forEach(faction => {
            const allMissions = [...MISSION_DATA[faction]];
            this.shuffle(allMissions);
            this.state.missionDecks[faction] = allMissions.slice(4);
            this.state.missionHands[faction] = allMissions.slice(0, 4);
        });
    }

    initObjectives() {
        const allObj = [...OBJECTIVE_DATA];
        this.shuffle(allObj);
        this.state.objectiveDeck = allObj.slice(3);
        this.state.currentObjectives = allObj.slice(0, 3);
    }

    initProbeDeck() {
        // Probe deck contains all non-Dominion-loyal systems
        const probeSystemIds = SYSTEM_DATA
            .filter(s => s.loyalty !== 'dominion')
            .map(s => s.id);
        this.shuffle(probeSystemIds);
        this.state.probeDeck = probeSystemIds;
    }

    initActionCards() {
        ['dominion', 'liberation'].forEach(faction => {
            const cards = [...ACTION_CARDS[faction]];
            this.shuffle(cards);
            this.state.actionCards[faction] = cards;
        });
    }

    chooseLiberationBase() {
        // AI picks a reasonable base location for Liberation
        // In a 2-player game, the Liberation player would pick; for now, pick from outer/rim systems
        const candidates = SYSTEM_DATA.filter(s =>
            (s.region === 'outer1' || s.region === 'outer2' || s.region === 'rim') &&
            s.loyalty !== 'dominion'
        );
        const base = candidates[Math.floor(Math.random() * candidates.length)];
        this.state.liberationBase = base.id;

        // Place Liberation starting units at base
        const baseUnits = STARTING_UNITS.liberation['_base_'];
        if (baseUnits.space) {
            baseUnits.space.forEach(u => {
                for (let i = 0; i < u.count; i++) {
                    this.state.units[base.id].space.push(this.createUnit(u.type));
                }
            });
        }
        if (baseUnits.ground) {
            baseUnits.ground.forEach(u => {
                for (let i = 0; i < u.count; i++) {
                    this.state.units[base.id].ground.push(this.createUnit(u.type));
                }
            });
        }

        // Place Liberation leaders at base
        this.state.leaders.liberation.forEach(l => {
            l.location = base.id;
        });

        // Set base system loyalty to liberation
        this.state.systems[base.id].loyalty = 'liberation';

        this.addLog(`Liberation base established in secret.`);
    }

    shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    addLog(msg) {
        this.state.log.push({ turn: this.state.turn, phase: this.state.phase, msg, time: Date.now() });
        if (this.state.log.length > 200) this.state.log.shift();
    }

    // ---- ASSIGNMENT PHASE ----

    canAssignLeader(leaderId, missionId, targetSystem) {
        const faction = this.state.activePlayer;
        const leader = this.state.leaders[faction].find(l => l.id === leaderId);
        const mission = this.state.missionHands[faction].find(m => m.id === missionId);

        if (!leader || !mission) return { ok: false, reason: 'Invalid leader or mission.' };
        if (leader.captured) return { ok: false, reason: 'Leader is captured.' };
        if (this.state.assignedLeaderIds.has(leaderId)) return { ok: false, reason: 'Leader already assigned this phase.' };
        if (leader.exhausted) return { ok: false, reason: 'Leader is exhausted.' };

        // Check skill requirement
        const skillVal = leader.skills[mission.skill] || 0;
        if (skillVal < mission.minSkill) return { ok: false, reason: `Leader needs ${mission.skill} ${mission.minSkill}+ (has ${skillVal}).` };

        return { ok: true };
    }

    assignLeader(leaderId, missionId, targetSystem) {
        const faction = this.state.activePlayer;
        const check = this.canAssignLeader(leaderId, missionId, targetSystem);
        if (!check.ok) return check;

        const leader = this.state.leaders[faction].find(l => l.id === leaderId);
        const mission = this.state.missionHands[faction].find(m => m.id === missionId);

        this.state.assignments[faction].push({
            leader: leader,
            mission: mission,
            targetSystem: targetSystem || leader.location,
        });
        this.state.assignedLeaderIds.add(leaderId);
        leader.onMission = true;
        this.state.assignmentCount[faction]++;

        this.addLog(`${leader.name} assigned to ${mission.name}.`);

        // Switch active player
        this.state.activePlayer = faction === FACTIONS.DOMINION ? FACTIONS.LIBERATION : FACTIONS.DOMINION;

        return { ok: true };
    }

    passAssignment() {
        const faction = this.state.activePlayer;
        this.addLog(`${faction === FACTIONS.DOMINION ? 'Dominion' : 'Liberation'} passes on assignment.`);

        // If both players pass (or one passes and other already done), move to command phase
        const other = faction === FACTIONS.DOMINION ? FACTIONS.LIBERATION : FACTIONS.DOMINION;

        // Actually: assignment phase ends when both players have passed consecutively
        // or when all leaders are assigned. For simplicity: pass ends your assignments.
        this.state.commandPasses[faction] = true;

        if (this.state.commandPasses[other]) {
            this.startCommandPhase();
        } else {
            this.state.activePlayer = other;
        }
    }

    // ---- COMMAND PHASE ----

    startCommandPhase() {
        this.state.phase = 'command';
        this.state.activePlayer = FACTIONS.LIBERATION;
        this.state.commandPasses = { dominion: false, liberation: false };
        this.addLog('Command Phase begins. Resolve missions and move fleets.');

        // Reveal assignments
        this.state.assignments.dominion.forEach(a => {
            this.addLog(`Dominion reveals: ${a.leader.name} on ${a.mission.name}`);
        });
        this.state.assignments.liberation.forEach(a => {
            this.addLog(`Liberation reveals: ${a.leader.name} on ${a.mission.name}`);
        });
    }

    // Command phase: player can either resolve a mission, activate a system (move units), or pass
    canResolveMission(faction) {
        return this.state.assignments[faction].length > 0;
    }

    resolveMission(assignmentIndex) {
        const faction = this.state.activePlayer;
        const assignment = this.state.assignments[faction][assignmentIndex];
        if (!assignment) return { ok: false, reason: 'No such assignment.' };

        const { leader, mission, targetSystem } = assignment;

        // Check if opponent wants to send a leader to oppose
        // (handled in UI - for now, auto-resolve)

        // Resolve the mission effect
        const result = this.executeMissionEffect(faction, leader, mission, targetSystem);

        // Remove from assignments
        this.state.assignments[faction].splice(assignmentIndex, 1);

        // Move leader to target system
        leader.location = targetSystem;
        leader.onMission = false;

        // Remove mission from hand if not repeatable
        if (!mission.repeatable) {
            const idx = this.state.missionHands[faction].indexOf(mission);
            if (idx >= 0) this.state.missionHands[faction].splice(idx, 1);
        }

        this.addLog(`${leader.name} completes ${mission.name}: ${result.msg}`);

        // Switch player
        this.advanceCommandTurn();

        return { ok: true, result };
    }

    executeMissionEffect(faction, leader, mission, targetSystem) {
        const sys = this.state.systems[targetSystem];
        if (!sys) return { msg: 'No valid target.' };

        switch (mission.effect) {
            case 'probe': {
                // Draw top probe card, if it matches a system, that system is probed
                if (this.state.probeDeck.length > 0) {
                    const probed = this.state.probeDeck.pop();
                    this.state.probeDiscards.push(probed);
                    this.state.systems[probed].probed = true;
                    if (probed === this.state.liberationBase) {
                        this.addLog('THE HIDDEN BASE HAS BEEN FOUND!');
                        this.state.baseRevealed = true;
                        return { msg: `Probe reveals ${this.state.systems[probed].name} - BASE FOUND!` };
                    }
                    return { msg: `Probed ${this.state.systems[probed].name} - no base found.` };
                }
                return { msg: 'No more probe cards.' };
            }
            case 'intel_sweep': {
                const drawn = [];
                for (let i = 0; i < 2 && this.state.probeDeck.length > 0; i++) {
                    const probed = this.state.probeDeck.pop();
                    this.state.probeDiscards.push(probed);
                    this.state.systems[probed].probed = true;
                    drawn.push(this.state.systems[probed].name);
                    if (probed === this.state.liberationBase) {
                        this.state.baseRevealed = true;
                        return { msg: `Intel sweep reveals BASE at ${this.state.systems[probed].name}!` };
                    }
                }
                return { msg: `Intel sweep: probed ${drawn.join(', ')} - no base.` };
            }
            case 'sway_dominion': {
                if (sys.loyalty === 'neutral') {
                    sys.loyalty = 'dominion';
                    return { msg: `${sys.name} now loyal to Dominion.` };
                } else if (sys.loyalty === 'liberation') {
                    sys.loyalty = 'neutral';
                    return { msg: `${sys.name} loyalty weakened to neutral.` };
                }
                return { msg: `${sys.name} already loyal.` };
            }
            case 'sway_liberation': {
                if (sys.loyalty === 'neutral') {
                    sys.loyalty = 'liberation';
                    return { msg: `${sys.name} now loyal to Liberation.` };
                } else if (sys.loyalty === 'dominion') {
                    sys.loyalty = 'neutral';
                    return { msg: `${sys.name} loyalty weakened to neutral.` };
                }
                return { msg: `${sys.name} already sympathetic.` };
            }
            case 'propaganda': {
                let count = 0;
                Object.values(this.state.systems).forEach(s => {
                    if (s.loyalty === 'neutral' && count < 2) {
                        s.loyalty = 'dominion';
                        count++;
                    }
                });
                return { msg: `Propaganda shifts ${count} systems to Dominion loyalty.` };
            }
            case 'bombardment': {
                const enemyGround = this.state.units[targetSystem].ground
                    .filter(u => u.faction !== faction);
                let destroyed = 0;
                for (let i = 0; i < 2 && enemyGround.length > 0; i++) {
                    const target = enemyGround.pop();
                    this.removeUnit(targetSystem, 'ground', target.id);
                    destroyed++;
                }
                return { msg: `Bombardment destroys ${destroyed} enemy ground units.` };
            }
            case 'subjugate': {
                const hasGround = this.state.units[targetSystem].ground
                    .some(u => u.faction === faction);
                if (hasGround) {
                    sys.loyalty = faction;
                    sys.subjugated = true;
                    return { msg: `${sys.name} has been subjugated.` };
                }
                return { msg: 'No ground forces to subjugate with.' };
            }
            case 'build_titan': {
                if (!this.state.titanBuilt) {
                    this.state.productionQueue.dominion.push({
                        unitType: 'dom_super',
                        systemId: targetSystem,
                        turnsLeft: 3,
                    });
                    return { msg: 'Titan construction begins! (3 turns)' };
                }
                return { msg: 'Titan already built or under construction.' };
            }
            case 'capture': {
                // Try to capture an enemy leader in the target system
                const enemyFaction = faction === FACTIONS.DOMINION ? FACTIONS.LIBERATION : FACTIONS.DOMINION;
                const enemyLeaders = this.state.leaders[enemyFaction]
                    .filter(l => l.location === targetSystem && !l.captured);
                if (enemyLeaders.length > 0) {
                    const target = enemyLeaders[0];
                    // Skill check: intel vs intel
                    const mySkill = leader.skills.intel;
                    const theirSkill = target.skills.intel;
                    if (mySkill >= theirSkill) {
                        target.captured = true;
                        target.location = null;
                        this.state.capturedLeaders.push(target);
                        if (faction === FACTIONS.LIBERATION) {
                            this.state.stats.domLeadersCaptured++;
                        }
                        return { msg: `${target.name} has been captured!` };
                    }
                    return { msg: `Capture attempt failed - ${target.name} evaded.` };
                }
                return { msg: 'No enemy leaders to capture here.' };
            }
            case 'logistics_move': {
                // Move units from 2 adjacent systems toward this leader's system
                const adj = this.getAdjacentSystems(targetSystem);
                let moved = 0;
                for (const adjSys of adj.slice(0, 2)) {
                    const friendlySpace = this.state.units[adjSys].space.filter(u => u.faction === faction);
                    const friendlyGround = this.state.units[adjSys].ground.filter(u => u.faction === faction && !Object.values(UNIT_TYPES).find(t => t.id === u.typeId)?.isStructure);
                    friendlySpace.forEach(u => {
                        this.state.units[adjSys].space = this.state.units[adjSys].space.filter(x => x.id !== u.id);
                        this.state.units[targetSystem].space.push(u);
                        moved++;
                    });
                    friendlyGround.forEach(u => {
                        this.state.units[adjSys].ground = this.state.units[adjSys].ground.filter(x => x.id !== u.id);
                        this.state.units[targetSystem].ground.push(u);
                        moved++;
                    });
                }
                return { msg: `Supply lines move ${moved} units to ${sys.name}.` };
            }
            case 'build_structure': {
                const structType = faction === FACTIONS.DOMINION ? 'dom_shield' : 'lib_shield';
                if (sys.loyalty === faction && sys.hasProduction) {
                    this.state.units[targetSystem].ground.push(this.createUnit(structType));
                    return { msg: `${UNIT_TYPES[structType.toUpperCase()].name} built at ${sys.name}.` };
                }
                return { msg: 'Cannot build here - need loyal system with production.' };
            }
            case 'sabotage': {
                const enemyQ = this.state.productionQueue[faction === FACTIONS.DOMINION ? FACTIONS.LIBERATION : FACTIONS.DOMINION];
                if (enemyQ.length > 0) {
                    const removed = enemyQ.pop();
                    return { msg: `Sabotaged ${removed.unitType} production!` };
                }
                return { msg: 'Nothing to sabotage.' };
            }
            case 'covert_op': {
                // Look at top 3 probe cards
                const top3 = this.state.probeDeck.slice(-3);
                const names = top3.map(id => this.state.systems[id].name);
                return { msg: `Covert intel: next probes will check ${names.join(', ')}.` };
            }
            case 'hit_and_run': {
                const enemies = this.state.units[targetSystem].space
                    .filter(u => u.faction !== faction);
                if (enemies.length > 0) {
                    const target = enemies[0];
                    this.removeUnit(targetSystem, 'space', target.id);
                    return { msg: `Hit and run! Destroyed enemy ${target.type}.` };
                }
                return { msg: 'No enemy ships to attack.' };
            }
            case 'uprising': {
                if (sys.loyalty === 'liberation' || sys.loyalty === 'neutral') {
                    for (let i = 0; i < 2; i++) {
                        this.state.units[targetSystem].ground.push(this.createUnit('lib_trooper'));
                    }
                    return { msg: `Uprising! 2 Volunteers rally at ${sys.name}.` };
                }
                return { msg: 'Cannot inspire uprising in a Dominion-loyal world.' };
            }
            case 'relocate_base': {
                // Move base to a non-Dominion-controlled system in outer/rim region
                const candidates = Object.values(this.state.systems).filter(s =>
                    s.loyalty !== 'dominion' && s.id !== this.state.liberationBase &&
                    (s.region === 'outer1' || s.region === 'outer2' || s.region === 'rim')
                );
                if (candidates.length > 0) {
                    const newBase = candidates[Math.floor(Math.random() * candidates.length)];
                    // Move all base units to new location
                    const oldBase = this.state.liberationBase;
                    ['space', 'ground'].forEach(domain => {
                        const libUnits = this.state.units[oldBase][domain].filter(u => u.faction === FACTIONS.LIBERATION);
                        libUnits.forEach(u => {
                            this.state.units[oldBase][domain] = this.state.units[oldBase][domain].filter(x => x.id !== u.id);
                            this.state.units[newBase.id][domain].push(u);
                        });
                    });
                    this.state.liberationBase = newBase.id;
                    this.state.baseRevealed = false;
                    newBase.loyalty = 'liberation';
                    return { msg: `Base relocated to a new hidden location.` };
                }
                return { msg: 'No valid relocation targets.' };
            }
            case 'recruit': {
                // Add a new leader with moderate skills
                const newLeader = {
                    id: 'lib_l_new_' + Date.now(),
                    name: ['Agent Nova', 'Warden Skye', 'Captain Ash', 'Sentinel Dawn'][Math.floor(Math.random() * 4)],
                    skills: { diplomacy: 1, intel: 1, combat: 1, logistics: 1 },
                    startSystem: null,
                    faction: 'liberation',
                    avatar: 'N',
                    color: '#5ce',
                    location: leader.location,
                    onMission: false,
                    captured: false,
                    exhausted: false,
                };
                this.state.leaders.liberation.push(newLeader);
                return { msg: `${newLeader.name} joins the Liberation!` };
            }
            case 'rapid_move': {
                // Move all friendly units from target system to any connected system
                const adj = this.getAdjacentSystems(targetSystem);
                if (adj.length > 0) {
                    const dest = adj[0]; // In a full implementation, player picks
                    const friendlySpace = this.state.units[targetSystem].space.filter(u => u.faction === faction);
                    const friendlyGround = this.state.units[targetSystem].ground.filter(u => u.faction === faction && !Object.values(UNIT_TYPES).find(t => t.id === u.typeId)?.isStructure);
                    let moved = 0;
                    friendlySpace.forEach(u => {
                        this.state.units[targetSystem].space = this.state.units[targetSystem].space.filter(x => x.id !== u.id);
                        this.state.units[dest].space.push(u);
                        moved++;
                    });
                    friendlyGround.forEach(u => {
                        this.state.units[targetSystem].ground = this.state.units[targetSystem].ground.filter(x => x.id !== u.id);
                        this.state.units[dest].ground.push(u);
                        moved++;
                    });
                    return { msg: `Rapid mobilization moves ${moved} units to ${this.state.systems[dest].name}.` };
                }
                return { msg: 'No adjacent systems for rapid move.' };
            }
            case 'guerrilla': {
                // Deal damage to enemy fleet without full combat
                const enemyShips = this.state.units[targetSystem].space.filter(u => u.faction !== faction);
                if (enemyShips.length > 0) {
                    // Destroy up to 2 light ships
                    let destroyed = 0;
                    const lights = enemyShips.filter(u => {
                        const ut = Object.values(UNIT_TYPES).find(t => t.id === u.typeId);
                        return ut && (ut.isLight || ut.health === 1);
                    });
                    for (let i = 0; i < 2 && i < lights.length; i++) {
                        this.removeUnit(targetSystem, 'space', lights[i].id);
                        destroyed++;
                    }
                    if (destroyed === 0 && enemyShips.length > 0) {
                        // Damage a heavier ship instead
                        enemyShips[0].damage = (enemyShips[0].damage || 0) + 1;
                        return { msg: `Guerrilla strike damages ${enemyShips[0].type}!` };
                    }
                    return { msg: `Guerrilla strike destroys ${destroyed} enemy ships!` };
                }
                return { msg: 'No enemy ships to strike.' };
            }
            default:
                return { msg: 'Mission completed.' };
        }
    }

    removeUnit(systemId, domain, unitId) {
        const units = this.state.units[systemId][domain];
        const idx = units.findIndex(u => u.id === unitId);
        if (idx >= 0) units.splice(idx, 1);
    }

    advanceCommandTurn() {
        const current = this.state.activePlayer;
        const other = current === FACTIONS.DOMINION ? FACTIONS.LIBERATION : FACTIONS.DOMINION;

        // Check if both have no more assignments and both passed
        const currentHasActions = this.state.assignments[current].length > 0;
        const otherHasActions = this.state.assignments[other].length > 0;

        if (!currentHasActions && !otherHasActions) {
            this.startRefreshPhase();
        } else if (!otherHasActions) {
            // Stay with current player
        } else {
            this.state.activePlayer = other;
        }
    }

    passCommand() {
        const faction = this.state.activePlayer;
        this.state.commandPasses[faction] = true;

        const other = faction === FACTIONS.DOMINION ? FACTIONS.LIBERATION : FACTIONS.DOMINION;
        if (this.state.commandPasses[other] || this.state.assignments[other].length === 0) {
            this.startRefreshPhase();
        } else {
            this.state.activePlayer = other;
        }
    }

    // ---- MOVEMENT ----

    getAdjacentSystems(systemId) {
        return Array.from(this.state.connections.get(systemId) || []);
    }

    canMoveUnits(fromSystem, toSystem, faction) {
        const adjacent = this.getAdjacentSystems(fromSystem);
        if (!adjacent.includes(toSystem)) return false;

        // Need a leader in the origin or destination to command the move
        const hasLeader = this.state.leaders[faction].some(l =>
            (l.location === fromSystem || l.location === toSystem) && !l.captured && !l.onMission
        );
        return hasLeader;
    }

    moveUnits(fromSystem, toSystem, unitIds, faction) {
        if (!this.canMoveUnits(fromSystem, toSystem, faction)) {
            return { ok: false, reason: 'Cannot move to that system.' };
        }

        unitIds.forEach(uid => {
            // Find unit in space or ground
            ['space', 'ground'].forEach(domain => {
                const idx = this.state.units[fromSystem][domain].findIndex(u => u.id === uid);
                if (idx >= 0) {
                    const unit = this.state.units[fromSystem][domain].splice(idx, 1)[0];
                    this.state.units[toSystem][domain].push(unit);
                }
            });
        });

        // Check if this triggers combat
        const combat = this.checkCombat(toSystem);
        if (combat) {
            return { ok: true, combat: true, system: toSystem };
        }

        return { ok: true };
    }

    moveLeader(leaderId, toSystem, faction) {
        const leader = this.state.leaders[faction].find(l => l.id === leaderId);
        if (!leader) return false;
        leader.location = toSystem;
        return true;
    }

    checkCombat(systemId) {
        const spaceUnits = this.state.units[systemId].space;
        const groundUnits = this.state.units[systemId].ground;

        const domSpace = spaceUnits.filter(u => u.faction === FACTIONS.DOMINION);
        const libSpace = spaceUnits.filter(u => u.faction === FACTIONS.LIBERATION);
        const isStructure = (u) => { const ut = Object.values(UNIT_TYPES).find(t => t.id === u.typeId); return ut && ut.isStructure; };
        const domGround = groundUnits.filter(u => u.faction === FACTIONS.DOMINION && !isStructure(u));
        const libGround = groundUnits.filter(u => u.faction === FACTIONS.LIBERATION && !isStructure(u));

        if ((domSpace.length > 0 && libSpace.length > 0) ||
            (domGround.length > 0 && libGround.length > 0)) {
            return true;
        }
        return false;
    }

    // ---- REFRESH PHASE ----

    startRefreshPhase() {
        this.state.phase = 'refresh';
        this.addLog('Refresh Phase begins.');

        // 1. Retrieve leaders from missions
        ['dominion', 'liberation'].forEach(faction => {
            this.state.leaders[faction].forEach(l => {
                l.onMission = false;
                l.exhausted = false;
            });
        });

        // 2. Draw mission cards
        ['dominion', 'liberation'].forEach(faction => {
            while (this.state.missionHands[faction].length < 4 && this.state.missionDecks[faction].length > 0) {
                this.state.missionHands[faction].push(this.state.missionDecks[faction].pop());
            }
            // If deck is empty, reshuffle discards
            if (this.state.missionDecks[faction].length === 0) {
                const allMissions = MISSION_DATA[faction].filter(m =>
                    !this.state.missionHands[faction].find(h => h.id === m.id)
                );
                this.shuffle(allMissions);
                this.state.missionDecks[faction] = allMissions;
            }
        });

        // 3. Production - build units in loyal systems with production
        this.handleProduction();

        // 4. Advance production queue
        this.advanceProductionQueue();

        // 5. Deploy completed units
        this.deployCompletedProduction();

        // 6. Check objectives
        this.checkObjectives();

        // 7. Advance time marker
        this.state.timeMarker = this.state.turn;

        // 8. Check win conditions
        if (this.checkWinConditions()) return;

        // 9. Advance to next turn
        this.state.turn++;
        this.state.phase = 'assignment';
        this.state.activePlayer = FACTIONS.LIBERATION;
        this.state.commandPasses = { dominion: false, liberation: false };
        this.state.assignedLeaderIds = new Set();
        this.state.assignmentCount = { dominion: 0, liberation: 0 };
        this.state.assignments = { dominion: [], liberation: [] };

        this.addLog(`Turn ${this.state.turn} begins.`);
    }

    handleProduction() {
        // Production is capped: each loyal production system produces ONE unit
        // per turn (the first available resource type). This keeps unit counts balanced.
        // In the original board game, players choose 2 systems to build in; here
        // we auto-build at each loyal production system but only 1 unit each.
        ['dominion', 'liberation'].forEach(faction => {
            let buildCount = 0;
            const maxBuilds = faction === FACTIONS.DOMINION ? 3 : 2; // Dominion builds more

            const loyalProd = Object.entries(this.state.systems)
                .filter(([sysId, sys]) => sys.loyalty === faction && sys.hasProduction)
                .sort(() => Math.random() - 0.5); // Randomize which systems build

            for (const [sysId, sys] of loyalProd) {
                if (buildCount >= maxBuilds) break;

                // Pick the first available resource to build from
                const resTypes = Object.keys(sys.resources);
                if (resTypes.length === 0) continue;

                const resType = resTypes[buildCount % resTypes.length];
                const options = PRODUCTION_MAP[faction][resType];
                if (!options || options.length === 0) continue;

                // Build the basic unit
                const unitType = options[0];
                const ut = Object.values(UNIT_TYPES).find(t => t.id === unitType);
                if (ut) {
                    const unit = this.createUnit(ut.id);
                    if (unit) {
                        const domain = (ut.domain === 'space') ? 'space' : 'ground';
                        this.state.units[sysId][domain].push(unit);
                        buildCount++;
                    }
                }
            }

            if (buildCount > 0) {
                this.addLog(`${faction === FACTIONS.DOMINION ? 'Dominion' : 'Liberation'} produces ${buildCount} new units.`);
            }
        });
    }

    advanceProductionQueue() {
        ['dominion', 'liberation'].forEach(faction => {
            this.state.productionQueue[faction].forEach(item => {
                item.turnsLeft--;
            });
        });
    }

    deployCompletedProduction() {
        ['dominion', 'liberation'].forEach(faction => {
            const completed = this.state.productionQueue[faction].filter(item => item.turnsLeft <= 0);
            completed.forEach(item => {
                const unit = this.createUnit(item.unitType);
                if (unit) {
                    const ut = Object.values(UNIT_TYPES).find(t => t.id === item.unitType);
                    const domain = (ut.domain === 'space') ? 'space' : 'ground';
                    if (this.state.units[item.systemId]) {
                        this.state.units[item.systemId][domain].push(unit);
                    }
                    if (item.unitType === 'dom_super') {
                        this.state.titanBuilt = true;
                    }
                }
            });
            this.state.productionQueue[faction] = this.state.productionQueue[faction].filter(item => item.turnsLeft > 0);
        });
    }

    checkObjectives() {
        const toComplete = [];
        this.state.currentObjectives.forEach(obj => {
            if (this.evaluateObjective(obj)) {
                toComplete.push(obj);
            }
        });

        toComplete.forEach(obj => {
            this.state.currentObjectives = this.state.currentObjectives.filter(o => o.id !== obj.id);
            this.state.completedObjectives.push(obj);
            this.state.reputationMarker -= obj.points;
            this.addLog(`Objective completed: ${obj.name} (${obj.points} points)! Reputation now ${this.state.reputationMarker}.`);

            // Draw replacement
            if (this.state.objectiveDeck.length > 0) {
                this.state.currentObjectives.push(this.state.objectiveDeck.pop());
            }
        });
    }

    evaluateObjective(obj) {
        switch (obj.check) {
            case 'loyalty_outside_core_3': {
                const count = Object.values(this.state.systems)
                    .filter(s => s.loyalty === 'liberation' && s.region !== 'core').length;
                return count >= 3;
            }
            case 'win_ground_defense':
                return this.state.stats.groundDefenseWins > 0;
            case 'destroy_capital':
                return this.state.stats.capitalShipsDestroyed > 0;
            case 'loyalty_3_regions': {
                const regions = new Set(
                    Object.values(this.state.systems)
                        .filter(s => s.loyalty === 'liberation')
                        .map(s => s.region)
                );
                return regions.size >= 3;
            }
            case 'control_3_production': {
                const count = Object.values(this.state.systems)
                    .filter(s => s.loyalty === 'liberation' && s.hasProduction).length;
                return count >= 3;
            }
            case 'win_space_vs_3plus':
                return this.state.stats.spaceWinsVs3Plus > 0;
            case 'loyalty_5_systems': {
                const count = Object.values(this.state.systems)
                    .filter(s => s.loyalty === 'liberation').length;
                return count >= 5;
            }
            case 'capture_dom_leader':
                return this.state.stats.domLeadersCaptured > 0;
            case 'loyalty_core_world':
                return Object.values(this.state.systems)
                    .some(s => s.loyalty === 'liberation' && s.region === 'core');
            case 'control_4_regions': {
                const regions = new Set(
                    Object.values(this.state.systems)
                        .filter(s => s.loyalty === 'liberation')
                        .map(s => s.region)
                );
                return regions.size >= 4;
            }
            case 'destroy_titan':
                return this.state.titanDestroyed;
            case 'loyalty_8_systems': {
                const count = Object.values(this.state.systems)
                    .filter(s => s.loyalty === 'liberation').length;
                return count >= 8;
            }
            case 'destroy_5_units_battle':
                return this.state.stats.unitsDestroyedInBattle >= 5;
            case 'survive_10_turns':
                return this.state.turn >= 10 && !this.state.baseRevealed;
            default:
                return false;
        }
    }

    checkWinConditions() {
        // Dominion wins: find and destroy the Liberation base (all ground units at base destroyed after base revealed)
        if (this.state.baseRevealed) {
            const baseId = this.state.liberationBase;
            const libGround = this.state.units[baseId].ground.filter(u => u.faction === FACTIONS.LIBERATION);
            if (libGround.length === 0) {
                this.state.gameOver = true;
                this.state.winner = FACTIONS.DOMINION;
                this.addLog('The Dominion has found and destroyed the Liberation base! Dominion wins!');
                return true;
            }
        }

        // Liberation wins: reputation marker meets or passes time marker
        if (this.state.reputationMarker <= this.state.timeMarker) {
            this.state.gameOver = true;
            this.state.winner = FACTIONS.LIBERATION;
            this.addLog('The Liberation has inspired the galaxy! Liberation wins!');
            return true;
        }

        // Dominion wins by timeout: if turn 14 ends and Liberation hasn't won
        if (this.state.turn >= MAX_TURNS && this.state.phase === 'refresh') {
            this.state.gameOver = true;
            this.state.winner = FACTIONS.DOMINION;
            this.addLog('Time has run out. The Dominion maintains its iron grip. Dominion wins!');
            return true;
        }

        return false;
    }

    // ---- UTILITY ----

    getSystemUnits(systemId, faction) {
        if (!this.state.units[systemId]) return { space: [], ground: [] };
        return {
            space: this.state.units[systemId].space.filter(u => u.faction === faction),
            ground: this.state.units[systemId].ground.filter(u => u.faction === faction),
        };
    }

    getLeadersInSystem(systemId, faction) {
        return this.state.leaders[faction].filter(l => l.location === systemId && !l.captured);
    }

    getFactionSystems(faction) {
        return Object.values(this.state.systems).filter(s => s.loyalty === faction);
    }

    getTotalUnits(faction) {
        let count = 0;
        Object.values(this.state.units).forEach(sys => {
            count += sys.space.filter(u => u.faction === faction).length;
            count += sys.ground.filter(u => u.faction === faction).length;
        });
        return count;
    }
}

// Global engine instance
const engine = new GameEngine();
