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

  // Inject exact physical dimensions to bypass CSS reflow delays
  gameConfig.scale.width = '100%';
  gameConfig.scale.height = '100%';
  
  game = new Phaser.Game(gameConfig);

  // Debounced refresh to fix Android 0-dimension rotation bugs
  window.addEventListener('resize', () => {
    setTimeout(() => {
      if (game && game.scale && !game.scale.isFullScreen) {
        game.scale.refresh();
      }
    }, 500);
  });
};

  // Handle orientation changes
  window.addEventListener('resize', () => {
    if (game && game.scale) game.scale.refresh();
  });

  // Prevent right-click context menu
  document.addEventListener('contextmenu', (e) => e.preventDefault());
};
