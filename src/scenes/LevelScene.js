/* ========================================
   LEVEL SCENE — Auto-runner gameplay
   ======================================== */

class LevelScene extends Phaser.Scene {
  constructor() {
    super('LevelScene');
  }

  init(data) {
    this.worldId = data.worldId;
    this.levelId = data.levelId;

    // Find world and level data
    this.worldData = WORLDS.find(w => w.id === this.worldId);
    this.levelData = this.worldData.levels.find(l => l.id === this.levelId);
  }

  create() {
    const { width, height } = this.cameras.main;
    const save = SaveSystem.load();

    this.cameras.main.fadeIn(300);

    // Init audio on first touch
    this.input.once('pointerdown', () => SoundFX.init());
    SoundFX.init();

    // Initialize 3D Engine
    if (!window.ThreeInstance) {
      window.ThreeInstance = new ThreeEngine();
    }
    window.ThreeInstance.setRunning(false);

    this.score = 0;
    this.shardsCollected = 0;
    this.health = 3;
    this.maxHealth = 3;
    this.isAlive = true;
    this.gameSpeed = 3;
    this.distanceTraveled = 0;
    this.levelLength = (this.levelData.shards || 20) * 150; // Much longer levels
    this.hitCooldown = false;
    this.powerups = [];
    this.powerupTimer = 0;
    this.hasShield = false;
    this.speedBoostTimer = 0;

    this.isSwinging = false;
    this.swingTimer = 0;
    this.anchors = [];
    this.swingWeb = this.add.rectangle(0, 0, 4, 100, 0xffffff).setOrigin(0.5, 0).setAlpha(0).setDepth(40);

    // ── PARALLAX BACKGROUND ──
    const bgKey = this.worldData.bg;
    if (this.textures.exists(bgKey)) {
      this.bg1 = this.add.tileSprite(width / 2, height / 2, width, height, bgKey);
      this.bg1.setAlpha(0.5);
    } else {
      // Procedural background
      const worldColor = Phaser.Display.Color.HexStringToColor(this.worldData.color);
      const bgRect = this.add.rectangle(width / 2, height / 2, width, height,
        Phaser.Display.Color.GetColor(
          Math.floor(worldColor.red * 0.15),
          Math.floor(worldColor.green * 0.15),
          Math.floor(worldColor.blue * 0.15)
        ));
      bgRect.setAlpha(0); // Hide for 3D

      // Starfield for space worlds
      for (let i = 0; i < 50; i++) {
        const star = this.add.circle(
          Math.random() * width, Math.random() * height,
          Math.random() * 2, 0xffffff, Math.random() * 0.5
        );
        star.setAlpha(0); // Hide for 3D
        this.tweens.add({ targets: star, alpha: { from: star.alpha, to: 0 }, yoyo: true, repeat: -1, duration: 1000 + Math.random() * 2000 });
      }
    }

    // ── GROUND ──
    const groundY = height - 60;
    this.groundY = groundY;
    const groundColor = Phaser.Display.Color.HexStringToColor(this.worldData.color).color;

    // Visual ground with platform look
    const g1 = this.add.rectangle(width / 2, groundY + 30, width, 60, 0x111122, 0.9);
    const g2 = this.add.rectangle(width / 2, groundY, width, 4, groundColor, 0.7);
    const g3 = this.add.rectangle(width / 2, groundY + 2, width, 2, 0xffffff, 0.1);
    g1.setAlpha(0); g2.setAlpha(0); g3.setAlpha(0); // Hide for 3D

    // Scrolling ground grid lines
    this.groundScroll = this.add.tileSprite(width / 2, groundY + 30, width, 60, '__DEFAULT');
    this.groundScroll.setVisible(false);

    // Ground hash marks for motion feel
    for (let gx = 0; gx < width; gx += 40) {
      this.add.rectangle(gx, groundY + 30, 1, 60, 0xffffff, 0.03);
    }

    // ── MOBILE TOUCH ZONES ──
    // Subtle zone divider
    const zoneY = height * 0.6;
    this.add.rectangle(width / 2, zoneY, width, 1, 0xffffff, 0.04);

    // Zone labels (fade out after 3 seconds)
    const jumpHint = this.add.text(width - 60, zoneY - 30, '👆 JUMP', {
      fontFamily: 'Arial', fontSize: '10px', color: '#ffffff',
    }).setOrigin(0.5).setAlpha(0.3).setDepth(50);
    const attackHint = this.add.text(width - 60, zoneY + 20, '👇 WEB!', {
      fontFamily: 'Arial', fontSize: '10px', color: '#ffffff',
    }).setOrigin(0.5).setAlpha(0.3).setDepth(50);
    this.tweens.add({ targets: [jumpHint, attackHint], alpha: 0, delay: 3000, duration: 1000 });

    // ── PLAYER ──
    const charKey = save.selectedChar;
    this.playerX = 100;
    this.playerY = groundY - 50;
    this.playerVY = 0;
    this.isJumping = false;
    this.isDucking = false;
    this.primaryChar = save.selectedChar;
    this.secondaryChar = 'jedi_kid';

    if (window.ThreeInstance) {
      window.ThreeInstance.loadCharacter(this.primaryChar);
    }

    if (this.textures.exists(charKey)) {
      this.player = this.add.image(this.playerX, this.playerY, charKey);
      this.player.setDisplaySize(120, 120);
    } else {
      // Fallback colored rectangle with emoji
      this.player = this.add.rectangle(this.playerX, this.playerY, 40, 48, 0xe63946);
      this.player.setStrokeStyle(2, 0xffffff, 0.5);
    }
    // Hide 2D player since Three.js renders the 3D version
    this.player.setAlpha(0);

    // Player glow effect
    this.playerGlow = this.add.circle(this.playerX, this.playerY, 30, groundColor, 0);
    this.tweens.add({ targets: this.playerGlow, alpha: { from: 0, to: 0.15 }, yoyo: true, repeat: -1, duration: 1000 });

    // ── ENEMIES ──
    this.enemies = [];
    this.enemySpawnTimer = 0;
    this.enemySpawnRate = this.levelData.isTutorial ? 180 : 70; // frames between spawns

    // ── SHARDS (collectibles) ──
    this.shards = [];
    this.shardSpawnTimer = 0;

    // ── ATTACK EFFECT ──
    this.attackActive = false;
    this.attackCooldown = 0;

    // Web/attack line visual
    this.attackLine = this.add.rectangle(this.playerX + 50, this.playerY, 80, 4, 0xffffff);
    this.attackLine.setAlpha(0);

    // ── HUD ──
    // HUD background strip for readability
    this.add.rectangle(width / 2, 28, width, 56, 0x000000, 0.4).setDepth(99);

    // Hearts
    this.heartsText = this.add.text(16, 16, '', {
      fontSize: '22px',
    }).setDepth(100);
    this.updateHearts();

    // Score / Shards
    this.scoreText = this.add.text(width - 16, 16, `💎 0`, {
      fontFamily: 'Arial Black',
      fontSize: '16px',
      color: '#06b6d4',
    }).setOrigin(1, 0).setDepth(100);

    // Level name
    this.add.text(width / 2, 16, `${this.worldData.icon} ${this.levelData.name}`, {
      fontFamily: 'Arial Black',
      fontSize: '14px',
      color: '#ffffff',
    }).setOrigin(0.5, 0).setDepth(100);

    // Progress bar (level completion)
    const barWidth = 200;
    this.progressBg = this.add.rectangle(width / 2, 42, barWidth, 6, 0x333333).setDepth(100);
    this.progressFill = this.add.rectangle(width / 2 - barWidth / 2, 42, 1, 6, groundColor).setOrigin(0, 0.5).setDepth(100);

    // Back button
    const backBtn = this.add.text(16, height - 30, '← QUIT', {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#666666',
      backgroundColor: '#111111',
      padding: { x: 8, y: 4 },
    }).setDepth(100).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('HubScene'));

