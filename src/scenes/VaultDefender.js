/* ========================================
   VAULT DEFENDER - Mini-Game Scene
   ======================================== */

class VaultDefender extends Phaser.Scene {
  constructor() {
    super('VaultDefender');
  }

  preload() {
  }

  create() {
    const width = this.scale.width;
    const height = this.scale.height;

    this.bgRect = this.add.rectangle(0, 0, width, height, 0x020617).setOrigin(0);

    this.add.text(width / 2, height / 2 - 40, 'VAULT DEFENDER', {
      fontFamily: 'Arial Black',
      fontSize: '42px',
      color: '#22d3ee',
      align: 'center'
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 20, 'COMING SOON', {
      fontFamily: 'Arial Black',
      fontSize: '28px',
      color: '#fbbf24',
      align: 'center'
    }).setOrigin(0.5);

    this.scale.on('resize', this.resize, this);
  }

  resize(gameSize) {
    const width = gameSize.width;
    const height = gameSize.height;

    if (this.bgRect) this.bgRect.setSize(width, height);
  }

  update() {
  }
}

// Expose globally
window.VaultDefender = VaultDefender;
