/* ========================================
   RIFT INVADERS — Galaga-style Space Shooter
   ======================================== */

class RiftInvadersScene extends Phaser.Scene {
  constructor() {
    super('RiftInvadersScene');
  }

  init() {
    this.score = 0;
    this.wave = 1;
    this.shardsCollected = 0;
    this.playerAlive = true;
    this.shieldActive = false;
    this.rapidFire = false;
    this.spreadShot = false;
    this.lastFired = 0;
    this.fireRate = 350; // ms between shots
    this.activeHero = localStorage.getItem('ChronoverseActiveHero') || 'iron_kid';
  }

  create() {
    const { width, height } = this.cameras.main;

    // ── Rich Space Background ──
    // Nebula gradient base
    const gfx = this.add.graphics().setDepth(0);
    gfx.fillGradientStyle(0x050520, 0x050520, 0x0a1628, 0x120824, 1);
    gfx.fillRect(0, 0, width, height);

    // Nebula clouds
    for (let i = 0; i < 4; i++) {
      const nx = Phaser.Math.Between(0, width);
      const ny = Phaser.Math.Between(0, height);
      const nr = Phaser.Math.Between(100, 250);
      const colors = [0x1a0a3e, 0x0a2040, 0x2a0a28, 0x0a1a30];
      const nebula = this.add.circle(nx, ny, nr, colors[i], 0.15).setDepth(0);
      this.tweens.add({ targets: nebula, alpha: { from: 0.08, to: 0.2 }, duration: Phaser.Math.Between(3000, 6000), yoyo: true, repeat: -1 });
    }

    // Multi-layer parallax starfield
    this.bgTiles = [];
    const starLayers = [
      { count: 40, sizeMin: 1, sizeMax: 1, speedMin: 0.2, speedMax: 0.5, alphaMin: 0.2, alphaMax: 0.4 },
      { count: 30, sizeMin: 1, sizeMax: 2, speedMin: 0.5, speedMax: 1.0, alphaMin: 0.4, alphaMax: 0.7 },
      { count: 15, sizeMin: 2, sizeMax: 3, speedMin: 1.0, speedMax: 2.0, alphaMin: 0.6, alphaMax: 1.0 },
    ];
    starLayers.forEach(layer => {
      for (let i = 0; i < layer.count; i++) {
        const starColor = Phaser.Math.Between(0, 10) < 2 ? 0x88ccff : (Phaser.Math.Between(0, 10) < 1 ? 0xffcc88 : 0xffffff);
        const star = this.add.circle(
          Phaser.Math.Between(0, width), Phaser.Math.Between(0, height),
          Phaser.Math.Between(layer.sizeMin, layer.sizeMax),
          starColor, Phaser.Math.FloatBetween(layer.alphaMin, layer.alphaMax)
        ).setDepth(1);
        star.speed = Phaser.Math.FloatBetween(layer.speedMin, layer.speedMax);
        this.bgTiles.push(star);
      }
    });

    // ── Player Ship ──
    this.player = this.physics.add.sprite(width / 2, height - 80, this.activeHero);
    this.player.setDisplaySize(60, 60);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10);

    // Shield visual
    this.shieldGraphic = this.add.circle(this.player.x, this.player.y, 40, 0x22d3ee, 0.2)
      .setStrokeStyle(2, 0x22d3ee, 0.6).setDepth(9).setVisible(false);

    // ── Groups ──
    this.projectiles = this.physics.add.group();
    this.enemies = this.physics.add.group();
    this.enemyBullets = this.physics.add.group();
    this.powerups = this.physics.add.group();
    this.shards = this.physics.add.group();
    this.particles = [];

    // ── HUD ──
    this.scoreText = this.add.text(10, 10, 'SCORE: 0', {
      fontFamily: 'Arial Black', fontSize: '18px', color: '#22d3ee',
      stroke: '#000', strokeThickness: 3
    }).setDepth(100).setScrollFactor(0);

