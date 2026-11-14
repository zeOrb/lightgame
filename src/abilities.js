import {ROUTE_RADIUS,JUMP_SPEED,ROUTE_ANGLE} from './game.js';
export const AbilityType=Object.freeze({JUMP:'jump',PHASING:'phasing',FLARE:'flare'});
export const AbilityInfo=Object.freeze({jump:{key:'Space',cooldown:.12},phasing:{key:'Shift',cooldown:1,duration:.18*1.33,distanceScale:.75*1.33,arenaDistance:4*1.33},flare:{key:'E',cooldown:8}});
export class Abilities {
  constructor(upgrades={}){this.upgrades=upgrades;this.reset();}
  reset(){this.cooldowns={jump:0,phasing:0,flare:0};this.phase=null;this.airJumpUsed=false;this.airDashesUsed=0;this.gravityDelay=0;this.gravityDt=0;this.recentJump=null;this.phaseRise=0;}
  jumpLaunched(velocity,height){
    this.recentJump={age:0,top:height+velocity*velocity/80};
    if(this.phase&&this.phase.age<=.05)this.attachJump(height);
  }
  attachJump(height){
    if(!this.phase||!this.recentJump||this.recentJump.age>.05)return;
    this.phase.rise={start:this.phase.age,height:Math.max(0,this.recentJump.top-height),previous:0};
    this.recentJump=null;
  }
  consumePhaseRise(){const rise=this.phaseRise;this.phaseRise=0;return rise;}
  land(){this.airJumpUsed=false;this.airDashesUsed=0;}
  resetAirJump(){this.airJumpUsed=false;}
  use(type,{falling=false,height=0,direction={x:0,z:1},distance=5.4,recoveryCancel=false}={}){
    const escape=type===AbilityType.PHASING&&recoveryCancel&&this.upgrades.damageDashCancel;
    if(falling||!AbilityInfo[type]||(!escape&&this.cooldowns[type]>0))return null;
    if(type===AbilityType.JUMP){if(height>.001){if(!this.upgrades.doubleJump||this.airJumpUsed)return null;this.airJumpUsed=true;}this.cooldowns.jump=AbilityInfo.jump.cooldown;return {velocity:JUMP_SPEED*(this.upgrades.jump??1),airJump:height>.001};}
    if(type===AbilityType.FLARE){if(!this.upgrades.flare)return null;this.cooldowns.flare=AbilityInfo.flare.cooldown;return {flare:true};}
    if(this.phase||(!escape&&this.airDashesUsed>=(this.upgrades.maxAirDashes??1)))return null;
    const length=Math.hypot(direction.x,direction.z);if(length<.001)return null;
    this.airDashesUsed++;
    if(escape)this.recentJump=null;
    this.phase={age:0,groundedLaunch:height<=.001,x:direction.x/length,z:direction.z/length,distance};this.attachJump(height);this.cooldowns.phasing=AbilityInfo.phasing.cooldown*(this.upgrades.phaseCooldown??1);return this.phase;
  }
  advance(dt){
    this.phaseRise=0;if(this.recentJump)this.recentJump.age+=dt;
    for(const key of Object.keys(this.cooldowns))this.cooldowns[key]=Math.max(0,this.cooldowns[key]-dt);
    this.gravityDt=Math.max(0,dt-this.gravityDelay);this.gravityDelay=Math.max(0,this.gravityDelay-dt);
    if(!this.phase)return null;
    this.gravityDelay=.05;this.gravityDt=0;
    const p=this.phase,duration=AbilityInfo.phasing.duration,old=p.age;
    p.age=Math.min(duration,p.age+dt);
    if(p.rise){const t=Math.min(1,(p.age-p.rise.start)/(duration-p.rise.start));const amount=p.rise.height*t*t*(3-2*t);this.phaseRise=amount-p.rise.previous;p.rise.previous=amount;}
    const ease=t=>1-Math.pow(1-t,2),travel=(ease(p.age/duration)-ease(old/duration))*p.distance;
    const delta={x:p.x*travel,z:p.z*travel};if(p.age>=duration)this.phase=null;return delta;
  }
}
export function applyPhaseDelta(s,lane,delta){
  const angle=s*ROUTE_ANGLE,radius=ROUTE_RADIUS+lane;
  const x=Math.cos(angle)*radius+delta.x,z=Math.sin(angle)*radius+delta.z;
  const turn=Math.atan2(Math.cos(angle)*z-Math.sin(angle)*x,Math.cos(angle)*x+Math.sin(angle)*z);
  return {s:s+turn/ROUTE_ANGLE,lane:Math.hypot(x,z)-ROUTE_RADIUS};
}
export function applySpiralPhase(s,lane,distance){
  const unitsPerSection=Math.hypot((ROUTE_RADIUS+lane)*ROUTE_ANGLE,.5);
  return {s:s+distance/unitsPerSection,lane};
}
// Sweep the entire dash segment, so a fast frame cannot skip an enemy.
export function phaseHitsTarget(from,to,target){
  const ax=(from.x-target.x)/1.05,ay=(from.y-target.y)/1.05,az=(from.z-target.z)/1.05;
  const dx=(to.x-from.x)/1.05,dy=(to.y-from.y)/1.05,dz=(to.z-from.z)/1.05;
  const length=dx*dx+dy*dy+dz*dz;
  const t=length>1e-10?Math.max(0,Math.min(1,-(ax*dx+ay*dy+az*dz)/length)):0;
  return (ax+dx*t)**2+(ay+dy*t)**2+(az+dz*t)**2<=1;
}




