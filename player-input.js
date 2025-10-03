import {entity} from "./entity.js";

export const player_input = (() => {

  class PickableComponent extends entity.Component {
    constructor() {
      super();
    }

    InitComponent() {
    }
  };

  class BasicCharacterControllerInput extends entity.Component {
    constructor(params) {
      super();
      this._params = params;
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
      document.addEventListener('keydown', (e) => this._onKeyDown(e), false);
      document.addEventListener('keyup', (e) => this._onKeyUp(e), false);
    }
  
    _onKeyDown(event) {
      switch (event.keyCode) {
        case 87: // w or arrow up
          this._keys.forward = true;
          break;
        case 38: // w or arrow up
          this._keys.forward = true;
          break;
        case 65: // a or arrow left
          this._keys.left = true;
          break;
        case 37:
          this._keys.left = true;
          break;
        case 83: // s or arrow down
          this._keys.backward = true;
          break;
        case 40: // s or arrow down
          this._keys.backward = true;
          break;
        case 68: // d or arrow right
          this._keys.right = true;
          break;
        case 39: // d or arrow right
          this._keys.right = true;
          break;
        case 32: // SPACE
          this._keys.space = true;
          break;
        case 16: // SHIFT
          this._keys.shift = true;
          break;
      }
    }
  
    _onKeyUp(event) {
      switch(event.keyCode) {
        case 87: // w or arrow up
          this._keys.forward = false;
          break;
        case 38:
          this._keys.forward = false;
        case 65: // a or arrow left
          this._keys.left = false;
          break;
        case 37: // a or arrow left
          this._keys.left = false;
        break;
        case 83: // s or arrow down
          this._keys.backward = false;
          break;
        case 40: // s or arrow down
          this._keys.backward = false;
        break;
        case 68: // d or arrow right
          this._keys.right = false;
          break;
        case 39: // d or arrow right
          this._keys.right = false;
          break;
        case 32: // SPACE
          this._keys.space = false;
          break;
        case 16: // SHIFT
          this._keys.shift = false;
          break;
      }
    }
  };

  class Joystick extends entity.Component {
    constructor(options) {
      super();
      this._init();
      const circle = document.createElement("div");
      circle.style.cssText = "position: absolute; bottom:70px; width:80px; height:80px; background:rgba(126, 126, 126, 0.5); border:#444 solid medium; border-radius:50%; left:50%; transform:translateX(-50%);";
      const thumb = document.createElement("div");
      thumb.style.cssText = "position: absolute; left: 20px; top: 20px; width: 35px; height: 35px; border-radius: 50%; background: #fff;";
      circle.appendChild(thumb);
      document.body.appendChild(circle);
      this.domElement = thumb;
      this.maxRadius = options.maxRadius || 40;
		  this.maxRadiusSquared = this.maxRadius * this.maxRadius;
		  this.onMove = options.onMove;
		  this.game = options.game;
		  this.origin = { left:this.domElement.offsetLeft, top:this.domElement.offsetTop };
		  this.rotationDamping = options.rotationDamping || 0.06;
		  this.moveDamping = options.moveDamping || 0.01;    
      if (this.domElement !== undefined || this.domElement_1 !== undefined){
        const joystick = this;
        if ('ontouchstart' in window){
          this.domElement.addEventListener('touchstart', function(evt){ evt.preventDefault(); joystick.tap(evt); evt.stopPropagation();});
        }else{
          this.domElement.addEventListener('mousedown', function(evt){ evt.preventDefault(); joystick.tap(evt); evt.stopPropagation();});
        }
        // this._params = params; 
      }
    }

    _init() {
      this._keys = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        space: false,
        shift: false,
      }
    }

    getMousePosition(evt){
      let clientX = evt.targetTouches ? evt.targetTouches[0].pageX : evt.clientX;
      let clientY = evt.targetTouches ? evt.targetTouches[0].pageY : evt.clientY;
      return { x:clientX, y:clientY };
    }
    
    tap(evt){
      evt = evt || window.event;
      this._keys.forward = true;
      this._keys.backward = true;
      this._keys.left = true;
      this._keys.right = true;
      this._keys.space = true;
      this._keys.shift = true;
      // get the mouse cursor position at startup:
      this.offset = this.getMousePosition(evt);
      const joystick = this;
      if ('ontouchstart' in window){
        document.ontouchmove = function(evt){ joystick.move(evt)}, { passive: false};
        document.ontouchend =  function(evt){ joystick.up(evt)}, { passive: false};
      }else{
        document.onmousemove = function(evt){ joystick.move(evt)}, { passive: false};
        document.onmouseup = function(evt){ joystick.up(evt)}, { passive: false};
      }
    }
    
    move(evt){
      evt = evt || window.event;
      this._keys.forward = true;
      this._keys.backward = true;
      this._keys.left = true;
      this._keys.right = true;
      this._keys.space = true;
      this._keys.shift = true;
      const mouse = this.getMousePosition(evt);
      // calculate the new cursor position:
      let left = mouse.x - this.offset.x;
      let top = mouse.y - this.offset.y;
      //this.offset = mouse;
      
      const sqMag = left*left + top*top;
      if (sqMag>this.maxRadiusSquared){
        //Only use sqrt if essential
        const magnitude = Math.sqrt(sqMag);
        left /= magnitude;
        top /= magnitude;
        left *= this.maxRadius;
        top *= this.maxRadius;
      }
      // set the element's new position:
      this.domElement.style.top = `${top + this.domElement.clientHeight/2}px`;
      this.domElement.style.left = `${left + this.domElement.clientWidth/2}px`;
      
      this.forward_1 = -(top - this.origin.top + this.domElement.clientHeight/2)/this.maxRadius;
      this.turn_1 = (left - this.origin.left + this.domElement.clientWidth/2)/this.maxRadius;
      
      // if (this.onMove!=undefined) this.onMove.call(this.game, this.forward_1, this.turn_1);
    }

    up(evt){
      if ('ontouchstart' in window){
        document.ontouchmove = null;
        document.ontouchend = null;
      }else{
        document.onmousemove = null;
        document.onmouseup = null;
      }
      this.domElement.style.top = `${this.origin.top}px`;
      this.domElement.style.left = `${this.origin.left}px`;
      this.forward_1 = 0;
      this.turn_1 = 0;
      this._keys.forward = false;
      this._keys.backward = false;
      this._keys.left = false;
      this._keys.right = false;
      this._keys.space = false;
      this._keys.shift = false;
    }

  }

  return {
    BasicCharacterControllerInput: BasicCharacterControllerInput,
    PickableComponent: PickableComponent,
    Joystick: Joystick,
    // Timer: Timer,
  };

})();