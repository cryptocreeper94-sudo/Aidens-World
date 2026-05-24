/* ========================================
   SAVE SYSTEM — localStorage persistence
   ======================================== */

const HERO_NAME = 'Aiden';
const SAVE_KEY = 'heroHQ_save';

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
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (e) {}
  },

  addShards(amount) {
    const data = this.load();
    data.shards += amount;
    this.save(data);
    return data.shards;
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
