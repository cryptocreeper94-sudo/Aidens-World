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
    this.container.insertBefore(this.renderer.domElement, this.container.firstChild);

    // Ensure Phaser canvas sits on top
    setTimeout(() => {
      const phaserCanvas = this.container.querySelector('canvas:not([data-engine="three"])');
      if (phaserCanvas) {
        phaserCanvas.style.position = 'relative';
        phaserCanvas.style.zIndex = '10';
      }
    }, 500);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    this.scene.add(dirLight);

    // Grid / Ground Plane
    const gridHelper = new THREE.GridHelper(200, 100, 0x06b6d4, 0x111122);
    gridHelper.position.y = 0;
    this.scene.add(gridHelper);
    this.grid = gridHelper;

    // Solid dark floor
    const floorGeo = new THREE.PlaneGeometry(200, 200);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x050510, roughness: 0.8 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.1;
    this.scene.add(floor);

    // Procedural Stars
    const starGeo = new THREE.BufferGeometry();
    const starCount = 1000;
    const starPos = new Float32Array(starCount * 3);
    for(let i=0; i<starCount*3; i++) {
      starPos[i] = (Math.random() - 0.5) * 200;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({color: 0xffffff, size: 0.2});
    this.stars = new THREE.Points(starGeo, starMat);
    this.scene.add(this.stars);

    // Scenery Buildings Array
    this.buildings = [];
    this.spawnScenery();

    // Player Object Container
    this.player = new THREE.Group();
    this.player.position.set(0, 0, 0); 
    this.scene.add(this.player);

    this.loader = new THREE.GLTFLoader();
    
    // We do NOT load the model in the constructor anymore. 
    // It will be triggered by LevelScene.js calling loadCharacter()

    // Enemies Array
    this.enemies = [];

    // Animation Loop Variables
    this.gameSpeed = 0.5;
    this.isRunning = false;
    this.clock = new THREE.Clock();
    this.mixer = null;
    this.actions = {};
    this.activeAction = null;

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
    if (this.isRunning !== state) {
      this.isRunning = state;
      // Switch animation if mixer is ready
      if (this.mixer) {
        // Handle custom GLB animations (often named differently, e.g. "Run", "Walk", "Running")
        const nextAction = state ? 
          (this.actions['Running'] || this.actions['Run'] || this.actions['Walking']) : 
          (this.actions['Idle'] || this.actions['Stand']);
          
        if (nextAction && this.activeAction !== nextAction) {
          nextAction.reset();
          nextAction.play();
          if (this.activeAction) this.activeAction.crossFadeTo(nextAction, 0.3, true);
          this.activeAction = nextAction;
        }
      }
    }
  }

  loadCharacter(textureKey) {
    let targetFile = 'assets/models/RobotExpressive.glb';
    
    // Map Phaser keys to expected GLB filenames
    if (textureKey === 'hero_red') targetFile = 'assets/models/spiderman.glb';
    else if (textureKey === 'jedi_kid') targetFile = 'assets/models/anakin.glb';
    else if (textureKey === 'hero_black') targetFile = 'assets/models/venom.glb';
    else if (textureKey === 'mandalorian') targetFile = 'assets/models/mandalorian.glb';

    // Attempt to load the specific character. If it 404s, fallback to Robot.
    this.loader.load(
      targetFile,
      (gltf) => this._setupModel(gltf, textureKey),
      undefined,
      (err) => {
        console.warn(`[ThreeEngine] Custom model ${targetFile} not found. Falling back to placeholder.`);
        this.loader.load('assets/models/RobotExpressive.glb', (fbGltf) => this._setupModel(fbGltf, textureKey));
      }
    );
  }

  _setupModel(gltf, textureKey) {
    // Remove old model if it exists
    if (this.playerModel) {
      this.player.remove(this.playerModel);
      this.playerModel = null;
    }

    const model = gltf.scene;
    // Scale and position (adjust if custom models are huge)
    model.scale.set(0.3, 0.3, 0.3);
    model.rotation.y = Math.PI; // Face away from camera
    
    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.userData.originalMat = child.material;
      }
    });
    
    this.player.add(model);
    this.playerModel = model;

    // Setup Animations
    this.mixer = new THREE.AnimationMixer(model);
    this.actions = {};
    
    gltf.animations.forEach((clip) => {
      this.actions[clip.name] = this.mixer.clipAction(clip);
    });

    // Determine starting state
    const startAnim = this.isRunning ? 
      (this.actions['Running'] || this.actions['Run'] || this.actions['Walking']) : 
      (this.actions['Idle'] || this.actions['Stand']);

    if (startAnim) {
      this.activeAction = startAnim;
      this.activeAction.play();
    }
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
    
    // Handle Ducking vs Jumping Animation
    if (this.mixer && this.actions['Jump']) {
      const isJumping = (yPos < 320); // Not on ground
      
      if (isJumping && this.activeAction !== this.actions['Jump']) {
        this.actions['Jump'].reset().play();
        this.activeAction.crossFadeTo(this.actions['Jump'], 0.1, true);
        this.activeAction = this.actions['Jump'];
      } else if (!isJumping && this.activeAction === this.actions['Jump']) {
        // Back to running
        const runAction = this.actions['Running'] || this.actions['Walking'];
        if (runAction) {
          runAction.reset().play();
          this.activeAction.crossFadeTo(runAction, 0.2, true);
          this.activeAction = runAction;
        }
      }
    }

    // Change color based on active character (if using placeholder)
    let colorHex = 0xe63946;
    if (textureKey === 'jedi_kid') {
      colorHex = 0x22d3ee; // Cyan
    } else if (textureKey === 'hero_black') {
      colorHex = 0x7c3aed; // Purple/Black
    }
    
    // Only apply the color tint if we are using the fallback robot! 
    // Real models should keep their native TrustGen textures.
    if (this.playerModel && this.playerModel.children.length > 0 && this.playerModel.children[0].name.includes('Robot')) {
      this.playerModel.traverse((child) => {
        if (child.isMesh && child.material) {
          if (!child.userData.originalColor) {
            child.userData.originalColor = child.material.color.clone();
          }
          const c = new THREE.Color(colorHex);
          child.material.color.copy(child.userData.originalColor).lerp(c, 0.5);
        }
      });
    }
  }

  spawnScenery() {
    // Create random neon monolithic buildings along the sides
    const buildingGeo = new THREE.BoxGeometry(1, 1, 1);
    
    for (let i = 0; i < 40; i++) {
      const isLeft = Math.random() > 0.5;
      const xPos = isLeft ? -10 - Math.random() * 20 : 10 + Math.random() * 20;
      const zPos = -100 + Math.random() * 120;
      const height = 5 + Math.random() * 25;
      const width = 2 + Math.random() * 5;
      
      const mat = new THREE.MeshStandardMaterial({ 
        color: 0x111122, 
        roughness: 0.1,
        metalness: 0.8
      });
      
      const building = new THREE.Mesh(buildingGeo, mat);
      building.scale.set(width, height, width);
      building.position.set(xPos, height / 2, zPos);
      
      // Neon edge highlight
      const edges = new THREE.EdgesGeometry(buildingGeo);
      const lineMat = new THREE.LineBasicMaterial({ color: Math.random() > 0.5 ? 0x06b6d4 : 0xe63946 });
      const line = new THREE.LineSegments(edges, lineMat);
      building.add(line);
      
      this.scene.add(building);
      this.buildings.push(building);
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

    const delta = this.clock.getDelta();
    if (this.mixer) this.mixer.update(delta);

    if (this.isRunning) {
      // Scroll the grid to simulate forward movement
      this.grid.position.z += this.gameSpeed;
      if (this.grid.position.z > 2) {
        this.grid.position.z = 0; // seamless loop
      }
      
      // Rotate stars slowly
      this.stars.rotation.y += 0.0005;

      // Move scenery buildings toward camera
      this.buildings.forEach(b => {
        b.position.z += this.gameSpeed;
        if (b.position.z > 20) {
          b.position.z = -100 - Math.random() * 20;
          b.scale.y = 5 + Math.random() * 25;
          b.position.y = b.scale.y / 2;
        }
      });

      // Move enemies toward camera
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i];
        e.mesh.position.z += this.gameSpeed * 2; // Move faster than grid
        
        // Wobble enemy
        e.mesh.rotation.y += 0.05;
        e.mesh.rotation.x += 0.02;

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
