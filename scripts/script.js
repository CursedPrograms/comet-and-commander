 // Initialize Three.js scene
 const scene = new THREE.Scene();
 const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
 const renderer = new THREE.WebGLRenderer({ antialias: true });
 renderer.setSize(window.innerWidth, window.innerHeight);
 document.getElementById('game-container').appendChild(renderer.domElement);

 // Add ambient light
 const ambientLight = new THREE.AmbientLight(0x404040);
 scene.add(ambientLight);

 // Add directional light (sun)
 const sunLight = new THREE.DirectionalLight(0xffffff, 1);
 sunLight.position.set(5, 3, 5);
 scene.add(sunLight);

 // Create starfield
 const starGeometry = new THREE.BufferGeometry();
 const starMaterial = new THREE.PointsMaterial({ color: 0xFFFFFF, size: 0.1 });
 const starVertices = [];
 for (let i = 0; i < 10000; i++) {
   const x = (Math.random() - 0.5) * 2000;
   const y = (Math.random() - 0.5) * 2000;
   const z = (Math.random() - 0.5) * 2000;
   starVertices.push(x, y, z);
 }
 starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
 const stars = new THREE.Points(starGeometry, starMaterial);
 scene.add(stars);

 // Game state
 let resources = 1000;
 const ships = [];
 const enemies = [];
 const resourceNodes = [];
 let selectedUnit = null;

 // Ship class
 class Ship {
   constructor(type, cost, health, damage, color) {
     this.type = type;
     this.cost = cost;
     this.health = health;
     this.damage = damage;
     this.selected = false;
     this.target = null;

     // Create ship mesh
     let geometry;
     switch (type) {
       case 'fighter':
         geometry = new THREE.ConeGeometry(0.5, 2, 8);
         break;
       case 'cruiser':
         geometry = new THREE.BoxGeometry(1.5, 0.5, 3);
         break;
       case 'harvester':
         geometry = new THREE.SphereGeometry(0.75, 16, 16);
         break;
     }
     const material = new THREE.MeshPhongMaterial({ color: color });
     this.mesh = new THREE.Mesh(geometry, material);
     this.mesh.position.set(Math.random() * 10 - 5, Math.random() * 10 - 5, Math.random() * 10 - 5);
     scene.add(this.mesh);
     ships.push(this);
   }

   move() {
     if (this.target) {
       const direction = new THREE.Vector3().subVectors(this.target, this.mesh.position);
       if (direction.length() > 0.1) {
         direction.normalize();
         this.mesh.position.add(direction.multiplyScalar(0.1));
         this.mesh.lookAt(this.target);
       }
     }
   }

   select() {
     this.selected = true;
     const geometry = new THREE.RingGeometry(1, 1.2, 32);
     const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
     this.selectionRing = new THREE.Mesh(geometry, material);
     this.selectionRing.rotation.x = Math.PI / 2;
     this.mesh.add(this.selectionRing);
   }

   deselect() {
     this.selected = false;
     if (this.selectionRing) {
       this.mesh.remove(this.selectionRing);
       this.selectionRing.geometry.dispose();
       this.selectionRing.material.dispose();
       this.selectionRing = null;
     }
   }
 }

 // Enemy class
 class Enemy {
   constructor() {
     const geometry = new THREE.TetrahedronGeometry(0.8);
     const material = new THREE.MeshPhongMaterial({ color: 0xff0000 });
     this.mesh = new THREE.Mesh(geometry, material);
     this.mesh.position.set(Math.random() * 50 - 25, Math.random() * 50 - 25, Math.random() * 50 - 25);
     scene.add(this.mesh);
     enemies.push(this);
   }

   move() {
     this.mesh.position.x += (Math.random() - 0.5) * 0.1;
     this.mesh.position.y += (Math.random() - 0.5) * 0.1;
     this.mesh.position.z += (Math.random() - 0.5) * 0.1;
   }
 }

 // Resource Node class
 class ResourceNode {
   constructor() {
     const geometry = new THREE.OctahedronGeometry(1, 0);
     const material = new THREE.MeshStandardMaterial({
       color: 0xffA500,
       metalness: 1,
       roughness: 0.2,
       emissive: 0xffA500,
       emissiveIntensity: 0.5
     });
     this.mesh = new THREE.Mesh(geometry, material);
     this.mesh.position.set(Math.random() * 50 - 25, Math.random() * 50 - 25, Math.random() * 50 - 25);
     scene.add(this.mesh);
     resourceNodes.push(this);
   }
 }

 // Build ships
 document.getElementById('build-fighter').addEventListener('click', () => {
   if (resources >= 100) {
     resources -= 100;
     new Ship('fighter', 100, 50, 10, 0x0000ff);
     updateHUD();
   }
 });

 document.getElementById('build-cruiser').addEventListener('click', () => {
   if (resources >= 300) {
     resources -= 300;
     new Ship('cruiser', 300, 200, 30, 0x00ff00);
     updateHUD();
   }
 });

 document.getElementById('build-harvester').addEventListener('click', () => {
   if (resources >= 150) {
     resources -= 150;
     new Ship('harvester', 150, 75, 5, 0xffff00);
     updateHUD();
   }
 });

 // Update HUD
 function updateHUD() {
   document.getElementById('resources').textContent = `Resources: ${resources}`;
   if (selectedUnit) {
     document.getElementById('selected-info').textContent = `Selected: ${selectedUnit.type} (Health: ${selectedUnit.health})`;
   } else {
     document.getElementById('selected-info').textContent = 'No unit selected';
   }
 }

 // Raycaster for selection
 const raycaster = new THREE.Raycaster();
 const mouse = new THREE.Vector2();

 // Handle click events for selection
 window.addEventListener('click', (event) => {
   mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
   mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

   raycaster.setFromCamera(mouse, camera);

   const intersects = raycaster.intersectObjects(scene.children, true);

   if (intersects.length > 0) {
     const clickedObject = intersects[0].object;
     const clickedShip = ships.find(ship => ship.mesh === clickedObject);

     if (clickedShip) {
       if (selectedUnit) {
         selectedUnit.deselect();
       }
       selectedUnit = clickedShip;
       selectedUnit.select();
       updateHUD();
     } else {
       // If clicked elsewhere, set it as the target for the selected unit
       if (selectedUnit) {
         selectedUnit.target = intersects[0].point;
       }
     }
   }
 });

 // Handle window resize
 window.addEventListener('resize', () => {
   camera.aspect = window.innerWidth / window.innerHeight;
   camera.updateProjectionMatrix();
   renderer.setSize(window.innerWidth, window.innerHeight);
 });

 // Create initial enemies and resource nodes
 for (let i = 0; i < 5; i++) {
   new Enemy();
   new ResourceNode();
 }

 // Animation loop
 function animate() {
   requestAnimationFrame(animate);

   // Move ships
   ships.forEach(ship => ship.move());

   // Move enemies
   enemies.forEach(enemy => enemy.move());

   // Rotate resource nodes
   resourceNodes.forEach(node => {
     node.mesh.rotation.x += 0.01;
     node.mesh.rotation.y += 0.01;
   });

   // Rotate camera around the scene
   camera.position.x = Math.sin(Date.now() * 0.001) * 30;
   camera.position.z = Math.cos(Date.now() * 0.001) * 30;
   camera.position.y = Math.sin(Date.now() * 0.0005) * 10;
   camera.lookAt(scene.position);

   renderer.render(scene, camera);
 }

 // Start the game
 animate();
 updateHUD();

 // Remove loading message
 document.getElementById('loading').style.display = 'none';
