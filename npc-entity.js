// import * as THREE from 'https://londonpark.xyz/three.module-0.118.1.js';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118.1/build/three.module.js';
import {FBXLoader} from 'https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/loaders/FBXLoader.js';
import {GLTFLoader} from 'https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/loaders/GLTFLoader.js';
import {DRACOLoader} from 'https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/loaders/DRACOLoader.js';

import {finite_state_machine} from './finite-state-machine.js';
import {entity} from './entity.js';
import {player_entity} from './player-entity.js'
import {player_state} from './player-state.js';

export const npc_entity = (() => {
  
  class AIInput {
    constructor() {
      this._Init();    
    }

    _Init() {
      this._keys = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        space: false,
        shift: false,
      };
    }
  };

  class NPCFSM extends finite_state_machine.FiniteStateMachine {
    constructor(proxy) {
      super();
      this._proxy = proxy;
      this._Init();
    }

    _Init() {
      this._AddState('idle', player_state.IdleState);
      this._AddState('walk', player_state.WalkState);
      this._AddState('death', player_state.DeathState);
      this._AddState('attack', player_state.AttackState);
    }
  };

  class NPC_1_Controller extends entity.Component {
    constructor(params) {
      super();
      this._Init(params);
    }

    _Init(params) {
      this._params = params;
      this._decceleration = new THREE.Vector3(-0.0005, -0.0001, -5.0);
      this._acceleration = new THREE.Vector3(1, 0.25, 40.0);
      this._velocity = new THREE.Vector3(0, 0, 0);
      this._position = new THREE.Vector3();

      this._animations = {};
      this._input = new AIInput();
      // FIXME
      this._stateMachine = new NPCFSM(
          new player_entity.BasicCharacterControllerProxy(this._animations));

      this._LoadModels();
    }

    InitComponent() {
      this._RegisterHandler('health.death', (m) => { this._OnDeath(m); });
      this._RegisterHandler('update.position', (m) => { this._OnPosition(m); });
    }

    _OnDeath(msg) {
      this._stateMachine.SetState('death');
    }

    _OnPosition(m) {
      if (this._target) {
        this._target.position.copy(m.value);
        this._target.position.y = 0.35;
      }
    }

    _LoadModels() {
      const loader = new GLTFLoader();
      const draco = new DRACOLoader();
      draco.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.118.1/examples/js/libs/draco/');
      loader.setDRACOLoader(draco);
      loader.setPath('../mesozoic-resources/glb/npc/');
      loader.load(this._params.resourceName, (glb) => {
        this._target = glb.scene;
        this._target.scale.set(23, 11.5, 11.5);
        // this._target.scale.set(18, 18, 18);
        this._params.scene.add(this._target);
        this._target.position.copy(this._parent._position);

        this._target.traverse(c => {
          c.castShadow = true;
          c.receiveShadow = true;
        });

        this._mixer = new THREE.AnimationMixer(this._target);

        const fbx = glb;

        const _FindAnim = (animName) => {
          for (let i = 0; i < fbx.animations.length; i++) {
            if (fbx.animations[i].name.includes(animName)) {
              const clip = fbx.animations[i];
              const action = this._mixer.clipAction(clip);
              return {
                clip: clip,
                action: action
              }
            }
          }
          return null;
        
        };

        this._animations['idle'] = _FindAnim('idle investigate loop');
        this._animations['walk'] = _FindAnim('walk head low');
        this._animations['run'] = _FindAnim('run head loop');
        this._animations['attack'] = _FindAnim('human bite');

        this._stateMachine.SetState('idle');

        const startBtn = document.querySelector('#startBtn');
        startBtn.addEventListener('click', () => {
          const listener = new THREE.AudioListener();
          this.sound = new THREE.PositionalAudio(listener);
  
          const sLoader = new THREE.AudioLoader();
          sLoader.load('../mesozoic-resources/sound/mtrex.wav', (buffer) => {
            // setTimeout(()=> {
              this.sound.setBuffer(buffer);
              this.sound.setLoop(true);
              this.sound.setVolume(0.6);
              this.sound.setRefDistance(3);
              // sound3.setMaxDistance(20);
              this.sound.setRolloffFactor(0.5);
              this.sound.setDirectionalCone( 180, 230, 0.1 );
              // setInterval(() => {
                this.sound.play()
              // },
              // 3000)
              this.analyzer1 = new THREE.AudioAnalyser(this.sound, 32);
              this.analyzer1Data = [];
            // }, 5000);
          })
          this._target.add(this.sound);
        })
      });
    }

    get Position() {
      return this._position;
    }

    get Rotation() {
      if (!this._target) {
        return new THREE.Quaternion();
      }
      return this._target.quaternion;
    }

    _FindIntersections(pos) {
      const _IsAlive = (c) => {
        const h = c.entity.GetComponent('HealthComponent');
        if (!h) {
          return true;
        }
        return h._health > 0;
      };

      const grid = this.GetComponent('SpatialGridController');
      // const grid = entity.Entity.GetComponent('SpatialGridController');
      const nearby = grid.FindNearbyEntities(35).filter(e => _IsAlive(e));
      const collisions = [];

      for (let i = 0; i < nearby.length; ++i) {
        const e = nearby[i].entity;
        const d = ((pos.x - e._position.x) ** 2 + (pos.z - e._position.z) ** 2) ** 0.5;

        // HARDCODED
        if (d <= 35) {
          collisions.push(nearby[i].entity);
        }
      }
      return collisions;
    }

    _FindPlayer(pos) {
      const _IsAlivePlayer = (c) => {
        const h = c.entity.GetComponent('HealthComponent');
        if (!h) {
          return false;
        }
        if (c.entity.Name !== 'player') {
          return false;
        }
        return h._health > 0;
      };
      const grid = this.GetComponent('SpatialGridController');
      const nearby = grid.FindNearbyEntities(150).filter(c => _IsAlivePlayer(c));

      if (nearby.length === 0) {
        return new THREE.Vector3(0, 0, 0);
      }

      const dir = this._parent._position.clone();
      dir.sub(nearby[0].entity._position);
      dir.y = 0.0;
      dir.normalize();
  
      return dir;
    }

    _UpdateAI(timeInSeconds) {
      const currentState = this._stateMachine._currentState;
      if (currentState.Name !== 'walk' &&
          currentState.Name !== 'run' &&
          currentState.Name !== 'idle') {
        return;
      }

      if (currentState.Name === 'death') {
        return;
      }

      if (currentState.Name === 'idle' ||
          currentState.Name === 'walk') {
        this._OnAIWalk(timeInSeconds);
      }
    }

    _OnAIWalk(timeInSeconds) {
      const dirToPlayer = this._FindPlayer();

      const velocity = this._velocity;
      const frameDecceleration = new THREE.Vector3(
          velocity.x * this._decceleration.x,
          velocity.y * this._decceleration.y,
          velocity.z * this._decceleration.z
      );
      frameDecceleration.multiplyScalar(timeInSeconds);
      frameDecceleration.z = Math.sign(frameDecceleration.z) * Math.min(
          Math.abs(frameDecceleration.z), Math.abs(velocity.z));
  
      velocity.add(frameDecceleration);

      const controlObject = this._target;
      const _Q = new THREE.Quaternion();
      const _A = new THREE.Vector3();
      const _R = controlObject.quaternion.clone();
  
      this._input._keys.forward = false;

      const acc = this._acceleration;
      if (dirToPlayer.length() === 0) {
        return;
      }

      this._input._keys.forward = true;
      velocity.z += acc.z * timeInSeconds;

      const m = new THREE.Matrix4();
      m.lookAt(
          new THREE.Vector3(0, 0, 0),
          dirToPlayer,
          new THREE.Vector3(0, 1, 0));
      _R.setFromRotationMatrix(m);
  
      controlObject.quaternion.copy(_R);
  
      const oldPosition = new THREE.Vector3();
      oldPosition.copy(controlObject.position);
  
      const forward = new THREE.Vector3(0, 0, 1);
      forward.applyQuaternion(controlObject.quaternion);
      forward.normalize();
  
      const sideways = new THREE.Vector3(1, 0, 0);
      sideways.applyQuaternion(controlObject.quaternion);
      sideways.normalize();
  
      sideways.multiplyScalar(2*velocity.x * timeInSeconds);
      forward.multiplyScalar(2*velocity.z * timeInSeconds);
  
      const pos = controlObject.position.clone();
      pos.add(forward);
      pos.add(sideways);

      const collisions = this._FindIntersections(pos);
      if (collisions.length > 0) {
        this._input._keys.space = true;
        this._input._keys.forward = false;
        return;
      }

      controlObject.position.copy(pos);
      this._position.copy(pos);
      this._parent.SetPosition(this._position);
      this._parent.SetQuaternion(this._target.quaternion);
    }

    Update(timeInSeconds) {
      if (!this._stateMachine._currentState) {
        return;
      }

      this._input._keys.space = false;
      this._input._keys.forward = false;

      this._UpdateAI(timeInSeconds);

      this._stateMachine.Update(timeInSeconds, this._input);

      // HARDCODED
      if (this._stateMachine._currentState._action) {
        this.Broadcast({
          topic: 'player.action',
          action: this._stateMachine._currentState.Name,
          time: this._stateMachine._currentState._action.time,
        });
      }
      
      if (this._mixer) {
        this._mixer.update(timeInSeconds);
      }
    }
  };

  class NPC_2_Controller extends entity.Component {
    constructor(params) {
      super();
      this._Init(params);
    }

    _Init(params) {
      this._params = params;
      this._decceleration = new THREE.Vector3(-0.0005, -0.0001, -5.0);
      this._acceleration = new THREE.Vector3(1, 0.25, 40.0);
      this._velocity = new THREE.Vector3(0, 0, 0);
      this._position = new THREE.Vector3();

      this._animations = {};
      this._input = new AIInput();
      // FIXME
      this._stateMachine = new NPCFSM(
          new player_entity.BasicCharacterControllerProxy(this._animations));

      this._LoadModels();
    }

    InitComponent() {
      this._RegisterHandler('health.death', (m) => { this._OnDeath(m); });
      this._RegisterHandler('update.position', (m) => { this._OnPosition(m); });
    }

    _OnDeath(msg) {
      this._stateMachine.SetState('death');
    }

    _OnPosition(m) {
      if (this._target) {
        this._target.position.copy(m.value);
        this._target.position.y = 0.35;
      }
    }

    _LoadModels() {
      const loader = new GLTFLoader();
      const draco = new DRACOLoader();
      draco.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.118.1/examples/js/libs/draco/');
      loader.setDRACOLoader(draco);
      loader.setPath('../mesozoic-resources/glb/npc/');
      loader.load(this._params.resourceName, (glb) => {
        this._target = glb.scene;
        this._target.scale.set(14, 7, 7);
        // this._target.scale.set(10, 10, 10);
        this._params.scene.add(this._target);
        this._target.position.copy(this._parent._position);

        this._target.traverse(c => {
          c.castShadow = true;
          c.receiveShadow = true;
        });

        this._mixer = new THREE.AnimationMixer(this._target);

        const fbx = glb;

        const _FindAnim = (animName) => {
          for (let i = 0; i < fbx.animations.length; i++) {
            if (fbx.animations[i].name.includes(animName)) {
              const clip = fbx.animations[i];
              const action = this._mixer.clipAction(clip);
              return {
                clip: clip,
                action: action
              }
            }
          }
          return null;
        
        };

        this._animations['idle'] = _FindAnim('spinosaurus-idle');
        this._animations['walk'] = _FindAnim('spinosaurus-run');
        this._animations['run'] = _FindAnim('spinosaurus-run');
        this._animations['attack'] = _FindAnim('spinosaurus-attack');

        this._stateMachine.SetState('idle');
      });
      // const loader = new FBXLoader();
      // loader.setPath('../resources/fbx/npc/');
      // loader.load(this._params.resourceName, (fbx) => {
      //   this._target = fbx;
      //   this._target.scale.setScalar(0.06);
      //   this._params.scene.add(this._target);
      //   this._target.position.copy(this._parent._position);

      //   const texLoader = new THREE.TextureLoader();
      //   const texture = texLoader.load(
      //       '../mesozoic-resources/fbx/npc/' + this._params.resourceTexture);
      //   texture.encoding = THREE.sRGBEncoding;
      //   texture.flipY = true;

      //   this._target.traverse(c => {
      //     if (c.isMesh) {
      //       c.castShadow = true;
      //       c.receiveShadow = true;
      //       if (c.material) {
      //         c.material.map = texture;
      //         c.material.needsUpdate=true;
      //         c.material.side = THREE.DoubleSide;
      //       }
      //     }
      //   });

      //   this._mixer = new THREE.AnimationMixer(this._target);

      //   const _OnLoad = (animName, anim) => {
      //     const clip = anim.animations[0];
      //     const action = this._mixer.clipAction(clip);
    
      //     this._animations[animName] = {
      //       clip: clip,
      //       action: action,
      //     };
      //   };

      //   this._manager = new THREE.LoadingManager();
      //   this._manager.onLoad = () => {
      //     this._stateMachine.SetState('idle');
      //   };
  
      //   const loader = new FBXLoader(this._manager);
      //   loader.setPath('../mesozoic-resources/fbx/npc/');
      //   const spinI = loader.load('spinosaurus-idle.fbx', (a) => { _OnLoad('idle', a); });
      //   const spinW = loader.load('spinosaurus-run.fbx', (a) => { _OnLoad('run', a); });
      //   const spinR = loader.load('spinosaurus-run.fbx', (a) => { _OnLoad('walk', a); });
      //   const spinA = loader.load('spinosaurus-attack.fbx', (a) => { _OnLoad('attack', a); });

      //   this._animations['idle'] = spinI
      //   this._animations['walk'] = spinW
      //   this._animations['run'] = spinR
      //   this._animations['attack'] = spinA
      // });
      };

    get Position() {
      return this._position;
    }

    get Rotation() {
      if (!this._target) {
        return new THREE.Quaternion();
      }
      return this._target.quaternion;
    }

    _FindIntersections(pos) {
      const _IsAlive = (c) => {
        const h = c.entity.GetComponent('HealthComponent');
        if (!h) {
          return true;
        }
        return h._health > 0;
      };

      const grid = this.GetComponent('SpatialGridController');
      const nearby = grid.FindNearbyEntities(35).filter(e => _IsAlive(e));
      const collisions = [];

      for (let i = 0; i < nearby.length; ++i) {
        const e = nearby[i].entity;
        const d = ((pos.x - e._position.x) ** 2 + (pos.z - e._position.z) ** 2) ** 0.5;

        // HARDCODED
        if (d <= 35) {
          collisions.push(nearby[i].entity);
        }
      }
      return collisions;
    }

    _FindPlayer(pos) {
      const _IsAlivePlayer = (c) => {
        const h = c.entity.GetComponent('HealthComponent');
        if (!h) {
          return false;
        }
        if (c.entity.Name !== 'player') {
          return false;
        }
        return h._health > 0;
      };

      const grid = this.GetComponent('SpatialGridController');
      const nearby = grid.FindNearbyEntities(150).filter(c => _IsAlivePlayer(c));

      if (nearby.length === 0) {
        return new THREE.Vector3(0, 0, 0);
      }

      const dir = this._parent._position.clone();
      dir.sub(nearby[0].entity._position);
      dir.y = 0.0;
      dir.normalize();

      return dir;
    }

    _UpdateAI(timeInSeconds) {
      const currentState = this._stateMachine._currentState;
      if (currentState.Name !== 'walk' &&
          currentState.Name !== 'run' &&
          currentState.Name !== 'idle') {
        return;
      }

      if (currentState.Name === 'death') {
        return;
      }

      if (currentState.Name === 'idle' ||
          currentState.Name === 'walk') {
        this._OnAIWalk(timeInSeconds);
      }
    }

    _OnAIWalk(timeInSeconds) {
      const dirToPlayer = this._FindPlayer();

      const velocity = this._velocity;
      const frameDecceleration = new THREE.Vector3(
          velocity.x * this._decceleration.x,
          velocity.y * this._decceleration.y,
          velocity.z * this._decceleration.z
      );
      frameDecceleration.multiplyScalar(timeInSeconds);
      frameDecceleration.z = Math.sign(frameDecceleration.z) * Math.min(
          Math.abs(frameDecceleration.z), Math.abs(velocity.z));
  
      velocity.add(frameDecceleration);

      const controlObject = this._target;
      const _Q = new THREE.Quaternion();
      const _A = new THREE.Vector3();
      const _R = controlObject.quaternion.clone();
  
      this._input._keys.forward = false;

      const acc = this._acceleration;
      if (dirToPlayer.length() === 0) {
        return;
      }

      this._input._keys.forward = true;
      velocity.z += acc.z * timeInSeconds;

      const m = new THREE.Matrix4();
      m.lookAt(
          new THREE.Vector3(0, 0, 0),
          dirToPlayer,
          new THREE.Vector3(0, 1, 0));
      _R.setFromRotationMatrix(m);
  
      controlObject.quaternion.copy(_R);
  
      const oldPosition = new THREE.Vector3();
      oldPosition.copy(controlObject.position);
  
      const forward = new THREE.Vector3(0, 0, 1);
      forward.applyQuaternion(controlObject.quaternion);
      forward.normalize();
  
      const sideways = new THREE.Vector3(1, 0, 0);
      sideways.applyQuaternion(controlObject.quaternion);
      sideways.normalize();
  
      sideways.multiplyScalar(2*velocity.x * timeInSeconds);
      forward.multiplyScalar(2*velocity.z * timeInSeconds);
  
      const pos = controlObject.position.clone();
      pos.add(forward);
      pos.add(sideways);

      const collisions = this._FindIntersections(pos);
      if (collisions.length > 0) {
        this._input._keys.space = true;
        this._input._keys.forward = false;
        return;
      }

      controlObject.position.copy(pos);
      this._position.copy(pos);
  
      this._parent.SetPosition(this._position);
      this._parent.SetQuaternion(this._target.quaternion);
    }

    Update(timeInSeconds) {
      if (!this._stateMachine._currentState) {
        return;
      }

      this._input._keys.space = false;
      this._input._keys.forward = false;

      this._UpdateAI(timeInSeconds);

      this._stateMachine.Update(timeInSeconds, this._input);

      // HARDCODED
      if (this._stateMachine._currentState._action) {
        this.Broadcast({
          topic: 'player.action',
          action: this._stateMachine._currentState.Name,
          time: this._stateMachine._currentState._action.time,
        });
      }
      
      if (this._mixer) {
        this._mixer.update(timeInSeconds);
      }
    }
  };

  class NPC_3_Controller extends entity.Component {
    constructor(params) {
      super();
      this._Init(params);
    }

    _Init(params) {
      this._params = params;
      this._decceleration = new THREE.Vector3(-0.0005, -0.0001, -5.0);
      this._acceleration = new THREE.Vector3(1, 0.25, 40.0);
      this._velocity = new THREE.Vector3(0, 0, 0);
      this._position = new THREE.Vector3();

      this._animations = {};
      this._input = new AIInput();
      // FIXME
      this._stateMachine = new NPCFSM(
          new player_entity.BasicCharacterControllerProxy(this._animations));

      this._LoadModels();
    }

    InitComponent() {
      this._RegisterHandler('health.death', (m) => { this._OnDeath(m); });
      this._RegisterHandler('update.position', (m) => { this._OnPosition(m); });
    }

    _OnDeath(msg) {
      this._stateMachine.SetState('death');
    }

    _OnPosition(m) {
      if (this._target) {
        this._target.position.copy(m.value);
        this._target.position.y = 0.35;
      }
    }

    _LoadModels() {
      const loader = new GLTFLoader();
      const draco = new DRACOLoader();
      draco.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.118.1/examples/js/libs/draco/');
      loader.setDRACOLoader(draco);
      loader.setPath('../mesozoic-resources/glb/npc/');
      loader.load(this._params.resourceName, (glb) => {
        this._target = glb.scene;
        this._target.scale.set(12, 6, 6);
        // this._target.scale.set(8, 8, 8);
        this._params.scene.add(this._target);
        this._target.position.copy(this._parent._position);

        this._target.traverse(c => {
          c.castShadow = true;
          c.receiveShadow = true;
        });

        this._mixer = new THREE.AnimationMixer(this._target);

        const fbx = glb;

        const _FindAnim = (animName) => {
          for (let i = 0; i < fbx.animations.length; i++) {
            if (fbx.animations[i].name.includes(animName)) {
              const clip = fbx.animations[i];
              const action = this._mixer.clipAction(clip);
              return {
                clip: clip,
                action: action
              }
            }
          }
          return null;
        
        };

        this._animations['idle'] = _FindAnim('dilophosaurus-idle');
        this._animations['walk'] = _FindAnim('dilophosaurus-run');
        this._animations['run'] = _FindAnim('dilophosaurus-run');
        this._animations['attack'] = _FindAnim('dilophosaurus-attack');

        this._stateMachine.SetState('idle');
      });
      };

    get Position() {
      return this._position;
    }

    get Rotation() {
      if (!this._target) {
        return new THREE.Quaternion();
      }
      return this._target.quaternion;
    }

    _FindIntersections(pos) {
      const _IsAlive = (c) => {
        const h = c.entity.GetComponent('HealthComponent');
        if (!h) {
          return true;
        }
        return h._health > 0;
      };

      const grid = this.GetComponent('SpatialGridController');
      const nearby = grid.FindNearbyEntities(12).filter(e => _IsAlive(e));
      const collisions = [];

      for (let i = 0; i < nearby.length; ++i) {
        const e = nearby[i].entity;
        const d = ((pos.x - e._position.x) ** 2 + (pos.z - e._position.z) ** 2) ** 0.5;

        // HARDCODED
        if (d <= 12) {
          collisions.push(nearby[i].entity);
        }
      }
      return collisions;
    }

    _FindPlayer(pos) {
      const _IsAlivePlayer = (c) => {
        const h = c.entity.GetComponent('HealthComponent');
        if (!h) {
          return false;
        }
        if (c.entity.Name !== 'player') {
          return false;
        }
        return h._health > 0;
      };

      const grid = this.GetComponent('SpatialGridController');
      const nearby = grid.FindNearbyEntities(150).filter(c => _IsAlivePlayer(c));

      if (nearby.length === 0) {
        return new THREE.Vector3(0, 0, 0);
      }

      const dir = this._parent._position.clone();
      dir.sub(nearby[0].entity._position);
      dir.y = 0.0;
      dir.normalize();

      return dir;
    }

    _UpdateAI(timeInSeconds) {
      const currentState = this._stateMachine._currentState;
      if (currentState.Name !== 'walk' &&
          currentState.Name !== 'run' &&
          currentState.Name !== 'idle') {
        return;
      }

      if (currentState.Name === 'death') {
        return;
      }

      if (currentState.Name === 'idle' ||
          currentState.Name === 'walk') {
        this._OnAIWalk(timeInSeconds);
      }
    }

    _OnAIWalk(timeInSeconds) {
      const dirToPlayer = this._FindPlayer();

      const velocity = this._velocity;
      const frameDecceleration = new THREE.Vector3(
          velocity.x * this._decceleration.x,
          velocity.y * this._decceleration.y,
          velocity.z * this._decceleration.z
      );
      frameDecceleration.multiplyScalar(timeInSeconds);
      frameDecceleration.z = Math.sign(frameDecceleration.z) * Math.min(
          Math.abs(frameDecceleration.z), Math.abs(velocity.z));
  
      velocity.add(frameDecceleration);

      const controlObject = this._target;
      const _Q = new THREE.Quaternion();
      const _A = new THREE.Vector3();
      const _R = controlObject.quaternion.clone();
  
      this._input._keys.forward = false;

      const acc = this._acceleration;
      if (dirToPlayer.length() === 0) {
        return;
      }

      this._input._keys.forward = true;
      velocity.z += 1.1 * acc.z * timeInSeconds;

      const m = new THREE.Matrix4();
      m.lookAt(
          new THREE.Vector3(0, 0, 0),
          dirToPlayer,
          new THREE.Vector3(0, 1, 0));
      _R.setFromRotationMatrix(m);
  
      controlObject.quaternion.copy(_R);
  
      const oldPosition = new THREE.Vector3();
      oldPosition.copy(controlObject.position);
  
      const forward = new THREE.Vector3(0, 0, 1);
      forward.applyQuaternion(controlObject.quaternion);
      forward.normalize();
  
      const sideways = new THREE.Vector3(1, 0, 0);
      sideways.applyQuaternion(controlObject.quaternion);
      sideways.normalize();
  
      sideways.multiplyScalar(2.3*velocity.x * timeInSeconds);
      forward.multiplyScalar(2.3*velocity.z * timeInSeconds);
  
      const pos = controlObject.position.clone();
      pos.add(forward);
      pos.add(sideways);

      const collisions = this._FindIntersections(pos);
      if (collisions.length > 0) {
        this._input._keys.space = true;
        this._input._keys.forward = false;
        return;
      }

      controlObject.position.copy(pos);
      this._position.copy(pos);
  
      this._parent.SetPosition(this._position);
      this._parent.SetQuaternion(this._target.quaternion);
    }

    Update(timeInSeconds) {
      if (!this._stateMachine._currentState) {
        return;
      }

      this._input._keys.space = false;
      this._input._keys.forward = false;

      this._UpdateAI(timeInSeconds);

      this._stateMachine.Update(timeInSeconds, this._input);

      // HARDCODED
      if (this._stateMachine._currentState._action) {
        this.Broadcast({
          topic: 'player.action',
          action: this._stateMachine._currentState.Name,
          time: this._stateMachine._currentState._action.time,
        });
      }
      
      if (this._mixer) {
        this._mixer.update(timeInSeconds);
      }
    }
  };

  class NPC_4_Controller extends entity.Component {
    constructor(params) {
      super();
      this._Init(params);
    }

    _Init(params) {
      this._params = params;
      this._decceleration = new THREE.Vector3(-0.0005, -0.0001, -5.0);
      this._acceleration = new THREE.Vector3(1, 0.25, 40.0);
      this._velocity = new THREE.Vector3(0, 0, 0);
      this._position = new THREE.Vector3();

      this._animations = {};
      this._input = new AIInput();
      // FIXME
      this._stateMachine = new NPCFSM(
          new player_entity.BasicCharacterControllerProxy(this._animations));

      this._LoadModels();
    }

    InitComponent() {
      this._RegisterHandler('health.death', (m) => { this._OnDeath(m); });
      this._RegisterHandler('update.position', (m) => { this._OnPosition(m); });
    }

    _OnDeath(msg) {
      this._stateMachine.SetState('death');
    }

    _OnPosition(m) {
      if (this._target) {
        this._target.position.copy(m.value);
        this._target.position.y = 0.35;
      }
    }

    _LoadModels() {
      const loader = new GLTFLoader();
      const draco = new DRACOLoader();
      draco.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.118.1/examples/js/libs/draco/');
      loader.setDRACOLoader(draco);
      loader.setPath('../mesozoic-resources/glb/npc/');
      loader.load(this._params.resourceName, (glb) => {
        this._target = glb.scene;
        this._target.scale.set(22, 11, 11);
        // this._target.scale.set(13, 13, 13)
        this._params.scene.add(this._target);
        this._target.position.copy(this._parent._position);

        this._target.traverse(c => {
          c.castShadow = true;
          c.receiveShadow = true;
        });

        this._mixer = new THREE.AnimationMixer(this._target);

        const fbx = glb;

        const _FindAnim = (animName) => {
          for (let i = 0; i < fbx.animations.length; i++) {
            if (fbx.animations[i].name.includes(animName)) {
              const clip = fbx.animations[i];
              const action = this._mixer.clipAction(clip);
              return {
                clip: clip,
                action: action
              }
            }
          }
          return null;
        
        };

        this._animations['idle'] = _FindAnim('raptor-idle');
        this._animations['walk'] = _FindAnim('raptor-run');
        this._animations['run'] = _FindAnim('raptor-run');
        this._animations['attack'] = _FindAnim('raptor-attack');

        this._stateMachine.SetState('idle');
      });
        const startBtn = document.querySelector('#startBtn');
        startBtn.addEventListener("click", ()=> {
          const listener = new THREE.AudioListener();
          this.sound = new THREE.PositionalAudio(listener);
  
          const sLoader = new THREE.AudioLoader();
          sLoader.load('../mesozoic-resources/sound/raptor-sound.mp3', (buffer) => {
              this.sound.setBuffer(buffer);
              this.sound.setLoop(true);
              this.sound.setVolume(0.3);
              this.sound.setRefDistance(3);
              this.sound.setRolloffFactor(0.5);
              this.sound.setDirectionalCone( 180, 230, 0.1 );
              this.sound.play()
              this.analyzer1 = new THREE.AudioAnalyser(this.sound, 32);
              this.analyzer1Data = [];
          })
          this._target.add(this.sound);
        })

      // });
      };

    get Position() {
      return this._position;
    }

    get Rotation() {
      if (!this._target) {
        return new THREE.Quaternion();
      }
      return this._target.quaternion;
    }

    _FindIntersections(pos) {
      const _IsAlive = (c) => {
        const h = c.entity.GetComponent('HealthComponent');
        if (!h) {
          return true;
        }
        return h._health > 0;
      };

      const grid = this.GetComponent('SpatialGridController');
      const nearby = grid.FindNearbyEntities(8).filter(e => _IsAlive(e));
      const collisions = [];

      for (let i = 0; i < nearby.length; ++i) {
        const e = nearby[i].entity;
        const d = ((pos.x - e._position.x) ** 2 + (pos.z - e._position.z) ** 2) ** 0.5;

        // HARDCODED
        if (d <= 8) {
          collisions.push(nearby[i].entity);
        }
      }
      return collisions;
    }

    _FindPlayer(pos) {
      const _IsAlivePlayer = (c) => {
        const h = c.entity.GetComponent('HealthComponent');
        if (!h) {
          return false;
        }
        if (c.entity.Name !== 'player') {
          return false;
        }
        return h._health > 0;
      };

      const grid = this.GetComponent('SpatialGridController');
      const nearby = grid.FindNearbyEntities(150).filter(c => _IsAlivePlayer(c));

      if (nearby.length === 0) {
        return new THREE.Vector3(0, 0, 0);
      }

      const dir = this._parent._position.clone();
      dir.sub(nearby[0].entity._position);
      dir.y = 0.0;
      dir.normalize();

      return dir;
    }

    _UpdateAI(timeInSeconds) {
      const currentState = this._stateMachine._currentState;
      if (currentState.Name !== 'walk' &&
          currentState.Name !== 'run' &&
          currentState.Name !== 'idle') {
        return;
      }

      if (currentState.Name === 'death') {
        return;
      }

      if (currentState.Name === 'idle' ||
          currentState.Name === 'walk') {
        this._OnAIWalk(timeInSeconds);
      }
    }

    _OnAIWalk(timeInSeconds) {
      const dirToPlayer = this._FindPlayer();

      const velocity = this._velocity;
      const frameDecceleration = new THREE.Vector3(
          velocity.x * this._decceleration.x,
          velocity.y * this._decceleration.y,
          velocity.z * this._decceleration.z
      );
      frameDecceleration.multiplyScalar(timeInSeconds);
      frameDecceleration.z = Math.sign(frameDecceleration.z) * Math.min(
          Math.abs(frameDecceleration.z), Math.abs(velocity.z));
  
      velocity.add(frameDecceleration);

      const controlObject = this._target;
      const _Q = new THREE.Quaternion();
      const _A = new THREE.Vector3();
      const _R = controlObject.quaternion.clone();
  
      this._input._keys.forward = false;

      const acc = this._acceleration;
      if (dirToPlayer.length() === 0) {
        return;
      }

      this._input._keys.forward = true;
      velocity.z += 1.1 * acc.z * timeInSeconds;

      const m = new THREE.Matrix4();
      m.lookAt(
          new THREE.Vector3(0, 0, 0),
          dirToPlayer,
          new THREE.Vector3(0, 1, 0));
      _R.setFromRotationMatrix(m);
  
      controlObject.quaternion.copy(_R);
  
      const oldPosition = new THREE.Vector3();
      oldPosition.copy(controlObject.position);
  
      const forward = new THREE.Vector3(0, 0, 1);
      forward.applyQuaternion(controlObject.quaternion);
      forward.normalize();
  
      const sideways = new THREE.Vector3(1, 0, 0);
      sideways.applyQuaternion(controlObject.quaternion);
      sideways.normalize();
  
      sideways.multiplyScalar(2.3*velocity.x * timeInSeconds);
      forward.multiplyScalar(2.3*velocity.z * timeInSeconds);
  
      const pos = controlObject.position.clone();
      pos.add(forward);
      pos.add(sideways);

      const collisions = this._FindIntersections(pos);
      if (collisions.length > 0) {
        this._input._keys.space = true;
        this._input._keys.forward = false;
        return;
      }

      controlObject.position.copy(pos);
      this._position.copy(pos);
  
      this._parent.SetPosition(this._position);
      this._parent.SetQuaternion(this._target.quaternion);
    }

    Update(timeInSeconds) {
      if (!this._stateMachine._currentState) {
        return;
      }

      this._input._keys.space = false;
      this._input._keys.forward = false;

      this._UpdateAI(timeInSeconds);

      this._stateMachine.Update(timeInSeconds, this._input);

      // HARDCODED
      if (this._stateMachine._currentState._action) {
        this.Broadcast({
          topic: 'player.action',
          action: this._stateMachine._currentState.Name,
          time: this._stateMachine._currentState._action.time,
        });
      }
      
      if (this._mixer) {
        this._mixer.update(timeInSeconds);
      }
    }
  };


  return {
    NPC_1_Controller: NPC_1_Controller,
    NPC_2_Controller: NPC_2_Controller,
    NPC_3_Controller: NPC_3_Controller,
    NPC_4_Controller: NPC_4_Controller,
  };

})();