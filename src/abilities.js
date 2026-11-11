import {JUMP_SPEED,ROUTE_ANGLE} from './game.js';
export const AbilityType=Object.freeze({JUMP:'jump',PHASING:'phasing'});
export const AbilityInfo=Object.freeze({jump:{key:'Space',cooldown:.12},phasing:{key:'Shift',cooldown:1.8,duration:.18,distanceScale:.75}});
export class Abilities {
  constructor(){this.reset();}
  reset(){this.cooldowns={jump:0,phasing:0};this.phase=null;}
  use(type,{falling=false,height=0,direction={x:0,z:1},distance=5.4}={}){
    if(falling||!AbilityInfo[type]||this.cooldowns[type]>0)return null;
    if(type===AbilityType.JUMP){if(height>.001)return null;this.cooldowns.jump=AbilityInfo.jump.cooldown;return {velocity:JUMP_SPEED};}
    if(this.phase)return null;
    const length=Math.hypot(direction.x,direction.z);if(length<.001)return null;
    this.phase={age:0,x:direction.x/length,z:direction.z/length,distance};this.cooldowns.phasing=AbilityInfo.phasing.cooldown;return this.phase;
  }
  advance(dt){
    for(const key of Object.keys(this.cooldowns))this.cooldowns[key]=Math.max(0,this.cooldowns[key]-dt);
    if(!this.phase)return null;
    const p=this.phase,duration=AbilityInfo.phasing.duration,old=p.age;
    p.age=Math.min(duration,p.age+dt);
    const ease=t=>1-Math.pow(1-t,2),travel=(ease(p.age/duration)-ease(old/duration))*p.distance;
    const delta={x:p.x*travel,z:p.z*travel};if(p.age>=duration)this.phase=null;return delta;
  }
}
export function applyPhaseDelta(s,lane,delta){
  const angle=s*ROUTE_ANGLE,radius=12+lane;
  const x=Math.cos(angle)*radius+delta.x,z=Math.sin(angle)*radius+delta.z;
  const turn=Math.atan2(Math.cos(angle)*z-Math.sin(angle)*x,Math.cos(angle)*x+Math.sin(angle)*z);
  return {s:s+turn/ROUTE_ANGLE,lane:Math.hypot(x,z)-12};
}
// Sweep the entire dash segment, so a fast frame cannot skip an enemy.
export function phaseHitsTarget(from,to,target){
  const ax=(from.x-target.x)/1.05,ay=(from.y-target.y)/1.05,az=(from.z-target.z)/1.05;
  const dx=(to.x-from.x)/1.05,dy=(to.y-from.y)/1.05,dz=(to.z-from.z)/1.05;
  const length=dx*dx+dy*dy+dz*dz;
  const t=length>1e-10?Math.max(0,Math.min(1,-(ax*dx+ay*dy+az*dz)/length)):0;
  return (ax+dx*t)**2+(ay+dy*t)**2+(az+dz*t)**2<=1;
}
