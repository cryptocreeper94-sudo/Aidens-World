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
    this.activeHero = localStorage.getItem('ChronoverseActiveHero') || 'spider_hero';
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
    this.distanceTraveled = 0;
    this.shardsCollected = 0;
    this.jumpCount = 0;
    
    // Load persistent overdrive meter from save
    let initialSaveStr = localStorage.getItem('ChronoverseSave');
    let initialSave = initialSaveStr ? JSON.parse(initialSaveStr) : {};
    this.overdriveMeter = initialSave.overdriveMeter || 0;
    this.isOverdrive = false;
    // Strong seed mixing — every level gets a truly unique pattern
    this.seed = ((this.levelNum * 2654435761) ^ (this.levelNum * 40503)) >>> 0;
    // Warm up the RNG so close seeds diverge fully
    for (let i = 0; i < 20; i++) this.seededRandom(1);

    // Worlds Collide Background
    this.activeWorld = this.config.worlds[0];
    this.cameras.main.setBackgroundColor('#000000');
    this.cameras.main.fadeIn(300);
    
    // Background — force exact screen dimensions, no scale math
    this.bg = this.add.image(0, 0, this.activeWorld.bg);
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
    this.player.setDisplaySize(80, 80);
    this.player.setBounce(0);
    this.player.setDepth(10);

    // Groups
    this.blocks = this.physics.add.group({ immovable: true, allowGravity: false });
    this.spikes = this.physics.add.group({ immovable: true, allowGravity: false });
    this.portals = this.physics.add.group({ immovable: true, allowGravity: false });
    this.shards = this.physics.add.group({ immovable: true, allowGravity: false });

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

    // UI
    this.scoreText = this.add.text(width - 20, 20, '💎 0', { fontFamily: 'Arial Black', fontSize: '24px', color: '#06b6d4' }).setOrigin(1, 0).setDepth(100);
    this.overdriveBarBg = this.add.rectangle(width - 20, 55, 100, 8, 0x000000).setOrigin(1, 0.5).setDepth(100);
    const initialFill = Math.min(this.overdriveMeter / 10, 1);
    this.overdriveBar = this.add.rectangle(width - 120, 55, 100 * initialFill, 8, 0xfbbf24).setOrigin(0, 0.5).setDepth(101);
    this.levelText = this.add.text(20, 20, `LEVEL ${this.levelNum}`, { fontFamily: 'Arial Black', fontSize: '24px', color: '#ffffff' }).setDepth(100);
    
    // Progress bar
    this.progressBarBg = this.add.rectangle(width/2, 30, 300, 10, 0x000000).setDepth(100);
    this.progressBar = this.add.rectangle(width/2 - 150, 30, 0, 10, 0x22d3ee).setOrigin(0, 0.5).setDepth(101);

    this.startText = this.add.text(width/2, height/2, 'TAP JUMP TO START!', { fontFamily: 'Arial Black', fontSize: '32px', color: '#e63946', stroke: '#fff', strokeThickness: 4 }).setOrigin(0.5);
    this.tweens.add({ targets: this.startText, alpha: 0.5, yoyo: true, repeat: -1, duration: 500 });

    // Quit Button
    this.quitBtn = this.add.text(width - 20, 60, '❌ QUIT', { fontFamily: 'Arial Black', fontSize: '18px', color: '#ff4444' }).setOrigin(1, 0).setDepth(100);
    this.quitBtn.setInteractive({ useHandCursor: true });
    this.quitBtn.on('pointerdown', () => this.exitToHub());

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

    if (this.scoreText) this.scoreText.setPosition(width - 20, 20);
    if (this.overdriveBarBg) this.overdriveBarBg.setPosition(width - 20, 55);
    if (this.overdriveBar) this.overdriveBar.setPosition(width - 120, 55);
    if (this.levelText) this.levelText.setPosition(20, 20);
    if (this.quitBtn) this.quitBtn.setPosition(width - 20, 60);
    if (this.progressBarBg) this.progressBarBg.setPosition(width/2, 30);
    if (this.progressBar) this.progressBar.setPosition(width/2 - 150, 30);
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
    
    // Save meter on quit
    let saveStr = localStorage.getItem('ChronoverseSave');
    let saveToUpdate = saveStr ? JSON.parse(saveStr) : { maxLevelUnlocked: 1, totalStars: 0, totalShards: 0 };
    saveToUpdate.overdriveMeter = this.overdriveMeter;
    localStorage.setItem('ChronoverseSave', JSON.stringify(saveToUpdate));
    
    // Fix Hub Stats refresh
    saveStr = localStorage.getItem('ChronoverseSave');
    if (saveStr) {
      let save = JSON.parse(saveStr);
      const lvlStat = document.getElementById('hub-stat-level');
      const starsStat = document.getElementById('hub-stat-stars');
      const shardsStat = document.getElementById('hub-stat-shards');
      if (lvlStat) lvlStat.innerText = save.maxLevelUnlocked || 1;
      if (starsStat) starsStat.innerText = save.totalStars || 0;
      if (shardsStat) shardsStat.innerText = save.totalShards || 0;
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
    const { finishDistance, towerFreq, enemyFreq, portalFreq, shardFreq, obstacleGap, maxTowerBlocks } = this.config;
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

      if (this.seededRandom(1) < portalFreq && currentX > (finishDistance * 0.3) && !this.hasSpawnedPortal) {
         this.hasSpawnedPortal = true;
         const portal = this.portals.create(currentX, groundY - 120, 'rift_portal');
         portal.setDisplaySize(80, 160);
         this.tweens.add({ targets: portal, angle: 360, repeat: -1, duration: 4000 });
         currentX += blockSize * 6; // Big safe zone after portal world-swap
         lastWasTower = false;
         continue;
      }

      if (this.seededRandom(1) < towerFreq && !lastWasTower) {
        const heightMultiplier = Math.ceil(this.seededRandom(maxTowerBlocks || 1, 1)); // Random 1 to max
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
  }

  spawnEnemy(x, y) {
    const enemyKey = this.activeWorld.enemies[Math.floor(this.seededRandom(this.activeWorld.enemies.length))];
    const enemy = this.spikes.create(x, y - 50, enemyKey); // -50 so feet sit exactly on floor
    enemy.setDisplaySize(80, 80);
    enemy.setFlipX(false); // Enemies face left by default (toward approaching player)
  }

  spawnShard(x, y) {
    const shard = this.add.text(x, y, '💎', { fontSize: '32px' }).setOrigin(0.5);
    this.tweens.add({ targets: shard, y: y - 10, yoyo: true, repeat: -1, duration: 500 });
    this.shards.add(shard);
  }

  hitPortal(player, portal) {
    if (portal.isFinishLine) return;
    
    portal.destroy();
    SoundFX.play('levelup');
    this.cameras.main.flash(300, 255, 255, 255);
    
    // Worlds Collide: swap background, enemies, and color theme
    let newWorld;
    do {
      newWorld = this.config.worlds[Math.floor(Math.random() * this.config.worlds.length)];
    } while (newWorld.key === this.activeWorld.key && this.config.worlds.length > 1);
    
    this.activeWorld = newWorld;
    this.cameras.main.setBackgroundColor('#000000');
    
    // Update all existing enemies ahead of the player to the new world's theme
    if (this.spikes) {
      this.spikes.getChildren().forEach(enemy => {
        if (enemy.x > this.player.x) {
          const newEnemyKey = this.activeWorld.enemies[Math.floor(Math.random() * this.activeWorld.enemies.length)];
          enemy.setTexture(newEnemyKey);
          enemy.setDisplaySize(80, 80);
        }
      });
    }
    
    // Swap background — force exact dimensions
    const { width, height } = this.cameras.main;
    this.bg.destroy();
    this.bg = this.add.image(0, 0, newWorld.bg);
    this.bg.setOrigin(0, 0);
    this.bg.setDisplaySize(width, height);
    this.bg.setDepth(-1);
    this.bg.setScrollFactor(0);
    this.bg.setTint(0x999999);
  }

  collectShard(player, shard) {
    shard.destroy();
    this.shardsCollected++;
    this.scoreText.setText(`💎 ${this.shardsCollected}`);
    SoundFX.play('hit');
    
    if (!this.isOverdrive) {
      this.overdriveMeter++;
      const fill = Math.min(this.overdriveMeter / 10, 1);
      this.overdriveBar.width = 100 * fill;
      
      if (this.overdriveMeter >= 10) {
        this.enterOverdrive();
      }
    }
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
    this.scoreText.setText(`💎 ${this.shardsCollected}`);
    
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
    let saveStr = localStorage.getItem('ChronoverseSave');
    let save = saveStr ? JSON.parse(saveStr) : { maxLevelUnlocked: 1, totalStars: 0, totalShards: 0 };
    save.overdriveMeter = this.overdriveMeter;
    localStorage.setItem('ChronoverseSave', JSON.stringify(save));

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
    let saveStr = localStorage.getItem('ChronoverseSave');
    let save = saveStr ? JSON.parse(saveStr) : { maxLevelUnlocked: 1, totalStars: 0, totalShards: 0 };
    save.maxLevelUnlocked = Math.max(save.maxLevelUnlocked, this.levelNum + 1);
    save.totalShards = (save.totalShards || 0) + this.shardsCollected;
    save.overdriveMeter = this.overdriveMeter; // persist overdrive meter
    localStorage.setItem('ChronoverseSave', JSON.stringify(save));

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
      { id: 'alien_brute', quote: "WE ARE VENOM... AND WE ARE FAST! GOOD JOB!" }
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
    const statsText = this.add.text(width/2 + 60, height/2 + 20, `💎 +${this.shardsCollected} Shards`, {
      fontFamily: 'Arial Black', fontSize: '24px', color: '#06b6d4', stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(1002).setAlpha(0);
    this.tweens.add({ targets: statsText, alpha: 1, duration: 500, delay: 400 });

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
    homeBtn.on('pointerdown', () => this.exitToHub());
    nextBtn.on('pointerdown', () => {
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
      [this.blocks, this.spikes, this.portals, this.shards].forEach(group => {
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
    } else {
      // Idle float waiting for start
      this.player.body.allowGravity = false;
      this.player.setVelocityY(Math.sin(this.time.now / 300) * 50);
    }
  }
}
