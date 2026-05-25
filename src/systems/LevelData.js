/* ========================================
   LEVEL DATA — Procedural Geometry Dash Logic
   ======================================== */

const LevelData = {
  // Generate infinite progression parameters based on Level number
  generateConfig: function(levelNum) {
    const baseSpeed = 180;
    // Cap max speed increase so it doesn't become literally impossible
    const gameSpeed = baseSpeed + Math.min(levelNum * 15, 800); 

    // Distance to reach the Finish Line
    const finishDistance = 10000 + (levelNum * 1000);

    // Frequencies (Chance per tick to spawn object)
    // Tower probability (platforming)
    const towerFreq = Math.min(0.15 + (levelNum * 0.02), 0.40);
    
    // Enemy probability (on ground or on tower)
    const enemyFreq = Math.min(0.10 + (levelNum * 0.02), 0.30);
    
    // Portal probability (Worlds Collide dimension swap)
    const portalFreq = 0.02; 

    const shardFreq = 0.15;

    // The Worlds Collide backgrounds and colors
    const worlds = [
      { key: 'city', bg: 'nyc_skyline', color: '#1e1b4b', enemies: ['enemy_thug'] },
      { key: 'upside_down', bg: 'rift', color: '#450a0a', enemies: ['alien_brute'] },
      { key: 'desert', bg: 'desert', color: '#1e3a8a', enemies: ['enemy_trooper'] }
    ];

    return {
      levelNum,
      gameSpeed,
      finishDistance,
      towerFreq,
      enemyFreq,
      portalFreq,
      shardFreq,
      worlds
    };
  }
};
