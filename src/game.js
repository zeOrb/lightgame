import { visualSample } from './visual-random.js';
import {RUN_UPGRADES} from './progression.js';
export const FLOOR_COUNT = 12+RUN_UPGRADES.extraFloors;
export const END = FLOOR_COUNT*14-1;
export const TOWER_TOP=100+RUN_UPGRADES.extraFloors*7;
export function floorAt(s) { return FLOOR_COUNT - Math.min(FLOOR_COUNT-1, Math.floor(clamp(s,0,END)/14)); }
export function depthLight(s) { return Math.pow(1-clamp(s/END,0,1),1.25); }
export function canStomp(previousFoot, foot, previousTop, top, velocity, overlaps) {
  return overlaps && velocity < 0 && previousFoot >= previousTop-.12 && foot <= top+.12;
}
export const gaps = [19, 38, 59, 81, 103, 126, 147,...Array.from({length:Math.ceil((END-167)/22)},(_,i)=>170+i*22).filter(s=>s<END-3)];
export const ROUTE_ANGLE = Math.PI / 14;
export const SHELF_HALF_ANGLE = .133;
export const ROUTE_RADIUS = 15;
export const SHELF_INNER_RADIUS = 13.1;
export const SHELF_OUTER_RADIUS = 17.0;
export function shelfInnerRadius(section){
  const random=visualSample('shelves',section);
  const length=(SHELF_OUTER_RADIUS-SHELF_INNER_RADIUS)*(1+(random*2-1)/8);
  return SHELF_OUTER_RADIUS-length;
}
export const LANE_LIMIT = 1.2; // Safe central strip used by camera and level layout.
export const MOVEMENT_LANE_LIMIT = 4.2; // Movement can cross the real shelf edges.
export const JUMP_SPEED = 9;
export const GRAVITY = 16;
export const GAP_HALF_WIDTH = 1 - SHELF_HALF_ANGLE / ROUTE_ANGLE;
export function advanceJump(height, velocity, dt) {
  const nextHeight=height+velocity*dt-.5*GRAVITY*dt*dt;
  return nextHeight<=0 ? {height:0,velocity:0} : {height:nextHeight,velocity:velocity-GRAVITY*dt};
}
export function fellIntoGap(s, height, velocity) {
  return isGap(s) && height<=0 && velocity<=0;
}
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export function hpBrightness(hp){
  const t=clamp(hp/100,0,1),lit=t*t*t,dark=(1-t)*(1-t)*(1-t);
  return Math.pow(lit/(lit+dark),1.4);
}
export function turnTowards(current, target, dt) {
  const delta = Math.atan2(Math.sin(target-current), Math.cos(target-current));
  return current + delta * (1-Math.exp(-11*dt));
}
// Keep a whole arc in view. Hysteresis prevents camera chatter on reversal.
export function cameraAnchor(s, anchor, aspect = 16 / 9) {
  const step = Math.min(2.2, Math.max(.65, aspect * 1.35));
  const margin = step * .8;
  while (s > anchor + margin) anchor += step;
  while (s < anchor - margin) anchor -= step;
  return clamp(anchor, 0, END);
}
export function isGap(s) { return gaps.some(g => Math.abs(s - g) < GAP_HALF_WIDTH); }
export const PASSIVE_LIGHT_DRAIN = 12;
export const VITRAL_REGEN_DURATION = 4;
export function vitralRecovery(time){
  const t=Math.max(0,time),ramp=Math.min(t,VITRAL_REGEN_DURATION);
  return 100*(ramp/VITRAL_REGEN_DURATION)**2+Math.max(0,t-VITRAL_REGEN_DURATION)*50;
}
export function lightStep(light, dt, { shadow = false, vitral = false, vitralTime=0,maxHP=100,drainScale=1,damageScale=1,regen=1 } = {}) {
  const loss=shadow?48*damageScale:PASSIVE_LIGHT_DRAIN*drainScale;
  const healing=vitral?PASSIVE_LIGHT_DRAIN*drainScale*dt+(vitralRecovery(vitralTime+dt)-vitralRecovery(vitralTime))*maxHP/100*regen:0;
  return clamp(light+healing-loss*dt,0,maxHP);
}
export function route(s, lane = 0) {
  const theta = s * ROUTE_ANGLE;
  const radius = ROUTE_RADIUS + lane;
  return { x: Math.cos(theta) * radius, y: TOWER_TOP - s * .5, z: Math.sin(theta) * radius, theta };
}
