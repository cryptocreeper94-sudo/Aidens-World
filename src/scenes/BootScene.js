/* ========================================
   BOOT SCENE — Asset preloader
   ======================================== */

class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    const { width, height } = this.cameras.main;

    // Background for loading screen
    // Background handled by resize ref

    // Sleek Loading Bar
    const barWidth = 300;
    const barBg = this.add.rectangle(width / 2, height / 2, barWidth + 6, 20, 0x15162a);
    barBg.setStrokeStyle(2, 0x22d3ee, 0.5);
    const bar = this.add.rectangle(width / 2 - barWidth/2, height / 2, 0, 14, 0x22d3ee);
    bar.setOrigin(0, 0.5);

    const loadingText = this.add.text(width / 2, height / 2 - 30, 'LOADING MULTIVERSE...', {
      fontFamily: 'Arial Black',
      fontSize: '14px',
      color: '#22d3ee',
      letterSpacing: 2
    }).setOrigin(0.5);

    // Progress
    this.load.on('progress', (val) => {
      bar.width = barWidth * val;
      loadingText.setText(`LOADING... ${Math.round(val * 100)}%`);
    });

    this.scale.on('resize', this.resize, this);
    
    // Save refs for resize
    this.bgRect = this.add.rectangle(width / 2, height / 2, width, height, 0x0f1020).setDepth(-1);
    this.barBg = barBg;
    this.bar = bar;
    this.loadingText = loadingText;

    // ── CHARACTERS ──
    this.load.image('spider_hero', 'assets/spider_hero.png?v=' + Date.now());
    this.load.image('bounty_hunter', 'assets/bounty_hunter.png?v=' + Date.now());
    this.load.image('hero_black', 'assets/characters/hero_black.png');
    this.load.image('jedi_kid', 'assets/characters/jedi_kid.png');
    this.load.image('iron_kid', 'assets/characters/iron_kid.png');
    this.load.image('telekinetic_girl', 'assets/characters/telekinetic_girl.png?v=cropped6');
    this.load.image('alien_brute', 'assets/characters/alien_brute.png');
    this.load.image('super_girl', 'assets/characters/supergirl.png?v=greeneyes');
    this.load.image('superboy', 'assets/characters/superboy.png');
    this.load.image('cyborg_girl', 'assets/characters/cyborg_girl.png');

    // ── BACKGROUNDS (all worlds) ──
    this.load.image('hub_bg', 'assets/backgrounds/hub_bg.png');
    this.load.image('nyc_skyline', 'assets/backgrounds/nyc_skyline.png');
    this.load.image('nyc_skyline_sunset', 'assets/backgrounds/nyc_skyline_sunset.png');
    this.load.image('nyc_skyline_night', 'assets/backgrounds/nyc_skyline_night.png');
    this.load.image('space_station', 'assets/backgrounds/space_station.png');
    this.load.image('desert', 'assets/backgrounds/desert.png');
    this.load.image('desert_sunset', 'assets/backgrounds/desert_sunset.png');
    this.load.image('desert_night', 'assets/backgrounds/desert_night.png');
    this.load.image('rift', 'assets/backgrounds/rift.png');
    this.load.image('rift_blue', 'assets/backgrounds/rift_blue.png');
    this.load.image('portal_bg_split_3way', 'assets/ui/portal_bg_split_3way.png');

    // ── NEW BACKGROUNDS (NYC) ──
    this.load.image('nyc_times_square', 'assets/backgrounds/nyc_times_square.png');
    this.load.image('nyc_central_park', 'assets/backgrounds/nyc_central_park.png');
    this.load.image('nyc_brooklyn_bridge', 'assets/backgrounds/nyc_brooklyn_bridge.png');
    this.load.image('nyc_subway', 'assets/backgrounds/nyc_subway.png');
    this.load.image('nyc_flatiron', 'assets/backgrounds/nyc_flatiron.png');
    this.load.image('nyc_chinatown', 'assets/backgrounds/nyc_chinatown.png');
    this.load.image('nyc_oscorp', 'assets/backgrounds/nyc_oscorp.png');
    // ── NEW BACKGROUNDS (Space Station) ──
    this.load.image('space_docking_bay', 'assets/backgrounds/space_docking_bay.png');
    this.load.image('space_reactor', 'assets/backgrounds/space_reactor.png');
    this.load.image('space_shield_gen', 'assets/backgrounds/space_shield_gen.png');
    this.load.image('space_hangar', 'assets/backgrounds/space_hangar.png');
    this.load.image('space_compactor', 'assets/backgrounds/space_compactor.png');
    this.load.image('space_turbolaser', 'assets/backgrounds/space_turbolaser.png');
    this.load.image('space_symbiote_lab', 'assets/backgrounds/space_symbiote_lab.png');
    this.load.image('space_bridge', 'assets/backgrounds/space_bridge.png');
    this.load.image('space_throne', 'assets/backgrounds/space_throne.png');
    // ── NEW BACKGROUNDS (Tatooine) ──
    this.load.image('tatooine_wastes', 'assets/backgrounds/tatooine_wastes.png');
    this.load.image('tatooine_farm', 'assets/backgrounds/tatooine_farm.png');
    this.load.image('tatooine_canyon', 'assets/backgrounds/tatooine_canyon.png');
    this.load.image('tatooine_jabba', 'assets/backgrounds/tatooine_jabba.png');
    this.load.image('tatooine_podrace', 'assets/backgrounds/tatooine_podrace.png');
    this.load.image('tatooine_temple', 'assets/backgrounds/tatooine_temple.png');
    this.load.image('tatooine_arena', 'assets/backgrounds/tatooine_arena.png');

    // ── ENEMIES ──
    this.load.image('enemy_thug', 'assets/enemies/thug.png?v=' + Date.now());
    this.load.image('enemy_trooper', 'assets/enemies/trooper.png?v=' + Date.now());

    // ── ENVIRONMENTS ──
    this.load.image('sci_fi_tower', 'assets/environments/sci_fi_tower.png');
    this.load.image('rift_portal', 'assets/environments/rift_portal.png');

    // ── UI ──
    this.load.image('hud_elements', 'assets/ui/hud_elements.png');
    this.load.image('splash', 'assets/ui/splash.png');

    // ── STORY ──
    this.load.image('intro_panel', 'assets/story/intro_panel.png');
    this.load.image('intro_1', 'assets/story/intro_1.png');
    this.load.image('intro_2', 'assets/story/intro_2.png');
    this.load.image('intro_3', 'assets/story/intro_3.png');
    this.load.image('intro_4', 'assets/story/intro_4.png');
    this.load.image('intro_5', 'assets/story/intro_5.png');
    this.load.image('world1_complete_panel', 'assets/story/world1_complete.png');
    this.load.image('world2_intro_panel', 'assets/story/world2_intro.png');
    this.load.image('world3_intro_panel', 'assets/story/world3_intro.png');
    this.load.image('world4_intro_panel', 'assets/story/world4_intro.png');
    this.load.image('victory_panel', 'assets/story/victory.png');

    // ── STORY AUDIO ──
    if (typeof STORY_PANELS !== 'undefined') {
      for (const [storyId, story] of Object.entries(STORY_PANELS)) {
        for (let i = 0; i < story.panels.length; i++) {
          this.load.audio(`voice_${storyId}_${i}`, `assets/audio/story_${storyId}_${i}.mp3`);
        }
      }
    }
  }

  create() {
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.time.delayedCall(400, () => {
      if (window.PhaserStartLevel) {
         const lvl = window.PhaserStartLevel;
         const save = SaveSystem.load();
         
         // Check if a world intro story should play based on level number
         const levelInfo = typeof getLevelInfo === 'function' ? getLevelInfo(lvl) : null;
         let targetScene = 'LevelScene';
         let sceneData = { levelNum: lvl };
         
         if (levelInfo && levelInfo.indexInWorld === 0 && levelInfo.world.storyIntro) {
           const storyId = levelInfo.world.storyIntro;
           if (!save.storySeen[storyId] && typeof STORY_PANELS !== 'undefined' && STORY_PANELS[storyId]) {
             targetScene = 'StoryScene';
             sceneData.storyId = storyId;
           }
         }
         
         this.scene.start(targetScene, sceneData);
      } else if (window.PhaserMiniGame) {
         // Mini-game mode (Rift Invaders, Chrono Match, etc.)
         const miniScene = window.PhaserMiniGame;
         window.PhaserMiniGame = null; // Clear the flag
         this.scene.start(miniScene);
      } else if (this.scene.manager.keys.HubScene) {
         this.scene.start('HubScene');
      }
      // If neither exists, game stays on BootScene (shouldn't happen)
    });
  }

  resize(gameSize) {
    const { width, height } = gameSize;
    if (this.bgRect) {
      this.bgRect.setPosition(width/2, height/2);
      this.bgRect.setSize(width, height);
    }
    if (this.barBg) this.barBg.setPosition(width/2, height/2);
    if (this.bar) this.bar.setPosition(width/2 - 150, height/2);
    if (this.loadingText) this.loadingText.setPosition(width/2, height/2 - 30);
  }
}
