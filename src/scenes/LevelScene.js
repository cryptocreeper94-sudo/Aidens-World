/* ========================================
   LEVEL SCENE — Geometry Dash Mechanics
   ======================================== */

class LevelScene extends Phaser.Scene {
  constructor() {
    super('LevelScene');
  }

  init(data) {
    this.levelNum = data.levelNum || 1;
    this.config = LevelData.generateConfig(this.levelNum);
    try { this.activeHero = window.localStore.getItem('ChronoverseActiveHero') || 'spider_hero'; } catch(e) { this.activeHero = 'spider_hero'; }
  }

  create() {
    const { width, height } = this.cameras.main;
    this.gameH = height - 60; // Define game area height to exclude the 60px UI footer

    // High-gravity Arcade physics for snappy GD feel
    this.physics.world.gravity.y = 4000; 
    this.input.once('pointerdown', () => SoundFX.init());

    this.isAlive = true;
    this.isRunning = false;
    this.gameSpeed = this.config.gameSpeed;
    // Apply difficulty multiplier
    var diffMultiplier = { easy: 0.75, normal: 1.0, hard: 1.4 };
    var diff = window.CHRONOVERSE_DIFFICULTY || 'normal';
    this.gameSpeed = Math.round(this.gameSpeed * (diffMultiplier[diff] || 1.0));
    this.distanceTraveled = 0;
    this.shardsCollected = 0;
    this.jumpCount = 0;
    this.riftShardCounter = 0; // Tracks shards toward next portal (resets on portal hit)
    this.portalShardsNeeded = 20; // Shards needed to summon a rift portal
    this.hasActiveRiftPortal = false; // Is there a rift portal on screen right now?
    this.echoesCollected = 0; // Echoes collected THIS level
    this.riftPowerUsed = false; // Has the rift power been used this level?
    
    let initialSave = SaveSystem.load();
    this.baseShards = initialSave.totalShards || initialSave.shards || 0;
    this.baseEchoes = initialSave.totalEchoes || 0;
    this.overdriveMeter = initialSave.overdriveMeter || 0;
    this.isOverdrive = false;
    this.selectedRiftPower = initialSave.selectedRiftPower || null;
    // Strong seed mixing — every level gets a truly unique pattern
    this.seed = ((this.levelNum * 2654435761) ^ (this.levelNum * 40503)) >>> 0;
    // Warm up the RNG so close seeds diverge fully
    for (let i = 0; i < 20; i++) this.seededRandom(1);

    // Worlds Collide Background — use per-level bg from WORLDS data
    this.activeWorld = this.config.worlds[this.config.startWorldIndex];
    const levelInfo = typeof getLevelInfo === 'function' ? getLevelInfo(this.levelNum) : null;
    const levelBg = (levelInfo && levelInfo.level && levelInfo.level.bg) ? levelInfo.level.bg : this.activeWorld.bg;
    this.cameras.main.setBackgroundColor('#000000');
    this.cameras.main.fadeIn(300);
    
    // Background — force exact screen dimensions, no scale math
    const bgKey = this.textures.exists(levelBg) ? levelBg : this.activeWorld.bg;
    this.bg = this.add.image(0, 0, bgKey);
    this.bg.setOrigin(0, 0);
    this.bg.setDisplaySize(width, height); // Fill ENTIRE canvas including footer area
    this.bg.setDepth(-1);
    this.bg.setScrollFactor(0);
    this.bg.setTint(0x999999); // Dim the background to pop the foreground characters

    // Player (Add fallback if localStorage has stale invalid key)
    if (!this.textures.exists(this.activeHero)) {
      this.activeHero = 'spider_hero';
      localStorage.setItem('ChronoverseActiveHero', 'spider_hero');
    }
    
    this.player = this.physics.add.sprite(250, this.gameH / 2, this.activeHero);
    
    // If the player is using an enemy character that natively faces left, flip them to face right.
    if (['enemy_thug', 'enemy_trooper'].includes(this.activeHero)) {
      this.player.setFlipX(true);
    }
    this.player.setDisplaySize(80, 80);
    this.player.setBounce(0);
    this.player.setDepth(10);

    // ── Ghost Player (Race Mode Opponent) ──
    this.ghostPlayer = null;
    this.raceMode = false;
    this.raceStartTime = 0;
    if (window.MultiplayerSystem && window.MultiplayerSystem._matchRef) {
      this.raceMode = true;
      this.raceStartTime = Date.now();
      // Create ghost sprite (translucent opponent)
      this.ghostPlayer = this.add.sprite(250, this.gameH / 2, 'spider_hero');
      this.ghostPlayer.setDisplaySize(80, 80);
      this.ghostPlayer.setAlpha(0.35);
      this.ghostPlayer.setTint(0x22d3ee);
      this.ghostPlayer.setDepth(9);
      // Ghost name label
      const oppName = window.MultiplayerSystem._opponent || 'Opponent';
      this.ghostLabel = this.add.text(250, this.gameH / 2 - 50, oppName, {
        fontFamily: 'Arial', fontSize: '10px', color: '#22d3ee', fontStyle: 'bold',
      }).setOrigin(0.5).setAlpha(0.6).setDepth(9);
      // Listen for opponent position updates
      window.MultiplayerSystem.listenForOpponent(oppName, (data) => {
        if (this.ghostPlayer && data) {
          this.ghostPlayer.setPosition(data.x || 250, data.y || this.gameH / 2);
          if (this.ghostLabel) this.ghostLabel.setPosition(data.x || 250, (data.y || this.gameH / 2) - 50);
        }
      });
    }

    // Groups
    this.blocks = this.physics.add.group({ immovable: true, allowGravity: false });
    this.spikes = this.physics.add.group({ immovable: true, allowGravity: false });
    this.portals = this.physics.add.group({ immovable: true, allowGravity: false });
    this.shards = this.physics.add.group({ immovable: true, allowGravity: false });
    this.echoes = this.physics.add.group({ immovable: true, allowGravity: false });

    this.projectiles = this.physics.add.group({ allowGravity: false });

    // Generate procedural level
    this.buildLevel();

    // Floor — top edge sits exactly at gameH (footer boundary)
    this.floor = this.add.rectangle(width/2, this.gameH + 500, width*100, 1000, 0x000000, 0).setDepth(10);
    this.physics.add.existing(this.floor, true);

    // Absolute Death Wall to prevent clipping through towers when crushed
    this.deathWall = this.add.rectangle(-10, this.gameH/2, 20, this.gameH, 0xff0000, 0);
    this.physics.add.existing(this.deathWall, true);
    this.physics.add.overlap(this.player, this.deathWall, this.die, null, this);
    // Colliders
    this.physics.add.collider(this.player, this.floor);
    this.physics.add.collider(this.player, this.blocks);
    this.physics.add.overlap(this.player, this.spikes, this.die, null, this);
    this.physics.add.overlap(this.player, this.portals, this.hitPortal, null, this);
    this.physics.add.overlap(this.player, this.shards, this.collectShard, null, this);
    this.physics.add.overlap(this.player, this.echoes, this.collectEcho, null, this);
    this.physics.add.overlap(this.projectiles, this.spikes, this.hitEnemyWithProjectile, null, this);

    // On-Screen Controls Footer
    this.footerBg = this.add.rectangle(0, 0, width, 60, 0x0a0a1a).setDepth(99);

    // Left Corner (Jump - Green)
    this.jumpGraphics = this.add.graphics().setDepth(100);
    this.jumpZone = this.add.zone(0, 0, 100, 60).setInteractive().setDepth(101);
    this.jumpText = this.add.text(0, 0, 'JUMP', { fontFamily: 'Arial Black', fontSize: '14px', color: '#fff' }).setOrigin(0.5).setDepth(102);
    this.jumpOutline = this.add.graphics().setDepth(103);

    // Right Corner (Attack - Red)
    this.attackGraphics = this.add.graphics().setDepth(100);
    this.attackZone = this.add.zone(0, 0, 100, 60).setInteractive().setDepth(101);
    this.attackText = this.add.text(0, 0, 'ATTACK', { fontFamily: 'Arial Black', fontSize: '14px', color: '#fff' }).setOrigin(0.5).setDepth(102);
    this.attackOutline = this.add.graphics().setDepth(103);

    const doJump = () => {
      if (!this.isRunning && this.isAlive) { 
        this.isRunning = true; 
        this.player.body.allowGravity = true;
        return; 
      }
      if (this.player.body.touching.down || this.player.body.onFloor()) {
        this.player.setVelocityY(-1500); // Strong jump to clear tall towers
        this.jumpCount = 1;
        SoundFX.play('jump');
      } else if (this.jumpCount < 2 || this.isOverdrive) {
        this.player.setVelocityY(-1000);
        this.jumpCount = this.isOverdrive ? this.jumpCount : 2;
        SoundFX.play('jump');
        
        const p = this.add.rectangle(this.player.x, this.player.y + 40, 20, 10, 0x22d3ee);
        this.tweens.add({ targets: p, scaleX: 3, alpha: 0, duration: 300, onComplete: () => p.destroy() });
      }
    };

    const doAttack = () => {
      if (!this.isRunning || !this.isAlive) return;
      this.fireProjectile();
    };

    this.jumpZone.on('pointerdown', doJump);
    this.attackZone.on('pointerdown', doAttack);
    this.input.keyboard.on('keydown-SPACE', doJump);
    this.input.keyboard.on('keydown-F', doAttack);
    this.input.keyboard.on('keydown-R', () => this.activateRiftPower());
    
    // Long-press attack button = activate rift power (mobile)
    let attackHoldTimer = null;
    this.attackZone.on('pointerdown', () => {
      attackHoldTimer = setTimeout(() => this.activateRiftPower(), 800);
    });
    this.attackZone.on('pointerup', () => { if (attackHoldTimer) clearTimeout(attackHoldTimer); });

    // UI — Top-left: Level + rift power | Top-center: Progress | Top-right: Shards, Echoes, Overdrive, Quit
    this.levelText = this.add.text(12, 8, `LEVEL ${this.levelNum}`, { fontFamily: 'Arial Black', fontSize: '18px', color: '#ffffff', stroke: '#000', strokeThickness: 3 }).setDepth(100);
    
    // Rift Power indicator (below level)
    if (this.selectedRiftPower && !this.riftPowerUsed) {
      const powerLabels = { shield: '🛡️ SHIELD', timeFracture: '⏳ SLOW-MO', dimensionalBlast: '⚡ BLAST' };
      this.riftPowerLabel = this.add.text(12, 30, powerLabels[this.selectedRiftPower] || '', {
        fontFamily: 'Arial Black', fontSize: '11px', color: '#a855f7', stroke: '#000', strokeThickness: 3
      }).setDepth(100);
      this.tweens.add({ targets: this.riftPowerLabel, alpha: 0.5, yoyo: true, repeat: -1, duration: 800 });
    }

    // Progress bar (top center)
    this.progressBarBg = this.add.rectangle(width/2, 14, Math.min(width * 0.4, 200), 6, 0x1e293b).setDepth(100).setStrokeStyle(1, 0x475569);
    this.progressBar = this.add.rectangle(width/2 - Math.min(width * 0.2, 100), 14, 0, 6, 0x22d3ee).setOrigin(0, 0.5).setDepth(101);

    // Right column — stacked vertically with clear spacing
    this.scoreText = this.add.text(width - 12, 8, `💎 ${this.baseShards}`, { fontFamily: 'Arial Black', fontSize: '16px', color: '#06b6d4', stroke: '#000', strokeThickness: 3 }).setOrigin(1, 0).setDepth(100);
    this.echoText = this.add.text(width - 12, 28, `🔮 ${this.baseEchoes}`, { fontFamily: 'Arial Black', fontSize: '13px', color: '#a855f7', stroke: '#000', strokeThickness: 2 }).setOrigin(1, 0).setDepth(100);
    
    // Overdrive meter
    this.overdriveBarBg = this.add.rectangle(width - 12, 50, 80, 6, 0x1e293b).setOrigin(1, 0.5).setDepth(100).setStrokeStyle(1, 0x475569);
    const initialFill = Math.min(this.overdriveMeter / 10, 1);
    this.overdriveBar = this.add.rectangle(width - 92, 50, 80 * initialFill, 6, 0xfbbf24).setOrigin(0, 0.5).setDepth(101);
    this.overdriveLabel = this.add.text(width - 96, 50, '⚡', { fontSize: '10px' }).setOrigin(1, 0.5).setDepth(100);

    // Quit button — below overdrive
    this.quitBtn = this.add.text(width - 12, 60, '✕', { fontFamily: 'Arial Black', fontSize: '16px', color: '#ef4444', stroke: '#000', strokeThickness: 3 }).setOrigin(1, 0).setDepth(100);
    this.quitBtn.setInteractive({ useHandCursor: true });
    this.quitBtn.on('pointerdown', () => this.exitToHub());

    this.startText = this.add.text(width/2, height/2, 'TAP JUMP TO START!', { fontFamily: 'Arial Black', fontSize: '32px', color: '#e63946', stroke: '#fff', strokeThickness: 4 }).setOrigin(0.5);
    this.tweens.add({ targets: this.startText, alpha: 0.5, yoyo: true, repeat: -1, duration: 500 });

    // Add resize listener
    this.scale.on('resize', this.resize, this);
    
    // Initial UI positioning
    this.resize({ width, height });
  }

