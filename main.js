import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118.1/build/three.module.js';
// import * as THREE from 'https://londonpark.xyz/three.module-0.118.1.js';
import {GLTFLoader} from 'https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/loaders/GLTFLoader.js';
import {entity} from './entity.js';
import { player_entity } from './player-entity.js';
import { third_person_camera } from './third-person-camera.js';
import { entity_manager } from './entity-manager.js';
import { player_input } from './player-input.js';
import { npc_entity } from './npc-entity.js';
import { math } from './math.js';
import { health_bar } from './health-bar.js';
import { health_component } from './health-component.js';
import { attack_controller } from './attack-controller.js';
import { spatial_grid_controller } from './spatial-grid-controller.js';
import { spatial_hash_grid } from './spatial-hash-grid.js';

class Mesozoic {
    constructor() {
      this._Initialize();
    }
  
    _Initialize() {
      this._threejs = new THREE.WebGLRenderer({
        antialias: true,
      });
      this._threejs.outputEncoding = THREE.sRGBEncoding;
      this._threejs.gammaFactor = 2.2;
      this._threejs.shadowMap.enabled = true;
      this._threejs.shadowMap.type = THREE.PCFSoftShadowMap;
      this._threejs.setPixelRatio(window.devicePixelRatio);
      this._threejs.setSize(window.innerWidth, window.innerHeight);
      this._threejs.domElement.id = 'threejs';
      
  
      document.getElementById('container').appendChild(this._threejs.domElement);
  
      window.addEventListener('resize', () => {
        this._OnWindowResize();
      }, false);
  
      const fov = 60;
      const aspect = 1920 / 1080;
      const near = 1.0;
      const far = 10000.0;
      this._camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
      this._camera.position.set(25, 70, 100);
  
      this._scene = new THREE.Scene();
      this._scene.background = new THREE.Color(0xFFFFFF);
      this._scene.fog = new THREE.FogExp2(0x89b2eb, 0.001);
      // this._scene.fog = new THREE.FogExp2(0xFFFFFF, 0.001);
  
      let light = new THREE.DirectionalLight(0xFFFFFF, 0.9);
      light.position.set(0, 80, 0);
      light.target.position.set(0, 3, 0);
      light.castShadow = true;
      light.shadow.bias = -0.001;
      light.shadow.mapSize.width = 250;
      light.shadow.mapSize.height = 250;
      light.shadow.camera.near = 0.1;
      light.shadow.camera.far = 1000.0;
      light.shadow.camera.left = 250;
      light.shadow.camera.right = -250;
      light.shadow.camera.top = 250;
      light.shadow.camera.bottom = -250;

      let light2 = new THREE.AmbientLight(0x404040);
      this._scene.add(light);
      this._scene.add(light2)  
      this._sun = light;

      const startBtn = document.querySelector("#startBtn");
      // startBtn.style.cssText = "position: absolute; top: 50%; left: 50%; background-color:#2ea44f; border: 1px solid rgba(27, 31, 35, .15); border-radius: 6px; box-shadow: rgba(27, 31, 35, .1) 0 1px 0; box-sizing: border-box; color: #fff; cursor:pointer; font-family:Segoe UI; font-size: 14px; font-weight: 600; line-height: 20px; padding: 6px 16px; text-align:center; text-decoration: none; user-select: none; touch-action: manipulation; display: block;"
      const timeDisplay = document.querySelector("#time-display");
      // timeDisplay.style.cssText = "position: absolute; right: 4%; top: 8%; font-size: 30px; font-weight: 600;";
      const progressBarContainer = document.querySelector("#progress-bar-container");
      const progressBar = document.querySelector("#progress-bar");
      const label = document.querySelector("#label");
      const loadingScreen = document.querySelector("#loading");
      const instructionImageContainer = document.querySelector("#instruction-image-container");
      
      const loadingManager = new THREE.LoadingManager();
      loadingManager.onProgress = function(url, loaded, total) {
        progressBar.value = (loaded/total) * 100;
      }
      
      loadingManager.onLoad = function() {
        startBtn.style.display = "block"
        startBtn.style.display = "block";
        progressBar.style.display = "none";
        label.style.display = "none";
        loadingScreen.style.display = "none";
        instructionImageContainer.style.display = "flex";
      }
      let startTime = 0;
      let elapsedTime = 0;
      let currentTime = 0;
      let paused = true;
      let intervalId;
      let hrs = 0;
      let mins = 0;
      let secs = 0;

      startBtn.addEventListener("click", () => {
        if(paused){
          paused = false;
          startTime = Date.now() - elapsedTime;
          intervalId = setInterval(updateTime, 1000);
        }
      startBtn.style.display='none'
      progressBarContainer.style.display = 'none';
      instructionImageContainer.style.visibility = "hidden";

      // setTimeout(()=> {
      //   this._LoadNPC_2();
      // }, 10000);

      // setTimeout(()=> {
      //   this._LoadNPC_3();
      // }, 20000);

      // setTimeout(()=> {
      //   this._LoadNPC_4();
      // }, 30000);
  
      });

    function updateTime(){
      elapsedTime = Date.now() - startTime;

    secs = Math.floor((elapsedTime / 1000) % 60);
    mins = Math.floor((elapsedTime / (1000 * 60)) % 60);
    hrs = Math.floor((elapsedTime / (1000 * 60 * 60)) % 60);

    secs = pad(secs);
    mins = pad(mins);
    hrs = pad(hrs);

    timeDisplay.textContent = `${hrs}:${mins}:${secs}`;

    function pad(unit){
        return (("0") + unit).length > 2 ? unit : "0" + unit
    }
  }
    const loader2 = new GLTFLoader(loadingManager);
    loader2.setPath('../mesozoic-resources/glb/map/');
    loader2.load('mesozoic_hdri_glb.glb', (glb) => {
      this._target = glb.scene;
      this._target.scale.set(2000, 1000, 2000);
      this._target.position.x = -1300;
      this._target.position.y = -83;
      this._target.position.z = 0;
      // this._target.scale.set(900, 900, 900);
      // this._target.position.x = -700;
      // this._target.position.y = -83;
      // this._target.position.z = 0;
      
  
      this._scene.add(this._target);
   
      this._target.traverse(c => {
        c.castShadow = true;
        c.receiveShadow = true;
      });
    })

    // loader2.load('mesozoic_modeling_glb_1.glb', (glb) => {
    //   this._target = glb.scene;
    //   this._target.scale.set(600, 600, 600);
    //   this._target.position.x = 0;
    //   this._target.position.y = 9;
    //   this._target.position.z = 0;
  
    //   this._scene.add(this._target);
   
    //   this._target.traverse(c => {
    //     c.castShadow = true;
    //     c.receiveShadow = true;
    //   });
    // })

      this._entityManager = new entity_manager.EntityManager();
      this._grid = new spatial_hash_grid.SpatialHashGrid(
          [[-1000, -1000], [1000, 1000]], [100, 100]);
    
      this._LoadPlayer(loadingManager);
      this._LoadNPC_1(loadingManager);
      this._LoadNPC_2(loadingManager);
      this._LoadNPC_3(loadingManager);
      this._LoadNPC_4(loadingManager);
      this._previousRAF = null;
      this._RAF();
    }

