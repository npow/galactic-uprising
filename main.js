// ============================================================
// GALACTIC UPRISING - Main Entry Point
// Ties everything together: init, game loop, event binding
// ============================================================

let galaxyRenderer = null;
let titleRenderer = null;
let aiPlayer = null;
let gameStarted = false;

// Initialize title screen
document.addEventListener('DOMContentLoaded', () => {
    titleRenderer = new TitleStarRenderer(document.getElementById('title-stars'));
});

function startGame() {
    // Hide title
    document.getElementById('title-screen').classList.add('hidden');
    document.getElementById('game-container').style.display = 'flex';

    if (titleRenderer) titleRenderer.stop();

    // Initialize game engine
    engine.initGame();

    // Initialize renderer
    galaxyRenderer = new GalaxyRenderer(document.getElementById('galaxy-canvas'));
    galaxyRenderer.startRendering();

    // Initialize UI
    ui.init(galaxyRenderer);

    // Initialize AI (Dominion is AI-controlled by default)
    aiPlayer = new AIPlayer(FACTIONS.DOMINION);

    gameStarted = true;

    // Start the game loop
    gameLoop();
}

async function gameLoop() {
    if (!gameStarted || engine.state.gameOver) return;

    const state = engine.state;

    // If it's the AI's turn, let it act
    if (state.activePlayer === aiPlayer.faction && !state.activeCombat) {
        await aiPlayer.takeTurn();
    }

    // Continue loop
    setTimeout(gameLoop, 500);
}

// Expose for debugging
window.advanceTime = function (ms) {
    // Deterministic step hook per the skill guidelines
    if (engine.state && !engine.state.gameOver) {
        if (engine.state.phase === 'assignment') {
            engine.passAssignment();
        } else if (engine.state.phase === 'command') {
            engine.passCommand();
        }
        ui.updateAll();
    }
};

window.render_game_to_text = function () {
    const s = engine.state;
    if (!s) return JSON.stringify({ status: 'not_started' });
    return JSON.stringify({
        turn: s.turn,
        phase: s.phase,
        activePlayer: s.activePlayer,
        timeMarker: s.timeMarker,
        reputationMarker: s.reputationMarker,
        gameOver: s.gameOver,
        winner: s.winner,
        systems: Object.keys(s.systems).length,
        dominionUnits: engine.getTotalUnits(FACTIONS.DOMINION),
        liberationUnits: engine.getTotalUnits(FACTIONS.LIBERATION),
        probeDeckSize: s.probeDeck.length,
        baseRevealed: s.baseRevealed,
        objectives: s.currentObjectives.map(o => o.name),
        completedObjectives: s.completedObjectives.map(o => o.name),
    });
};