    this.waveText = this.add.text(width - 10, 10, 'WAVE 1', {
      fontFamily: 'Arial Black', fontSize: '18px', color: '#fbbf24',
      stroke: '#000', strokeThickness: 3
    }).setOrigin(1, 0).setDepth(100).setScrollFactor(0);

    this.shardText = this.add.text(10, 35, '💎 0', {
      fontFamily: 'Arial Black', fontSize: '14px', color: '#06b6d4',
      stroke: '#000', strokeThickness: 2
    }).setDepth(100).setScrollFactor(0);

    // ── Touch/Mouse Input ──
    this.input.on('pointermove', (pointer) => {
      if (this.playerAlive) {
        this.player.x = Phaser.Math.Clamp(pointer.x, 30, width - 30);
      }
    });

    // ── Collisions ──
    this.physics.add.overlap(this.projectiles, this.enemies, this.hitEnemy, null, this);
    this.physics.add.overlap(this.player, this.enemyBullets, this.playerHit, null, this);
    this.physics.add.overlap(this.player, this.enemies, this.playerHit, null, this);
    this.physics.add.overlap(this.player, this.powerups, this.collectPowerup, null, this);
    this.physics.add.overlap(this.player, this.shards, this.collectShard, null, this);

    // ── Start First Wave ──
    this.spawnWave();

    // ── Auto-fire Timer ──
    this.time.addEvent({
      delay: this.fireRate,
      callback: this.autoFire,
      callbackScope: this,
      loop: true
    });

