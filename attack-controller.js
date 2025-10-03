// import * as THREE from 'https://londonpark.xyz/three.module-0.118.1.js';
import * as THREE from 'three';
import {entity} from './entity.js';
import {math} from './math.js';

export const attack_controller = (() => {

  class AttackController extends entity.Component {
    constructor(params) {
      super();
      this._params = params;
      this._timeElapsed = 0.0;
      this._action = null;
    }

    InitComponent() {
      this._RegisterHandler('player.action', (m) => { this._OnAnimAction(m); });
    }

    _OnAnimAction(m) {
      if (m.action !== this._action) {
        this._action = m.action;
        this._timeElapsed = 0.0;
      }

      const oldTiming = this._timeElapsed;
      this._timeElapsed = m.time;

      if (oldTiming < this._params.timing && this._timeElapsed >= this._params.timing) {
        const grid = this.GetComponent('SpatialGridController');
        const nearby = grid.FindNearbyEntities(25);

        const _Filter = (c) => {
          if (c.entity == this._parent) {
            return false;
          }
  
          const h = c.entity.GetComponent('HealthComponent');
          if (!h) {
            return false;
          }

          return h.IsAlive();
        };

        const attackable = nearby.filter(_Filter);
        for (let a of attackable) {
          const target = a.entity;

          const dirToTarget = target._position.clone().sub(this._parent._position);
          dirToTarget.normalize();

          const forward = new THREE.Vector3(0, 0, 1);
          forward.applyQuaternion(this._parent._rotation);
          forward.normalize();
    
          let damage = 10;

          const dot = forward.dot(dirToTarget);
          if (math.in_range(dot, 0.9, 1.1)) {
            target.Broadcast({
              topic: 'health.damage',
              value: damage,
              attacker: this._parent,
            });
          }
        }
      }
    }
  };

  class AttackController_T extends entity.Component {
    constructor(params) {
      super();
      this._params = params;
      this._timeElapsed = 0.0;
      this._action = null;
    }

    InitComponent() {
      this._RegisterHandler('player.action', (m) => { this._OnAnimAction(m); });
    }

    _OnAnimAction(m) {
      if (m.action !== this._action) {
        this._action = m.action;
        this._timeElapsed = 0.0;
      }

      const oldTiming = this._timeElapsed;
      this._timeElapsed = m.time;

      if (oldTiming < this._params.timing && this._timeElapsed >= this._params.timing) {

        const grid = this.GetComponent('SpatialGridController');
        const nearby = grid.FindNearbyEntities(35);

        const _Filter = (c) => {
          if (c.entity == this._parent) {
            return false;
          }
  
          const h = c.entity.GetComponent('HealthComponent');
          if (!h) {
            return false;
          }

          return h.IsAlive();
        };

        const attackable = nearby.filter(_Filter);
        for (let a of attackable) {
          const target = a.entity;

          const dirToTarget = target._position.clone().sub(this._parent._position);
          dirToTarget.normalize();

          const forward = new THREE.Vector3(0, 0, 1);
          forward.applyQuaternion(this._parent._rotation);
          forward.normalize();
    
          let damage = 20;

          const dot = forward.dot(dirToTarget);
          if (math.in_range(dot, 0.9, 5)) {
            target.Broadcast({
              topic: 'health.damage',
              value: damage,
              attacker: this._parent,
            });
          }
        }
      }
    }
  };


  return {
      AttackController: AttackController,
      AttackController_T: AttackController_T,
  };
})();