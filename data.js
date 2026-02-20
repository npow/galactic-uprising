// ============================================================
// GALACTIC UPRISING - Game Data
// Re-themed asymmetric strategy board game
// Dominion (authoritarian empire) vs Liberation (freedom fighters)
// ============================================================

const FACTIONS = {
    DOMINION: 'dominion',
    LIBERATION: 'liberation'
};

// ---- SYSTEMS (32 systems across 8 regions) ----
// Each system: name, region, loyalty, hasProduction, resources, ground slots, space capacity
// Resources: { fleet, trooper, structure, airship }
const REGIONS = [
    { id: 'core', name: 'Core Worlds', color: '#ffcc44' },
    { id: 'inner1', name: 'Verdant Expanse', color: '#44cc88' },
    { id: 'inner2', name: 'Iron Nebula', color: '#cc7744' },
    { id: 'mid1', name: 'Sapphire Reach', color: '#4488cc' },
    { id: 'mid2', name: 'Crimson Veil', color: '#cc4466' },
    { id: 'outer1', name: 'Frozen Drift', color: '#88aacc' },
    { id: 'outer2', name: 'Shadow Marches', color: '#886688' },
    { id: 'rim', name: 'Wild Rim', color: '#88aa44' }
];

const SYSTEM_DATA = [
    // Core Worlds
    { id: 'nexus_prime', name: 'Nexus Prime', region: 'core', loyalty: 'dominion', resources: { fleet: 1, trooper: 1 }, hasProduction: true, x: 0.48, y: 0.45 },
    { id: 'throne_world', name: 'Throne World', region: 'core', loyalty: 'dominion', resources: { fleet: 2, trooper: 1 }, hasProduction: true, x: 0.52, y: 0.40 },
    { id: 'aurum_spire', name: 'Aurum Spire', region: 'core', loyalty: 'dominion', resources: { fleet: 1, structure: 1 }, hasProduction: true, x: 0.44, y: 0.38 },
    { id: 'citadel_reach', name: 'Citadel Reach', region: 'core', loyalty: 'dominion', resources: { trooper: 2 }, hasProduction: true, x: 0.56, y: 0.48 },

    // Verdant Expanse
    { id: 'sylvan_prime', name: 'Sylvan Prime', region: 'inner1', loyalty: 'neutral', resources: { fleet: 1, trooper: 1 }, hasProduction: true, x: 0.30, y: 0.30 },
    { id: 'fern_haven', name: 'Fern Haven', region: 'inner1', loyalty: 'neutral', resources: { trooper: 1 }, hasProduction: false, x: 0.25, y: 0.38 },
    { id: 'emerald_gate', name: 'Emerald Gate', region: 'inner1', loyalty: 'neutral', resources: { fleet: 1 }, hasProduction: true, x: 0.32, y: 0.42 },
    { id: 'bloom_station', name: 'Bloom Station', region: 'inner1', loyalty: 'neutral', resources: { structure: 1 }, hasProduction: false, x: 0.22, y: 0.32 },

    // Iron Nebula
    { id: 'forge_world', name: 'Forge World', region: 'inner2', loyalty: 'dominion', resources: { fleet: 1, structure: 1 }, hasProduction: true, x: 0.68, y: 0.32 },
    { id: 'anvil_station', name: 'Anvil Station', region: 'inner2', loyalty: 'neutral', resources: { fleet: 1, trooper: 1 }, hasProduction: true, x: 0.72, y: 0.40 },
    { id: 'rust_hollow', name: 'Rust Hollow', region: 'inner2', loyalty: 'neutral', resources: { trooper: 1 }, hasProduction: false, x: 0.75, y: 0.35 },
    { id: 'ore_cluster', name: 'Ore Cluster', region: 'inner2', loyalty: 'neutral', resources: { structure: 1 }, hasProduction: false, x: 0.65, y: 0.28 },

    // Sapphire Reach
    { id: 'azure_haven', name: 'Azure Haven', region: 'mid1', loyalty: 'neutral', resources: { fleet: 1, trooper: 1 }, hasProduction: true, x: 0.20, y: 0.52 },
    { id: 'crystal_bay', name: 'Crystal Bay', region: 'mid1', loyalty: 'neutral', resources: { fleet: 1 }, hasProduction: true, x: 0.15, y: 0.48 },
    { id: 'deep_blue', name: 'Deep Blue', region: 'mid1', loyalty: 'neutral', resources: { trooper: 1, structure: 1 }, hasProduction: false, x: 0.18, y: 0.58 },
    { id: 'wave_crest', name: 'Wave Crest', region: 'mid1', loyalty: 'neutral', resources: { airship: 1 }, hasProduction: false, x: 0.25, y: 0.55 },

    // Crimson Veil
    { id: 'scarlet_keep', name: 'Scarlet Keep', region: 'mid2', loyalty: 'neutral', resources: { fleet: 1, trooper: 1 }, hasProduction: true, x: 0.78, y: 0.52 },
    { id: 'blood_nebula', name: 'Blood Nebula', region: 'mid2', loyalty: 'neutral', resources: { fleet: 1 }, hasProduction: false, x: 0.82, y: 0.48 },
    { id: 'garnet_station', name: 'Garnet Station', region: 'mid2', loyalty: 'neutral', resources: { trooper: 1, structure: 1 }, hasProduction: true, x: 0.80, y: 0.55 },
    { id: 'ember_falls', name: 'Ember Falls', region: 'mid2', loyalty: 'neutral', resources: { airship: 1 }, hasProduction: false, x: 0.75, y: 0.58 },

    // Frozen Drift
    { id: 'glacier_point', name: 'Glacier Point', region: 'outer1', loyalty: 'neutral', resources: { fleet: 1 }, hasProduction: true, x: 0.15, y: 0.68 },
    { id: 'frost_haven', name: 'Frost Haven', region: 'outer1', loyalty: 'neutral', resources: { trooper: 1 }, hasProduction: false, x: 0.20, y: 0.72 },
    { id: 'ice_crown', name: 'Ice Crown', region: 'outer1', loyalty: 'neutral', resources: { trooper: 1, airship: 1 }, hasProduction: true, x: 0.12, y: 0.75 },
    { id: 'tundra_base', name: 'Tundra Base', region: 'outer1', loyalty: 'liberation', resources: { fleet: 1, trooper: 1 }, hasProduction: true, x: 0.22, y: 0.78 },

    // Shadow Marches
    { id: 'dusk_port', name: 'Dusk Port', region: 'outer2', loyalty: 'neutral', resources: { fleet: 1, structure: 1 }, hasProduction: true, x: 0.78, y: 0.68 },
    { id: 'twilight_reach', name: 'Twilight Reach', region: 'outer2', loyalty: 'neutral', resources: { trooper: 1 }, hasProduction: false, x: 0.82, y: 0.72 },
    { id: 'umbral_gate', name: 'Umbral Gate', region: 'outer2', loyalty: 'neutral', resources: { fleet: 1 }, hasProduction: true, x: 0.85, y: 0.68 },
    { id: 'void_station', name: 'Void Station', region: 'outer2', loyalty: 'neutral', resources: { airship: 1 }, hasProduction: false, x: 0.80, y: 0.78 },

    // Wild Rim
    { id: 'outpost_alpha', name: 'Outpost Alpha', region: 'rim', loyalty: 'neutral', resources: { fleet: 1 }, hasProduction: true, x: 0.35, y: 0.75 },
    { id: 'frontier_end', name: 'Frontier\'s End', region: 'rim', loyalty: 'neutral', resources: { trooper: 1, airship: 1 }, hasProduction: false, x: 0.40, y: 0.80 },
    { id: 'nova_point', name: 'Nova Point', region: 'rim', loyalty: 'neutral', resources: { fleet: 1, trooper: 1 }, hasProduction: true, x: 0.55, y: 0.78 },
    { id: 'edge_station', name: 'Edge Station', region: 'rim', loyalty: 'neutral', resources: { structure: 1 }, hasProduction: false, x: 0.60, y: 0.75 }
];

