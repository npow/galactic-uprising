// ============================================================
// GALACTIC UPRISING - Galaxy Map Renderer
// Canvas-based rendering with improved visual effects
// ============================================================

class GalaxyRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.stars = [];
        this.nebulae = [];
        this.particles = [];
        this.animFrame = 0;
        this.camera = { x: 0, y: 0, zoom: 1 };
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.hoveredSystem = null;
        this.selectedSystem = null;
        this.moveTarget = null;
        this.animationId = null;
        this.highlightedSystems = new Set(); // For showing valid move targets

        this.initStars();
        this.initNebulae();
        this.setupResize();
    }

    initStars() {
        // Multi-colored stars for more realistic space
        const starColors = [
            { r: 200, g: 210, b: 255 }, // Blue-white (most common)
            { r: 255, g: 240, b: 220 }, // Warm white
            { r: 180, g: 200, b: 255 }, // Blue
            { r: 255, g: 220, b: 180 }, // Yellow-orange
            { r: 255, g: 200, b: 180 }, // Orange-red (rare)
        ];

        for (let i = 0; i < 500; i++) {
            const color = starColors[Math.random() < 0.6 ? 0 : Math.random() < 0.5 ? 1 : Math.random() < 0.5 ? 2 : Math.random() < 0.7 ? 3 : 4];
            this.stars.push({
                x: Math.random(),
                y: Math.random(),
                size: Math.random() * 1.2 + 0.2,
                brightness: Math.random() * 0.6 + 0.2,
                twinkleSpeed: Math.random() * 0.015 + 0.003,
                twinkleOffset: Math.random() * Math.PI * 2,
                color,
            });
        }
        // Add a few bright stars
        for (let i = 0; i < 15; i++) {
            const color = starColors[Math.floor(Math.random() * 3)];
            this.stars.push({
                x: Math.random(),
                y: Math.random(),
                size: Math.random() * 1.5 + 1.5,
                brightness: Math.random() * 0.3 + 0.7,
                twinkleSpeed: Math.random() * 0.01 + 0.005,
                twinkleOffset: Math.random() * Math.PI * 2,
                color,
                hasDiffraction: true,
            });
        }
    }

    initNebulae() {
        const nebulaColors = [
            { r: 30, g: 10, b: 60 },   // Purple
            { r: 10, g: 25, b: 50 },   // Deep blue
            { r: 50, g: 15, b: 25 },   // Crimson
            { r: 10, g: 40, b: 30 },   // Teal
            { r: 25, g: 15, b: 50 },   // Violet
            { r: 40, g: 25, b: 10 },   // Amber
            { r: 15, g: 15, b: 40 },   // Dark blue
        ];
        for (let i = 0; i < 7; i++) {
            this.nebulae.push({
                x: 0.1 + Math.random() * 0.8,
                y: 0.1 + Math.random() * 0.8,
                radius: Math.random() * 0.12 + 0.06,
                color: nebulaColors[i],
                opacity: Math.random() * 0.25 + 0.08,
                drift: Math.random() * 0.0001,
            });
        }
    }

    setupResize() {
        const resize = () => {
            const container = this.canvas.parentElement;
            this.canvas.width = container.clientWidth * window.devicePixelRatio;
            this.canvas.height = container.clientHeight * window.devicePixelRatio;
            this.canvas.style.width = container.clientWidth + 'px';
            this.canvas.style.height = container.clientHeight + 'px';
            this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
            this.width = container.clientWidth;
            this.height = container.clientHeight;
        };
        window.addEventListener('resize', resize);
        resize();
    }

    worldToScreen(wx, wy) {
        const cx = this.width / 2;
        const cy = this.height / 2;
        return {
            x: (wx - 0.5) * this.width * this.camera.zoom + cx + this.camera.x,
            y: (wy - 0.5) * this.height * this.camera.zoom + cy + this.camera.y,
        };
    }

    screenToWorld(sx, sy) {
        const cx = this.width / 2;
        const cy = this.height / 2;
        return {
            x: (sx - cx - this.camera.x) / (this.width * this.camera.zoom) + 0.5,
            y: (sy - cy - this.camera.y) / (this.height * this.camera.zoom) + 0.5,
        };
    }

    getSystemAtScreen(sx, sy) {
        const state = engine.state;
        if (!state) return null;
        let closest = null;
        let closestDist = Infinity;

        Object.values(state.systems).forEach(sys => {
            const pos = this.worldToScreen(sys.x, sys.y);
            const dist = Math.hypot(pos.x - sx, pos.y - sy);
            if (dist < 30 && dist < closestDist) {
                closest = sys;
                closestDist = dist;
            }
        });
        return closest;
    }

    render() {
        if (!engine.state) return;
        this.animFrame++;
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;

        // Clear
        ctx.clearRect(0, 0, w, h);

        // Background
        const bgGrad = ctx.createRadialGradient(w * 0.4, h * 0.4, 0, w / 2, h / 2, w * 0.75);
        bgGrad.addColorStop(0, '#0a0a22');
        bgGrad.addColorStop(0.4, '#060618');
        bgGrad.addColorStop(1, '#020208');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        // Nebulae (behind everything)
        this.renderNebulae(ctx);

        // Stars
        this.renderStars(ctx);

        // Region labels (very subtle)
        this.renderRegionLabels(ctx);

        // Connections (hyperspace lanes)
        this.renderConnections(ctx);

        // Highlighted systems (valid move targets)
        this.renderHighlights(ctx);

        // Systems (planets)
        this.renderSystems(ctx);

        // Units
        this.renderMapUnits(ctx);

        // Leaders
        this.renderMapLeaders(ctx);

        // Move indicator
        if (this.moveTarget) {
            this.renderMoveIndicator(ctx);
        }

        // Particles
        this.updateAndRenderParticles(ctx);

        this.animationId = requestAnimationFrame(() => this.render());
    }

    renderNebulae(ctx) {
        this.nebulae.forEach(n => {
            const pos = this.worldToScreen(n.x, n.y);
            const r = n.radius * this.width * this.camera.zoom;
            const grad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, r);
            const c = n.color;
            grad.addColorStop(0, `rgba(${c.r}, ${c.g}, ${c.b}, ${n.opacity})`);
            grad.addColorStop(0.5, `rgba(${c.r}, ${c.g}, ${c.b}, ${n.opacity * 0.4})`);
            grad.addColorStop(1, `rgba(${c.r}, ${c.g}, ${c.b}, 0)`);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    renderStars(ctx) {
        this.stars.forEach(s => {
            const twinkle = Math.sin(this.animFrame * s.twinkleSpeed + s.twinkleOffset) * 0.3 + 0.7;
            const alpha = s.brightness * twinkle;
            const pos = this.worldToScreen(s.x, s.y);
            const c = s.color;

            ctx.fillStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})`;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, s.size, 0, Math.PI * 2);
            ctx.fill();

            // Diffraction spikes on bright stars
            if (s.hasDiffraction && alpha > 0.5) {
                ctx.strokeStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha * 0.3})`;
                ctx.lineWidth = 0.5;
                const len = s.size * 4;
                ctx.beginPath();
                ctx.moveTo(pos.x - len, pos.y);
                ctx.lineTo(pos.x + len, pos.y);
                ctx.moveTo(pos.x, pos.y - len);
                ctx.lineTo(pos.x, pos.y + len);
                ctx.stroke();
            }
        });
    }

    renderRegionLabels(ctx) {
        const state = engine.state;
        const regionCenters = {};
        Object.values(state.systems).forEach(sys => {
            if (!regionCenters[sys.region]) regionCenters[sys.region] = { x: 0, y: 0, count: 0 };
            regionCenters[sys.region].x += sys.x;
            regionCenters[sys.region].y += sys.y;
            regionCenters[sys.region].count++;
        });

        REGIONS.forEach(region => {
            const rc = regionCenters[region.id];
            if (!rc) return;
            const cx = rc.x / rc.count;
            const cy = rc.y / rc.count;
            const pos = this.worldToScreen(cx, cy - 0.04);

            ctx.fillStyle = 'rgba(100, 110, 140, 0.15)';
            ctx.font = 'bold 10px "SF Pro Display", "Segoe UI", Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(region.name.toUpperCase(), pos.x, pos.y);
        });
    }

    renderConnections(ctx) {
        const state = engine.state;
        const rendered = new Set();

        state.connections.forEach((neighbors, sysId) => {
            const sys = state.systems[sysId];
            if (!sys) return;
            neighbors.forEach(nId => {
                const key = [sysId, nId].sort().join('-');
                if (rendered.has(key)) return;
                rendered.add(key);

                const nsys = state.systems[nId];
                if (!nsys) return;

                const from = this.worldToScreen(sys.x, sys.y);
                const to = this.worldToScreen(nsys.x, nsys.y);

                // Determine if this connection involves selected system
                const isActive = this.selectedSystem === sysId || this.selectedSystem === nId;

                // Gradient line that fades in the middle
                const midX = (from.x + to.x) / 2;
                const midY = (from.y + to.y) / 2;
                const grad = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
                const baseAlpha = isActive ? 0.35 : 0.12;
                const midAlpha = isActive ? 0.15 : 0.04;
                const baseColor = isActive ? '100, 140, 200' : '60, 65, 100';
                grad.addColorStop(0, `rgba(${baseColor}, ${baseAlpha})`);
                grad.addColorStop(0.5, `rgba(${baseColor}, ${midAlpha})`);
                grad.addColorStop(1, `rgba(${baseColor}, ${baseAlpha})`);

                ctx.strokeStyle = grad;
                ctx.lineWidth = isActive ? 1.5 : 0.8;
                ctx.beginPath();
                ctx.moveTo(from.x, from.y);
                ctx.lineTo(to.x, to.y);
                ctx.stroke();
            });
        });
    }

    renderHighlights(ctx) {
        if (this.highlightedSystems.size === 0) return;
        const state = engine.state;

        this.highlightedSystems.forEach(sysId => {
            const sys = state.systems[sysId];
            if (!sys) return;
            const pos = this.worldToScreen(sys.x, sys.y);

            // Pulsing ring around valid targets
            const pulse = Math.sin(this.animFrame * 0.05) * 0.3 + 0.7;
            ctx.strokeStyle = `rgba(93, 173, 226, ${0.3 * pulse})`;
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.lineDashOffset = this.animFrame * 0.3;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 24, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        });
    }

    renderSystems(ctx) {
        const state = engine.state;

        Object.values(state.systems).forEach(sys => {
            const pos = this.worldToScreen(sys.x, sys.y);
            const isSelected = this.selectedSystem === sys.id;
            const isHovered = this.hoveredSystem === sys.id;
            const isBase = sys.id === state.liberationBase && state.baseRevealed;
            const isPlayerBase = sys.id === state.liberationBase && state.activePlayer === FACTIONS.LIBERATION;
            const isProbed = sys.probed;

            const region = REGIONS.find(r => r.id === sys.region);
            const regionColor = region ? region.color : '#888888';

            const baseRadius = 13;
            const radius = baseRadius + (isHovered ? 2 : 0) + (isSelected ? 3 : 0);

            // Outer glow for selected/hovered
            if (isSelected || isHovered) {
                const glowR = radius * 2.8;
                const glowGrad = ctx.createRadialGradient(pos.x, pos.y, radius * 0.3, pos.x, pos.y, glowR);
                const glowColor = isSelected ? '93, 173, 226' : '120, 150, 200';
                const glowAlpha = isSelected ? 0.25 : 0.12;
                glowGrad.addColorStop(0, `rgba(${glowColor}, ${glowAlpha})`);
                glowGrad.addColorStop(1, `rgba(${glowColor}, 0)`);
                ctx.fillStyle = glowGrad;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, glowR, 0, Math.PI * 2);
                ctx.fill();
            }

            // Planet sphere - 3D-like gradient
            const r = parseInt(regionColor.slice(1, 3), 16);
            const g = parseInt(regionColor.slice(3, 5), 16);
            const b = parseInt(regionColor.slice(5, 7), 16);

            // Shadow side gradient
            const planetGrad = ctx.createRadialGradient(
                pos.x - radius * 0.3, pos.y - radius * 0.3, radius * 0.1,
                pos.x + radius * 0.1, pos.y + radius * 0.1, radius
            );
            planetGrad.addColorStop(0, `rgb(${Math.min(255, r + 40)}, ${Math.min(255, g + 40)}, ${Math.min(255, b + 40)})`);
            planetGrad.addColorStop(0.6, `rgb(${Math.floor(r * 0.5)}, ${Math.floor(g * 0.5)}, ${Math.floor(b * 0.5)})`);
            planetGrad.addColorStop(1, `rgb(${Math.floor(r * 0.15)}, ${Math.floor(g * 0.15)}, ${Math.floor(b * 0.15)})`);

            ctx.fillStyle = planetGrad;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, radius - 1, 0, Math.PI * 2);
            ctx.fill();

            // Specular highlight
            const specGrad = ctx.createRadialGradient(
                pos.x - radius * 0.35, pos.y - radius * 0.35, 0,
                pos.x - radius * 0.2, pos.y - radius * 0.2, radius * 0.5
            );
            specGrad.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
            specGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = specGrad;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, radius - 1, 0, Math.PI * 2);
            ctx.fill();

            // Loyalty ring
            let ringColor;
            if (sys.loyalty === 'dominion') ringColor = '#e74c3c';
            else if (sys.loyalty === 'liberation') ringColor = '#5dade2';
            else ringColor = '#404058';

            ctx.strokeStyle = ringColor;
            ctx.lineWidth = isSelected ? 2.5 : 1.8;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, radius + 1, 0, Math.PI * 2);
            ctx.stroke();

            // Production indicator - small gear dot
            if (sys.hasProduction) {
                const pdx = pos.x + radius * 0.7;
                const pdy = pos.y - radius * 0.7;
                ctx.fillStyle = '#f1c40f';
                ctx.beginPath();
                ctx.arc(pdx, pdy, 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = 'rgba(0,0,0,0.5)';
                ctx.lineWidth = 0.5;
                ctx.stroke();
            }

            // Base marker (revealed)
            if (isBase) {
                const pulse = Math.sin(this.animFrame * 0.06) * 0.3 + 0.7;
                ctx.strokeStyle = `rgba(231, 76, 60, ${pulse})`;
                ctx.lineWidth = 2;
                ctx.setLineDash([4, 4]);
                ctx.lineDashOffset = this.animFrame * 0.3;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, radius + 8, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            // Player's hidden base indicator (subtle)
            if (isPlayerBase && !state.baseRevealed) {
                ctx.strokeStyle = 'rgba(93, 173, 226, 0.25)';
                ctx.lineWidth = 1;
                ctx.setLineDash([2, 3]);
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, radius + 6, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            // Probed marker (subtle X)
            if (isProbed && !isBase) {
                ctx.strokeStyle = 'rgba(231, 76, 60, 0.25)';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(pos.x - 5, pos.y - 5);
                ctx.lineTo(pos.x + 5, pos.y + 5);
                ctx.moveTo(pos.x + 5, pos.y - 5);
                ctx.lineTo(pos.x - 5, pos.y + 5);
                ctx.stroke();
            }

            // System name
            ctx.fillStyle = isHovered || isSelected ? '#e8e8ff' : '#7778aa';
            ctx.font = `${isSelected ? '600' : '400'} 10px "SF Pro Display", "Segoe UI", Arial, sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(sys.name, pos.x, pos.y + radius + 15);
        });
    }

    renderMapUnits(ctx) {
        const state = engine.state;

        Object.entries(state.units).forEach(([sysId, units]) => {
            const sys = state.systems[sysId];
            if (!sys) return;
            const pos = this.worldToScreen(sys.x, sys.y);

            const domSpace = units.space.filter(u => u.faction === FACTIONS.DOMINION).length;
            const libSpace = units.space.filter(u => u.faction === FACTIONS.LIBERATION).length;
            const domGround = units.ground.filter(u => u.faction === FACTIONS.DOMINION && !combatEngine.isStructure(u)).length;
            const libGround = units.ground.filter(u => u.faction === FACTIONS.LIBERATION && !combatEngine.isStructure(u)).length;

            const yOff = -22;
            if (domSpace > 0) this.drawUnitBadge(ctx, pos.x - 14, pos.y + yOff, domSpace, '#e74c3c', 'S');
            if (libSpace > 0) this.drawUnitBadge(ctx, pos.x + 14, pos.y + yOff, libSpace, '#5dade2', 'S');
            if (domGround > 0) this.drawUnitBadge(ctx, pos.x - 14, pos.y + 22, domGround, '#e74c3c', 'G');
            if (libGround > 0) this.drawUnitBadge(ctx, pos.x + 14, pos.y + 22, libGround, '#5dade2', 'G');
        });
    }

    drawUnitBadge(ctx, x, y, count, color, type) {
        // Rounded pill badge
        const w = 22;
        const h = 14;
        ctx.fillStyle = color + '25';
        ctx.strokeStyle = color + '60';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(x - w / 2, y - h / 2, w, h, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = color;
        ctx.font = 'bold 9px "SF Pro Display", "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${count}${type}`, x, y + 3);
    }

    renderMapLeaders(ctx) {
        const state = engine.state;

        ['dominion', 'liberation'].forEach(faction => {
            state.leaders[faction].forEach(leader => {
                if (!leader.location || leader.captured) return;
                const sys = state.systems[leader.location];
                if (!sys) return;
                const pos = this.worldToScreen(sys.x, sys.y);

                const factionLeaders = state.leaders[faction].filter(l => l.location === leader.location && !l.captured);
                const idx = factionLeaders.indexOf(leader);
                const angle = (idx / factionLeaders.length) * Math.PI * 2 - Math.PI / 2;
                const orbitR = 30;
                const lx = pos.x + Math.cos(angle) * orbitR;
                const ly = pos.y + Math.sin(angle) * orbitR;

                // Leader circle with border
                const leaderR = 7;
                ctx.fillStyle = leader.color;
                ctx.beginPath();
                ctx.arc(lx, ly, leaderR, 0, Math.PI * 2);
                ctx.fill();

                // Border
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
                ctx.lineWidth = 1;
                ctx.stroke();

                // Avatar letter
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 9px "SF Pro Display", "Segoe UI", Arial, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(leader.avatar, lx, ly + 3);

                // Mission indicator - golden ring
                if (leader.onMission) {
                    ctx.strokeStyle = '#f1c40f';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.arc(lx, ly, leaderR + 2, 0, Math.PI * 2);
                    ctx.stroke();
                }
            });
        });
    }

    renderMoveIndicator(ctx) {
        if (!this.selectedSystem || !this.moveTarget) return;
        const state = engine.state;
        const from = state.systems[this.selectedSystem];
        const to = state.systems[this.moveTarget];
        if (!from || !to) return;

        const fromPos = this.worldToScreen(from.x, from.y);
        const toPos = this.worldToScreen(to.x, to.y);

        // Animated dashed line
        ctx.strokeStyle = 'rgba(93, 173, 226, 0.6)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.lineDashOffset = -this.animFrame * 0.5;
        ctx.beginPath();
        ctx.moveTo(fromPos.x, fromPos.y);
        ctx.lineTo(toPos.x, toPos.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Arrow at destination
        const angle = Math.atan2(toPos.y - fromPos.y, toPos.x - fromPos.x);
        ctx.fillStyle = 'rgba(93, 173, 226, 0.8)';
        ctx.beginPath();
        ctx.moveTo(toPos.x - Math.cos(angle) * 18, toPos.y - Math.sin(angle) * 18);
        ctx.lineTo(toPos.x - Math.cos(angle - 0.4) * 26, toPos.y - Math.sin(angle - 0.4) * 26);
        ctx.lineTo(toPos.x - Math.cos(angle + 0.4) * 26, toPos.y - Math.sin(angle + 0.4) * 26);
        ctx.closePath();
        ctx.fill();
    }

    addParticle(wx, wy, color) {
        this.particles.push({
            x: wx, y: wy,
            vx: (Math.random() - 0.5) * 0.002,
            vy: (Math.random() - 0.5) * 0.002,
            life: 1,
            decay: Math.random() * 0.02 + 0.01,
            color,
            size: Math.random() * 2 + 1,
        });
    }

    updateAndRenderParticles(ctx) {
        this.particles = this.particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.life -= p.decay;
            if (p.life <= 0) return false;

            const pos = this.worldToScreen(p.x, p.y);
            const alpha = Math.floor(p.life * 255);
            ctx.fillStyle = p.color + alpha.toString(16).padStart(2, '0');
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, p.size * p.life, 0, Math.PI * 2);
            ctx.fill();
            return true;
        });
    }

    startRendering() {
        if (this.animationId) cancelAnimationFrame(this.animationId);
        this.render();
    }

    stopRendering() {
        if (this.animationId) cancelAnimationFrame(this.animationId);
    }
}