    // Tap top = jump, Bottom left = duck, Bottom right = attack
    this.input.on('pointerdown', (pointer) => {
      if (!this.isAlive) return;
      if (pointer.y < height * 0.6) {
        this.jump();
      } else {
        if (pointer.x < width / 2) {
          this.duck(true);
        } else {
          this.attack();
        }
      }
    });

    this.input.on('pointerup', () => {
      if (this.isDucking) this.duck(false);
    });

    // Tag-Team Button
    this.tagBtn = this.add.text(width / 2, 70, '🔄 TAG TEAM', {
      fontFamily: 'Arial Black', fontSize: '12px', color: '#ffffff', backgroundColor: '#e63946', padding: { x: 8, y: 4 }, borderRadius: 4
    }).setOrigin(0.5).setDepth(100).setInteractive({ useHandCursor: true });
    this.tagBtn.on('pointerdown', () => this.tagSwap());

    // ── TUTORIAL OVERLAY ──
    if (this.levelData.isTutorial) {
      this.showTutorial();
    }

    // ── BOSS MODE ──
    this.isBossLevel = !!this.levelData.isBoss;
    this.boss = null;
    this.bossHP = 0;
    this.bossMaxHP = 0;
    this.bossPhase = 0;
    this.bossAttackTimer = 0;

