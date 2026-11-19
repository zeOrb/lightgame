import * as THREE from 'three';
import {route,ROUTE_ANGLE,SHELF_HALF_ANGLE} from './game.js';
import {floorForSection} from './floor-config.js';

// The player keeps the departing floor's frame until actually leaving its tread.
export class ShelfTravel {
  constructor(){this.reset();}
  reset(){this.floor=null;}
  position(s,lane=0){
    const p=route(s,lane);if(!this.floor)return p;
    const reference=route(this.floor.start).theta-this.floor.start*ROUTE_ANGLE;
    p.theta=s*ROUTE_ANGLE+reference;
    p.x=Math.cos(p.theta)*(15+lane);p.z=Math.sin(p.theta)*(15+lane);return p;
  }
  leavesFloor(beforeS,nextS,lane){
    const owner=this.floor??floorForSection(beforeS),edge=SHELF_HALF_ANGLE/ROUTE_ANGLE;
    const next=floorForSection(nextS>owner.end+edge?owner.end+1:nextS<owner.start-edge?owner.start-1:nextS);
    if(next.index===owner.index)return false;
    this.floor=owner;
    const a=this.position(nextS,lane),theta=nextS*ROUTE_ANGLE+route(next.start).theta-next.start*ROUTE_ANGLE;
    const b={x:Math.cos(theta)*(15+lane),z:Math.sin(theta)*(15+lane)};
    if(Math.hypot(a.x-b.x,a.z-b.z)<.001){this.floor=null;return false;}
    return nextS<owner.start-edge||nextS>owner.end+edge;
  }
  land(section,point){
    this.floor=floorForSection(section);
    const reference=route(section).theta,theta=Math.atan2(point.z,point.x);
    const s=section+Math.atan2(Math.sin(theta-reference),Math.cos(theta-reference))/ROUTE_ANGLE;
    return {s,lane:Math.hypot(point.x,point.z)-15};
  }
}
const ray=new THREE.Raycaster(),origin=new THREE.Vector3(),delta=new THREE.Vector3(),normal=new THREE.Vector3(),matrix=new THREE.Matrix3();
export function sweepShelfLanding(before,after,floors){
  if(after.y>=before.y)return null;
  origin.set(before.x,before.y,before.z);delta.set(after.x-before.x,after.y-before.y,after.z-before.z);
  const length=delta.length();if(length<1e-8)return null;
  ray.set(origin,delta.divideScalar(length));ray.near=0;ray.far=length;
  const visible=floors.filter(o=>{for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;});
  for(const floor of visible)floor.updateWorldMatrix(true,false);
  return ray.intersectObjects(visible,false).find(hit=>{
    // A contact at the departure point is not a new landing.
    if(!hit.face||hit.distance<1e-7)return false;
    matrix.getNormalMatrix(hit.object.matrixWorld);normal.copy(hit.face.normal).applyMatrix3(matrix).normalize();
    return normal.y>.5;
  })??null;
}

export function shelfSupport(position,footY,floors){
  return sweepShelfLanding({x:position.x,y:footY+.35,z:position.z},{x:position.x,y:footY-.55,z:position.z},floors);
}
