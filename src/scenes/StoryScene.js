/* ========================================
   STORY SCENE — Comic panel viewer
   ======================================== */

class StoryScene extends Phaser.Scene {
  constructor() {
    super('StoryScene');
  }

  init(data) {
    this.storyId = data.storyId;
    this.nextScene = data.nextScene || 'HubScene';
    this.nextData = data.nextData || {};
  }

  create() {
    const { width, height } = this.cameras.main;
    const story = STORY_PANELS[this.storyId];
    if (!story) {
      this.scene.start(this.nextScene, this.nextData);
      return;
    }

    this.panels = story.panels;
    this.currentPanel = 0;

    // Dark cinematic background
    this.add.rectangle(width / 2, height / 2, width, height, 0x050510);

    // Comic panel frame
    const frameW = Math.min(width - 40, 500);
    const frameH = Math.min(height - 160, 280);
    this.panelFrame = this.add.rectangle(width / 2, height / 2 - 30, frameW, frameH, 0x111122);
    this.panelFrame.setStrokeStyle(3, 0xe63946);

    // Panel image
    this.panelImage = this.add.image(width / 2, height / 2 - 30, 'intro_panel');
    this.panelImage.setDisplaySize(frameW - 8, frameH - 8);

    // Text box
    const textBoxY = height / 2 + frameH / 2 + 30;
    this.add.rectangle(width / 2, textBoxY + 20, frameW, 70, 0x0a0a1a, 0.9).setStrokeStyle(1, 0x333355);

    this.speakerText = this.add.text(width / 2 - frameW / 2 + 12, textBoxY - 2, '', {
      fontFamily: 'Arial Black',
      fontSize: '12px',
      color: '#e63946',
    });

    this.dialogText = this.add.text(width / 2 - frameW / 2 + 12, textBoxY + 16, '', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#dddddd',
      wordWrap: { width: frameW - 24 },
      lineSpacing: 4,
    });



    // Panel counter
    this.counterText = this.add.text(width - 20, 15, '', {
      fontFamily: 'Arial',
      fontSize: '11px',
      color: '#555555',
    }).setOrigin(1, 0);

    // Show first panel
    this.showPanel(0);

    // Tap to advance
    this.input.on('pointerdown', () => {
      this.currentPanel++;
      if (this.currentPanel >= this.panels.length) {
        if (this.currentVoice) this.currentVoice.stop();
        SaveSystem.markStoryViewed(this.storyId);
        this.cameras.main.fadeOut(400, 0, 0, 0);
        this.time.delayedCall(500, () => {
          this.scene.start(this.nextScene, this.nextData);
        });
      } else {
        this.showPanel(this.currentPanel);
      }
    });
  }

  showPanel(idx) {
    const panel = this.panels[idx];
    // Runtime name replacement — every kid sees their own name
    const heroName = typeof getHeroName === 'function' ? getHeroName() : (HERO_NAME || 'Hero');
    const replaceHero = (str) => str.replace(/\{HERO\}/g, heroName);

    // Update image if different
    if (panel.image && this.textures.exists(panel.image)) {
      this.panelImage.setTexture(panel.image);
    }

    // Typewriter text effect
    this.speakerText.setText(replaceHero(panel.speaker) + ':');
    this.dialogText.setText('');

    const fullText = replaceHero(panel.text);
    let charIdx = 0;
    if (this.typeTimer) this.typeTimer.remove();
    this.typeTimer = this.time.addEvent({
      delay: 30,
      repeat: fullText.length - 1,
      callback: () => {
        charIdx++;
        this.dialogText.setText(fullText.substring(0, charIdx));
      },
    });

    // Play audio and setup auto-advance
    if (this.currentVoice) {
      this.currentVoice.stop();
    }
    if (this.autoAdvanceTimer) {
      this.autoAdvanceTimer.remove();
    }

    const audioKey = `voice_${this.storyId}_${idx}`;
    if (this.cache.audio.exists(audioKey)) {
      this.currentVoice = this.sound.add(audioKey);
      this.currentVoice.play();
      this.currentVoice.once('complete', () => {
        this.autoAdvanceTimer = this.time.delayedCall(1500, () => {
          if (this.currentPanel === idx) {
            this.input.emit('pointerdown');
          }
        });
      });
    } else {
      // Fallback timer if no audio
      this.autoAdvanceTimer = this.time.delayedCall(4000, () => {
        if (this.currentPanel === idx) {
          this.input.emit('pointerdown');
        }
      });
    }

    // Counter
    this.counterText.setText(`${idx + 1} / ${this.panels.length}`);

    // Subtle panel entrance animation
    this.panelImage.setAlpha(0);
    this.tweens.add({ targets: this.panelImage, alpha: 1, duration: 300 });
  }
}