// System connections (adjacency) - which systems can be traveled between
const CONNECTIONS = [
    // Core interconnections
    ['nexus_prime', 'throne_world'], ['nexus_prime', 'aurum_spire'], ['throne_world', 'citadel_reach'],
    ['aurum_spire', 'throne_world'], ['citadel_reach', 'nexus_prime'],
    // Core to inner
    ['aurum_spire', 'sylvan_prime'], ['nexus_prime', 'emerald_gate'], ['throne_world', 'forge_world'],
    ['citadel_reach', 'anvil_station'],
    // Verdant Expanse
    ['sylvan_prime', 'fern_haven'], ['sylvan_prime', 'bloom_station'], ['fern_haven', 'emerald_gate'],
    ['bloom_station', 'emerald_gate'],
    // Iron Nebula
    ['forge_world', 'ore_cluster'], ['forge_world', 'anvil_station'], ['anvil_station', 'rust_hollow'],
    ['ore_cluster', 'rust_hollow'],
    // Inner to mid
    ['fern_haven', 'azure_haven'], ['emerald_gate', 'wave_crest'], ['anvil_station', 'scarlet_keep'],
    ['rust_hollow', 'blood_nebula'],
    // Sapphire Reach
    ['azure_haven', 'crystal_bay'], ['azure_haven', 'deep_blue'], ['crystal_bay', 'deep_blue'],
    ['deep_blue', 'wave_crest'],
    // Crimson Veil
    ['scarlet_keep', 'blood_nebula'], ['scarlet_keep', 'garnet_station'], ['blood_nebula', 'ember_falls'],
    ['garnet_station', 'ember_falls'],
    // Mid to outer
    ['crystal_bay', 'glacier_point'], ['wave_crest', 'frost_haven'], ['garnet_station', 'dusk_port'],
    ['ember_falls', 'twilight_reach'],
    // Frozen Drift
    ['glacier_point', 'frost_haven'], ['glacier_point', 'ice_crown'], ['frost_haven', 'tundra_base'],
    ['ice_crown', 'tundra_base'],
    // Shadow Marches
    ['dusk_port', 'twilight_reach'], ['dusk_port', 'umbral_gate'], ['twilight_reach', 'void_station'],
    ['umbral_gate', 'void_station'],
    // Outer to rim
    ['tundra_base', 'outpost_alpha'], ['frost_haven', 'outpost_alpha'], ['void_station', 'edge_station'],
    ['twilight_reach', 'nova_point'],
    // Wild Rim
    ['outpost_alpha', 'frontier_end'], ['frontier_end', 'nova_point'], ['nova_point', 'edge_station'],
    // Cross-connections
    ['wave_crest', 'outpost_alpha'], ['ember_falls', 'dusk_port'], ['nexus_prime', 'forge_world'],
    ['sylvan_prime', 'ore_cluster'], ['edge_station', 'umbral_gate']
];

