/* ========================================
   LEVEL DATA — Procedural Geometry Dash Logic
   ======================================== */

const LevelData = {
  // Geometry Dash-calibrated difficulty progression
  generateConfig: function(levelNum) {
    // Speed: 200 at lvl 1 (accessible mobile feel), ramps to ~500 by lvl 20
    const gameSpeed = 200 + Math.min(levelNum * 15, 300); 

    // Distance to finish — meaningful runs from the start
    const finishDistance = 6000 + (levelNum * 600);

    // Tower probability — start with real obstacles
    const towerFreq = Math.min(0.20 + (levelNum * 0.012), 0.40);
    
    // Enemy probability — enemies from the start
    const enemyFreq = Math.min(0.15 + (levelNum * 0.010), 0.30);
    
    const shardFreq = 0.15;

    // Obstacle gap: tighter from the start, gets intense
    const obstacleGap = Math.max(2.5 - (levelNum * 0.05), 1.2);

    // Tower height variety: 1 block (lvl 1-3), up to 2 (lvl 4-9), up to 3 (lvl 10+)
    const maxTowerBlocks = levelNum >= 10 ? 3 : (levelNum >= 4 ? 2 : 1);

    const worlds = [
      { key: 'city_day', bg: 'nyc_skyline', color: '#1e1b4b', enemies: ['enemy_thug', 'alien_brute'], name: 'New York City' },
      { key: 'upside_down_red', bg: 'rift', color: '#450a0a', enemies: ['alien_brute'], name: 'The Upside Down' },
      { key: 'desert_day', bg: 'desert', color: '#1e3a8a', enemies: ['enemy_trooper', 'alien_brute'], name: 'Tatooine' },
      { key: 'space_station', bg: 'space_station', color: '#0f172a', enemies: ['enemy_trooper', 'alien_brute'], name: 'Imperial Space Station' },
      { key: 'city_night', bg: 'nyc_skyline_night', color: '#0f172a', enemies: ['enemy_thug', 'alien_brute'], name: 'NYC After Dark' },
      { key: 'upside_down_blue', bg: 'rift_blue', color: '#172554', enemies: ['alien_brute'], name: 'The Shadow Rift' },
      { key: 'desert_night', bg: 'desert_night', color: '#020617', enemies: ['enemy_trooper', 'alien_brute'], name: 'Tatooine Nightfall' },
      { key: 'city_sunset', bg: 'nyc_skyline_sunset', color: '#1e1b4b', enemies: ['enemy_thug', 'alien_brute'], name: 'NYC at Sunset' },
      { key: 'desert_sunset', bg: 'desert_sunset', color: '#7c2d12', enemies: ['enemy_trooper', 'alien_brute'], name: 'Tatooine at Dusk' }
    ];

    // Each level starts in a different world — rotate based on levelNum
    const startWorldIndex = (levelNum - 1) % worlds.length;

    return {
      levelNum, gameSpeed, finishDistance, towerFreq, enemyFreq,
      shardFreq, obstacleGap, maxTowerBlocks, worlds, startWorldIndex
    };
  }
};

/* ========================================
   LEVEL DATA — World/Level definitions
   Spider-Man x Star Wars Crossover
   ======================================== */

const CHARACTERS = {
  hero_red: {
    name: 'Spider-Man',
    sprite: 'spider_hero',
    color: '#e63946',
    ability: 'Web Shoot',
    abilityDesc: 'Shoots webs at bad guys!',
    unlockText: 'Your first hero!',
  },
  jedi_kid: {
    name: `Jedi ${HERO_NAME}`,
    sprite: 'jedi_kid',
    color: '#22d3ee',
    ability: 'Lightsaber Slash',
    abilityDesc: 'May the Force be with you!',
    unlockText: 'Complete NYC Under Siege',
  },
  hero_black: {
    name: 'Black Suit Spider-Man',
    sprite: 'hero_black',
    color: '#1e1e2e',
    ability: 'Symbiote Slam',
    abilityDesc: 'Power of the symbiote!',
    unlockText: 'Complete the Space Station',
  },
  mandalorian: {
    name: 'The Mandalorian',
    sprite: 'bounty_hunter',
    color: '#6b7280',
    ability: 'Jetpack + Blaster',
    abilityDesc: 'This is the way.',
    unlockText: 'Find his helmet in Tatooine!',
  },
  iron_kid: {
    name: `Iron ${HERO_NAME}`,
    sprite: 'iron_kid',
    color: '#fbbf24',
    ability: 'Repulsor Blast',
    abilityDesc: 'High-tech armor!',
    unlockText: 'Complete Tatooine',
  },
  venom: {
    name: 'Demogorgon',
    sprite: 'alien_brute',
    color: '#111111',
    ability: 'Shadow Strike',
    abilityDesc: 'From the Upside Down!',
    unlockText: 'Seal the Rift!',
  },
  superboy: {
    name: 'Superboy',
    sprite: 'superboy',
    color: '#2563eb',
    ability: 'Power Flight',
    abilityDesc: 'Unstoppable strength!',
    unlockText: 'Available from the start!',
  },
  cyborg_girl: {
    name: 'Cyborg Girl',
    sprite: 'cyborg_girl',
    color: '#06b6d4',
    ability: 'Sonic Cannon',
    abilityDesc: 'Half human, all hero!',
    unlockText: 'Available from the start!',
  },
};

