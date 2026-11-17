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
export function cameraPose(anchor, aspect) {
  const focus = route(anchor), a = focus.theta - .45;
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