// ---- UNIT TYPES ----
const UNIT_TYPES = {
    // Dominion ground units
    DOM_TROOPER: { id: 'dom_trooper', name: 'Enforcer', faction: 'dominion', domain: 'ground', health: 1, attack: { black: 1 }, cost: 1, icon: '⬢', color: '#e74c3c' },
    DOM_ARMOR: { id: 'dom_armor', name: 'Siege Walker', faction: 'dominion', domain: 'ground', health: 2, attack: { red: 1 }, cost: 2, icon: '⬡', color: '#e85d4f' },
    DOM_ASSAULT: { id: 'dom_assault', name: 'Storm Legion', faction: 'dominion', domain: 'ground', health: 3, attack: { red: 1, black: 1 }, cost: 3, icon: '◆', color: '#f07060' },

    // Dominion space units
    DOM_FIGHTER: { id: 'dom_fighter', name: 'Interceptor', faction: 'dominion', domain: 'space', health: 1, attack: { black: 1 }, cost: 1, icon: '▸', color: '#e74c3c', isLight: true },
    DOM_CRUISER: { id: 'dom_cruiser', name: 'Warship', faction: 'dominion', domain: 'space', health: 2, attack: { red: 1 }, cost: 2, icon: '◈', color: '#e85d4f' },
    DOM_CAPITAL: { id: 'dom_capital', name: 'Dreadnought', faction: 'dominion', domain: 'space', health: 3, attack: { red: 2 }, cost: 3, icon: '◉', color: '#f07060', carriesGround: 4, carriesFighters: 2 },
    DOM_SUPER: { id: 'dom_super', name: 'Titan', faction: 'dominion', domain: 'space', health: 4, attack: { red: 3 }, cost: 0, icon: '★', color: '#ff8070', carriesGround: 6, carriesFighters: 4, isUnique: true },

    // Liberation ground units
    LIB_TROOPER: { id: 'lib_trooper', name: 'Volunteer', faction: 'liberation', domain: 'ground', health: 1, attack: { black: 1 }, cost: 1, icon: '⬢', color: '#5dade2' },
    LIB_ARMOR: { id: 'lib_armor', name: 'Raider Mech', faction: 'liberation', domain: 'ground', health: 2, attack: { red: 1 }, cost: 2, icon: '⬡', color: '#6dbde8' },
    LIB_SPECIAL: { id: 'lib_special', name: 'Pathfinder', faction: 'liberation', domain: 'ground', health: 1, attack: { black: 2 }, cost: 2, icon: '◇', color: '#85c1e9' },

    // Liberation space units
    LIB_FIGHTER: { id: 'lib_fighter', name: 'Strikecraft', faction: 'liberation', domain: 'space', health: 1, attack: { black: 1 }, cost: 1, icon: '▸', color: '#5dade2', isLight: true },
    LIB_CORVETTE: { id: 'lib_corvette', name: 'Corvette', faction: 'liberation', domain: 'space', health: 2, attack: { red: 1 }, cost: 2, icon: '◈', color: '#6dbde8' },
    LIB_FRIGATE: { id: 'lib_frigate', name: 'Frigate', faction: 'liberation', domain: 'space', health: 3, attack: { red: 1, black: 1 }, cost: 3, icon: '◉', color: '#85c1e9', carriesGround: 2, carriesFighters: 1 },

    // Structures (built on planets)
    DOM_SHIELD: { id: 'dom_shield', name: 'Shield Array', faction: 'dominion', domain: 'structure', health: 3, attack: {}, cost: 1, icon: '▣', color: '#e74c3c', isStructure: true, blockGround: true },
    LIB_SHIELD: { id: 'lib_shield', name: 'Ion Barrier', faction: 'liberation', domain: 'structure', health: 3, attack: {}, cost: 1, icon: '▣', color: '#5dade2', isStructure: true, blockGround: true },
};

