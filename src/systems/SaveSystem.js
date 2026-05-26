/* ========================================
   SAVE SYSTEM — localStorage persistence
   ======================================== */

const HERO_NAME = 'Aiden';
const SAVE_KEY = 'ChronoverseSave';

const SaveSystem = {
  getDefault() {
    return {
      shards: 0,
      stars: {},          // { '1-1': 3, '1-2': 2, ... }
      unlockedChars: ['hero_red'],
      selectedChar: 'hero_red',
      currentWorld: 1,
      currentLevel: 1,
      unlockedWorlds: [1],
      storyViewed: [],
      costumes: [],
      totalPlayTime: 0,
      lastVisit: null,
      dailyBonusClaimed: false,
      // Echoes System
      totalEchoes: 0,
      unlockedLore: [],     // Array of lore IDs unlocked
      riftPowers: [],       // Available rift powers: ['shield', 'timeFracture', 'dimensionalBlast']
      selectedRiftPower: null,
    };
  },

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        // Merge with defaults to handle new fields
        return { ...this.getDefault(), ...data };
      }
    } catch (e) {}
    return this.getDefault();
  },

  save(data) {
    try {
      data.lastUpdated = Date.now();
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      // Background sync to Firebase
      if (window.db && window.CHRONOVERSE_TENANT) {
        window.db.collection('chronoverse_saves').doc(window.CHRONOVERSE_TENANT.toLowerCase()).set(data).catch(e => console.log('Firebase write error', e));
      }
    } catch (e) {}
  },

  addShards(amount) {
    const data = this.load();
    data.shards += amount;
    this.save(data);
    return data.shards;
  },

  addEchoes(amount) {
    const data = this.load();
    data.totalEchoes = (data.totalEchoes || 0) + amount;
    // Check for lore unlocks (every 5 echoes)
    const loreThresholds = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
    loreThresholds.forEach((threshold, index) => {
      const loreId = `lore_${index + 1}`;
      if (data.totalEchoes >= threshold && !(data.unlockedLore || []).includes(loreId)) {
        data.unlockedLore = data.unlockedLore || [];
        data.unlockedLore.push(loreId);
      }
    });
    // Check for rift power unlocks (every 10 echoes)
    const powerMap = { 10: 'shield', 20: 'timeFracture', 30: 'dimensionalBlast' };
    Object.entries(powerMap).forEach(([threshold, power]) => {
      if (data.totalEchoes >= parseInt(threshold) && !(data.riftPowers || []).includes(power)) {
        data.riftPowers = data.riftPowers || [];
        data.riftPowers.push(power);
      }
    });
    this.save(data);
    return data.totalEchoes;
  },

  selectRiftPower(power) {
    const data = this.load();
    data.selectedRiftPower = power;
    this.save(data);
  },

  setStars(levelId, stars) {
    const data = this.load();
    const prev = data.stars[levelId] || 0;
    if (stars > prev) data.stars[levelId] = stars;
    this.save(data);
  },

  unlockChar(charId) {
    const data = this.load();
    if (!data.unlockedChars.includes(charId)) {
      data.unlockedChars.push(charId);
      this.save(data);
    }
  },

  selectChar(charId) {
    const data = this.load();
    data.selectedChar = charId;
    this.save(data);
  },

  unlockWorld(worldNum) {
    const data = this.load();
    if (!data.unlockedWorlds.includes(worldNum)) {
      data.unlockedWorlds.push(worldNum);
      this.save(data);
    }
  },

  markStoryViewed(storyId) {
    const data = this.load();
    if (!data.storyViewed.includes(storyId)) {
      data.storyViewed.push(storyId);
      this.save(data);
    }
  },

  isStoryViewed(storyId) {
    return this.load().storyViewed.includes(storyId);
  },

  getTotalStars() {
    const data = this.load();
    return Object.values(data.stars).reduce((a, b) => a + b, 0);
  },

  checkDailyBonus() {
    const data = this.load();
    const today = new Date().toDateString();
    if (data.lastVisit !== today) {
      data.lastVisit = today;
      data.dailyBonusClaimed = false;
      this.save(data);
    }
    if (!data.dailyBonusClaimed) {
      data.dailyBonusClaimed = true;
      data.shards += 25;
      this.save(data);
      return true;
    }
    return false;
  },

  getTimeGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  },
};

// Rift Memories Lore Entries
const RIFT_LORE = [
  { id: 'lore_1', title: 'The Day the Sky Cracked', echoes: 5,
    text: 'It started with a sound no one could explain — a deep hum that shook every window in Manhattan. Then the sky split open like a zipper, and through the crack poured creatures from worlds that should never have touched ours.' },
  { id: 'lore_2', title: 'Doc Ock\'s Discovery', echoes: 10,
    text: 'Dr. Octavius found the first Echo buried beneath Oscorp Tower. When his mechanical arms touched it, the fragment showed him visions of other dimensions — and a power source beyond anything on Earth. He became obsessed.' },
  { id: 'lore_3', title: 'The Holocron Connection', echoes: 15,
    text: 'A Sith Holocron from the far side of the galaxy resonated with Doc Ock\'s stolen Echo. When the two artifacts were brought together, the Rift tore open permanently. Two universes, now bleeding into one.' },
  { id: 'lore_4', title: 'Tatooine\'s Twin Suns Went Dark', echoes: 20,
    text: 'The people of Tatooine watched in horror as their twin suns flickered. The Rift was draining energy from both universes to sustain itself. Entire desert settlements were swallowed into dimensional pockets overnight.' },
  { id: 'lore_5', title: 'The Upside Down Breaks Through', echoes: 25,
    text: 'A third dimension bled through the weakened barriers — a dark mirror world where everything is twisted and wrong. The Demogorgon was the first to cross over, but it was not the last thing lurking in the shadow dimension.' },
  { id: 'lore_6', title: 'Why the Echoes Exist', echoes: 30,
    text: 'Echoes are fragments of dimensional memory — frozen moments from the instant the Rift tore reality apart. Each one contains a piece of what happened, and together, they form a map to sealing the breach forever.' },
  { id: 'lore_7', title: 'The Mandalorian\'s Warning', echoes: 35,
    text: '"I\'ve seen the edge of the Rift, kid. Whatever is on the other side isn\'t just pulling worlds together — it\'s building something. A throne, made from the bones of collapsed dimensions. This is the way... to stop it."' },
  { id: 'lore_8', title: 'The Rift King\'s Origin', echoes: 40,
    text: 'Before he was the Rift King, he was a scientist who tried to save his dying world by merging it with a healthier one. The dimensional energy consumed him, fused him with Doc Ock\'s technology AND the Emperor\'s dark side power.' },
  { id: 'lore_9', title: 'Aiden\'s True Power', echoes: 45,
    text: 'The Echoes don\'t just contain memories — they respond to Aiden specifically. Each fragment collected makes the Rift a little more stable. Aiden isn\'t just running through dimensions. He\'s literally holding reality together.' },
  { id: 'lore_10', title: 'The Truth Behind the Rift King', echoes: 50,
    text: 'The final Echo reveals the impossible truth: the Rift King is a future version of Aiden — one who tried to merge the worlds to save them all, but lost control of the dimensional energy. To seal the Rift, Aiden must face himself.' },
];