const WORLDS = [
  {
    id: 1,
    name: 'NYC Under Siege',
    icon: '🏙️',
    color: '#e63946',
    bg: 'nyc_skyline',
    unlockChar: 'jedi_kid',
    storyIntro: 'intro_rift',
    storyComplete: 'world1_complete',
    levels: [
      { id: '1-1', name: 'Rooftop Run', bg: 'nyc_skyline', enemies: ['enemy_thug', 'alien_brute'], shards: 20, isTutorial: true },
      { id: '1-2', name: 'Times Square Chaos', bg: 'nyc_times_square', enemies: ['enemy_thug', 'enemy_trooper', 'alien_brute'], shards: 25 },
      { id: '1-3', name: 'Central Park Portal', bg: 'nyc_central_park', enemies: ['enemy_trooper', 'enemy_thug', 'alien_brute'], shards: 25 },
      { id: '1-4', name: 'Brooklyn Bridge', bg: 'nyc_brooklyn_bridge', enemies: ['enemy_thug', 'alien_brute'], shards: 25 },
      { id: '1-5', name: 'Subway Escape', bg: 'nyc_subway', enemies: ['enemy_thug', 'enemy_trooper'], shards: 30 },
      { id: '1-6', name: 'Harlem Heights', bg: 'nyc_skyline_sunset', enemies: ['enemy_trooper', 'alien_brute'], shards: 30 },
      { id: '1-7', name: 'FlatIron Fury', bg: 'nyc_flatiron', enemies: ['enemy_thug', 'enemy_trooper', 'alien_brute'], shards: 30 },
      { id: '1-8', name: 'Chinatown Chase', bg: 'nyc_chinatown', enemies: ['enemy_thug', 'alien_brute'], shards: 35 },
      { id: '1-9', name: 'Oscorp Tower', bg: 'nyc_skyline_night', enemies: ['enemy_trooper', 'alien_brute'], shards: 35 },
      { id: '1-B', name: 'VS Doc Ock!', bg: 'nyc_oscorp', isBoss: true, boss: 'doc_ock', shards: 50 },
    ],
  },
  {
    id: 2,
    name: 'Imperial Space Station',
    icon: '🌌',
    color: '#1d4ed8',
    bg: 'space_station',
    unlockChar: 'hero_black',
    storyIntro: 'world2_intro',
    storyComplete: 'world2_complete',
    levels: [
      { id: '2-1', name: 'Docking Bay', bg: 'space_docking_bay', enemies: ['enemy_trooper', 'alien_brute'], shards: 25 },
      { id: '2-2', name: 'Reactor Core', bg: 'space_reactor', enemies: ['enemy_trooper', 'alien_brute'], shards: 30 },
      { id: '2-3', name: 'Shield Generator', bg: 'space_shield_gen', enemies: ['alien_brute', 'enemy_trooper'], shards: 30 },
      { id: '2-4', name: 'Hangar Bay', bg: 'space_hangar', enemies: ['enemy_trooper', 'alien_brute'], shards: 30 },
      { id: '2-5', name: 'Trash Compactor', bg: 'space_compactor', enemies: ['alien_brute'], shards: 35 },
      { id: '2-6', name: 'Turbolaser Control', bg: 'space_turbolaser', enemies: ['enemy_trooper', 'alien_brute'], shards: 35 },
      { id: '2-7', name: 'Symbiote Lab', bg: 'space_symbiote_lab', enemies: ['alien_brute', 'enemy_trooper'], shards: 35 },
      { id: '2-8', name: 'Command Bridge', bg: 'space_bridge', enemies: ['enemy_trooper', 'alien_brute'], shards: 40 },
      { id: '2-9', name: "Emperor's Throne", bg: 'space_throne', enemies: ['enemy_trooper', 'alien_brute'], shards: 40 },
      { id: '2-B', name: 'VS Green Goblin!', bg: 'space_station', isBoss: true, boss: 'goblin', shards: 60 },
    ],
  },
  {
    id: 3,
    name: 'Tatooine',
    icon: '🏜️',
    color: '#f59e0b',
    bg: 'desert',
    unlockChar: 'iron_kid',
    storyIntro: 'world3_intro',
    storyComplete: 'world3_complete',
    levels: [
      { id: '3-1', name: 'Mos Eisley Cantina', bg: 'desert', enemies: ['enemy_thug', 'alien_brute'], shards: 30 },
      { id: '3-2', name: 'Jundland Wastes', bg: 'tatooine_wastes', enemies: ['alien_brute', 'enemy_trooper'], shards: 35 },
      { id: '3-3', name: 'Moisture Farm', bg: 'tatooine_farm', enemies: ['enemy_trooper', 'alien_brute'], shards: 35 },
      { id: '3-4', name: 'Krayt Canyon', bg: 'tatooine_canyon', enemies: ['alien_brute'], shards: 35 },
      { id: '3-5', name: "Jabba's Palace", bg: 'tatooine_jabba', enemies: ['enemy_thug', 'alien_brute'], shards: 40 },
      { id: '3-6', name: 'Podrace Arena', bg: 'tatooine_podrace', enemies: ['enemy_trooper', 'alien_brute'], shards: 40 },
      { id: '3-7', name: 'Jedi Temple Ruins', bg: 'tatooine_temple', enemies: ['enemy_trooper', 'alien_brute'], shards: 40, hiddenItem: 'mandalorian' },
      { id: '3-8', name: 'Sand Crawler', bg: 'desert_sunset', enemies: ['alien_brute', 'enemy_trooper'], shards: 40 },
      { id: '3-9', name: 'Sarlacc Pit', bg: 'desert_night', enemies: ['alien_brute'], shards: 45 },
      { id: '3-B', name: 'VS Darth Venom!', bg: 'tatooine_arena', isBoss: true, boss: 'dark_warrior', shards: 70 },
    ],
  },
  {
    id: 4,
    name: 'The Upside Down',
    icon: '🌀',
    color: '#7c3aed',
    bg: 'rift',
    unlockChar: 'venom',
    storyIntro: 'world4_intro',
    storyComplete: 'world4_complete',
    levels: [
      { id: '4-1', name: 'Floating NYC', bg: 'rift', enemies: ['enemy_trooper', 'alien_brute', 'enemy_thug'], shards: 40 },
      { id: '4-2', name: 'Vine Tunnels', bg: 'rift_blue', enemies: ['alien_brute'], shards: 40 },
      { id: '4-3', name: 'Shadow School', bg: 'rift', enemies: ['alien_brute', 'enemy_trooper'], shards: 45 },
      { id: '4-4', name: 'Demogorgon Lair', bg: 'rift_blue', enemies: ['alien_brute'], shards: 45 },
      { id: '4-5', name: 'Mind Flayer Gate', bg: 'rift', enemies: ['alien_brute', 'enemy_trooper', 'enemy_thug'], shards: 50 },
      { id: '4-6', name: 'Merged Timeline', bg: 'rift_blue', enemies: ['enemy_trooper', 'alien_brute'], shards: 50 },
      { id: '4-7', name: 'Gravity Void', bg: 'rift', enemies: ['alien_brute', 'enemy_trooper'], shards: 50 },
      { id: '4-8', name: 'Dark Convergence', bg: 'rift_blue', enemies: ['enemy_trooper', 'alien_brute', 'enemy_thug'], shards: 55 },
      { id: '4-9', name: 'Event Horizon', bg: 'rift', enemies: ['alien_brute', 'enemy_trooper'], shards: 55 },
      { id: '4-B', name: 'VS The Rift King!', bg: 'rift_blue', isBoss: true, boss: 'rift_king', shards: 100 },
    ],
  },
  // Worlds 5-10: Coming Soon (locked stubs)
  { id: 5, name: 'Wakanda', icon: '🐆', color: '#8b5cf6', bg: 'rift', levels: [], storyIntro: 'world5_intro' },
  { id: 6, name: 'Asgard', icon: '⚡', color: '#3b82f6', bg: 'rift', levels: [], storyIntro: 'world6_intro' },
  { id: 7, name: 'Mustafar', icon: '🌋', color: '#ef4444', bg: 'rift', levels: [], storyIntro: 'world7_intro' },
  { id: 8, name: 'Quantum Realm', icon: '🔬', color: '#06b6d4', bg: 'rift', levels: [], storyIntro: 'world8_intro' },
  { id: 9, name: 'Multiverse Nexus', icon: '🌐', color: '#10b981', bg: 'rift', levels: [], storyIntro: 'world9_intro' },
  { id: 10, name: 'Final Dimension', icon: '💀', color: '#dc2626', bg: 'rift', levels: [], storyIntro: 'world10_intro' },
];