// ---- LEADERS ----
// Skills: diplomacy, intel, combat, logistics
const LEADER_DATA = {
    dominion: [
        { id: 'dom_l1', name: 'Grand Regent Voss', skills: { diplomacy: 2, intel: 1, combat: 2, logistics: 1 }, startSystem: 'throne_world', faction: 'dominion', avatar: 'V', color: '#e74c3c', isRing: true },
        { id: 'dom_l2', name: 'Admiral Krath', skills: { diplomacy: 0, intel: 1, combat: 3, logistics: 2 }, startSystem: 'throne_world', faction: 'dominion', avatar: 'K', color: '#c0392b' },
        { id: 'dom_l3', name: 'Director Sable', skills: { diplomacy: 1, intel: 3, combat: 0, logistics: 1 }, startSystem: 'nexus_prime', faction: 'dominion', avatar: 'S', color: '#a93226' },
        { id: 'dom_l4', name: 'General Thorne', skills: { diplomacy: 0, intel: 0, combat: 3, logistics: 3 }, startSystem: 'citadel_reach', faction: 'dominion', avatar: 'T', color: '#e85d4f' },
        { id: 'dom_l5', name: 'Emissary Lux', skills: { diplomacy: 3, intel: 2, combat: 0, logistics: 0 }, startSystem: 'nexus_prime', faction: 'dominion', avatar: 'L', color: '#b03a2e' },
        { id: 'dom_l6', name: 'Warden Hex', skills: { diplomacy: 1, intel: 1, combat: 2, logistics: 2 }, startSystem: 'forge_world', faction: 'dominion', avatar: 'H', color: '#d35448' },
    ],
    liberation: [
        { id: 'lib_l1', name: 'Commander Astra', skills: { diplomacy: 1, intel: 1, combat: 3, logistics: 1 }, startSystem: null, faction: 'liberation', avatar: 'A', color: '#5dade2', isRing: true },
        { id: 'lib_l2', name: 'Sage Orion', skills: { diplomacy: 2, intel: 2, combat: 1, logistics: 1 }, startSystem: null, faction: 'liberation', avatar: 'O', color: '#2e86c1' },
        { id: 'lib_l3', name: 'Scout Vex', skills: { diplomacy: 0, intel: 3, combat: 1, logistics: 2 }, startSystem: null, faction: 'liberation', avatar: 'X', color: '#2471a3' },
        { id: 'lib_l4', name: 'Captain Reeve', skills: { diplomacy: 1, intel: 0, combat: 2, logistics: 3 }, startSystem: null, faction: 'liberation', avatar: 'R', color: '#6dbde8' },
        { id: 'lib_l5', name: 'Envoy Pax', skills: { diplomacy: 3, intel: 1, combat: 0, logistics: 1 }, startSystem: null, faction: 'liberation', avatar: 'P', color: '#3498db' },
        { id: 'lib_l6', name: 'Partisan Zara', skills: { diplomacy: 0, intel: 2, combat: 2, logistics: 2 }, startSystem: null, faction: 'liberation', avatar: 'Z', color: '#2980b9' },
    ]
};

