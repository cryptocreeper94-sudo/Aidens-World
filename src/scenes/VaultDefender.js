/* ========================================
   VAULT DEFENDER - Mini-Game Scene
   ======================================== */

class VaultDefender extends Phaser.Scene {
  constructor() {
    super('VaultDefender');
  }

  preload() {
    this.load.image('enemy_thug', 'assets/enemies/thug.png?v=' + Date.now());
  }

  create() {
    const width = this.scale.width;
    const height = this.scale.height;

    this.add.rectangle(0, 0, width, height, 0x020617).setOrigin(0);

    // Vault in the center
    this.vault = this.add.circle(width / 2, height / 2, 50, 0x22d3ee);
    this.vaultHealth = 100;
    
    this.vaultText = this.add.text(width / 2, height / 2 - 80, 'VAULT HEALTH: 100%', {
      fontFamily: 'Arial Black',
      fontSize: '24px',
      color: '#22d3ee'
    }).setOrigin(0.5);

    // Turret (Controlled by player)
    this.turret = this.add.rectangle(width / 2, height / 2, 40, 10, 0fbbf24).setOrigin(0, 0.5);
    
    // Projectiles group
    this.projectiles = this.physics.add.group();
    
    // Enemies group
    this.enemies = this.physics.add.group();

    // Input to aim and fire
    this.input.on('pointerdown', (pointer) => {
      this.fireProjectile(pointer);
    });

    // Spawn enemies periodically
    this.time.addEvent({
      delay: 1500,
      callback: this.spawnEnemy,
      callbackScope: this,
      loop: true
    });

    // Collisions
    this.physics.add.overlap(this.projectiles, this.enemies, this.hitEnemy, null, this);
    this.physics.add.overlap(this.vault, this.enemies, this.hitVault, null, this);

    this.score = 0;
    this.scoreText = this.add.text(20, 20, 'THREATS NEUTRALIZED: 0', {
      fontFamily: 'Arial Black',
      fontSize: '20px',
      color: '#fff'
    });
  }

  update() {
    // Aim turret at pointer
    const pointer = this.input.activePointer;
    const angle = Phaser.Math.Angle.Between(this.vault.x, this.vault.y, pointer.x, pointer.y);
    this.turret.setRotation(angle);

    // Move enemies toward vault
    this.enemies.getChildren().forEach(enemy => {
      this.physics.moveToObject(enemy, this.vault, 100);
    });
  }

  fireProjectile(pointer) {
    const angle = Phaser.Math.Angle.Between(this.vault.x, this.vault.y, pointer.x, pointer.y);
    const proj = this.add.circle(this.vault.x, this.vault.y, 8, 0xfbbf24);
    this.physics.add.existing(proj);
    
    const velocity = this.physics.velocityFromRotation(angle, 400);
    proj.body.setVelocity(velocity.x, velocity.y);
    this.projectiles.add(proj);

    // Destroy projectile after 2 seconds
    this.time.delayedCall(2000, () => {
      if (proj.active) proj.destroy();
    });
  }

  spawnEnemy() {
    const width = this.scale.width;
    const height = this.scale.height;
    
    // Spawn at random edge
    let x, y;
    if (Math.random() > 0.5) {
      x = Math.random() > 0.5 ? -20 : width + 20;
      y = Math.random() * height;
    } else {
      x = Math.random() * width;
      y = Math.random() > 0.5 ? -20 : height + 20;
    }

    const enemy = this.add.sprite(x, y, 'enemy_thug').setDisplaySize(40, 40);
    this.physics.add.existing(enemy);
    this.enemies.add(enemy);
  }

  hitEnemy(projectile, enemy) {
    projectile.destroy();
    enemy.destroy();
    this.score++;
    this.scoreText.setText(`THREATS NEUTRALIZED: ${this.score}`);
  }

  hitVault(vault, enemy) {
    enemy.destroy();
    this.vaultHealth -= 10;
    this.vaultText.setText(`VAULT HEALTH: ${this.vaultHealth}%`);
    
    // Flash red
    this.cameras.main.flash(200, 255, 0, 0);

    if (this.vaultHealth <= 0) {
      this.scene.pause();
      this.vaultText.setText('VAULT COMPROMISED\nGAME OVER');
      this.vaultText.setColor('#ef4444');
    }
  }
}

// Expose globally
window.VaultDefender = VaultDefender;
