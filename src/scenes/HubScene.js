/* ========================================
   HUB SCENE — Home screen with world map
   Spider-Man × Star Wars
   ======================================== */

class HubScene extends Phaser.Scene {
  constructor() {
    super('HubScene');
  }

  create() {
    const { width, height } = this.cameras.main;
    // Ensure HERO_NAME is current for this session
    if (typeof updateHeroName === 'function') updateHeroName();
    const save = SaveSystem.load();

    this.cameras.main.fadeIn(500);
    SoundFX.init();

    // Background
    const bg = this.add.image(width / 2, height / 2, 'hub_bg');
    bg.setDisplaySize(width, height);
    bg.setAlpha(0.3);

    // Darker overlay — keeps UI elements readable over busy background
    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a1a, 0.8);

    // ── GREETING ──
    const greeting = SaveSystem.getTimeGreeting();
    this.add.text(width / 2, 36, `${greeting}, ${HERO_NAME}!`, {
      fontFamily: 'Arial Black, Arial',
      fontSize: '26px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    // Hero emblem
    this.add.text(width / 2, 72, '🕷️⚔️', { fontSize: '32px' }).setOrigin(0.5);

    // Shards counter
    const statsBox = this.add.rectangle(width / 2, 102, 280, 24, 0x000000, 0.5);
    statsBox.setStrokeStyle(1, 0xfbbf24, 0.3);
    this.add.text(width / 2, 102, `💎 ${save.shards} Rift Shards   ⭐ ${SaveSystem.getTotalStars()} Stars`, {
      fontFamily: 'Arial',
      fontSize: '13px',
      color: '#fbbf24',
    }).setOrigin(0.5);

    // ── WORLD MAP ──
    this.add.text(width / 2, 132, 'SELECT WORLD', {
      fontFamily: 'Arial Black, Arial',
      fontSize: '14px',
      color: '#999999',
      letterSpacing: 4,
    }).setOrigin(0.5);

    // World pagination
    if (!this.worldPage) this.worldPage = 0;
    const WORLDS_PER_PAGE = 4;
    const totalWorldPages = Math.ceil(WORLDS.length / WORLDS_PER_PAGE);
    const wpStart = this.worldPage * WORLDS_PER_PAGE;
    const wpEnd = Math.min(wpStart + WORLDS_PER_PAGE, WORLDS.length);
    const visibleWorlds = WORLDS.slice(wpStart, wpEnd);

    const cardWidth = Math.min(150, (width - 100) / visibleWorlds.length);
    const cardGap = 12;
    const totalCardsWidth = cardWidth * visibleWorlds.length + cardGap * (visibleWorlds.length - 1);
    const startX = (width - totalCardsWidth) / 2 + cardWidth / 2;

    // World page left arrow
    if (this.worldPage > 0) {
      const wLeftArrow = this.add.text(15, 215, '◀', {
        fontFamily: 'Arial', fontSize: '24px', color: '#22d3ee',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      wLeftArrow.on('pointerdown', () => {
        SoundFX.play('click');
        this.worldPage--;
        this.scene.restart();
      });
    }

    // World page right arrow
    if (this.worldPage < totalWorldPages - 1) {
      const wRightArrow = this.add.text(width - 15, 215, '▶', {
        fontFamily: 'Arial', fontSize: '24px', color: '#22d3ee',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      wRightArrow.on('pointerdown', () => {
        SoundFX.play('click');
        this.worldPage++;
        this.scene.restart();
      });
    }

    visibleWorlds.forEach((world, i) => {
      const cx = startX + i * (cardWidth + cardGap);
      const cy = 215;
      const unlocked = save.unlockedWorlds.includes(world.id);
      const color = Phaser.Display.Color.HexStringToColor(world.color).color;

      // SOLID card background — fully opaque
      const card = this.add.rectangle(cx, cy, cardWidth, 105, 0x15162a, 1);
      card.setStrokeStyle(unlocked ? 3 : 2, color, unlocked ? 1 : 0.4);

      // Colored top stripe
      this.add.rectangle(cx, cy - 52, cardWidth, 6, color, unlocked ? 0.8 : 0.2);

      // World icon
      this.add.text(cx, cy - 22, world.icon, {
        fontSize: '30px',
      }).setOrigin(0.5).setAlpha(unlocked ? 1 : 0.3);

      // World name
      this.add.text(cx, cy + 12, world.name, {
        fontFamily: 'Arial',
        fontSize: '11px',
        color: unlocked ? '#ffffff' : '#555555',
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: cardWidth - 14 },
      }).setOrigin(0.5);

      // Stars for this world
      const worldStars = world.levels.reduce((acc, lvl) => acc + (save.stars[lvl.id] || 0), 0);
      const maxStars = world.levels.length * 3;
      this.add.text(cx, cy + 36, maxStars > 0 ? `⭐ ${worldStars}/${maxStars}` : 'LOCKED', {
        fontFamily: 'Arial',
        fontSize: '10px',
        color: unlocked ? '#fbbf24' : '#444444',
      }).setOrigin(0.5);

      if (unlocked) {
        // Glow pulse
        const glow = this.add.rectangle(cx, cy, cardWidth + 4, 109, color, 0);
        this.tweens.add({
          targets: glow,
          alpha: { from: 0, to: 0.08 },
          yoyo: true,
          repeat: -1,
          duration: 1500,
          ease: 'Sine.easeInOut',
        });

        card.setInteractive({ useHandCursor: true });
        card.on('pointerdown', () => { SoundFX.play('click'); this.selectWorld(world); });
        card.on('pointerover', () => { card.setFillStyle(0x1e1f3a, 1); card.setStrokeStyle(3, color, 1); });
        card.on('pointerout', () => { card.setFillStyle(0x15162a, 1); card.setStrokeStyle(3, color, 1); });
      } else {
        // Lock icon overlaid
        this.add.text(cx, cy - 22, '🔒', { fontSize: '24px' }).setOrigin(0.5).setAlpha(0.6);
      }
    });

    // ── LEVEL SELECT (below world cards) ──
    this.levelGroup = this.add.group();
    this.selectedWorld = null;

    // ── CHARACTER SELECT ──
    this.add.text(width / 2, height - 125, 'CHARACTER', {
      fontFamily: 'Arial Black, Arial',
      fontSize: '11px',
      color: '#777777',
      letterSpacing: 3,
    }).setOrigin(0.5);

    const charKeys = Object.keys(CHARACTERS);
    const charSpacing = Math.min(65, (width - 60) / charKeys.length);
    const charStartX = width / 2 - ((charKeys.length - 1) * charSpacing) / 2;

    charKeys.forEach((key, i) => {
      const char = CHARACTERS[key];
      const cx = charStartX + i * charSpacing;
      const cy = height - 85;
      const unlocked = save.unlockedChars.includes(key);
      const selected = save.selectedChar === key;
      const charColor = Phaser.Display.Color.HexStringToColor(char.color).color;

      // SOLID circle background — fully opaque
      const circle = this.add.circle(cx, cy, 24, unlocked ? 0x15162a : 0x0d0d18, 1);
      circle.setStrokeStyle(selected ? 3 : 2, charColor, unlocked ? 1 : 0.3);

      if (unlocked && this.textures.exists(key)) {
        const charImg = this.add.image(cx, cy, key);
        charImg.setDisplaySize(36, 36);
      } else if (unlocked) {
        const emoji = key === 'hero_red' ? '🕷️' : key === 'jedi_kid' ? '⚔️' : key === 'hero_black' ? '🖤' : key === 'venom' ? '👾' : '⭐';
        this.add.text(cx, cy, emoji, { fontSize: '20px' }).setOrigin(0.5);
      } else {
        this.add.text(cx, cy, '🔒', { fontSize: '16px' }).setOrigin(0.5).setAlpha(0.5);
      }

      // Character name
      this.add.text(cx, cy + 32, unlocked ? char.name : '???', {
        fontFamily: 'Arial',
        fontSize: '8px',
        color: unlocked ? (selected ? '#ffffff' : '#aaaaaa') : '#444444',
        align: 'center',
      }).setOrigin(0.5);

      // Selected indicator
      if (selected) {
        this.add.text(cx, cy - 30, '▼', { fontSize: '10px', color: '#fbbf24' }).setOrigin(0.5);
      }

      if (unlocked && !selected) {
        circle.setInteractive({ useHandCursor: true });
        circle.on('pointerdown', () => {
          SaveSystem.selectChar(key);
          this.scene.restart();
        });
      }
    });

    // ── DAILY BONUS ──
    if (SaveSystem.checkDailyBonus()) {
      this.time.delayedCall(500, () => this.showDailyBonus());
    }
  }

  showDailyBonus() {
    const { width, height } = this.cameras.main;
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.88).setDepth(100);
    const box = this.add.rectangle(width / 2, height / 2, 300, 220, 0x111122, 1).setStrokeStyle(3, 0xfbbf24).setDepth(101);

    const elements = [];
    elements.push(this.add.text(width / 2, height / 2 - 70, '🎁', { fontSize: '52px' }).setOrigin(0.5).setDepth(102));
    elements.push(this.add.text(width / 2, height / 2 - 18, 'DAILY BONUS!', {
      fontFamily: 'Arial Black',
      fontSize: '24px',
      color: '#fbbf24',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(102));
    elements.push(this.add.text(width / 2, height / 2 + 14, '+25 Rift Shards! 💎', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(102));

    const btn = this.add.rectangle(width / 2, height / 2 + 60, 160, 42, 0xe63946, 1).setDepth(102).setInteractive({ useHandCursor: true });
    btn.setStrokeStyle(2, 0xff5555);
    elements.push(btn);
    elements.push(this.add.text(width / 2, height / 2 + 60, 'AWESOME! 🕸️', {
      fontFamily: 'Arial Black',
      fontSize: '16px',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(103));

    btn.on('pointerdown', () => {
      overlay.destroy();
      box.destroy();
      elements.forEach(e => e.destroy());
      this.scene.restart();
    });
  }

  selectWorld(world) {
    const { width, height } = this.cameras.main;
    const save = SaveSystem.load();

    // Clear previous level buttons
    this.levelGroup.clear(true, true);
    this.selectedWorld = world;

    // Handle empty worlds (locked stubs)
    if (!world.levels || world.levels.length === 0) {
      const lvlY = 318;
      const barBg = this.add.rectangle(width / 2, lvlY + 10, width - 40, 90, 0x0e0f1e, 1);
      barBg.setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(world.color).color, 0.5);
      this.levelGroup.add(barBg);
      const titleText = this.add.text(width / 2, lvlY - 25, `${world.icon} ${world.name}`, {
        fontFamily: 'Arial Black', fontSize: '15px', color: world.color,
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0.5);
      this.levelGroup.add(titleText);
      const comingSoon = this.add.text(width / 2, lvlY + 12, '🔒 COMING SOON', {
        fontFamily: 'Arial Black', fontSize: '18px', color: '#555555',
      }).setOrigin(0.5);
      this.levelGroup.add(comingSoon);
      return;
    }

    // Pagination state
    if (!this.levelPage) this.levelPage = 0;
    if (this._lastWorldId !== world.id) {
      this.levelPage = 0;
      this._lastWorldId = world.id;
    }

    const LEVELS_PER_PAGE = 5;
    const totalPages = Math.ceil(world.levels.length / LEVELS_PER_PAGE);
    const page = Math.min(this.levelPage, totalPages - 1);
    const startIdx = page * LEVELS_PER_PAGE;
    const endIdx = Math.min(startIdx + LEVELS_PER_PAGE, world.levels.length);
    const visibleLevels = world.levels.slice(startIdx, endIdx);

    const lvlY = 318;
    const lvlSpacing = Math.min(85, (width - 120) / visibleLevels.length);
    const lvlStartX = width / 2 - ((visibleLevels.length - 1) * lvlSpacing) / 2;

    // Background bar for level select
    const barBg = this.add.rectangle(width / 2, lvlY + 10, width - 40, 90, 0x0e0f1e, 1);
    barBg.setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(world.color).color, 0.5);
    this.levelGroup.add(barBg);

    // World title
    const titleText = this.add.text(width / 2, lvlY - 25, `${world.icon} ${world.name}`, {
      fontFamily: 'Arial Black', fontSize: '15px', color: world.color,
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5);
    this.levelGroup.add(titleText);

    // Page indicator
    if (totalPages > 1) {
      const pageText = this.add.text(width / 2, lvlY + 60, `Page ${page + 1} / ${totalPages}`, {
        fontFamily: 'Arial', fontSize: '10px', color: '#666666',
      }).setOrigin(0.5);
      this.levelGroup.add(pageText);
    }

    // Left arrow
    if (page > 0) {
      const leftArrow = this.add.text(30, lvlY + 12, '◀', {
        fontFamily: 'Arial', fontSize: '28px', color: world.color,
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      leftArrow.on('pointerdown', () => {
        SoundFX.play('click');
        this.levelPage = page - 1;
        this.selectWorld(world);
      });
      leftArrow.on('pointerover', () => leftArrow.setScale(1.3));
      leftArrow.on('pointerout', () => leftArrow.setScale(1));
      this.levelGroup.add(leftArrow);
    }

    // Right arrow
    if (page < totalPages - 1) {
      const rightArrow = this.add.text(width - 30, lvlY + 12, '▶', {
        fontFamily: 'Arial', fontSize: '28px', color: world.color,
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      rightArrow.on('pointerdown', () => {
        SoundFX.play('click');
        this.levelPage = page + 1;
        this.selectWorld(world);
      });
      rightArrow.on('pointerover', () => rightArrow.setScale(1.3));
      rightArrow.on('pointerout', () => rightArrow.setScale(1));
      this.levelGroup.add(rightArrow);
    }

    visibleLevels.forEach((level, vi) => {
      const i = startIdx + vi; // Actual index in world.levels
      const cx = lvlStartX + vi * lvlSpacing;
      const cy = lvlY + 12;

      const prevLevelId = i > 0 ? world.levels[i - 1].id : null;
      const prevCompleted = !prevLevelId || (save.stars[prevLevelId] !== undefined && save.stars[prevLevelId] > 0);
      const playable = (i === 0) || prevCompleted;

      const color = Phaser.Display.Color.HexStringToColor(world.color).color;

      // SOLID level circle
      const lvlCircle = this.add.circle(cx, cy, 26, playable ? 0x15162a : 0x0d0d18, 1);
      lvlCircle.setStrokeStyle(playable ? 3 : 2, color, playable ? 1 : 0.3);
      this.levelGroup.add(lvlCircle);

      // Level number or boss icon
      const label = level.isBoss ? '💀' : `${i + 1}`;
      const lvlText = this.add.text(cx, cy, playable ? label : '🔒', {
        fontFamily: 'Arial Black',
        fontSize: level.isBoss ? '22px' : '18px',
        color: playable ? '#ffffff' : '#444444',
        stroke: '#000000',
        strokeThickness: playable ? 2 : 0,
      }).setOrigin(0.5);
      this.levelGroup.add(lvlText);

      // Stars below
      const stars = save.stars[level.id] || 0;
      const starText = this.add.text(cx, cy + 32, '⭐'.repeat(stars) + '☆'.repeat(3 - stars), {
        fontSize: '10px', color: '#fbbf24',
      }).setOrigin(0.5);
      this.levelGroup.add(starText);

      // Level name
      const nameText = this.add.text(cx, cy + 46, level.name, {
        fontFamily: 'Arial', fontSize: '9px',
        color: playable ? '#cccccc' : '#444444',
      }).setOrigin(0.5);
      this.levelGroup.add(nameText);

      if (playable) {
        lvlCircle.setInteractive({ useHandCursor: true });
        lvlCircle.on('pointerdown', () => {
          // Calculate sequential level number across all worlds
          let levelNum = 0;
          for (let w = 0; w < WORLDS.length; w++) {
            if (WORLDS[w].id === world.id) {
              levelNum += i + 1;
              break;
            }
            levelNum += WORLDS[w].levels.length;
          }

          // Check for story intro on first level of world
          if (i === 0 && !SaveSystem.isStoryViewed(world.storyIntro) && STORY_PANELS[world.storyIntro]) {
            this.scene.start('StoryScene', {
              storyId: world.storyIntro,
              nextScene: 'LevelScene',
              nextData: { levelNum: levelNum },
            });
          } else {
            this.scene.start('LevelScene', { levelNum: levelNum });
          }
        });
        lvlCircle.on('pointerover', () => { lvlCircle.setFillStyle(0x1e1f3a, 1); lvlCircle.setStrokeStyle(3, color, 1); });
        lvlCircle.on('pointerout', () => { lvlCircle.setFillStyle(0x15162a, 1); lvlCircle.setStrokeStyle(3, color, 1); });
      }
    });
  }
}