// ---- MISSIONS ----
// Each mission: name, faction, description, skillCheck (skill type + min), effect
const MISSION_DATA = {
    dominion: [
        { id: 'dom_m1', name: 'Sector Patrol', skill: 'combat', minSkill: 1, desc: 'Probe a remote system to search for the hidden base.', effect: 'probe', repeatable: true },
        { id: 'dom_m2', name: 'Enforce Loyalty', skill: 'diplomacy', minSkill: 1, desc: 'Shift a neutral system\'s loyalty toward the Dominion.', effect: 'sway_dominion', repeatable: true },
        { id: 'dom_m3', name: 'Intelligence Sweep', skill: 'intel', minSkill: 2, desc: 'Draw 2 probe cards. Reveal information about the hidden base.', effect: 'intel_sweep', repeatable: true },
        { id: 'dom_m4', name: 'Orbital Bombardment', skill: 'combat', minSkill: 2, desc: 'Destroy 2 enemy ground units in a system you control.', effect: 'bombardment', repeatable: true },
        { id: 'dom_m5', name: 'Subjugate World', skill: 'diplomacy', minSkill: 2, desc: 'Claim an unloyal system with your ground forces.', effect: 'subjugate', repeatable: true },
        { id: 'dom_m6', name: 'Construct Titan', skill: 'logistics', minSkill: 3, desc: 'Begin construction of the devastating Titan warship.', effect: 'build_titan', repeatable: false },
        { id: 'dom_m7', name: 'Espionage Network', skill: 'intel', minSkill: 1, desc: 'Capture an enemy leader on a mission.', effect: 'capture', repeatable: true },
        { id: 'dom_m8', name: 'Supply Lines', skill: 'logistics', minSkill: 1, desc: 'Move units from up to 2 systems into adjacent systems.', effect: 'logistics_move', repeatable: true },
        { id: 'dom_m9', name: 'Establish Garrison', skill: 'logistics', minSkill: 2, desc: 'Build a Shield Array in a loyal system.', effect: 'build_structure', repeatable: true },
        { id: 'dom_m10', name: 'Propaganda Blitz', skill: 'diplomacy', minSkill: 3, desc: 'Shift 2 systems toward Dominion loyalty.', effect: 'propaganda', repeatable: true },
    ],
    liberation: [
        { id: 'lib_m1', name: 'Sabotage', skill: 'intel', minSkill: 1, desc: 'Destroy 1 unit under construction in an enemy system.', effect: 'sabotage', repeatable: true },
        { id: 'lib_m2', name: 'Rally Support', skill: 'diplomacy', minSkill: 1, desc: 'Shift a system\'s loyalty toward Liberation.', effect: 'sway_liberation', repeatable: true },
        { id: 'lib_m3', name: 'Covert Operation', skill: 'intel', minSkill: 2, desc: 'Look at 3 cards from the Dominion probe deck.', effect: 'covert_op', repeatable: true },
        { id: 'lib_m4', name: 'Hit and Run', skill: 'combat', minSkill: 1, desc: 'Destroy 1 enemy unit in a system, then retreat.', effect: 'hit_and_run', repeatable: true },
        { id: 'lib_m5', name: 'Inspire Uprising', skill: 'diplomacy', minSkill: 2, desc: 'Place 2 Volunteer units on a sympathetic world.', effect: 'uprising', repeatable: true },
        { id: 'lib_m6', name: 'Relocate Base', skill: 'logistics', minSkill: 3, desc: 'Move the hidden base to a new system.', effect: 'relocate_base', repeatable: false },
        { id: 'lib_m7', name: 'Recruit Ally', skill: 'diplomacy', minSkill: 2, desc: 'Add a new leader to the Liberation cause.', effect: 'recruit', repeatable: false },
        { id: 'lib_m8', name: 'Rapid Mobilization', skill: 'logistics', minSkill: 1, desc: 'Move your units from 1 system to any connected system.', effect: 'rapid_move', repeatable: true },
        { id: 'lib_m9', name: 'Guerrilla Strike', skill: 'combat', minSkill: 2, desc: 'Attack an enemy fleet with a surprise assault.', effect: 'guerrilla', repeatable: true },
        { id: 'lib_m10', name: 'Fortify Position', skill: 'logistics', minSkill: 2, desc: 'Build an Ion Barrier at your location.', effect: 'build_structure', repeatable: true },
    ]
};