// Helper: Get world/level info from sequential level number
function getLevelInfo(levelNum) {
  let count = 0;
  for (const world of WORLDS) {
    if (world.levels.length > 0 && count + world.levels.length >= levelNum) {
      const idx = levelNum - count - 1;
      return { world, level: world.levels[idx], indexInWorld: idx };
    }
    count += world.levels.length;
  }
  return null;
}

const STORY_PANELS = {
  intro_rift: {
    panels: [
      { image: 'intro_1', text: 'Spider-Man swings through New York City on a normal day...', speaker: 'Narrator' },
      { image: 'intro_2', text: 'BOOM! A giant portal rips open! The Rift King has merged Doc Ock tech with Sith Holocrons!', speaker: 'Narrator' },
      { image: 'intro_3', text: 'Stormtroopers march into Times Square! TIE Fighters zoom overhead!', speaker: 'Narrator' },
      { image: 'intro_4', text: '"My Spidey Sense is CRAZY! Anakin! Mando! I need backup!"', speaker: 'Spider-Man' },
      { image: 'intro_5', text: `"Tag me in, Spidey! Let's GO!"`, speaker: 'Anakin Skywalker' },
    ],
  },
  world1_complete: {
    panels: [
      { image: 'world1_complete_panel', text: 'Doc Ock is defeated! The first Rift Crystal is safe!', speaker: 'Narrator' },
      { image: 'world1_complete_panel', text: 'A glowing Jedi robe falls through the rift...', speaker: 'Narrator' },
      { image: 'world1_complete_panel', text: `${HERO_NAME} puts it on. A lightsaber ignites! The Force awakens!`, speaker: 'Narrator' },
      { image: 'world1_complete_panel', text: `NEW: Jedi ${HERO_NAME}! May the Force be with you!`, speaker: 'System' },
    ],
  },
  world2_intro: {
    panels: [
      { image: 'world2_intro_panel', text: 'The portal leads to a massive Imperial Space Station...', speaker: 'Narrator' },
      { image: 'world2_intro_panel', text: 'Oscorp tech is fused with the Empire! Symbiotes in SPACE!', speaker: 'Narrator' },
      { image: 'world2_intro_panel', text: '"Green Goblin stole a TIE Fighter!"', speaker: HERO_NAME },
    ],
  },
  world2_complete: {
    panels: [
      { image: 'world2_intro_panel', text: "Green Goblin's TIE Glider crashes! Rift Crystal #2 secured!", speaker: 'Narrator' },
      { image: 'world2_intro_panel', text: "The symbiote bonds with Spider-Man's suit... it turns BLACK!", speaker: 'Narrator' },
      { image: 'world2_intro_panel', text: 'NEW: Black Suit Spider-Man!', speaker: 'System' },
    ],
  },
  world3_intro: {
    panels: [
      { image: 'world3_intro_panel', text: "A desert planet with two suns... that's Tatooine!", speaker: 'Spider-Man' },
      { image: 'world3_intro_panel', text: '"The Mandalorian is waiting for us ahead!"', speaker: 'Anakin' },
      { image: 'world3_intro_panel', text: '"Watch out... Darth Vader found a symbiote. He is DARTH VENOM!"', speaker: 'Narrator' },
    ],
  },
  world3_complete: {
    panels: [
      { image: 'world3_intro_panel', text: 'Darth Venom is defeated! The symbiote releases Vader!', speaker: 'Narrator' },
      { image: 'world3_intro_panel', text: `${HERO_NAME} combines Spider powers AND the Force!`, speaker: 'Narrator' },
      { image: 'world3_intro_panel', text: `NEW: Spider-Jedi ${HERO_NAME}! The ultimate hero!`, speaker: 'System' },
    ],
  },
  world4_intro: {
    panels: [
      { image: 'world4_intro_panel', text: 'Both worlds are fully colliding! NYC floats in space!', speaker: 'Narrator' },
      { image: 'world4_intro_panel', text: 'The Rift King - Doc Ock fused with the Emperor - controls it all!', speaker: 'Narrator' },
      { image: 'world4_intro_panel', text: '"This is it. Everything comes down to this fight."', speaker: HERO_NAME },
    ],
  },
  world4_complete: {
    panels: [
      { image: 'victory_panel', text: 'THE RIFT KING IS DEFEATED!', speaker: 'Narrator' },
      { image: 'victory_panel', text: 'The Rift seals shut! Both worlds are saved!', speaker: 'Narrator' },
      { image: 'victory_panel', text: '"May the Force be with you, Spidey!"', speaker: 'Luke Skywalker' },
      { image: 'victory_panel', text: '"You too! Call me anytime!"', speaker: 'Spider-Man' },
      { image: 'victory_panel', text: `"I saved TWO universes! Best. Day. EVER!"`, speaker: HERO_NAME },
      { image: 'victory_panel', text: `CONGRATULATIONS ${HERO_NAME.toUpperCase()}! ULTIMATE HERO!`, speaker: 'System' },
      { image: 'victory_panel', text: 'DEMOGORGON UNLOCKED! The Upside Down bows to you!', speaker: 'System' },
    ],
  },
  // ── MILESTONE STORIES (every 5 and 10 levels) ──
  milestone_5: {
    panels: [
      { image: 'world1_complete_panel', text: 'Halfway through NYC! The streets are getting more dangerous...', speaker: 'Narrator' },
      { image: 'world1_complete_panel', text: '"These portals... they\'re getting bigger. Something massive is coming."', speaker: 'Spider-Man' },
    ],
  },
  milestone_10: {
    panels: [
      { image: 'world1_complete_panel', text: 'Doc Ock crashes through the building! The first Rift Crystal shatters!', speaker: 'Narrator' },
      { image: 'world1_complete_panel', text: 'NYC is saved... but the rift leads somewhere darker.', speaker: 'Narrator' },
      { image: 'world2_intro_panel', text: 'A hologram flickers: coordinates to an Imperial Space Station orbiting Earth.', speaker: 'Narrator' },
      { image: 'world2_intro_panel', text: '"That\'s no moon... wait, wrong movie. But still — we gotta go up there!"', speaker: 'Spider-Man' },
    ],
  },
  milestone_15: {
    panels: [
      { image: 'world2_intro_panel', text: 'Halfway through the Space Station. The symbiote grows stronger...', speaker: 'Narrator' },
      { image: 'world2_intro_panel', text: '"I can feel it bonding with the suit. It wants to help us fight."', speaker: HERO_NAME },
    ],
  },
  milestone_20: {
    panels: [
      { image: 'world2_intro_panel', text: 'Green Goblin\'s TIE Glider explodes! The Space Station shudders!', speaker: 'Narrator' },
      { image: 'world2_intro_panel', text: 'The symbiote fully bonds. Spider-Man\'s suit turns jet BLACK.', speaker: 'Narrator' },
      { image: 'world3_intro_panel', text: 'A new portal opens — twin suns shine through. Tatooine awaits.', speaker: 'Narrator' },
      { image: 'world3_intro_panel', text: '"The Mandalorian sent a signal. The third crystal is buried in the Jedi Temple."', speaker: 'Anakin' },
      { image: 'world3_intro_panel', text: '"Then let\'s go get it. All of us. Together."', speaker: HERO_NAME },
    ],
  },
  milestone_25: {
    panels: [
      { image: 'world3_intro_panel', text: 'The twin suns beat down mercilessly. The desert hides ancient secrets.', speaker: 'Narrator' },
      { image: 'world3_intro_panel', text: '"The Mandalorian left his helmet here. He was trying to warn us about Darth Venom..."', speaker: HERO_NAME },
    ],
  },
  milestone_30: {
    panels: [
      { image: 'world3_intro_panel', text: 'Darth Venom falls! The symbiote releases Vader at last!', speaker: 'Narrator' },
      { image: 'world3_intro_panel', text: '"Three crystals recovered. The Rift King holds the final one."', speaker: 'Anakin' },
      { image: 'world4_intro_panel', text: 'The sky tears open. Both universes merge into one twisted reality!', speaker: 'Narrator' },
      { image: 'world4_intro_panel', text: '"Every hero we\'ve met... every power we\'ve gained... it all comes down to this."', speaker: HERO_NAME },
    ],
  },
};