    if (this.isBossLevel) {
      this.levelLength = 999999; // Boss levels don't end by distance
      const bossNames = { doc_ock: 'DOC OCK 🐙', goblin: 'GREEN GOBLIN 👺', dark_warrior: 'DARTH VENOM 😈', rift_king: 'RIFT KING 💀' };
      const bossHP = { doc_ock: 8, goblin: 10, dark_warrior: 12, rift_king: 15 };
      const bossKey = this.levelData.boss || 'doc_ock';

      this.bossMaxHP = bossHP[bossKey] || 8;
      this.bossHP = this.bossMaxHP;

      // Boss sprite (large enemy)
      const bx = width - 120;
      const by = this.groundY - 50;
      this.boss = this.add.circle(bx, by, 40, 0xff2222, 0.6);
      this.boss.setStrokeStyle(3, 0xff4444);

      const bossEmoji = bossKey === 'doc_ock' ? '🐙' : bossKey === 'goblin' ? '👺' : bossKey === 'dark_warrior' ? '😈' : '💀';
      this.bossLabel = this.add.text(bx, by, bossEmoji, { fontSize: '40px' }).setOrigin(0.5);

      // Boss name
      const bossName = bossNames[bossKey] || 'BOSS';
      this.add.text(width / 2, 56, `⚔️ ${bossName}`, {
        fontFamily: 'Arial Black', fontSize: '13px', color: '#ff4444',
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(100);

      // Boss HP bar
      this.bossHPBg = this.add.rectangle(width - 120, 20, 150, 10, 0x333333).setDepth(100);
      this.bossHPFill = this.add.rectangle(width - 120, 20, 150, 10, 0xff2222).setDepth(100);

      SoundFX.play('boss');
    }

    // ── GAME LOOP ──
    this.isRunning = !this.levelData.isTutorial;
  }

  showTutorial() {
    const { width, height } = this.cameras.main;
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8).setDepth(200);

    const title = this.add.text(width / 2, height / 2 - 80, `Ready, ${HERO_NAME}? 🕸️`, {
      fontFamily: 'Arial Black',
      fontSize: '28px',
      color: '#e63946',
    }).setOrigin(0.5).setDepth(201);

    const instTop = this.add.text(width / 2, height / 2 - 20, '👆 TAP TOP = JUMP (Double-Tap to Swing!)', {
      fontFamily: 'Arial Black',
      fontSize: '18px',
      color: '#22d3ee',
    }).setOrigin(0.5).setDepth(201);

    const instBot = this.add.text(width / 2, height / 2 + 20, '👇 LEFT = DUCK | RIGHT = ATTACK', {
      fontFamily: 'Arial Black',
      fontSize: '16px',
      color: '#e63946',
    }).setOrigin(0.5).setDepth(201);

    const goBtn = this.add.rectangle(width / 2, height / 2 + 80, 200, 44, 0xe63946).setDepth(201).setInteractive({ useHandCursor: true });
    const goText = this.add.text(width / 2, height / 2 + 80, 'GO WEB GO! 🕸️', {
      fontFamily: 'Arial Black',
      fontSize: '18px',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(202);

    goBtn.on('pointerdown', () => {
      overlay.destroy(); title.destroy(); instTop.destroy(); instBot.destroy(); goBtn.destroy(); goText.destroy();
      this.isRunning = true;
      if (window.ThreeInstance) window.ThreeInstance.setRunning(true);
    });
  }

  jump() {
    if (!this.isJumping && !this.isSwinging) {
      this.playerVY = -12;
      this.isJumping = true;
      SoundFX.play('jump');
    } else if (this.isJumping && !this.isSwinging) {
      // Initiate Web Swing!
      this.isSwinging = true;
      this.swingTimer = 50; // frames to swing
      this.playerVY = -5; // upward boost
      SoundFX.play('web');
      this.swingWeb.setAlpha(1);

      // Find nearest anchor or spawn a temporary one
      let anchor = this.anchors.find(a => a.x > this.playerX && a.x < this.playerX + 300);
      if (!anchor) {
        anchor = this.add.circle(this.playerX + 150, 40, 8, 0xaaaaaa);
        this.anchors.push(anchor);
      }
      this.currentAnchor = anchor;
    }
  }

  tagSwap() {
    SoundFX.play('jump');
    this.cameras.main.flash(200, 255, 255, 255);
    const currentChar = this.player.texture.key;
    const nextChar = currentChar === this.primaryChar ? this.secondaryChar : this.primaryChar;
    
    if (this.textures.exists(nextChar)) {
      this.player.setTexture(nextChar);
    }

    if (window.ThreeInstance) {
      window.ThreeInstance.loadCharacter(nextChar);
    }
  }

  duck(isDown) {
    if (this.isJumping || this.isSwinging) return;
    this.isDucking = isDown;
    if (isDown) {
      this.player.setDisplaySize(120, 70);
      this.playerY = this.groundY - 25;
    } else {
      this.player.setDisplaySize(120, 120);
      this.playerY = this.groundY - 50;
    }
  }

  attack() {
    if (this.attackCooldown > 0) return;
    this.attackActive = true;
    this.attackCooldown = 20;
    const isJedi = this.player.texture.key.includes('jedi');
    SoundFX.play(isJedi ? 'saber' : 'web');

    // Show attack visual
    this.attackLine.setPosition(this.playerX + 60, this.player.y);
    this.attackLine.setAlpha(0.8);
    this.tweens.add({
      targets: this.attackLine,
      scaleX: { from: 0.3, to: 1.5 },
      alpha: { from: 0.8, to: 0 },
      duration: 200,
      onComplete: () => { this.attackActive = false; },
    });

    // Check enemy hits
    this.enemies.forEach((e) => {
      if (!e.alive) return;
      const dx = e.sprite.x - this.playerX;
      const dy = Math.abs(e.sprite.y - this.player.y);
      if (dx > 0 && dx < 150 && dy < 50) {
        if (this.isDucking && !isJedi) {
          this.webThrow(e);
        } else {
          this.hitEnemy(e);
        }
      }
    });

    // Check boss hit
    if (this.isBossLevel && this.boss && this.bossHP > 0) {
      const dx = this.boss.x - this.playerX;
      const dy = Math.abs(this.boss.y - this.player.y);
      if (dx > 0 && dx < 180 && dy < 60) {
        this.bossHP--;
        SoundFX.play('hit');
        this.bossHPFill.width = 150 * (this.bossHP / this.bossMaxHP);

        // Flash boss
        this.tweens.add({ targets: [this.boss, this.bossLabel], alpha: 0.2, yoyo: true, duration: 100, repeat: 2 });

        // Phase transitions
        const phasePct = this.bossHP / this.bossMaxHP;
        if (phasePct <= 0.3 && this.bossPhase < 2) {
          this.bossPhase = 2;
          this.boss.setStrokeStyle(4, 0xff0000);
        } else if (phasePct <= 0.6 && this.bossPhase < 1) {
          this.bossPhase = 1;
          this.boss.setFillStyle(0xff4400, 0.7);
        }

        // Boss defeated
        if (this.bossHP <= 0) {
          this.boss.destroy();
          this.bossLabel.destroy();
          this.bossHPFill.destroy();
          this.bossHPBg.destroy();
          // Burst of particles
          for (let i = 0; i < 20; i++) {
            const p = this.add.circle(this.boss.x || 600, this.boss.y || 300, 4, 0xfbbf24);
            this.tweens.add({ targets: p, x: p.x + (Math.random()-0.5)*200, y: p.y + (Math.random()-0.5)*200, alpha: 0, duration: 600, onComplete: () => p.destroy() });
          }
          SoundFX.play('levelup');
          this.shardsCollected += this.levelData.shards || 40;
          this.scoreText.setText(`💎 ${this.shardsCollected}`);
          this.time.delayedCall(1000, () => this.completeLevel());
        }
      }
    }
  }

  hitEnemy(enemy) {
    enemy.alive = false;
    this.score += 10;
    this.shardsCollected += 2;
    this.scoreText.setText(`💎 ${this.shardsCollected}`);
    SoundFX.play('hit');

    if (this.health < this.maxHealth && Math.random() < 0.3) {
      this.spawnPowerup(enemy.sprite.x, enemy.sprite.y, 'heart');
    }

    this.explodeEnemy(enemy);
  }

  webThrow(enemy) {
    enemy.alive = false;
    this.score += 20;
    this.shardsCollected += 3;
    this.scoreText.setText(`💎 ${this.shardsCollected}`);
    SoundFX.play('web');
    
    // Draw web line to enemy
    const web = this.add.line(0, 0, this.playerX, this.player.y, enemy.sprite.x, enemy.sprite.y, 0xffffff).setOrigin(0).setDepth(90);
    web.setLineWidth(3);
    
    // Animate enemy spinning overhead and thrown backwards
    this.tweens.add({
      targets: enemy.sprite,
      x: this.playerX - 250,
      y: this.player.y - 150,
      angle: -360,
      duration: 400,
      ease: 'Quad.easeOut',
      onUpdate: () => {
        web.setTo(this.playerX, this.player.y, enemy.sprite.x, enemy.sprite.y);
        if (enemy.label) enemy.label.setPosition(enemy.sprite.x, enemy.sprite.y);
      },
      onComplete: () => {
        web.destroy();
        this.explodeEnemy(enemy);
      }
    });
  }

  explodeEnemy(enemy) {
    if (window.ThreeInstance && enemy.id) {
      window.ThreeInstance.removeEnemy(enemy.id);
    }

    // Burst of particles
    for (let i = 0; i < 12; i++) {
      const p = this.add.circle(enemy.sprite.x, enemy.sprite.y, 4, 0xffffff);
      this.tweens.add({
        targets: p,
        x: p.x + (Math.random() - 0.5) * 150,
        y: p.y + (Math.random() - 0.5) * 150,
        alpha: 0,
        duration: 400,
        onComplete: () => p.destroy(),
      });
    }

    // Dissolve / explode animation
    this.tweens.add({
      targets: enemy.sprite,
      scaleX: 2.5,
      scaleY: 2.5,
      alpha: 0,
      angle: 180,
      duration: 300,
      onComplete: () => {
        if (enemy.sprite) enemy.sprite.destroy();
      }
    });

    if (enemy.label) {
      this.tweens.add({
        targets: enemy.label,
        y: enemy.label.y - 50,
        alpha: 0,
        duration: 300,
        onComplete: () => enemy.label.destroy(),
      });
    }
  }

  takeDamage() {
    if (this.hitCooldown || !this.isAlive) return;
    this.health--;
    this.updateHearts();
    this.hitCooldown = true;

    // Shield absorbs hit
    if (this.hasShield) {
      this.hasShield = false;
      this.health++;
      this.updateHearts();
      if (this.shieldIcon) this.shieldIcon.destroy();
      SoundFX.play('hit');
      return;
    }
    SoundFX.play('hurt');
    this.cameras.main.flash(200, 255, 0, 0);
    this.player.setAlpha(0.4);
    this.time.delayedCall(1000, () => {
      this.hitCooldown = false;
      if (this.player) this.player.setAlpha(1);
    });

    if (this.health <= 0) {
      this.die();
    }
  }

  die() {
    this.isAlive = false;
    this.isRunning = false;
    SoundFX.play('die');

    const { width, height } = this.cameras.main;
    this.cameras.main.shake(300);

    this.time.delayedCall(800, () => {
      const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85).setDepth(200);
      this.add.text(width / 2, height / 2 - 40, 'Try Again, Hero!', {
        fontFamily: 'Arial Black',
        fontSize: '24px',
        color: '#e63946',
      }).setOrigin(0.5).setDepth(201);

      this.add.text(width / 2, height / 2 + 5, `💎 ${this.shardsCollected} shards collected`, {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#aaaaaa',
      }).setOrigin(0.5).setDepth(201);

      const retryBtn = this.add.rectangle(width / 2, height / 2 + 50, 140, 40, 0xe63946).setDepth(201).setInteractive({ useHandCursor: true });
      this.add.text(width / 2, height / 2 + 50, 'RETRY', {
        fontFamily: 'Arial Black',
        fontSize: '16px',
        color: '#ffffff',
      }).setOrigin(0.5).setDepth(202);
      retryBtn.on('pointerdown', () => this.scene.restart());

      const hubBtn = this.add.rectangle(width / 2, height / 2 + 100, 140, 36, 0x333333).setDepth(201).setInteractive({ useHandCursor: true });
      this.add.text(width / 2, height / 2 + 100, 'HUB', {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#888888',
      }).setOrigin(0.5).setDepth(202);
      hubBtn.on('pointerdown', () => this.scene.start('HubScene'));
    });
  }

  completeLevel() {
    this.isRunning = false;
    this.isAlive = false;

    const { width, height } = this.cameras.main;

    // Calculate stars
    const shardPct = this.shardsCollected / (this.levelData.shards || 20);
    let stars = 1;
    if (shardPct >= 0.8) stars = 2;
    if (shardPct >= 0.8 && this.health >= 3) stars = 3;

    // Save progress
    SaveSystem.setStars(this.levelId, stars);
    SaveSystem.addShards(this.shardsCollected);

    // Check if world is complete — unlock next world + character
    const world = this.worldData;
    const allLevelsDone = world.levels.every(l => {
      const s = SaveSystem.load().stars[l.id];
      return s !== undefined && s > 0;
    });

    if (allLevelsDone && world.unlockChar) {
      SaveSystem.unlockChar(world.unlockChar);
      if (world.id < 4) SaveSystem.unlockWorld(world.id + 1);
    }

    // Victory screen
    this.time.delayedCall(400, () => {
      const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.88).setDepth(200);

      SoundFX.play('levelup');
      this.add.text(width / 2, height / 2 - 70, '🎉 LEVEL COMPLETE!', {
        fontFamily: 'Arial Black',
        fontSize: '22px',
        color: '#fbbf24',
      }).setOrigin(0.5).setDepth(201);

      // Stars
      this.add.text(width / 2, height / 2 - 30, '⭐'.repeat(stars) + '☆'.repeat(3 - stars), {
        fontSize: '32px',
      }).setOrigin(0.5).setDepth(201);

      this.add.text(width / 2, height / 2 + 10, `💎 ${this.shardsCollected} Rift Shards`, {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#06b6d4',
      }).setOrigin(0.5).setDepth(201);

      if (allLevelsDone && world.unlockChar) {
        const charData = CHARACTERS[world.unlockChar];
        this.add.text(width / 2, height / 2 + 40, `🎉 NEW CHARACTER: ${charData.name}!`, {
          fontFamily: 'Arial Black',
          fontSize: '14px',
          color: '#22d3ee',
        }).setOrigin(0.5).setDepth(201);
      }

      const nextBtn = this.add.rectangle(width / 2, height / 2 + 85, 160, 40, 0xe63946).setDepth(201).setInteractive({ useHandCursor: true });
      this.add.text(width / 2, height / 2 + 85, 'CONTINUE', {
        fontFamily: 'Arial Black',
        fontSize: '16px',
        color: '#ffffff',
      }).setOrigin(0.5).setDepth(202);
      nextBtn.on('pointerdown', () => {
        // Check if story should be shown for world completion
        if (allLevelsDone && STORY_PANELS[world.storyComplete] && !SaveSystem.isStoryViewed(world.storyComplete)) {
          this.scene.start('StoryScene', {
            storyId: world.storyComplete,
            nextScene: 'HubScene',
          });
        } else {
          this.scene.start('HubScene');
        }
      });
    });
  }

