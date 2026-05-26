/* ========================================
   LEVEL DATA — Procedural Geometry Dash Logic
   ======================================== */

const LevelData = {
  // Geometry Dash-calibrated difficulty progression
  generateConfig: function(levelNum) {
    // Speed: 300 at lvl 1 (real GD feel), ramps to ~700 by lvl 20
    const gameSpeed = 300 + Math.min(levelNum * 20, 400); 

    // Distance to finish — meaningful runs from the start
    const finishDistance = 6000 + (levelNum * 600);

    // Tower probability — start with real obstacles
    const towerFreq = Math.min(0.20 + (levelNum * 0.012), 0.40);
    
    // Enemy probability — enemies from the start
    const enemyFreq = Math.min(0.15 + (levelNum * 0.010), 0.30);
    
    // More portals = more world swaps per level (at least 1-2 per run)
    const portalFreq = Math.min(0.03 + (levelNum * 0.002), 0.06); 
    const shardFreq = 0.15;

    // Obstacle gap: tighter from the start, gets intense
    const obstacleGap = Math.max(2.5 - (levelNum * 0.05), 1.2);

    // Tower height: single blocks for 1-9, double for 10+
    const maxTowerBlocks = levelNum >= 10 ? 2 : 1;

    const worlds = [
      { key: 'city', bg: 'nyc_skyline', color: '#1e1b4b', enemies: ['enemy_thug'] },
      { key: 'upside_down', bg: 'rift', color: '#450a0a', enemies: ['alien_brute'] },
      { key: 'desert', bg: 'desert', color: '#1e3a8a', enemies: ['enemy_trooper'] }
    ];

    return {
      levelNum, gameSpeed, finishDistance, towerFreq, enemyFreq,
      portalFreq, shardFreq, obstacleGap, maxTowerBlocks, worlds
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
    name: 'Venom',
    sprite: 'alien_brute',
    color: '#111111',
    ability: 'Tendril Whip',
    abilityDesc: 'We are Venom!',
    unlockText: 'Seal the Rift!',
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
      { id: '1-1', name: 'Rooftop Run', enemies: ['thug'], shards: 20, isTutorial: true },
      { id: '1-2', name: 'Times Square Chaos', enemies: ['thug', 'trooper'], shards: 25 },
      { id: '1-3', name: 'Central Park Portal', enemies: ['trooper', 'thug'], shards: 25 },
      { id: '1-4', name: 'Oscorp Tower', enemies: ['trooper'], shards: 30 },
      { id: '1-B', name: 'VS Doc Ock!', isBoss: true, boss: 'doc_ock', shards: 40 },
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
      { id: '2-1', name: 'Docking Bay', enemies: ['trooper'], shards: 25 },
      { id: '2-2', name: 'Death Star Core', enemies: ['trooper', 'drone'], shards: 30 },
      { id: '2-3', name: 'Symbiote Lab', enemies: ['symbiote', 'trooper'], shards: 30 },
      { id: '2-4', name: 'Command Bridge', enemies: ['trooper', 'drone'], shards: 35 },
      { id: '2-B', name: 'VS Green Goblin!', isBoss: true, boss: 'goblin', shards: 50 },
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
      { id: '3-1', name: 'Mos Eisley Cantina', enemies: ['thug', 'symbiote'], shards: 30 },
      { id: '3-2', name: 'Jundland Wastes', enemies: ['symbiote', 'trooper'], shards: 35 },
      { id: '3-3', name: 'Jedi Temple Ruins', enemies: ['trooper', 'symbiote'], shards: 35, hiddenItem: 'mandalorian' },
      { id: '3-4', name: 'Sarlacc Pit', enemies: ['symbiote'], shards: 40 },
      { id: '3-B', name: 'VS Darth Venom!', isBoss: true, boss: 'dark_warrior', shards: 60 },
    ],
  },
  {
    id: 4,
    name: 'The Rift',
    icon: '🌀',
    color: '#7c3aed',
    bg: 'rift',
    unlockChar: 'venom',
    storyIntro: 'world4_intro',
    storyComplete: 'world4_complete',
    levels: [
      { id: '4-1', name: 'Floating NYC', enemies: ['trooper', 'symbiote', 'thug'], shards: 40 },
      { id: '4-2', name: 'Star Destroyer', enemies: ['drone', 'trooper'], shards: 40 },
      { id: '4-3', name: 'The Convergence', enemies: ['symbiote', 'trooper', 'thug'], shards: 45 },
      { id: '4-4', name: 'Final Gauntlet', enemies: ['trooper', 'symbiote', 'drone', 'thug'], shards: 50 },
      { id: '4-B', name: 'VS The Rift King!', isBoss: true, boss: 'rift_king', shards: 80 },
    ],
  },
];

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
      { image: 'victory_panel', text: 'VENOM UNLOCKED! "We... are... VENOM!"', speaker: 'System' },
    ],
  },
};
