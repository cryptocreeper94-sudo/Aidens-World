/* ========================================
   BOOT SCENE — Asset preloader
   ======================================== */

class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    const { width, height } = this.cameras.main;

    // Splash background
    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a1a);

    // Loading bar
    const barBg = this.add.rectangle(width / 2, height / 2 + 50, 320, 22, 0x111122);
    barBg.setStrokeStyle(2, 0xe63946, 0.5);
    const bar = this.add.rectangle(width / 2 - 157, height / 2 + 50, 4, 18, 0xe63946);
    bar.setOrigin(0, 0.5);

    // Title
    this.add.text(width / 2, height / 2 - 80, '🕷️⚔️', { fontSize: '72px' }).setOrigin(0.5);
    this.add.text(width / 2, height / 2 - 20, `${HERO_NAME}'s Hero HQ`, {
      fontFamily: 'Arial Black, Arial',
      fontSize: '30px',
      color: '#e63946',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 15, 'Spider-Man × Star Wars', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#22d3ee',
    }).setOrigin(0.5);

    const loadingText = this.add.text(width / 2, height / 2 + 80, 'Loading...', {
      fontFamily: 'Arial',
      fontSize: '13px',
      color: '#888888',
    }).setOrigin(0.5);

    // Progress
    this.load.on('progress', (val) => {
      bar.width = 314 * val;
      loadingText.setText(`Loading... ${Math.round(val * 100)}%`);
    });

    // ── CHARACTERS ──
    this.load.image('hero_red', 'assets/characters/hero_red.png');
    this.load.image('hero_black', 'assets/characters/hero_black.png');
    this.load.image('jedi_kid', 'assets/characters/jedi_kid.png');

    // ── BACKGROUNDS (all worlds) ──
    this.load.image('hub_bg', 'assets/backgrounds/hub_bg.png');
    this.load.image('nyc_skyline', 'assets/backgrounds/nyc_skyline.png');
    this.load.image('space_station', 'assets/backgrounds/space_station.png');
    this.load.image('desert', 'assets/backgrounds/desert.png');
    this.load.image('rift', 'assets/backgrounds/rift.png');

    // ── ENEMIES ──
    this.load.image('enemy_thug', 'assets/enemies/thug.png');
    this.load.image('enemy_trooper', 'assets/enemies/trooper.png');

    // ── UI ──
    this.load.image('hud_elements', 'assets/ui/hud_elements.png');
    this.load.image('splash', 'assets/ui/splash.png');

    // ── STORY ──
    this.load.image('intro_panel', 'assets/story/intro_panel.png');
    this.load.image('world1_complete_panel', 'assets/story/world1_complete.png');
    this.load.image('world2_intro_panel', 'assets/story/world2_intro.png');
    this.load.image('world3_intro_panel', 'assets/story/world3_intro.png');
    this.load.image('world4_intro_panel', 'assets/story/world4_intro.png');
    this.load.image('victory_panel', 'assets/story/victory.png');
  }

  create() {
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.time.delayedCall(700, () => {
      this.scene.start('HubScene');
    });
  }
}