    _LoadPlayer() {
        const params = {
            camera: this._camera,
            scene: this._scene,
          };
        const player = new entity.Entity();
        player.AddComponent(new player_input.Joystick(params));
        player.AddComponent(new player_entity.JoystickController(params));
        // player.AddComponent(new player_input.BasicCharacterControllerInput(params));
        // player.AddComponent(new player_entity.BasicCharacterController(params));
    
        player.AddComponent(new health_component.HealthComponent({
          updateUI: true,
          health: 100,
          maxHealth: 100,
          strength: 50,
          camera: this._camera,
          scene: this._scene,
        }));
        player.AddComponent(new health_bar.HealthBar({
          parent: this._scene,
          camera: this._camera,
        }));
        player.AddComponent(
          new spatial_grid_controller.SpatialGridController({grid: this._grid}));
        this._entityManager.Add(player, 'player');
        const camera = new entity.Entity();
        camera.AddComponent(
            new third_person_camera.ThirdPersonCamera({
                camera: this._camera,
                target: this._entityManager.Get('player')}));
        this._entityManager.Add(camera, 'player-camera');
    }

    _LoadNPC_1() {
      for (let i = 0; i < 1; ++i) {
        const monsters = [
          {
            resourceName: 'trex.glb',
          },
        ];
        const m = monsters[math.rand_int(0, monsters.length - 1)];
  
        const npc = new entity.Entity();
        const startBtn = document.querySelector("#startBtn");
     
        npc.AddComponent(
            new spatial_grid_controller.SpatialGridController({grid: this._grid}));
     
        npc.AddComponent(new npc_entity.NPC_1_Controller({
            camera: this._camera,
            scene: this._scene,
            resourceName: m.resourceName,
          }));
        npc.AddComponent(new attack_controller.AttackController_T({timing: 0.01}));
        npc.SetPosition(new THREE.Vector3(
            (Math.random() * 2 - 1) * -250,
            0,
            (Math.random() * 2 - 1) * 250));
        npc.SetQuaternion(new THREE.Vector3(
          0, 180, 0
        ));
           startBtn.addEventListener("click", () => {
            this._entityManager.Add(npc);
              });
      }
    }

