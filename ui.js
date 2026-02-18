// ============================================================
// GALACTIC UPRISING - UI Manager
// Handles all DOM-based UI, panels, modals, and user interaction
// ============================================================

class UIManager {
    constructor() {
        this.renderer = null;
        this.selectedLeaderId = null;
        this.selectedMissionId = null;
        this.selectedSystemId = null;
        this.movingFrom = null;
        this.selectedUnitIds = new Set();
        this.mode = 'normal'; // 'normal', 'assign_mission', 'select_target', 'moving', 'combat'
    }

    init(renderer) {
        this.renderer = renderer;
        this.setupCanvasEvents();
        this.updateAll();
    }

    setupCanvasEvents() {
        const canvas = this.renderer.canvas;

        // Single mousemove handler for both hover and drag
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;

            // Handle dragging
            if (this.renderer.isDragging) {
                this.renderer.camera.x = e.clientX - this.renderer.dragStart.x;
                this.renderer.camera.y = e.clientY - this.renderer.dragStart.y;
                this.hideTooltip();
                return;
            }

            // Handle hover
            const sys = this.renderer.getSystemAtScreen(mx, my);
            this.renderer.hoveredSystem = sys ? sys.id : null;

            if (sys) {
                this.showTooltip(e.clientX, e.clientY, sys);
            } else {
                this.hideTooltip();
            }

            // If in moving mode, show move target preview
            if (this.mode === 'moving' && this.movingFrom && sys) {
                const adj = engine.getAdjacentSystems(this.movingFrom);
                this.renderer.moveTarget = adj.includes(sys.id) ? sys.id : null;
            }
        });

        canvas.addEventListener('click', (e) => {
            const rect = canvas.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;
            const sys = this.renderer.getSystemAtScreen(mx, my);

            if (sys) {
                this.handleSystemClick(sys);
            }
        });

        // Pan with right-click drag
        canvas.addEventListener('mousedown', (e) => {
            if (e.button === 2 || e.button === 1) {
                this.renderer.isDragging = true;
                this.renderer.dragStart = { x: e.clientX - this.renderer.camera.x, y: e.clientY - this.renderer.camera.y };
                e.preventDefault();
            }
        });

        canvas.addEventListener('mouseup', () => {
            this.renderer.isDragging = false;
        });

        canvas.addEventListener('wheel', (e) => {
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            this.renderer.camera.zoom = Math.max(0.5, Math.min(3, this.renderer.camera.zoom * delta));
            e.preventDefault();
        });

        canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    handleSystemClick(sys) {
        const state = engine.state;

        if (this.mode === 'select_target') {
            // Selecting target for mission
            this.selectedSystemId = sys.id;
            this.renderer.selectedSystem = sys.id;
            this.completeMissionAssignment(sys.id);
            return;
        }

        if (this.mode === 'moving') {
            // Selecting destination for movement
            const adjacent = engine.getAdjacentSystems(this.movingFrom);
            if (adjacent.includes(sys.id)) {
                this.executeMove(sys.id);
            } else {
                showToast('Must move to an adjacent system.', 'warning');
            }
            return;
        }

        // Normal click - select system
        this.selectedSystemId = sys.id;
        this.renderer.selectedSystem = sys.id;
        this.updateRightPanel();
    }

    // ---- PANELS ----

    updateAll() {
        this.updateTopBar();
        this.updateLeftPanel();
        this.updateRightPanel();
        this.updateBottomBar();
    }

    updateTopBar() {
        const state = engine.state;
        if (!state) return;

        document.getElementById('turn-info').textContent = `Turn ${state.turn} of ${MAX_TURNS}`;
        document.getElementById('phase-info').textContent = this.getPhaseName(state.phase);

        // Time/reputation marker pips
        const tmEl = document.getElementById('time-marker');
        let html = '';
        for (let i = 1; i <= MAX_TURNS; i++) {
            const isTime = i <= state.timeMarker;
            const isRep = i <= state.reputationMarker;
            let cls = '';
            if (i <= state.timeMarker) cls = 'past';
            if (i === state.turn) cls = 'active';
            html += `<div class="time-pip ${cls}" title="Turn ${i}${isRep ? ' | Rep: ' + state.reputationMarker : ''}"></div>`;
        }
        tmEl.innerHTML = html;
    }

    updateLeftPanel() {
        const state = engine.state;
        if (!state) return;
        const panel = document.getElementById('left-panel');

        // Show current player's leaders and missions
        const faction = state.activePlayer;
        const fName = faction === FACTIONS.DOMINION ? 'Dominion' : 'Liberation';
        const fColor = faction === FACTIONS.DOMINION ? '#c44' : '#4ac';

        let html = '';

        // Reputation & Time track
        html += `<div class="panel-section">`;
        html += `<div class="panel-title">Victory Track</div>`;
        // Time bar
        const timePercent = (state.timeMarker / MAX_TURNS) * 100;
        html += `<div style="margin-bottom:6px">`;
        html += `<div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:2px">`;
        html += `<span style="color:#c44">Time</span><span style="color:#c44;font-weight:700">${state.timeMarker} / ${MAX_TURNS}</span>`;
        html += `</div>`;
        html += `<div style="height:8px;background:#1a1a3a;border-radius:4px;overflow:hidden">`;
        html += `<div style="height:100%;width:${timePercent}%;background:linear-gradient(90deg,#c44,#e66);border-radius:4px;transition:width 0.5s"></div>`;
        html += `</div></div>`;
        // Reputation bar
        const repPercent = (state.reputationMarker / STARTING_REPUTATION) * 100;
        html += `<div style="margin-bottom:6px">`;
        html += `<div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:2px">`;
        html += `<span style="color:#4ac">Reputation</span><span style="color:#4ac;font-weight:700">${state.reputationMarker}</span>`;
        html += `</div>`;
        html += `<div style="height:8px;background:#1a1a3a;border-radius:4px;overflow:hidden">`;
        html += `<div style="height:100%;width:${repPercent}%;background:linear-gradient(90deg,#4ac,#6ce);border-radius:4px;transition:width 0.5s"></div>`;
        html += `</div></div>`;
        // Win condition info
        const gap = state.reputationMarker - state.timeMarker;
        html += `<div style="font-size:11px;color:#778;text-align:center">`;
        if (gap > 0) {
            html += `Liberation needs <span style="color:#4ac;font-weight:700">${gap}</span> more points to win`;
        } else {
            html += `<span style="color:#4ac;font-weight:700">Liberation victory condition met!</span>`;
        }
        html += `</div></div>`;

        // Active player indicator
        html += `<div class="panel-section" style="background:${fColor}15;border-left:3px solid ${fColor}">`;
        html += `<div style="font-size:13px;font-weight:700;color:${fColor}">${fName}'s Turn</div>`;
        html += `<div style="font-size:11px;color:#889">${this.getPhaseName(state.phase)}</div>`;
        html += `</div>`;

        // Leaders section
        html += `<div class="panel-section">`;
        html += `<div class="panel-title">${fName} Leaders</div>`;

        state.leaders[faction].forEach(leader => {
            const isAssigned = state.assignedLeaderIds.has(leader.id);
            const isSelected = this.selectedLeaderId === leader.id;
            const isCaptured = leader.captured;

            html += `<div class="leader-card ${isSelected ? 'selected' : ''} ${isAssigned || isCaptured ? 'assigned' : ''}"
                          onclick="ui.selectLeader('${leader.id}')"
                          data-leader-id="${leader.id}">`;
            html += `<div class="leader-avatar" style="background:${leader.color}">${leader.avatar}</div>`;
            html += `<div class="leader-info">`;
            html += `<div class="leader-name">${leader.name}${isCaptured ? ' (Captured)' : ''}${isAssigned ? ' (Assigned)' : ''}</div>`;
            html += `<div class="leader-skills">`;
            html += `<span class="skill-pip"><span class="icon">🎯</span>${leader.skills.combat}</span>`;
            html += `<span class="skill-pip"><span class="icon">🕵</span>${leader.skills.intel}</span>`;
            html += `<span class="skill-pip"><span class="icon">🤝</span>${leader.skills.diplomacy}</span>`;
            html += `<span class="skill-pip"><span class="icon">📦</span>${leader.skills.logistics}</span>`;
            html += `</div></div></div>`;
        });
        html += `</div>`;

        // Missions section (only in assignment phase)
        if (state.phase === 'assignment') {
            html += `<div class="panel-section">`;
            html += `<div class="panel-title">${fName} Missions</div>`;
            state.missionHands[faction].forEach(mission => {
                const isSelected = this.selectedMissionId === mission.id;
                html += `<div class="mission-card ${isSelected ? 'selected' : ''}" onclick="ui.selectMission('${mission.id}')">`;
                html += `<div class="mission-name">${mission.name}</div>`;
                html += `<div class="mission-desc">${mission.desc}</div>`;
                html += `<div class="mission-skills-req">Requires: ${mission.skill} ${mission.minSkill}+</div>`;
                html += `</div>`;
            });
            html += `</div>`;
        }

        // Command phase: show pending assignments
        if (state.phase === 'command') {
            html += `<div class="panel-section">`;
            html += `<div class="panel-title">Pending Missions</div>`;
            state.assignments[faction].forEach((a, i) => {
                html += `<div class="mission-card" onclick="ui.resolveMission(${i})">`;
                html += `<div class="mission-name">${a.mission.name}</div>`;
                html += `<div style="font-size:11px;color:#aac">${a.leader.name} → ${state.systems[a.targetSystem]?.name || 'TBD'}</div>`;
                html += `<div class="btn btn-small primary" style="margin-top:6px">Resolve</div>`;
                html += `</div>`;
            });
            if (state.assignments[faction].length === 0) {
                html += `<div style="font-size:12px;color:#667;padding:8px 0">No pending missions.</div>`;
            }
            html += `</div>`;
        }

        // Objectives (Liberation only or always visible)
        html += `<div class="panel-section">`;
        html += `<div class="panel-title">Active Objectives</div>`;
        state.currentObjectives.forEach(obj => {
            html += `<div class="objective-card">`;
            html += `<div class="objective-name">${obj.name} <span class="objective-points">+${obj.points}</span></div>`;
            html += `<div class="objective-desc">${obj.desc}</div>`;
            html += `</div>`;
        });
        if (state.completedObjectives.length > 0) {
            html += `<div class="panel-title" style="margin-top:8px">Completed</div>`;
            state.completedObjectives.forEach(obj => {
                html += `<div class="objective-card completed">`;
                html += `<div class="objective-name">${obj.name} <span class="objective-points">+${obj.points} ✓</span></div>`;
                html += `</div>`;
            });
        }
        html += `</div>`;

        panel.innerHTML = html;
    }

    updateRightPanel() {
        const state = engine.state;
        if (!state) return;
        const panel = document.getElementById('right-panel');

        let html = '';

        // Selected system info
        if (this.selectedSystemId) {
            const sys = state.systems[this.selectedSystemId];
            if (sys) {
                const region = REGIONS.find(r => r.id === sys.region);

                html += `<div class="panel-section">`;
                html += `<div class="panel-title">${sys.name}</div>`;
                html += `<div style="font-size:12px;color:${region?.color || '#888'};margin-bottom:6px">${region?.name || 'Unknown Region'}</div>`;

                // Loyalty
                const loyaltyColor = sys.loyalty === 'dominion' ? '#c44' : sys.loyalty === 'liberation' ? '#4ac' : '#666';
                const loyaltyName = sys.loyalty.charAt(0).toUpperCase() + sys.loyalty.slice(1);
                html += `<div style="font-size:12px;margin-bottom:4px">Loyalty: <span style="color:${loyaltyColor};font-weight:600">${loyaltyName}</span></div>`;

                // Resources
                html += `<div style="font-size:12px;margin-bottom:4px">Resources: `;
                Object.entries(sys.resources).forEach(([type, count]) => {
                    const icons = { fleet: '🚀', trooper: '⚔', structure: '🏗', airship: '✈' };
                    for (let i = 0; i < count; i++) html += `${icons[type] || '?'} `;
                });
                html += `</div>`;

                if (sys.hasProduction) {
                    html += `<div style="font-size:12px;color:#ffa;margin-bottom:4px">⚙ Production Facility</div>`;
                }

                // Base indicator (Liberation player sees it)
                if (sys.id === state.liberationBase) {
                    if (state.baseRevealed) {
                        html += `<div style="font-size:12px;color:#f44;font-weight:700">⚠ LIBERATION BASE (REVEALED)</div>`;
                    } else if (state.activePlayer === FACTIONS.LIBERATION) {
                        html += `<div style="font-size:12px;color:#4ac;font-weight:700">★ Your Hidden Base</div>`;
                    }
                }
                html += `</div>`;

                // Units in system
                ['dominion', 'liberation'].forEach(faction => {
                    const units = engine.getSystemUnits(this.selectedSystemId, faction);
                    const leaders = engine.getLeadersInSystem(this.selectedSystemId, faction);
                    const fColor = faction === FACTIONS.DOMINION ? '#c44' : '#4ac';
                    const fName = faction === FACTIONS.DOMINION ? 'Dominion' : 'Liberation';

                    if (units.space.length > 0 || units.ground.length > 0 || leaders.length > 0) {
                        html += `<div class="panel-section">`;
                        html += `<div class="panel-title" style="color:${fColor}">${fName} Forces</div>`;

                        // Leaders
                        leaders.forEach(l => {
                            html += `<div class="leader-card" style="padding:4px 6px">`;
                            html += `<div class="leader-avatar" style="background:${l.color};width:24px;height:24px;font-size:12px">${l.avatar}</div>`;
                            html += `<div class="leader-name" style="font-size:12px">${l.name}</div>`;
                            html += `</div>`;
                        });

                        // Space units
                        if (units.space.length > 0) {
                            html += `<div style="font-size:11px;color:#889;margin:4px 0 2px">Space Forces</div>`;
                            const grouped = this.groupUnits(units.space);
                            Object.entries(grouped).forEach(([type, count]) => {
                                const ut = Object.values(UNIT_TYPES).find(t => t.name === type);
                                html += `<div class="unit-row">`;
                                if (this.mode === 'moving' && this.movingFrom === this.selectedSystemId && faction === state.activePlayer) {
                                    html += `<input type="checkbox" onchange="ui.toggleMoveUnit(this, '${ut?.id}')" />`;
                                }
                                html += `<div class="unit-icon" style="color:${ut?.color || fColor}">${ut?.icon || '?'}</div>`;
                                html += `<span>${type} x${count}</span>`;
                                html += `</div>`;
                            });
                        }

                        // Ground units
                        if (units.ground.length > 0) {
                            html += `<div style="font-size:11px;color:#889;margin:4px 0 2px">Ground Forces</div>`;
                            const grouped = this.groupUnits(units.ground);
                            Object.entries(grouped).forEach(([type, count]) => {
                                const ut = Object.values(UNIT_TYPES).find(t => t.name === type);
                                html += `<div class="unit-row">`;
                                if (this.mode === 'moving' && this.movingFrom === this.selectedSystemId && faction === state.activePlayer) {
                                    html += `<input type="checkbox" onchange="ui.toggleMoveUnit(this, '${ut?.id}')" />`;
                                }
                                html += `<div class="unit-icon" style="color:${ut?.color || fColor}">${ut?.icon || '?'}</div>`;
                                html += `<span>${type} x${count}</span>`;
                                html += `</div>`;
                            });
                        }

                        html += `</div>`;
                    }
                });

                // Action buttons for selected system
                if (state.phase === 'command' && !state.activeCombat) {
                    const myUnits = engine.getSystemUnits(this.selectedSystemId, state.activePlayer);
                    const myLeaders = engine.getLeadersInSystem(this.selectedSystemId, state.activePlayer);

                    if ((myUnits.space.length > 0 || myUnits.ground.length > 0) && myLeaders.length > 0) {
                        html += `<div class="panel-section">`;
                        html += `<div class="panel-title">Actions</div>`;
                        if (this.mode !== 'moving') {
                            html += `<button class="btn primary" style="width:100%;margin-bottom:6px" onclick="ui.startMove()">Move Units</button>`;
                        } else {
                            html += `<button class="btn danger" style="width:100%;margin-bottom:6px" onclick="ui.cancelMove()">Cancel Move</button>`;
                        }
                        html += `</div>`;
                    }

                    // Check for combat
                    if (engine.checkCombat(this.selectedSystemId)) {
                        html += `<div class="panel-section">`;
                        html += `<button class="btn danger" style="width:100%" onclick="ui.startCombat('${this.selectedSystemId}')">Engage Combat!</button>`;
                        html += `</div>`;
                    }
                }
            }
        } else {
            html += `<div class="panel-section">`;
            html += `<div style="font-size:12px;color:#667;padding:16px 0;text-align:center">Click a system on the map to view details</div>`;
            html += `</div>`;
        }

        // Probe tracker
        html += `<div class="panel-section">`;
        html += `<div class="panel-title">Probe Tracker</div>`;
        html += `<div style="font-size:11px;color:#889;margin-bottom:4px">Probed systems: ${state.probeDiscards.length} / ${state.probeDiscards.length + state.probeDeck.length}</div>`;
        const probedSystems = state.probeDiscards.map(id => state.systems[id]).filter(Boolean);
        html += `<div style="display:flex;flex-wrap:wrap;gap:3px">`;
        probedSystems.forEach(s => {
            html += `<span class="probe-token" style="background:${s.id === state.liberationBase && state.baseRevealed ? '#f44' : '#335'};color:#aac" title="${s.name}">${s.name.charAt(0)}</span>`;
        });
        html += `</div></div>`;

        // Game log
        html += `<div class="panel-section">`;
        html += `<div class="panel-title">Game Log</div>`;
        const recentLog = state.log.slice(-10).reverse();
        recentLog.forEach(entry => {
            html += `<div style="font-size:11px;color:#889;padding:2px 0;border-bottom:1px solid #1a1a3a">${entry.msg}</div>`;
        });
        html += `</div>`;

        panel.innerHTML = html;
    }

    updateBottomBar() {
        const state = engine.state;
        if (!state) return;
        const bar = document.getElementById('action-bar');

        let html = '';

        if (state.gameOver) {
            const winner = state.winner === FACTIONS.DOMINION ? 'The Dominion' : 'The Liberation';
            const color = state.winner === FACTIONS.DOMINION ? '#c44' : '#4ac';
            html += `<div class="action-prompt" style="font-size:18px;color:${color};font-weight:700">${winner} Wins!</div>`;
            html += `<button class="btn primary" onclick="location.reload()">New Game</button>`;

            // Show game over modal
            this.showGameOverModal(state.winner);
        } else if (state.activeCombat) {
            html += `<div class="action-prompt">Combat in progress at ${state.systems[state.activeCombat.systemId].name}</div>`;
            html += `<button class="btn primary" onclick="ui.combatRound()">Roll Dice</button>`;
            html += `<button class="btn danger" onclick="ui.retreatCombat()">Retreat</button>`;
        } else if (state.activePlayer === FACTIONS.DOMINION) {
            // AI is thinking
            html += `<div class="action-prompt">`;
            html += `<span style="color:#c44;font-weight:600">Dominion</span> is deliberating`;
            html += `<span style="animation:blink 1s infinite">...</span>`;
            html += `</div>`;
        } else if (state.phase === 'assignment') {
            html += `<div class="action-prompt">`;
            html += `<span style="color:#4ac;font-weight:600">Liberation</span>: Assign a leader to a mission, or pass.`;
            html += `</div>`;

            if (this.selectedLeaderId && this.selectedMissionId) {
                html += `<button class="btn primary" onclick="ui.confirmAssignment()">Assign to Mission</button>`;
            }
            html += `<button class="btn" onclick="ui.passAssignment()">Pass</button>`;
        } else if (state.phase === 'command') {
            html += `<div class="action-prompt">`;
            html += `<span style="color:#4ac;font-weight:600">Liberation</span>: Resolve a mission, move units, or pass.`;
            html += `</div>`;
            html += `<button class="btn" onclick="ui.passCommand()">Pass</button>`;
        } else if (state.phase === 'refresh') {
            html += `<div class="action-prompt">Refresh phase processing...</div>`;
        }

        // Production info
        const faction = state.activePlayer;
        const queueCount = state.productionQueue[faction].length;
        if (queueCount > 0) {
            html += `<div style="font-size:11px;color:#889;margin-left:16px">📦 ${queueCount} units in production</div>`;
        }

        bar.innerHTML = html;
    }

    // ---- ACTIONS ----

    selectLeader(id) {
        const state = engine.state;
        if (state.assignedLeaderIds.has(id)) return;
        const leader = state.leaders[state.activePlayer].find(l => l.id === id);
        if (!leader || leader.captured) return;

        this.selectedLeaderId = id;

        // If in command phase, center on leader's location
        if (state.phase === 'command' && leader.location) {
            this.selectedSystemId = leader.location;
            this.renderer.selectedSystem = leader.location;
        }

        this.updateAll();
    }

    selectMission(id) {
        this.selectedMissionId = id;
        this.updateAll();
    }

    confirmAssignment() {
        const state = engine.state;
        if (!this.selectedLeaderId || !this.selectedMissionId) return;

        const leader = state.leaders[state.activePlayer].find(l => l.id === this.selectedLeaderId);
        if (!leader) return;

        // Need to select target system
        this.mode = 'select_target';
        showToast('Click a system to target this mission.', 'info');
        this.updateAll();
    }

    completeMissionAssignment(targetSystem) {
        const result = engine.assignLeader(this.selectedLeaderId, this.selectedMissionId, targetSystem);
        if (!result.ok) {
            showToast(result.reason, 'warning');
            return;
        }

        this.selectedLeaderId = null;
        this.selectedMissionId = null;
        this.mode = 'normal';
        showToast('Leader assigned to mission.', 'success');

        // Add particle effect
        const sys = engine.state.systems[targetSystem];
        if (sys) {
            for (let i = 0; i < 10; i++) {
                this.renderer.addParticle(sys.x, sys.y, '#7af');
            }
        }

        this.updateAll();
    }

    passAssignment() {
        engine.passAssignment();
        this.selectedLeaderId = null;
        this.selectedMissionId = null;
        this.mode = 'normal';
        this.updateAll();
    }

    passCommand() {
        engine.passCommand();
        this.mode = 'normal';

        if (engine.state.phase === 'refresh') {
            // Refresh is automatic
            setTimeout(() => {
                this.updateAll();
            }, 500);
        }

        this.updateAll();
    }

    resolveMission(index) {
        const result = engine.resolveMission(index);
        if (!result.ok) {
            showToast(result.reason, 'warning');
            return;
        }
        showToast(result.result?.msg || 'Mission resolved.', 'success');

        if (engine.state.phase === 'refresh') {
            setTimeout(() => this.updateAll(), 500);
        }
        this.updateAll();
    }

    startMove() {
        if (!this.selectedSystemId) return;
        this.mode = 'moving';
        this.movingFrom = this.selectedSystemId;
        this.selectedUnitIds.clear();

        // Highlight adjacent systems
        const adj = engine.getAdjacentSystems(this.selectedSystemId);
        adj.forEach(id => {
            this.renderer.moveTarget = id; // simplified; would highlight all
        });

        showToast('Click an adjacent system to move units.', 'info');
        this.updateAll();
    }

    cancelMove() {
        this.mode = 'normal';
        this.movingFrom = null;
        this.selectedUnitIds.clear();
        this.renderer.moveTarget = null;
        this.updateAll();
    }

    toggleMoveUnit(checkbox, unitTypeId) {
        // For simplicity, we'll move all units of that type
        if (checkbox.checked) {
            this.selectedUnitIds.add(unitTypeId);
        } else {
            this.selectedUnitIds.delete(unitTypeId);
        }
    }

    executeMove(toSystem) {
        const state = engine.state;
        const fromSystem = this.movingFrom;
        const faction = state.activePlayer;

        // Get all unit IDs to move
        const unitIds = [];
        ['space', 'ground'].forEach(domain => {
            state.units[fromSystem][domain].forEach(u => {
                if (u.faction === faction) {
                    if (this.selectedUnitIds.size === 0 || this.selectedUnitIds.has(u.typeId)) {
                        unitIds.push(u.id);
                    }
                }
            });
        });

        if (unitIds.length === 0) {
            showToast('No units selected to move.', 'warning');
            return;
        }

        // Also move the leader
        const leaders = engine.getLeadersInSystem(fromSystem, faction);
        if (leaders.length > 0) {
            engine.moveLeader(leaders[0].id, toSystem, faction);
        }

        const result = engine.moveUnits(fromSystem, toSystem, unitIds, faction);
        if (!result.ok) {
            showToast(result.reason, 'warning');
            return;
        }

        this.mode = 'normal';
        this.movingFrom = null;
        this.selectedUnitIds.clear();
        this.renderer.moveTarget = null;

        // Particles
        const sys = state.systems[toSystem];
        for (let i = 0; i < 15; i++) {
            this.renderer.addParticle(sys.x, sys.y, faction === FACTIONS.DOMINION ? '#c44' : '#4ac');
        }

        if (result.combat) {
            showToast('Enemy forces detected! Combat initiated!', 'warning');
            this.startCombat(toSystem);
        } else {
            showToast('Units moved successfully.', 'success');
        }

        this.selectedSystemId = toSystem;
        this.renderer.selectedSystem = toSystem;
        this.updateAll();
    }

    startCombat(systemId) {
        combatEngine.initCombat(systemId);
        this.mode = 'combat';
        this.showCombatModal();
        this.updateAll();
    }

    combatRound() {
        const result = combatEngine.executeCombatRound();
        if (!result) return;

        this.showCombatModal(result);

        if (result.combatOver) {
            this.mode = 'normal';
            setTimeout(() => {
                this.hideCombatModal();
                this.updateAll();

                // Check win condition after combat
                if (engine.checkWinConditions()) {
                    this.updateAll();
                }
            }, 2000);
        }

        this.updateAll();
    }

    playCombatCard(cardId) {
        const faction = engine.state.activePlayer;
        if (combatEngine.playCard(faction, cardId)) {
            showToast('Tactic card played!', 'success');
            this.showCombatModal(); // Refresh modal to show played card
        }
    }

    retreatCombat() {
        combatEngine.retreat(engine.state.activePlayer);
        this.mode = 'normal';
        this.hideCombatModal();
        showToast('Forces retreat!', 'warning');
        this.updateAll();
    }

    showCombatModal(roundResult) {
        const combat = engine.state.activeCombat;
        if (!combat) return;

        const overlay = document.getElementById('modal-overlay');
        const modal = document.getElementById('modal-content');
        overlay.classList.remove('hidden');

        const sys = engine.state.systems[combat.systemId];
        let html = `<h2>Combat at ${sys.name}</h2>`;
        html += `<div style="font-size:13px;color:#aac;margin-bottom:12px">${combat.phase === 'space' ? 'Space Battle' : 'Ground Battle'} - Round ${combat.round}</div>`;

        html += `<div class="combat-area">`;

        // Dominion side
        html += `<div class="combat-side dominion">`;
        html += `<div style="font-size:14px;font-weight:700;color:#c44;margin-bottom:8px">Dominion</div>`;
        const domUnits = combat.dominion[combat.phase];
        domUnits.forEach(u => {
            const ut = Object.values(UNIT_TYPES).find(t => t.id === u.typeId);
            const healthBar = '●'.repeat(u.maxHealth - u.damage) + '○'.repeat(u.damage);
            html += `<div style="font-size:12px;margin:2px 0"><span style="color:${ut?.color || '#c44'}">${ut?.icon || '?'}</span> ${u.type} <span style="color:#888">${healthBar}</span></div>`;
        });
        if (domUnits.length === 0) html += `<div style="font-size:12px;color:#666">No units</div>`;

        if (roundResult) {
            html += `<div class="dice-container">`;
            roundResult.dominion.roll.forEach(r => {
                const cls = r.result === 'hit' ? 'hit' : r.result === 'crit' ? 'crit' : 'miss';
                const sym = r.result === 'hit' ? '✦' : r.result === 'crit' ? '★' : '·';
                html += `<div class="die ${cls}" title="${r.type} die: ${r.result}">${sym}</div>`;
            });
            html += `</div>`;
            html += `<div style="font-size:12px;color:#afa">${roundResult.dominion.effectiveHits} hits dealt</div>`;
        }
        html += `</div>`;

        // Liberation side
        html += `<div class="combat-side liberation">`;
        html += `<div style="font-size:14px;font-weight:700;color:#4ac;margin-bottom:8px">Liberation</div>`;
        const libUnits = combat.liberation[combat.phase];
        libUnits.forEach(u => {
            const ut = Object.values(UNIT_TYPES).find(t => t.id === u.typeId);
            const healthBar = '●'.repeat(u.maxHealth - u.damage) + '○'.repeat(u.damage);
            html += `<div style="font-size:12px;margin:2px 0"><span style="color:${ut?.color || '#4ac'}">${ut?.icon || '?'}</span> ${u.type} <span style="color:#888">${healthBar}</span></div>`;
        });
        if (libUnits.length === 0) html += `<div style="font-size:12px;color:#666">No units</div>`;

        if (roundResult) {
            html += `<div class="dice-container">`;
            roundResult.liberation.roll.forEach(r => {
                const cls = r.result === 'hit' ? 'hit' : r.result === 'crit' ? 'crit' : 'miss';
                const sym = r.result === 'hit' ? '✦' : r.result === 'crit' ? '★' : '·';
                html += `<div class="die ${cls}" title="${r.type} die: ${r.result}">${sym}</div>`;
            });
            html += `</div>`;
            html += `<div style="font-size:12px;color:#afa">${roundResult.liberation.effectiveHits} hits dealt</div>`;
        }
        html += `</div>`;
        html += `</div>`;

        // Combat log
        html += `<div style="margin-top:12px;padding:8px;background:rgba(0,0,0,0.3);border-radius:6px;max-height:120px;overflow-y:auto">`;
        combat.combatLog.forEach(msg => {
            html += `<div style="font-size:11px;color:#889;padding:1px 0">${msg}</div>`;
        });
        html += `</div>`;

        // Action cards for current player
        if (!roundResult?.combatOver) {
            const playerFaction = engine.state.activePlayer;
            const availCards = combatEngine.getAvailableCards(playerFaction);
            const playedCard = combat.cardsPlayed[playerFaction];

            if (availCards.length > 0 && !playedCard) {
                html += `<div style="margin-top:12px">`;
                html += `<div style="font-size:11px;color:#889;margin-bottom:6px;text-transform:uppercase;letter-spacing:1px">Play a Tactic Card (optional):</div>`;
                html += `<div style="display:flex;gap:6px;flex-wrap:wrap">`;
                availCards.forEach(card => {
                    const borderColor = playerFaction === FACTIONS.DOMINION ? '#c44' : '#4ac';
                    html += `<div class="mission-card" style="flex:1;min-width:140px;border-color:${borderColor}40" onclick="ui.playCombatCard('${card.id}')">`;
                    html += `<div class="mission-name" style="font-size:12px">${card.name}</div>`;
                    html += `<div class="mission-desc" style="font-size:10px">${card.effect}</div>`;
                    html += `</div>`;
                });
                html += `</div></div>`;
            } else if (playedCard) {
                html += `<div style="margin-top:8px;font-size:12px;color:#aac">Card played: <span style="font-weight:600">${playedCard.name}</span></div>`;
            }

            html += `<div style="display:flex;gap:8px;margin-top:16px;justify-content:center">`;
            html += `<button class="btn primary" onclick="ui.combatRound()">Roll Dice</button>`;
            html += `<button class="btn danger" onclick="ui.retreatCombat()">Retreat</button>`;
            html += `</div>`;
        } else {
            html += `<div style="text-align:center;margin-top:16px;font-size:14px;color:#afa;font-weight:600">Combat resolved!</div>`;
        }

        modal.innerHTML = html;
    }

    hideCombatModal() {
        document.getElementById('modal-overlay').classList.add('hidden');
    }

    showGameOverModal(winner) {
        const overlay = document.getElementById('modal-overlay');
        const modal = document.getElementById('modal-content');
        overlay.classList.remove('hidden');

        const state = engine.state;
        const color = winner === FACTIONS.DOMINION ? '#c44' : '#4ac';
        const name = winner === FACTIONS.DOMINION ? 'The Dominion' : 'The Liberation';
        const subtitle = winner === FACTIONS.DOMINION
            ? 'The iron fist of the Dominion has crushed the uprising. Order is restored through force.'
            : 'The galaxy rises! The Liberation has inspired countless worlds to break their chains.';

        let html = `<div style="text-align:center;padding:24px 0">`;
        html += `<div style="font-size:32px;font-weight:800;color:${color};text-transform:uppercase;letter-spacing:4px;margin-bottom:8px">${name} Wins</div>`;
        html += `<div style="font-size:14px;color:#889;line-height:1.6;max-width:400px;margin:0 auto 24px">${subtitle}</div>`;

        // Stats
        html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;max-width:350px;margin:0 auto 24px">`;
        html += `<div style="padding:8px;background:rgba(200,60,60,0.1);border:1px solid #c4433a;border-radius:6px">`;
        html += `<div style="font-size:11px;color:#a88;text-transform:uppercase">Dominion Units</div>`;
        html += `<div style="font-size:20px;font-weight:700;color:#c44">${engine.getTotalUnits(FACTIONS.DOMINION)}</div>`;
        html += `</div>`;
        html += `<div style="padding:8px;background:rgba(60,140,200,0.1);border:1px solid #4ac;border-radius:6px">`;
        html += `<div style="font-size:11px;color:#88a;text-transform:uppercase">Liberation Units</div>`;
        html += `<div style="font-size:20px;font-weight:700;color:#4ac">${engine.getTotalUnits(FACTIONS.LIBERATION)}</div>`;
        html += `</div>`;
        html += `<div style="padding:8px;background:rgba(100,100,200,0.1);border:1px solid #66a;border-radius:6px">`;
        html += `<div style="font-size:11px;color:#889;text-transform:uppercase">Turns Played</div>`;
        html += `<div style="font-size:20px;font-weight:700;color:#aac">${state.turn}</div>`;
        html += `</div>`;
        html += `<div style="padding:8px;background:rgba(60,160,60,0.1);border:1px solid #4a4;border-radius:6px">`;
        html += `<div style="font-size:11px;color:#8a8;text-transform:uppercase">Objectives Done</div>`;
        html += `<div style="font-size:20px;font-weight:700;color:#afa">${state.completedObjectives.length}</div>`;
        html += `</div>`;
        html += `</div>`;

        html += `<button class="btn primary" style="padding:12px 36px;font-size:15px" onclick="location.reload()">Play Again</button>`;
        html += `</div>`;

        modal.innerHTML = html;
    }

    // ---- HELPERS ----

    groupUnits(units) {
        const groups = {};
        units.forEach(u => {
            groups[u.type] = (groups[u.type] || 0) + 1;
        });
        return groups;
    }

    getPhaseName(phase) {
        switch (phase) {
            case 'assignment': return 'Assignment Phase';
            case 'command': return 'Command Phase';
            case 'refresh': return 'Refresh Phase';
            default: return phase;
        }
    }

    showTooltip(x, y, sys) {
        const tt = document.getElementById('tooltip');
        const state = engine.state;

        const domUnits = engine.getSystemUnits(sys.id, FACTIONS.DOMINION);
        const libUnits = engine.getSystemUnits(sys.id, FACTIONS.LIBERATION);

        let html = `<div style="font-weight:600;margin-bottom:4px">${sys.name}</div>`;
        html += `<div style="font-size:11px;color:#889">${sys.loyalty} | ${sys.hasProduction ? 'Production' : 'No Production'}</div>`;

        if (domUnits.space.length + domUnits.ground.length > 0) {
            html += `<div style="font-size:11px;color:#c44;margin-top:4px">Dominion: ${domUnits.space.length} ships, ${domUnits.ground.length} ground</div>`;
        }
        if (libUnits.space.length + libUnits.ground.length > 0) {
            html += `<div style="font-size:11px;color:#4ac">Liberation: ${libUnits.space.length} ships, ${libUnits.ground.length} ground</div>`;
        }

        tt.innerHTML = html;
        tt.classList.remove('hidden');
        tt.style.left = (x + 16) + 'px';
        tt.style.top = (y + 16) + 'px';
    }

    hideTooltip() {
        document.getElementById('tooltip').classList.add('hidden');
    }
}

// Toast notification
function showToast(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

const ui = new UIManager();