    // ── Resize Handler ──
    this.scale.on('resize', (gameSize) => {
      this.cameras.main.setViewport(0, 0, gameSize.width, gameSize.height);
    });
  }

  // ── Projectile Color Map ──
  getProjectileColor() {
    const map = {
      iron_kid: 0x06b6d4, super_girl: 0xfbbf24, superboy: 0x2563eb,
      cyborg_girl: 0x06b6d4, hero_red: 0xff0000, hero_black: 0x475569,
      telekinetic_girl: 0xa855f7, jedi_kid: 0x22c55e, alien_brute: 0x000000,
      enemy_thug: 0xdc2626, enemy_trooper: 0xffffff
    };
    return map[this.activeHero] || 0x22d3ee;
  }

  autoFire() {
    if (!this.playerAlive) return;
    const { width } = this.cameras.main;
    const color = this.getProjectileColor();

    if (this.spreadShot) {
      [-20, 0, 20].forEach(offset => {
        const bullet = this.add.rectangle(this.player.x + offset, this.player.y - 35, 6, 18, color).setDepth(8);
        this.physics.add.existing(bullet);
        bullet.body.setVelocity(offset * 3, -450);
        this.projectiles.add(bullet);
      });
    } else {
      const bullet = this.add.rectangle(this.player.x, this.player.y - 35, 6, 18, color).setDepth(8);
      this.physics.add.existing(bullet);
      bullet.body.setVelocityY(-500);
      this.projectiles.add(bullet);
    }
  }

  // ── Wave Spawning ──
  spawnWave() {
    const { width } = this.cameras.main;
    const isBoss = this.wave % 5 === 0;

    // Wave announcement
    const announce = this.add.text(width / 2, 200, isBoss ? `⚠️ BOSS WAVE ${this.wave}` : `WAVE ${this.wave}`, {
      fontFamily: 'Arial Black', fontSize: isBoss ? '36px' : '28px',
      color: isBoss ? '#ef4444' : '#fbbf24', stroke: '#000', strokeThickness: 5
    }).setOrigin(0.5).setDepth(100).setAlpha(0);
    this.tweens.add({ targets: announce, alpha: 1, duration: 300 });
    this.tweens.add({ targets: announce, alpha: 0, duration: 300, delay: 1200, onComplete: () => announce.destroy() });

    if (isBoss) {
      this.spawnBoss();
    } else {
      // Formation patterns
      const patterns = ['grid', 'vee', 'circle'];
      const pattern = patterns[this.wave % patterns.length];
      const enemyCount = Math.min(5 + this.wave * 2, 30);
      const enemyTypes = ['enemy_thug', 'enemy_trooper', 'alien_brute'];

      this.time.delayedCall(800, () => {
        for (let i = 0; i < enemyCount; i++) {
          this.time.delayedCall(i * 150, () => {
            const type = enemyTypes[Phaser.Math.Between(0, Math.min(this.wave - 1, 2))];
            const hp = type === 'alien_brute' ? 3 : type === 'enemy_trooper' ? 2 : 1;
            let ex, ey;

            if (pattern === 'grid') {
              const cols = Math.min(enemyCount, 8);
              const spacing = (width - 100) / cols;
              ex = 50 + (i % cols) * spacing + spacing / 2;
              ey = -50 - Math.floor(i / cols) * 60;
            } else if (pattern === 'vee') {
              const half = enemyCount / 2;
              ex = width / 2 + (i - half) * 45;
              ey = -50 - Math.abs(i - half) * 40;
            } else {
              const angle = (i / enemyCount) * Math.PI * 2;
              ex = width / 2 + Math.cos(angle) * 150;
              ey = -200 + Math.sin(angle) * 80;
            }

            const enemy = this.physics.add.sprite(ex, ey, type);
            enemy.setDisplaySize(45, 45).setDepth(8);
            enemy.hp = hp;
            enemy.maxHp = hp;
            enemy.body.setVelocityY(40 + this.wave * 5);
            this.enemies.add(enemy);

            // Sweep movement
            this.tweens.add({
              targets: enemy,
              x: enemy.x + Phaser.Math.Between(-80, 80),
              duration: Phaser.Math.Between(1500, 3000),
              yoyo: true,
              repeat: -1,
              ease: 'Sine.easeInOut'
            });

            // Enemy shooting (occasional)
            if (Phaser.Math.Between(1, 100) <= 30 + this.wave * 2) {
              this.time.addEvent({
                delay: Phaser.Math.Between(2000, 5000),
                callback: () => {
                  if (enemy.active) {
                    const eb = this.add.rectangle(enemy.x, enemy.y + 25, 5, 12, 0xef4444).setDepth(7);
                    this.physics.add.existing(eb);
                    eb.body.setVelocityY(200 + this.wave * 10);
                    this.enemyBullets.add(eb);
                  }
                },
                loop: true
              });
            }
          });
        }
      });
    }
  }

  spawnBoss() {
    const { width } = this.cameras.main;
    const bossType = ['enemy_trooper', 'alien_brute', 'enemy_thug'][Phaser.Math.Between(0, 2)];
    const boss = this.physics.add.sprite(width / 2, -100, bossType);
    boss.setDisplaySize(120, 120).setDepth(8);
    boss.hp = 20 + this.wave * 5;
    boss.maxHp = boss.hp;
    boss.isBoss = true;
    this.enemies.add(boss);

    // Boss movement
    this.tweens.add({
      targets: boss, y: 120, duration: 1500, ease: 'Bounce.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: boss, x: width - 80, duration: 2000, yoyo: true,
          repeat: -1, ease: 'Sine.easeInOut'
        });
        // Boss rapid fire
        this.time.addEvent({
          delay: 800,
          callback: () => {
            if (boss.active) {
              for (let a = -1; a <= 1; a++) {
                const eb = this.add.circle(boss.x + a * 30, boss.y + 65, 5, 0xef4444).setDepth(7);
                this.physics.add.existing(eb);
                eb.body.setVelocity(a * 50, 250);
                this.enemyBullets.add(eb);
              }
            }
          },
          loop: true
        });
      }
    });

    // Boss health bar
    boss.hpBar = this.add.rectangle(width / 2, 60, 300, 12, 0x1e293b).setDepth(100).setStrokeStyle(1, 0x475569);
    boss.hpFill = this.add.rectangle(width / 2 - 150, 60, 300, 12, 0xef4444).setDepth(101).setOrigin(0, 0.5);
    boss.hpLabel = this.add.text(width / 2, 45, 'BOSS', {
      fontFamily: 'Arial Black', fontSize: '12px', color: '#ef4444', stroke: '#000', strokeThickness: 2
    }).setOrigin(0.5).setDepth(101);
  }

  // ── Hit Logic ──
  hitEnemy(projectile, enemy) {
    projectile.destroy();
    enemy.hp--;

    // Flash effect
    enemy.setTint(0xffffff);
    this.time.delayedCall(80, () => { if (enemy.active) enemy.clearTint(); });

    if (enemy.hp <= 0) {
      this.score += enemy.isBoss ? 500 : (enemy.maxHp * 50);
      this.scoreText.setText('SCORE: ' + this.score);

      // Particle burst
      for (let i = 0; i < 8; i++) {
        const p = this.add.circle(enemy.x, enemy.y, Phaser.Math.Between(2, 5),
          Phaser.Math.Between(0, 1) ? 0xfbbf24 : 0xef4444).setDepth(15);
        this.tweens.add({
          targets: p,
          x: p.x + Phaser.Math.Between(-60, 60),
          y: p.y + Phaser.Math.Between(-60, 60),
          alpha: 0, scale: 0, duration: 400,
          onComplete: () => p.destroy()
        });
      }

      // Drop shard
      if (Phaser.Math.Between(1, 100) <= 60) {
        const shard = this.add.polygon(enemy.x, enemy.y, [0,-8, 6,0, 0,8, -6,0], 0x06b6d4, 1).setDepth(8);
        this.physics.add.existing(shard);
        shard.body.setVelocityY(80);
        this.shards.add(shard);
      }

      // Drop powerup (rare)
      if (Phaser.Math.Between(1, 100) <= 10) {
        const types = ['shield', 'rapid', 'spread'];
        const type = types[Phaser.Math.Between(0, 2)];
        const colors = { shield: 0x22d3ee, rapid: 0xfbbf24, spread: 0xa855f7 };
        const pu = this.add.circle(enemy.x, enemy.y, 10, colors[type], 0.8)
          .setStrokeStyle(2, 0xffffff).setDepth(8);
        pu.powerType = type;
        this.physics.add.existing(pu);
        pu.body.setVelocityY(60);
        this.powerups.add(pu);
      }

      // Boss specific cleanup
      if (enemy.isBoss) {
        if (enemy.hpBar) enemy.hpBar.destroy();
        if (enemy.hpFill) enemy.hpFill.destroy();
        if (enemy.hpLabel) enemy.hpLabel.destroy();

        // Lume reward for boss
        const save = SaveSystem.load();
        save.lumes = (save.lumes || 0) + 3;
        SaveSystem.save(save);
      }

      enemy.destroy();

      // Check wave clear
      if (this.enemies.countActive() === 0) {
        this.wave++;
        this.waveText.setText('WAVE ' + this.wave);

        // Lume per 5 waves
        if (this.wave % 5 === 1 && this.wave > 1) {
          const save = SaveSystem.load();
          save.lumes = (save.lumes || 0) + 1;
          SaveSystem.save(save);
        }

        this.time.delayedCall(1500, () => this.spawnWave());
      }
    } else if (enemy.isBoss && enemy.hpFill) {
      enemy.hpFill.setDisplaySize(300 * (enemy.hp / enemy.maxHp), 12);
    }
  }

  playerHit(player, damager) {
    if (this.shieldActive) {
      damager.destroy();
      return;
    }
    if (!this.playerAlive) return;
    this.playerAlive = false;
    damager.destroy();

    // Death flash
    this.cameras.main.shake(300, 0.03);
    this.cameras.main.flash(200, 255, 0, 0);
    player.setTint(0xff0000);

    this.time.delayedCall(500, () => this.showGameOver());
  }

  collectPowerup(player, powerup) {
    const type = powerup.powerType;
    powerup.destroy();

    if (type === 'shield') {
      this.shieldActive = true;
      this.shieldGraphic.setVisible(true);
      this.time.delayedCall(5000, () => { this.shieldActive = false; this.shieldGraphic.setVisible(false); });
    } else if (type === 'rapid') {
      this.rapidFire = true;
      this.time.removeAllEvents();
      this.time.addEvent({ delay: 150, callback: this.autoFire, callbackScope: this, loop: true });
      this.time.delayedCall(4000, () => {
        this.rapidFire = false;
        this.time.removeAllEvents();
        this.time.addEvent({ delay: this.fireRate, callback: this.autoFire, callbackScope: this, loop: true });
      });
    } else if (type === 'spread') {
      this.spreadShot = true;
      this.time.delayedCall(5000, () => { this.spreadShot = false; });
    }

    // Popup text
    const txt = this.add.text(player.x, player.y - 40,
      type === 'shield' ? '🛡️ SHIELD!' : type === 'rapid' ? '⚡ RAPID!' : '🔥 SPREAD!',
      { fontFamily: 'Arial Black', fontSize: '16px', color: '#fbbf24', stroke: '#000', strokeThickness: 3 }
    ).setOrigin(0.5).setDepth(100);
    this.tweens.add({ targets: txt, y: txt.y - 40, alpha: 0, duration: 800, onComplete: () => txt.destroy() });
  }

  collectShard(player, shard) {
    shard.destroy();
    this.shardsCollected++;
    this.shardText.setText('💎 ' + this.shardsCollected);
    this.score += 10;
    this.scoreText.setText('SCORE: ' + this.score);
  }

  showGameOver() {
    const { width, height } = this.cameras.main;

    // Save progress
    const save = SaveSystem.load();
    save.shards = (save.shards || 0) + this.shardsCollected;
    SaveSystem.save(save);

    // Overlay
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7).setDepth(200);
    this.add.text(width / 2, height / 2 - 80, 'GAME OVER', {
      fontFamily: 'Arial Black', fontSize: '40px', color: '#ef4444',
      stroke: '#000', strokeThickness: 6
    }).setOrigin(0.5).setDepth(201);

    this.add.text(width / 2, height / 2 - 20, `Score: ${this.score}   Waves: ${this.wave}   💎 ${this.shardsCollected}`, {
      fontFamily: 'Arial Black', fontSize: '18px', color: '#22d3ee',
      stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(201);

    // Retry button
    const retry = this.add.text(width / 2, height / 2 + 50, '🔄 PLAY AGAIN', {
      fontFamily: 'Arial Black', fontSize: '24px', color: '#10b981',
      stroke: '#000', strokeThickness: 4, backgroundColor: '#0f172a',
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setDepth(201).setInteractive({ useHandCursor: true });
    retry.on('pointerdown', () => this.scene.restart());

    // Exit button
    const exit = this.add.text(width / 2, height / 2 + 110, '← EXIT', {
      fontFamily: 'Arial Black', fontSize: '18px', color: '#94a3b8',
      stroke: '#000', strokeThickness: 3, backgroundColor: '#0f172a',
      padding: { x: 20, y: 8 }
    }).setOrigin(0.5).setDepth(201).setInteractive({ useHandCursor: true });
    exit.on('pointerdown', () => {
      if (window.riftInvadersGame) {
        window.riftInvadersGame.destroy(true);
        window.riftInvadersGame = null;
      }
      document.getElementById('game-container-invaders').style.display = 'none';
      document.getElementById('aiden-portal').style.display = 'block';
    });
  }

  update() {
    const { width, height } = this.cameras.main;

    // Starfield scroll
    this.bgTiles.forEach(star => {
      star.y += star.speed;
      if (star.y > height) { star.y = 0; star.x = Phaser.Math.Between(0, width); }
    });

    // Shield follows player
    if (this.shieldGraphic) {
      this.shieldGraphic.setPosition(this.player.x, this.player.y);
    }

    // Cleanup off-screen objects
    this.projectiles.getChildren().forEach(b => { if (b.y < -20) b.destroy(); });
    this.enemyBullets.getChildren().forEach(b => { if (b.y > height + 20) b.destroy(); });
    this.enemies.getChildren().forEach(e => { if (e.y > height + 60) e.destroy(); });
    this.shards.getChildren().forEach(s => { if (s.y > height + 20) s.destroy(); });
    this.powerups.getChildren().forEach(p => { if (p.y > height + 20) p.destroy(); });
  }
}