    _LoadNPC_2() {
      for (let i = 0; i < 1; ++i) {
        const monsters = [
          {
            resourceName: 'spinosaurus.glb',
            // resourceTexture: 'spinosaurus_low_DefaultMaterial_BaseColor.jpg',
          },
        ];
        const m = monsters[math.rand_int(0, monsters.length - 1)];
  
        const npc = new entity.Entity();
        const startBtn = document.querySelector("#startBtn");
        npc.AddComponent(
            new spatial_grid_controller.SpatialGridController({grid: this._grid}));
        npc.AddComponent(new npc_entity.NPC_2_Controller({
          camera: this._camera,
          scene: this._scene,
          resourceName: m.resourceName,
          resourceTexture: m.resourceTexture,
        }));
        npc.AddComponent(new attack_controller.AttackController({timing: 0.01}));
        npc.SetPosition(new THREE.Vector3(
            (Math.random() * 2 - 1) * -250,
            0,
            (Math.random() * 2 - 1) * 250));
         startBtn.addEventListener("click", () => {
          this._entityManager.Add(npc);
        });
        // this._entityManager.Add(npc);
      }
    }
  
    _LoadNPC_3() {
      for (let i = 0; i < 2; ++i) {
        const monsters = [
          {
            resourceName: 'dilophosaurus.glb',
            // resourceTexture: 'dilophosaurus_low2_defaultMat_BaseColor.png',
          },
        ];
        const m = monsters[math.rand_int(0, monsters.length - 1)];
  
        const npc = new entity.Entity();
        const startBtn = document.querySelector("#startBtn");
        npc.AddComponent(
            new spatial_grid_controller.SpatialGridController({grid: this._grid}));
        npc.AddComponent(new npc_entity.NPC_3_Controller({
          camera: this._camera,
          scene: this._scene,
          resourceName: m.resourceName,
          resourceTexture: m.resourceTexture,
        }));
        npc.AddComponent(new attack_controller.AttackController({timing: 0.01}));
        npc.SetPosition(new THREE.Vector3(
            (Math.random() * 2 - 1) * -200,
            0,
            (Math.random() * 2 - 1) * 200));
         startBtn.addEventListener("click", () => {
          this._entityManager.Add(npc);
        });
        // this._entityManager.Add(npc);
      }
    }

    _LoadNPC_4() {
      for (let i = 0; i < 2; ++i) {
        const monsters = [
          {
            resourceName: 'raptor.glb',
            // resourceTexture: 'Raptor_RaptorMat_BaseColor.png',
          },
        ];
        const m = monsters[math.rand_int(0, monsters.length - 1)];
  
        const npc = new entity.Entity();
        const startBtn = document.querySelector("#startBtn");
        npc.AddComponent(
            new spatial_grid_controller.SpatialGridController({grid: this._grid}));
        npc.AddComponent(new npc_entity.NPC_4_Controller({
          camera: this._camera,
          scene: this._scene,
          resourceName: m.resourceName,
          resourceTexture: m.resourceTexture,
        }));
        npc.AddComponent(new attack_controller.AttackController({timing: 0.01}));
        npc.SetPosition(new THREE.Vector3(
            (Math.random() * 2 - 1) * -200,
            0,
            (Math.random() * 2 - 1) * 200));
         startBtn.addEventListener("click", () => {
          this._entityManager.Add(npc);
        });
        // this._entityManager.Add(npc);
      }
    }

    _OnWindowResize() {
      this._camera.aspect = window.innerWidth / window.innerHeight;
      this._camera.updateProjectionMatrix();
      this._threejs.setSize(window.innerWidth, window.innerHeight);
    }
  
    _RAF() {
      requestAnimationFrame((t) => {
        // if (this._previousRAF === null) {
        //   this._previousRAF = t;
        // }
  
        this._RAF();
  
        this._threejs.render(this._scene, this._camera);
        this._Step(t - this._previousRAF);
        this._previousRAF = t;
      });
    }
  
    _Step(timeElapsed) {
      const timeElapsedS = Math.min(1.0 / 30.0, timeElapsed * 0.001);
  
    //   this._UpdateSun();
  
      this._entityManager.Update(timeElapsedS);
    }
  }

  let _APP = null;
  
  window.addEventListener('DOMContentLoaded', () => {
    _APP = new Mesozoic();
  });
  