  resize(gameSize) {
    const width = gameSize.width;
    const height = gameSize.height;

    const footerH = 60;
    const gameH = height - footerH;

    this.gameH = gameH;

    if (this.bg) {
      this.bg.setDisplaySize(width, height);
    }
    
    if (this.floor) {
      this.floor.setPosition(width/2, gameH + 500);
      this.floor.width = width * 100;
      this.floor.height = 1000;
      if (this.floor.body) {
        this.floor.body.updateFromGameObject();
      }
    }

    if (this.deathWall) {
      this.deathWall.setPosition(-20, gameH/2);
      this.deathWall.height = gameH;
      if (this.deathWall.body) {
        this.deathWall.body.updateFromGameObject();
      }
    }

    if (this.footerBg) {
      this.footerBg.setPosition(width/2, height - footerH/2);
      this.footerBg.setSize(width, footerH);
    }

    const uiY = height - footerH/2;
    
    if (this.jumpGraphics) {
       this.jumpGraphics.clear();
       this.jumpGraphics.fillStyle(0x10b981, 0.8);
       this.jumpGraphics.fillRoundedRect(10, uiY - 20, width/2 - 20, 40, 10);
       this.jumpZone.setPosition(width/4, uiY);
       this.jumpZone.setSize(width/2 - 20, 40);
       this.jumpText.setPosition(width/4, uiY);
       this.jumpText.setFontSize('14px');
       this.jumpOutline.clear();
       this.jumpOutline.lineStyle(2, 0xffffff);
       this.jumpOutline.strokeRoundedRect(10, uiY - 20, width/2 - 20, 40, 10);
    }
    
    if (this.attackGraphics) {
       this.attackGraphics.clear();
       this.attackGraphics.fillStyle(0xe63946, 0.8);
       this.attackGraphics.fillRoundedRect(width/2 + 10, uiY - 20, width/2 - 20, 40, 10);
       this.attackZone.setPosition(3*width/4, uiY);
       this.attackZone.setSize(width/2 - 20, 40);
       this.attackText.setPosition(3*width/4, uiY);
       this.attackText.setFontSize('14px');
       this.attackOutline.clear();
       this.attackOutline.lineStyle(2, 0xffffff);
       this.attackOutline.strokeRoundedRect(width/2 + 10, uiY - 20, width/2 - 20, 40, 10);
    }

    if (this.levelText) this.levelText.setPosition(12, 8);
    if (this.riftPowerLabel) this.riftPowerLabel.setPosition(12, 30);
    const progW = Math.min(width * 0.4, 200);
    if (this.progressBarBg) { this.progressBarBg.setPosition(width/2, 14); this.progressBarBg.setSize(progW, 6); }
    if (this.progressBar) this.progressBar.setPosition(width/2 - progW/2, 14);
    if (this.scoreText) this.scoreText.setPosition(width - 12, 8);
    if (this.echoText) this.echoText.setPosition(width - 12, 28);
    if (this.overdriveBarBg) this.overdriveBarBg.setPosition(width - 12, 50);
    if (this.overdriveBar) this.overdriveBar.setPosition(width - 92, 50);
    if (this.overdriveLabel) this.overdriveLabel.setPosition(width - 96, 50);
    if (this.quitBtn) this.quitBtn.setPosition(width - 12, 60);
    if (this.startText) this.startText.setPosition(width/2, height/2);
  }