  updateHearts() {
    let txt = '';
    for (let i = 0; i < this.maxHealth; i++) {
      txt += i < this.health ? '❤️' : '🖤';
    }
    this.heartsText.setText(txt);
  }

  spawnEnemy() {
    const { width } = this.cameras.main;
    const types = this.levelData.enemies || ['thug'];
    const type = types[Math.floor(Math.random() * types.length)];

    const enemyKey = `enemy_${type}`;
    const x = width + 40;
    const y = this.groundY - 45;

    let sprite;
    if (this.textures.exists(enemyKey)) {
      sprite = this.add.image(x, y, enemyKey);
      sprite.setDisplaySize(100, 100);
    } else {
      sprite = this.add.rectangle(x, y, 36, 42, 0xff4444, 0.7);
      sprite.setStrokeStyle(2, 0xff6666);
    }

    const emoji = type === 'trooper' ? '🪖' : type === 'symbiote' ? '🕷️' : type === 'drone' ? '🛸' : '👊';
    const label = this.add.text(x, y, emoji, { fontSize: '20px' }).setOrigin(0.5);

    const enemyId = 'enemy_' + Date.now() + '_' + Math.random();
    
    this.enemies.push({
      id: enemyId,
      sprite: sprite,
      label: label,
      type: type,
      speed: 1 + Math.random() * 2,
      alive: true,
    });

    if (window.ThreeInstance) {
      window.ThreeInstance.spawnEnemy(enemyId);
    }
  }