// ---- OBJECTIVE CARDS ----
// Liberation objectives - completing these advances the reputation marker
const OBJECTIVE_DATA = [
    // Tier 1 (early game, easier)
    { id: 'obj1', name: 'Seeds of Dissent', desc: 'Have loyalty in 3 systems outside the Core Worlds.', points: 1, tier: 1, check: 'loyalty_outside_core_3' },
    { id: 'obj2', name: 'Defend the Innocent', desc: 'Win a ground combat as the defender.', points: 1, tier: 1, check: 'win_ground_defense' },
    { id: 'obj3', name: 'Show of Force', desc: 'Destroy an enemy capital ship.', points: 1, tier: 1, check: 'destroy_capital' },
    { id: 'obj4', name: 'Diplomatic Ties', desc: 'Have loyalty in systems across 3 different regions.', points: 1, tier: 1, check: 'loyalty_3_regions' },
    { id: 'obj5', name: 'Supply Network', desc: 'Control 3 systems with production facilities.', points: 1, tier: 1, check: 'control_3_production' },

    // Tier 2 (mid game)
    { id: 'obj6', name: 'Shatter the Fleet', desc: 'Win a space battle against a force with 3+ ships.', points: 2, tier: 2, check: 'win_space_vs_3plus' },
    { id: 'obj7', name: 'Hearts and Minds', desc: 'Have loyalty in 5 systems.', points: 2, tier: 2, check: 'loyalty_5_systems' },
    { id: 'obj8', name: 'Topple the Tyrant', desc: 'Capture a Dominion leader.', points: 2, tier: 2, check: 'capture_dom_leader' },
    { id: 'obj9', name: 'Liberate a Core World', desc: 'Have loyalty in a Core World system.', points: 2, tier: 2, check: 'loyalty_core_world' },
    { id: 'obj10', name: 'Strategic Victory', desc: 'Control systems in 4 different regions.', points: 2, tier: 2, check: 'control_4_regions' },

    // Tier 3 (late game, harder)
    { id: 'obj11', name: 'Destroy the Titan', desc: 'Destroy the Dominion Titan if it has been built.', points: 3, tier: 3, check: 'destroy_titan' },
    { id: 'obj12', name: 'Galactic Revolution', desc: 'Have loyalty in 8 systems.', points: 3, tier: 3, check: 'loyalty_8_systems' },
    { id: 'obj13', name: 'Overwhelming Assault', desc: 'Win a battle destroying 5+ enemy units.', points: 3, tier: 3, check: 'destroy_5_units_battle' },
    { id: 'obj14', name: 'Unbreakable Spirit', desc: 'Survive with the base hidden for 10+ turns.', points: 3, tier: 3, check: 'survive_10_turns' },
];

