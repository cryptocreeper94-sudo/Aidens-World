class ThreeEngine {
  constructor() {
    this.container = document.getElementById('game-container');
    this.scene = new THREE.Scene();
    
    // Set a deep space/sky background color
    this.scene.background = new THREE.Color(0x0a0a1a);
    this.scene.fog = new THREE.Fog(0x0a0a1a, 20, 100);

    // Camera setup
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    this.camera.position.set(0, 5, 15);
    this.camera.lookAt(0, 0, -10);

    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    
    // Insert Three.js canvas BEFORE Phaser canvas
    this.renderer.domElement.style.position = 'absolute';
    this.renderer.domElement.style.top = '0';
    this.renderer.domElement.style.left = '0';
    this.renderer.domElement.style.zIndex = '0'; // Behind Phaser
    this.container.appendChild(this.renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    this.scene.add(dirLight);

    // Grid / Ground Plane
    const gridHelper = new THREE.GridHelper(200, 100, 0x06b6d4, 0x333333);
    gridHelper.position.y = 0;
    this.scene.add(gridHelper);
    this.grid = gridHelper;

    // Player Object (Temporary Cylinder until GLB loads)
    const playerGeo = new THREE.CylinderGeometry(0.5, 0.5, 1.5, 8);
    const playerMat = new THREE.MeshStandardMaterial({ color: 0xe63946 });
    this.player = new THREE.Mesh(playerGeo, playerMat);
    this.player.position.set(0, 1, 0); // 1 = standing on ground
    this.scene.add(this.player);

    // Enemies Array
    this.enemies = [];

    // Animation Loop Variables
    this.gameSpeed = 0.5;
    this.isRunning = false;

    // Handle Resize
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    this.animate();
  }

  setSpeed(speed) {
    // Sync speed from Phaser (Phaser speed is typically 3-5, scale down for Three)
    this.gameSpeed = speed * 0.1;
  }

  setRunning(state) {
    this.isRunning = state;
  }

  // Called from Phaser's jump logic
  syncPlayer(yPos, isDucking, isSwinging, textureKey) {
    // Phaser yPos goes down as value increases. 
    // Let's just use Phaser's jump state to drive the 3D player Y.
    // Phaser ground is ~height-50.
    
    // If ducking, shrink height
    if (isDucking) {
      this.player.scale.set(1, 0.5, 1);
      this.player.position.y = 0.5;
    } else {
      this.player.scale.set(1, 1, 1);
      // Map Phaser Y (approx 325 to 100) to Three Y (1 to 8)
      // Assuming groundY is ~325 in Phaser
      const phaserGround = 325;
      const jumpHeight = phaserGround - yPos; // positive when jumping
      
      this.player.position.y = 1 + (jumpHeight * 0.05);
    }
    
    // Change color based on active character
    if (textureKey === 'jedi_kid') {
      this.player.material.color.setHex(0x22d3ee); // Cyan
    } else if (textureKey === 'hero_black') {
      this.player.material.color.setHex(0x1e1e2e); // Black
    } else {
      this.player.material.color.setHex(0xe63946); // Red
    }
  }

  spawnEnemy(enemyId) {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const enemy = new THREE.Mesh(geo, mat);
    
    // Spawn far down the Z axis
    enemy.position.set(0, 0.5, -50);
    this.scene.add(enemy);
    
    this.enemies.push({
      mesh: enemy,
      id: enemyId
    });
  }

  removeEnemy(enemyId) {
    const index = this.enemies.findIndex(e => e.id === enemyId);
    if (index > -1) {
      this.scene.remove(this.enemies[index].mesh);
      this.enemies.splice(index, 1);
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    if (this.isRunning) {
      // Scroll the grid to simulate forward movement
      this.grid.position.z += this.gameSpeed;
      if (this.grid.position.z > 2) {
        this.grid.position.z = 0; // seamless loop
      }

      // Move enemies toward camera
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i];
        e.mesh.position.z += this.gameSpeed * 2; // Move faster than grid
        
        // Remove if past camera
        if (e.mesh.position.z > 15) {
          this.scene.remove(e.mesh);
          this.enemies.splice(i, 1);
        }
      }
    }

    this.renderer.render(this.scene, this.camera);
  }
}

// Global instance
window.ThreeInstance = null;
