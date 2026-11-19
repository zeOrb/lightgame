import { route } from './game.js';

// Critically damped motion keeps velocity continuous when a new arc is selected.
export function smoothCameraAnchor(value, velocity, target, dt, response = 7) {
  const offset = value - target;
  const carry = velocity + response * offset;
  const decay = Math.exp(-response * dt);
  return {
    value: target + (offset + carry * dt) * decay,
    velocity: (velocity - response * carry * dt) * decay,
  };
}
export function cameraPose(anchor, aspect, resolveRoute=route) {
  const focus = resolveRoute(anchor), a = focus.theta - .45;
  const target = { x: focus.x * .85, y: focus.y + .2, z: focus.z * .85 };
  // Preserve horizontal room on narrow screens without clipping the arc.
  const zoom = .92 * Math.max(1, 1.45 / aspect);
  return {
    target,
    position: {
      x: target.x + (Math.cos(a) * 2 - target.x) * zoom,
      y: target.y + 7.6 * zoom,
      z: target.z + (Math.sin(a) * 2 - target.z) * zoom,
    },
  };
}

// Follow raised terrain fully, while leaving a small dead zone for jump arcs.
export function railCameraHeight(height, surfaceLift, previousGroundLift){
  const groundLift=surfaceLift!==null?Math.max(0,surfaceLift):Math.max(0,Math.min(previousGroundLift,height));
  return {groundLift,target:groundLift+Math.max(0,height-groundLift-1)*.6};
}

// Carry the exact outgoing view into the landed floor's moving camera frame.
export class LandingCameraBlend {
  constructor(duration=.9){this.duration=duration;this.reset();}
  reset(){this.from=null;this.offset=null;this.age=0;}
  begin(position,target){
    this.from={position:{...position},target:{...target}};this.offset=null;this.age=0;
  }
  apply(position,target,dt){
    if(!this.from)return;
    if(!this.offset){
      this.offset={position:{},target:{}};
      for(const axis of ['x','y','z']){
        this.offset.position[axis]=this.from.position[axis]-position[axis];
        this.offset.target[axis]=this.from.target[axis]-target[axis];
      }
    }else this.age=Math.min(this.duration,this.age+Math.max(0,dt));
    const t=this.age/this.duration,weight=1-t*t*t*(t*(t*6-15)+10);
    for(const axis of ['x','y','z']){
      position[axis]+=this.offset.position[axis]*weight;
      target[axis]+=this.offset.target[axis]*weight;
    }
    if(this.age>=this.duration)this.reset();
  }
}
