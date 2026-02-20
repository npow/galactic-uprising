// ============================================================
// GALACTIC UPRISING - UI Manager
// Handles all DOM-based UI, panels, modals, and user interaction
// Improved UX with clear turn indicators and step-by-step prompts
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

        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;

            if (this.renderer.isDragging) {
                this.renderer.camera.x = e.clientX - this.renderer.dragStart.x;
                this.renderer.camera.y = e.clientY - this.renderer.dragStart.y;
                this.hideTooltip();
                return;
            }

            const sys = this.renderer.getSystemAtScreen(mx, my);
            this.renderer.hoveredSystem = sys ? sys.id : null;

            if (sys) {
                this.showTooltip(e.clientX, e.clientY, sys);
            } else {
                this.hideTooltip();
            }

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
            this.selectedSystemId = sys.id;
            this.renderer.selectedSystem = sys.id;
            this.completeMissionAssignment(sys.id);
            return;
        }

        if (this.mode === 'moving') {
            const adjacent = engine.getAdjacentSystems(this.movingFrom);
            if (adjacent.includes(sys.id)) {
                this.executeMove(sys.id);
            } else {
                showToast('Must move to an adjacent system.', 'warning');
            }
            return;
        }

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

        // Turn counter
        document.getElementById('turn-info').innerHTML = `Turn <span>${state.turn}</span> / ${MAX_TURNS}`;

        // Phase tracker
        const tracker = document.getElementById('phase-tracker');
        const isDom = state.activePlayer === FACTIONS.DOMINION;
        const domClass = isDom ? ' dom-turn' : '';
        const phases = [
            { id: 'assignment', label: 'Assign' },
            { id: 'command', label: 'Command' },
            { id: 'refresh', label: 'Refresh' },
        ];
        let html = '';
        phases.forEach((p, i) => {
            const isActive = state.phase === p.id;
            html += `<div class="phase-step${isActive ? ' active' + domClass : ''}">${p.label}</div>`;
            if (i < phases.length - 1) html += `<span class="phase-arrow">&rsaquo;</span>`;
        });
        tracker.innerHTML = html;
    }

    updateLeftPanel() {
        const state = engine.state;
        if (!state) return;
        const panel = document.getElementById('left-panel');

        const faction = state.activePlayer;
        const fName = faction === FACTIONS.DOMINION ? 'Dominion' : 'Liberation';
        const fClass = faction === FACTIONS.DOMINION ? 'dom' : 'lib';
        const fColor = faction === FACTIONS.DOMINION ? 'var(--dom)' : 'var(--lib)';

        let html = '';

        // Turn banner - WHO is playing and WHAT phase
        html += `<div class="turn-banner ${fClass}">`;
        html += `<div class="turn-banner-icon ${fClass}">${fClass === 'dom' ? 'D' : 'L'}</div>`;
        html += `<div class="turn-banner-text">`;
        html += `<div class="turn-banner-faction" style="color:${fColor}">${fName}'s Turn</div>`;
        html += `<div class="turn-banner-phase">${this.getPhaseName(state.phase)}</div>`;
        html += `</div></div>`;

        // Victory Track
        html += `<div class="panel-section">`;
        html += `<div class="panel-title">Victory Track</div>`;

        // Time bar
        const timePercent = (state.timeMarker / MAX_TURNS) * 100;
        html += `<div class="track-label"><span style="color:var(--dom)">Time</span><span style="color:var(--dom)">${state.timeMarker} / ${MAX_TURNS}</span></div>`;
        html += `<div class="track-bar"><div class="track-fill dom" style="width:${timePercent}%"></div></div>`;

        // Reputation bar
        const repPercent = (state.reputationMarker / STARTING_REPUTATION) * 100;
        html += `<div class="track-label"><span style="color:var(--lib)">Reputation</span><span style="color:var(--lib)">${state.reputationMarker}</span></div>`;
        html += `<div class="track-bar"><div class="track-fill lib" style="width:${repPercent}%"></div></div>`;

        // Gap info
        const gap = state.reputationMarker - state.timeMarker;
        html += `<div style="font-size:11px;color:var(--text-muted);text-align:center;margin-top:2px">`;
        if (gap > 0) {
            html += `Liberation needs <span style="color:var(--lib);font-weight:700">${gap}</span> more points`;
        } else {
            html += `<span style="color:var(--lib);font-weight:700">Victory condition met!</span>`;
        }
        html += `</div></div>`;

        // Leaders section
        html += `<div class="panel-section">`;
        html += `<div class="panel-title">${fName} Leaders</div>`;

        state.leaders[faction].forEach(leader => {
            const isAssigned = state.assignedLeaderIds.has(leader.id);
            const isSelected = this.selectedLeaderId === leader.id;
            const isCaptured = leader.captured;
            const canSelect = state.phase === 'assignment' && !isAssigned && !isCaptured &&
                              faction === FACTIONS.LIBERATION && !state.commandPasses[faction];

            let cardClass = 'leader-card';
            if (isSelected) cardClass += ' selected';
            if (isAssigned || isCaptured) cardClass += ' assigned';
            if (canSelect && !isSelected) cardClass += ' selectable';

            html += `<div class="${cardClass}" onclick="ui.selectLeader('${leader.id}')" data-leader-id="${leader.id}">`;
            html += `<div class="leader-avatar" style="background:${leader.color}">${leader.avatar}</div>`;
            html += `<div class="leader-info">`;
            html += `<div class="leader-name">${leader.name}`;
            if (isCaptured) html += ` <span style="color:var(--dom);font-size:10px">(Captured)</span>`;
            if (isAssigned) html += ` <span style="color:var(--gold);font-size:10px">(Assigned)</span>`;
            html += `</div>`;
            html += `<div class="leader-skills">`;
            html += `<span class="skill-pip"><span class="skill-label">CMB</span> ${leader.skills.combat}</span>`;
            html += `<span class="skill-pip"><span class="skill-label">INT</span> ${leader.skills.intel}</span>`;
            html += `<span class="skill-pip"><span class="skill-label">DIP</span> ${leader.skills.diplomacy}</span>`;
            html += `<span class="skill-pip"><span class="skill-label">LOG</span> ${leader.skills.logistics}</span>`;
            html += `</div></div></div>`;
        });
        html += `</div>`;

        // Missions (assignment phase)
        if (state.phase === 'assignment' && faction === FACTIONS.LIBERATION) {
            html += `<div class="panel-section">`;
            html += `<div class="panel-title">${fName} Missions</div>`;
            if (!this.selectedLeaderId) {
                html += `<div style="font-size:11px;color:var(--text-muted);padding:4px 0">Select a leader first to see available missions.</div>`;
            }
            state.missionHands[faction].forEach(mission => {
                const isSelected = this.selectedMissionId === mission.id;
                // Check if selected leader can do this mission
                let canDo = false;
                if (this.selectedLeaderId) {
                    const leader = state.leaders[faction].find(l => l.id === this.selectedLeaderId);
                    if (leader) {
                        const skillVal = leader.skills[mission.skill] || 0;
                        canDo = skillVal >= mission.minSkill;
                    }
                }

                let cardClass = 'mission-card';
                if (isSelected) cardClass += ' selected';
                if (this.selectedLeaderId && canDo && !isSelected) cardClass += ' selectable';

                const opacity = this.selectedLeaderId && !canDo ? 'opacity:0.4;' : '';
                html += `<div class="${cardClass}" style="${opacity}" onclick="ui.selectMission('${mission.id}')">`;
                html += `<div class="mission-name">${mission.name}</div>`;
                html += `<div class="mission-desc">${mission.desc}</div>`;
                html += `<div class="mission-req">Requires: ${mission.skill} ${mission.minSkill}+${!canDo && this.selectedLeaderId ? ' (insufficient)' : ''}</div>`;
                html += `</div>`;
            });
            html += `</div>`;
        }

        // Pending missions (command phase)
        if (state.phase === 'command') {
            html += `<div class="panel-section">`;
            html += `<div class="panel-title">Pending Missions</div>`;
            if (state.assignments[faction].length === 0) {
                html += `<div style="font-size:11px;color:var(--text-muted);padding:4px 0">No pending missions. Move units or pass.</div>`;
            }
            state.assignments[faction].forEach((a, i) => {
                html += `<div class="mission-card" onclick="ui.resolveMission(${i})" style="cursor:pointer">`;
                html += `<div class="mission-name">${a.mission.name}</div>`;
                html += `<div style="font-size:11px;color:var(--text-dim);margin-top:2px">${a.leader.name} &rarr; ${state.systems[a.targetSystem]?.name || 'TBD'}</div>`;
                html += `<div class="btn btn-small primary" style="margin-top:8px;width:100%">Resolve Mission</div>`;
                html += `</div>`;
            });
            html += `</div>`;
        }

        // Objectives
        html += `<div class="panel-section">`;
        html += `<div class="panel-title">Active Objectives</div>`;
        state.currentObjectives.forEach(obj => {
            html += `<div class="objective-card">`;
            html += `<div class="objective-name">${obj.name} <span class="objective-points">+${obj.points}</span></div>`;
            html += `<div class="objective-desc">${obj.desc}</div>`;
            html += `</div>`;
        });
        if (state.completedObjectives.length > 0) {
            html += `<div class="panel-title" style="margin-top:10px">Completed</div>`;
            state.completedObjectives.forEach(obj => {
                html += `<div class="objective-card completed">`;
                html += `<div class="objective-name">${obj.name} <span class="objective-points">+${obj.points} &check;</span></div>`;
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
                const loyaltyColor = sys.loyalty === 'dominion' ? 'var(--dom)' : sys.loyalty === 'liberation' ? 'var(--lib)' : 'var(--neutral)';
                const loyaltyName = sys.loyalty.charAt(0).toUpperCase() + sys.loyalty.slice(1);

                html += `<div class="panel-section">`;
                html += `<div class="system-header">${sys.name}</div>`;
                html += `<div class="system-region" style="color:${region?.color || '#888'}">${region?.name || 'Unknown'}</div>`;

                html += `<div class="system-meta">Loyalty: <span style="color:${loyaltyColor};font-weight:600">${loyaltyName}</span></div>`;

                // Resources
                html += `<div class="system-meta">Resources: `;
                const resIcons = { fleet: 'Fleet', trooper: 'Trooper', structure: 'Structure', airship: 'Airship' };
                Object.entries(sys.resources).forEach(([type, count]) => {
                    for (let i = 0; i < count; i++) html += `<span style="color:var(--gold)">${resIcons[type] || type}</span> `;
                });
                html += `</div>`;

                if (sys.hasProduction) {
                    html += `<div class="system-meta" style="color:var(--gold)">Production Facility</div>`;
                }

                // Base indicator
                if (sys.id === state.liberationBase) {
                    if (state.baseRevealed) {
                        html += `<div class="system-meta" style="color:var(--dom);font-weight:700">LIBERATION BASE (REVEALED)</div>`;
                    } else if (state.activePlayer === FACTIONS.LIBERATION) {
                        html += `<div class="system-meta" style="color:var(--lib);font-weight:700">Your Hidden Base</div>`;
                    }
                }
                html += `</div>`;

                // Units in system
                ['dominion', 'liberation'].forEach(faction => {
                    const units = engine.getSystemUnits(this.selectedSystemId, faction);
                    const leaders = engine.getLeadersInSystem(this.selectedSystemId, faction);
                    const fColor = faction === FACTIONS.DOMINION ? 'var(--dom)' : 'var(--lib)';
                    const fName = faction === FACTIONS.DOMINION ? 'Dominion' : 'Liberation';

                    if (units.space.length > 0 || units.ground.length > 0 || leaders.length > 0) {
                        html += `<div class="panel-section">`;
                        html += `<div class="panel-title" style="color:${fColor}">${fName} Forces</div>`;

                        leaders.forEach(l => {
                            html += `<div style="display:flex;align-items:center;gap:8px;padding:3px 0">`;
                            html += `<div style="width:22px;height:22px;border-radius:50%;background:${l.color};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff">${l.avatar}</div>`;
                            html += `<span style="font-size:12px;font-weight:600">${l.name}</span>`;
                            html += `</div>`;
                        });

                        if (units.space.length > 0) {
                            html += `<div style="font-size:10px;color:var(--text-muted);margin:6px 0 3px;text-transform:uppercase;letter-spacing:1px">Space Forces</div>`;
                            const grouped = this.groupUnits(units.space);
                            Object.entries(grouped).forEach(([type, count]) => {
                                const ut = Object.values(UNIT_TYPES).find(t => t.name === type);
                                html += `<div class="unit-row">`;
                                if (this.mode === 'moving' && this.movingFrom === this.selectedSystemId && faction === state.activePlayer) {
                                    html += `<input type="checkbox" onchange="ui.toggleMoveUnit(this, '${ut?.id}')" style="accent-color:var(--lib)" />`;
                                }
                                html += `<div class="unit-icon" style="color:${ut?.color || fColor}">${ut?.icon || '?'}</div>`;
                                html += `<span>${type} <span style="color:var(--text-dim)">x${count}</span></span>`;
                                html += `</div>`;
                            });
                        }

                        if (units.ground.length > 0) {
                            html += `<div style="font-size:10px;color:var(--text-muted);margin:6px 0 3px;text-transform:uppercase;letter-spacing:1px">Ground Forces</div>`;
                            const grouped = this.groupUnits(units.ground);
                            Object.entries(grouped).forEach(([type, count]) => {
                                const ut = Object.values(UNIT_TYPES).find(t => t.name === type);
                                html += `<div class="unit-row">`;
                                if (this.mode === 'moving' && this.movingFrom === this.selectedSystemId && faction === state.activePlayer) {
                                    html += `<input type="checkbox" onchange="ui.toggleMoveUnit(this, '${ut?.id}')" style="accent-color:var(--lib)" />`;
                                }
                                html += `<div class="unit-icon" style="color:${ut?.color || fColor}">${ut?.icon || '?'}</div>`;
                                html += `<span>${type} <span style="color:var(--text-dim)">x${count}</span></span>`;
                                html += `</div>`;
                            });
                        }

                        html += `</div>`;
                    }
                });

                // Actions for selected system
                if (state.phase === 'command' && !state.activeCombat && state.activePlayer === FACTIONS.LIBERATION) {
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

                    if (engine.checkCombat(this.selectedSystemId)) {
                        html += `<div class="panel-section">`;
                        html += `<button class="btn danger" style="width:100%" onclick="ui.startCombat('${this.selectedSystemId}')">Engage Combat!</button>`;
                        html += `</div>`;
                    }
                }
            }
        } else {
            html += `<div class="panel-section">`;
            html += `<div style="font-size:12px;color:var(--text-muted);padding:20px 0;text-align:center">Click a system on the galaxy map to view details.</div>`;
            html += `</div>`;
        }

        // Probe tracker
        html += `<div class="panel-section">`;
        html += `<div class="panel-title">Probe Tracker</div>`;
        html += `<div style="font-size:11px;color:var(--text-dim);margin-bottom:6px">Probed: ${state.probeDiscards.length} / ${state.probeDiscards.length + state.probeDeck.length} systems</div>`;
        const probedSystems = state.probeDiscards.map(id => state.systems[id]).filter(Boolean);
        if (probedSystems.length > 0) {
            html += `<div style="display:flex;flex-wrap:wrap;gap:3px">`;
            probedSystems.forEach(s => {
                const isBase = s.id === state.liberationBase && state.baseRevealed;
                const bg = isBase ? 'var(--dom)' : 'var(--bg-card)';
                const color = isBase ? '#fff' : 'var(--text-dim)';
                html += `<span class="probe-token" style="background:${bg};color:${color}" title="${s.name}">${s.name.substring(0, 2).toUpperCase()}</span>`;
            });
            html += `</div>`;
        }
        html += `</div>`;

        // Game log
        html += `<div class="panel-section">`;
        html += `<div class="panel-title">Game Log</div>`;
        const recentLog = state.log.slice(-12).reverse();
        recentLog.forEach(entry => {
            html += `<div class="log-entry">${entry.msg}</div>`;
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
            const color = state.winner === FACTIONS.DOMINION ? 'var(--dom)' : 'var(--lib)';
            html += `<div class="action-prompt"><div class="action-main" style="font-size:18px;color:${color}">${winner} Wins!</div></div>`;
            html += `<button class="btn primary" onclick="location.reload()">New Game</button>`;
            this.showGameOverModal(state.winner);

        } else if (state.activeCombat) {
            html += `<div class="action-prompt">`;
            html += `<div class="action-main">Combat at ${state.systems[state.activeCombat.systemId].name}</div>`;
            html += `<div class="action-hint">${state.activeCombat.phase === 'space' ? 'Space Battle' : 'Ground Battle'} - Round ${state.activeCombat.round}</div>`;
            html += `</div>`;
            html += `<button class="btn primary" onclick="ui.combatRound()">Roll Dice</button>`;
            html += `<button class="btn danger" onclick="ui.retreatCombat()">Retreat</button>`;

        } else if (state.activePlayer === FACTIONS.DOMINION) {
            // AI thinking
            html += `<div class="action-prompt">`;
            html += `<div class="action-main" style="color:var(--dom)">Dominion is deliberating<span class="thinking-dots"><span>.</span><span>.</span><span>.</span></span></div>`;
            html += `<div class="action-hint">The AI opponent is planning its moves.</div>`;
            html += `</div>`;

        } else if (state.phase === 'assignment') {
            // Step-by-step assignment flow
            const hasLeader = !!this.selectedLeaderId;
            const hasMission = !!this.selectedMissionId;
            const hasTarget = this.mode === 'select_target';

            html += `<div class="action-steps">`;

            // Step 1: Select leader
            html += `<div class="step ${hasLeader ? 'done' : 'active'}">`;
            html += `<div class="step-num">${hasLeader ? '&check;' : '1'}</div>`;
            html += `<span>${hasLeader ? 'Leader selected' : 'Select a leader'}</span>`;
            html += `</div>`;

            // Step 2: Select mission
            html += `<div class="step ${hasMission ? 'done' : hasLeader ? 'active' : ''}">`;
            html += `<div class="step-num">${hasMission ? '&check;' : '2'}</div>`;
            html += `<span>${hasMission ? 'Mission selected' : 'Choose a mission'}</span>`;
            html += `</div>`;

            // Step 3: Target
            html += `<div class="step ${hasTarget ? 'active' : hasMission ? 'active' : ''}">`;
            html += `<div class="step-num">3</div>`;
            html += `<span>${hasTarget ? 'Click target system' : 'Pick a target'}</span>`;
            html += `</div>`;

            html += `</div>`;

            if (hasLeader && hasMission && !hasTarget) {
                html += `<button class="btn primary" onclick="ui.confirmAssignment()">Assign</button>`;
            }
            html += `<button class="btn" onclick="ui.passAssignment()">Pass</button>`;

        } else if (state.phase === 'command') {
            html += `<div class="action-prompt">`;
            html += `<div class="action-main">Command Phase</div>`;
            if (state.assignments[FACTIONS.LIBERATION].length > 0) {
                html += `<div class="action-hint">Resolve your pending missions, move units, or pass.</div>`;
            } else if (this.mode === 'moving') {
                html += `<div class="action-hint">Click an adjacent system to move your units there.</div>`;
            } else {
                html += `<div class="action-hint">Select a system with your forces to move units, or pass to end.</div>`;
            }
            html += `</div>`;
            html += `<button class="btn" onclick="ui.passCommand()">End Phase</button>`;

        } else if (state.phase === 'refresh') {
            html += `<div class="action-prompt">`;
            html += `<div class="action-main">Refresh Phase</div>`;
            html += `<div class="action-hint">Processing production, objectives, and turn advancement...</div>`;
            html += `</div>`;
        }

        // Production count
        if (!state.gameOver) {
            const faction = state.activePlayer;
            const queueCount = state.productionQueue[faction].length;
            if (queueCount > 0) {
                html += `<div style="font-size:11px;color:var(--text-dim);margin-left:12px">${queueCount} unit${queueCount > 1 ? 's' : ''} building</div>`;
            }
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

        if (state.phase === 'command' && leader.location) {
            this.selectedSystemId = leader.location;
            this.renderer.selectedSystem = leader.location;
        }

        this.updateAll();
    }

    selectMission(id) {
        const state = engine.state;
        // Check leader can do this mission
        if (this.selectedLeaderId) {
            const leader = state.leaders[state.activePlayer].find(l => l.id === this.selectedLeaderId);
            const mission = state.missionHands[state.activePlayer].find(m => m.id === id);
            if (leader && mission) {
                const skillVal = leader.skills[mission.skill] || 0;
                if (skillVal < mission.minSkill) {
                    showToast(`${leader.name} needs ${mission.skill} ${mission.minSkill}+ (has ${skillVal})`, 'warning');
                    return;
                }
            }
        }
        this.selectedMissionId = id;
        this.updateAll();
    }

    confirmAssignment() {
        const state = engine.state;
        if (!this.selectedLeaderId || !this.selectedMissionId) return;

        this.mode = 'select_target';
        this.renderer.highlightedSystems = new Set(Object.keys(state.systems));
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
        this.renderer.highlightedSystems.clear();
        showToast('Leader assigned to mission.', 'success');

        const sys = engine.state.systems[targetSystem];
        if (sys) {
            for (let i = 0; i < 10; i++) {
                this.renderer.addParticle(sys.x, sys.y, '#5dade2');
            }
        }

        this.updateAll();
    }

    passAssignment() {
        engine.passAssignment();
        this.selectedLeaderId = null;
        this.selectedMissionId = null;
        this.mode = 'normal';
        this.renderer.highlightedSystems.clear();
        this.updateAll();
    }

    passCommand() {
        engine.passCommand();
        this.mode = 'normal';
        this.renderer.highlightedSystems.clear();

        if (engine.state.phase === 'refresh') {
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
        this.renderer.highlightedSystems = new Set(adj);

        showToast('Click an adjacent system to move units.', 'info');
        this.updateAll();
    }

    cancelMove() {
        this.mode = 'normal';
        this.movingFrom = null;
        this.selectedUnitIds.clear();
        this.renderer.moveTarget = null;
        this.renderer.highlightedSystems.clear();
        this.updateAll();
    }

    toggleMoveUnit(checkbox, unitTypeId) {
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
        this.renderer.highlightedSystems.clear();

        const sys = state.systems[toSystem];
        for (let i = 0; i < 15; i++) {
            this.renderer.addParticle(sys.x, sys.y, faction === FACTIONS.DOMINION ? '#e74c3c' : '#5dade2');
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
            this.showCombatModal();
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
        html += `<div style="font-size:12px;color:var(--text-dim);margin-bottom:14px">${combat.phase === 'space' ? 'Space Battle' : 'Ground Battle'} &mdash; Round ${combat.round}</div>`;

        html += `<div class="combat-area">`;

        // Dominion side
        html += `<div class="combat-side dominion">`;
        html += `<div class="combat-faction-label" style="color:var(--dom)">Dominion</div>`;
        const domUnits = combat.dominion[combat.phase];
        domUnits.forEach(u => {
            const ut = Object.values(UNIT_TYPES).find(t => t.id === u.typeId);
            const healthFull = u.maxHealth - u.damage;
            const healthBar = '<span style="color:var(--green)">' + '&#9679;'.repeat(healthFull) + '</span>' +
                              '<span style="color:#444">' + '&#9675;'.repeat(u.damage) + '</span>';
            html += `<div style="font-size:12px;margin:3px 0;display:flex;gap:6px;align-items:center">`;
            html += `<span style="color:${ut?.color || 'var(--dom)'}">${ut?.icon || '?'}</span>`;
            html += `<span>${u.type}</span>`;
            html += `<span style="font-size:10px;margin-left:auto">${healthBar}</span>`;
            html += `</div>`;
        });
        if (domUnits.length === 0) html += `<div style="font-size:12px;color:var(--text-muted)">No units remaining</div>`;

        if (roundResult) {
            html += `<div class="dice-container">`;
            roundResult.dominion.roll.forEach(r => {
                const cls = r.result === 'hit' ? 'hit' : r.result === 'crit' ? 'crit' : 'miss';
                const sym = r.result === 'hit' ? '&#10022;' : r.result === 'crit' ? '&#9733;' : '&middot;';
                html += `<div class="die ${cls}" title="${r.type} die: ${r.result}">${sym}</div>`;
            });
            html += `</div>`;
            html += `<div style="font-size:12px;color:var(--green);font-weight:600">${roundResult.dominion.effectiveHits} hit${roundResult.dominion.effectiveHits !== 1 ? 's' : ''} dealt</div>`;
        }
        html += `</div>`;

        // Liberation side
        html += `<div class="combat-side liberation">`;
        html += `<div class="combat-faction-label" style="color:var(--lib)">Liberation</div>`;
        const libUnits = combat.liberation[combat.phase];
        libUnits.forEach(u => {
            const ut = Object.values(UNIT_TYPES).find(t => t.id === u.typeId);
            const healthFull = u.maxHealth - u.damage;
            const healthBar = '<span style="color:var(--green)">' + '&#9679;'.repeat(healthFull) + '</span>' +
                              '<span style="color:#444">' + '&#9675;'.repeat(u.damage) + '</span>';
            html += `<div style="font-size:12px;margin:3px 0;display:flex;gap:6px;align-items:center">`;
            html += `<span style="color:${ut?.color || 'var(--lib)'}">${ut?.icon || '?'}</span>`;
            html += `<span>${u.type}</span>`;
            html += `<span style="font-size:10px;margin-left:auto">${healthBar}</span>`;
            html += `</div>`;
        });
        if (libUnits.length === 0) html += `<div style="font-size:12px;color:var(--text-muted)">No units remaining</div>`;

        if (roundResult) {
            html += `<div class="dice-container">`;
            roundResult.liberation.roll.forEach(r => {
                const cls = r.result === 'hit' ? 'hit' : r.result === 'crit' ? 'crit' : 'miss';
                const sym = r.result === 'hit' ? '&#10022;' : r.result === 'crit' ? '&#9733;' : '&middot;';
                html += `<div class="die ${cls}" title="${r.type} die: ${r.result}">${sym}</div>`;
            });
            html += `</div>`;
            html += `<div style="font-size:12px;color:var(--green);font-weight:600">${roundResult.liberation.effectiveHits} hit${roundResult.liberation.effectiveHits !== 1 ? 's' : ''} dealt</div>`;
        }
        html += `</div>`;
        html += `</div>`;

        // Combat log
        html += `<div style="margin-top:12px;padding:10px;background:rgba(0,0,0,0.3);border-radius:8px;max-height:100px;overflow-y:auto">`;
        combat.combatLog.forEach(msg => {
            html += `<div style="font-size:11px;color:var(--text-dim);padding:1px 0">${msg}</div>`;
        });
        html += `</div>`;

        // Tactic cards
        if (!roundResult?.combatOver) {
            const playerFaction = engine.state.activePlayer;
            const availCards = combatEngine.getAvailableCards(playerFaction);
            const playedCard = combat.cardsPlayed[playerFaction];

            if (availCards.length > 0 && !playedCard) {
                html += `<div style="margin-top:14px">`;
                html += `<div style="font-size:10px;color:var(--text-muted);margin-bottom:8px;text-transform:uppercase;letter-spacing:1.5px">Play a Tactic Card (optional)</div>`;
                html += `<div style="display:flex;gap:6px;flex-wrap:wrap">`;
                availCards.forEach(card => {
                    const borderColor = playerFaction === FACTIONS.DOMINION ? 'var(--dom)' : 'var(--lib)';
                    html += `<div class="mission-card" style="flex:1;min-width:140px;border-color:${borderColor}" onclick="ui.playCombatCard('${card.id}')">`;
                    html += `<div class="mission-name" style="font-size:12px">${card.name}</div>`;
                    html += `<div class="mission-desc" style="font-size:10px">${card.effect}</div>`;
                    html += `</div>`;
                });
                html += `</div></div>`;
            } else if (playedCard) {
                html += `<div style="margin-top:10px;font-size:12px;color:var(--text-dim)">Card played: <span style="font-weight:600;color:var(--text)">${playedCard.name}</span></div>`;
            }

            html += `<div style="display:flex;gap:10px;margin-top:18px;justify-content:center">`;
            html += `<button class="btn primary" onclick="ui.combatRound()">Roll Dice</button>`;
            html += `<button class="btn danger" onclick="ui.retreatCombat()">Retreat</button>`;
            html += `</div>`;
        } else {
            html += `<div style="text-align:center;margin-top:18px;font-size:15px;color:var(--green);font-weight:700">Combat Resolved</div>`;
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
        const color = winner === FACTIONS.DOMINION ? 'var(--dom)' : 'var(--lib)';
        const name = winner === FACTIONS.DOMINION ? 'The Dominion' : 'The Liberation';
        const subtitle = winner === FACTIONS.DOMINION
            ? 'The iron fist of the Dominion has crushed the uprising. Order is restored through force.'
            : 'The galaxy rises! The Liberation has inspired countless worlds to break free.';

        let html = `<div style="text-align:center;padding:28px 0">`;
        html += `<div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:3px;margin-bottom:8px">Victory</div>`;
        html += `<div style="font-size:32px;font-weight:900;color:${color};text-transform:uppercase;letter-spacing:4px;margin-bottom:12px">${name}</div>`;
        html += `<div style="font-size:13px;color:var(--text-dim);line-height:1.6;max-width:400px;margin:0 auto 28px">${subtitle}</div>`;

        html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;max-width:320px;margin:0 auto 28px">`;
        html += `<div style="padding:10px;background:rgba(231,76,60,0.08);border:1px solid rgba(231,76,60,0.2);border-radius:8px">`;
        html += `<div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px">Dominion</div>`;
        html += `<div style="font-size:22px;font-weight:800;color:var(--dom)">${engine.getTotalUnits(FACTIONS.DOMINION)}</div>`;
        html += `<div style="font-size:10px;color:var(--text-muted)">units</div>`;
        html += `</div>`;
        html += `<div style="padding:10px;background:rgba(93,173,226,0.08);border:1px solid rgba(93,173,226,0.2);border-radius:8px">`;
        html += `<div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px">Liberation</div>`;
        html += `<div style="font-size:22px;font-weight:800;color:var(--lib)">${engine.getTotalUnits(FACTIONS.LIBERATION)}</div>`;
        html += `<div style="font-size:10px;color:var(--text-muted)">units</div>`;
        html += `</div>`;
        html += `<div style="padding:10px;background:rgba(100,100,200,0.05);border:1px solid var(--border);border-radius:8px">`;
        html += `<div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px">Turns</div>`;
        html += `<div style="font-size:22px;font-weight:800;color:var(--text)">${state.turn}</div>`;
        html += `</div>`;
        html += `<div style="padding:10px;background:rgba(46,204,113,0.05);border:1px solid rgba(46,204,113,0.15);border-radius:8px">`;
        html += `<div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px">Objectives</div>`;
        html += `<div style="font-size:22px;font-weight:800;color:var(--green)">${state.completedObjectives.length}</div>`;
        html += `</div>`;
        html += `</div>`;

        html += `<button class="btn primary" style="padding:12px 40px;font-size:14px" onclick="location.reload()">Play Again</button>`;
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

        const loyaltyColor = sys.loyalty === 'dominion' ? 'var(--dom)' : sys.loyalty === 'liberation' ? 'var(--lib)' : 'var(--neutral)';

        let html = `<div style="font-weight:700;margin-bottom:3px">${sys.name}</div>`;
        html += `<div style="font-size:11px;color:var(--text-dim)"><span style="color:${loyaltyColor}">${sys.loyalty}</span> &middot; ${sys.hasProduction ? 'Production' : 'No production'}</div>`;

        if (domUnits.space.length + domUnits.ground.length > 0) {
            html += `<div style="font-size:11px;color:var(--dom);margin-top:3px">Dominion: ${domUnits.space.length} ships, ${domUnits.ground.length} ground</div>`;
        }
        if (libUnits.space.length + libUnits.ground.length > 0) {
            html += `<div style="font-size:11px;color:var(--lib)">Liberation: ${libUnits.space.length} ships, ${libUnits.ground.length} ground</div>`;
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