// Title screen star renderer
class TitleStarRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.stars = [];
        this.animId = null;

        const colors = [
            { r: 200, g: 210, b: 255 },
            { r: 255, g: 240, b: 220 },
            { r: 180, g: 200, b: 255 },
            { r: 255, g: 220, b: 180 },
        ];

        for (let i = 0; i < 350; i++) {
            this.stars.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                size: Math.random() * 1.5 + 0.2,
                speed: Math.random() * 0.3 + 0.05,
                brightness: Math.random() * 0.6 + 0.2,
                color: colors[Math.floor(Math.random() * colors.length)],
            });
        }

        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.animate();
    }

    resize() {
        this.canvas.width = window.innerWidth * window.devicePixelRatio;
        this.canvas.height = window.innerHeight * window.devicePixelRatio;
        this.canvas.style.width = window.innerWidth + 'px';
        this.canvas.style.height = window.innerHeight + 'px';
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    animate() {
        const ctx = this.ctx;
        const w = window.innerWidth;
        const h = window.innerHeight;

        ctx.clearRect(0, 0, w, h);

        this.stars.forEach(s => {
            s.y += s.speed;
            if (s.y > h) { s.y = 0; s.x = Math.random() * w; }

            const c = s.color;
            ctx.fillStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${s.brightness})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        });

        this.animId = requestAnimationFrame(() => this.animate());
    }

    stop() {
        if (this.animId) cancelAnimationFrame(this.animId);
    }
}
