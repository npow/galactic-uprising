// ============================================================
// GALACTIC UPRISING - Galaxy Map Renderer
// Canvas-based rendering of the galaxy map with all visual elements
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

        this.initStars();
        this.initNebulae();
        this.setupResize();
    }

    initStars() {
        for (let i = 0; i < 400; i++) {
            this.stars.push({
                x: Math.random(),
                y: Math.random(),
                size: Math.random() * 1.5 + 0.3,
                brightness: Math.random() * 0.7 + 0.3,
                twinkleSpeed: Math.random() * 0.02 + 0.005,
                twinkleOffset: Math.random() * Math.PI * 2,
            });
        }
    }

    initNebulae() {
        for (let i = 0; i < 6; i++) {
            this.nebulae.push({
                x: Math.random(),
                y: Math.random(),
                radius: Math.random() * 0.15 + 0.08,
                color: ['#1a0a2a', '#0a1a2a', '#2a0a1a', '#0a2a1a', '#1a1a2a', '#2a1a0a'][i],
                opacity: Math.random() * 0.3 + 0.1,
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

        // Background gradient
        const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.7);
        bgGrad.addColorStop(0, '#0d0d28');
        bgGrad.addColorStop(0.5, '#080820');
        bgGrad.addColorStop(1, '#040410');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        // Nebulae
        this.renderNebulae(ctx);

        // Stars
        this.renderStars(ctx);

        // Region labels
        this.renderRegionLabels(ctx);

        // Connections
        this.renderConnections(ctx);

        // Systems
        this.renderSystems(ctx);

        // Units on map
        this.renderMapUnits(ctx);

        // Leaders on map
        this.renderMapLeaders(ctx);

        // Move indicators
        if (this.moveTarget) {
            this.renderMoveIndicator(ctx);
        }

        // Particles
        this.updateAndRenderParticles(ctx);

        this.animationId = requestAnimationFrame(() => this.render());
    }

    renderRegionLabels(ctx) {
        const state = engine.state;
        // Compute region center from system positions
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

            ctx.fillStyle = region.color + '30';
            ctx.font = 'bold 11px "Segoe UI", Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(region.name.toUpperCase(), pos.x, pos.y);
        });
    }

    renderNebulae(ctx) {
        this.nebulae.forEach(n => {
            const pos = this.worldToScreen(n.x, n.y);
            const r = n.radius * this.width * this.camera.zoom;
            const grad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, r);
            grad.addColorStop(0, n.color + Math.floor(n.opacity * 255).toString(16).padStart(2, '0'));
            grad.addColorStop(1, n.color + '00');
            ctx.fillStyle = grad;
            ctx.fillRect(pos.x - r, pos.y - r, r * 2, r * 2);
        });
    }

    renderStars(ctx) {
        this.stars.forEach(s => {
            const twinkle = Math.sin(this.animFrame * s.twinkleSpeed + s.twinkleOffset) * 0.3 + 0.7;
            const alpha = s.brightness * twinkle;
            const pos = this.worldToScreen(s.x, s.y);
            ctx.fillStyle = `rgba(200, 210, 255, ${alpha})`;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, s.size, 0, Math.PI * 2);
            ctx.fill();
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

                ctx.strokeStyle = 'rgba(60, 60, 120, 0.3)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(from.x, from.y);
                ctx.lineTo(to.x, to.y);
                ctx.stroke();
            });
        });
    }

    renderSystems(ctx) {
        const state = engine.state;

        Object.values(state.systems).forEach(sys => {
            const pos = this.worldToScreen(sys.x, sys.y);
            const isSelected = this.selectedSystem === sys.id;
            const isHovered = this.hoveredSystem === sys.id;
            const isBase = sys.id === state.liberationBase && state.baseRevealed;
            const isProbed = sys.probed;

            // Region color
            const region = REGIONS.find(r => r.id === sys.region);
            const regionColor = region ? region.color : '#888';

            // System circle
            const baseRadius = 14;
            const radius = baseRadius + (isHovered ? 3 : 0) + (isSelected ? 4 : 0);

            // Glow
            if (isSelected || isHovered) {
                const glowGrad = ctx.createRadialGradient(pos.x, pos.y, radius * 0.5, pos.x, pos.y, radius * 2.5);
                glowGrad.addColorStop(0, (isSelected ? 'rgba(100, 160, 255, 0.3)' : 'rgba(100, 160, 255, 0.15)'));
                glowGrad.addColorStop(1, 'rgba(100, 160, 255, 0)');
                ctx.fillStyle = glowGrad;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, radius * 2.5, 0, Math.PI * 2);
                ctx.fill();
            }

            // Loyalty outline
            let outlineColor = '#444';
            if (sys.loyalty === 'dominion') outlineColor = '#c44';
            else if (sys.loyalty === 'liberation') outlineColor = '#4ac';

            // Outer ring
            ctx.strokeStyle = outlineColor;
            ctx.lineWidth = isSelected ? 3 : 2;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
            ctx.stroke();

            // Fill
            const fillGrad = ctx.createRadialGradient(pos.x - 3, pos.y - 3, 0, pos.x, pos.y, radius);
            fillGrad.addColorStop(0, this.adjustBrightness(regionColor, 0.6));
            fillGrad.addColorStop(1, this.adjustBrightness(regionColor, 0.2));
            ctx.fillStyle = fillGrad;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, radius - 1, 0, Math.PI * 2);
            ctx.fill();

            // Production indicator
            if (sys.hasProduction) {
                ctx.fillStyle = '#ffa';
                ctx.beginPath();
                ctx.arc(pos.x + radius - 2, pos.y - radius + 2, 4, 0, Math.PI * 2);
                ctx.fill();
            }

            // Base marker
            if (isBase) {
                ctx.strokeStyle = '#f44';
                ctx.lineWidth = 2;
                ctx.setLineDash([3, 3]);
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, radius + 6, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            // Probed marker (X)
            if (isProbed && !isBase) {
                ctx.strokeStyle = 'rgba(255, 100, 100, 0.4)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(pos.x - 6, pos.y - 6);
                ctx.lineTo(pos.x + 6, pos.y + 6);
                ctx.moveTo(pos.x + 6, pos.y - 6);
                ctx.lineTo(pos.x - 6, pos.y + 6);
                ctx.stroke();
            }

            // System name
            ctx.fillStyle = isHovered || isSelected ? '#fff' : '#aab';
            ctx.font = '10px "Segoe UI", Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(sys.name, pos.x, pos.y + radius + 14);
        });
    }

    renderMapUnits(ctx) {
        const state = engine.state;

        Object.entries(state.units).forEach(([sysId, units]) => {
            const sys = state.systems[sysId];
            if (!sys) return;
            const pos = this.worldToScreen(sys.x, sys.y);

            // Count units per faction
            const domSpace = units.space.filter(u => u.faction === FACTIONS.DOMINION).length;
            const libSpace = units.space.filter(u => u.faction === FACTIONS.LIBERATION).length;
            const domGround = units.ground.filter(u => u.faction === FACTIONS.DOMINION && !combatEngine.isStructure(u)).length;
            const libGround = units.ground.filter(u => u.faction === FACTIONS.LIBERATION && !combatEngine.isStructure(u)).length;

            // Draw unit indicators around system
            const yOff = -24;
            if (domSpace > 0) {
                this.drawUnitBadge(ctx, pos.x - 12, pos.y + yOff, domSpace, '#c44', '◈');
            }
            if (libSpace > 0) {
                this.drawUnitBadge(ctx, pos.x + 12, pos.y + yOff, libSpace, '#4ac', '◈');
            }
            if (domGround > 0) {
                this.drawUnitBadge(ctx, pos.x - 12, pos.y + 24, domGround, '#c44', '⬢');
            }
            if (libGround > 0) {
                this.drawUnitBadge(ctx, pos.x + 12, pos.y + 24, libGround, '#4ac', '⬢');
            }
        });
    }

    drawUnitBadge(ctx, x, y, count, color, icon) {
        ctx.fillStyle = color + '40';
        ctx.strokeStyle = color + '80';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(x - 10, y - 7, 20, 14, 3);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = color;
        ctx.font = '9px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${icon}${count}`, x, y + 3);
    }

    renderMapLeaders(ctx) {
        const state = engine.state;

        ['dominion', 'liberation'].forEach(faction => {
            state.leaders[faction].forEach(leader => {
                if (!leader.location || leader.captured) return;
                const sys = state.systems[leader.location];
                if (!sys) return;
                const pos = this.worldToScreen(sys.x, sys.y);

                // Offset leaders so they don't overlap
                const factionLeaders = state.leaders[faction].filter(l => l.location === leader.location && !l.captured);
                const idx = factionLeaders.indexOf(leader);
                const angle = (idx / factionLeaders.length) * Math.PI * 2 - Math.PI / 2;
                const orbitR = 28;
                const lx = pos.x + Math.cos(angle) * orbitR;
                const ly = pos.y + Math.sin(angle) * orbitR;

                // Leader pip
                ctx.fillStyle = leader.color;
                ctx.beginPath();
                ctx.arc(lx, ly, 6, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#fff';
                ctx.font = 'bold 8px "Segoe UI", Arial, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(leader.avatar, lx, ly + 3);

                // Mission indicator
                if (leader.onMission) {
                    ctx.strokeStyle = '#ff0';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.arc(lx, ly, 8, 0, Math.PI * 2);
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
        ctx.strokeStyle = '#7af';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        ctx.lineDashOffset = -this.animFrame * 0.5;
        ctx.beginPath();
        ctx.moveTo(fromPos.x, fromPos.y);
        ctx.lineTo(toPos.x, toPos.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Arrow at destination
        const angle = Math.atan2(toPos.y - fromPos.y, toPos.x - fromPos.x);
        ctx.fillStyle = '#7af';
        ctx.beginPath();
        ctx.moveTo(toPos.x - Math.cos(angle) * 20, toPos.y - Math.sin(angle) * 20);
        ctx.lineTo(toPos.x - Math.cos(angle - 0.4) * 28, toPos.y - Math.sin(angle - 0.4) * 28);
        ctx.lineTo(toPos.x - Math.cos(angle + 0.4) * 28, toPos.y - Math.sin(angle + 0.4) * 28);
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
            ctx.fillStyle = p.color + Math.floor(p.life * 255).toString(16).padStart(2, '0');
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, p.size * p.life, 0, Math.PI * 2);
            ctx.fill();
            return true;
        });
    }

    adjustBrightness(hex, factor) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgb(${Math.floor(r * factor)}, ${Math.floor(g * factor)}, ${Math.floor(b * factor)})`;
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

        for (let i = 0; i < 300; i++) {
            this.stars.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                size: Math.random() * 2,
                speed: Math.random() * 0.5 + 0.1,
                brightness: Math.random(),
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

            ctx.fillStyle = `rgba(180, 200, 255, ${s.brightness})`;
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