// ---- ACTION CARDS (used in combat) ----
const ACTION_CARDS = {
    dominion: [
        { id: 'dac1', name: 'Concentrated Fire', domain: 'space', effect: 'Add 2 red dice to your attack.', bonus: { red: 2 } },
        { id: 'dac2', name: 'Shield Formation', domain: 'space', effect: 'Block 2 hits this round.', block: 2 },
        { id: 'dac3', name: 'Ruthless Advance', domain: 'ground', effect: 'Add 2 black dice to your attack.', bonus: { black: 2 } },
        { id: 'dac4', name: 'Fortified Position', domain: 'ground', effect: 'Block 2 hits this round.', block: 2 },
        { id: 'dac5', name: 'Air Superiority', domain: 'space', effect: 'Deal 1 direct hit to a light ship.', directHit: { light: 1 } },
        { id: 'dac6', name: 'Heavy Barrage', domain: 'space', effect: 'Add 1 red die. Reroll all misses.', bonus: { red: 1 }, reroll: true },
    ],
    liberation: [
        { id: 'lac1', name: 'Evasive Maneuvers', domain: 'space', effect: 'Block 2 hits. Draw 1 card.', block: 2, draw: 1 },
        { id: 'lac2', name: 'Precision Strike', domain: 'space', effect: 'Add 3 black dice to your attack.', bonus: { black: 3 } },
        { id: 'lac3', name: 'Ambush', domain: 'ground', effect: 'Add 2 black dice. Enemy cannot block.', bonus: { black: 2 }, pierce: true },
        { id: 'lac4', name: 'Dig In', domain: 'ground', effect: 'Block 3 hits this round.', block: 3 },
        { id: 'lac5', name: 'Desperate Assault', domain: 'space', effect: 'Double all hits this round. Lose 1 unit.', doubleHits: true, selfDamage: 1 },
        { id: 'lac6', name: 'Flanking Attack', domain: 'ground', effect: 'Add 1 red die and 1 black die.', bonus: { red: 1, black: 1 } },
    ]
};

// ---- PRODUCTION COSTS ----
const PRODUCTION_MAP = {
    dominion: {
        fleet: ['dom_fighter', 'dom_cruiser', 'dom_capital'],
        trooper: ['dom_trooper', 'dom_armor', 'dom_assault'],
        structure: ['dom_shield'],
        airship: ['dom_fighter', 'dom_cruiser']
    },
    liberation: {
        fleet: ['lib_fighter', 'lib_corvette', 'lib_frigate'],
        trooper: ['lib_trooper', 'lib_armor', 'lib_special'],
        structure: ['lib_shield'],
        airship: ['lib_fighter', 'lib_corvette']
    }
};

// Starting units
const STARTING_UNITS = {
    dominion: {
        'throne_world': { space: [{ type: 'dom_capital', count: 1 }, { type: 'dom_cruiser', count: 2 }, { type: 'dom_fighter', count: 3 }], ground: [{ type: 'dom_trooper', count: 3 }, { type: 'dom_armor', count: 1 }] },
        'nexus_prime': { space: [{ type: 'dom_cruiser', count: 1 }, { type: 'dom_fighter', count: 2 }], ground: [{ type: 'dom_trooper', count: 2 }] },
        'citadel_reach': { space: [{ type: 'dom_cruiser', count: 1 }], ground: [{ type: 'dom_trooper', count: 3 }, { type: 'dom_armor', count: 1 }] },
        'forge_world': { space: [{ type: 'dom_fighter', count: 2 }], ground: [{ type: 'dom_trooper', count: 2 }] },
        'aurum_spire': { space: [{ type: 'dom_cruiser', count: 1 }], ground: [{ type: 'dom_trooper', count: 1 }] },
    },
    liberation: {
        '_base_': { space: [{ type: 'lib_frigate', count: 1 }, { type: 'lib_corvette', count: 2 }, { type: 'lib_fighter', count: 3 }], ground: [{ type: 'lib_trooper', count: 4 }, { type: 'lib_armor', count: 1 }, { type: 'lib_special', count: 1 }] }
    }
};

// Dice definitions
const DICE = {
    red: { hit: 0.5, crit: 0.167, miss: 0.333, faces: ['hit', 'hit', 'hit', 'crit', 'miss', 'miss'] },
    black: { hit: 0.333, crit: 0.167, miss: 0.5, faces: ['hit', 'hit', 'crit', 'miss', 'miss', 'miss'] }
};

const MAX_TURNS = 14;
// Reputation track: time marker starts at 1 and advances each turn (reaching 14).
// Reputation marker starts at 30 and decreases as Liberation completes objectives.
// Liberation wins when reputation marker <= time marker.
// With ~18 possible objective points (across tiers 1-3), Liberation must complete many
// objectives to bring rep from 30 down to where it meets the time marker.
// Dominion wins if turn 14 ends and reputation > time.
const STARTING_REPUTATION = 30;

const PHASES = ['assignment', 'command', 'refresh'];