  exitToHub() {
    this.isAlive = false;
    this.isRunning = false;
    document.getElementById('game-container').style.display = 'none';
    document.body.classList.remove('playing-game');
    
    // Unlock orientation so portrait works again
    try {
      if (screen.orientation && screen.orientation.unlock) {
        screen.orientation.unlock();
      }
    } catch(e) {}
    
    const hub = document.getElementById('game-hub');
    hub.style.display = 'block';
    setTimeout(() => hub.style.opacity = '1', 50);
    if(window.updateCharacterLocks) window.updateCharacterLocks();
    if(window.initHeroSelection) window.initHeroSelection();
    
    let saveToUpdate = SaveSystem.load();
    saveToUpdate.overdriveMeter = this.overdriveMeter;
    SaveSystem.save(saveToUpdate);
    
    // Fix Hub Stats refresh
    let save = SaveSystem.load();
    if (save) {
      const lvlStat = document.getElementById('hub-stat-level');
      const starsStat = document.getElementById('hub-stat-stars');
      const shardsStat = document.getElementById('hub-stat-shards');
      const echoStat = document.getElementById('hub-stat-echoes');
      if (lvlStat) lvlStat.innerText = save.maxLevelUnlocked || 1;
      if (starsStat) starsStat.innerText = save.totalStars || 0;
      if (shardsStat) shardsStat.innerText = save.totalShards || 0;
      if (echoStat) echoStat.innerText = save.totalEchoes || 0;
    }
    
    // Destroy game instance to completely reset it for next time
    this.time.delayedCall(100, () => {
      this.game.destroy(true);
      window.game = null;
    });
  }

  // Linear Congruential Generator for predictable procedural layouts per level
  seededRandom(max, min = 0) {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return min + (this.seed / 233280) * (max - min);
  }

  buildLevel() {
    const { finishDistance, towerFreq, enemyFreq, shardFreq, obstacleGap, maxTowerBlocks } = this.config;
    const startX = 800;
    const groundY = this.gameH + 10;
    const blockSize = 80;
    const gap = obstacleGap || 3; // Fallback

    let currentX = startX;
    let lastWasTower = false;

    while (currentX < finishDistance) {
      currentX += blockSize;
      
      // Random pacing gaps
      if (this.seededRandom(1) < 0.3) {
        lastWasTower = false;
        continue; 
      }

      if (this.seededRandom(1) < towerFreq && !lastWasTower) {
        const heightMultiplier = Math.floor(this.seededRandom((maxTowerBlocks || 1) + 1, 1)); // Random 1 to max
        const towerHeight = heightMultiplier * blockSize;
        const tower = this.blocks.create(currentX, groundY - (towerHeight/2), 'sci_fi_tower');
        tower.setDisplaySize(blockSize, towerHeight);
        lastWasTower = true;
        
        if (this.seededRandom(1) < shardFreq) {
          this.spawnShard(currentX, groundY - towerHeight - 40);
        }
        
        currentX += blockSize * gap;
      } else {
        lastWasTower = false;
        if (this.seededRandom(1) < enemyFreq) {
          this.spawnEnemy(currentX, groundY);
          currentX += blockSize * gap;
        } else if (this.seededRandom(1) < shardFreq) {
          this.spawnShard(currentX, groundY - 40);
        }
      }
    }

    // Finish Line Portal
    const finishLine = this.portals.create(finishDistance + 500, groundY - 150, 'rift_portal');
    finishLine.setDisplaySize(150, 300);
    finishLine.setTint(0x10b981); // Emerald green finish line
    finishLine.isFinishLine = true;
    this.tweens.add({ targets: finishLine, angle: 360, repeat: -1, duration: 2000 });

    // Spawn Echoes — 1-2 per level in tricky elevated spots
    const echoCount = this.levelNum >= 5 ? 2 : 1;
    const echoSpacing = finishDistance / (echoCount + 1);
    for (let i = 0; i < echoCount; i++) {
      const echoX = startX + echoSpacing * (i + 1) + this.seededRandom(400, -200);
      // Place echoes high — on top of towers or floating in dangerous airspace
      const echoY = groundY - this.seededRandom(280, 180);
      this.spawnEcho(echoX, echoY);
    }
  }

