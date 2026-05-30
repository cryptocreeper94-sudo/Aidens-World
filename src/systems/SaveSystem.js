/* ========================================
   SAVE SYSTEM — localStorage persistence
   ======================================== */

// Dynamic hero name — reads from localStorage or tenant, falls back to 'Aiden'
function getHeroName() {
  try {
    const stored = window.localStore.getItem('ChronoversePlayerName');
    if (stored) return stored;
  } catch(e) {}
  if (window.CHRONOVERSE_TENANT) {
    const t = window.CHRONOVERSE_TENANT;
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  return 'Aiden';
}
// Keep HERO_NAME as a getter so it's always current
Object.defineProperty(window, 'HERO_NAME', { get: getHeroName, configurable: true });
// Also expose as module-level variable for existing references
let HERO_NAME = 'Aiden'; // Initial fallback, updated by updateHeroName()
function updateHeroName() { HERO_NAME = getHeroName(); }

let currentProfile = 'Default';
try { currentProfile = window.localStore.getItem('ChronoverseActiveProfile') || 'Default'; } catch(e) { console.warn('[SaveSystem] Failed to read active profile:', e); }

const SaveSystem = {
  getProfile() { return currentProfile; },
  setProfile(name) { 
    currentProfile = name; 
    try { window.localStore.setItem('ChronoverseActiveProfile', name); } catch(e) { console.warn('[SaveSystem] Failed to save active profile:', e); }
    this.addProfile(name);
  },
  getProfiles() {
    try {
      return JSON.parse(window.localStore.getItem('ChronoverseProfiles')) || ['Default'];
    } catch(e) { console.warn('[SaveSystem] Failed to read profiles list:', e); return ['Default']; }
  },
  addProfile(name) {
    let p = this.getProfiles();
    if(!p.includes(name)) { 
      p.push(name); 
      try { window.localStore.setItem('ChronoverseProfiles', JSON.stringify(p)); } catch(e) { console.warn('[SaveSystem] Failed to save profiles list:', e); }
    }
  },
  getKey() { 
    // Tenant-aware save key: each subdomain user gets their own save slot
    const tenant = (window.CHRONOVERSE_TENANT || '').toLowerCase();
    const base = tenant ? 'ChronoverseSave_' + tenant : 'ChronoverseSave';
    return currentProfile === 'Default' ? base : base + '_' + currentProfile; 
  },
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
    let raw = null;
    try { raw = window.localStore.getItem(this.getKey()); } catch(e) { console.warn('[SaveSystem] Failed to read from localStorage:', e); }
    
    if (raw) {
      try {
        const data = JSON.parse(raw);
        const merged = { ...this.getDefault(), ...data };
        // Bug C fix: keep MEMORY_SAVE in sync with localStorage on successful read
        window.MEMORY_SAVE = merged;
        return merged;
      } catch(e) {
        console.warn('[SaveSystem] Failed to parse save data from localStorage:', e);
      }
    }
    
    if (window.MEMORY_SAVE) {
      return { ...this.getDefault(), ...window.MEMORY_SAVE };
    }
    return this.getDefault();
  },

  save(data) {
    data.lastUpdated = Date.now();
    
    // Bug C fix: update MEMORY_SAVE FIRST so even if localStorage fails, in-memory copy is current
    window.MEMORY_SAVE = data;
    
    let success = false;
    let method = 'none';
    
    // Attempt localStorage write
    try {
      const serialized = JSON.stringify(data);
      window.localStore.setItem(this.getKey(), serialized);
      
      // Bug D fix: verify write by reading back
      const verification = window.localStore.getItem(this.getKey());
      if (verification !== serialized) {
        console.warn('[SaveSystem] Write verification failed, retrying once...');
        // Retry once
        window.localStore.setItem(this.getKey(), serialized);
        const retryVerification = window.localStore.getItem(this.getKey());
        if (retryVerification === serialized) {
          success = true;
          method = 'localStorage';
        } else {
          console.warn('[SaveSystem] Write verification failed after retry. Data is in MEMORY_SAVE only.');
          method = 'memory';
        }
      } else {
        success = true;
        method = 'localStorage';
      }
    } catch (e) {
      console.warn('[SaveSystem] localStorage write failed:', e);
      method = 'memory';
    }
    
    // If localStorage failed entirely, MEMORY_SAVE still has the data
    if (!success) {
      // MEMORY_SAVE was already set above, so the data is safe in memory
      success = true; // memory save always succeeds
    }
    
    // Background sync to Firebase
    try {
      if (window.db && window.CHRONOVERSE_TENANT) {
        let docId = window.CHRONOVERSE_TENANT.toLowerCase();
        if (currentProfile !== 'Default') {
          docId += '_' + currentProfile.toLowerCase().replace(/[^a-z0-9]/g, '');
        }
        // Bug B fix: validate doc ID is a non-empty string before writing
        if (typeof docId === 'string' && docId.length > 0) {
          window.db.collection('chronoverse_saves').doc(docId).set(data).catch(e => console.warn('[SaveSystem] Firebase write error:', e));
          
          // ── Kid Profile Sync (for Parent Dashboard) ──
          // Push aggregated stats to kids/<tenant> so family.tlid.io can read them
          if (currentProfile === 'Default') {
            const totalStars = Object.values(data.stars || {}).reduce((a, b) => a + b, 0);
            const levelsCompleted = Object.keys(data.stars || {}).filter(k => data.stars[k] > 0).length;
            const kidProfileUpdate = {
              totalStars: totalStars,
              maxLevel: levelsCompleted,
              totalShards: data.shards || 0,
              selectedChar: data.selectedChar || 'hero_red',
              lastPlayed: window.firebase ? window.firebase.firestore.FieldValue.serverTimestamp() : new Date(),
              currentWorld: data.currentWorld || 1,
              totalPlayTime: data.totalPlayTime || 0,
              totalEchoes: data.totalEchoes || 0,
            };
            // Read avatar from customization prefs if available
            try {
              const customPrefs = JSON.parse(window.localStore.getItem('ChronoverseCustomPrefs_' + docId) || '{}');
              if (customPrefs.avatar) kidProfileUpdate.avatar = customPrefs.avatar;
            } catch(e) {}
            
            window.db.collection('kids').doc(docId).set(kidProfileUpdate, { merge: true })
              .catch(e => console.warn('[SaveSystem] Kid profile sync error:', e));
          }
        } else {
          console.warn('[SaveSystem] Invalid Firebase doc ID, skipping cloud sync. CHRONOVERSE_TENANT:', window.CHRONOVERSE_TENANT);
        }
      }
    } catch (e) { console.warn('[SaveSystem] Firebase sync error:', e); }
    
    // Dispatch save status event for UI toast
    const result = { success: success, method: method };
    try {
      window.dispatchEvent(new CustomEvent('chronoverse-save-status', { detail: result }));
    } catch (e) { console.warn('[SaveSystem] Failed to dispatch save status event:', e); }
    
    return result;
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

// ── Activity Logger (for Parent Dashboard feed) ──
const ActivityLogger = {
  _lastLog: 0,
  _minInterval: 5000, // Don't log more than once every 5s

  log(type, description, details) {
    try {
      if (!window.db || !window.CHRONOVERSE_TENANT) return;
      const now = Date.now();
      if (now - this._lastLog < this._minInterval) return;
      this._lastLog = now;

      const tenant = window.CHRONOVERSE_TENANT.toLowerCase();
      if (!tenant || tenant.length === 0) return;

      const entry = {
        type: type,           // 'level_complete', 'star_earned', 'echo_found', 'world_unlock', 'character_unlock', 'daily_bonus'
        description: description,
        details: details || {},
        timestamp: window.firebase ? window.firebase.firestore.FieldValue.serverTimestamp() : new Date(),
      };

      window.db.collection('kids').doc(tenant).collection('activity')
        .add(entry)
        .catch(e => console.warn('[Activity] Log error:', e));
    } catch(e) { console.warn('[Activity] Logger error:', e); }
  },

  levelComplete(levelId, stars, worldName) {
    const starText = '⭐'.repeat(stars);
    this.log('level_complete', `Completed ${levelId} with ${stars} star${stars !== 1 ? 's' : ''} ${starText}`, { levelId, stars, worldName });
  },

  worldUnlock(worldNum, worldName) {
    this.log('world_unlock', `Unlocked ${worldName}!`, { worldNum, worldName });
  },

  characterUnlock(charId, charName) {
    this.log('character_unlock', `Unlocked ${charName}!`, { charId, charName });
  },

  echoFound(totalEchoes) {
    this.log('echo_found', `Collected an Echo! (${totalEchoes} total)`, { totalEchoes });
  },

  dailyBonus(shards) {
    this.log('daily_bonus', `Claimed daily bonus: +${shards} Rift Shards`, { shards });
  },
};

// Make globally accessible
window.ActivityLogger = ActivityLogger;

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