  spawnPowerup(x, y, type) {
    const emoji = type === 'heart' ? '❤️' : type === 'shield' ? '🛡️' : '⚡';
    const pu = this.add.text(x, y, emoji, { fontSize: '22px' }).setOrigin(0.5);
    this.tweens.add({ targets: pu, y: pu.y - 8, yoyo: true, repeat: -1, duration: 500 });
    this.powerups.push({ sprite: pu, type, collected: false });
  }

  spawnShard() {
    const { width } = this.cameras.main;
    const x = width + 20;
    const y = this.groundY - 40 - Math.random() * 100;

    const shard = this.add.text(x, y, '💎', { fontSize: '18px' }).setOrigin(0.5);
    this.tweens.add({ targets: shard, y: shard.y - 5, yoyo: true, repeat: -1, duration: 600, ease: 'Sine.easeInOut' });

    this.shards.push({ sprite: shard, collected: false });
  }

  update() {
    if (!this.isRunning) return;

    const { width, height } = this.cameras.main;

    // Scroll background
    if (this.bg1) {
      this.bg1.tilePositionX += this.gameSpeed * 0.3;
    }

    // Player physics (gravity + jump + swing)
    if (this.isSwinging) {
      this.swingTimer--;
      this.playerVY += 0.15; // very low gravity for floaty arc
      this.playerY += this.playerVY;

      if (this.currentAnchor) {
        this.swingWeb.x = this.currentAnchor.x;
        this.swingWeb.y = this.currentAnchor.y;
        this.swingWeb.height = Phaser.Math.Distance.Between(this.currentAnchor.x, this.currentAnchor.y, this.playerX, this.playerY);
        this.swingWeb.rotation = Phaser.Math.Angle.Between(this.currentAnchor.x, this.currentAnchor.y, this.playerX, this.playerY) - Math.PI/2;
      }

      if (this.swingTimer <= 0) {
        this.isSwinging = false;
        this.swingWeb.setAlpha(0);
        this.playerVY = 0; // slight drop
      }
    } else {
      this.playerVY += 0.6; // normal gravity
      this.playerY += this.playerVY;
    }

    if (this.playerY >= this.groundY - 50) {
      this.playerY = this.groundY - 50;
      this.playerVY = 0;
      this.isJumping = false;
      if (this.isSwinging) {
        this.isSwinging = false;
        this.swingWeb.setAlpha(0);
      }
    }

    this.player.y = this.playerY;
    this.playerGlow.y = this.playerY;

    if (window.ThreeInstance) {
      window.ThreeInstance.setSpeed(this.gameSpeed);
      window.ThreeInstance.syncPlayer(this.playerY, this.isDucking, this.isSwinging, this.player.texture.key);
    }
    if (this.attackLine.alpha > 0) {
      this.attackLine.y = this.playerY;
    }

    // Bob animation when running
    if (!this.isJumping) {
      this.player.y += Math.sin(Date.now() * 0.008) * 2;
    }

    // Distance / progress
    this.distanceTraveled += this.gameSpeed;
    const progress = Math.min(this.distanceTraveled / this.levelLength, 1);
    this.progressFill.width = 200 * progress;

    // Speed increase
    this.gameSpeed = 3 + progress * 2;

    // Level complete
    if (progress >= 1) {
      this.completeLevel();
      return;
    }

    // Attack cooldown
    if (this.attackCooldown > 0) this.attackCooldown--;

    // Boss attack pattern
    if (this.isBossLevel && this.boss && this.bossHP > 0) {
      this.bossAttackTimer++;
      const attackRate = Math.max(40, 80 - this.bossPhase * 20);
      if (this.bossAttackTimer >= attackRate) {
        this.bossAttackTimer = 0;
        // Launch projectile
        const proj = this.add.circle(this.boss.x - 30, this.boss.y, 8, 0xff4444);
        proj.setStrokeStyle(2, 0xff6666);
        this.enemies.push({ sprite: proj, label: null, type: 'projectile', alive: true, speed: 4 + this.bossPhase * 2 });
      }
      // Boss bounce animation
      this.boss.y = this.groundY - 50 + Math.sin(Date.now() * 0.003) * 15;
      this.bossLabel.y = this.boss.y;
    }

    // Spawn enemies (reduced rate in boss levels)
    this.enemySpawnTimer++;
    const spawnThreshold = this.isBossLevel ? Math.max(120, this.enemySpawnRate) : this.enemySpawnRate;
    if (this.enemySpawnTimer >= spawnThreshold) {
      this.enemySpawnTimer = 0;
      this.spawnEnemy();
      this.enemySpawnRate = Math.max(40, this.enemySpawnRate - 2);
    }

    // Spawn swing anchors periodically
    if (!this.isBossLevel && Math.random() < 0.02) {
      const ax = width + 50;
      const ay = 40 + Math.random() * 40;
      const a = this.add.circle(ax, ay, 8, 0x555555);
      a.setStrokeStyle(2, 0x888888);
      this.anchors.push(a);
    }

    // Move anchors
    for (let i = this.anchors.length - 1; i >= 0; i--) {
      const a = this.anchors[i];
      a.x -= this.gameSpeed;
      if (a.x < -50) {
        a.destroy();
        this.anchors.splice(i, 1);
      }
    }

    // Spawn shards
    this.shardSpawnTimer++;
    if (this.shardSpawnTimer >= 40) {
      this.shardSpawnTimer = 0;
      if (Math.random() < 0.6) this.spawnShard();
    }

    // Move enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (!e.alive) continue;
      e.sprite.x -= this.gameSpeed + e.speed;
      if (e.label) e.label.x = e.sprite.x;

      // Player collision
      const dx = Math.abs(e.sprite.x - this.playerX);
      const dy = Math.abs(e.sprite.y - this.playerY);
      if (dx < 45 && dy < 55) {
        this.takeDamage();
        e.alive = false;
        this.explodeEnemy(e);
        this.enemies.splice(i, 1);
        continue;
      }

      // Off screen
      if (e.sprite.x < -60) {
        e.sprite.destroy();
        if (e.label) e.label.destroy();
        this.enemies.splice(i, 1);
      }
    }

