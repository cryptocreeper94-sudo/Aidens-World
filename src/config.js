/* ========================================
   GAME CONFIG — Phaser 3 initialization
   ======================================== */

// Detect mobile vs desktop for optimal game resolution
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
const gameWidth = isMobile ? 667 : 800;  // iPhone SE landscape width
const gameHeight = isMobile ? 375 : 500; // iPhone SE landscape height

const gameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  transparent: false,
  backgroundColor: '#000000',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: '100%',
    height: '100%',
  },
  scene: [BootScene, HubScene, StoryScene, LevelScene],
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  input: {
    activePointers: 3, // Support multi-touch
    touch: {
      capture: true,
    },
  },
  render: {
    pixelArt: false,
    antialias: true,
    roundPixels: true,
  },
  fps: {
    target: 60,
    forceSetTimeOut: false,
  },
  banner: false, // Hide Phaser banner in console
};

let game = null;

window.launchRiftRunner = function() {
  if (game) {
    // If already running, force a resize refresh
    game.scale.resize(window.innerWidth, window.innerHeight);
    return;
  }
  
  // Hide the portal DOM elements
  const portal = document.getElementById('aiden-portal');
  if (portal) portal.style.display = 'none';

  // Show the game container
  const gameContainer = document.getElementById('game-container');
  if (gameContainer) gameContainer.style.display = 'block';

  // Native Phaser scaling to dynamically fill fixed DOM container
  gameConfig.scale.width = '100%';
  gameConfig.scale.height = '100%';
  
  game = new Phaser.Game(gameConfig);
};

// ── RIFT INVADERS LAUNCHER ──
window.launchRiftInvaders = function() {
  if (window.riftInvadersGame) {
    window.riftInvadersGame.destroy(true);
    window.riftInvadersGame = null;
  }

  const portal = document.getElementById('aiden-portal');
  if (portal) portal.style.display = 'none';

  const container = document.getElementById('game-container-invaders');
  if (container) {
    container.style.display = 'block';
    container.innerHTML = ''; // Clear any previous game
  }

  window.riftInvadersGame = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game-container-invaders',
    transparent: false,
    backgroundColor: '#000011',
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: '100%',
      height: '100%',
    },
    scene: [BootScene, RiftInvadersScene],
    physics: {
      default: 'arcade',
      arcade: { gravity: { y: 0 }, debug: false },
    },
    input: { activePointers: 2, touch: { capture: true } },
    render: { pixelArt: false, antialias: true, roundPixels: true },
    banner: false,
    callbacks: {
      postBoot: function(game) {
        game.scene.start('RiftInvadersScene');
      }
    }
  });
};

// ── CHRONO MATCH LAUNCHER ──
window.launchChronoMatch = function(difficulty) {
  if (window.chronoMatchGame) {
    window.chronoMatchGame.destroy(true);
    window.chronoMatchGame = null;
  }

  const portal = document.getElementById('aiden-portal');
  if (portal) portal.style.display = 'none';

  const container = document.getElementById('game-container-match');
  if (container) {
    container.style.display = 'block';
    container.innerHTML = '';
  }

  window.chronoMatchGame = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game-container-match',
    transparent: false,
    backgroundColor: '#0a0a2e',
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: '100%',
      height: '100%',
    },
    scene: [BootScene, ChronoMatchScene],
    physics: {
      default: 'arcade',
      arcade: { gravity: { y: 0 }, debug: false },
    },
    input: { activePointers: 2, touch: { capture: true } },
    render: { pixelArt: false, antialias: true, roundPixels: true },
    banner: false,
    callbacks: {
      postBoot: function(game) {
        // After BootScene loads assets, start ChronoMatch
        game.scene.start('ChronoMatchScene', { difficulty: difficulty || 'easy' });
      }
    }
  });
};

  // Prevent right-click context menu
  document.addEventListener('contextmenu', (e) => e.preventDefault());