  spawnEnemy(x, y) {
    const enemyKey = this.activeWorld.enemies[Math.floor(this.seededRandom(this.activeWorld.enemies.length))];
    const enemy = this.spikes.create(x, y - 40, enemyKey); // -40 so feet sit exactly on floor
    enemy.setDisplaySize(80, 80);
    
    // Alien brute image naturally faces right, so we flip it to face left (towards player)
    if (enemyKey === 'alien_brute') {
      enemy.setFlipX(true);
    } else {
      enemy.setFlipX(false); 
    }
  }

  spawnShard(x, y) {
    const shard = this.add.text(x, y, '💎', { fontSize: '32px' }).setOrigin(0.5);
    this.tweens.add({ targets: shard, y: y - 10, yoyo: true, repeat: -1, duration: 500 });
    this.shards.add(shard);
  }

  spawnEcho(x, y) {
    const echo = this.add.text(x, y, '🔮', { fontSize: '36px' }).setOrigin(0.5).setDepth(8);
    // Phasing effect — flicker visible/invisible
    this.tweens.add({
      targets: echo,
      alpha: { from: 1, to: 0.1 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    // Gentle float
    this.tweens.add({ targets: echo, y: y - 15, yoyo: true, repeat: -1, duration: 800 });
    // Purple glow particles around the echo
    this.time.addEvent({
      delay: 400,
      loop: true,
      callback: () => {
        if (!echo.active) return;
        const spark = this.add.rectangle(echo.x + (Math.random()-0.5)*30, echo.y + (Math.random()-0.5)*30, 4, 4, 0xa855f7);
        spark.setDepth(7);
        this.tweens.add({ targets: spark, alpha: 0, scaleX: 0, scaleY: 0, duration: 600, onComplete: () => spark.destroy() });
      }
    });
    this.echoes.add(echo);
  }

  collectEcho(player, echo) {
    echo.destroy();
    this.echoesCollected++;
    this.echoText.setText(`🔮 ${this.baseEchoes + this.echoesCollected}`);
    SoundFX.play('levelup');
    this.cameras.main.flash(200, 168, 85, 247); // Purple flash
    
    // Big cinematic collection burst
    for (let i = 0; i < 20; i++) {
      const p = this.add.rectangle(player.x + (Math.random()-0.5)*60, player.y + (Math.random()-0.5)*60, 6, 6, 0xa855f7);
      this.physics.add.existing(p);
      p.body.setVelocity((Math.random()-0.5)*600, (Math.random()-0.5)*600);
      this.tweens.add({ targets: p, alpha: 0, duration: 800, onComplete: () => p.destroy() });
    }
    
    const floatText = this.add.text(player.x, player.y - 50, '+1 ECHO 🔮', {
      fontFamily: 'Arial Black', fontSize: '22px', color: '#a855f7', stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5).setDepth(200);
    this.tweens.add({ targets: floatText, y: player.y - 120, alpha: 0, duration: 1200, onComplete: () => floatText.destroy() });
  }

  activateRiftPower() {
    if (!this.selectedRiftPower || this.riftPowerUsed || !this.isRunning || !this.isAlive) return;
    this.riftPowerUsed = true;
    if (this.riftPowerLabel) this.riftPowerLabel.destroy();
    
    // Consume the power from save
    let saveData = SaveSystem.load();
    saveData.selectedRiftPower = null;
    SaveSystem.save(saveData);
    
    SoundFX.play('levelup');
    this.cameras.main.flash(300, 168, 85, 247);
    
    const powerAlert = this.add.text(this.cameras.main.width/2, 100, '', {
      fontFamily: 'Arial Black', fontSize: '32px', color: '#a855f7', stroke: '#000', strokeThickness: 5
    }).setOrigin(0.5).setDepth(200).setScrollFactor(0);
    
    if (this.selectedRiftPower === 'shield') {
      powerAlert.setText('🛡️ RIFT SHIELD!');
      // 5 seconds invincibility
      this.isOverdrive = true;
      this.player.setTint(0xa855f7);
      this.time.delayedCall(5000, () => {
        this.isOverdrive = false;
        this.player.clearTint();
      });
    } else if (this.selectedRiftPower === 'timeFracture') {
      powerAlert.setText('⏳ TIME FRACTURE!');
      // Half speed for 6 seconds
      const origSpeed = this.gameSpeed;
      this.gameSpeed = origSpeed * 0.5;
      this.time.delayedCall(6000, () => {
        this.gameSpeed = origSpeed;
      });
    } else if (this.selectedRiftPower === 'dimensionalBlast') {
      powerAlert.setText('⚡ DIMENSIONAL BLAST!');
      // Destroy all enemies on screen
      this.spikes.getChildren().forEach(enemy => {
        if (enemy.x > 0 && enemy.x < this.cameras.main.width + this.player.x) {
          this.hitEnemyWithProjectile(null, enemy);
        }
      });
      this.cameras.main.shake(300, 0.03);
    }
    
    this.tweens.add({ targets: powerAlert, y: 60, alpha: 0, duration: 2000, onComplete: () => powerAlert.destroy() });
  }

  hitPortal(player, portal) {
    if (portal.isFinishLine) return;
    if (portal.isRiftPortal) {
      portal.destroy();
      this.hasActiveRiftPortal = false;
      this.riftShardCounter = 0; // Reset counter for next portal
      SoundFX.play('levelup');
      
      // Freeze the game while showing the rift modal
      const savedSpeed = this.gameSpeed;
      this.gameSpeed = 0;
      this.player.body.moves = false;
      this.player.setVisible(false);
      
      // Pick a new world
      let newWorld;
      do {
        newWorld = this.config.worlds[Math.floor(Math.random() * this.config.worlds.length)];
      } while (newWorld.key === this.activeWorld.key && this.config.worlds.length > 1);
      
      this.showRiftModal(newWorld, savedSpeed);
      return;
    }
  }

  showRiftModal(newWorld, savedSpeed) {
    const { width, height } = this.cameras.main;
    
    this.cameras.main.flash(500, 255, 255, 255);
    
    // Dark overlay
    const overlay = this.add.rectangle(width/2, height/2, width, height, 0x000000, 0).setDepth(2000).setScrollFactor(0);
    this.tweens.add({ targets: overlay, fillAlpha: 0.9, duration: 400 });
    
    // Panel
    const panel = this.add.rectangle(width/2, height/2, Math.min(width * 0.85, 500), 200, 0x0a0a1a, 1).setDepth(2001).setScrollFactor(0);
    panel.setStrokeStyle(3, 0x7c3aed);
    panel.setAlpha(0);
    this.tweens.add({ targets: panel, alpha: 1, duration: 400, delay: 200 });
    
    // Rift icon
    const riftIcon = this.add.text(width/2, height/2 - 60, '🌀', { fontSize: '42px' }).setOrigin(0.5).setDepth(2002).setScrollFactor(0).setAlpha(0);
    this.tweens.add({ targets: riftIcon, alpha: 1, angle: 360, duration: 800, delay: 300 });
    
    // Title
    const title = this.add.text(width/2, height/2 - 20, 'RIFT BREACH!', {
      fontFamily: 'Arial Black', fontSize: '28px', color: '#7c3aed', stroke: '#000', strokeThickness: 5
    }).setOrigin(0.5).setDepth(2002).setScrollFactor(0).setAlpha(0);
    this.tweens.add({ targets: title, alpha: 1, duration: 400, delay: 400 });
    
    // Flavor text
    const flavorTexts = [
      `The rift tore open and dropped you into ${newWorld.name}!`,
      `A dimensional fracture pulls you through to ${newWorld.name}!`,
      `Reality shifted... you've landed in ${newWorld.name}!`,
      `The portal ripped you across dimensions to ${newWorld.name}!`,
    ];
    const flavor = flavorTexts[Math.floor(Math.random() * flavorTexts.length)];
    
    const desc = this.add.text(width/2, height/2 + 20, flavor, {
      fontFamily: 'Arial', fontSize: '16px', color: '#ffffff', align: 'center',
      wordWrap: { width: Math.min(width * 0.7, 400) }
    }).setOrigin(0.5).setDepth(2002).setScrollFactor(0).setAlpha(0);
    this.tweens.add({ targets: desc, alpha: 1, duration: 400, delay: 600 });
    
    // Continue button
    const btn = this.add.rectangle(width/2, height/2 + 70, 160, 40, 0x7c3aed).setDepth(2002).setScrollFactor(0).setAlpha(0);
    btn.setStrokeStyle(2, 0xffffff);
    const btnText = this.add.text(width/2, height/2 + 70, '▶ CONTINUE', {
      fontFamily: 'Arial Black', fontSize: '16px', color: '#fff'
    }).setOrigin(0.5).setDepth(2003).setScrollFactor(0).setAlpha(0);
    this.tweens.add({ targets: [btn, btnText], alpha: 1, duration: 400, delay: 800 });
    
    btn.setInteractive({ useHandCursor: true });
    btn.on('pointerdown', () => {
      // Clean up modal
      overlay.destroy();
      panel.destroy();
      riftIcon.destroy();
      title.destroy();
      desc.destroy();
      btn.destroy();
      btnText.destroy();
      
      // Apply the world swap
      this.activeWorld = newWorld;
      
      // Update enemies ahead of the player
      if (this.spikes) {
        this.spikes.getChildren().forEach(enemy => {
          if (enemy.x > this.player.x) {
            const newEnemyKey = this.activeWorld.enemies[Math.floor(Math.random() * this.activeWorld.enemies.length)];
            enemy.setTexture(newEnemyKey);
            enemy.setDisplaySize(80, 80);
            if (newEnemyKey === 'alien_brute') {
              enemy.setFlipX(true);
            } else {
              enemy.setFlipX(false);
            }
          }
        });
      }
      
      // Swap background
      const { width, height } = this.cameras.main;
      this.bg.destroy();
      this.bg = this.add.image(0, 0, newWorld.bg);
      this.bg.setOrigin(0, 0);
      this.bg.setDisplaySize(width, height);
      this.bg.setDepth(-1);
      this.bg.setScrollFactor(0);
      this.bg.setTint(0x999999);
      
      // Resume gameplay
      this.player.setVisible(true);
      this.player.body.moves = true;
      this.gameSpeed = savedSpeed;
      
      this.cameras.main.flash(300, 255, 255, 255);
    });
  }

  collectShard(player, shard) {
    shard.destroy();
    this.shardsCollected++;
    this.riftShardCounter++;
    this.scoreText.setText(`💎 ${this.baseShards + this.shardsCollected}`);
    SoundFX.play('hit');
    
    if (!this.isOverdrive) {
      this.overdriveMeter++;
      const fill = Math.min(this.overdriveMeter / 10, 1);
      this.overdriveBar.width = 100 * fill;
      
      if (this.overdriveMeter >= 10) {
        this.enterOverdrive();
      }
    }
    
    // Spawn a rift portal when enough shards are collected
    if (this.riftShardCounter >= this.portalShardsNeeded && !this.hasActiveRiftPortal) {
      this.spawnRiftPortal();
    }
  }

  spawnRiftPortal() {
    this.hasActiveRiftPortal = true;
    const groundY = this.gameH + 10;
    
    // Spawn it ahead of the player, elevated so you have to jump to hit it
    const spawnX = this.player.x + this.cameras.main.width + 200;
    const portal = this.portals.create(spawnX, groundY - 180, 'rift_portal');
    portal.setDisplaySize(80, 160);
    portal.isRiftPortal = true;
    this.tweens.add({ targets: portal, angle: 360, repeat: -1, duration: 3000 });
    
    // Pulsing glow effect to make it obvious
    this.tweens.add({ targets: portal, scaleX: 1.15, scaleY: 1.15, yoyo: true, repeat: -1, duration: 600 });
    
    // Alert the player
    const alertText = this.add.text(this.cameras.main.width / 2, 140, '🌀 RIFT PORTAL AHEAD! 🌀', {
      fontFamily: 'Arial Black', fontSize: '22px', color: '#7c3aed', stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5).setDepth(100).setScrollFactor(0);
    this.tweens.add({ targets: alertText, alpha: 0, duration: 2500, delay: 500, onComplete: () => alertText.destroy() });
  }

  enterOverdrive() {
    this.isOverdrive = true;
    this.player.setTint(0xfbbf24);
    SoundFX.play('levelup');
    
    if (this.overdriveAura) this.overdriveAura.destroy();
    
    this.overdriveAura = this.add.graphics();
    this.overdriveAura.fillStyle(0xfbbf24, 0.5);
    this.overdriveAura.fillCircle(0, 0, 70);
    this.overdriveAura.setDepth(9);
    
    this.tweens.add({ targets: this.overdriveAura, scaleX: 1.4, scaleY: 1.4, alpha: 0.1, yoyo: true, repeat: -1, duration: 300 });
    
    this.overdriveText = this.add.text(this.cameras.main.width/2, 100, 'OVERDRIVE!', { fontFamily: 'Arial Black', fontSize: '48px', color: '#fbbf24', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5).setDepth(100);
    this.tweens.add({ targets: this.overdriveText, scale: 1.2, yoyo: true, repeat: -1, duration: 300 });

    this.time.delayedCall(8000, () => {
      this.isOverdrive = false;
      this.overdriveMeter = 0;
      this.overdriveBar.width = 0;
      this.player.clearTint();
      if (this.overdriveAura) this.overdriveAura.destroy();
      if (this.overdriveText) this.overdriveText.destroy();
    });
  }

  fireProjectile() {
    // Cooldown check to prevent spamming
    if (this.lastFireTime && this.time.now - this.lastFireTime < 300) return;
    this.lastFireTime = this.time.now;

    SoundFX.play('jump'); // Play attack sound

    let color = 0xffffff;
    let isLaser = false;

    if (this.activeHero === 'spider_hero') color = 0xffffff;
    else if (this.activeHero === 'telekinetic_girl') color = 0x3b82f6; // Blue psi orb
    else if (this.activeHero === 'super_girl') { color = 0xfacc15; isLaser = true; } // Yellow laser
    else if (this.activeHero === 'mandalorian') { color = 0xef4444; isLaser = true; } // Red blaster
    else if (this.activeHero === 'jedi_kid') { color = 0x22c55e; isLaser = true; } // Green saber
    else if (this.activeHero === 'iron_kid') { color = 0x06b6d4; isLaser = true; } // Cyan repulsor
    else if (this.activeHero === 'alien_brute') color = 0x000000; // Black symbiote glob
    else if (this.activeHero === 'superboy') { color = 0x2563eb; isLaser = true; } // Blue heat vision
    else if (this.activeHero === 'cyborg_girl') { color = 0x06b6d4; isLaser = true; } // Cyan sonic cannon

    const w = isLaser ? 50 : 20;
    const h = isLaser ? 8 : 20;

    const proj = this.add.rectangle(this.player.x + 40, this.player.y, w, h, color).setDepth(50);
    if (!isLaser) {
        proj.isOrb = true;
        this.tweens.add({ targets: proj, angle: 360, repeat: -1, duration: 500 });
    }
    
    this.physics.add.existing(proj);
    this.projectiles.add(proj);
    
    proj.body.setVelocityX(1400); // Shoot fast right
  }

  hitEnemyWithProjectile(proj, enemy) {
    if (proj) proj.destroy();
    if (enemy) enemy.destroy();
    SoundFX.play('hit');
    this.cameras.main.shake(100, 0.01);

    // Particles explosion
    for (let i = 0; i < 15; i++) {
      const p = this.add.rectangle(enemy.x, enemy.y, 8, 8, 0xffa500);
      this.physics.add.existing(p);
      p.body.setVelocity((Math.random()-0.5)*800, (Math.random()-0.5)*800);
      this.tweens.add({ targets: p, alpha: 0, duration: 500, onComplete: () => p.destroy() });
    }

    // Bonus shards for defeating an enemy!
    this.shardsCollected += 2;
    this.scoreText.setText(`💎 ${this.baseShards + this.shardsCollected}`);
    
    const floatText = this.add.text(enemy.x, enemy.y - 40, '+2 💎', { fontFamily: 'Arial Black', fontSize: '20px', color: '#fbbf24', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5);
    this.tweens.add({ targets: floatText, y: enemy.y - 100, alpha: 0, duration: 1000, onComplete: () => floatText.destroy() });
  }

  die(player, hazard) {
    if (!this.isAlive) return;
    if (this.isOverdrive) {
      if (hazard && hazard.destroy && hazard !== this.deathWall) {
         this.hitEnemyWithProjectile(null, hazard);
      }
      return; // Invincible!
    }
    this.isAlive = false;
    this.isRunning = false;
    SoundFX.play('die');
    
    this.player.setVisible(false);
    for (let i = 0; i < 20; i++) {
      const p = this.add.rectangle(this.player.x, this.player.y, 8, 8, 0xffffff);
      this.physics.add.existing(p);
      p.body.setVelocity((Math.random()-0.5)*1000, (Math.random()-0.5)*1000);
      this.tweens.add({ targets: p, alpha: 0, duration: 600, onComplete: () => p.destroy() });
    }
    
    // Save overdrive meter state on death so it carries over
    let save = SaveSystem.load();
    save.overdriveMeter = this.overdriveMeter;
    save.totalEchoes = (save.totalEchoes || 0) + this.echoesCollected;
    SaveSystem.save(save);

    this.cameras.main.shake(200, 0.02);
    this.time.delayedCall(800, () => this.scene.restart());
  }

  completeLevel() {
    if (!this.isRunning) return;
    this.isRunning = false;
    this.isAlive = false;
    
    // Freeze the player and hide them (they entered the portal)
    this.player.body.moves = false;
    this.player.setVisible(false);
    if (this.overdriveAura) this.overdriveAura.setVisible(false);
    
    SoundFX.play('levelup');
    this.cameras.main.flash(500, 255, 255, 255);
    
    // Save progression
    let save = SaveSystem.load();
    save.maxLevelUnlocked = Math.max(save.maxLevelUnlocked || 1, this.levelNum + 1);
    save.shards = (save.shards || 0) + this.shardsCollected;
    save.totalEchoes = (save.totalEchoes || 0) + this.echoesCollected;
    save.overdriveMeter = this.overdriveMeter; // persist overdrive meter
    
    // Set stars for the completed level to unlock the next one on the Hub map
    let foundLevelId = null;
    let counter = 1;
    for (let w = 0; w < WORLDS.length; w++) {
      for (let l = 0; l < WORLDS[w].levels.length; l++) {
        if (counter === this.levelNum) {
          foundLevelId = WORLDS[w].levels[l].id;
        }
        counter++;
      }
    }
    
    if (!save.stars) save.stars = {};
    if (foundLevelId) {
      save.stars[foundLevelId] = Math.max(save.stars[foundLevelId] || 0, 3);
    }
    
    // ── Lume Earning ──
    if (!save.lumes) save.lumes = 0;
    if (!save.lumeHistory) save.lumeHistory = {};
    let lumesEarned = 0;
    // First time clearing this level
    if (!save.lumeHistory['level_' + this.levelNum]) {
      lumesEarned += 1; // 1 Lume per new level clear
      save.lumeHistory['level_' + this.levelNum] = true;
    }
    // World completion bonus (every 10 levels = 1 world)
    const worldNum = Math.ceil(this.levelNum / 10);
    if (this.levelNum % 10 === 0 && !save.lumeHistory['world_' + worldNum]) {
      lumesEarned += 5; // 5 Lumes for completing a world
      save.lumeHistory['world_' + worldNum] = true;
    }
    // All shards collected bonus
    if (this.shardsCollected >= 20 && !save.lumeHistory['allshards_' + this.levelNum]) {
      lumesEarned += 1;
      save.lumeHistory['allshards_' + this.levelNum] = true;
    }
    save.lumes += lumesEarned;
    this._lumesEarned = lumesEarned;
    SaveSystem.save(save);
    
    // ── Activity Logging (for Parent Dashboard) ──
    try {
      if (typeof ActivityLogger !== 'undefined') {
        // Find world name for this level
        let worldName = 'Unknown';
        let counter2 = 1;
        for (let w2 = 0; w2 < WORLDS.length; w2++) {
          for (let l2 = 0; l2 < WORLDS[w2].levels.length; l2++) {
            if (counter2 === this.levelNum) worldName = WORLDS[w2].name;
            counter2++;
          }
        }
        ActivityLogger.levelComplete(foundLevelId || ('level-' + this.levelNum), 3, worldName);
        if (this.levelNum % 10 === 0) {
          ActivityLogger.worldUnlock(worldNum, worldName);
        }
        if (this.echoesCollected > 0) {
          ActivityLogger.echoFound(save.totalEchoes);
        }
      }
    } catch(e) {}
    
    // Process echo unlocks
    if (this.echoesCollected > 0) {
      SaveSystem.addEchoes(0); // Re-run unlock checks with current total
    }

    // ── Race Mode Finish ──
    if (this.raceMode && window.MultiplayerSystem) {
      const finishTime = Date.now() - this.raceStartTime;
      const tenant = (window.CHRONOVERSE_TENANT || '').toLowerCase();
      window.MultiplayerSystem.reportFinish(tenant, finishTime);
    }

    this.time.delayedCall(500, () => {
        this.showVictoryModal();
    });
  }

  showVictoryModal() {
    const { width, height } = this.cameras.main;
    
    // Stop background scroll
    this.gameSpeed = 0;

    // Dark Overlay
    const overlay = this.add.rectangle(width/2, height/2, width, height, 0x000000, 0).setDepth(1000);
    this.tweens.add({ targets: overlay, fillAlpha: 0.8, duration: 500 });

    // Cinematic Panel
    const panel = this.add.rectangle(width/2, height/2, Math.min(width * 0.8, 600), height * 0.75, 0x1a1c29, 1).setDepth(1001);
    panel.setStrokeStyle(4, 0x22d3ee);
    panel.setAlpha(0);
    panel.y -= 100;

    this.tweens.add({
      targets: panel,
      y: height/2,
      alpha: 1,
      duration: 600,
      ease: 'Back.easeOut'
    });

    // Character quotes
    const chars = [
      { id: 'spider_hero', quote: "Amazing run! My spider-sense didn't even tingle!" },
      { id: 'bounty_hunter', quote: "This is the way. Outstanding work, kid." },
      { id: 'telekinetic_girl', quote: "Awesome! You totally crushed that level!" },
      { id: 'iron_kid', quote: "Armor systems nominal! Your reflexes are off the charts!" },
      { id: 'jedi_kid', quote: "The Force is strong with you! Ready for the next one?" },
      { id: 'alien_brute', quote: "WE ARE VENOM... AND WE ARE FAST! GOOD JOB!" },
      { id: 'superboy', quote: "Up, up, and AWAY! Nothing can stop us!" },
      { id: 'cyborg_girl', quote: "Systems optimal. Target eliminated. BOOYAH!" },
      { id: 'super_girl', quote: "Girl power saves the day! Let's keep going!" },
      { id: 'hero_black', quote: "The symbiote flows through us... INCREDIBLE!" },
      { id: 'hero_red', quote: "Your friendly neighborhood hero strikes again!" }
    ];
    let heroData = chars.find(c => c.id === this.activeHero) || chars[0];

    const portrait = this.add.image(width/2 - 160, height/2 + 20, heroData.id).setDepth(1002);
    portrait.setDisplaySize(120, 120);
    portrait.setAlpha(0);
    this.tweens.add({ targets: portrait, alpha: 1, duration: 800, delay: 300 });

    // Speech Bubble
    const bubble = this.add.graphics({ fillStyle: { color: 0xffffff }, lineStyle: { width: 3, color: 0x22d3ee } }).setDepth(1002);
    bubble.fillRoundedRect(width/2 - 100, height/2 - 100, 270, 80, 16);
    bubble.strokeRoundedRect(width/2 - 100, height/2 - 100, 270, 80, 16);
    
    // Bubble pointer
    bubble.fillTriangle(width/2 - 80, height/2 - 20, width/2 - 60, height/2 - 20, width/2 - 90, height/2);
    bubble.strokeTriangle(width/2 - 80, height/2 - 20, width/2 - 60, height/2 - 20, width/2 - 90, height/2);
    bubble.setAlpha(0);

    const quoteText = this.add.text(width/2 + 35, height/2 - 60, heroData.quote, {
      fontFamily: 'Arial', fontSize: '15px', color: '#000000', fontStyle: 'bold', align: 'center', wordWrap: { width: 250 }
    }).setOrigin(0.5).setDepth(1003).setAlpha(0);

    this.tweens.add({ targets: [bubble, quoteText], alpha: 1, duration: 500, delay: 600 });

    // Title
    const title = this.add.text(width/2, height/2 - 140, 'LEVEL CLEARED!', {
      fontFamily: 'Arial Black', fontSize: '32px', color: '#fbbf24', stroke: '#000', strokeThickness: 5
    }).setOrigin(0.5).setDepth(1002).setAlpha(0);
    this.tweens.add({ targets: title, alpha: 1, y: height/2 - 120, duration: 500, delay: 200, ease: 'Bounce.easeOut' });

    // Stats
    const statsY = height/2 + 10;
    const statsText = this.add.text(width/2 + 60, statsY, `💎 +${this.shardsCollected} Shards`, {
      fontFamily: 'Arial Black', fontSize: '20px', color: '#06b6d4', stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(1002).setAlpha(0);
    this.tweens.add({ targets: statsText, alpha: 1, duration: 500, delay: 400 });
    
    if (this.echoesCollected > 0) {
      const echoStats = this.add.text(width/2 + 60, statsY + 28, `🔮 +${this.echoesCollected} Echo${this.echoesCollected > 1 ? 'es' : ''}`, {
        fontFamily: 'Arial Black', fontSize: '20px', color: '#a855f7', stroke: '#000', strokeThickness: 3
      }).setOrigin(0.5).setDepth(1002).setAlpha(0);
      this.tweens.add({ targets: echoStats, alpha: 1, duration: 500, delay: 500 });
    }
    
    if (this._lumesEarned > 0) {
      const lumeStats = this.add.text(width/2 + 60, statsY + (this.echoesCollected > 0 ? 56 : 28), `✦ +${this._lumesEarned} Lume${this._lumesEarned > 1 ? 's' : ''}`, {
        fontFamily: 'Arial Black', fontSize: '20px', color: '#fbbf24', stroke: '#000', strokeThickness: 3
      }).setOrigin(0.5).setDepth(1002).setAlpha(0);
      this.tweens.add({ targets: lumeStats, alpha: 1, duration: 500, delay: 600 });
    }

    // Buttons
    const btnY = height/2 + 100;
    
    // Home Button
    const homeBtn = this.add.rectangle(width/2 - 80, btnY, 140, 45, 0xe63946).setDepth(1002).setInteractive({ useHandCursor: true });
    homeBtn.setStrokeStyle(3, 0xffffff);
    const homeText = this.add.text(width/2 - 80, btnY, '🏠 HOME', { fontFamily: 'Arial Black', fontSize: '18px', color: '#fff' }).setOrigin(0.5).setDepth(1003);
    
    // Next Level Button
    const nextBtn = this.add.rectangle(width/2 + 80, btnY, 140, 45, 0x10b981).setDepth(1002).setInteractive({ useHandCursor: true });
    nextBtn.setStrokeStyle(3, 0xffffff);
    const nextText = this.add.text(width/2 + 80, btnY, '▶ NEXT', { fontFamily: 'Arial Black', fontSize: '18px', color: '#fff' }).setOrigin(0.5).setDepth(1003);

    const btns = [homeBtn, homeText, nextBtn, nextText];
    btns.forEach(b => b.setAlpha(0));
    this.tweens.add({ targets: btns, alpha: 1, duration: 500, delay: 800 });

    // Hover effects
    homeBtn.on('pointerover', () => homeBtn.setStrokeStyle(3, 0xffbaba));
    homeBtn.on('pointerout', () => homeBtn.setStrokeStyle(3, 0xffffff));
    nextBtn.on('pointerover', () => nextBtn.setStrokeStyle(3, 0x86efac));
    nextBtn.on('pointerout', () => nextBtn.setStrokeStyle(3, 0xffffff));

    // Clicks
    homeBtn.on('pointerdown', () => {
      // Check for story milestone before going home
      const milestoneId = 'milestone_' + this.levelNum;
      if (typeof STORY_PANELS !== 'undefined' && STORY_PANELS[milestoneId] && !SaveSystem.isStoryViewed(milestoneId)) {
        this.scene.start('StoryScene', {
          storyId: milestoneId,
          nextScene: 'HubScene',
          nextData: {},
        });
        return;
      }
      this.exitToHub();
    });
    nextBtn.on('pointerdown', () => {
      // Check for story milestone before continuing
      const milestoneId = 'milestone_' + this.levelNum;
      if (typeof STORY_PANELS !== 'undefined' && STORY_PANELS[milestoneId] && !SaveSystem.isStoryViewed(milestoneId)) {
        this.scene.start('StoryScene', {
          storyId: milestoneId,
          nextScene: 'LevelScene',
          nextData: { levelNum: this.levelNum + 1 },
        });
        return;
      }
      this.scene.restart({ levelNum: this.levelNum + 1 });
    });
  }

  update() {
    if (!this.isAlive) return;

    if (this.isRunning) {
      if (this.startText) { 
          this.startText.destroy(); 
          this.startText = null; 
      }

      // Update distance and progress bar
      this.distanceTraveled += (this.gameSpeed * (this.game.loop.delta / 1000));
      const progress = Math.min(this.distanceTraveled / this.config.finishDistance, 1);
      this.progressBar.width = 300 * progress;

      // Background is a static image - no scrolling needed

      // Scroll objects left via physics velocity
      let hitFinish = false;
      [this.blocks, this.spikes, this.portals, this.shards, this.echoes].forEach(group => {
        group.getChildren().forEach(obj => {
          if (obj.body) obj.body.setVelocityX(-this.gameSpeed);
          if (obj.isFinishLine && obj.x <= this.player.x) hitFinish = true;
        });
      });
      
      // Cleanup off-screen projectiles
      this.projectiles.getChildren().forEach(p => {
         if (p.x > this.cameras.main.width + 100) p.destroy();
      });

      if (hitFinish) this.completeLevel();
      
      if (this.player.x < 0) this.die();

      if (this.overdriveAura) {
        this.overdriveAura.setPosition(this.player.x, this.player.y);
      }

      if (this.isOverdrive && Math.random() < 0.4) {
        const p = this.add.rectangle(this.player.x + (Math.random()-0.5)*100, this.player.y + (Math.random()-0.5)*100, 10, 10, 0xfbbf24);
        this.physics.add.existing(p);
        p.body.setVelocityY(Math.random() * -200 - 100);
        this.tweens.add({ targets: p, scaleX: 0, scaleY: 0, duration: 600, onComplete: () => p.destroy() });
      }

      // Reset jump count if landed (just in case they fall off an edge without jumping)
      if (this.player.body.onFloor() || this.player.body.touching.down) {
        this.jumpCount = 0;
      }

      // Geometry Dash full 360° flip when airborne!
      if (!this.player.body.onFloor() && !this.player.body.touching.down) {
        this.player.angle += 8; // Continuous spin
      } else {
        // Snap to nearest 360° on landing for clean look
        this.player.angle = 0;
      }

      // ── Multiplayer Position Sync ──
      if (this.raceMode && window.MultiplayerSystem) {
        const tenant = (window.CHRONOVERSE_TENANT || '').toLowerCase();
        const state = this.player.body.onFloor() ? 'running' : 'jumping';
        window.MultiplayerSystem.syncPosition(tenant, this.player.x, this.player.y, state, this.player.body.velocity.x, this.player.body.velocity.y);
      }
    } else {
      // Idle float waiting for start
      this.player.body.allowGravity = false;
      this.player.setVelocityY(Math.sin(this.time.now / 300) * 50);
    }
  }
}