    // Move shards
    for (let i = this.shards.length - 1; i >= 0; i--) {
      const s = this.shards[i];
      if (s.collected) continue;
      s.sprite.x -= this.gameSpeed;

      // Collection check
      const dx = Math.abs(s.sprite.x - this.playerX);
      const dy = Math.abs(s.sprite.y - this.playerY);
      if (dx < 30 && dy < 40) {
        s.collected = true;
        this.shardsCollected++;
        this.scoreText.setText(`💎 ${this.shardsCollected}`);
        SoundFX.play('collect');

        // Collect animation
        this.tweens.add({
          targets: s.sprite,
          y: s.sprite.y - 30,
          alpha: 0,
          scaleX: 2,
          scaleY: 2,
          duration: 300,
          onComplete: () => s.sprite.destroy(),
        });
        this.shards.splice(i, 1);
        continue;
      }

      // Off screen
      if (s.sprite.x < -30) {
        s.sprite.destroy();
        this.shards.splice(i, 1);
      }
    }

    // Move power-ups
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const pu = this.powerups[i];
      if (pu.collected) continue;
      pu.sprite.x -= this.gameSpeed * 0.5;
      const dx = Math.abs(pu.sprite.x - this.playerX);
      const dy = Math.abs(pu.sprite.y - this.playerY);
      if (dx < 35 && dy < 45) {
        pu.collected = true;
        SoundFX.play('powerup');
        if (pu.type === 'heart' && this.health < this.maxHealth) {
          this.health++;
          this.updateHearts();
        } else if (pu.type === 'shield') {
          this.hasShield = true;
          this.shieldIcon = this.add.text(this.playerX, this.playerY - 40, '🛡️', { fontSize: '16px' }).setOrigin(0.5);
        } else if (pu.type === 'speed') {
          this.speedBoostTimer = 180;
        }
        this.tweens.add({ targets: pu.sprite, y: pu.sprite.y - 30, alpha: 0, scale: 2, duration: 300, onComplete: () => pu.sprite.destroy() });
        this.powerups.splice(i, 1);
        continue;
      }
      if (pu.sprite.x < -30) { pu.sprite.destroy(); this.powerups.splice(i, 1); }
    }

    // Speed boost effect
    if (this.speedBoostTimer > 0) {
      this.speedBoostTimer--;
      this.gameSpeed += 1;
    }

    // Spawn random powerups
    this.powerupTimer++;
    if (this.powerupTimer >= 300) {
      this.powerupTimer = 0;
      const types = ['shield', 'speed'];
      const type = types[Math.floor(Math.random() * types.length)];
      this.spawnPowerup(this.cameras.main.width + 20, this.groundY - 60 - Math.random() * 80, type);
    }

    // Shield follows player
    if (this.hasShield && this.shieldIcon) {
      this.shieldIcon.x = this.playerX;
      this.shieldIcon.y = this.player.y - 40;
    }
  }
}
