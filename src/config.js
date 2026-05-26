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
  transparent: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720,
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
  if (game) return; // Already running
  
  // Hide the portal DOM elements
  const portal = document.getElementById('aiden-portal');
  if (portal) portal.style.display = 'none';

  // Show the game container
  const gameContainer = document.getElementById('game-container');
  if (gameContainer) gameContainer.style.display = 'flex';

  game = new Phaser.Game(gameConfig);

  // Handle orientation changes
  window.addEventListener('resize', () => {
    if (game && game.scale) game.scale.refresh();
  });

  // Prevent right-click context menu
  document.addEventListener('contextmenu', (e) => e.preventDefault());
};
